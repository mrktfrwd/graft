'use strict';

/**
 * The dangerous property of a refactoring tool is that it writes. So these tests are
 * mostly about *not* writing: dry runs must leave the disk untouched, and every refusal
 * must happen before anything is saved.
 *
 * Each case works on a throwaway copy of the fixtures, because a test that mutates the
 * fixtures passes once and lies afterwards.
 *
 *   node test.js
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { initProject, renameSymbol, wrapWithTryCatch, extractInterface } = require('./index');

const fails = [];
const it = (name, fn) => {
  try { fn(); console.log(`  ok   ${name}`); }
  catch (e) { fails.push(name); console.log(`  FAIL ${name}\n         ${e.message.split('\n')[0]}`); }
};

const FIXTURES = path.join(__dirname, 'examples', 'src');

function sandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ast-'));
  const src = path.join(dir, 'src');
  fs.mkdirSync(src, { recursive: true });
  for (const f of fs.readdirSync(FIXTURES)) {
    fs.copyFileSync(path.join(FIXTURES, f), path.join(src, f));
  }
  return {
    dir, src,
    file: (n) => path.join(src, n),
    read: (n) => fs.readFileSync(path.join(src, n), 'utf8'),
    clean: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

console.log('\n  AST ENGINE\n  ----------------------------------');

it('a dry run reports the change and leaves the disk alone', () => {
  const s = sandbox();
  const before = s.read('math.ts');
  const r = renameSymbol(initProject(s.src), s.file('math.ts'), 'addNumbers', 'add', { dryRun: true });
  assert.deepEqual(r.changed, [], 'a dry run must not report writes');
  assert.ok(r.preview.length > 0, 'a dry run must still show what it would do');
  assert.ok(r.preview.some((p) => /\badd\b/.test(p.text)), 'the preview should carry the new name');
  assert.equal(s.read('math.ts'), before, 'the file on disk changed during a dry run');
  s.clean();
});

it('a real rename writes', () => {
  const s = sandbox();
  const r = renameSymbol(initProject(s.src), s.file('math.ts'), 'addNumbers', 'add');
  assert.ok(r.changed.length >= 1, 'nothing was reported as changed');
  assert.ok(!/addNumbers/.test(s.read('math.ts')), 'the old name survived');
  s.clean();
});

it('renaming a symbol that is not there names what it looked for', () => {
  const s = sandbox();
  assert.throws(
    () => renameSymbol(initProject(s.src), s.file('math.ts'), 'noSuchThing', 'x'),
    /not found/,
  );
  s.clean();
});

it('an invalid identifier is refused', () => {
  const s = sandbox();
  assert.throws(
    () => renameSymbol(initProject(s.src), s.file('math.ts'), 'addNumbers', '2bad'),
    /not a usable identifier/,
  );
  s.clean();
});

it('wrapping twice is refused rather than nesting try blocks', () => {
  const s = sandbox();
  wrapWithTryCatch(initProject(s.src), s.file('math.ts'), 'addNumbers');
  assert.match(s.read('math.ts'), /try \{/);
  assert.throws(
    () => wrapWithTryCatch(initProject(s.src), s.file('math.ts'), 'addNumbers'),
    /already begins with a try/,
  );
  s.clean();
});

it('wrapping a function that is not there is refused', () => {
  const s = sandbox();
  assert.throws(
    () => wrapWithTryCatch(initProject(s.src), s.file('math.ts'), 'nope'),
    /No function or method named/,
  );
  s.clean();
});

it('extractInterface accounts for every any it emits', () => {
  const s = sandbox();
  const r = extractInterface(initProject(s.src), s.file('calculator.ts'), 'Calculator', 'ICalculator', { dryRun: true });
  assert.ok(Array.isArray(r.untyped), 'untyped must always be an array');
  const anys = (r.preview[0].text.match(/:\s*any\b/g) || []).length;
  assert.ok(r.untyped.length >= anys,
    `emitted ${anys} 'any' but reported only ${r.untyped.length} untyped members`);
  s.clean();
});

it('extracting an interface that already exists is refused', () => {
  const s = sandbox();
  extractInterface(initProject(s.src), s.file('calculator.ts'), 'Calculator', 'ICalculator');
  assert.throws(
    () => extractInterface(initProject(s.src), s.file('calculator.ts'), 'Calculator', 'ICalculator'),
    /already exists/,
  );
  s.clean();
});

it('a directory with no TypeScript in it is refused, not silently empty', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ast-empty-'));
  assert.throws(() => initProject(dir), /nothing to refactor/);
  fs.rmSync(dir, { recursive: true, force: true });
});

if (fails.length) { console.error(`\n  ${fails.length} failure(s)\n`); process.exit(1); }
console.log('\n  all ast-engine checks passed\n');
