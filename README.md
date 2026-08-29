# @mrkt_frwd/graft

**Semantic TypeScript refactoring an agent can drive.** Renames that follow every
reference, try/catch wrapping, interface extraction — driven by an AST rather than a
regex, so a rename cannot half-succeed.

```bash
npx @mrkt_frwd/graft rename ./src ./src/math.ts addNumbers add
```

That is a **dry run**. It prints what would change and writes nothing.

## What it is for

The refactors that are safe in an IDE and dangerous in a script. A regex rename of
`add` hits `addNumbers`, `address`, and a string in a comment; an AST rename hits the
symbol and its references and nothing else.

## The part that matters

**Nothing is written unless you ask.** Every operation takes `{ dryRun }` and returns
what it *would* change; the CLI defaults to a dry run and needs `--write` to commit.

A refactoring tool that an agent invokes, which saves to disk the moment it is called,
gives you nothing to review and nothing to refuse. The cheap check belongs before the
expensive, hard-to-undo step — which is also why the tests here are mostly about *not*
writing.

**It tells you what it could not type.** `extractInterface` falls back to `any` for a
member with no annotation — but it returns every one of them:

```
  GRAFT  iface  (dry run)
  ────────────────────────────────────
  --   untyped, emitted as any: Calculator.label (property)
  --   untyped, emitted as any: Calculator.describe() (return type)
  would change examples/src/calculator.ts

  nothing written — re-run with --write
```

An interface full of silent `any` compiles, looks finished, and documents nothing. Saying
which members are unknown is the difference between a generated interface you can trust
and one you have to re-read the class to verify.

## What it refuses

- A symbol that is not there — naming what it looked for (function, variable, class, interface)
- A rename onto a name that already exists, before anything is written
- An identifier that is not valid
- Wrapping a function whose body already begins with `try` — no nested handlers
- Extracting an interface that already exists
- A directory with no TypeScript in it, rather than succeeding over nothing

## API

```js
const { initProject, renameSymbol, wrapWithTryCatch, extractInterface } = require('@mrkt_frwd/graft');

const project = initProject('./src');
const { changed, preview } = renameSymbol(project, './src/math.ts', 'addNumbers', 'add', { dryRun: true });
const { untyped }          = extractInterface(project, './src/calculator.ts', 'Calculator', 'ICalculator');
```

## Requirements

Node 18+. One dependency: `ts-morph`.

MIT © Joe Asare. Built at [Joe Asare Studio](https://joeasare.com).
