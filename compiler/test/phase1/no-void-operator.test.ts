/**
 * Tests for GS115: No void operator
 * The void operator is archaic and confusing
 */

import { describe, it, expect } from 'vitest';
import { compileSource, hasError, getErrors } from './test-helpers';

describe('GS115: No void operator', () => {
  it('should reject void 0', () => {
    const source = `
const x = void 0;
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS115')).toBe(true);
    const errors = getErrors(result.diagnostics, 'GS115');
    expect(errors[0].message).toContain('void');
  });

  it('should reject void with expression', () => {
    const source = `
const getValue = (): number => 42;
const x = void getValue();
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS115')).toBe(true);
  });

  it('should reject void in expression', () => {
    const source = `
const result = void (1 + 2);
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS115')).toBe(true);
  });

  it('should reject void in return statement', () => {
    const source = `
const fn = (): void => {
  return void 0;
};
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS115')).toBe(true);
  });

  it('should accept undefined directly', () => {
    const source = `
const x: number | undefined = undefined;
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS115')).toBe(false);
  });

  it('should accept void return type annotation', () => {
    const source = `
const fn = (): void => {
  console.log('hello');
};
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS115')).toBe(false);
  });

  it('should accept functions returning nothing', () => {
    const source = `
const log = (message: string): void => {
  console.log(message);
};
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS115')).toBe(false);
  });

  it('should accept explicit return undefined', () => {
    const source = `
const fn = (): undefined => {
  return undefined;
};
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS115')).toBe(false);
  });
});
