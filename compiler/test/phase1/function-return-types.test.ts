/**
 * Tests for GS118: Function return type consistency
 * All return statements in a function must return compatible types
 */

import { describe, it, expect } from 'vitest';
import { compileSource, hasError, getErrors } from './test-helpers';

describe('GS118: Function return type consistency', () => {
  it('should reject function with mixed string/number returns', () => {
    const source = `
      const getValue = (condition: boolean): string | number => {
        if (condition) {
          return "success";
        } else {
          return 42;
        }
      };
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS118')).toBe(true);
    const errors = getErrors(result.diagnostics, 'GS118');
    expect(errors[0].message).toContain('string');
    expect(errors[0].message).toContain('number');
  });

  it('should reject method with mixed return types', () => {
    const source = `
      class Processor {
        process(flag: boolean): string | number {
          if (flag) {
            return "done";
          }
          return 0;
        }
      }
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS118')).toBe(true);
  });

  it('should reject arrow function with mixed return types', () => {
    const source = `
      const convert = (x: number) => {
        if (x > 0) {
          return "positive";
        }
        return x;
      };
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS118')).toBe(true);
  });

  it('should accept function with consistent string returns', () => {
    const source = `
      const getValue = (condition: boolean): string => {
        if (condition) {
          return "success";
        } else {
          return "failure";
        }
      };
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS118')).toBe(false);
  });

  it('should accept function with consistent number returns', () => {
    const source = `
      const calculate = (x: number): number => {
        if (x > 0) {
          return x * 2;
        } else if (x < 0) {
          return x * -1;
        } else {
          return 0;
        }
      };
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS118')).toBe(false);
  });

  it('should accept function with nullable return (number | null)', () => {
    const source = `
      const findValue = (arr: number[], target: number): number | null => {
        for (let i = 0; i < arr.length; i++) {
          if (arr[i] === target) {
            return arr[i];
          }
        }
        return null;
      };
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS118')).toBe(false);
  });

  it('should accept function with undefined return', () => {
    const source = `
      const findFirst = (arr: string[]): string | undefined => {
        if (arr.length > 0) {
          return arr[0];
        }
        return undefined;
      };
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS118')).toBe(false);
  });

  it('should accept void function with no return values', () => {
    const source = `
      const log = (message: string): void => {
        if (message.length > 0) {
          console.log(message);
          return;
        }
        return;
      };
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS118')).toBe(false);
  });

  it('should accept function with single return statement', () => {
    const source = `
      const double = (x: number): number => {
        return x * 2;
      };
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS118')).toBe(false);
  });

  it('should not check nested functions separately', () => {
    const source = `
      const outer = (x: number): number => {
        const inner = (y: boolean): string | number => {
          if (y) {
            return "yes";
          }
          return 1;
        };
        return x * 2;
      };
    `;
    const result = compileSource(source);
    // Should reject inner function's mixed returns
    expect(hasError(result.diagnostics, 'GS118')).toBe(true);
  });

  it('should reject multiple incompatible returns in complex control flow', () => {
    const source = `
      const process = (x: number): string | number | boolean => {
        if (x > 10) {
          return "large";
        } else if (x > 5) {
          return 5;
        } else if (x > 0) {
          return true;
        }
        return "zero";
      };
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS118')).toBe(true);
  });

  it('should accept consistent returns with different literal values', () => {
    const source = `
      const getStatus = (code: number): string => {
        if (code === 200) {
          return "OK";
        } else if (code === 404) {
          return "Not Found";
        } else {
          return "Unknown";
        }
      };
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS118')).toBe(false);
  });

  it('should accept function returning objects of same type', () => {
    const source = `
      interface Result {
        value: number;
      }
      
      const getResult = (x: number): Result => {
        if (x > 0) {
          return { value: x };
        } else {
          return { value: 0 };
        }
      };
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS118')).toBe(false);
  });
});
