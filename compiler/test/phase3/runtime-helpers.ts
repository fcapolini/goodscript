/**
 * Runtime Equivalence Testing Helpers
 * 
 * Utilities for executing both JS and C++ code and comparing their outputs.
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';

// Path to GoodScript runtime headers
const RUNTIME_DIR = resolve(__dirname, '../../runtime');

// Path to MPS source (vendored)
const MPS_SRC_DIR = resolve(__dirname, '../../vendor/mps/src');

// Path to cppcoro (vendored)
const CPPCORO_DIR = resolve(__dirname, '../../vendor/cppcoro/include');
const CPPCORO_LIB_DIR = resolve(__dirname, '../../vendor/cppcoro/lib');

// Path to PCRE2 source (vendored)
const PCRE2_SRC_DIR = resolve(__dirname, '../../vendor/pcre2/src');

// Cached object files (compile once, reuse across all tests)
let MPS_CACHED_OBJ: string | null = null;
let CPPCORO_CACHED_OBJ: string | null = null;
let PCRE2_CACHED_OBJ: string | null = null;

/**
 * Get or compile the MPS object file (cached for performance)
 */
function getMpsObjectFile(): string {
  if (MPS_CACHED_OBJ && existsSync(MPS_CACHED_OBJ)) {
    return MPS_CACHED_OBJ;
  }
  
  // Compile MPS to a persistent cache location
  const cacheDir = join(tmpdir(), 'goodscript-mps-cache');
  mkdirSync(cacheDir, { recursive: true });
  
  const mpsObj = join(cacheDir, 'mps.o');
  
  // Only compile if not already cached
  if (!existsSync(mpsObj)) {
    const compileMpsCmd = `cc -O2 -c ${join(MPS_SRC_DIR, 'mps.c')} -o ${mpsObj}`;
    execSync(compileMpsCmd, { 
      encoding: 'utf-8', 
      timeout: 30000,  // First compile may take longer
      stdio: ['pipe', 'pipe', 'pipe']
    });
  }
  
  MPS_CACHED_OBJ = mpsObj;
  return mpsObj;
}

/**
 * Get or compile the cppcoro object file (cached for performance)
 */
function getCppcoroObjectFile(): string {
  if (CPPCORO_CACHED_OBJ && existsSync(CPPCORO_CACHED_OBJ)) {
    return CPPCORO_CACHED_OBJ;
  }
  
  // Compile cppcoro to a persistent cache location
  const cacheDir = join(tmpdir(), 'goodscript-cppcoro-cache');
  mkdirSync(cacheDir, { recursive: true });
  
  const cppcoroObj = join(cacheDir, 'cppcoro.o');
  
  // Only compile if not already cached
  if (!existsSync(cppcoroObj)) {
    const compileCppcoroCmd = `zig c++ -std=c++20 -O2 -I${CPPCORO_DIR} -c ${join(CPPCORO_LIB_DIR, 'lightweight_manual_reset_event.cpp')} -o ${cppcoroObj}`;
    execSync(compileCppcoroCmd, { 
      encoding: 'utf-8', 
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
  }
  
  CPPCORO_CACHED_OBJ = cppcoroObj;
  return cppcoroObj;
}

/**
 * Get or compile the PCRE2 object files (cached for performance)
 * Returns array of [pcre2_all.o, pcre2_chartables.o]
 */
function getPcre2ObjectFiles(): string[] {
  const cacheDir = join(tmpdir(), 'goodscript-pcre2-cache');
  mkdirSync(cacheDir, { recursive: true });
  
  const pcre2AllObj = join(cacheDir, 'pcre2_all.o');
  const pcre2ChartablesObj = join(cacheDir, 'pcre2_chartables.o');
  
  // Compile pcre2_all.c if not cached
  if (!existsSync(pcre2AllObj)) {
    const compileCmd = `zig cc -O2 -DPCRE2_CODE_UNIT_WIDTH=8 -DHAVE_CONFIG_H -DPCRE2_STATIC -I${PCRE2_SRC_DIR} -c ${join(PCRE2_SRC_DIR, 'pcre2_all.c')} -o ${pcre2AllObj}`;
    execSync(compileCmd, { 
      encoding: 'utf-8', 
      timeout: 30000,  // First compile may take longer
      stdio: ['pipe', 'pipe', 'pipe']
    });
  }
  
  // Compile pcre2_chartables.c if not cached
  if (!existsSync(pcre2ChartablesObj)) {
    const compileCmd = `zig cc -O2 -DPCRE2_CODE_UNIT_WIDTH=8 -DHAVE_CONFIG_H -DPCRE2_STATIC -I${PCRE2_SRC_DIR} -c ${join(PCRE2_SRC_DIR, 'pcre2_chartables.c')} -o ${pcre2ChartablesObj}`;
    execSync(compileCmd, { 
      encoding: 'utf-8', 
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
  }
  
  return [pcre2AllObj, pcre2ChartablesObj];
}

// Export paths and caching functions for use in other test helpers
export { RUNTIME_DIR, MPS_SRC_DIR, CPPCORO_DIR, CPPCORO_LIB_DIR, PCRE2_SRC_DIR, getMpsObjectFile, getCppcoroObjectFile, getPcre2ObjectFiles };

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
    // Compile the C++ code using Zig's C++ compiler (C++20 for runtime library features)
    const compileOutput = execSync(
      `zig c++ -std=c++20 -I${RUNTIME_DIR} ${cppFile} -o ${binFile}`,
      { encoding: 'utf-8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] }
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
 * Execute GC mode C++ code by compiling and running it
 */
export const executeGcCpp = (gcCppCode: string, outDir: string): ExecutionResult => {
  const tmpDir = join(tmpdir(), 'gc-cpp-exec-' + Date.now() + '-' + Math.random().toString(36).substring(7));
  mkdirSync(tmpDir, { recursive: true });
  
  const cppFile = join(tmpDir, 'test.cpp');
  const binFile = join(tmpDir, 'test');
  
  writeFileSync(cppFile, gcCppCode, 'utf-8');
  
  try {
    // Check if code uses cppcoro (async/await)
    const needsCppcoro = gcCppCode.includes('cppcoro/task.hpp');
    const CPPCORO_DIR = join(RUNTIME_DIR, '../vendor/cppcoro/include');
    const CPPCORO_LIB_DIR = join(RUNTIME_DIR, '../vendor/cppcoro/lib');
    
    // Get cached MPS object file (compiled once, reused across all tests)
    const mpsObj = getMpsObjectFile();
    
    let compileCmd = `zig c++ -std=c++20 -O3 -I${RUNTIME_DIR} -I${MPS_SRC_DIR} ${cppFile} ${mpsObj}`;
    
    if (needsCppcoro) {
      // Get cached cppcoro object file
      const cppcoroObj = getCppcoroObjectFile();
      compileCmd += ` -I${CPPCORO_DIR} ${cppcoroObj}`;
    }
    
    compileCmd += ` -o ${binFile}`;
    
    // Compile the GC C++ code using Zig's C++ compiler (C++20 for runtime library features)
    // Link with MPS (Memory Pool System) statically for garbage collection
    // Use -O3 for fair performance comparison with ownership mode
    const compileOutput = execSync(
      compileCmd,
      { encoding: 'utf-8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] }
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
