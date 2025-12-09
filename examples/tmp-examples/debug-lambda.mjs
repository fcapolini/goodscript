/**
 * Debug lambda lowering
 */
import { readFile } from 'fs/promises';
import ts from 'typescript';
import { IRLowering } from '../../compiler/dist/frontend/lowering.js';

const code = `
export function main(): void {
  const add = (a: number, b: number): number => {
    return a + b;
  };
  const sum: number = add(10, 32);
}
`;

const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.ES2022, true);

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
    return sourceFile;
  }
  return originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
};

const program = ts.createProgram(['test.ts'], compilerOptions, host);

const lowering = new IRLowering();
const ir = lowering.lower(program);

console.log(JSON.stringify(ir, null, 2));
