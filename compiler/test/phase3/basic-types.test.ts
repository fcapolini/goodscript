import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Compiler } from '../../src/compiler';
import { writeFileSync, unlinkSync, mkdirSync, existsSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { validateRustCode, isRustcAvailable } from './rust-validator';
import { executeJS, executeRust, compareOutputs, normalizeOutput } from './runtime-helpers';

describe('Phase 3 - Rust Code Generation - Basic Types', () => {
  let tmpDir: string;
  let compiler: Compiler;

  beforeEach(() => {
    tmpDir = join(tmpdir(), 'goodscript-test-basic-' + Date.now() + '-' + Math.random().toString(36).substring(7));
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
    const jsCompileResult = compiler.compile({
      files: [srcFile],
      outDir,
      target: 'typescript',
    });
    
    const jsFile = join(outDir, 'test.js');
    const jsCode = existsSync(jsFile) ? readFileSync(jsFile, 'utf-8') : '';
    
    // Compile to Rust
    const rustCompileResult = compiler.compile({
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

  describe('Primitive Types', () => {
    it('should translate number to f64', () => {
      const result = compile(`
        const x: number = 42;
      `);
      
      if (!result.success) {
        console.log('Errors:', result.errors);
      }
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('let x: f64 = 42');
      
      // Validate with rustc if available
      if (result.rustValid !== undefined) {
        if (!result.rustValid) {
          console.log('Rust errors:', result.rustErrors);
        }
        expect(result.rustValid).toBe(true);
      }
    });

    it('should translate string to String', () => {
      const result = compile(`
        const s: string = "hello";
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('let s: String = String::from("hello")');
    });

    it('should translate boolean to bool', () => {
      const result = compile(`
        const flag: boolean = true;
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('let flag: bool = true');
    });

    it('should translate void to unit type ()', () => {
      const result = compile(`
        const noop = (): void => {};
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('-> Result<(), String>');
    });
  });

  describe('Arrow Functions', () => {
    it('should translate simple arrow function', () => {
      const result = compile(`
        const add = (a: number, b: number): number => a + b;
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('let add = |a: f64, b: f64| -> Result<f64, String> { Ok(a + b) }');
    });

    it('should translate arrow function with block body', () => {
      const result = compile(`
        const square = (x: number): number => {
          return x * x;
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('let square = |x: f64| -> Result<f64, String>');
      expect(result.rustCode).toContain('return Ok(x * x);');
    });
  });

  describe('Runtime Equivalence - Primitive Types', () => {
    it('should produce equivalent output for number type', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const x: number = 42;
        console.log(x);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for number operations', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const x: number = 10;
        const y: number = 5;
        const sum: number = x + y;
        const product: number = x * y;
        console.log(sum);
        console.log(product);
      `);
      
      if (!result.jsResult.success || !result.rustResult.success) {
        console.log('JS output:', result.jsResult.stdout, result.jsResult.stderr);
        console.log('Rust output:', result.rustResult.stdout, result.rustResult.stderr);
      }
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(normalizeOutput(result.jsResult.stdout)).toBe('15\n50');
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for string operations', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const hello: string = "Hello";
        const world: string = "World";
        const message: string = hello + " " + world;
        console.log(message);
      `);
      
      if (!result.jsResult.success || !result.rustResult.success) {
        console.log('JS output:', result.jsResult.stdout, result.jsResult.stderr);
        console.log('Rust output:', result.rustResult.stdout, result.rustResult.stderr);
      }
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(normalizeOutput(result.jsResult.stdout)).toBe('Hello World');
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for boolean operations', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const a: boolean = true;
        const b: boolean = false;
        console.log(a && b);
        console.log(a || b);
        console.log(!a);
      `);
      
      if (!result.jsResult.success || !result.rustResult.success) {
        console.log('JS output:', result.jsResult.stdout, result.jsResult.stderr);
        console.log('Rust output:', result.rustResult.stdout, result.rustResult.stderr);
      }
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(normalizeOutput(result.jsResult.stdout)).toBe('false\ntrue\nfalse');
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for string type', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const s: string = "hello";
        console.log(s);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for boolean type', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const flag: boolean = true;
        console.log(flag);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for arrow functions', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const add = (a: number, b: number): number => a + b;
        console.log(add(3, 4));
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for arrow functions with block body', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const square = (x: number): number => {
          return x * x;
        };
        console.log(square(5));
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for array literals', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const numbers: number[] = [1, 2, 3];
        for (const n of numbers) {
          console.log(n);
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for empty arrays', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const nums: number[] = [];
        console.log(nums.length);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for null values', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const x: number | null = null;
        if (x === null) {
          console.log("null");
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for undefined values', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const x: number | undefined = undefined;
        if (x === undefined) {
          console.log("undefined");
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for nullable type with value', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const x: number | null = 42;
        if (x !== null && x !== undefined) {
          console.log(x);
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for void return type', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const noop = (): void => {
          console.log("executed");
        };
        noop();
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for array type annotation', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const numbers: number[] = [1, 2, 3];
        for (const n of numbers) {
          console.log(n);
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for empty array with type', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const nums: number[] = [];
        console.log(nums.length);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for Option with null check', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const x: number | null = 42;
        if (x !== null) {
          console.log(x);
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
        const multiply = (a: number, b: number): number => {
          const result = a * b;
          return result;
        };
        console.log(multiply(3, 4));
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for array literal', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const numbers: number[] = [1, 2, 3];
        for (const n of numbers) {
          console.log(n);
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for number type annotation', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const x: number = 42;
        const y: number = 10;
        console.log(x + y);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for string type annotation', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const s: string = "hello";
        console.log(s);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for boolean type annotation', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const flag: boolean = true;
        console.log(flag);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });
  });

  describe('Collections', () => {
    it('should translate array literal to vec!', () => {
      const result = compile(`
        const numbers: number[] = [1, 2, 3];
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('vec![1.0, 2.0, 3.0]');
    });

    it('should translate array type to Vec<T>', () => {
      const result = compile(`
        const nums: number[] = [];
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain(': Vec<f64>');
    });
  });

  describe('Null/Undefined', () => {
    it('should translate null to None', () => {
      const result = compile(`
        const x: number | null = null;
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('None');
    });

    it('should translate undefined to None', () => {
      const result = compile(`
        const x: number | undefined = undefined;
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('None');
    });

    it('should translate nullable type to Option<T>', () => {
      const result = compile(`
        const x: number | null = 42;
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('Option<f64>');
    });

    it('should produce equivalent output for null value', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const x: number | null = null;
        if (x === null || x === undefined) {
          console.log("is null");
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for undefined value', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const x: number | undefined = undefined;
        if (x === null || x === undefined) {
          console.log("is undefined");
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for complex number operations', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const a: number = 10;
        const b: number = 3;
        console.log(a + b);
        console.log(a - b);
        console.log(a * b);
        console.log(a / b);
        console.log(a % b);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for multiple string variables', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const a: string = "Hello";
        const b: string = "World";
        console.log(a);
        console.log(b);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for mixed type operations', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const num: number = 42;
        const str: string = "The answer is ";
        const bool: boolean = true;
        console.log(num);
        console.log(str);
        console.log(bool);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for void function', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const doNothing = (): void => {
          console.log("executed");
        };
        doNothing();
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for array with mixed operations', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const nums: number[] = [10, 20, 30];
        console.log(nums[0]);
        console.log(nums[1]);
        console.log(nums[2]);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for negative numbers', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const x: number = -42;
        const y: number = -3.14;
        console.log(x);
        console.log(y);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for boolean negation', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const a: boolean = true;
        const b: boolean = !a;
        console.log(a);
        console.log(b);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for string concatenation with variables', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const first: string = "Hello";
        const second: string = "World";
        const combined = first + " " + second;
        console.log(combined);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });
  });
});
