/**
 * Test const reference parameter passing
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

describe('Phase 3: Parameter Passing', () => {
  it('should pass string by const reference', () => {
    const source = `
      class Processor {
        processMessage(message: string): void {
          console.log(message);
        }
      }
    `;
    const cpp = compileToCpp(source);
    
    // String should be passed by const reference
    expect(cpp).toContain('void processMessage(const gs::String& message)');
  });

  it('should pass primitives by value', () => {
    const source = `
      class Calculator {
        add(x: number, y: number): number {
          return x + y;
        }
        
        isValid(flag: boolean): boolean {
          return flag;
        }
      }
    `;
    const cpp = compileToCpp(source);
    
    // Primitives should be passed by value (no const&)
    expect(cpp).toContain('double add(double x, double y)');
    expect(cpp).toContain('bool isValid(bool flag)');
  });

  it('should pass class types by const reference', () => {
    const source = `
      class Point {
        x: number;
        y: number;
      }
      
      class Renderer {
        draw(point: Point): void {
          console.log(point.x);
        }
      }
    `;
    const cpp = compileToCpp(source);
    
    // User-defined classes should be passed by const reference
    expect(cpp).toContain('void draw(const gs::Point& point)');
  });

  it('should pass arrays by const reference', () => {
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
    
    // Arrays should be passed by const reference
    expect(cpp).toContain('double sum(const gs::Array<double>& numbers)');
  });

  it('should pass maps by const reference', () => {
    const source = `
      class Cache {
        lookup(data: Map<string, number>): number {
          const val = data.get("key");
          if (val !== undefined) {
            return val;
          }
          return 0;
        }
      }
    `;
    const cpp = compileToCpp(source);
    
    // Maps should be passed by const reference
    expect(cpp).toContain('double lookup(const gs::Map<gs::String, double>& data)');
  });
});
