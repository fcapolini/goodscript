import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Compiler } from '../../src/compiler';
import { writeFileSync, unlinkSync, mkdirSync, existsSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { validateRustCode, isRustcAvailable } from './rust-validator';

describe('Phase 3 - Rust Code Generation - Ownership Types', () => {
  let tmpDir: string;
  let compiler: Compiler;

  beforeEach(() => {
    tmpDir = join(tmpdir(), 'goodscript-test-ownership-' + Date.now() + '-' + Math.random().toString(36).substring(7));
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

  describe('Unique<T> -> Box<T>', () => {
    it('should translate Unique<T> to Box<T>', () => {
      const result = compile(`
        const x: Unique<number> = 42;
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('Box<f64>');
    });

    it('should add Box import when using Unique', () => {
      const result = compile(`
        const x: Unique<string> = "hello";
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('use std::boxed::Box;');
    });

    it('should handle nested Unique types', () => {
      const result = compile(`
        const x: Unique<Unique<number>> = 42;
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('Box<Box<f64>>');
    });
  });

  describe('Shared<T> -> Rc<T>', () => {
    it('should translate Shared<T> to Rc<T>', () => {
      const result = compile(`
        const x: Shared<number> = 42;
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('Rc<f64>');
    });

    it('should add Rc import when using Shared', () => {
      const result = compile(`
        const x: Shared<string> = "hello";
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('use std::rc::Rc;');
    });

    it('should handle Shared with complex types', () => {
      const result = compile(`
        const x: Shared<number[]> = [1, 2, 3];
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('Rc<Vec<f64>>');
    });
  });

  describe('Weak<T> -> Weak<T>', () => {
    it('should translate Weak<T> to Weak<T>', () => {
      const result = compile(`
        const x: Weak<number> = 42;
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('Weak<f64>');
    });

    it('should add Weak import when using Weak', () => {
      const result = compile(`
        const x: Weak<string> = "hello";
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('use std::rc::Weak;');
    });
  });

  describe('Mixed Ownership Types', () => {
    it('should handle multiple ownership types in one file', () => {
      const result = compile(`
        const a: Unique<number> = 1;
        const b: Shared<number> = 2;
        const c: Weak<number> = 3;
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('use std::boxed::Box;');
      expect(result.rustCode).toContain('use std::rc::Rc;');
      expect(result.rustCode).toContain('use std::rc::Weak;');
    });

    it('should not duplicate imports', () => {
      const result = compile(`
        const a: Unique<number> = 1;
        const b: Unique<string> = "test";
      `);
      
      expect(result.success).toBe(true);
      const boxImports = (result.rustCode.match(/use std::boxed::Box;/g) || []).length;
      expect(boxImports).toBe(1);
    });
  });

  describe('Ownership in Classes', () => {
    it('should translate class with ownership fields', () => {
      const result = compile(`
        class Container {
          unique: Unique<number> = 0;
          shared: Shared<string> = "";
          weak: Weak<boolean> = false;
        }
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('struct Container');
      expect(result.rustCode).toContain('unique: Box<f64>');
      expect(result.rustCode).toContain('shared: Rc<String>');
      expect(result.rustCode).toContain('weak: Weak<bool>');
    });
  });
});
