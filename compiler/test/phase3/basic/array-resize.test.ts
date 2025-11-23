/**
 * Tests for JavaScript-style array auto-resize behavior
 * 
 * In JavaScript/TypeScript, assigning to an index beyond the current array length
 * automatically extends the array. This test verifies C++ codegen does the same.
 */

import { describe, it, expect } from 'vitest';
import { CppCodegen } from '../../../src/cpp-codegen';
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
    
    // Should contain resize logic
    expect(cpp).toContain('resize');
    expect(cpp).toContain('[__idx] = 42');
  });
  
  it('should handle assignment in a loop', () => {
    const source = `
      const arr: number[] = [];
      for (let i = 0; i < 10; i = i + 1) {
        arr[i] = i * 2;
      }
    `;
    const cpp = compileToCpp(source);
    
    // Should contain resize logic
    expect(cpp).toContain('resize');
  });
  
  it('should handle assignment to sparse array', () => {
    const source = `
      const arr: string[] = [];
      arr[0] = "first";
      arr[100] = "sparse";
    `;
    const cpp = compileToCpp(source);
    
    // Should contain resize logic for both assignments
    expect(cpp).toContain('resize');
  });
  
  it('should work with computed indices', () => {
    const source = `
      const arr: number[] = [];
      const idx = 5 + 3;
      arr[idx] = 99;
    `;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('resize');
  });
  
  it('should handle untyped array with assignment', () => {
    const source = `
      const a = [];
      a[10] = 0;
    `;
    const cpp = compileToCpp(source);
    
    // Should infer type from usage and resize
    expect(cpp).toContain('resize');
    // Should create a typed vector, not auto a = {}
    expect(cpp).toMatch(/std::vector<\w+>\s+a\s*=/);
  });
});
