/**
 * Runtime Equivalence Testing Helpers
 * 
 * Utilities for executing both JS and C++ code and comparing their outputs.
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  error?: string;
}

/**
 * Execute JavaScript code with Node.js
 */
export const executeJS = (jsCode: string): ExecutionResult => {
  const tmpDir = join(tmpdir(), 'js-exec-' + Date.now() + '-' + Math.random().toString(36).substring(7));
  mkdirSync(tmpDir, { recursive: true });
  
  const jsFile = join(tmpDir, 'test.js');
  writeFileSync(jsFile, jsCode, 'utf-8');
  
  try {
    const output = execSync(
      `node ${jsFile}`,
      { encoding: 'utf-8', timeout: 5000 }
    );
    
    // Clean up
    rmSync(tmpDir, { recursive: true, force: true });
    
    return {
      success: true,
      stdout: output,
      stderr: '',
      exitCode: 0,
    };
  } catch (error: any) {
    // Clean up
    rmSync(tmpDir, { recursive: true, force: true });
    
    return {
      success: false,
      stdout: error.stdout?.toString() || '',
      stderr: error.stderr?.toString() || '',
      exitCode: error.status || 1,
      error: error.message,
    };
  }
};

/**
 * Execute C++ code by compiling and running it
 */
export const executeCpp = (cppCode: string, outDir: string): ExecutionResult => {
  const tmpDir = join(tmpdir(), 'cpp-exec-' + Date.now() + '-' + Math.random().toString(36).substring(7));
  mkdirSync(tmpDir, { recursive: true });
  
  const cppFile = join(tmpDir, 'test.cpp');
  const binFile = join(tmpDir, 'test');
  
  writeFileSync(cppFile, cppCode, 'utf-8');
  
  try {
    // Compile the C++ code using Zig's C++ compiler
    execSync(
      `zig c++ -std=c++17 -O3 ${cppFile} -o ${binFile} 2>&1`,
      { encoding: 'utf-8', timeout: 10000 }
    );
    
    // Run the compiled binary
    const output = execSync(
      binFile,
      { encoding: 'utf-8', timeout: 5000 }
    );
    
    // Clean up
    rmSync(tmpDir, { recursive: true, force: true });
    
    return {
      success: true,
      stdout: output,
      stderr: '',
      exitCode: 0,
    };
  } catch (error: any) {
    // Clean up
    rmSync(tmpDir, { recursive: true, force: true });
    
    return {
      success: false,
      stdout: error.stdout?.toString() || '',
      stderr: error.stderr?.toString() || '',
      exitCode: error.status || 1,
      error: error.message,
    };
  }
};

/**
 * Normalize output for comparison (trim whitespace, normalize line endings)
 */
export const normalizeOutput = (output: string): string => {
  return output
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\n+/g, '\n');
};

/**
 * Compare JS and C++ execution outputs
 */
export const compareOutputs = (jsResult: ExecutionResult, cppResult: ExecutionResult): boolean => {
  // Both must succeed
  if (!jsResult.success || !cppResult.success) {
    return false;
  }
  
  // Normalize and compare stdout
  const jsOut = normalizeOutput(jsResult.stdout);
  const cppOut = normalizeOutput(cppResult.stdout);
  
  return jsOut === cppOut;
};

/**
 * Check if Zig C++ compiler is available
 */
export const isCppCompilerAvailable = (): boolean => {
  try {
    execSync('zig version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};
