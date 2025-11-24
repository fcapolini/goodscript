/**
 * Test that JavaScript and C++ behaviors match for various language features
 * including array access and object member access
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
    // C++ (our implementation): arr[10] has undefined behavior (like std::vector)
    // This is a known limitation - future versions may add bounds checking
    
    expect(cpp).toContain('arr[10]');
    
    // Note: This is NOT a perfect match to JavaScript's undefined.
    // In C++, out-of-bounds access causes undefined behavior.
    // GoodScript prioritizes performance over runtime safety for array access.
  });

  it('should handle array writes', () => {
    const source = `
      const arr: number[] = [];
      arr[10] = 42;
    `;
    
    const cpp = compileToCpp(source);
    
    // JavaScript: arr[10] = 42 automatically resizes array to length 11
    // C++ (our implementation): uses IIFE with resize to match behavior
    // Note: Uses __idx = 10 and __arr[__idx] pattern
    
    expect(cpp).toContain('__idx = 10');
    expect(cpp).toContain('42');
    expect(cpp).toContain('resize');
  });

  it('should demonstrate the semantic difference', () => {
    // In JavaScript:
    // const arr = [1, 2, 3];
    // arr[10]  // undefined
    // typeof arr[10]  // "undefined"
    
    // In our C++ (for number array):
    // gs::Array<double> arr = {1, 2, 3};
    // arr[10]  // undefined behavior (out of bounds)
    
    // This is NOT a perfect match - C++ has undefined behavior for
    // out-of-bounds access while JS returns undefined.
    
    const cpp = compileToCpp(`
      const arr = [1, 2, 3];
      const x = arr[10];
    `);
    
    expect(cpp).toContain('arr[10]');
    
    // The key difference:
    // - JS: arr[10] === undefined (safe, returns undefined)
    // - C++: arr[10] has undefined behavior (may crash or return garbage)
    //
    // GoodScript prioritizes C++ performance over runtime safety.
  });

  it('should document optional object member behavior', () => {
    const source = `
      function maybeValue(): number | null {
        return null;
      }
      
      const x = maybeValue();
    `;
    
    const cpp = compileToCpp(source);
    
    // JavaScript: maybeValue() can return number or null
    // C++ (our implementation): returns std::optional<double>
    //   - x is std::optional<double>
    //   - Need to use x.value_or(default) or check x.has_value()
    
    expect(cpp).toContain('std::optional<double>');
    
    // Note: The semantics are similar but not identical:
    // - JS: null or undefined (special values)
    // - C++: std::nullopt (empty optional)
    // Both indicate "no value present"
    //
    // TODO: Once optional class fields are supported (age?: number),
    // they will also map to std::optional<T> fields
  });

  it('should show that required fields must be initialized', () => {
    const source = `
      class Config {
        host: string;
        port: number;
      }
    `;
    
    const cpp = compileToCpp(source);
    
    // JavaScript: All fields must be present for non-optional members
    // C++ (our implementation): Same - required fields are non-optional types
    //   - host is gs::String (must be initialized)
    //   - port is double (must be initialized)
    
    expect(cpp).toContain('gs::String host');
    expect(cpp).toContain('double port');
    
    // Note: The generated code includes gs_runtime.hpp for helper classes,
    // but the class fields themselves are not optional types
  });

  it('should demonstrate optional vs required field access', () => {
    // In JavaScript:
    // const obj = { required: 42 };
    // obj.required  // 42
    // obj.optional  // undefined (if not present)
    
    // In our C++ (with optional field):
    // struct Obj {
    //   double required;
    //   std::optional<double> optional;
    // };
    // obj.required  // 42.0
    // obj.optional  // std::nullopt (if not set)
    // obj.optional.value_or(0)  // 0.0 (safe access with default)
    
    const cpp = compileToCpp(`
      class Data {
        id: number;
        name?: string;
      }
      
      const d: Data = { id: 1 };
      const hasName = d.name !== undefined;
    `);
    
    expect(cpp).toContain('double id');
    expect(cpp).toContain('std::optional');
    
    // Key semantic correspondence:
    // - JS required field: always present, direct access
    // - C++ required field: always initialized, direct access
    // - JS optional field: may be undefined, needs checking
    // - C++ optional field: may be nullopt, needs has_value() or value_or()
  });

  it('should document numeric type behavior', () => {
    const source = `
      const x: number = 42;
      const y: number = 3.14;
    `;
    
    const cpp = compileToCpp(source);
    
    // JavaScript: number is always IEEE 754 double precision (64-bit float)
    // C++ (our implementation): number maps to double (also 64-bit float)
    
    expect(cpp).toContain('double x = 42');
    expect(cpp).toContain('double y = 3.14');
    
    // Note: Both languages:
    // - Use same underlying representation (IEEE 754)
    // - Have same precision and range
    // - Support integers up to 2^53 - 1 without precision loss
    // - Integer division like 5/2 returns 2.5 (not 2)
  });

  it('should document integer division semantics', () => {
    const source = `
      const result = 5 / 2;
    `;
    
    const cpp = compileToCpp(source);
    
    // JavaScript: 5 / 2 === 2.5 (floating point division)
    // C++ with double: 5.0 / 2.0 === 2.5 (same!)
    
    expect(cpp).toContain('double');
    
    // Key point: Because we map number to double (not int),
    // division semantics match JavaScript exactly.
    // If we used int, 5/2 would be 2 (truncated), not 2.5.
  });

  it('should document string concatenation behavior', () => {
    const source = `
      const greeting = "Hello, " + "World";
      const dynamic = "Count: " + 42;
    `;
    
    const cpp = compileToCpp(source);
    
    // JavaScript: + operator with strings always concatenates
    // C++ (our implementation): gs::String + works similarly
    
    expect(cpp).toContain('gs::String');
    
    // Note: In GoodScript, we prohibit implicit type coercion (GS201)
    // so "Count: " + 42 is rejected unless you use template literals
    // or explicit toString(). This test documents the *intended* behavior
    // once explicit conversion is added.
  });

  it('should document equality operator mapping', () => {
    const source = `
      function test(x: number, y: number): boolean {
        return x === y;
      }
    `;
    
    const cpp = compileToCpp(source);
    
    // JavaScript/GoodScript: === is strict equality (no type coercion)
    // C++ (our implementation): === maps to ==
    
    expect(cpp).toContain('x == y');
    expect(cpp).not.toContain('===');
    
    // Semantic equivalence is preserved because:
    // - GoodScript prohibits == (only === allowed)
    // - GoodScript prohibits type coercion
    // - C++ == with same types is equivalent to JS ===
  });

  it('should document boolean semantics', () => {
    const source = `
      const flag: boolean = true;
      const check = flag === true;
    `;
    
    const cpp = compileToCpp(source);
    
    // JavaScript: boolean is true or false
    // C++ (our implementation): bool is true or false
    
    expect(cpp).toContain('bool flag = true');
    
    // Note: GoodScript prohibits truthy/falsy coercion (GS110),
    // so conditions must be explicit boolean expressions.
    // This makes JS and C++ behavior identical:
    // - JS: if (x > 0) checks the boolean result of x > 0
    // - C++: if (x > 0) checks the boolean result of x > 0
    // No implicit conversions in either!
  });

  it('should document null/undefined handling', () => {
    const source = `
      function maybeValue(): number | null {
        return null;
      }
      
      const x = maybeValue();
      const safe = x !== null ? x : 0;
    `;
    
    const cpp = compileToCpp(source);
    
    // JavaScript: null and undefined are distinct values
    // C++ (our implementation): uses std::optional<T>
    //   - std::nullopt represents "no value"
    //   - Combines both null and undefined into one concept
    
    expect(cpp).toContain('std::optional');
    
    // Key differences:
    // - JS: x === null, x === undefined (two checks needed)
    // - C++: !x.has_value() or x == std::nullopt (one check)
    // 
    // But functionally equivalent for safety:
    // - Both prevent access to non-existent values
    // - Both require explicit checking
    // - Both provide safe default values (.value_or() vs ?? operator)
  });

  it('should document array bounds behavior difference', () => {
    const source = `
      const arr = [1, 2, 3];
      const inBounds = arr[1];
      const outOfBounds = arr[10];
    `;
    
    const cpp = compileToCpp(source);
    
    // This is the ONE semantic difference we document:
    // JavaScript: arr[10] returns undefined
    // C++ (our implementation): undefined behavior (like std::vector)
    
    expect(cpp).toContain('arr[1]');
    expect(cpp).toContain('arr[10]');
    
    // WHY this is acceptable:
    // 1. GoodScript prioritizes C++ performance
    // 2. Bounds checking would require overhead on every access
    // 3. For proper bounds checking, use arr.length explicitly
    // 4. This matches standard C++ std::vector behavior
    //
    // Alternative would be bounds checking or optional<T>, but:
    // - Bounds checking: runtime overhead on every access
    // - optional<T>: would break type compatibility (arr[i] would be 
    //   optional<number> instead of number, requiring .value() everywhere)
  });
});
