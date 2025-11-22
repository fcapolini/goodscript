/**
 * Test helpers for Phase 2 tests (Ownership Analysis)
 */

import * as ts from 'typescript';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { Compiler, CompileResult } from '../../src/compiler';
import { Diagnostic } from '../../src/types';

interface CompileSourceResult extends CompileResult {
  output?: string;
}

/**
 * Compile source code string with ownership analysis enabled
 */
export function compileWithOwnership(
  source: string, 
  fileName: string = 'test.gs.ts',
  level: 'dag' | 'native' = 'dag'
): CompileSourceResult {
    // Create a temporary directory
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'goodscript-phase2-'));
  const filePath = path.join(tmpDir, fileName);
  const tsconfigPath = path.join(tmpDir, 'tsconfig.json');
  
  try {
    // Write source file
    fs.writeFileSync(filePath, source);
    
    // Write tsconfig with ownership analysis enabled
    const tsconfig = {
      compilerOptions: {
        target: 'ES2020',
        module: 'commonjs',
        lib: ['ES2020'],
        strict: true,
        skipLibCheck: true
      },
      goodscript: {
        level: level
      }
    };
    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
    
    const compiler = new Compiler();
    const result = compiler.compile({
      files: [filePath],
      project: tsconfigPath
    });
    
    return result;
  } finally {
    // Cleanup
    try {
      fs.unlinkSync(filePath);
      fs.unlinkSync(tsconfigPath);
      fs.rmdirSync(tmpDir);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Compile multiple source files with ownership analysis
 */
export function compileMultipleWithOwnership(
  files: { name: string, source: string }[],
  level: 'dag' | 'native' = 'dag'
): CompileSourceResult {
  // Create a temporary directory
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'goodscript-phase2-'));
  const tsconfigPath = path.join(tmpDir, 'tsconfig.json');
  
  try {
    // Write all source files
    const filePaths: string[] = [];
    for (const file of files) {
      const filePath = path.join(tmpDir, file.name);
      fs.writeFileSync(filePath, file.source);
      filePaths.push(filePath);
    }
    
    // Write tsconfig with ownership analysis enabled
    const tsconfig = {
      compilerOptions: {
        target: 'ES2020',
        module: 'commonjs',
        lib: ['ES2020'],
        strict: true,
        skipLibCheck: true
      },
      goodscript: {
        level: level
      }
    };
    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
    
    const compiler = new Compiler();
    const result = compiler.compile({
      files: filePaths,
      project: tsconfigPath
    });
    
    return result;
  } finally {
    // Cleanup
    try {
      for (const file of files) {
        fs.unlinkSync(path.join(tmpDir, file.name));
      }
      fs.unlinkSync(tsconfigPath);
      fs.rmdirSync(tmpDir);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Get errors with a specific code
 */
export function getErrors(diagnostics: Diagnostic[], code: string): Diagnostic[] {
  return diagnostics.filter(d => d.severity === 'error' && d.code === code);
}

/**
 * Check if compilation has any errors with the given code
 */
export function hasError(diagnostics: Diagnostic[], code: string): boolean {
  return getErrors(diagnostics, code).length > 0;
}

/**
 * Check if compilation succeeded (no errors)
 */
export function isSuccess(result: CompileResult): boolean {
  return result.success && result.diagnostics.filter(d => d.severity === 'error').length === 0;
}

/**
 * Get all error messages
 */
export function getErrorMessages(diagnostics: Diagnostic[]): string[] {
  return diagnostics.filter(d => d.severity === 'error').map(d => d.message);
}
