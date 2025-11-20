import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Compiler } from '../../src/compiler';
import { writeFileSync, unlinkSync, mkdirSync, existsSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { validateRustCode, isRustcAvailable } from './rust-validator';
import { executeJS, executeRust, compareOutputs } from './runtime-helpers';

describe('Phase 3 - For Loops', () => {
  let tmpDir: string;
  let compiler: Compiler;

  beforeEach(() => {
    tmpDir = join(tmpdir(), 'goodscript-test-for-loops-' + Date.now() + '-' + Math.random().toString(36).substring(7));
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

  describe('Regular For Loops', () => {
    it('should translate basic for loop with numeric counter', () => {
      const source = `
        for (let i = 0; i < 5; i++) {
          console.log(i);
        }
      `;
      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      expect(result.rustCode).toBeTruthy();
      
      // Should generate Rust loop with counter
      expect(result.rustCode).toContain('for');
      expect(result.rustCode).toContain('0..5');
    });

    it('should translate for loop with step increment', () => {
      const source = `
        for (let i = 0; i < 10; i += 2) {
          console.log(i);
        }
      `;
      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      expect(result.rustCode).toBeTruthy();
      
      // Should generate range with step
      expect(result.rustCode).toContain('step_by');
    });

    it('should translate for loop with decrement', () => {
      const source = `
        for (let i = 5; i > 0; i--) {
          console.log(i);
        }
      `;
      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      expect(result.rustCode).toBeTruthy();
      
      // Should generate reverse range
      expect(result.rustCode).toContain('rev()');
    });

    it('should translate for loop with complex condition', () => {
      const source = `
        for (let i = 0; i < 10; i++) {
          if (i % 2 === 0) {
            console.log(i);
          }
        }
      `;
      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      expect(result.rustCode).toBeTruthy();
    });
  });

  describe('Runtime Equivalence', () => {
    it('should produce same output for basic for loop', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        for (let i = 0; i < 3; i++) {
          console.log(i);
        }
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const jsResult = await executeJS(result.jsCode!);
      const rustResult = await executeRust(result.rustCode!);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for for loop with step', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        for (let i = 0; i < 6; i += 2) {
          console.log(i);
        }
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const jsResult = await executeJS(result.jsCode!);
      const rustResult = await executeRust(result.rustCode!);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for descending for loop', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        for (let i = 3; i > 0; i--) {
          console.log(i);
        }
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const jsResult = await executeJS(result.jsCode!);
      const rustResult = await executeRust(result.rustCode!);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for for loop with conditional logic', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        for (let i = 0; i < 10; i++) {
          if (i % 2 === 0) {
            console.log(i);
          }
        }
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const jsResult = await executeJS(result.jsCode!);
      const rustResult = await executeRust(result.rustCode!);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for nested for loops', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        for (let i = 0; i < 2; i++) {
          for (let j = 0; j < 3; j++) {
            console.log(i * 10 + j);
          }
        }
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const jsResult = await executeJS(result.jsCode!);
      const rustResult = await executeRust(result.rustCode!);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for for loop with accumulation', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        let sum = 0;
        for (let i = 1; i <= 5; i++) {
          sum += i;
        }
        console.log(sum);
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const jsResult = await executeJS(result.jsCode!);
      const rustResult = await executeRust(result.rustCode!);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for for loop with early break', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        for (let i = 0; i < 10; i++) {
          if (i === 5) {
            break;
          }
          console.log(i);
        }
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const jsResult = await executeJS(result.jsCode!);
      const rustResult = await executeRust(result.rustCode!);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for for loop with continue', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        for (let i = 0; i < 5; i++) {
          if (i === 2) {
            continue;
          }
          console.log(i);
        }
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const jsResult = await executeJS(result.jsCode!);
      const rustResult = await executeRust(result.rustCode!);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for basic numeric for loop', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        for (let i = 0; i < 3; i++) {
          console.log(i);
        }
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const jsResult = await executeJS(result.jsCode!);
      const rustResult = await executeRust(result.rustCode!);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for for loop with step increment', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        for (let i = 0; i < 10; i += 2) {
          console.log(i);
        }
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const jsResult = await executeJS(result.jsCode!);
      const rustResult = await executeRust(result.rustCode!);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for for loop with decrement', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        for (let i = 5; i > 0; i--) {
          console.log(i);
        }
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const jsResult = await executeJS(result.jsCode!);
      const rustResult = await executeRust(result.rustCode!);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for for loop with complex condition', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        for (let i = 0; i < 5; i++) {
          if (i > 2) {
            console.log(i);
          }
        }
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const jsResult = await executeJS(result.jsCode!);
      const rustResult = await executeRust(result.rustCode!);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for for loop with multiple operations', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        let sum = 0;
        for (let i = 1; i <= 3; i++) {
          sum += i;
          console.log(sum);
        }
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const jsResult = await executeJS(result.jsCode!);
      const rustResult = await executeRust(result.rustCode!);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for for loop with step increment', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        for (let i = 0; i < 10; i = i + 2) {
          console.log(i);
        }
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const jsResult = await executeJS(result.jsCode!);
      const rustResult = await executeRust(result.rustCode!);
      
      compareOutputs(jsResult, rustResult);
    });

    it('should produce same output for for loop with decrement', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        for (let i = 5; i > 0; i--) {
          console.log(i);
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
    it('should generate valid Rust for basic for loop', () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping validation');
        return;
      }

      const source = `
        for (let i = 1; i <= 5; i++) {
          console.log(i);
        }
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

    it('should produce same output for numeric counter for loop', async () => {
      if (!isRustcAvailable()) {
        console.log('⚠️  rustc not available - skipping runtime test');
        return;
      }

      const source = `
        let sum = 0;
        for (let i = 1; i <= 10; i++) {
          sum = sum + i;
        }
        console.log(sum);
      `;

      const result = compile(source);
      expect(result.diagnostics).toHaveLength(0);
      
      const jsResult = await executeJS(result.jsCode!);
      const rustResult = await executeRust(result.rustCode!);
      
      compareOutputs(jsResult, rustResult);
    });
  });
});
