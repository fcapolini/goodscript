/**
 * Phase 3 Tests: Classes and Interfaces
 * 
 * Tests C++ code generation for classes, constructors, methods, and interfaces.
 */

import { describe, it, expect } from 'vitest';
import { CppCodegen } from '../../../src/cpp-codegen';
import { AstCodegen } from '../../../src/cpp/codegen';
import ts from 'typescript';

const USE_AST_CODEGEN = true;

function compileToCpp(source: string): string {
  const sourceFile = ts.createSourceFile(
    'test.ts',
    source,
    ts.ScriptTarget.ES2020,
    true
  );
  
  const codegen = USE_AST_CODEGEN ? new AstCodegen() : new CppCodegen();
  return codegen.generate(sourceFile);
}

describe('Phase 3: Classes', () => {
  it('should generate simple class', () => {
    const source = `
      class Point {
        x: number;
        y: number;
      }
    `;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('class Point {');
    expect(cpp).toContain('public:');
    expect(cpp).toContain('double x;');
    expect(cpp).toContain('double y;');
    expect(cpp).toContain('};');
  });
  
  it('should generate class with constructor', () => {
    const source = `
      class Point {
        x: number;
        y: number;
        
        constructor(x: number, y: number) {
          this.x = x;
          this.y = y;
        }
      }
    `;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('class Point {');
    expect(cpp).toContain('Point(double x, double y) : x(x), y(y) {');
    // Field initialization should be in initializer list, not body
    expect(cpp).not.toContain('this->x = x;');
    expect(cpp).not.toContain('this->y = y;');
  });
  
  it('should generate class with methods', () => {
    const source = `
      class Counter {
        count: number;
        
        increment(): void {
          this.count = this.count + 1;
        }
        
        getValue(): number {
          return this.count;
        }
      }
    `;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('void increment() {');
    expect(cpp).toContain('double getValue() {');
  });
  
  it('should escape class names that are keywords', () => {
    const source = `
      class namespace {
        value: number;
      }
    `;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('class namespace_ {');
  });
  
  it('should escape field names that are keywords', () => {
    const source = `
      class Data {
        template: string;
      }
    `;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('gs::String template_;');
  });
});

describe('Phase 3: Interfaces', () => {
  it('should generate struct for interface', () => {
    const source = `
      interface Point {
        x: number;
        y: number;
      }
    `;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('struct Point {');
    expect(cpp).toContain('double x;');
    expect(cpp).toContain('double y;');
    expect(cpp).toContain('};');
  });
  
  it('should handle interface with various types', () => {
    const source = `
      interface User {
        id: number;
        name: string;
        active: boolean;
      }
    `;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('double id;');
    expect(cpp).toContain('gs::String name;');
    expect(cpp).toContain('bool active;');
  });
});
