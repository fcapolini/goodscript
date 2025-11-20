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
  });
});
