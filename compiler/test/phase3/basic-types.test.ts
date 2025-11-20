import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Compiler } from '../../src/compiler';
import { writeFileSync, unlinkSync, mkdirSync, existsSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

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

  const compile = (source: string): { success: boolean; rustCode: string; errors: string[] } => {
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
    
    return {
      success: result.success,
      rustCode,
      errors,
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
      expect(result.rustCode).toContain('-> ()');
    });
  });

  describe('Arrow Functions', () => {
    it('should translate simple arrow function', () => {
      const result = compile(`
        const add = (a: number, b: number): number => a + b;
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('let add = |a: f64, b: f64| -> f64 a + b');
    });

    it('should translate arrow function with block body', () => {
      const result = compile(`
        const square = (x: number): number => {
          return x * x;
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('let square = |x: f64| -> f64');
      expect(result.rustCode).toContain('return x * x;');
    });
  });

  describe('Collections', () => {
    it('should translate array literal to vec!', () => {
      const result = compile(`
        const numbers: number[] = [1, 2, 3];
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('vec![1, 2, 3]');
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
