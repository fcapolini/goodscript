import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Compiler } from '../../src/compiler';
import { writeFileSync, unlinkSync, mkdirSync, existsSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { validateRustCode, isRustcAvailable } from './rust-validator';

describe('Phase 3 - Rust Code Generation - Classes', () => {
  let tmpDir: string;
  let compiler: Compiler;

  beforeEach(() => {
    tmpDir = join(tmpdir(), 'goodscript-test-classes-' + Date.now() + '-' + Math.random().toString(36).substring(7));
    mkdirSync(tmpDir, { recursive: true });
    compiler = new Compiler();
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  const compile = (source: string): { success: boolean; rustCode: string; errors: string[]; rustValid?: boolean; rustErrors?: string[] } => {
    const srcFile = join(tmpDir, 'test.gs.ts');
    const outDir = join(tmpDir, 'dist');
    
    writeFileSync(srcFile, source, 'utf-8');
    
    const result = compiler.compile({
      files: [srcFile],
      outDir,
      target: 'rust',
    });
    
    let rustCode = '';
    const rsFile = join(outDir, 'test.rs');
    if (existsSync(rsFile)) {
      rustCode = readFileSync(rsFile, 'utf-8');
    }
    
    const errors = result.diagnostics
      .filter(d => d.severity === 'error')
      .map(d => d.message);
    
    // Validate Rust code with rustc if available
    let rustValid = undefined;
    let rustErrors = undefined;
    if (isRustcAvailable() && rustCode) {
      const validation = validateRustCode(rustCode);
      rustValid = validation.valid;
      rustErrors = validation.errors;
    }
    
    return {
      success: result.success,
      rustCode,
      errors,
      rustValid,
      rustErrors,
    };
  };

  describe('Class to Struct', () => {
    it('should translate simple class to struct', () => {
      const result = compile(`
        class Point {
          x: number = 0;
          y: number = 0;
        }
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('struct Point {');
      expect(result.rustCode).toContain('x: f64,');
      expect(result.rustCode).toContain('y: f64,');
    });

    it('should handle class with mixed field types', () => {
      const result = compile(`
        class User {
          id: number = 0;
          name: string = "";
          active: boolean = false;
        }
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('struct User');
      expect(result.rustCode).toContain('id: f64,');
      expect(result.rustCode).toContain('name: String,');
      expect(result.rustCode).toContain('active: bool,');
    });
  });

  describe('Methods to Impl', () => {
    it('should translate methods to impl block', () => {
      const result = compile(`
        class Counter {
          count: number = 0;
          
          increment(): void {
            this.count = this.count + 1;
          }
        }
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('struct Counter');
      expect(result.rustCode).toContain('impl Counter {');
      expect(result.rustCode).toContain('fn increment(&self) -> ()');
    });

    it('should add self parameter to methods', () => {
      const result = compile(`
        class Calculator {
          value: number = 0;
          
          getValue(): number {
            return this.value;
          }
        }
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('fn getValue(&self) -> f64');
    });

    it('should handle methods with parameters', () => {
      const result = compile(`
        class MathHelper {
          multiplier: number = 1;
          
          add(a: number, b: number): number {
            return a + b;
          }
        }
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('fn add(&self, a: f64, b: f64) -> f64');
    });
  });

  describe('Interfaces to Structs', () => {
    it('should translate interface to struct', () => {
      const result = compile(`
        interface Point {
          x: number;
          y: number;
        }
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('struct Point {');
      expect(result.rustCode).toContain('x: f64,');
      expect(result.rustCode).toContain('y: f64,');
    });

    it('should handle optional properties with Option<T>', () => {
      const result = compile(`
        interface User {
          id: number;
          email: string | null;
        }
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('struct User');
      expect(result.rustCode).toContain('id: f64,');
      expect(result.rustCode).toContain('email: Option<String>,');
    });
  });
});
