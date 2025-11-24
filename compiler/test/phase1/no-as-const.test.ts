/**
 * Tests for GS117: No 'as const' assertions
 * The 'as const' construct creates deeply readonly types that are complex to implement
 */

import { describe, it, expect } from 'vitest';
import { compileSource, hasError, getErrors } from './test-helpers';

describe('GS117: No as const assertions', () => {
  it('should reject as const on array literals', () => {
    const source = `
const arr = [1, 2, 3] as const;
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS117')).toBe(true);
    const errors = getErrors(result.diagnostics, 'GS117');
    expect(errors[0].message).toContain('as const');
  });

  it('should reject as const on object literals', () => {
    const source = `
const obj = { x: 10, y: 20 } as const;
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS117')).toBe(true);
  });

  it('should reject as const on tuple literals', () => {
    const source = `
const tuple = [1, "hello", true] as const;
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS117')).toBe(true);
  });

  it('should reject as const on nested structures', () => {
    const source = `
const config = {
  settings: {
    enabled: true,
    values: [1, 2, 3]
  }
} as const;
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS117')).toBe(true);
  });

  it('should accept explicit readonly types for arrays', () => {
    const source = `
const arr: readonly number[] = [1, 2, 3];
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS117')).toBe(false);
  });

  it('should accept readonly parameters', () => {
    const source = `
const sum = (items: readonly number[]): number => {
  let total = 0;
  for (const item of items) {
    total += item;
  }
  return total;
};
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS117')).toBe(false);
  });

  it('should accept regular arrays without as const', () => {
    const source = `
const arr = [1, 2, 3];
arr.push(4);
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS117')).toBe(false);
  });
});
