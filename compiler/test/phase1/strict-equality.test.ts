/**
 * Phase 1 Tests: Strict equality operators (GS106, GS107)
 * Must use === and !== instead of == and !=
 */

import { describe, it, expect } from 'vitest';
import { compileSource, getErrors, hasError } from './test-helpers';

describe('Phase 1: Strict equality operators', () => {
  it('should reject == operator', () => {
    const source = `
      const x = 42;
      if (x == 42) {
        console.log("equal");
      }
    `;
    const result = compileSource(source);
    
    const errors = getErrors(result.diagnostics, 'GS106');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('===');
  });

  it('should reject != operator', () => {
    const source = `
      const x = 42;
      if (x != 0) {
        console.log("not equal");
      }
    `;
    const result = compileSource(source);
    
    const errors = getErrors(result.diagnostics, 'GS107');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('!==');
  });

  it('should accept === operator', () => {
    const source = `
      const x = 42;
      if (x === 42) {
        console.log("equal");
      }
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS106')).toBe(false);
  });

  it('should accept !== operator', () => {
    const source = `
      const x = 42;
      if (x !== 0) {
        console.log("not equal");
      }
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS107')).toBe(false);
  });

  it('should reject multiple == and != operators', () => {
    const source = `
      const x = 42;
      const y = 10;
      if (x == 42 && y != 0) {
        console.log("test");
      }
    `;
    const result = compileSource(source);
    
    const gs106Errors = getErrors(result.diagnostics, 'GS106');
    const gs107Errors = getErrors(result.diagnostics, 'GS107');
    expect(gs106Errors.length).toBe(1);
    expect(gs107Errors.length).toBe(1);
  });

  it('should accept null checks with strict equality', () => {
    const source = `
      const x: string | null = null;
      if (x !== null) {
        console.log(x);
      }
      if (x === null) {
        console.log("null");
      }
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS106')).toBe(false);
    expect(hasError(result.diagnostics, 'GS107')).toBe(false);
  });

  it('should accept undefined checks with strict equality', () => {
    const source = `
      const x: string | undefined = undefined;
      if (x !== undefined) {
        console.log(x);
      }
      if (x === undefined) {
        console.log("undefined");
      }
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS106')).toBe(false);
    expect(hasError(result.diagnostics, 'GS107')).toBe(false);
  });

  it('should accept null === undefined (they are synonyms in GoodScript)', () => {
    const source = `
      const isEqual = null === undefined;
      const isNotEqual = null !== undefined;
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS106')).toBe(false);
    expect(hasError(result.diagnostics, 'GS107')).toBe(false);
  });

  it('should accept checking null against undefined in conditionals', () => {
    const source = `
      const x: string | null = null;
      const y: string | undefined = undefined;
      if (x === undefined) {
        console.log("x is nullish");
      }
      if (y === null) {
        console.log("y is nullish");
      }
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS106')).toBe(false);
    expect(hasError(result.diagnostics, 'GS107')).toBe(false);
  });
});
