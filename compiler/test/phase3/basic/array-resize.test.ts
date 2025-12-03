/**
 * Tests for JavaScript-style array auto-resize behavior
 * 
 * In JavaScript/TypeScript, assigning to an index beyond the current array length
 * automatically extends the array. This test verifies C++ codegen does the same.
 * 
 * NOTE: Auto-resize feature not yet implemented in AST-based codegen.
 * These tests are skipped until the feature is added.
 */

import { describe, it, expect } from 'vitest';
import { CppCodegen } from '../../../src/cpp/codegen';
import ts from 'typescript';

/**
 * Helper to compile TypeScript source to C++
 */
function compileToCpp(source: string): string {
  const sourceFile = ts.createSourceFile(
    'test.ts',
    source,
    ts.ScriptTarget.ES2020,
    true
  );
  
  const codegen = new CppCodegen();
  return codegen.generate(sourceFile);
}

describe('Phase 3: Array Auto-Resize', () => {
  it('should auto-resize when assigning beyond current length', () => {
    const source = `
      const arr: number[] = [];
      arr[5] = 42;
    `;
    const cpp = compileToCpp(source);
    
    // Should use set() method which handles auto-resize internally
    expect(cpp).toContain('arr.set(5, 42)');
  });
  
  it('should handle assignment in a loop', () => {
    const source = `
      const arr: number[] = [];
      for (let i = 0; i < 10; i = i + 1) {
        arr[i] = i * 2;
      }
    `;
    const cpp = compileToCpp(source);
    
    // Should use set() method
    expect(cpp).toContain('arr.set(i,');
  });
  
  it('should handle assignment to sparse array', () => {
    const source = `
      const arr: string[] = [];
      arr[0] = "first";
      arr[100] = "sparse";
    `;
    const cpp = compileToCpp(source);
    
    // Should use set() method for both assignments
    expect(cpp).toContain('arr.set(0,');
    expect(cpp).toContain('arr.set(100,');
  });
  
  it('should work with computed indices', () => {
    const source = `
      const arr: number[] = [];
      const idx = 5 + 3;
      arr[idx] = 99;
    `;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('arr.set(idx, 99)');
  });
  
  it('should handle untyped array with assignment', () => {
    const source = `
      const a = [];
      a[10] = 0;
    `;
    const cpp = compileToCpp(source);
    
    // Should use set() method
    expect(cpp).toContain('.set(10, 0)');
    // Should create a typed array
    expect(cpp).toMatch(/gs::Array|auto a\s*=\s*gs::Array/);
  });
});
