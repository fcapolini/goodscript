/**
 * Phase 1 Tests: No for-in loops (GS104)
 * Use for-of or explicit iteration instead
 */

import { describe, it, expect } from 'vitest';
import { compileSource, getErrors, hasError } from './test-helpers';

describe('Phase 1: No for-in loops', () => {
  it('should reject for-in loop', () => {
    const source = `
      const obj = { a: 1, b: 2, c: 3 };
      for (const key in obj) {
        console.log(obj[key]);
      }
    `;
    const result = compileSource(source);
    
    const errors = getErrors(result.diagnostics, 'GS104');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('for-of');
  });

  it('should accept for-of loop with array', () => {
    const source = `
      const arr = [1, 2, 3];
      for (const item of arr) {
        console.log(item);
      }
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS104')).toBe(false);
  });

  it('should accept for-of with Object.keys()', () => {
    const source = `
      const obj = { a: 1, b: 2, c: 3 };
      for (const key of Object.keys(obj)) {
        console.log(obj[key]);
      }
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS104')).toBe(false);
  });

  it('should accept for-of with Object.entries()', () => {
    const source = `
      const obj = { a: 1, b: 2, c: 3 };
      for (const [key, value] of Object.entries(obj)) {
        console.log(key, value);
      }
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS104')).toBe(false);
  });

  it('should accept for-of with Object.values()', () => {
    const source = `
      const obj = { a: 1, b: 2, c: 3 };
      for (const value of Object.values(obj)) {
        console.log(value);
      }
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS104')).toBe(false);
  });

  it('should accept traditional for loop', () => {
    const source = `
      const arr = [1, 2, 3];
      for (let i = 0; i < arr.length; i++) {
        console.log(arr[i]);
      }
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS104')).toBe(false);
  });

  it('should accept forEach method', () => {
    const source = `
      const arr = [1, 2, 3];
      arr.forEach((item) => console.log(item));
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS104')).toBe(false);
  });

  it('should reject nested for-in loops', () => {
    const source = `
      const obj1 = { a: 1 };
      const obj2 = { b: 2 };
      for (const k1 in obj1) {
        for (const k2 in obj2) {
          console.log(k1, k2);
        }
      }
    `;
    const result = compileSource(source);
    
    const errors = getErrors(result.diagnostics, 'GS104');
    expect(errors.length).toBe(2);
  });
});
