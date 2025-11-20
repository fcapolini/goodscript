import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Compiler } from '../../src/compiler';
import { writeFileSync, mkdirSync, existsSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { validateRustCode, isRustcAvailable } from './rust-validator';
import { executeJS, executeRust, compareOutputs, normalizeOutput } from './runtime-helpers';

describe('Phase 3 - Destructuring', () => {
  let tmpDir: string;
  let compiler: Compiler;

  beforeEach(() => {
    tmpDir = join(tmpdir(), 'goodscript-test-destruct-' + Date.now() + '-' + Math.random().toString(36).substring(7));
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

  describe('Array Destructuring', () => {
    it('should handle basic array destructuring', () => {
      const source = `
        const arr: number[] = [1, 2, 3];
        const [a, b, c] = arr;
        console.log(\`\${a},\${b},\${c}\`);
      `;
      
      const { jsCode, rustCode, jsResult, rustResult, equivalent } = compileAndExecute(source);
      
      // Verify Rust code structure
      expect(rustCode).toContain('let arr: Vec<f64> = vec![1.0, 2.0, 3.0]');
      
      // Verify runtime equivalence
      expect(jsResult.success).toBe(true);
      if (isRustcAvailable()) {
        expect(rustResult.success).toBe(true);
        expect(normalizeOutput(jsResult.stdout)).toBe(normalizeOutput(rustResult.stdout));
        expect(equivalent).toBe(true);
      }
    });

    it('should handle array destructuring with rest', () => {
      const source = `
        const arr: number[] = [1, 2, 3, 4, 5];
        const [first, second, ...rest] = arr;
        console.log(\`\${first},\${second},\${rest.length}\`);
      `;
      
      const { jsCode, rustCode, jsResult, rustResult, equivalent } = compileAndExecute(source);
      
      // Verify runtime equivalence
      expect(jsResult.success).toBe(true);
      if (isRustcAvailable()) {
        expect(rustResult.success).toBe(true);
        expect(normalizeOutput(jsResult.stdout)).toBe(normalizeOutput(rustResult.stdout));
        expect(equivalent).toBe(true);
      }
    });

    it('should handle array destructuring with skipped elements', () => {
      const source = `
        const arr: number[] = [1, 2, 3, 4];
        const [first, , third] = arr;
        console.log(\`\${first},\${third}\`);
      `;
      
      const { jsCode, rustCode, jsResult, rustResult, equivalent } = compileAndExecute(source);
      
      // Verify runtime equivalence
      expect(jsResult.success).toBe(true);
      if (isRustcAvailable()) {
        expect(rustResult.success).toBe(true);
        expect(normalizeOutput(jsResult.stdout)).toBe(normalizeOutput(rustResult.stdout));
        expect(equivalent).toBe(true);
      }
    });
  });

  describe('Object Destructuring', () => {
    it('should handle basic object destructuring', () => {
      const source = `
        interface Point {
          x: number;
          y: number;
        }
        
        const point: Point = { x: 10, y: 20 };
        const { x, y } = point;
        console.log(\`\${x},\${y}\`);
      `;
      
      const { jsCode, rustCode, jsResult, rustResult, equivalent } = compileAndExecute(source);
      
      // Verify runtime equivalence
      expect(jsResult.success).toBe(true);
      if (isRustcAvailable()) {
        expect(rustResult.success).toBe(true);
        expect(normalizeOutput(jsResult.stdout)).toBe(normalizeOutput(rustResult.stdout));
        expect(equivalent).toBe(true);
      }
    });

    it('should handle object destructuring with renaming', () => {
      const source = `
        interface Config {
          host: string;
          port: number;
        }
        
        const config: Config = { host: "localhost", port: 8080 };
        const { host: serverHost, port: serverPort } = config;
        console.log(\`\${serverHost}:\${serverPort}\`);
      `;
      
      const { jsCode, rustCode, jsResult, rustResult, equivalent } = compileAndExecute(source);
      
      // Verify runtime equivalence
      expect(jsResult.success).toBe(true);
      if (isRustcAvailable()) {
        expect(rustResult.success).toBe(true);
        expect(normalizeOutput(jsResult.stdout)).toBe(normalizeOutput(rustResult.stdout));
        expect(equivalent).toBe(true);
      }
    });

    it('should handle object destructuring with defaults', () => {
      const source = `
        interface Options {
          timeout: number;
          retries: number;
        }
        
        const opts: Options = { timeout: 1000, retries: 3 };
        const { timeout = 5000, retries = 1 } = opts;
        console.log(\`\${timeout},\${retries}\`);
      `;
      
      const { jsCode, rustCode, jsResult, rustResult, equivalent } = compileAndExecute(source);
      
      // Verify runtime equivalence
      expect(jsResult.success).toBe(true);
      if (isRustcAvailable()) {
        expect(rustResult.success).toBe(true);
        expect(normalizeOutput(jsResult.stdout)).toBe(normalizeOutput(rustResult.stdout));
        expect(equivalent).toBe(true);
      }
    });
  });

  describe('Nested Destructuring', () => {
    it('should handle nested array destructuring', () => {
      const source = `
        const nested: number[][] = [[1, 2], [3, 4]];
        const [[a, b], [c, d]] = nested;
        console.log(\`\${a},\${b},\${c},\${d}\`);
      `;
      
      const { jsCode, rustCode, jsResult, rustResult, equivalent } = compileAndExecute(source);
      
      // Verify runtime equivalence
      expect(jsResult.success).toBe(true);
      if (isRustcAvailable()) {
        expect(rustResult.success).toBe(true);
        expect(normalizeOutput(jsResult.stdout)).toBe(normalizeOutput(rustResult.stdout));
        expect(equivalent).toBe(true);
      }
    });

    it('should handle nested object destructuring', () => {
      const source = `
        interface Address {
          city: string;
          zip: number;
        }
        
        interface Person {
          firstName: string;
          address: Address;
        }
        
        const person: Person = { 
          firstName: "Alice", 
          address: { city: "NYC", zip: 10001 } 
        };
        const { firstName, address: { city, zip } } = person;
        console.log(\`\${firstName},\${city},\${zip}\`);
      `;
      
      const { jsCode, rustCode, jsResult, rustResult, equivalent } = compileAndExecute(source);
      
      // Verify runtime equivalence
      expect(jsResult.success).toBe(true);
      if (isRustcAvailable()) {
        expect(rustResult.success).toBe(true);
        expect(normalizeOutput(jsResult.stdout)).toBe(normalizeOutput(rustResult.stdout));
        expect(equivalent).toBe(true);
      }
    });
  });

  describe('Function Parameter Destructuring', () => {
    it('should handle array destructuring in parameters', () => {
      const source = `
        const printPair = ([a, b]: number[]): void => {
          console.log(\`\${a},\${b}\`);
        };
        
        printPair([10, 20]);
      `;
      
      const { jsCode, rustCode, jsResult, rustResult, equivalent } = compileAndExecute(source);
      
      // Verify runtime equivalence
      expect(jsResult.success).toBe(true);
      if (isRustcAvailable()) {
        expect(rustResult.success).toBe(true);
        expect(normalizeOutput(jsResult.stdout)).toBe(normalizeOutput(rustResult.stdout));
        expect(equivalent).toBe(true);
      }
    });

    it('should handle object destructuring in parameters', () => {
      const source = `
        interface Point {
          x: number;
          y: number;
        }
        
        const printPoint = ({ x, y }: Point): void => {
          console.log(\`\${x},\${y}\`);
        };
        
        printPoint({ x: 5, y: 10 });
      `;
      
      const { jsCode, rustCode, jsResult, rustResult, equivalent } = compileAndExecute(source);
      
      // Verify runtime equivalence
      expect(jsResult.success).toBe(true);
      if (isRustcAvailable()) {
        expect(rustResult.success).toBe(true);
        expect(normalizeOutput(jsResult.stdout)).toBe(normalizeOutput(rustResult.stdout));
        expect(equivalent).toBe(true);
      }
    });
  });
});
