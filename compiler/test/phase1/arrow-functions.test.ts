/**
 * Phase 1 Tests: Arrow functions only (GS108)
 * No function declarations or expressions (except class methods)
 */

import { describe, it, expect } from 'vitest';
import { compileSource, getErrors, hasError } from './test-helpers';

describe('Phase 1: Arrow functions only', () => {
  it('should reject function declaration', () => {
    const source = `
      function greet(name: string): void {
        console.log("Hello " + name);
      }
    `;
    const result = compileSource(source);
    
    const errors = getErrors(result.diagnostics, 'GS108');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('arrow function');
  });

  it('should reject function expression', () => {
    const source = `
      const greet = function(name: string): void {
        console.log("Hello " + name);
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
    
    const errors = getErrors(result.diagnostics, 'GS108');
    expect(errors.length).toBe(2);
  });

  it('should reject nested function declaration', () => {
    const source = `
      const outer = () => {
        function inner(x: number): number {
          return x * 2;
        }
        return inner(5);
      };
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS108')).toBe(true);
  });

  it('should reject nested function expression', () => {
    const source = `
      const outer = () => {
        const inner = function(x: number): number {
          return x * 2;
        };
        return inner(5);
      };
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS108')).toBe(true);
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

  it('should reject function declaration nested in class method', () => {
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
    
    expect(hasError(result.diagnostics, 'GS108')).toBe(true);
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
});
