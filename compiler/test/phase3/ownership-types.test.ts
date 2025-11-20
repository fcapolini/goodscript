import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Compiler } from '../../src/compiler';
import { writeFileSync, unlinkSync, mkdirSync, existsSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { validateRustCode, isRustcAvailable } from './rust-validator';
import { executeJS, executeRust, compareOutputs } from './runtime-helpers';

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

  const compile = (source: string): { success: boolean; rustCode: string; jsCode: string; errors: string[]; rustValid?: boolean; rustErrors?: string[] } => {
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
      jsCode,
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

  describe('Runtime Equivalence', () => {
    it('should produce same output for Unique values', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const x: Unique<number> = 42;
        console.log(x);
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for Shared values', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const s: Shared<string> = "hello";
        console.log(s);
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for Weak values', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const w: Weak<number> = 99;
        if (w !== null && w !== undefined) {
          console.log(w);
        }
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for null Weak values', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const getWeak = (): Weak<number> => {
          return null;
        };
        
        const w = getWeak();
        if (w !== null && w !== undefined) {
          console.log(w);
        } else {
          console.log("null");
        }
      `;

      const result = compile(source);
      if (!result.success) {
        console.log('Compilation failed with errors:', result.errors);
      }
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for mixed ownership types', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const u: Unique<number> = 10;
        const s: Shared<number> = 20;
        const sum = u + s;
        console.log(sum);
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for ownership types with arrays', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const arr: Shared<number[]> = [1, 2, 3];
        for (const n of arr) {
          console.log(n);
        }
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for class with ownership fields', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        class Container {
          unique: Unique<number> = 42;
          shared: Shared<string> = "test";
        }
        
        const c = new Container();
        console.log(c.unique);
        console.log(c.shared);
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for Unique with Box', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const x: Unique<number> = 100;
        console.log(x);
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for nested Unique types', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const x: Unique<Unique<number>> = 5;
        console.log(x);
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for Shared with Rc', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const s: Shared<number> = 25;
        console.log(s);
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for Shared with complex types', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const items: Shared<number[]> = [1, 2, 3];
        for (const item of items) {
          console.log(item);
        }
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for Weak reference', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const w: Weak<number> = 77;
        if (w !== null && w !== undefined) {
          console.log(w);
        }
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for multiple ownership types', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const u: Unique<number> = 1;
        const s: Shared<number> = 2;
        const w: Weak<number> = 3;
        
        console.log(u);
        console.log(s);
        if (w !== null && w !== undefined) {
          console.log(w);
        }
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for nested Unique types', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const nested: Unique<number[]> = [10, 20, 30];
        for (const item of nested) {
          console.log(item);
        }
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for class with ownership fields', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        class Container {
          value: Unique<number>;
          
          constructor(v: number) {
            this.value = v;
          }
        }
        
        const c = new Container(42);
        console.log(c.value);
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for multiple ownership types in one file', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const u: Unique<number> = 10;
        const s: Shared<number> = 20;
        const w: Weak<number> = 30;
        console.log(u);
        console.log(s);
        if (w !== null && w !== undefined) {
          console.log(w);
        }
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for Shared with string type', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const msg: Shared<string> = "shared message";
        console.log(msg);
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for Weak with null check', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const w: Weak<string> = "weak value";
        if (w !== null && w !== undefined) {
          console.log(w);
        } else {
          console.log("was null");
        }
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for Unique with numeric operations', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const x: Unique<number> = 10;
        const y: Unique<number> = 20;
        console.log(x);
        console.log(y);
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for Shared with boolean', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const flag: Shared<boolean> = true;
        console.log(flag);
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });
  });
});
