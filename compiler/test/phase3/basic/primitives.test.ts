/**
 * Phase 3 Tests: Primitive Types and Basic Operations
 * 
 * Tests C++ code generation for primitive types, variables, and simple expressions.
 */

import { describe, it, expect } from 'vitest';
import { CppCodegen } from '../../../src/cpp-codegen';
import { AstCodegen } from '../../../src/cpp/codegen';
import ts from 'typescript';

// Toggle between legacy and AST-based codegen
const USE_AST_CODEGEN = true;

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
  
  if (USE_AST_CODEGEN) {
    const codegen = new AstCodegen();
    return codegen.generate(sourceFile);
  } else {
    const codegen = new CppCodegen();
    return codegen.generate(sourceFile);
  }
}

describe('Phase 3: Primitive Types', () => {
  it('should generate number variable', () => {
    const cpp = compileToCpp(`const x: number = 42;`);
    
    expect(cpp).toContain('namespace gs {');
    expect(cpp).toContain('const double x = 42;');
    expect(cpp).toContain('} // namespace gs');
  });
  
  it('should generate string variable', () => {
    const cpp = compileToCpp(`const name: string = "Alice";`);
    
    expect(cpp).toContain('const gs::String name = gs::String("Alice")');
  });
  
  it('should generate boolean variable', () => {
    const cpp = compileToCpp(`const flag: boolean = true;`);
    
    expect(cpp).toContain('const bool flag = true;');
  });
  
  it('should include standard headers', () => {
    const cpp = compileToCpp(`const x: number = 1;`);
    
    // Runtime library provides all necessary headers
    expect(cpp).toContain('#include "gs_runtime.hpp"');
  });
  
  it('should escape C++ keywords', () => {
    const cpp = compileToCpp(`
      interface Config {
        class: string;
      }
    `);
    
    expect(cpp).toContain('class_');
  });
});

describe('Phase 3: Basic Expressions', () => {
  it('should generate arithmetic operations', () => {
    const cpp = compileToCpp(`const result: number = 1 + 2 * 3;`);
    
    expect(cpp).toContain('const double result = 1 + 2 * 3;');
  });
  
  it('should convert === to ==', () => {
    const source = `
      function test(x: number): boolean {
        return x === 5;
      }
    `;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('x == 5');
    expect(cpp).not.toContain('===');
  });
  
  it('should convert !== to !=', () => {
    const source = `
      function test(x: number): boolean {
        return x !== 5;
      }
    `;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('x != 5');
    expect(cpp).not.toContain('!==');
  });
  
  it('should generate comparison operations', () => {
    const source = `
      function test(x: number, y: number): boolean {
        return x < y;
      }
    `;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('x < y');
  });
});

describe('Phase 3: Functions', () => {
  it('should generate simple function', () => {
    const source = `
      function add(a: number, b: number): number {
        return a + b;
      }
    `;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('double add(double a, double b) {');
    expect(cpp).toContain('return a + b;');
  });
  
  it('should generate void function', () => {
    const source = `
      function greet(): void {
        console.log("Hello");
      }
    `;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('void greet() {');
  });
  
  it('should handle methods with normal names', () => {
    const source = `
      class Util {
        remove(): void {
        }
      }
    `;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('void remove() const {');
  });
});

describe('Phase 3: Control Flow', () => {
  it('should generate if statement', () => {
    const source = `
      function test(x: number): string {
        if (x > 0) {
          return "positive";
        } else {
          return "non-positive";
        }
      }
    `;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('if (x > 0) {');
    expect(cpp).toContain('} else {');
  });
  
  it('should generate for loop', () => {
    const source = `
      function sum(n: number): number {
        let total: number = 0;
        for (let i: number = 0; i < n; i++) {
          total = total + i;
        }
        return total;
      }
    `;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('for (int i = 0; i < n; i++) {');
  });
  
  it('should generate while loop', () => {
    const source = `
      function countdown(n: number): void {
        while (n > 0) {
          n = n - 1;
        }
      }
    `;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('while (n > 0) {');
  });
});

describe('Phase 3: Arrays', () => {
  it('should generate array type', () => {
    const source = `const numbers: number[] = [1, 2, 3];`;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('gs::Array<double>');
  });
  
  it('should generate array literal', () => {
    const source = `const numbers: number[] = [1, 2, 3];`;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('{1, 2, 3}');
  });
  
  it('should generate for-of loop', () => {
    const source = `
      function sum(numbers: number[]): number {
        let total: number = 0;
        for (const num of numbers) {
          total = total + num;
        }
        return total;
      }
    `;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('for (const auto& num : numbers) {');
  });
});
