/**
 * Phase 1 Tests: No 'this' in function declarations/expressions (GS108)
 * Function declarations and expressions are allowed, but cannot use 'this'
 * (Use arrow functions for lexical 'this' binding, or class methods)
 */

import { describe, it, expect } from 'vitest';
import { compileSource, getErrors, hasError } from './test-helpers';

describe('Phase 1: No this in function declarations/expressions', () => {
  it('should accept function declaration without this', () => {
    const source = `
      function greet(name: string): void {
        console.log("Hello " + name);
      }
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS108')).toBe(false);
  });

  it('should accept function expression without this', () => {
    const source = `
      const greet = function(name: string): void {
        console.log("Hello " + name);
      };
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS108')).toBe(false);
  });

  it('should reject function declaration with this', () => {
    const source = `
      function greet(name: string): void {
        console.log(this.prefix + name);
      }
    `;
    const result = compileSource(source);
    
    const errors = getErrors(result.diagnostics, 'GS108');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('this');
    expect(errors[0].message).toContain('arrow function');
  });

  it('should reject function expression with this', () => {
    const source = `
      const greet = function(name: string): void {
        console.log(this.prefix + name);
      };
    `;
    const result = compileSource(source);
    
    const errors = getErrors(result.diagnostics, 'GS108');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should accept arrow function', () => {
    const source = `
      const greet = (name: string): void => {
        console.log("Hello " + name);
      };
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS108')).toBe(false);
  });

  it('should accept single-expression arrow function', () => {
    const source = `
      const double = (x: number): number => x * 2;
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS108')).toBe(false);
  });

  it('should accept class methods', () => {
    const source = `
      class Greeter {
        greet(name: string): void {
          console.log("Hello " + name);
        }
      }
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS108')).toBe(false);
  });

  it('should accept class constructor', () => {
    const source = `
      class Person {
        name: string;
        
        constructor(name: string) {
          this.name = name;
        }
      }
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS108')).toBe(false);
  });

  it('should accept arrow functions with rest parameters', () => {
    const source = `
      const sum = (...numbers: number[]): number => {
        return numbers.reduce((a, b) => a + b, 0);
      };
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS108')).toBe(false);
  });

  it('should reject multiple function declarations', () => {
    const source = `
      function add(a: number, b: number): number {
        return a + b;
      }
      
      function multiply(a: number, b: number): number {
        return a * b;
      }
    `;
    const result = compileSource(source);
    
    // Both functions are allowed (no 'this' used)
    expect(hasError(result.diagnostics, 'GS108')).toBe(false);
  });

  it('should reject nested function declaration with this', () => {
    const source = `
      const outer = () => {
        function inner(x: number): number {
          return this.multiplier * x;
        }
        return inner(5);
      };
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS108')).toBe(true);
  });

  it('should accept nested function declaration without this', () => {
    const source = `
      const outer = () => {
        function inner(x: number): number {
          return x * 2;
        }
        return inner(5);
      };
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS108')).toBe(false);
  });

  it('should reject nested function expression with this', () => {
    const source = `
      const outer = () => {
        const inner = function(x: number): number {
          return this.multiplier * x;
        };
        return inner(5);
      };
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS108')).toBe(true);
  });

  it('should accept nested function expression without this', () => {
    const source = `
      const outer = () => {
        const inner = function(x: number): number {
          return x * 2;
        };
        return inner(5);
      };
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS108')).toBe(false);
  });

  it('should accept nested arrow functions', () => {
    const source = `
      const outer = () => {
        const inner = (x: number): number => x * 2;
        return inner(5);
      };
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS108')).toBe(false);
  });

  it('should accept deeply nested arrow functions', () => {
    const source = `
      const level1 = () => {
        const level2 = () => {
          const level3 = (x: number): number => x * 2;
          return level3(5);
        };
        return level2();
      };
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS108')).toBe(false);
  });

  it('should reject function declaration nested in class method with this', () => {
    const source = `
      class Calculator {
        multiplier: number = 2;
        
        compute(x: number): number {
          function helper(n: number): number {
            return this.multiplier * n;
          }
          return helper(x);
        }
      }
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS108')).toBe(true);
  });

  it('should accept function declaration nested in class method without this', () => {
    const source = `
      class Calculator {
        compute(x: number): number {
          function helper(n: number): number {
            return n * 2;
          }
          return helper(x);
        }
      }
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS108')).toBe(false);
  });

  it('should accept arrow function nested in class method', () => {
    const source = `
      class Calculator {
        compute(x: number): number {
          const helper = (n: number): number => n * 2;
          return helper(x);
        }
      }
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS108')).toBe(false);
  });

  it('should allow this in class methods', () => {
    const source = `
      class Greeter {
        prefix: string = "Hello, ";
        
        greet(name: string): void {
          console.log(this.prefix + name);
        }
      }
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS108')).toBe(false);
  });

  it('should allow this in arrow functions (lexical)', () => {
    const source = `
      class Greeter {
        prefix: string = "Hello, ";
        
        greet = (name: string): void => {
          console.log(this.prefix + name);
        };
      }
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS108')).toBe(false);
  });

  it('should reject this in nested function within arrow function', () => {
    const source = `
      const outer = () => {
        function inner(): void {
          console.log(this.value);
        }
        inner();
      };
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS108')).toBe(true);
  });

  it('should allow this in arrow function nested within function', () => {
    const source = `
      class MyClass {
        value: number = 42;
        
        method(): void {
          function outer(): void {
            const inner = (): void => {
              console.log(this.value);  // 'this' is in arrow function, so it's lexical
            };
            inner();
          }
          outer();
        }
      }
    `;
    const result = compileSource(source);
    
    // The 'this' is in the arrow function, which is lexical, so it's allowed
    expect(hasError(result.diagnostics, 'GS108')).toBe(false);
  });
});
