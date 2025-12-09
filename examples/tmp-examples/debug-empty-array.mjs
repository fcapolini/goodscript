#!/usr/bin/env node

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';
import { IRLowering } from '../../compiler/dist/frontend/lowering.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const sourceCode = `
export function emptyArray(): boolean[] {
  return [];
}
`;

// Create TypeScript program
const compilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ES2022,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
};

const host = ts.createCompilerHost(compilerOptions);
const originalGetSourceFile = host.getSourceFile;
host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
  if (fileName === 'test.ts') {
    return ts.createSourceFile(fileName, sourceCode, languageVersion, true);
  }
  return originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
};

const program = ts.createProgram(['test.ts'], compilerOptions, host);
const typeChecker = program.getTypeChecker();

// Find the array literal node
const sourceFile = program.getSourceFile('test.ts');
let arrayLiteralNode;
ts.forEachChild(sourceFile, node => {
  if (ts.isFunctionDeclaration(node)) {
    ts.forEachChild(node, child => {
      if (ts.isBlock(child)) {
        ts.forEachChild(child, stmt => {
          if (ts.isReturnStatement(stmt) && stmt.expression) {
            arrayLiteralNode = stmt.expression;
          }
        });
      }
    });
  }
});

if (arrayLiteralNode) {
  const tsType = typeChecker.getTypeAtLocation(arrayLiteralNode);
  console.log('TypeScript type:', typeChecker.typeToString(tsType));
  console.log('Type flags:', tsType.flags);
  console.log('Is array type:', typeChecker.isArrayType(tsType));
  
  if (typeChecker.isArrayType(tsType)) {
    const typeArgs = typeChecker.getTypeArguments(tsType);
    console.log('Type arguments:', typeArgs.map(t => typeChecker.typeToString(t)));
  }
}

// Lower to IR
const lowering = new IRLowering();
const ir = lowering.lower(program);

// Print the IR
console.log('\nIR:', JSON.stringify(ir.modules[0].declarations[0].body.terminator.value, null, 2));
