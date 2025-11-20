import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Compiler } from '../../src/compiler';
import { writeFileSync, unlinkSync, mkdirSync, existsSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { validateRustCode, isRustcAvailable } from './rust-validator';
import { executeJS, executeRust, compareOutputs } from './runtime-helpers';

describe('Phase 3 - Array Methods', () => {
  let tmpDir: string;
  let compiler: Compiler;

  beforeEach(() => {
    tmpDir = join(tmpdir(), 'goodscript-test-array-methods-' + Date.now() + '-' + Math.random().toString(36).substring(7));
    mkdirSync(tmpDir, { recursive: true });
    compiler = new Compiler();
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  const compile = (source: string) => {
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
    
    return {
      diagnostics: result.diagnostics,
      rustCode,
      jsCode,
    };
  };

  describe('Array.map()', () => {
    it('should translate array.map() with arrow function', () => {
      const source = `
        const numbers = [1, 2, 3];
        const doubled = numbers.map((x) => x * 2);
        console.log(doubled);
      `;
      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      expect(result.rustCode).toBeTruthy();
      
      // Should use Rust iter().map().collect()
      expect(result.rustCode).toContain('.iter()');
      expect(result.rustCode).toContain('.map(');
      expect(result.rustCode).toMatch(/\.collect/);
    });

    it('should translate map with index parameter', () => {
      const source = `
        const numbers = [10, 20, 30];
        const indexed = numbers.map((x, i) => x + i);
      `;
      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      expect(result.rustCode).toBeTruthy();
      
      // Should use enumerate()
      expect(result.rustCode).toContain('.enumerate()');
    });
  });

  describe('Array.filter()', () => {
    it('should translate array.filter() with arrow function', () => {
      const source = `
        const numbers = [1, 2, 3, 4, 5];
        const evens = numbers.filter((x) => x % 2 === 0);
        console.log(evens);
      `;
      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      expect(result.rustCode).toBeTruthy();
      
      // Should use Rust iter().filter().collect()
      expect(result.rustCode).toContain('.iter()');
      expect(result.rustCode).toContain('.filter(');
      expect(result.rustCode).toMatch(/\.collect/);
    });
  });

  describe('Array.forEach()', () => {
    it('should translate array.forEach() with arrow function', () => {
      const source = `
        const numbers = [1, 2, 3];
        numbers.forEach((x) => console.log(x));
      `;
      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      expect(result.rustCode).toBeTruthy();
      
      // Should use Rust for-in loop or iter().for_each()
      expect(result.rustCode).toMatch(/(\.iter\(\)\.for_each|for.*in)/);
    });
  });

  describe('Runtime Equivalence', () => {
    it('should produce same output for map()', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const numbers = [1, 2, 3];
        const doubled = numbers.map((x) => x * 2);
        for (const n of doubled) {
          console.log(n);
        }
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const jsResult = await executeJS(result.jsCode!);
      const rustResult = await executeRust(result.rustCode!);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for filter()', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const numbers = [1, 2, 3, 4, 5, 6];
        const evens = numbers.filter((x) => x % 2 === 0);
        for (const n of evens) {
          console.log(n);
        }
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const jsResult = await executeJS(result.jsCode!);
      const rustResult = await executeRust(result.rustCode!);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for forEach()', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const numbers = [1, 2, 3];
        numbers.forEach((x) => console.log(x));
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const jsResult = await executeJS(result.jsCode!);
      const rustResult = await executeRust(result.rustCode!);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for map with index', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const numbers = [10, 20, 30];
        const indexed = numbers.map((x, i) => x + i);
        for (const n of indexed) {
          console.log(n);
        }
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const jsResult = await executeJS(result.jsCode!);
      const rustResult = await executeRust(result.rustCode!);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for chained map and filter', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const numbers = [1, 2, 3, 4, 5];
        const result = numbers
          .map((x) => x * 2)
          .filter((x) => x > 5);
        for (const n of result) {
          console.log(n);
        }
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const jsResult = await executeJS(result.jsCode!);
      const rustResult = await executeRust(result.rustCode!);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for reduce-like operations', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const numbers = [1, 2, 3, 4];
        let sum = 0;
        numbers.forEach((x) => sum += x);
        console.log(sum);
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const jsResult = await executeJS(result.jsCode!);
      const rustResult = await executeRust(result.rustCode!);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for simple map', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const numbers = [1, 2, 3];
        const doubled = numbers.map((x) => x * 2);
        console.log(doubled.length);
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const jsResult = await executeJS(result.jsCode!);
      const rustResult = await executeRust(result.rustCode!);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for simple filter', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const numbers = [1, 2, 3, 4, 5];
        const evens = numbers.filter((x) => x % 2 === 0);
        console.log(evens.length);
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const jsResult = await executeJS(result.jsCode!);
      const rustResult = await executeRust(result.rustCode!);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for simple forEach', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const numbers = [1, 2, 3];
        let count = 0;
        numbers.forEach((x) => count += 1);
        console.log(count);
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const jsResult = await executeJS(result.jsCode!);
      const rustResult = await executeRust(result.rustCode!);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for map with index parameter', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const letters = ["a", "b", "c"];
        const indexed = letters.map((letter, i) => i);
        for (const idx of indexed) {
          console.log(idx);
        }
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const jsResult = await executeJS(result.jsCode!);
      const rustResult = await executeRust(result.rustCode!);
      
      compareOutputs(jsResult, rustResult);
    });
  });

  describe('Rust Validation', () => {
    it('should generate valid Rust for map()', () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping validation');
        return;
      }

      const source = `
        const numbers = [1, 2, 3];
        const doubled = numbers.map((x) => x * 2);
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const validation = validateRustCode(result.rustCode!);
      if (!validation.valid) {
        console.log('Rust code:', result.rustCode);
        console.log('Rust errors:', validation.errors);
      }
      expect(validation.valid).toBe(true);
    });

    it('should generate valid Rust for filter()', () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping validation');
        return;
      }

      const source = `
        const numbers = [1, 2, 3, 4, 5];
        const evens = numbers.filter((x) => x % 2 === 0);
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const validation = validateRustCode(result.rustCode!);
      if (!validation.valid) {
        console.log('Rust code:', result.rustCode);
        console.log('Rust errors:', validation.errors);
      }
      expect(validation.valid).toBe(true);
    });

    it('should produce same output for filter with boolean check', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const numbers = [1, 2, 3, 4, 5, 6];
        const filtered = numbers.filter((x) => x > 3);
        for (const n of filtered) {
          console.log(n);
        }
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const jsResult = await executeJS(result.jsCode!);
      const rustResult = await executeRust(result.rustCode!);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for nested map operations', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const numbers = [1, 2, 3];
        const doubled = numbers.map((x) => x * 2);
        const tripled = doubled.map((x) => x + x / 2);
        for (const n of tripled) {
          console.log(n);
        }
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const jsResult = await executeJS(result.jsCode!);
      const rustResult = await executeRust(result.rustCode!);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for filter then forEach', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        const nums = [1, 2, 3, 4, 5, 6];
        const evens = nums.filter((x) => x % 2 === 0);
        evens.forEach((x) => console.log(x));
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const jsResult = await executeJS(result.jsCode!);
      const rustResult = await executeRust(result.rustCode!);
      
      compareOutputs(jsResult, rustResult);
    });
  });
});
