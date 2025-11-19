/**
 * Tests for GS111: No delete operator
 * The delete operator changes object shapes at runtime and defeats optimization
 */

import { describe, it, expect } from 'vitest';
import { compileSource, hasError, getErrors } from './test-helpers';

describe('GS111: No delete operator', () => {
  it('should reject delete on object property', () => {
    const source = `
const obj = { a: 1, b: 2 };
delete obj.a;
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS111')).toBe(true);
    const errors = getErrors(result.diagnostics, 'GS111');
    expect(errors[0].message).toContain('delete');
  });

  it('should reject delete on array element', () => {
    const source = `
const arr = [1, 2, 3];
delete arr[1];
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS111')).toBe(true);
  });

  it('should reject delete with bracket notation', () => {
    const source = `
const obj = { key: 'value' };
const prop = 'key';
delete obj[prop];
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS111')).toBe(true);
  });

  it('should reject delete in expression', () => {
    const source = `
const obj = { a: 1 };
const result = delete obj.a;
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS111')).toBe(true);
  });

  it('should accept creating new object without property', () => {
    const source = `
const obj = { a: 1, b: 2 };
const newObj = { b: obj.b };
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS111')).toBe(false);
  });

  it('should accept using optional properties', () => {
    const source = `
interface Config {
  a: number;
  b?: number;
}

const config: Config = { a: 1, b: 2 };
const configWithoutB: Config = { a: 1 };
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS111')).toBe(false);
  });

  it('should accept destructuring to omit properties', () => {
    const source = `
const obj = { a: 1, b: 2, c: 3 };
const { a, ...rest } = obj;
// rest is { b: 2, c: 3 }
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS111')).toBe(false);
  });

  it('should accept Object.keys filtering', () => {
    const source = `
const obj = { a: 1, b: 2, c: 3 };
const filtered: { [key: string]: number } = {};
for (const key of Object.keys(obj)) {
  if (key !== 'a') {
    filtered[key] = obj[key as keyof typeof obj];
  }
}
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS111')).toBe(false);
  });
});
