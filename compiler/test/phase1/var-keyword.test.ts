/**
 * Phase 1 Tests: No var keyword (GS105)
 * Must use let or const instead
 */

import { describe, it, expect } from 'vitest';
import { compileSource, getErrors, hasError } from './test-helpers';

describe('Phase 1: No var keyword', () => {
  it('should reject var keyword', () => {
    const source = `
      var x = 42;
    `;
    const result = compileSource(source);
    
    expect(result.success).toBe(false);
    const errors = getErrors(result.diagnostics, 'GS105');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('var');
  });

  it('should accept const keyword', () => {
    const source = `
      const x = 42;
      console.log(x);
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS105')).toBe(false);
  });

  it('should accept let keyword', () => {
    const source = `
      let x = 42;
      x = 43;
      console.log(x);
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS105')).toBe(false);
  });

  it('should reject multiple var declarations', () => {
    const source = `
      var x = 1;
      var y = 2;
      var z = 3;
    `;
    const result = compileSource(source);
    
    const errors = getErrors(result.diagnostics, 'GS105');
    expect(errors.length).toBe(3);
  });

  it('should accept mixed const and let', () => {
    const source = `
      const x = 42;
      let y = 10;
      y = 20;
      console.log(x, y);
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS105')).toBe(false);
  });
});
