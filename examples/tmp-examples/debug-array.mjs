#!/usr/bin/env node

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';
import { IRLowering } from '../../compiler/dist/frontend/lowering.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const sourceCode = `
export function arrayLength(arr: string[]): number {
  return arr.length;
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

// Lower to IR
const lowering = new IRLowering();
const ir = lowering.lower(program);

// Print the IR
console.log(JSON.stringify(ir, null, 2));
