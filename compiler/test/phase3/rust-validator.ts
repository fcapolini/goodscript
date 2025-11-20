/**
 * Rust Code Validator
 * 
 * Utilities for validating generated Rust code with rustc
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export interface RustValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate Rust code by compiling it with rustc
 */
export const validateRustCode = (rustCode: string): RustValidationResult => {
  const tmpDir = join(tmpdir(), 'rustc-validation-' + Date.now() + '-' + Math.random().toString(36).substring(7));
  mkdirSync(tmpDir, { recursive: true });
  
  const rustFile = join(tmpDir, 'test.rs');
  writeFileSync(rustFile, rustCode, 'utf-8');
  
  try {
    // Compile with rustc (syntax check only, no linking)
    const output = execSync(
      `rustc --crate-type lib ${rustFile} -o ${join(tmpDir, 'test.rlib')} 2>&1`,
      { encoding: 'utf-8', timeout: 5000 }
    );
    
    // Clean up
    if (existsSync(rustFile)) unlinkSync(rustFile);
    if (existsSync(join(tmpDir, 'test.rlib'))) unlinkSync(join(tmpDir, 'test.rlib'));
    
    // Check for warnings in output
    const warnings: string[] = [];
    if (output.trim()) {
      const lines = output.split('\n').filter(l => l.trim());
      warnings.push(...lines);
    }
    
    return {
      valid: true,
      errors: [],
      warnings,
    };
  } catch (error: any) {
    // Compilation failed
    const stderr = error.stdout || error.stderr || error.message || '';
    
    // Clean up
    if (existsSync(rustFile)) unlinkSync(rustFile);
    
    // Parse rustc errors
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const lines = stderr.split('\n');
    for (const line of lines) {
      if (line.includes('error[E') || line.includes('error:')) {
        errors.push(line.trim());
      } else if (line.includes('warning:')) {
        warnings.push(line.trim());
      }
    }
    
    return {
      valid: false,
      errors: errors.length > 0 ? errors : [stderr],
      warnings,
    };
  }
};

/**
 * Check if rustc is available on the system
 */
export const isRustcAvailable = (): boolean => {
  try {
    execSync('rustc --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};
