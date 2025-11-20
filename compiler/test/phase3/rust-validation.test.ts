import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Compiler } from '../../src/compiler';
import { writeFileSync, mkdirSync, existsSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { validateRustCode, isRustcAvailable } from './rust-validator';
import { executeJS, executeRust, compareOutputs } from './runtime-helpers';

describe('Phase 3 - Rust Code Validation with rustc', () => {
  let tmpDir: string;
  let compiler: Compiler;
  const hasRustc = isRustcAvailable();

  beforeEach(() => {
    tmpDir = join(tmpdir(), 'goodscript-test-rustval-' + Date.now() + '-' + Math.random().toString(36).substring(7));
    mkdirSync(tmpDir, { recursive: true });
    compiler = new Compiler();
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  const compileAndValidate = (source: string): { 
    compileSuccess: boolean; 
    rustCode: string; 
    jsCode: string;
    rustValid: boolean; 
    rustErrors: string[];
    compileErrors: string[];
  } => {
    const srcFile = join(tmpDir, 'test.gs.ts');
    const outDir = join(tmpDir, 'dist');
    
    writeFileSync(srcFile, source, 'utf-8');
    
    const result = compiler.compile({
      files: [srcFile],
      outDir,
      target: 'rust',
    });
    
    let rustCode = '';
    let jsCode = '';
    const rsFile = join(outDir, 'test.rs');
    const jsFile = join(outDir, 'test.js');
    
    if (existsSync(rsFile)) {
      rustCode = readFileSync(rsFile, 'utf-8');
    }
    if (existsSync(jsFile)) {
      jsCode = readFileSync(jsFile, 'utf-8');
    }
    
    const compileErrors = result.diagnostics
      .filter(d => d.severity === 'error')
      .map(d => d.message);
    
    // Validate with rustc
    let rustValid = false;
    let rustErrors: string[] = [];
    
    if (hasRustc && rustCode) {
      const validation = validateRustCode(rustCode);
      rustValid = validation.valid;
      rustErrors = validation.errors;
    }
    
    return {
      compileSuccess: result.success,
      rustCode,
      jsCode,
      rustValid,
      rustErrors,
      compileErrors,
    };
  };

  // Skip all tests if rustc is not available
  const testOrSkip = hasRustc ? it : it.skip;

  describe('Primitive Types Validation', () => {
    testOrSkip('should generate valid Rust for number', () => {
      const result = compileAndValidate(`
        const x: number = 42;
      `);
      
      expect(result.compileSuccess).toBe(true);
      if (!result.rustValid) {
        console.log('Rust code:', result.rustCode);
        console.log('Rust errors:', result.rustErrors);
      }
      expect(result.rustValid).toBe(true);
    });

    testOrSkip('should generate valid Rust for string', () => {
      const result = compileAndValidate(`
        const s: string = "hello";
      `);
      
      expect(result.compileSuccess).toBe(true);
      expect(result.rustValid).toBe(true);
    });

    testOrSkip('should generate valid Rust for boolean', () => {
      const result = compileAndValidate(`
        const flag: boolean = true;
      `);
      
      expect(result.compileSuccess).toBe(true);
      expect(result.rustValid).toBe(true);
    });

    testOrSkip('should generate valid Rust for mixed types', () => {
      const result = compileAndValidate(`
        const num: number = 42;
        const str: string = "test";
        const bool: boolean = false;
      `);
      
      expect(result.compileSuccess).toBe(true);
      expect(result.rustValid).toBe(true);
    });
  });

  describe('Arrow Functions Validation', () => {
    testOrSkip('should generate valid Rust for single-expression arrow function', () => {
      const result = compileAndValidate(`
        const add = (a: number, b: number): number => a + b;
      `);
      
      expect(result.compileSuccess).toBe(true);
      if (!result.rustValid) {
        console.log('Rust code:', result.rustCode);
        console.log('Rust errors:', result.rustErrors);
      }
      expect(result.rustValid).toBe(true);
    });

    testOrSkip('should generate valid Rust for block body arrow function', () => {
      const result = compileAndValidate(`
        const square = (x: number): number => {
          return x * x;
        };
      `);
      
      expect(result.compileSuccess).toBe(true);
      expect(result.rustValid).toBe(true);
    });
  });

  describe('Collections Validation', () => {
    testOrSkip('should generate valid Rust for array literal', () => {
      const result = compileAndValidate(`
        const nums: number[] = [1, 2, 3];
      `);
      
      expect(result.compileSuccess).toBe(true);
      expect(result.rustValid).toBe(true);
    });

    testOrSkip('should generate valid Rust for empty array', () => {
      const result = compileAndValidate(`
        const nums: number[] = [];
      `);
      
      expect(result.compileSuccess).toBe(true);
      expect(result.rustValid).toBe(true);
    });
  });

  describe('Ownership Types Validation', () => {
    testOrSkip('should generate valid Rust for Unique<T>', () => {
      const result = compileAndValidate(`
        const x: Unique<number> = 42;
      `);
      
      expect(result.compileSuccess).toBe(true);
      expect(result.rustValid).toBe(true);
      expect(result.rustCode).toContain('use std::boxed::Box;');
    });

    testOrSkip('should generate valid Rust for Shared<T>', () => {
      const result = compileAndValidate(`
        const x: Shared<number> = 42;
      `);
      
      expect(result.compileSuccess).toBe(true);
      if (!result.rustValid) {
        console.log('Rust code:', result.rustCode);
        console.log('Rust errors:', result.rustErrors);
      }
      expect(result.rustValid).toBe(true);
      expect(result.rustCode).toContain('use std::rc::Rc;');
    });

    testOrSkip('should generate valid Rust for Weak<T>', () => {
      const result = compileAndValidate(`
        const x: Weak<number> = 42;
      `);
      
      expect(result.compileSuccess).toBe(true);
      if (!result.rustValid) {
        console.log('Rust code:', result.rustCode);
        console.log('Rust errors:', result.rustErrors);
      }
      expect(result.rustValid).toBe(true);
      expect(result.rustCode).toContain('use std::rc::Weak;');
    });

    testOrSkip('should generate valid Rust for mixed ownership types', () => {
      const result = compileAndValidate(`
        const a: Unique<number> = 1;
        const b: Shared<number> = 2;
        const c: Weak<number> = 3;
      `);
      
      expect(result.compileSuccess).toBe(true);
      expect(result.rustValid).toBe(true);
    });
  });

  describe('Classes Validation', () => {
    testOrSkip('should generate valid Rust for simple class', () => {
      const result = compileAndValidate(`
        class Point {
          x: number = 0;
          y: number = 0;
        }
      `);
      
      expect(result.compileSuccess).toBe(true);
      expect(result.rustValid).toBe(true);
    });

    testOrSkip('should generate valid Rust for class with methods', () => {
      const result = compileAndValidate(`
        class Counter {
          count: number = 0;
          
          increment(): void {
            this.count = this.count + 1;
          }
        }
      `);
      
      expect(result.compileSuccess).toBe(true);
      expect(result.rustValid).toBe(true);
    });

    testOrSkip('should generate valid Rust for class with mixed types', () => {
      const result = compileAndValidate(`
        class User {
          id: number = 0;
          name: string = "";
          active: boolean = false;
        }
      `);
      
      expect(result.compileSuccess).toBe(true);
      expect(result.rustValid).toBe(true);
    });
  });

  describe('Advanced Features Validation', () => {
    testOrSkip('should generate valid Rust for for-of loop', () => {
      const result = compileAndValidate(`
        const sum = (arr: number[]): number => {
          let total = 0;
          for (const n of arr) {
            total = total + n;
          }
          return total;
        };
      `);
      
      expect(result.compileSuccess).toBe(true);
      expect(result.rustValid).toBe(true);
    });

    testOrSkip('should generate valid Rust for this.property', () => {
      const result = compileAndValidate(`
        class Box {
          value: number = 0;
          
          getValue(): number {
            return this.value;
          }
        }
      `);
      
      expect(result.compileSuccess).toBe(true);
      expect(result.rustValid).toBe(true);
    });

    testOrSkip('should generate valid Rust for if/else', () => {
      const result = compileAndValidate(`
        const max = (a: number, b: number): number => {
          if (a > b) {
            return a;
          } else {
            return b;
          }
        };
      `);
      
      expect(result.compileSuccess).toBe(true);
      expect(result.rustValid).toBe(true);
    });
  });

  describe('Null/Undefined Validation', () => {
    testOrSkip('should generate valid Rust for null', () => {
      const result = compileAndValidate(`
        const x: number | null = null;
      `);
      
      expect(result.compileSuccess).toBe(true);
      expect(result.rustValid).toBe(true);
    });

    testOrSkip('should generate valid Rust for undefined', () => {
      const result = compileAndValidate(`
        const x: number | undefined = undefined;
      `);
      
      expect(result.compileSuccess).toBe(true);
      expect(result.rustValid).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    testOrSkip('should generate valid Rust for complex example', () => {
      const result = compileAndValidate(`
        class Calculator {
          values: number[] = [];
          
          add(value: number): void {
            const newValues: number[] = [];
            for (const v of this.values) {
              const x = v;
            }
            this.values = newValues;
          }
          
          sum(): number {
            let total = 0;
            for (const v of this.values) {
              total = total + v;
            }
            return total;
          }
        }
      `);
      
      expect(result.compileSuccess).toBe(true);
      if (!result.rustValid) {
        console.log('Rust code:', result.rustCode);
        console.log('Rust errors:', result.rustErrors);
      }
      expect(result.rustValid).toBe(true);
    });
  });

  // Info test to show if rustc is available
  it('should detect rustc availability', () => {
    if (hasRustc) {
      console.log('✓ rustc is available - Rust validation tests will run');
    } else {
      console.log('⚠ rustc not available - Rust validation tests will be skipped');
    }
    // Always pass, this is just informational
    expect(true).toBe(true);
  });

  describe('Runtime Equivalence - Core Features', () => {
    testOrSkip('should produce same output for primitive types', async () => {
      const source = `
        const x = 42;
        const s = "hello";
        const b = true;
        console.log(x);
        console.log(s);
        console.log(b);
      `;

      const result = compileAndValidate(source);
      expect(result.compileSuccess).toBe(true);
      expect(result.rustValid).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    testOrSkip('should produce same output for arrow functions', async () => {
      const source = `
        const double = (x: number): number => x * 2;
        const result = double(21);
        console.log(result);
      `;

      const result = compileAndValidate(source);
      expect(result.compileSuccess).toBe(true);
      expect(result.rustValid).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    testOrSkip('should produce same output for arrays', async () => {
      const source = `
        const nums = [1, 2, 3];
        for (const n of nums) {
          console.log(n);
        }
      `;

      const result = compileAndValidate(source);
      expect(result.compileSuccess).toBe(true);
      expect(result.rustValid).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    testOrSkip('should produce same output for function calls', async () => {
      const source = `
        const greet = (name: string): string => "Hello, " + name;
        const message = greet("World");
        console.log(message);
      `;

      const result = compileAndValidate(source);
      expect(result.compileSuccess).toBe(true);
      expect(result.rustValid).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    testOrSkip('should produce same output for arithmetic operations', async () => {
      const source = `
        const a = 10;
        const b = 5;
        console.log(a + b);
        console.log(a - b);
        console.log(a * b);
        console.log(a / b);
      `;

      const result = compileAndValidate(source);
      expect(result.compileSuccess).toBe(true);
      expect(result.rustValid).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    testOrSkip('should produce same output for comparison operations', async () => {
      const source = `
        const x: number = 5;
        const y: number = 3;
        console.log(x === 5);
        console.log(x !== y);
        console.log(x > y);
        console.log(x < 10);
      `;

      const result = compileAndValidate(source);
      expect(result.compileSuccess).toBe(true);
      expect(result.rustValid).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    testOrSkip('should produce same output for logical operations', async () => {
      const source = `
        const a = true;
        const b = false;
        console.log(a && b);
        console.log(a || b);
        console.log(!a);
      `;

      const result = compileAndValidate(source);
      expect(result.compileSuccess).toBe(true);
      expect(result.rustValid).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    testOrSkip('should produce same output for nested function calls', async () => {
      const source = `
        const add = (a: number, b: number): number => a + b;
        const multiply = (x: number, y: number): number => x * y;
        const result = multiply(add(2, 3), 4);
        console.log(result);
      `;

      const result = compileAndValidate(source);
      expect(result.compileSuccess).toBe(true);
      expect(result.rustValid).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });
  });
});
