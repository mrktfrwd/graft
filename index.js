const { Project, SyntaxKind } = require('ts-morph');

/**
 * Initialize a ts-morph Project over a specific directory
 * @param {string} projectDir - Path to the project root (e.g., __dirname + '/examples/src')
 * @returns {Project} A ts-morph project instance
 */
function initProject(projectDir) {
  const project = new Project();
  project.addSourceFilesAtPaths(`${projectDir}/**/*.ts`);
  return project;
}

/**
 * Semantically renames a variable or function across the entire project.
 * Automatically updates all import statements and references.
 * @param {Project} project - The ts-morph project instance
 * @param {string} filePath - The path to the file containing the symbol
 * @param {string} oldName - The current name of the function or variable
 * @param {string} newName - The new name
 */
function renameSymbol(project, filePath, oldName, newName) {
  const sourceFile = project.getSourceFileOrThrow(filePath);
  
  // Try finding a function declaration first
  let target = sourceFile.getFunction(oldName);
  
  // If not found, try variable declaration
  if (!target) {
    const varDecl = sourceFile.getVariableDeclaration(oldName);
    if (varDecl) target = varDecl;
  }

  // If not found, try class declaration
  if (!target) {
    const classDecl = sourceFile.getClass(oldName);
    if (classDecl) target = classDecl;
  }

  if (!target) {
    throw new Error(`Symbol '${oldName}' not found in ${filePath}`);
  }

  // Perform semantic rename
  target.rename(newName);
  project.saveSync();
  console.log(`Renamed '${oldName}' to '${newName}' and saved all references.`);
}

/**
 * Wraps a specific function's logic in a try/catch block dynamically.
 * @param {Project} project - The ts-morph project instance
 * @param {string} filePath - The path to the file
 * @param {string} functionName - The name of the function to wrap
 */
function wrapWithTryCatch(project, filePath, functionName) {
  const sourceFile = project.getSourceFileOrThrow(filePath);
  
  let func = sourceFile.getFunction(functionName);
  
  // If not found as a standalone function, search inside all classes
  if (!func) {
    for (const classDecl of sourceFile.getClasses()) {
      const method = classDecl.getMethod(functionName);
      if (method) {
        func = method;
        break;
      }
    }
  }

  if (!func) {
    throw new Error(`Expected to find function or method named '${functionName}'.`);
  }
  
  const bodyText = func.getBodyText();
  
  func.setBodyText(`try {\n  ${bodyText.replace(/\n/g, '\n  ')}\n} catch (error) {\n  console.error("Error in ${functionName}:", error);\n  throw error;\n}`);
  
  sourceFile.saveSync();
  console.log(`Successfully wrapped '${functionName}' in a try/catch block.`);
}

/**
 * Extracts a TypeScript interface from an existing class.
 * @param {Project} project - The ts-morph project instance
 * @param {string} filePath - The path to the file
 * @param {string} className - The name of the class to parse
 * @param {string} interfaceName - The desired name of the new interface
 */
function extractInterface(project, filePath, className, interfaceName) {
  const sourceFile = project.getSourceFileOrThrow(filePath);
  const classDecl = sourceFile.getClassOrThrow(className);
  
  // Get public methods
  const methods = classDecl.getMethods().filter(m => !m.hasModifier(SyntaxKind.PrivateKeyword) && !m.hasModifier(SyntaxKind.ProtectedKeyword));
  const properties = classDecl.getProperties().filter(p => !p.hasModifier(SyntaxKind.PrivateKeyword) && !p.hasModifier(SyntaxKind.ProtectedKeyword));

  const interfaceProperties = properties.map(p => ({
    name: p.getName(),
    type: p.getTypeNode() ? p.getTypeNode().getText() : 'any',
  }));

  const interfaceMethods = methods.map(m => ({
    name: m.getName(),
    returnType: m.getReturnTypeNode() ? m.getReturnTypeNode().getText() : 'void',
    parameters: m.getParameters().map(param => ({
      name: param.getName(),
      type: param.getTypeNode() ? param.getTypeNode().getText() : 'any'
    }))
  }));

  // Add the interface to the file
  sourceFile.insertInterface(classDecl.getChildIndex(), {
    name: interfaceName,
    isExported: true,
    properties: interfaceProperties,
    methods: interfaceMethods
  });

  // Make the class implement the new interface
  classDecl.addImplements(interfaceName);

  sourceFile.saveSync();
  console.log(`Successfully extracted '${interfaceName}' from '${className}'.`);
}

module.exports = {
  initProject,
  renameSymbol,
  wrapWithTryCatch,
  extractInterface
};
