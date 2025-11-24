/**
 * Test readonly array parameters
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

describe('Phase 3: Readonly Arrays', () => {
  it('should pass readonly arrays by const reference', () => {
    const source = `
      class Processor {
        sum(numbers: readonly number[]): number {
          let total = 0;
          for (const n of numbers) {
            total = total + n;
          }
          return total;
        }
      }
    `;
    const cpp = compileToCpp(source);
    
    // Readonly arrays should be passed by const reference
    expect(cpp).toContain('double sum(const gs::Array<double>& numbers)');
  });

  it('should pass mutable arrays by mutable reference', () => {
    const source = `
      class Processor {
        sum(numbers: number[]): number {
          let total = 0;
          for (const n of numbers) {
            total = total + n;
          }
          return total;
        }
      }
    `;
    const cpp = compileToCpp(source);
    
    // Mutable arrays should be passed by mutable reference
    expect(cpp).toContain('double sum(gs::Array<double>& numbers)');
  });

  it('should handle mixed readonly and mutable parameters', () => {
    const source = `
      class Calculator {
        compute(input: readonly number[], output: number[]): void {
          for (const n of input) {
            output.push(n * 2);
          }
        }
      }
    `;
    const cpp = compileToCpp(source);
    
    // First param readonly (const ref), second param mutable (mutable ref)
    expect(cpp).toContain('void compute(const gs::Array<double>& input, gs::Array<double>& output)');
  });

  it('should handle readonly arrays in standalone functions', () => {
    const source = `
      function average(values: readonly number[]): number {
        let sum = 0;
        for (const v of values) {
          sum = sum + v;
        }
        return sum / values.length;
      }
    `;
    const cpp = compileToCpp(source);
    
    // Function should have const ref parameter
    expect(cpp).toContain('double average(const gs::Array<double>& values)');
  });
});
