import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Compiler } from '../../src/compiler';
import { writeFileSync, mkdirSync, existsSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { validateRustCode, isRustcAvailable } from './rust-validator';
import { executeJS, executeRust, compareOutputs, normalizeOutput } from './runtime-helpers';

describe('Phase 3 - Rust Code Generation - Control Flow & Error Handling', () => {
  let tmpDir: string;
  let compiler: Compiler;

  beforeEach(() => {
    tmpDir = join(tmpdir(), 'goodscript-test-control-' + Date.now() + '-' + Math.random().toString(36).substring(7));
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
    compiler.compile({
      files: [srcFile],
      outDir,
      target: 'typescript',
    });
    
    const jsFile = join(outDir, 'test.js');
    const jsCode = existsSync(jsFile) ? readFileSync(jsFile, 'utf-8') : '';
    
    // Compile to Rust
    compiler.compile({
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

  describe('Try/Catch Statements', () => {
    it('should translate try/catch block', () => {
      const result = compile(`
        const riskyOperation = (): void => {
          try {
            const x = 42;
          } catch (e) {
            const msg = "error";
          }
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('let result = (|| -> Result<(), String> {');
      expect(result.rustCode).toContain('Ok(())');
      expect(result.rustCode).toContain('match result {');
      expect(result.rustCode).toContain('Err(e) => {');
    });

    it('should handle try/catch with finally', () => {
      const result = compile(`
        const withFinally = (): void => {
          try {
            const x = 1;
          } catch (e) {
            const y = 2;
          } finally {
            const z = 3;
          }
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('// Finally block');
    });

    it('should translate custom error variable name', () => {
      const result = compile(`
        const handleError = (): void => {
          try {
            const x = 1;
          } catch (error) {
            const msg = error;
          }
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('Err(error) => {');
    });
  });

  describe('Throw Statements', () => {
    it('should translate throw with string', () => {
      const result = compile(`
        const throwError = (): void => {
          throw "Something went wrong";
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('return Err(');
      expect(result.rustCode).toContain('.to_string()');
    });

    it('should translate throw with expression', () => {
      const result = compile(`
        const throwCustom = (msg: string): void => {
          throw msg;
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('return Err(msg.to_string())');
    });
  });

  describe('While Loops', () => {
    it('should translate while loop', () => {
      const result = compile(`
        const countdown = (n: number): void => {
          while (n > 0) {
            n = n - 1;
          }
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('while n > 0.0 {');
      expect(result.rustCode).toContain('n = n - 1.0');
    });

    it('should handle while with complex condition', () => {
      const result = compile(`
        const waitUntil = (a: number, b: number): void => {
          while (a > 0 && b > 0) {
            a = a - 1;
            b = b - 1;
          }
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('while a > 0.0 && b > 0.0 {');
    });
  });

  describe('Do-While Loops', () => {
    it('should translate do-while loop', () => {
      const result = compile(`
        const runOnce = (n: number): void => {
          do {
            n = n - 1;
          } while (n > 0);
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('loop {');
      expect(result.rustCode).toContain('if !(n > 0.0) {');
      expect(result.rustCode).toContain('break;');
    });
  });

  describe('Break and Continue', () => {
    it('should translate break statement', () => {
      const result = compile(`
        const findFirst = (nums: number[]): void => {
          for (const n of nums) {
            if (n > 10) {
              break;
            }
          }
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('break;');
    });

    it('should translate continue statement', () => {
      const result = compile(`
        const skipEvens = (nums: number[]): void => {
          for (const n of nums) {
            if (n % 2 === 0) {
              continue;
            }
            const x = n;
          }
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('continue;');
    });

    it('should handle labeled break', () => {
      const result = compile(`
        const nested = (): void => {
          outer: for (const i of [1, 2, 3]) {
            for (const j of [4, 5, 6]) {
              if (i === 2) {
                break outer;
              }
            }
          }
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain("break 'outer;");
    });

    it('should handle labeled continue', () => {
      const result = compile(`
        const nested = (): void => {
          outer: for (const i of [1, 2, 3]) {
            for (const j of [4, 5, 6]) {
              if (j === 5) {
                continue outer;
              }
            }
          }
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain("continue 'outer;");
    });
  });

  describe('Element Access', () => {
    it('should translate numeric array indexing', () => {
      const result = compile(`
        const getFirst = (arr: number[]): number => {
          return arr[0];
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('arr[0.0 as usize]');
    });

    it('should translate variable array indexing', () => {
      const result = compile(`
        const getAt = (arr: number[], i: number): number => {
          return arr[i];
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('arr[&i]');
    });

    it('should handle string key access', () => {
      const result = compile(`
        interface StringMap {
          [key: string]: string;
        }
        
        const getValue = (obj: StringMap, key: string): string => {
          return obj[key];
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('obj[&key]');
    });
  });

  describe('Complex Control Flow', () => {
    it('should handle nested loops with break and continue', () => {
      const result = compile(`
        const processItems = (nums: number[]): void => {
          for (const cell of nums) {
            if (cell === 0) {
              continue;
            }
            if (cell < 0) {
              break;
            }
            const x = cell;
          }
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('continue;');
      expect(result.rustCode).toContain('break;');
    });

    it('should handle while with break', () => {
      const result = compile(`
        const searchLoop = (): void => {
          let running = true;
          while (running === true) {
            running = false;
            break;
          }
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('while running == true {');
      expect(result.rustCode).toContain('break;');
    });

    it('should combine try/catch with loops', () => {
      const result = compile(`
        const robustProcess = (items: number[]): void => {
          for (const item of items) {
            try {
              if (item < 0) {
                throw "Negative value";
              }
            } catch (e) {
              continue;
            }
          }
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('for item in');
      expect(result.rustCode).toContain('Result<(), String>');
      expect(result.rustCode).toContain('continue;');
    });
  });

  describe('Runtime Equivalence - Control Flow', () => {
    it('should produce equivalent output for if/else statements', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const x: number = 15;
        if (x > 10) {
          console.log("large");
        } else {
          console.log("small");
        }
      `);
      
      if (!result.jsResult.success || !result.rustResult.success) {
        console.log('JS output:', result.jsResult.stdout, result.jsResult.stderr);
        console.log('Rust output:', result.rustResult.stdout, result.rustResult.stderr);
      }
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(normalizeOutput(result.jsResult.stdout)).toBe('large');
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for for-of loops', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const items: number[] = [1, 2, 3, 4, 5];
        for (const item of items) {
          console.log(item);
        }
      `);
      
      if (!result.jsResult.success || !result.rustResult.success) {
        console.log('JS output:', result.jsResult.stdout, result.jsResult.stderr);
        console.log('Rust output:', result.rustResult.stdout, result.rustResult.stderr);
      }
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(normalizeOutput(result.jsResult.stdout)).toBe('1\n2\n3\n4\n5');
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for nested if/else', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const grade: number = 85;
        if (grade >= 90) {
          console.log("A");
        } else if (grade >= 80) {
          console.log("B");
        } else {
          console.log("C");
        }
      `);
      
      if (!result.jsResult.success || !result.rustResult.success) {
        console.log('JS output:', result.jsResult.stdout, result.jsResult.stderr);
        console.log('Rust output:', result.rustResult.stdout, result.rustResult.stderr);
      }
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(normalizeOutput(result.jsResult.stdout)).toBe('B');
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for loops with conditionals', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const nums: number[] = [1, 2, 3, 4, 5, 6];
        for (const n of nums) {
          if (n % 2 === 0) {
            console.log(n);
          }
        }
      `);
      
      if (!result.jsResult.success || !result.rustResult.success) {
        console.log('JS output:', result.jsResult.stdout, result.jsResult.stderr);
        console.log('Rust output:', result.rustResult.stdout, result.rustResult.stderr);
      }
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(normalizeOutput(result.jsResult.stdout)).toBe('2\n4\n6');
      expect(result.equivalent).toBe(true);
    });
  });
});
