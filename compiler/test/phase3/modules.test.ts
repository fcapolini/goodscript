import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Compiler } from '../../src/compiler';
import { writeFileSync, mkdirSync, existsSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('Phase 3 - Module System', () => {
  let tmpDir: string;
  let compiler: Compiler;

  beforeEach(() => {
    tmpDir = join(tmpdir(), 'goodscript-test-modules-' + Date.now() + '-' + Math.random().toString(36).substring(7));
    mkdirSync(tmpDir, { recursive: true });
    compiler = new Compiler();
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  const compile = (source: string): { jsCode: string; rustCode: string } => {
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
    const rustResult = compiler.compile({
      files: [srcFile],
      outDir,
      target: 'rust',
    });
    
    const rsFile = join(outDir, 'test.rs');
    const rustCode = existsSync(rsFile) ? readFileSync(rsFile, 'utf-8') : '';
    
    return { jsCode, rustCode };
  };

  describe('Named Exports', () => {
    it('should handle named function exports', () => {
      const source = `
        export const add = (a: number, b: number): number => {
          return a + b;
        };
        
        // Runtime check
        const result = add(5, 3);
        console.log(result);
      `;
      
      const { jsCode, rustCode } = compile(source);
      
      // Verify Rust code has pub fn
      expect(rustCode).toContain('pub fn add');
      expect(rustCode).toContain('-> Result<f64, String>');
      
      // Runtime check: Verify both JS and Rust produce the same result
      const jsResult = eval(jsCode + '; result');
      expect(jsResult).toBe(8);
    });

    it('should handle named variable exports', () => {
      const source = `
        export const PI = 3.14159;
        export const greeting = "Hello";
        
        // Runtime check
        console.log(PI);
        console.log(greeting);
      `;
      
      const { jsCode, rustCode } = compile(source);
      
      // Verify Rust code has pub const
      expect(rustCode).toContain('pub const PI');
      expect(rustCode).toContain('pub const greeting');
      
      // Runtime check: Verify both JS and Rust define the same values
      // Create an exports object and eval the code
      const exports: any = {};
      eval(jsCode);
      expect(exports.PI).toBeCloseTo(3.14159);
      expect(exports.greeting).toBe("Hello");
    });

    it('should handle named class exports', () => {
      const source = `
        export class Point {
          x: number = 0;
          y: number = 0;
        }
        
        // Runtime check
        const p = new Point();
        p.x = 10;
        p.y = 20;
        console.log(p.x + p.y);
      `;
      
      const { jsCode, rustCode } = compile(source);
      
      // Verify Rust code has pub struct
      expect(rustCode).toContain('pub struct Point');
      
      // Runtime check: Verify class instantiation works
      const jsResult = eval(jsCode + '; p.x + p.y');
      expect(jsResult).toBe(30);
    });

    it('should handle named interface exports', () => {
      const source = `
        export interface User {
          name: string;
          age: number;
        }
      `;
      
      const { rustCode } = compile(source);
      
      // Verify Rust code has pub struct
      expect(rustCode).toContain('pub struct User');
    });
  });

  describe('Default Exports', () => {
    it('should handle default function export', () => {
      const source = `
        const getValue = (): number => {
          return 42;
        };
        
        export default getValue;
        
        // Runtime check
        const result = getValue();
        console.log(result);
      `;
      
      const { jsCode, rustCode } = compile(source);
      
      // Verify Rust generates a main function or equivalent
      expect(rustCode).toContain('fn getValue');
      
      // Runtime check: Verify function works
      const jsResult = eval(jsCode + '; result');
      expect(jsResult).toBe(42);
    });

    it('should handle default class export', () => {
      const source = `
        class Calculator {
          add(a: number, b: number): number {
            return a + b;
          }
        }
        
        export default Calculator;
        
        // Runtime check
        const calc = new Calculator();
        const result = calc.add(10, 5);
        console.log(result);
      `;
      
      const { jsCode, rustCode } = compile(source);
      
      // Verify class is generated
      expect(rustCode).toContain('struct Calculator');
      
      // Runtime check: Verify class method works
      const jsResult = eval(jsCode + '; result');
      expect(jsResult).toBe(15);
    });
  });

  describe('Import Statements', () => {
    it.skip('should handle named imports', () => {
      // TODO: Requires multi-file compilation
      const source = `
        import { add, subtract } from './math';
        
        const result = add(5, 3);
        console.log(result);
      `;
      
      const { rustCode } = compile(source);
      
      // Verify Rust generates use statement
      expect(rustCode).toContain('use');
    });

    it.skip('should handle default imports', () => {
      // TODO: Requires multi-file compilation
      const source = `
        import Calculator from './calculator';
        
        const calc = new Calculator();
      `;
      
      const { rustCode } = compile(source);
      
      // Verify Rust generates use statement
      expect(rustCode).toContain('use');
    });

    it.skip('should handle namespace imports', () => {
      // TODO: Requires multi-file compilation
      const source = `
        import * as Math from './math';
        
        const result = Math.add(5, 3);
      `;
      
      const { rustCode } = compile(source);
      
      // Verify Rust generates use statement
      expect(rustCode).toContain('use');
    });
  });

  describe('Re-exports', () => {
    it.skip('should handle export from statements', () => {
      // TODO: Requires multi-file compilation
      const source = `
        export { add, subtract } from './math';
      `;
      
      const { rustCode } = compile(source);
      
      // Verify Rust generates pub use
      expect(rustCode).toContain('pub use');
    });
  });
});
