/**
 * Test array bounds checking in C++ code generation
 * 
 * JavaScript returns undefined (or type-default) for out-of-bounds reads.
 * C++ vector[] causes undefined behavior. We use gs::array_get() which
 * returns a default-constructed value (0 for numbers, false for bool, etc.)
 * matching JavaScript semantics better than throwing exceptions.
 */

import { describe, it, expect } from 'vitest';
import { CppCodegen } from '../../../src/cpp-codegen';
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
  it('should use gs::array_get() for array reads to prevent segfaults', () => {
    const cpp = compileToCpp(`
      const arr = [1, 2, 3];
      const x = arr[0];
      const y = arr[1];
    `);
    
    // Should use gs::array_get() for safe access that matches JS semantics
    expect(cpp).toContain('gs::array_get(arr, 0)');
    expect(cpp).toContain('gs::array_get(arr, 1)');
    // Should NOT use unsafe [] for reads
    expect(cpp).not.toMatch(/arr\[0\](?!\s*=)/); // [] not followed by =
  });

  it('should still use resize for array writes', () => {
    const cpp = compileToCpp(`
      const arr: number[] = [];
      arr[0] = 1;
      arr[5] = 10;
    `);
    
    // Writes should use the resize pattern
    expect(cpp).toContain('resize');
    expect(cpp).toContain('__arr');
  });

  it('should use [] for Map access (not gs::array_get)', () => {
    const cpp = compileToCpp(`
      const map = new Map<string, number>();
      map.set("key", 42);
      const val = map.get("key");
    `);
    
    // Maps should not use gs::array_get
    expect(cpp).not.toContain('gs::array_get');
    expect(cpp).toContain('map');
  });

  it('should handle array reads in expressions', () => {
    const cpp = compileToCpp(`
      const arr = [10, 20, 30];
      const sum = arr[0] + arr[1] + arr[2];
    `);
    
    // All array reads should use gs::array_get()
    expect(cpp).toContain('gs::array_get(arr, 0)');
    expect(cpp).toContain('gs::array_get(arr, 1)');
    expect(cpp).toContain('gs::array_get(arr, 2)');
  });

  it('should handle array reads with variable indices', () => {
    const cpp = compileToCpp(`
      const arr = [1, 2, 3, 4, 5];
      const i = 2;
      const val = arr[i];
    `);
    
    // Should use gs::array_get() even with variable index
    expect(cpp).toContain('gs::array_get(arr, i)');
  });

  it('should handle nested array access', () => {
    const cpp = compileToCpp(`
      const matrix = [[1, 2], [3, 4]];
      const val = matrix[0][1];
    `);
    
    // Should use gs::array_get() for both levels
    expect(cpp).toContain('gs::array_get(matrix, 0)');
    expect(cpp).toContain('gs::array_get');
  });
});
