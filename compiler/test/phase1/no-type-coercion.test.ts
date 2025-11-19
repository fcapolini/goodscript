/**
 * Phase 1 Tests: No type coercion (GS201)
 * Cannot mix string and number types
 */

import { describe, it, expect } from 'vitest';
import { compileSource, getErrors, hasError } from './test-helpers';

describe('Phase 1: No type coercion', () => {
  it('should reject string + number', () => {
    const source = `
      const result = "sum: " + 1 + 2;
    `;
    const result = compileSource(source);
    
    const errors = getErrors(result.diagnostics, 'GS201');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('explicit conversion');
  });

  it('should reject number + string', () => {
    const source = `
      const result = 42 + " is the answer";
    `;
    const result = compileSource(source);
    
    const errors = getErrors(result.diagnostics, 'GS201');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should accept template literals', () => {
    const source = `
      const x = 42;
      const result = \`The answer is \${x}\`;
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS201')).toBe(false);
  });

  it('should accept explicit toString conversion', () => {
    const source = `
      const x = 42;
      const result = "Number: " + x.toString();
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS201')).toBe(false);
  });

  it('should accept explicit String() conversion', () => {
    const source = `
      const x = 42;
      const result = "Number: " + String(x);
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS201')).toBe(false);
  });

  it('should accept string + string', () => {
    const source = `
      const result = "Hello, " + "World";
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS201')).toBe(false);
  });

  it('should accept number + number', () => {
    const source = `
      const result = 1 + 2 + 3;
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS201')).toBe(false);
  });

  it('should accept template literal with expression', () => {
    const source = `
      const a = 1;
      const b = 2;
      const result = \`sum: \${a + b}\`;
    `;
    const result = compileSource(source);
    
    expect(hasError(result.diagnostics, 'GS201')).toBe(false);
  });

  it('should reject multiple mixed type additions', () => {
    const source = `
      const a = "text" + 1;
      const b = 2 + "more";
    `;
    const result = compileSource(source);
    
    const errors = getErrors(result.diagnostics, 'GS201');
    expect(errors.length).toBe(2);
  });
});
