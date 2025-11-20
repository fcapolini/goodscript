import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Compiler } from '../../src/compiler';
import { writeFileSync, mkdirSync, existsSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { executeJS, executeRust, compareOutputs, normalizeOutput, isRustcAvailable } from './runtime-helpers';

describe('Phase 3 - Runtime Equivalence Tests', () => {
  let tmpDir: string;
  let compiler: Compiler;

  beforeEach(() => {
    tmpDir = join(tmpdir(), 'goodscript-test-runtime-' + Date.now() + '-' + Math.random().toString(36).substring(7));
    mkdirSync(tmpDir, { recursive: true });
    compiler = new Compiler();
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

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

  describe('Basic Types', () => {
    it('should produce equivalent output for number arithmetic', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const x: number = 10;
        const y: number = 20;
        const sum: number = x + y;
        console.log(sum);
      `);
      
      if (!result.jsResult.success) {
        console.log('JS failed:', result.jsResult.stderr);
        console.log('JS code:', result.jsCode);
      }
      
      if (!result.rustResult.success) {
        console.log('Rust failed:', result.rustResult.stderr);
        console.log('Rust code:', result.rustCode);
      }
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(normalizeOutput(result.jsResult.stdout)).toBe('30');
      expect(normalizeOutput(result.rustResult.stdout)).toBe('30');
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for string concatenation', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const greeting: string = "Hello";
        const userName: string = "World";
        const message: string = greeting + " " + userName;
        console.log(message);
      `);
      
      if (!result.jsResult.success) {
        console.log('JS failed:', result.jsResult.stderr);
        console.log('JS code:', result.jsCode);
      }
      
      if (!result.rustResult.success) {
        console.log('Rust failed:', result.rustResult.stderr);
        console.log('Rust stdout:', result.rustResult.stdout);
        console.log('Rust code:', result.rustCode);
      }
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(normalizeOutput(result.jsResult.stdout)).toBe('Hello World');
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for boolean logic', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const a: boolean = true;
        const b: boolean = false;
        const andResult: boolean = a && b;
        const orResult: boolean = a || b;
        console.log(andResult);
        console.log(orResult);
      `);
      
      if (!result.jsResult.success) {
        console.log('JS failed:', result.jsResult.stderr);
      }
      
      if (!result.rustResult.success) {
        console.log('Rust failed:', result.rustResult.stderr);
      }
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(normalizeOutput(result.jsResult.stdout)).toBe('false\ntrue');
      expect(result.equivalent).toBe(true);
    });
  });

  describe('Control Flow', () => {
    it('should produce equivalent output for if/else', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const x: number = 10;
        if (x > 5) {
          console.log("greater");
        } else {
          console.log("lesser");
        }
      `);
      
      if (!result.jsResult.success) {
        console.log('JS failed:', result.jsResult.stderr);
        console.log('JS code:', result.jsCode);
      }
      
      if (!result.rustResult.success) {
        console.log('Rust failed:', result.rustResult.stderr);
        console.log('Rust stdout:', result.rustResult.stdout);
        console.log('Rust code:', result.rustCode);
      }
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(normalizeOutput(result.jsResult.stdout)).toBe('greater');
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for for-of loop', () => {
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
      
      if (!result.jsResult.success) {
        console.log('JS failed:', result.jsResult.stderr);
        console.log('JS code:', result.jsCode);
      }
      
      if (!result.rustResult.success) {
        console.log('Rust failed:', result.rustResult.stderr);
        console.log('Rust stdout:', result.rustResult.stdout);
        console.log('Rust code:', result.rustCode);
      }
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(normalizeOutput(result.jsResult.stdout)).toBe('1\n2\n3');
      expect(result.equivalent).toBe(true);
    });
  });
});
