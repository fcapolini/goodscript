/**
 * Runtime Equivalence Testing Helpers
 * 
 * Utilities for executing both JS and Rust code and comparing their outputs.
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
 * Execute Rust code by compiling and running it
 */
export const executeRust = (rustCode: string): ExecutionResult => {
  const tmpDir = join(tmpdir(), 'rust-exec-' + Date.now() + '-' + Math.random().toString(36).substring(7));
  mkdirSync(tmpDir, { recursive: true });
  
  const rustFile = join(tmpDir, 'test.rs');
  const binFile = join(tmpDir, 'test');
  
  writeFileSync(rustFile, rustCode, 'utf-8');
  
  try {
    // Compile the Rust code
    execSync(
      `rustc ${rustFile} -o ${binFile} 2>&1`,
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
 * Compare JS and Rust execution outputs
 */
export const compareOutputs = (jsResult: ExecutionResult, rustResult: ExecutionResult): boolean => {
  // Both must succeed
  if (!jsResult.success || !rustResult.success) {
    return false;
  }
  
  // Normalize and compare stdout
  const jsOut = normalizeOutput(jsResult.stdout);
  const rustOut = normalizeOutput(rustResult.stdout);
  
  return jsOut === rustOut;
};

/**
 * Execute Rust code using Cargo (supports external dependencies like Tokio)
 */
export const executeRustWithCargo = (rustCode: string, includeTokio: boolean = false): ExecutionResult => {
  const tmpDir = join(tmpdir(), 'rust-cargo-exec-' + Date.now() + '-' + Math.random().toString(36).substring(7));
  mkdirSync(tmpDir, { recursive: true });
  
  // Create Cargo.toml
  const cargoToml = `[package]
name = "goodscript_test"
version = "0.1.0"
edition = "2021"

${includeTokio ? `[dependencies]
tokio = { version = "1", features = ["full"] }` : ''}
`;
  writeFileSync(join(tmpDir, 'Cargo.toml'), cargoToml, 'utf-8');
  
  // Create src/ directory
  const srcDir = join(tmpDir, 'src');
  mkdirSync(srcDir, { recursive: true });
  
  // Write main.rs
  writeFileSync(join(srcDir, 'main.rs'), rustCode, 'utf-8');
  
  try {
    // Build and run with Cargo
    const output = execSync(
      'cargo run --quiet',
      { 
        cwd: tmpDir,
        encoding: 'utf-8', 
        timeout: 30000  // Longer timeout for Cargo builds
      }
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
 * Check if rustc is available
 */
export const isRustcAvailable = (): boolean => {
  try {
    execSync('rustc --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if cargo is available
 */
export const isCargoAvailable = (): boolean => {
  try {
    execSync('cargo --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

