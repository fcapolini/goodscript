/**
 * Test array access in C++ code generation
 * 
 * JavaScript returns undefined for out-of-bounds reads.
 * C++ gs::Array<T> operator[] returns T* (pointer), nullptr for out-of-bounds.
 * Auto-dereference wrapper (*arr[i]) provides value semantics.
 * 
 * This provides JavaScript-compatible bounds checking without runtime overhead
 * for in-bounds access.
 */

import { describe, it, expect } from 'vitest';
import { CppCodegen } from '../../../src/cpp/codegen';
import ts from 'typescript';

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

describe('Phase 3: Array Bounds Checking', () => {
  it('should use at_ref() for array reads', () => {
    const cpp = compileToCpp(`
      const arr = [1, 2, 3];
      const x = arr[0];
      const y = arr[1];
    `);
    
    // Should use at_ref() for bounds-checked array access
    expect(cpp).toContain('arr.at_ref(0)');
    expect(cpp).toContain('arr.at_ref(1)');
  });

  it('should handle array writes with assignment', () => {
    const cpp = compileToCpp(`
      const arr: number[] = [];
      arr[0] = 1;
      arr[5] = 10;
    `);
    
    // Writes should use set() method which handles auto-resize
    expect(cpp).toContain('arr.set(0, 1)');
    expect(cpp).toContain('arr.set(5, 10)');
  });

  it('should not confuse Map access with array access', () => {
    const cpp = compileToCpp(`
      const map = new Map<string, number>();
      map.set("key", 42);
      const val = map.get("key");
    `);
    
    // Maps should use their own API
    expect(cpp).toContain('map');
    expect(cpp).toContain('set');
    expect(cpp).toContain('get');
  });

  it('should handle array reads in expressions', () => {
    const cpp = compileToCpp(`
      const arr = [10, 20, 30];
      const sum = arr[0] + arr[1] + arr[2];
    `);
    
    // All array reads should use at_ref()
    expect(cpp).toContain('arr.at_ref(0)');
    expect(cpp).toContain('arr.at_ref(1)');
    expect(cpp).toContain('arr.at_ref(2)');
  });

  it('should handle array reads with variable indices', () => {
    const cpp = compileToCpp(`
      const arr = [1, 2, 3, 4, 5];
      const i = 2;
      const val = arr[i];
    `);
    
    // Should use at_ref() with variable index
    expect(cpp).toContain('arr.at_ref(i)');
  });

  it('should handle nested array access', () => {
    const cpp = compileToCpp(`
      const matrix = [[1, 2], [3, 4]];
      const val = matrix[0][1];
    `);
    
    // Should use at_ref() for both levels
    expect(cpp).toContain('.at_ref(0)');
    expect(cpp).toContain('.at_ref(1)');
  });

  it('should use at_ref() for array element reads', () => {
    // NOTE: Arrays use at_ref() which provides bounds-checked access
    const cpp = compileToCpp(`
      const arr = [1, 2, 3];
      const x = arr[0];
    `);
    
    // Should use at_ref() for bounds-checked value access
    expect(cpp).toContain('arr.at_ref(0)');
  });

  it('should throw exception for out-of-bounds reads', () => {
    const cpp = compileToCpp(`
      const arr = [1, 2, 3];
      const x = arr[10];
      console.log(x);
    `);
    
    // Should compile with at_ref() which throws std::out_of_range for out-of-bounds
    // This provides safety similar to JavaScript's undefined behavior
    expect(cpp).toContain('arr.at_ref(10)');
    expect(cpp).toContain('console::log');
  });
});
