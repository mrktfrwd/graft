#!/usr/bin/env node
'use strict';

const path = require('path');
const { initProject, renameSymbol, wrapWithTryCatch, extractInterface } = require('./index');

const USAGE = `graft — semantic TypeScript refactoring, driven by an AST rather than a regex.

  npx @mrkt_frwd/graft rename <dir> <file.ts> <old> <new>   [--write]
  npx @mrkt_frwd/graft wrap   <dir> <file.ts> <function>    [--write]
  npx @mrkt_frwd/graft iface  <dir> <file.ts> <Class> <IName> [--write]

  Nothing is written without --write. The default is a dry run that prints what would
  change, because a refactoring tool an agent drives should give you something to refuse.

  Docs: https://github.com/mrktfrwd/graft`;

const [cmd, dir, file, ...rest] = process.argv.slice(2).filter((a) => a !== '--write');
const write = process.argv.includes('--write');

if (!cmd || !dir || !file) { console.log(USAGE); process.exit(0); }

const opts = { dryRun: !write };
try {
  const project = initProject(path.resolve(dir));
  const target = path.resolve(file);
  let r;
  if (cmd === 'rename')      r = renameSymbol(project, target, rest[0], rest[1], opts);
  else if (cmd === 'wrap')   r = wrapWithTryCatch(project, target, rest[0], opts);
  else if (cmd === 'iface')  r = extractInterface(project, target, rest[0], rest[1], opts);
  else { console.log(USAGE); process.exit(0); }

  console.log(`\n  GRAFT  ${cmd}${write ? '' : '  (dry run)'}`);
  console.log('  ────────────────────────────────────');
  (r.untyped || []).forEach((u) => console.log(`  --   untyped, emitted as any: ${u}`));
  if (write) r.changed.forEach((f) => console.log(`  ok   wrote ${path.relative(process.cwd(), f)}`));
  else r.preview.forEach((p) => console.log(`  would change ${path.relative(process.cwd(), p.file)}`));
  console.log(write ? `\n  ${r.changed.length} file(s) written\n`
                    : `\n  nothing written — re-run with --write\n`);
} catch (err) {
  console.error(`\n  ${err.message}\n`);
  process.exit(1);
}
