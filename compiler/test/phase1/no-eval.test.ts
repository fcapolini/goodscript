/**
 * Phase 1 Tests: No eval or Function constructor (GS102)
 * The eval function and Function constructor are forbidden
 */

import { describe, it, expect } from 'vitest';
import { compileSource, getErrors, hasError } from './test-helpers';

describe('Phase 1: No eval function', () => {
  it('should reject eval call', () => {
    const source = `
      const code = "2 + 2";
      const result = eval(code);
    `;
    const result = compileSource(source);
    
    const errors = getErrors(result.diagnostics, 'GS102');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('eval');
  });

  it('should accept regular function calls', () => {
    const source = `
      const parse = (str: string): number => parseInt(str, 10);
      const result = parse("42");
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS102')).toBe(false);
  });

  it('should accept Function constructor alternative patterns', () => {
    const source = `
      const operations = {
        add: (x: number, y: number) => x + y,
        multiply: (x: number, y: number) => x * y,
      };
      const result = operations.add(2, 2);
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS102')).toBe(false);
  });

  it('should reject eval in expression', () => {
    const source = `
      const x = 10;
      const y = eval("x + 5");
    `;
    const result = compileSource(source);
    
    const errors = getErrors(result.diagnostics, 'GS102');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject Function constructor', () => {
    const source = `
      const fn = new Function('x', 'y', 'return x + y');
      const result = fn(1, 2);
    `;
    const result = compileSource(source);
    
    const errors = getErrors(result.diagnostics, 'GS102');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('Function');
  });

  it('should reject Function constructor without new', () => {
    const source = `
      const fn = Function('x', 'y', 'return x + y');
      const result = fn(1, 2);
    `;
    const result = compileSource(source);
    
    const errors = getErrors(result.diagnostics, 'GS102');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject Function constructor with single body parameter', () => {
    const source = `
      const fn = new Function('return 42');
      const result = fn();
    `;
    const result = compileSource(source);
    
    const errors = getErrors(result.diagnostics, 'GS102');
    expect(errors.length).toBeGreaterThan(0);
  });
});
