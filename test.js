const path = require('path');
const fs = require('fs');
const { initProject, renameSymbol, extractInterface, wrapWithTryCatch } = require('./index');

console.log("=== Starting Agent AST Engine Tests ===");

try {
  // 1. Init
  console.log("Initializing project...");
  const project = initProject(path.join(__dirname, 'examples/src'));

  // 2. Rename
  console.log("Renaming 'addNumbers' to 'add'...");
  renameSymbol(project, path.join(__dirname, 'examples/src/math.ts'), 'addNumbers', 'add');

  // 3. Extract Interface
  console.log("Extracting 'ICalculator' interface...");
  extractInterface(project, path.join(__dirname, 'examples/src/calculator.ts'), 'Calculator', 'ICalculator');

  // 4. Wrap with Try/Catch
  console.log("Wrapping 'riskyOperation' with try/catch...");
  wrapWithTryCatch(project, path.join(__dirname, 'examples/src/calculator.ts'), 'riskyOperation');

  console.log("=== All Tests Passed Successfully ===");

  // Output the changed file so we can see the result
  const result = fs.readFileSync(path.join(__dirname, 'examples/src/calculator.ts'), 'utf8');
  console.log("\n--- Final calculator.ts ---");
  console.log(result);

} catch (err) {
  console.error("Test failed:", err);
}
