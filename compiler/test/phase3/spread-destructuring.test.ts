import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Compiler } from '../../src/compiler';
import { writeFileSync, mkdirSync, existsSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { validateRustCode, isRustcAvailable } from './rust-validator';
import { executeJS, executeRust, compareOutputs, normalizeOutput } from './runtime-helpers';

describe('Phase 3 - Spread Operator & Destructuring', () => {
  let tmpDir: string;
  let compiler: Compiler;

  beforeEach(() => {
    tmpDir = join(tmpdir(), 'goodscript-test-spread-' + Date.now() + '-' + Math.random().toString(36).substring(7));
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

  describe('Array Spread', () => {
    it('should generate iterator chain for array spread', () => {
      const source = `
        const arr1: number[] = [1, 2, 3];
        const arr2: number[] = [4, 5, 6];
        const combined: number[] = [...arr1, ...arr2];
        console.log(combined.join(','));
      `;
      
      const { jsCode, rustCode, jsResult, rustResult, equivalent } = compileAndExecute(source);
      
      expect(rustCode).toContain('arr1.iter().copied()');
      expect(rustCode).toContain('arr2.iter().copied()');
      expect(rustCode).toContain('.chain(');
      expect(rustCode).toContain('.collect::<Vec<_>>()');
      
      // Verify runtime equivalence
      expect(jsResult.success).toBe(true);
      if (isRustcAvailable()) {
        expect(rustResult.success).toBe(true);
        expect(normalizeOutput(jsResult.stdout)).toBe(normalizeOutput(rustResult.stdout));
        expect(equivalent).toBe(true);
      }
    });

    it('should handle spread with literal elements', () => {
      const source = `
        const arr: number[] = [1, 2];
        const extended: number[] = [0, ...arr, 3];
        console.log(extended.join(','));
      `;
      
      const { jsCode, rustCode, jsResult, rustResult, equivalent } = compileAndExecute(source);
      
      expect(rustCode).toContain('std::iter::once');
      expect(rustCode).toContain('arr.iter().copied()');
      expect(rustCode).toContain('.chain(');
      
      // Verify runtime equivalence
      expect(jsResult.success).toBe(true);
      if (isRustcAvailable()) {
        expect(rustResult.success).toBe(true);
        expect(normalizeOutput(jsResult.stdout)).toBe(normalizeOutput(rustResult.stdout));
        expect(equivalent).toBe(true);
      }
    });

    it('should handle multiple spread elements', () => {
      const source = `
        const a: number[] = [1];
        const b: number[] = [2];
        const c: number[] = [3];
        const all: number[] = [...a, ...b, ...c];
        console.log(all.join(','));
      `;
      
      const { jsCode, rustCode, jsResult, rustResult, equivalent } = compileAndExecute(source);
      
      expect(rustCode).toContain('a.iter().copied()');
      expect(rustCode).toContain('b.iter().copied()');
      expect(rustCode).toContain('c.iter().copied()');
      expect(rustCode).toContain('.collect::<Vec<_>>()');
      
      // Verify runtime equivalence
      expect(jsResult.success).toBe(true);
      if (isRustcAvailable()) {
        expect(rustResult.success).toBe(true);
        expect(normalizeOutput(jsResult.stdout)).toBe(normalizeOutput(rustResult.stdout));
        expect(equivalent).toBe(true);
      }
    });
  });

  describe('Object Spread', () => {
    it('should handle object spread syntax', () => {
      const source = `
        interface Point {
          x: number;
          y: number;
        }

        const p1: Point = { x: 1, y: 2 };
        const p2: Point = { ...p1 };
        console.log(\`\${p2.x},\${p2.y}\`);
      `;
      
      const { jsCode, rustCode, jsResult, rustResult, equivalent } = compileAndExecute(source);
      
      // Object spread is marked with a comment for now
      expect(rustCode).toContain('..p1');
      
      // Verify runtime equivalence
      expect(jsResult.success).toBe(true);
      if (isRustcAvailable()) {
        expect(rustResult.success).toBe(true);
        expect(normalizeOutput(jsResult.stdout)).toBe(normalizeOutput(rustResult.stdout));
        expect(equivalent).toBe(true);
      }
    });

    it('should handle object spread with overrides', () => {
      const source = `
        interface Config {
          host: string;
          port: number;
        }

        const defaultConfig: Config = { host: "localhost", port: 8080 };
        const customConfig: Config = { ...defaultConfig, port: 3000 };
        console.log(\`\${customConfig.host}:\${customConfig.port}\`);
      `;
      
      const { jsCode, rustCode, jsResult, rustResult, equivalent } = compileAndExecute(source);
      
      expect(rustCode).toContain('..defaultConfig');
      expect(rustCode).toContain('port: 3000.0');
      
      // Verify runtime equivalence
      expect(jsResult.success).toBe(true);
      if (isRustcAvailable()) {
        expect(rustResult.success).toBe(true);
        expect(normalizeOutput(jsResult.stdout)).toBe(normalizeOutput(rustResult.stdout));
        expect(equivalent).toBe(true);
      }
    });
  });

  describe('Property Shorthand', () => {
    it('should handle shorthand property assignments', () => {
      const source = `
        const firstName: string = "Alice";
        const age: number = 30;
        
        interface Person {
          firstName: string;
          age: number;
        }
        
        const person: Person = { firstName, age };
        console.log(\`\${person.firstName},\${person.age}\`);
      `;
      
      const { jsCode, rustCode, jsResult, rustResult, equivalent } = compileAndExecute(source);
      
      expect(rustCode).toContain('firstName: firstName');
      expect(rustCode).toContain('age: age');
      
      // Verify runtime equivalence
      expect(jsResult.success).toBe(true);
      if (isRustcAvailable()) {
        expect(rustResult.success).toBe(true);
        expect(normalizeOutput(jsResult.stdout)).toBe(normalizeOutput(rustResult.stdout));
        expect(equivalent).toBe(true);
      }
    });

    it('should handle mixed shorthand and regular properties', () => {
      const source = `
        const x: number = 10;
        const y: number = 20;
        
        interface Point {
          x: number;
          y: number;
          z: number;
        }
        
        const point: Point = { x, y, z: 0 };
        console.log(\`\${point.x},\${point.y},\${point.z}\`);
      `;
      
      const { jsCode, rustCode, jsResult, rustResult, equivalent } = compileAndExecute(source);
      
      expect(rustCode).toContain('x: x');
      expect(rustCode).toContain('y: y');
      expect(rustCode).toContain('z: 0.0');
      
      // Verify runtime equivalence
      expect(jsResult.success).toBe(true);
      if (isRustcAvailable()) {
        expect(rustResult.success).toBe(true);
        expect(normalizeOutput(jsResult.stdout)).toBe(normalizeOutput(rustResult.stdout));
        expect(equivalent).toBe(true);
      }
    });
  });

  describe('Rest Parameters', () => {
    it('should handle rest parameters in function signatures', () => {
      const source = `
        const sum = (...numbers: number[]): number => {
          let total: number = 0;
          for (const n of numbers) {
            total = total + n;
          }
          return total;
        };
        
        const args: number[] = [1, 2, 3, 4];
        const result: number = sum(...args);
        console.log(result);
      `;
      
      const { jsCode, rustCode, jsResult, rustResult, equivalent } = compileAndExecute(source);
      
      // Rest parameters should be treated as Vec<T>
      expect(rustCode).toContain('numbers: Vec<f64>');
      
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
