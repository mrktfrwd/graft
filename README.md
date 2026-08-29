# Agent AST Refactoring Engine

This toolkit provides AI Agents with the power to perform safe, semantic, programmatic refactoring across entire TypeScript and JavaScript codebases without relying on brittle regex matching or manual string manipulation.

Powered by `ts-morph`, it parses the codebase into an Abstract Syntax Tree (AST), allowing agents to execute complex refactoring commands with guaranteed syntax safety.

## Core Capabilities

1. **`initProject(projectDir)`**: Initializes the AST engine across a specific directory (e.g. `src/**/*.ts`).
2. **`renameSymbol(project, filePath, oldName, newName)`**: Semantically renames a variable, class, or function, and **automatically updates all imports and references** across the entire project.
3. **`wrapWithTryCatch(project, filePath, functionName)`**: Dynamically parses a function block and safely wraps its logic in a `try/catch` statement without breaking formatting.
4. **`extractInterface(project, filePath, className, interfaceName)`**: Analyzes a class, extracts all of its public properties and methods into a clean TypeScript interface, injects the interface into the file, and implements it.

## Quick Start for Agents

Agents can write a quick script utilizing this engine to automate massive refactors:

```javascript
const path = require('path');
const { initProject, renameSymbol, extractInterface, wrapWithTryCatch } = require('./index');

// 1. Initialize the AST Engine
const project = initProject(path.join(__dirname, 'examples/src'));

// 2. Safely rename a function across the codebase
// This will rename 'addNumbers' and update its import inside 'calculator.ts'
renameSymbol(project, path.join(__dirname, 'examples/src/math.ts'), 'addNumbers', 'add');

// 3. Extract a clean Interface from a class
extractInterface(project, path.join(__dirname, 'examples/src/calculator.ts'), 'Calculator', 'ICalculator');

// 4. Safely wrap a risky function in try/catch
wrapWithTryCatch(project, path.join(__dirname, 'examples/src/calculator.ts'), 'riskyOperation');
```

## Running Tests

An example `test.js` script is provided to demonstrate the engine. Run:
```bash
npm install
node test.js
```
