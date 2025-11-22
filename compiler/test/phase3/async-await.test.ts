import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Compiler } from '../../src/compiler';
import { writeFileSync, mkdirSync, existsSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { validateRustCode, isRustcAvailable } from './rust-validator';
import { executeJS, executeRust, executeRustWithCargo, compareOutputs, normalizeOutput, isCargoAvailable } from './runtime-helpers';

describe('Phase 3 - Async/Await', () => {
  let tmpDir: string;
  let compiler: Compiler;

  beforeEach(() => {
    tmpDir = join(tmpdir(), 'goodscript-test-async-' + Date.now() + '-' + Math.random().toString(36).substring(7));
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
    const rustResult = isCargoAvailable() 
      ? executeRustWithCargo(rustCode, true)  // Use Cargo for Tokio support
      : { success: false, stdout: '', stderr: 'cargo not available', exitCode: 1 };
    
    const equivalent = compareOutputs(jsResult, rustResult);
    
    return {
      jsCode,
      rustCode,
      jsResult,
      rustResult,
      equivalent,
    };
  };

  describe('Async Function Declarations', () => {
    it('should generate async closures for async arrow functions', () => {
      const result = compile(`
        const fetchData = async (): Promise<string> => {
          return "data";
        };
      `);
      
      if (result.errors.length > 0) {
        console.log('Compilation errors:', result.errors);
      }
      
      expect(result.errors.length).toBe(0);
      expect(result.rustCode).not.toBe('');
      expect(result.rustCode).toContain('async ||');
      expect(result.rustCode).toContain('use tokio;');
      expect(result.rustCode).not.toContain('Promise');
      expect(result.rustCode).toContain('Result<String, String>');
    });

    it('should handle async functions with parameters', () => {
      const result = compile(`
        const processUser = async (id: number, name: string): Promise<boolean> => {
          return true;
        };
      `);
      
      if (result.errors.length > 0) {
        console.log('Compilation errors:', result.errors);
      }
      
      expect(result.errors.length).toBe(0);
      expect(result.rustCode).toContain('async |id: f64, name: String|');
      expect(result.rustCode).toContain('Result<bool, String>');
      expect(result.rustCode).toContain('use tokio;');
    });
  });

  describe('Async Arrow Functions', () => {
    it('should generate async closures for async arrow functions', () => {
      const result = compile(`
        const fetchUser = async (): Promise<string> => {
          return "user";
        };
      `);
      
      expect(result.rustCode).toContain('async ||');
      expect(result.rustCode).toContain('Result<String, String>');
      expect(result.rustCode).toContain('use tokio;');
    });

    it('should handle async arrow functions with parameters', () => {
      const result = compile(`
        const calculate = async (x: number, y: number): Promise<number> => {
          return x + y;
        };
      `);
      
      expect(result.rustCode).toContain('async |x: f64, y: f64|');
      expect(result.rustCode).toContain('Result<f64, String>');
      expect(result.rustCode).toContain('use tokio;');
    });

    it('should handle async arrow functions with single expression', () => {
      const source = `
        const getValue = async (): Promise<number> => 42;
        
        // Immediately invoke and log (simulates runtime behavior)
        getValue().then((result: number) => console.log(result));
      `;
      
      const { jsCode, rustCode, jsResult, rustResult, equivalent } = compileAndExecute(source);
      
      expect(rustCode).toContain('async ||');
      expect(rustCode).toContain('Result<f64, String>');
      expect(rustCode).toContain('Ok(42.0)');
      expect(rustCode).toContain('use tokio;');
      
      // Runtime equivalence with Cargo-based execution
      if (isCargoAvailable()) {
        expect(rustResult.success).toBe(true);
        expect(jsResult.success).toBe(true);
        expect(normalizeOutput(rustResult.stdout)).toBe(normalizeOutput(jsResult.stdout));
      }
    });
  });

  describe('Async Methods', () => {
    it('should generate async methods in classes', () => {
      const result = compile(`
        class UserService {
          async loadUser(id: number): Promise<string> {
            const result: string = \`user-\${id}\`;
            return result;
          }
        }
      `);
      
      if (result.errors.length > 0) {
        console.log('Compilation errors:', result.errors);
      }
      
      expect(result.errors.length).toBe(0);
      expect(result.rustCode).toContain('async fn loadUser');
      expect(result.rustCode).toContain('&mut self');
      expect(result.rustCode).toContain('id: f64');
      expect(result.rustCode).toContain('Result<String, String>');
      expect(result.rustCode).toContain('use tokio;');
    });

    it('should handle async methods that modify self', () => {
      const result = compile(`
        class Counter {
          count: number = 0;

          async increment(): Promise<void> {
            this.count = this.count + 1;
          }
        }
      `);
      
      if (result.errors.length > 0) {
        console.log('Compilation errors:', result.errors);
      }
      if (!result.rustCode) {
        console.log('No Rust code generated');
      }
      
      expect(result.errors.length).toBe(0);
      expect(result.rustCode).toContain('async fn increment');
      expect(result.rustCode).toContain('&mut self');
      expect(result.rustCode).toContain('Result<(), String>');
      expect(result.rustCode).toContain('use tokio;');
    });
  });

  describe('Await Expressions', () => {
    it('should generate .await for await expressions', () => {
      const result = compile(`
        const processData = async (): Promise<string> => {
          const data = await fetchData();
          return data;
        };

        const fetchData = async (): Promise<string> => {
          return "result";
        };
      `);
      
      expect(result.rustCode).toContain('fetchData().await?');
      expect(result.rustCode).toContain('use tokio;');
    });

    it('should handle multiple await expressions', () => {
      const result = compile(`
        const getFirst = async (): Promise<string> => {
          return "Hello";
        };

        const getSecond = async (): Promise<string> => {
          return "World";
        };
        
        const combine = async (): Promise<string> => {
          const first = await getFirst();
          const second = await getSecond();
          return first + second;
        };
      `);
      
      expect(result.rustCode).toContain('getFirst().await?');
      expect(result.rustCode).toContain('getSecond().await?');
      expect(result.rustCode).toContain('use tokio;');
    });

    it('should handle await in expressions', () => {
      const result = compile(`
        const getValue = async (): Promise<number> => {
          return 5;
        };
        
        const calculate = async (): Promise<number> => {
          return (await getValue()) + 10;
        };
      `);
      
      expect(result.rustCode).toContain('getValue().await?');
      expect(result.rustCode).toContain('use tokio;');
    });
  });

  describe('Async with Error Handling', () => {
    it('should combine async with try/catch', () => {
      const result = compile(`
        const safeLoad = async (): Promise<string> => {
          try {
            const data = await loadData();
            return data;
          } catch (e) {
            return "error";
          }
        };

        const loadData = async (): Promise<string> => {
          return "loaded";
        };
      `);
      
      expect(result.rustCode).toContain('async ||');
      expect(result.rustCode).toContain('loadData().await?');
      expect(result.rustCode).toContain('match');
      expect(result.rustCode).toContain('Ok(_) =>');
      expect(result.rustCode).toContain('Err(e) =>');
      expect(result.rustCode).toContain('use tokio;');
    });
  });

  describe('Promise Type Handling', () => {
    it('should strip Promise wrapper from return types', () => {
      const result = compile(`
        const getString = async (): Promise<string> => {
          return "test";
        };

        const getNumber = async (): Promise<number> => {
          return 42;
        };

        const getBoolean = async (): Promise<boolean> => {
          return true;
        };
      `);
      
      expect(result.rustCode).toContain('Result<String, String>');
      expect(result.rustCode).toContain('Result<f64, String>');
      expect(result.rustCode).toContain('Result<bool, String>');
      expect(result.rustCode).not.toContain('Promise');
      expect(result.rustCode).toContain('use tokio;');
    });

    it('should handle Promise with complex types', () => {
      const result = compile(`
        interface User {
          name: string;
          age: number;
        }

        const getUser = async (): Promise<User> => {
          return { name: "Alice", age: 30 };
        };
      `);
      
      expect(result.rustCode).toContain('Result<User, String>');
      expect(result.rustCode).not.toContain('Promise');
      expect(result.rustCode).toContain('use tokio;');
    });
  });

  describe('Complex Async Scenarios', () => {
    it('should handle async functions calling other async functions', () => {
      const result = compile(`
        const orchestrate = async (): Promise<string> => {
          const a = await stepOne();
          const b = await stepTwo(a);
          const c = await stepThree(b);
          return c;
        };

        const stepOne = async (): Promise<number> => {
          return 1;
        };

        const stepTwo = async (x: number): Promise<number> => {
          return x + 1;
        };

        const stepThree = async (x: number): Promise<string> => {
          return \`Result: \${x}\`;
        };
      `);
      
      expect(result.rustCode).toContain('async ||');
      expect(result.rustCode).toContain('stepOne().await?');
      expect(result.rustCode).toContain('stepTwo(a).await?');
      expect(result.rustCode).toContain('stepThree(b).await?');
      expect(result.rustCode).toContain('use tokio;');
    });

    it('should handle async arrow functions assigned to variables', () => {
      const result = compile(`
        const delay = async (ms: number): Promise<void> => {
          // Simulate delay
        };

        const processWithDelay = async (data: string): Promise<string> => {
          await delay(100);
          return data;
        };
      `);
      
      expect(result.rustCode).toContain('async |ms: f64|');
      expect(result.rustCode).toContain('async |data: String|');
      expect(result.rustCode).toContain('delay(100.0).await?');
      expect(result.rustCode).toContain('use tokio;');
    });
  });
});
