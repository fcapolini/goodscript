import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Compiler } from '../../src/compiler';
import { writeFileSync, unlinkSync, mkdirSync, existsSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { validateRustCode, isRustcAvailable } from './rust-validator';
import { executeJS, executeRust, compareOutputs, normalizeOutput } from './runtime-helpers';

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

  const compileAndExecute = (source: string): {
    jsCode: string;
    rustCode: string;
    jsResult: ReturnType<typeof executeJS>;
    rustResult: ReturnType<typeof executeRust>;
    equivalent: boolean;
  } => {
    const srcFile = join(tmpDir, 'test.gs.ts');
    const outDir = join(tmpDir, 'dist');
    
    writeFileSync(srcFile, source, 'utf-8');
    
    // Compile to JavaScript
    compiler.compile({
      files: [srcFile],
      outDir,
      target: 'typescript',
    });
    
    const jsFile = join(outDir, 'test.js');
    const jsCode = existsSync(jsFile) ? readFileSync(jsFile, 'utf-8') : '';
    
    // Compile to Rust
    compiler.compile({
      files: [srcFile],
      outDir,
      target: 'rust',
    });
    
    const rsFile = join(outDir, 'test.rs');
    const rustCode = existsSync(rsFile) ? readFileSync(rsFile, 'utf-8') : '';
    
    // Execute both
    const jsResult = executeJS(jsCode);
    const rustResult = isRustcAvailable() 
      ? executeRust(rustCode)
      : { success: false, stdout: '', stderr: 'rustc not available', exitCode: 1 };
    
    const equivalent = compareOutputs(jsResult, rustResult);
    
    return {
      jsCode,
      rustCode,
      jsResult,
      rustResult,
      equivalent,
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
      // Use .iter().copied() for iterating over Vec<f64> to get owned values
      expect(result.rustCode).toMatch(/for n in (&arr|arr\.iter\(\)\.copied\(\))/);
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
      // Accept both &items and .iter().copied() patterns
      expect(result.rustCode).toMatch(/for item in (&items|items\.iter\(\)\.copied\(\))/);
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
      // Accept both &numbers and .iter().copied() patterns
      expect(result.rustCode).toMatch(/for n in (&numbers|numbers\.iter\(\)\.copied\(\))/);
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
      // Property access uses .iter().copied() to get owned values for Copy types
      expect(result.rustCode).toContain('for v in self.values.iter().copied()');
      expect(result.rustCode).toContain('self.values = newArray');
      expect(result.rustCode).not.toContain('this.');
      expect(result.rustCode).not.toContain('const v');
    });
  });

  describe('Runtime Equivalence - Advanced Features', () => {
    it('should produce equivalent output for array operations', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const numbers: number[] = [10, 20, 30];
        for (const n of numbers) {
          console.log(n);
        }
      `);
      
      if (!result.jsResult.success || !result.rustResult.success) {
        console.log('JS output:', result.jsResult.stdout, result.jsResult.stderr);
        console.log('Rust output:', result.rustResult.stdout, result.rustResult.stderr);
      }
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(normalizeOutput(result.jsResult.stdout)).toBe('10\n20\n30');
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for nested loops', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const rows: number[] = [1, 2];
        const cols: number[] = [3, 4];
        for (const r of rows) {
          for (const c of cols) {
            console.log(r * c);
          }
        }
      `);
      
      if (!result.jsResult.success || !result.rustResult.success) {
        console.log('JS output:', result.jsResult.stdout, result.jsResult.stderr);
        console.log('Rust output:', result.rustResult.stdout, result.rustResult.stderr);
        console.log('Rust code:', result.rustCode);
      }
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(normalizeOutput(result.jsResult.stdout)).toBe('3\n4\n6\n8');
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for arithmetic in loops', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const vals: number[] = [5, 10, 15];
        for (const v of vals) {
          const doubled: number = v * 2;
          console.log(doubled);
        }
      `);
      
      if (!result.jsResult.success || !result.rustResult.success) {
        console.log('JS output:', result.jsResult.stdout, result.jsResult.stderr);
        console.log('Rust output:', result.rustResult.stdout, result.rustResult.stderr);
      }
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(normalizeOutput(result.jsResult.stdout)).toBe('10\n20\n30');
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for this.property access', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        class Counter {
          count: number = 5;
          
          increment(): void {
            this.count = this.count + 1;
          }
          
          getValue(): number {
            return this.count;
          }
        }
        
        const c = new Counter();
        console.log(c.getValue());
        c.increment();
        console.log(c.getValue());
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for multiple this references', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        class Calculator {
          x: number = 3;
          y: number = 4;
          
          setValues(a: number, b: number): void {
            this.x = a;
            this.y = b;
          }
          
          sum(): number {
            return this.x + this.y;
          }
        }
        
        const calc = new Calculator();
        console.log(calc.sum());
        calc.setValues(10, 20);
        console.log(calc.sum());
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for for-of with const', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const arr: number[] = [1, 2, 3, 4];
        let total = 0;
        for (const n of arr) {
          total = total + n;
        }
        console.log(total);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for for-of with let', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const items: number[] = [5, 10, 15];
        for (let item of items) {
          console.log(item * 2);
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for arrow function with block body', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const add = (a: number, b: number): number => {
          return a + b;
        };
        console.log(add(5, 3));
        console.log(add(10, 20));
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for multi-statement arrow functions', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const compute = (x: number): number => {
          const doubled = x + x;
          const squared = doubled * doubled;
          return squared;
        };
        console.log(compute(2));
        console.log(compute(3));
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for arrow function with for loop', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const sumArray = (numbers: number[]): number => {
          let total = 0;
          for (const n of numbers) {
            total = total + n;
          }
          return total;
        };
        const nums: number[] = [1, 2, 3, 4, 5];
        console.log(sumArray(nums));
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for single-expression arrow functions', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const square = (x: number): number => x * x;
        const double = (x: number): number => x + x;
        console.log(square(5));
        console.log(double(7));
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for class with methods using this and loops', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        class Accumulator {
          total: number = 0;
          
          add(value: number): void {
            this.total = this.total + value;
          }
          
          getTotal(): number {
            return this.total;
          }
        }
        
        const acc = new Accumulator();
        const values: number[] = [1, 2, 3, 4, 5];
        for (const v of values) {
          acc.add(v);
        }
        console.log(acc.getTotal());
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for this.property access', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        class Box {
          value: number = 100;
          
          getValue(): number {
            return this.value;
          }
        }
        
        const b = new Box();
        console.log(b.getValue());
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for method returning this.property', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        class Calculator {
          x: number = 5;
          y: number = 10;
          
          multiply(): number {
            return this.x * this.y;
          }
        }
        
        const calc = new Calculator();
        console.log(calc.multiply());
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });
  });
});
