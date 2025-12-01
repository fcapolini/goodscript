/**
 * Triple-Mode Testing Helpers
 * 
 * Utilities for testing code generation in all three modes:
 * 1. JavaScript (TypeScript compiled to JS)
 * 2. Ownership C++ (smart pointers)
 * 3. GC C++ (raw pointers with malloc allocator)
 */

import ts from 'typescript';
import { AstCodegen } from '../../src/cpp/codegen.js';
import { GcCodegen } from '../../src/cpp/gc-codegen.js';
import { executeJS, executeCpp, executeGcCpp, compareOutputs, type ExecutionResult } from './runtime-helpers.js';

export interface TripleModeResult {
  // Compilation
  jsCode: string;
  ownershipCppCode: string;
  gcCppCode: string;
  
  // Execution
  jsResult: ExecutionResult;
  ownershipResult: ExecutionResult;
  gcResult: ExecutionResult;
  
  // Comparison
  jsOwnershipMatch: boolean;
  jsGcMatch: boolean;
  allMatch: boolean;
}

/**
 * Compile and execute GoodScript code in all three modes
 * Returns detailed results for each mode
 */
export function testTripleMode(source: string): TripleModeResult {
  // Create TypeScript source file
  const sourceFile = ts.createSourceFile(
    'test.ts',
    source,
    ts.ScriptTarget.ES2020,
    true
  );
  
  // Create a TypeScript program with checker for proper type inference
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    strict: true,
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
  const checker = program.getTypeChecker();
  
  // Compile to JavaScript (TypeScript)
  const jsResult = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    }
  });
  const jsCode = jsResult.outputText;
  
  // Compile to Ownership C++ (with checker for type inference)
  const ownershipCodegen = new AstCodegen(checker);
  const ownershipCppCode = ownershipCodegen.generate(sourceFile);
  
  // Compile to GC C++ (with checker for type inference)
  const gcCodegen = new GcCodegen(checker);
  const gcCppCode = gcCodegen.generate(sourceFile);
  
  // Execute in all three modes
  const jsExecResult = executeJS(jsCode);
  const ownershipExecResult = executeCpp(ownershipCppCode, '');
  const gcExecResult = executeGcCpp(gcCppCode, '');
  
  // Compare outputs
  const jsOwnershipMatch = compareOutputs(jsExecResult, ownershipExecResult);
  const jsGcMatch = compareOutputs(jsExecResult, gcExecResult);
  const allMatch = jsOwnershipMatch && jsGcMatch;
  
  return {
    jsCode,
    ownershipCppCode,
    gcCppCode,
    jsResult: jsExecResult,
    ownershipResult: ownershipExecResult,
    gcResult: gcExecResult,
    jsOwnershipMatch,
    jsGcMatch,
    allMatch,
  };
}

/**
 * Assert that all three modes produce identical output
 * Throws detailed error if they don't match
 */
export function expectTripleModeEquivalence(source: string): TripleModeResult {
  const result = testTripleMode(source);
  
  if (!result.jsResult.success) {
    throw new Error(`JavaScript execution failed:\n${result.jsResult.error}\nStderr: ${result.jsResult.stderr}`);
  }
  
  if (!result.ownershipResult.success) {
    throw new Error(`Ownership C++ execution failed:\n${result.ownershipResult.error}\nStderr: ${result.ownershipResult.stderr}`);
  }
  
  if (!result.gcResult.success) {
    throw new Error(`GC C++ execution failed:\n${result.gcResult.error}\nStderr: ${result.gcResult.stderr}`);
  }
  
  if (!result.jsOwnershipMatch) {
    throw new Error(
      `JavaScript and Ownership C++ outputs don't match:\n` +
      `JS Output:\n${result.jsResult.stdout}\n` +
      `Ownership C++ Output:\n${result.ownershipResult.stdout}`
    );
  }
  
  if (!result.jsGcMatch) {
    throw new Error(
      `JavaScript and GC C++ outputs don't match:\n` +
      `JS Output:\n${result.jsResult.stdout}\n` +
      `GC C++ Output:\n${result.gcResult.stdout}`
    );
  }
  
  return result;
}

/**
 * Expect just compilation success (no execution)
 * Useful for tests that verify generated code structure
 */
export function expectTripleModeCompilation(source: string): {
  jsCode: string;
  ownershipCppCode: string;
  gcCppCode: string;
} {
  const sourceFile = ts.createSourceFile(
    'test.ts',
    source,
    ts.ScriptTarget.ES2020,
    true
  );
  
  // Create a TypeScript program with checker for proper type inference
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    strict: true,
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
  const checker = program.getTypeChecker();
  
  const jsResult = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    }
  });
  
  const ownershipCodegen = new AstCodegen(checker);
  const gcCodegen = new GcCodegen(checker);
  
  return {
    jsCode: jsResult.outputText,
    ownershipCppCode: ownershipCodegen.generate(sourceFile),
    gcCppCode: gcCodegen.generate(sourceFile),
  };
}
