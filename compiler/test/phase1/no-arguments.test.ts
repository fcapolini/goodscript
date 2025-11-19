/**
 * Phase 1 Tests: No arguments object (GS103)
 * Must use rest parameters instead
 */

import { describe, it, expect } from 'vitest';
import { compileSource, getErrors, hasError } from './test-helpers';

describe('Phase 1: No arguments object', () => {
  it('should reject arguments object in class method', () => {
    const source = `
      class Logger {
        log(): void {
          for (let i = 0; i < arguments.length; i++) {
            console.log(arguments[i]);
          }
        }
      }
    `;
    const result = compileSource(source);
    
    const errors = getErrors(result.diagnostics, 'GS103');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('rest parameters');
  });

  it('should accept rest parameters in arrow function', () => {
    const source = `
      const sum = (...numbers: number[]): number => {
        return numbers.reduce((a, b) => a + b, 0);
      };
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS103')).toBe(false);
  });

  it('should accept rest parameters in class method', () => {
    const source = `
      class Logger {
        log(...messages: string[]): void {
          for (const msg of messages) {
            console.log(msg);
          }
        }
      }
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS103')).toBe(false);
  });

  it('should accept named array parameter', () => {
    const source = `
      const processItems = (items: string[]): void => {
        for (const item of items) {
          console.log(item);
        }
      };
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS103')).toBe(false);
  });

  it('should accept rest parameters with other parameters', () => {
    const source = `
      const format = (prefix: string, ...values: number[]): string => {
        return prefix + values.join(", ");
      };
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS103')).toBe(false);
  });
});
