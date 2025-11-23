const ts = require('typescript');
const fs = require('fs');
const { CppCodegen } = require('./dist/cpp-codegen.js');

const fileName = './test/phase3/concrete-examples/lru-cache/src/main.gs.ts';

// Create a program with type checker
const program = ts.createProgram([fileName], {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.CommonJS
});

const checker = program.getTypeChecker();
const sourceFile = program.getSourceFile(fileName);

if (!sourceFile) {
  console.error('No source file found');
  process.exit(1);
}

console.log('Generating with TypeChecker...');
const codegen = new CppCodegen(checker);
const output = codegen.generate(sourceFile);

fs.writeFileSync('/tmp/lru-cache.cpp', output);
console.log('Generated to /tmp/lru-cache.cpp');
