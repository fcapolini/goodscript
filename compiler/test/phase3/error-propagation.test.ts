import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Compiler } from '../../src/compiler';
import { writeFileSync, mkdirSync, existsSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { validateRustCode, isRustcAvailable } from './rust-validator';
import { executeJS, executeRust, compareOutputs } from './runtime-helpers';

describe('Phase 3 - Error Propagation Through Call Chains', () => {
  let tmpDir: string;
  let compiler: Compiler;

  beforeEach(() => {
    tmpDir = join(tmpdir(), 'goodscript-test-errorprop-' + Date.now() + '-' + Math.random().toString(36).substring(7));
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

  describe('Simple Error Propagation', () => {
    it('should propagate error through single function call', () => {
      const result = compile(`
        const throwsError = (): void => {
          throw "error from function";
        };

        const caller = (): void => {
          throwsError();
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('throwsError()?');
      expect(result.rustCode).toContain('return Err(String::from("error from function").to_string());');
    });

    it('should propagate error through multiple function calls', () => {
      const result = compile(`
        const deepFunction = (): void => {
          throw "error from deep";
        };

        const middleFunction = (): void => {
          deepFunction();
        };

        const topFunction = (): void => {
          middleFunction();
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('deepFunction()?');
      expect(result.rustCode).toContain('middleFunction()?');
      expect(result.rustCode).toContain('return Err(String::from("error from deep").to_string());');
    });
  });

  describe('Error Propagation with Return Values', () => {
    it('should propagate error through function returning value', () => {
      const result = compile(`
        const divide = (a: number, b: number): number => {
          if (b === 0.0) {
            throw "Division by zero";
          }
          return a / b;
        };

        const calculate = (x: number, y: number): number => {
          const result = divide(x, y);
          return result * 2.0;
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('divide(x, y)?');
      expect(result.rustCode).toContain('return Err(String::from("Division by zero").to_string());');
    });
  });

  describe('Error Propagation with Try/Catch', () => {
    it('should catch error from propagated call chain', () => {
      const result = compile(`
        const deepFunction = (): void => {
          throw "error from deep";
        };

        const middleFunction = (): void => {
          deepFunction();
        };

        const topFunction = (): void => {
          try {
            middleFunction();
          } catch (e) {
            const handled = "caught it";
          }
        };
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('deepFunction()?');
      expect(result.rustCode).toContain('middleFunction()?');
      expect(result.rustCode).toContain('match result {');
      expect(result.rustCode).toContain('Err(e) => {');
    });
  });

  describe('Unhandled Errors', () => {
    it('should propagate unhandled error to root handler', () => {
      const result = compile(`
        const throwsError = (): void => {
          throw "unhandled error";
        };

        const main = throwsError();
      `);
      
      expect(result.success).toBe(true);
      expect(result.rustCode).toContain('throwsError()?');
      expect(result.rustCode).toContain('eprintln!("Uncaught exception: {}", e);');
      expect(result.rustCode).toContain('std::process::exit(1);');
    });
  });

  describe('Rust Validation', () => {
    it('should generate valid Rust for error propagation chain', () => {
      const result = compile(`
        const deepFunction = (): void => {
          throw "error from deep";
        };

        const middleFunction = (): void => {
          deepFunction();
        };

        const topFunction = (): void => {
          try {
            middleFunction();
          } catch (e) {
            const msg = "caught";
          }
        };
      `);
      
      expect(result.success).toBe(true);
      
      if (result.rustValid !== undefined) {
        if (!result.rustValid) {
          console.log('Rust code:', result.rustCode);
          console.log('Rust errors:', result.rustErrors);
        }
        expect(result.rustValid).toBe(true);
      }
    });

    it('should generate valid Rust for error propagation with return values (success path)', () => {
      const result = compile(`
        const getValue = (condition: boolean): number => {
          if (condition === true) {
            throw "error condition met";
          }
          return 42.0;
        };

        const compute = (): number => {
          const value = getValue(false);
          return value * 2.0;
        };
        
        const result = compute();
      `);
      
      if (!result.success) {
        console.log('Compilation failed with errors:', result.errors);
      }
      expect(result.success).toBe(true);
      
      if (result.rustValid !== undefined) {
        if (!result.rustValid) {
          console.log('Rust code:', result.rustCode);
          console.log('Rust errors:', result.rustErrors);
        }
        expect(result.rustValid).toBe(true);
      }
    });

    it('should generate valid Rust for error propagation with return values (error path)', () => {
      const result = compile(`
        const getValue = (condition: boolean): number => {
          if (condition === true) {
            throw "error condition met";
          }
          return 42.0;
        };

        const compute = (): number => {
          const value = getValue(true);
          return value * 2.0;
        };
        
        try {
          const result = compute();
        } catch (e) {
          const msg = "caught error";
        }
      `);
      
      if (!result.success) {
        console.log('Compilation failed with errors:', result.errors);
      }
      expect(result.success).toBe(true);
      
      if (result.rustValid !== undefined) {
        if (!result.rustValid) {
          console.log('Rust code:', result.rustCode);
          console.log('Rust errors:', result.rustErrors);
        }
        expect(result.rustValid).toBe(true);
      }
    });
  });

  describe('Runtime Equivalence', () => {
    it('should produce same output for single function error propagation', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const throwsError = (): void => {
          throw "error from function";
        };

        const caller = (): void => {
          throwsError();
        };
        
        try {
          caller();
          console.log("no error");
        } catch (e) {
          console.log("caught");
        }
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for multiple function error propagation', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const deepFunction = (): void => {
          throw "error from deep";
        };

        const middleFunction = (): void => {
          deepFunction();
        };

        const topFunction = (): void => {
          middleFunction();
        };
        
        try {
          topFunction();
          console.log("no error");
        } catch (e) {
          console.log("caught deep error");
        }
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for try/catch with successful execution', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const safeFunction = (): number => {
          return 42;
        };
        
        try {
          const result = safeFunction();
          console.log(result);
        } catch (e) {
          console.log("error");
        }
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for conditional error handling', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const checkValue = (x: number): string => {
          if (x < 0) {
            throw "negative value";
          }
          return "positive";
        };
        
        try {
          const result = checkValue(5);
          console.log(result);
        } catch (e) {
          console.log("error caught");
        }
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for error propagation through call chain', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const level3 = (): number => {
          return 100;
        };
        
        const level2 = (): number => {
          return level3() + 10;
        };
        
        const level1 = (): number => {
          return level2() + 1;
        };
        
        try {
          console.log(level1());
        } catch (e) {
          console.log("error");
        }
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for function returning value with error check', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const divide = (a: number, b: number): number => {
          if (b === 0) {
            throw "division by zero";
          }
          return a / b;
        };
        
        try {
          const result = divide(10, 2);
          console.log(result);
        } catch (e) {
          console.log("error");
        }
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for nested try/catch', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const inner = (): number => {
          return 42;
        };
        
        const outer = (): number => {
          try {
            return inner();
          } catch (e) {
            return -1;
          }
        };
        
        try {
          console.log(outer());
        } catch (e) {
          console.log("outer error");
        }
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for multiple function calls in try block', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const f1 = (): number => 10;
        const f2 = (): number => 20;
        const f3 = (): number => 30;
        
        try {
          const a = f1();
          const b = f2();
          const c = f3();
          console.log(a + b + c);
        } catch (e) {
          console.log("error");
        }
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for propagated error that succeeds', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const getValue = (shouldThrow: boolean): number => {
          if (shouldThrow === true) {
            throw "error occurred";
          }
          return 42;
        };
        
        const compute = (): number => {
          const value = getValue(false);
          return value * 2;
        };
        
        try {
          console.log(compute());
        } catch (e) {
          console.log("error");
        }
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for propagated error that fails', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const getValue = (shouldThrow: boolean): number => {
          if (shouldThrow === true) {
            throw "error occurred";
          }
          return 42;
        };
        
        const compute = (): number => {
          const value = getValue(true);
          return value * 2;
        };
        
        try {
          console.log(compute());
        } catch (e) {
          console.log("caught");
        }
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for catch from propagated call chain', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const deepFunction = (): void => {
          throw "deep error";
        };

        const middleFunction = (): void => {
          deepFunction();
        };

        const topFunction = (): void => {
          try {
            middleFunction();
            console.log("no error");
          } catch (e) {
            console.log("caught error");
          }
        };
        
        topFunction();
      `;

      const result = compile(source);
      expect(result.success).toBe(true);
      
      const jsResult = await executeJS(result.jsCode);
      const rustResult = await executeRust(result.rustCode);
      
      compareOutputs(jsResult, rustResult);
    });
  });
});
