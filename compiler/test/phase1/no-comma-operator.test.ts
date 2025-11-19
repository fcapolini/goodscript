/**
 * Tests for GS112: No comma operator
 * The comma operator sequences expressions and is confusing
 */

import { describe, it, expect } from 'vitest';
import { compileSource, hasError, getErrors } from './test-helpers';

describe('GS112: No comma operator', () => {
  it('should reject comma operator in assignment', () => {
    const source = `
let x = 0;
let y = 0;
x = (y = 1, y + 1);
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS112')).toBe(true);
    const errors = getErrors(result.diagnostics, 'GS112');
    expect(errors[0].message).toContain('comma operator');
  });

  it('should reject comma operator in expression', () => {
    const source = `
let a = 1;
let b = 2;
const result = (a++, b++, a + b);
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS112')).toBe(true);
  });

  it('should reject comma operator in return', () => {
    const source = `
const fn = (): number => {
  let x = 1;
  let y = 2;
  return (x++, y++, x + y);
};
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS112')).toBe(true);
  });

  it('should accept comma in function parameters', () => {
    const source = `
const add = (a: number, b: number, c: number): number => a + b + c;
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS112')).toBe(false);
  });

  it('should accept comma in function calls', () => {
    const source = `
const add = (a: number, b: number, c: number): number => a + b + c;
const result = add(1, 2, 3);
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS112')).toBe(false);
  });

  it('should accept comma in array literals', () => {
    const source = `
const arr = [1, 2, 3, 4, 5];
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS112')).toBe(false);
  });

  it('should accept comma in object literals', () => {
    const source = `
const obj = { a: 1, b: 2, c: 3 };
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS112')).toBe(false);
  });

  it('should accept comma in variable declarations', () => {
    const source = `
let a = 1, b = 2, c = 3;
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS112')).toBe(false);
  });

  it('should accept separate statements instead of comma operator', () => {
    const source = `
let x = 1;
let y = 2;
x = x + 1;
y = y + 1;
const result = x + y;
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS112')).toBe(false);
  });

  it('should reject comma operator in for loop increment', () => {
    const source = `
for (let i = 0, j = 10; i < j; i = i + 1, j = j - 1) {
  console.log(i, j);
}
    `;
    const result = compileSource(source);
    // Comma operator is not allowed even in for loop incrementers
    expect(hasError(result.diagnostics, 'GS112')).toBe(true);
  });

  it('should accept destructuring with comma', () => {
    const source = `
const [a, b, c] = [1, 2, 3];
const { x, y, z } = { x: 1, y: 2, z: 3 };
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS112')).toBe(false);
  });
});
