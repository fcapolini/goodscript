import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Compiler } from '../../src/compiler';
import { writeFileSync, unlinkSync, mkdirSync, existsSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { validateRustCode, isRustcAvailable } from './rust-validator';

describe('Phase 3 - Rust Code Generation - Advanced Features', () => {
  let tmpDir: string;
  let compiler: Compiler;

  beforeEach(() => {
    tmpDir = join(tmpdir(), 'goodscript-test-advanced-' + Date.now() + '-' + Math.random().toString(36).substring(7));
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

  describe('This to Self Translation', () => {
    it('should translate this.property to self.property', () => {
      const result = compile(`
        class Counter {
          count: number = 0;
          
          increment(): void {
            this.count = this.count + 1;
          }
        }
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('self.count = self.count + 1');
      expect(result.rustCode).not.toContain('this.');
    });

    it('should translate method returning this.property', () => {
      const result = compile(`
        class Box {
          value: number = 0;
          
          getValue(): number {
            return this.value;
          }
        }
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('return Ok(self.value)');
      expect(result.rustCode).not.toContain('this.');
    });

    it('should handle multiple this references', () => {
      const result = compile(`
        class Calculator {
          x: number = 0;
          y: number = 0;
          
          setValues(a: number, b: number): void {
            this.x = a;
            this.y = b;
          }
        }
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('self.x = a');
      expect(result.rustCode).toContain('self.y = b');
    });
  });

  describe('For-Of Loop Translation', () => {
    it('should translate for-of with const', () => {
      const result = compile(`
        const sum = (arr: number[]): number => {
          let total = 0;
          for (const n of arr) {
            total = total + n;
          }
          return total;
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('for n in arr');
      expect(result.rustCode).not.toContain('const n');
    });

    it('should translate for-of with let', () => {
      const result = compile(`
        const processItems = (items: string[]): void => {
          for (let item of items) {
            const x = item;
          }
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('for item in items');
      expect(result.rustCode).not.toContain('let item');
    });
  });

  describe('Arrow Function Block Bodies', () => {
    it('should format arrow function with block body correctly', () => {
      const result = compile(`
        const add = (a: number, b: number): number => {
          return a + b;
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('let add = |a: f64, b: f64| -> Result<f64, String> {');
      expect(result.rustCode).toContain('    return Ok(a + b);');
      expect(result.rustCode).toContain('};');
    });

    it('should handle multi-statement arrow functions', () => {
      const result = compile(`
        const compute = (x: number): number => {
          const doubled = x + x;
          const squared = doubled * doubled;
          return squared;
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('|x: f64| -> Result<f64, String> {');
      expect(result.rustCode).toContain('let doubled');
      expect(result.rustCode).toContain('let squared');
      expect(result.rustCode).toContain('return Ok(squared)');
    });

    it('should handle arrow function with for loop', () => {
      const result = compile(`
        const sumArray = (numbers: number[]): number => {
          let total = 0;
          for (const n of numbers) {
            total = total + n;
          }
          return total;
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('|numbers: Vec<f64>| -> Result<f64, String> {');
      expect(result.rustCode).toContain('let mut total = 0');
      expect(result.rustCode).toContain('for n in numbers');
      expect(result.rustCode).toContain('total = total + n');
    });

    it('should handle single-expression arrow functions', () => {
      const result = compile(`
        const square = (x: number): number => x * x;
        const double = (x: number): number => x + x;
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('let square = |x: f64| -> Result<f64, String> { Ok(x * x) }');
      expect(result.rustCode).toContain('let double = |x: f64| -> Result<f64, String> { Ok(x + x) }');
    });
  });

  describe('Combined Features', () => {
    it('should handle class with methods using this and loops', () => {
      const result = compile(`
        class Accumulator {
          values: number[] = [];
          
          add(value: number): void {
            const newArray: number[] = [];
            for (const v of this.values) {
              const x = v;
            }
            this.values = newArray;
          }
          
          getTotal(): number {
            let sum = 0;
            for (const v of this.values) {
              sum = sum + v;
            }
            return sum;
          }
        }
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('for v in &self.values');
      expect(result.rustCode).toContain('self.values = newArray');
      expect(result.rustCode).not.toContain('this.');
      expect(result.rustCode).not.toContain('const v');
    });
  });
});
