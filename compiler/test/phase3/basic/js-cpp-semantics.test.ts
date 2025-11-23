/**
 * Test that JavaScript and C++ behaviors match for array access
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

describe('Phase 3: JS/C++ Semantic Equivalence', () => {
  it('should document out-of-bounds array behavior', () => {
    const source = `
      const arr = [1, 2, 3];
      const outOfBounds = arr[10];
    `;
    
    const cpp = compileToCpp(source);
    
    // JavaScript: arr[10] returns undefined
    // C++ (our implementation): gs::array_get(arr, 10) returns T{} (default value)
    // For numbers: returns 0 (close to undefined behavior)
    // For booleans: returns false
    // For strings: returns ""
    
    expect(cpp).toContain('gs::array_get(arr, 10)');
    
    // Note: This is not a perfect match to JavaScript's undefined,
    // but it's:
    // 1. Safe (no segfault)
    // 2. Predictable (always returns default value)
    // 3. Better than throwing exception (which would crash the program)
  });

  it('should show that writes auto-resize to match JS', () => {
    const source = `
      const arr: number[] = [];
      arr[10] = 42;
    `;
    
    const cpp = compileToCpp(source);
    
    // JavaScript: arr[10] = 42 automatically resizes array to length 11
    // C++ (our implementation): uses IIFE with resize to match behavior
    
    expect(cpp).toContain('resize');
    expect(cpp).toMatch(/__idx >= __arr\.size.*resize/);
  });

  it('should demonstrate the semantic difference', () => {
    // In JavaScript:
    // const arr = [1, 2, 3];
    // arr[10]  // undefined
    // typeof arr[10]  // "undefined"
    
    // In our C++ (for number array):
    // std::vector<double> arr = {1, 2, 3};
    // gs::array_get(arr, 10)  // 0.0 (default double value)
    
    // This is NOT a perfect match, but it's the best we can do in C++
    // without changing the return type to optional<T> everywhere,
    // which would break type compatibility with JavaScript code.
    
    const cpp = compileToCpp(`
      const arr = [1, 2, 3];
      const x = arr[10];
    `);
    
    expect(cpp).toContain('gs::array_get');
    
    // The key difference:
    // - JS: arr[10] === undefined (true)
    // - C++: arr[10] == 0 (for numbers), false (for bool), "" (for string)
    //
    // But both are:
    // - Safe (no crash)
    // - Falsy in conditional checks
    // - Can be tested for validity
  });
});
