/**
 * Tests for GS109: No 'any' type
 * The 'any' type defeats static typing and should not be used
 */

import { describe, it, expect } from 'vitest';
import { compileSource, hasError, getErrors } from './test-helpers';

describe('GS109: No any type', () => {
  it('should reject any type in variable declaration', () => {
    const source = `
let x: any = 42;
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS109')).toBe(true);
    const errors = getErrors(result.diagnostics, 'GS109');
    expect(errors[0].message).toContain('any');
  });

  it('should reject any type in function parameter', () => {
    const source = `
const greet = (name: any): void => {
  console.log(name);
};
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS109')).toBe(true);
  });

  it('should reject any type in function return type', () => {
    const source = `
const getValue = (): any => {
  return 42;
};
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS109')).toBe(true);
  });

  it('should reject any type in array', () => {
    const source = `
const items: any[] = [1, 2, 3];
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS109')).toBe(true);
  });

  it('should reject any type in Array generic', () => {
    const source = `
const items: Array<any> = [1, 2, 3];
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS109')).toBe(true);
  });

  it('should reject any type in object property', () => {
    const source = `
interface Config {
  value: any;
}
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS109')).toBe(true);
  });

  it('should reject any type in type alias', () => {
    const source = `
type Handler = (arg: any) => void;
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS109')).toBe(true);
  });

  it('should accept explicit types', () => {
    const source = `
const x: number = 42;
const y: string = 'hello';
const z: boolean = true;
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS109')).toBe(false);
  });

  it('should accept union types', () => {
    const source = `
const value: number | string = 42;
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS109')).toBe(false);
  });

  it('should accept generic types', () => {
    const source = `
const identity = <T>(x: T): T => x;
const items: Array<number> = [1, 2, 3];
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS109')).toBe(false);
  });

  it('should accept unknown type (safer alternative to any)', () => {
    const source = `
const value: unknown = 42;
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS109')).toBe(false);
  });
});
