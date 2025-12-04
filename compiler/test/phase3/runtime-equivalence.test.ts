import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Compiler } from '../../src/compiler';
import { writeFileSync, mkdirSync, existsSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { executeJS, executeGcCpp, compareOutputs, normalizeOutput, isCppCompilerAvailable } from './runtime-helpers';

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
    cppCode: string;
    jsResult: ReturnType<typeof executeJS>;
    nativeResult: ReturnType<typeof executeGcCpp>;
    equivalent: boolean;
  } => {
    const srcFile = join(tmpDir, 'test-gs.ts');
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
    
    // Compile to C++
    const cppCompileResult = compiler.compile({
      files: [srcFile],
      outDir,
      target: 'native',
    });
    
    const cppFile = join(outDir, 'test.cpp');
    const cppCode = existsSync(cppFile) ? readFileSync(cppFile, 'utf-8') : '';
    
    // Execute both
    const jsResult = executeJS(jsCode);
    const nativeResult = isCppCompilerAvailable() 
      ? executeGcCpp(cppCode, outDir)
      : { success: false, stdout: '', stderr: 'C++ compiler not available', exitCode: 1 };
    
    const equivalent = compareOutputs(jsResult, nativeResult);
    
    return {
      jsCode,
      cppCode,
      jsResult,
      nativeResult,
      equivalent,
    };
  };

  describe('Basic Types', () => {
    it('should produce equivalent output for number arithmetic', () => {
      if (!isCppCompilerAvailable()) {
        console.log('Skipping runtime test: C++ compiler not available');
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
      
      if (!result.nativeResult.success) {
        console.log('C++ compilation/execution failed!');
        console.log('C++ stderr:', result.nativeResult.stderr);
        console.log('C++ stdout:', result.nativeResult.stdout);
        console.log('C++ exitCode:', result.nativeResult.exitCode);
        console.log('C++ error:', result.nativeResult.error);
        console.log('C++ code:', result.cppCode);
      }
      
      expect(result.jsResult.success).toBe(true);
      expect(result.nativeResult.success).toBe(true);
      expect(normalizeOutput(result.jsResult.stdout)).toBe('30');
      expect(normalizeOutput(result.nativeResult.stdout)).toBe('30');
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for string concatenation', () => {
      if (!isCppCompilerAvailable()) {
        console.log('Skipping runtime test: C++ compiler not available');
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
      
      if (!result.nativeResult.success) {
        console.log('C++ failed:', result.nativeResult.stderr);
        console.log('C++ stdout:', result.nativeResult.stdout);
        console.log('C++ code:', result.cppCode);
      }
      
      expect(result.jsResult.success).toBe(true);
      expect(result.nativeResult.success).toBe(true);
      expect(normalizeOutput(result.jsResult.stdout)).toBe('Hello World');
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for boolean logic', () => {
      if (!isCppCompilerAvailable()) {
        console.log('Skipping runtime test: C++ compiler not available');
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
      
      if (!result.nativeResult.success) {
        console.log('C++ failed:', result.nativeResult.stderr);
      }
      
      expect(result.jsResult.success).toBe(true);
      expect(result.nativeResult.success).toBe(true);
      expect(normalizeOutput(result.jsResult.stdout)).toBe('false\ntrue');
      expect(result.equivalent).toBe(true);
    });
  });

  describe('Control Flow', () => {
    it('should produce equivalent output for if/else', () => {
      if (!isCppCompilerAvailable()) {
        console.log('Skipping runtime test: C++ compiler not available');
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
      
      if (!result.nativeResult.success) {
        console.log('C++ failed:', result.nativeResult.stderr);
        console.log('C++ stdout:', result.nativeResult.stdout);
        console.log('C++ code:', result.cppCode);
      }
      
      expect(result.jsResult.success).toBe(true);
      expect(result.nativeResult.success).toBe(true);
      expect(normalizeOutput(result.jsResult.stdout)).toBe('greater');
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for for-of loop', () => {
      if (!isCppCompilerAvailable()) {
        console.log('Skipping runtime test: C++ compiler not available');
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
      
      if (!result.nativeResult.success) {
        console.log('C++ failed:', result.nativeResult.stderr);
        console.log('C++ stdout:', result.nativeResult.stdout);
        console.log('C++ code:', result.cppCode);
      }
      
      expect(result.jsResult.success).toBe(true);
      expect(result.nativeResult.success).toBe(true);
      expect(normalizeOutput(result.jsResult.stdout)).toBe('1\n2\n3');
      expect(result.equivalent).toBe(true);
    });
  });
});
