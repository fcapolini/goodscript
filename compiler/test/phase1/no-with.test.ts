/**
 * Phase 1 Tests: No with statement (GS101)
 * The with statement is forbidden
 */

import { describe, it, expect } from 'vitest';
import { compileSource, getErrors, hasError } from './test-helpers';

describe('Phase 1: No with statement', () => {
  it('should reject with statement', () => {
    const source = `
      const obj = { x: 10, y: 20 };
      with (obj) {
        console.log(x, y);
      }
    `;
    const result = compileSource(source);
    
    const errors = getErrors(result.diagnostics, 'GS101');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('with');
  });

  it('should accept explicit property access', () => {
    const source = `
      const obj = { x: 10, y: 20 };
      console.log(obj.x, obj.y);
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS101')).toBe(false);
  });

  it('should accept destructuring as alternative', () => {
    const source = `
      const obj = { x: 10, y: 20 };
      const { x, y } = obj;
      console.log(x, y);
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS101')).toBe(false);
  });
});
