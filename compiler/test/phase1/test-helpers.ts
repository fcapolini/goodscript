/**
 * Test helpers for Phase 1 tests
 */

import * as ts from 'typescript';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { Compiler, CompileResult } from '../../src/compiler';
import { Diagnostic } from '../../src/types';

/**
 * Compile source code string for testing
 */
export function compileSource(source: string, fileName: string = 'test.gs.ts'): CompileResult {
  // Create a temporary file
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'goodscript-test-'));
  const filePath = path.join(tmpDir, fileName);
  
  try {
    fs.writeFileSync(filePath, source);
    
    const compiler = new Compiler();
    const result = compiler.compile({
      files: [filePath],
      skipOwnershipChecks: true  // Phase 1 tests don't care about ownership
    });
    
    return result;
  } finally {
    // Cleanup
    try {
      fs.unlinkSync(filePath);
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
