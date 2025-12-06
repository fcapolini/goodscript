/**
 * Phase 3 Tests: Method-level generics
 * 
 * Tests C++ code generation for methods with type parameters.
 */

import { describe, it, expect } from 'vitest';
import { AstCodegen } from '../../../src/cpp/codegen';
import ts from 'typescript';

function compileToCpp(source: string): string {
  const sourceFile = ts.createSourceFile(
    'test.ts',
    source,
    ts.ScriptTarget.ES2020,
    true
  );
  
  const codegen = new AstCodegen();
  return codegen.generate(sourceFile);
}

describe('Phase 3: Method-level generics', () => {
  it('should support generic method with single type parameter', () => {
    const code = `
      class Container<T> {
        private items: T[];
        
        constructor() {
          this.items = [];
        }
        
        add(item: T): void {
          this.items.push(item);
        }
        
        map<U>(fn: (item: T) => U): U[] {
          const result: U[] = [];
          for (const item of this.items) {
            result.push(fn(item));
          }
          return result;
        }
      }
      
      const nums = new Container<number>();
      nums.add(1);
      nums.add(2);
      nums.add(3);
      const strings = nums.map((n) => n.toString());
    `;
    
    const cpp = compileToCpp(code);
    expect(cpp).toContain('template<typename U>');
    expect(cpp).toContain('map(');
  });

  it('should support generic method with multiple type parameters', () => {
    const code = `
      class Pair<T> {
        first: T;
        second: T;
        
        constructor(first: T, second: T) {
          this.first = first;
          this.second = second;
        }
        
        mapBoth<U, V>(f1: (item: T) => U, f2: (item: T) => V): [U, V] {
          return [f1(this.first), f2(this.second)];
        }
      }
    `;
    
    const cpp = compileToCpp(code);
    expect(cpp).toContain('template<typename U, typename V>');
  });

  it('should support generic method in non-generic class', () => {
    const code = `
      class Utils {
        static identity<T>(value: T): T {
          return value;
        }
        
        nonStatic<T>(value: T): T {
          return value;
        }
      }
    `;
    
    const cpp = compileToCpp(code);
    expect(cpp).toContain('template<typename T>');
  });

  it('should handle generic method return type correctly', () => {
    const code = `
      class Box<T> {
        private value: T;
        
        constructor(value: T) {
          this.value = value;
        }
        
        transform<U>(fn: (val: T) => U): Box<U> {
          return new Box(fn(this.value));
        }
      }
    `;
    
    const cpp = compileToCpp(code);
    expect(cpp).toContain('template<typename U>');
    expect(cpp).toContain('Box<U>');
  });
});
