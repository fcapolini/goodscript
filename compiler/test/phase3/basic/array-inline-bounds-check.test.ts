import { describe, it, expect } from 'vitest';
import { Compiler } from '../../../src/index.js';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('Array inline bounds check', () => {
  function compileAndCheck(source: string): string {
    const tmpDir = mkdtempSync(join(tmpdir(), 'gs-test-'));
    const srcFile = join(tmpDir, 'test.gs.ts');
    writeFileSync(srcFile, source);
    
    const compiler = new Compiler();
    const result = compiler.compile({
      files: [srcFile],
      outDir: tmpDir,
      target: 'native',
      mode: 'ownership',
    });
    
    expect(result.success).toBe(true);
    
    const cppFile = join(tmpDir, 'test.cpp');
    const cppCode = readFileSync(cppFile, 'utf-8');
    rmSync(tmpDir, { recursive: true });
    return cppCode;
  }

  it('should use set_unchecked for proven safe bounds', () => {
    const cppCode = compileAndCheck(`
      const arr = [1, 2, 3];
      for (let i = 0; i < arr.length; i++) {
        arr[i] = 42;
      }
      console.log(arr[0]);
    `);

    expect(cppCode).toContain('set_unchecked');
    expect(cppCode).not.toContain('.set(');
  });

  it('should use set() for unproven bounds (variable limit unrelated to array)', () => {
    const cppCode = compileAndCheck(`
      const arr = [1, 2, 3];
      const limit = 10;
      for (let i = 0; i < limit; i++) {
        arr[i] = 42;
      }
      console.log(arr[0]);
    `);

    // Should use .set() with inline bounds check
    expect(cppCode).toContain('.set(');
    expect(cppCode).not.toContain('resize'); // No IIFE pattern
    expect(cppCode).not.toContain('[&]()'); // No lambda
  });
});
