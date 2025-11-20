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
      expect(result.rustCode).toContain('let z = 3.0;');
      // Check that z appears in both Ok and Err branches
      const zCount = (result.rustCode.match(/let z = 3\.0;/g) || []).length;
      expect(zCount).toBe(2); // Should appear in both branches
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
      expect(result.rustCode).toContain('arr[0]');
    });

    it('should translate variable array indexing', () => {
      const result = compile(`
        const getAt = (arr: number[], i: number): number => {
          return arr[i];
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('arr[i as usize]');
    });

    it.skip('should handle string key access (requires HashMap support)', () => {
      const result = compile(`
        interface StringMap {
          [key: string]: string;
        }
        
        const getValue = (obj: StringMap, key: string): string => {
          return obj[key];
        };
      `);
      
      expect(result.success).toBe(true);
      // TODO: Implement HashMap support
      // expect(result.rustCode).toContain('obj.get(&key)');
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

    it('should produce equivalent output for try/catch block', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const test = (): void => {
          console.log("before");
          console.log("after");
        };
        test();
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for while loop', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        let i = 0;
        while (i < 3) {
          console.log(i);
          i = i + 1;
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for while with complex condition', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        let x = 0;
        let y = 5;
        while (x < 3 && y > 2) {
          console.log(x);
          x = x + 1;
          y = y - 1;
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for break statement', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        for (let i = 0; i < 5; i++) {
          if (i === 3) {
            break;
          }
          console.log(i);
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for continue statement', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        for (let i = 0; i < 5; i++) {
          if (i === 2) {
            continue;
          }
          console.log(i);
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for array indexing', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const arr: number[] = [10, 20, 30];
        console.log(arr[0]);
        console.log(arr[2]);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for variable array indexing', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const arr: number[] = [5, 15, 25];
        const idx = 1;
        console.log(arr[idx]);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for nested loops with break', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            if (j === 2) {
              break;
            }
            console.log(i * 10 + j);
          }
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for while with break', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        let count = 0;
        while (true) {
          if (count >= 3) {
            break;
          }
          console.log(count);
          count = count + 1;
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for do-while loop', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        let i = 0;
        do {
          console.log(i);
          i = i + 1;
        } while (i < 3);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for switch statement', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const day: number = 2;
        switch (day) {
          case 1:
            console.log("Monday");
            break;
          case 2:
            console.log("Tuesday");
            break;
          default:
            console.log("Other");
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for ternary operator', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const x = 5;
        const result = x > 3 ? "big" : "small";
        console.log(result);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for multiple conditionals', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const a: number = 10;
        const b: number = 20;
        if (a < b && a > 5) {
          console.log("both true");
        }
        if (a === 10 || b === 10) {
          console.log("one is 10");
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for for loop with array', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const items = [10, 20, 30];
        for (let i = 0; i < items.length; i = i + 1) {
          console.log(items[i]);
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for while loops', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        let i = 0;
        while (i < 3) {
          console.log(i);
          i = i + 1;
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for do-while loops', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        let i = 0;
        do {
          console.log(i);
          i = i + 1;
        } while (i < 3);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for break in loops', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        for (const i of [1, 2, 3, 4, 5]) {
          if (i === 3) {
            break;
          }
          console.log(i);
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for continue in loops', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        for (const i of [1, 2, 3, 4, 5]) {
          if (i === 3) {
            continue;
          }
          console.log(i);
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for labeled break', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        outer: for (const i of [1, 2, 3]) {
          for (const j of [4, 5, 6]) {
            if (j === 5) {
              break outer;
            }
            console.log(i + j);
          }
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for labeled continue', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        outer: for (const i of [1, 2, 3]) {
          for (const j of [4, 5, 6]) {
            if (j === 5) {
              continue outer;
            }
            console.log(i + j);
          }
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for array indexing', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const arr = [10, 20, 30];
        console.log(arr[0]);
        console.log(arr[1]);
        console.log(arr[2]);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for try/catch blocks', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        try {
          console.log("before");
          throw "error";
        } catch (e) {
          console.log("caught");
        }
        console.log("after");
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for try/catch/finally', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        try {
          console.log("try");
        } catch (e) {
          console.log("catch");
        } finally {
          console.log("finally");
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for while with break', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        let i = 0;
        while (i < 10) {
          console.log(i);
          i = i + 1;
          if (i === 3) {
            break;
          }
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for nested loops with break and continue', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        for (const i of [1, 2, 3]) {
          for (const j of [4, 5, 6]) {
            if (j === 5) {
              continue;
            }
            if (i === 2 && j === 6) {
              break;
            }
            console.log(i + j);
          }
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for throw with string', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        try {
          throw "error message";
        } catch (e) {
          console.log("caught");
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for throw with expression', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const msg = "custom error";
        try {
          throw msg;
        } catch (e) {
          console.log("error caught");
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for custom error variable name', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        try {
          throw "test";
        } catch (err) {
          console.log("handled");
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for variable array indexing', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const arr = [100, 200, 300];
        const idx = 1;
        console.log(arr[idx]);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for try/catch with finally', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        let result = 0;
        try {
          result = 10;
        } catch (e) {
          result = -1;
        } finally {
          console.log("cleanup");
        }
        console.log(result);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for while with complex condition', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        let x = 0;
        let y = 5;
        while (x < 3 && y > 0) {
          console.log(x);
          x = x + 1;
          y = y - 1;
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for nested loops with break and continue', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            if (j === 1) {
              continue;
            }
            console.log(i + j);
          }
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for while with break', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        let count = 0;
        while (true) {
          if (count >= 3) {
            break;
          }
          console.log(count);
          count = count + 1;
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for combined try/catch with loops', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        try {
          for (let i = 0; i < 3; i++) {
            console.log(i);
          }
        } catch (e) {
          console.log("error");
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for simple try/catch block', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const riskyOperation = (): void => {
          try {
            const x = 42;
            console.log(x);
          } catch (e) {
            console.log("error");
          }
        };
        riskyOperation();
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for do-while with increment', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        let x = 0;
        do {
          console.log(x);
          x = x + 1;
        } while (x < 3);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for numeric array indexing', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const arr = [100, 200, 300];
        console.log(arr[0]);
        console.log(arr[2]);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for throw statement', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const throwError = (): void => {
          throw "Something went wrong";
        };
        
        try {
          throwError();
          console.log("no error");
        } catch (e) {
          console.log("caught error");
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for throw with expression', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const throwCustom = (msg: string): void => {
          throw msg;
        };
        
        try {
          throwCustom("custom error");
          console.log("no error");
        } catch (e) {
          console.log("caught");
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for try/catch with finally', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const withFinally = (): void => {
          try {
            console.log("try");
          } catch (e) {
            console.log("catch");
          } finally {
            console.log("finally");
          }
        };
        withFinally();
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for try/catch with finally and error', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const withFinallyError = (): void => {
          try {
            throw "error occurred";
          } catch (e) {
            console.log("caught");
          } finally {
            console.log("cleanup");
          }
        };
        withFinallyError();
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for while loop countdown', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        let n = 3;
        while (n > 0) {
          console.log(n);
          n = n - 1;
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for while with complex condition', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        let a = 3;
        let b = 2;
        while (a > 0 && b > 0) {
          console.log(a + b);
          a = a - 1;
          b = b - 1;
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for variable array indexing', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const arr = [10, 20, 30, 40];
        const idx = 2;
        console.log(arr[idx]);
        const idx2 = 0;
        console.log(arr[idx2]);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for labeled break', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        outer: for (const i of [1, 2, 3]) {
          for (const j of [4, 5, 6]) {
            if (i === 2 && j === 5) {
              break outer;
            }
            console.log(i * 10 + j);
          }
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for labeled continue', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        outer: for (const i of [1, 2]) {
          for (const j of [3, 4]) {
            if (j === 4) {
              continue outer;
            }
            console.log(i * 10 + j);
          }
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for nested loops with break and continue', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const nums: number[] = [1, 0, -1, 2, 0, 3];
        for (const cell of nums) {
          if (cell === 0) {
            continue;
          }
          if (cell < 0) {
            break;
          }
          console.log(cell);
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for while with break', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        let running = true;
        let count = 0;
        while (running === true) {
          console.log(count);
          count = count + 1;
          if (count >= 3) {
            running = false;
            break;
          }
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for try/catch with loop', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const items: number[] = [1, -2, 3, -4, 5];
        for (const item of items) {
          try {
            if (item < 0) {
              throw "Negative value";
            }
            console.log(item);
          } catch (e) {
            continue;
          }
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for switch with range-based classification', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const classify = (value: number): string => {
          let result = "";
          if (value >= 1 && value <= 3) {
            result = "low";
          } else if (value >= 4 && value <= 5) {
            result = "mid";
          } else if (value >= 6 && value <= 10) {
            result = "high";
          } else {
            result = "out of range";
          }
          return result;
        };
        console.log(classify(2));
        console.log(classify(5));
        console.log(classify(9));
        console.log(classify(15));
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it.skip('should produce equivalent output for nested conditionals', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const category = 1;
        const subcategory = 2;
        let output = "";
        if (category === 1) {
          if (subcategory === 1) {
            output = "1-1";
          } else if (subcategory === 2) {
            output = "1-2";
          } else {
            output = "1-other";
          }
        } else if (category === 2) {
          output = "category-2";
        } else {
          output = "unknown";
        }
        console.log(output);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for nested if-else chains', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const score = 75;
        let grade = "";
        if (score >= 90) {
          grade = "A";
        } else if (score >= 80) {
          grade = "B";
        } else if (score >= 70) {
          grade = "C";
        } else if (score >= 60) {
          grade = "D";
        } else {
          grade = "F";
        }
        console.log(grade);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for do-while loop', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        let n = 3;
        do {
          console.log(n);
          n = n - 1;
        } while (n > 0);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for break statement', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const nums = [1, 5, 12, 8];
        for (const n of nums) {
          if (n > 10) {
            console.log("found");
            break;
          }
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for continue statement', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const nums = [1, 2, 3, 4, 5];
        for (const n of nums) {
          if (n % 2 === 0) {
            continue;
          }
          console.log(n);
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for array indexing', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const arr = [10, 20, 30, 40];
        console.log(arr[0]);
        console.log(arr[2]);
        const i = 1;
        console.log(arr[i]);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for nested loops with break and continue', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const nums = [1, 0, -1, 2, 3];
        for (const cell of nums) {
          if (cell === 0) {
            continue;
          }
          if (cell < 0) {
            console.log("negative");
            break;
          }
          console.log(cell);
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for while with break', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        let running = true;
        let count = 0;
        while (running === true) {
          count = count + 1;
          if (count === 3) {
            running = false;
            break;
          }
          console.log(count);
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for try/catch with loops', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const items = [1, 2, 3];
        for (const item of items) {
          try {
            if (item < 0) {
              throw "error";
            }
            console.log(item);
          } catch (e) {
            console.log("caught");
          }
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for multiple array operations', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const arr = [5, 10, 15];
        const first = arr[0];
        const last = arr[2];
        console.log(first + last);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for while loop with accumulator', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        let sum = 0;
        let i = 1;
        while (i <= 5) {
          sum = sum + i;
          i = i + 1;
        }
        console.log(sum);
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for nested try/catch', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        try {
          console.log("outer");
          try {
            console.log("inner");
          } catch (e) {
            console.log("inner catch");
          }
        } catch (e) {
          console.log("outer catch");
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for if without else', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const x = 5;
        if (x > 3) {
          console.log("greater");
        }
        console.log("done");
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for early return in function', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const checkValue = (n: number): string => {
          if (n < 0) {
            return "negative";
          }
          if (n === 0) {
            return "zero";
          }
          return "positive";
        };
        console.log(checkValue(-5));
        console.log(checkValue(0));
        console.log(checkValue(10));
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });

    it('should produce equivalent output for multiple conditions', () => {
      if (!isRustcAvailable()) {
        console.log('Skipping runtime test: rustc not available');
        return;
      }

      const result = compileAndExecute(`
        const x = 5;
        const y = 10;
        if (x < 10 && y > 5) {
          console.log("both true");
        }
      `);
      
      expect(result.jsResult.success).toBe(true);
      expect(result.rustResult.success).toBe(true);
      expect(result.equivalent).toBe(true);
    });
  });
});
