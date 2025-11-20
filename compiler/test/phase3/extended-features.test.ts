import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Compiler } from '../../src/compiler';
import { writeFileSync, mkdirSync, existsSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { validateRustCode, isRustcAvailable } from './rust-validator';

describe('Phase 3 - Rust Code Generation - Extended Features', () => {
  let tmpDir: string;
  let compiler: Compiler;

  beforeEach(() => {
    tmpDir = join(tmpdir(), 'goodscript-test-extended-' + Date.now() + '-' + Math.random().toString(36).substring(7));
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

  describe('Enums', () => {
    it('should translate numeric enum to Rust enum', () => {
      const result = compile(`
        enum Color {
          Red,
          Green,
          Blue
        }
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('enum Color {');
      expect(result.rustCode).toContain('Red = 0,');
      expect(result.rustCode).toContain('Green = 1,');
      expect(result.rustCode).toContain('Blue = 2,');
    });

    it('should handle enum with explicit values', () => {
      const result = compile(`
        enum Status {
          Pending = 0,
          Active = 1,
          Completed = 100
        }
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('Pending = 0,');
      expect(result.rustCode).toContain('Active = 1,');
      expect(result.rustCode).toContain('Completed = 100,');
    });

    it('should translate string enum', () => {
      const result = compile(`
        enum Direction {
          North = "NORTH",
          South = "SOUTH",
          East = "EAST",
          West = "WEST"
        }
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('enum Direction {');
      expect(result.rustCode).toContain('North,');
      expect(result.rustCode).toContain('South,');
    });
  });

  describe('Discriminated Unions', () => {
    it('should translate discriminated union to Rust enum', () => {
      const result = compile(`
        type Result = 
          | { type: "success"; value: number }
          | { type: "error"; message: string };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('enum Result {');
      expect(result.rustCode).toContain('Success { value: f64 }');
      expect(result.rustCode).toContain('Error { message: String }');
    });

    it('should handle union with variant without fields', () => {
      const result = compile(`
        type State =
          | { type: "loading" }
          | { type: "loaded"; data: string }
          | { type: "error"; error: string };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('enum State {');
      expect(result.rustCode).toContain('Loading,');
      expect(result.rustCode).toContain('Loaded { data: String }');
      expect(result.rustCode).toContain('Error { error: String }');
    });
  });

  describe('Switch/Match Statements', () => {
    it('should translate switch to match expression', () => {
      const result = compile(`
        const getLabel = (value: number): string => {
          let label = "";
          switch (value) {
            case 1:
              label = "one";
              break;
            case 2:
              label = "two";
              break;
            default:
              label = "other";
              break;
          }
          return label;
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('match value {');
      expect(result.rustCode).toContain('1.0 => {');
      expect(result.rustCode).toContain('2.0 => {');
      expect(result.rustCode).toContain('_ => {');
    });
  });

  describe('Logical Operators', () => {
    it('should translate logical AND operator', () => {
      const result = compile(`
        const both = (a: boolean, b: boolean): boolean => a && b;
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('a && b');
    });

    it('should translate logical OR operator', () => {
      const result = compile(`
        const either = (a: boolean, b: boolean): boolean => a || b;
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('a || b');
    });

    it('should translate logical NOT operator', () => {
      const result = compile(`
        const negate = (x: boolean): boolean => !x;
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('!x');
    });
  });

  describe('Unary Operators', () => {
    it('should translate unary minus', () => {
      const result = compile(`
        const neg = (x: number): number => -x;
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('-x');
    });

    it('should translate prefix increment', () => {
      const result = compile(`
        const inc = (x: number): number => {
          ++x;
          return x;
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('x += 1.0');
    });

    it('should translate prefix decrement', () => {
      const result = compile(`
        const dec = (x: number): number => {
          --x;
          return x;
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('x -= 1.0');
    });
  });

  describe('Ternary/Conditional Expressions', () => {
    it('should translate ternary expression', () => {
      const result = compile(`
        const max = (a: number, b: number): number => a > b ? a : b;
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('if a > b { a } else { b }');
    });

    it('should translate nested ternary', () => {
      const result = compile(`
        const classify = (x: number): string => 
          x > 0 ? "positive" : x < 0 ? "negative" : "zero";
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('if');
      expect(result.rustCode).toContain('else');
    });
  });

  describe('Template Literals', () => {
    it('should translate simple template literal', () => {
      const result = compile(`
        const msg: string = \`hello world\`;
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('String::from("hello world")');
    });

    it('should translate template literal with substitution', () => {
      const result = compile(`
        const greet = (name: string): string => \`Hello, \${name}!\`;
      `);
      
      expect(result.success).toBe(true);
      // Should use format! macro or string concatenation
      expect(result.rustCode).toMatch(/format!|concat/);
    });
  });

  describe('Parenthesized Expressions', () => {
    it('should preserve parentheses', () => {
      const result = compile(`
        const calc = (a: number, b: number, c: number): number => 
          (a + b) * c;
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('(a + b)');
    });
  });

  describe('Complex Combinations', () => {
    it('should handle enum with switch statement', () => {
      const result = compile(`
        enum Status {
          Pending,
          Active,
          Done
        }
        
        const describe = (status: number): string => {
          let result = "";
          switch (status) {
            case 0:
              result = "pending";
              break;
            case 1:
              result = "active";
              break;
            case 2:
              result = "done";
              break;
            default:
              result = "unknown";
              break;
          }
          return result;
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('enum Status');
      expect(result.rustCode).toContain('match status');
    });

    it('should handle logical operators with ternary', () => {
      const result = compile(`
        const check = (a: boolean, b: boolean, c: boolean): string =>
          a && b ? "both" : c || a ? "some" : "none";
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('&&');
      expect(result.rustCode).toContain('||');
      expect(result.rustCode).toContain('if');
    });
  });
});
