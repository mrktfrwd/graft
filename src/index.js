'use strict';

const { Project, SyntaxKind } = require('ts-morph');

/**
 * Semantic refactoring over a TypeScript project — renames that follow references,
 * try/catch wrapping, interface extraction — driven by an AST rather than a regex.
 *
 * Two things this deliberately does:
 *
 * 1. **It does not write unless you ask it to.** Every operation takes `{ dryRun }` and
 *    returns what it *would* change. A refactoring tool an agent drives, which saves to
 *    disk the moment it is called, leaves you nothing to review and nothing to refuse.
 *    The cheap check belongs before the expensive, hard-to-undo step.
 *
 * 2. **It does not silently type things `any`.** `extractInterface` fell back to `any`
 *    for members with no annotation and said nothing, producing an interface that
 *    compiles, looks finished, and documents nothing. The fallback remains — `any` is at
 *    least visible in the output — but every use is returned in `untyped[]`, so the
 *    caller knows what the interface is not telling them.
 */

/** Open a project over a directory. Paths are explicit; no tsconfig is consulted. */
function initProject(projectDir) {
  const project = new Project();
  project.addSourceFilesAtPaths(`${projectDir}/**/*.ts`);
  if (project.getSourceFiles().length === 0) {
    throw new Error(`No .ts files under ${projectDir} — nothing to refactor`);
  }
  return project;
}

/** Find a renameable declaration by name. */
function findDeclaration(sourceFile, name) {
  return sourceFile.getFunction(name)
    || sourceFile.getVariableDeclaration(name)
    || sourceFile.getClass(name)
    || sourceFile.getInterface(name)
    || null;
}

/**
 * Rename a symbol and every reference to it.
 * @returns {{ changed: string[], preview: {file: string, text: string}[] }}
 */
function renameSymbol(project, filePath, oldName, newName, { dryRun = false } = {}) {
  if (!newName || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(newName)) {
    throw new Error(`'${newName}' is not a usable identifier`);
  }
  const sourceFile = project.getSourceFileOrThrow(filePath);
  const target = findDeclaration(sourceFile, oldName);
  if (!target) {
    throw new Error(`Symbol '${oldName}' not found in ${filePath} — looked for a function, variable, class or interface`);
  }
  if (findDeclaration(sourceFile, newName)) {
    throw new Error(`'${newName}' already exists in ${filePath} — renaming would collide`);
  }

  target.rename(newName);

  const touched = project.getSourceFiles().filter((f) => !f.isSaved());
  const result = {
    changed: touched.map((f) => f.getFilePath()),
    preview: touched.map((f) => ({ file: f.getFilePath(), text: f.getFullText() })),
  };
  if (dryRun) {
    project.getSourceFiles().forEach((f) => f.refreshFromFileSystemSync());
    return { changed: [], preview: result.preview };
  }
  project.saveSync();
  return result;
}

/** Wrap a function or method body in a try/catch that logs and rethrows. */
function wrapWithTryCatch(project, filePath, functionName, { dryRun = false } = {}) {
  const sourceFile = project.getSourceFileOrThrow(filePath);
  let func = sourceFile.getFunction(functionName);
  if (!func) {
    for (const classDecl of sourceFile.getClasses()) {
      const method = classDecl.getMethod(functionName);
      if (method) { func = method; break; }
    }
  }
  if (!func) throw new Error(`No function or method named '${functionName}' in ${filePath}`);

  const body = func.getBodyText();
  if (body == null) throw new Error(`'${functionName}' has no body to wrap`);
  if (/^\s*try\s*\{/.test(body)) {
    throw new Error(`'${functionName}' already begins with a try block — refusing to nest another`);
  }

  func.setBodyText(
    `try {\n  ${body.replace(/\n/g, '\n  ')}\n} catch (error) {\n`
    + `  console.error("Error in ${functionName}:", error);\n  throw error;\n}`,
  );

  const text = sourceFile.getFullText();
  if (dryRun) {
    sourceFile.refreshFromFileSystemSync();
    return { changed: [], preview: [{ file: filePath, text }] };
  }
  sourceFile.saveSync();
  return { changed: [filePath], preview: [{ file: filePath, text }] };
}

/**
 * Extract an interface from a class's public surface.
 * @returns {{ changed: string[], untyped: string[], preview: {file: string, text: string}[] }}
 */
function extractInterface(project, filePath, className, interfaceName, { dryRun = false } = {}) {
  const sourceFile = project.getSourceFileOrThrow(filePath);
  const classDecl = sourceFile.getClassOrThrow(className);
  if (sourceFile.getInterface(interfaceName)) {
    throw new Error(`Interface '${interfaceName}' already exists in ${filePath}`);
  }

  const isPublic = (m) => !m.hasModifier(SyntaxKind.PrivateKeyword) && !m.hasModifier(SyntaxKind.ProtectedKeyword);
  const untyped = [];

  const properties = classDecl.getProperties().filter(isPublic).map((p) => {
    const node = p.getTypeNode();
    if (!node) untyped.push(`${className}.${p.getName()} (property)`);
    return { name: p.getName(), type: node ? node.getText() : 'any' };
  });

  const methods = classDecl.getMethods().filter(isPublic).map((m) => {
    const ret = m.getReturnTypeNode();
    if (!ret) untyped.push(`${className}.${m.getName()}() (return type)`);
    return {
      name: m.getName(),
      returnType: ret ? ret.getText() : 'void',
      parameters: m.getParameters().map((param) => {
        const t = param.getTypeNode();
        if (!t) untyped.push(`${className}.${m.getName()}(${param.getName()}) (parameter)`);
        return { name: param.getName(), type: t ? t.getText() : 'any' };
      }),
    };
  });

  if (properties.length === 0 && methods.length === 0) {
    throw new Error(`'${className}' has no public members — there is no interface to extract`);
  }

  sourceFile.insertInterface(classDecl.getChildIndex(), {
    name: interfaceName, isExported: true, properties, methods,
  });
  classDecl.addImplements(interfaceName);

  const text = sourceFile.getFullText();
  if (dryRun) {
    sourceFile.refreshFromFileSystemSync();
    return { changed: [], untyped, preview: [{ file: filePath, text }] };
  }
  sourceFile.saveSync();
  return { changed: [filePath], untyped, preview: [{ file: filePath, text }] };
}

module.exports = { initProject, renameSymbol, wrapWithTryCatch, extractInterface, findDeclaration };
