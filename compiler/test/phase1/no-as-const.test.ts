/**
 * Tests for GS120-GS122: No readonly-related features
 * These are implementation limitations, not language design restrictions
 */

import { describe, it, expect } from 'vitest';
import { compileSource, hasError, getErrors } from './test-helpers';

describe('GS120-GS122: No readonly features (implementation limitations)', () => {
  describe('GS120: No as const assertions', () => {
    it('should reject as const on array literals', () => {
      const source = `
const arr = [1, 2, 3] as const;
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS120')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS120');
      expect(errors[0].message).toContain('as const');
    });

    it('should reject as const on object literals', () => {
      const source = `
const obj = { x: 10, y: 20 } as const;
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS120')).toBe(true);
    });

    it('should reject as const on tuple literals', () => {
      const source = `
const tuple = [1, "hello", true] as const;
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS120')).toBe(true);
    });
  });

  describe('GS121: No readonly modifier', () => {
    it('should reject readonly on array parameters', () => {
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
      expect(hasError(result.diagnostics, 'GS121')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS121');
      expect(errors[0].message).toContain('readonly');
    });

    it('should reject readonly on class properties', () => {
      const source = `
class Point {
  readonly x: number;
  readonly y: number;
  
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS121')).toBe(true);
    });

    it('should reject readonly on interface properties', () => {
      const source = `
interface Config {
  readonly host: string;
  readonly port: number;
}
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS121')).toBe(true);
    });
  });

  describe('GS122: No ReadonlyArray, Readonly, ReadonlyMap, or ReadonlySet types', () => {
    it('should reject ReadonlyArray<T>', () => {
      const source = `
const process = (items: ReadonlyArray<number>): number => {
  return items.length;
};
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS122')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS122');
      expect(errors[0].message).toContain('ReadonlyArray');
    });

    it('should reject Readonly<T> utility type', () => {
      const source = `
type Point = { x: number; y: number };
type ReadonlyPoint = Readonly<Point>;
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS122')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS122');
      expect(errors[0].message).toContain('Readonly');
    });

    it('should reject ReadonlyMap<K, V>', () => {
      const source = `
const process = (map: ReadonlyMap<string, number>): number => {
  return map.size;
};
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS122')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS122');
      expect(errors[0].message).toContain('ReadonlyMap');
    });

    it('should reject ReadonlySet<T>', () => {
      const source = `
const process = (set: ReadonlySet<string>): number => {
  return set.size;
};
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS122')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS122');
      expect(errors[0].message).toContain('ReadonlySet');
    });
  });

  describe('GS123: No Object.freeze/seal/preventExtensions', () => {
    it('should reject Object.freeze()', () => {
      const source = `
const obj = { x: 10 };
Object.freeze(obj);
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS123')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS123');
      expect(errors[0].message).toContain('Object.freeze');
    });

    it('should reject Object.seal()', () => {
      const source = `
const obj = { x: 10 };
Object.seal(obj);
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS123')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS123');
      expect(errors[0].message).toContain('Object.seal');
    });

    it('should reject Object.preventExtensions()', () => {
      const source = `
const obj = { x: 10 };
Object.preventExtensions(obj);
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS123')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS123');
      expect(errors[0].message).toContain('Object.preventExtensions');
    });
  });

  describe('GS124: No unsupported Object methods', () => {
    it('should reject Object.defineProperty()', () => {
      const source = `
const obj = {};
Object.defineProperty(obj, 'x', { value: 42 });
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS124')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS124');
      expect(errors[0].message).toContain('Object.defineProperty');
    });

    it('should reject Object.create()', () => {
      const source = `
const obj = Object.create(null);
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS124')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS124');
      expect(errors[0].message).toContain('Object.create');
    });

    it('should reject Object.getPrototypeOf()', () => {
      const source = `
const obj = {};
const proto = Object.getPrototypeOf(obj);
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS124')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS124');
      expect(errors[0].message).toContain('Object.getPrototypeOf');
    });

    it('should reject Object.setPrototypeOf()', () => {
      const source = `
const obj = {};
Object.setPrototypeOf(obj, null);
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS124')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS124');
      expect(errors[0].message).toContain('Object.setPrototypeOf');
    });

    it('should reject Object.getOwnPropertyDescriptor()', () => {
      const source = `
const obj = { x: 10 };
const desc = Object.getOwnPropertyDescriptor(obj, 'x');
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS124')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS124');
      expect(errors[0].message).toContain('Object.getOwnPropertyDescriptor');
    });
  });

  describe('GS125: No Symbol', () => {
    it('should reject Symbol type', () => {
      const source = `
const sym: Symbol = Symbol('test');
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS125')).toBe(true);
    });

    it('should reject Symbol() constructor', () => {
      const source = `
const sym = Symbol('test');
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS125')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS125');
      expect(errors[0].message).toContain('Symbol is not supported');
    });

    it('should reject Symbol.iterator', () => {
      const source = `
const iter = Symbol.iterator;
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS125')).toBe(true);
    });

    it('should reject Symbol.for()', () => {
      const source = `
const sym = Symbol.for('global');
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS125')).toBe(true);
    });

    it('should reject Symbol.keyFor()', () => {
      const source = `
const sym = Symbol('test');
const key = Symbol.keyFor(sym);
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS125')).toBe(true);
    });
  });

  describe('GS126: No prototype', () => {
    it('should reject prototype property access', () => {
      const source = `
function MyClass() {}
MyClass.prototype.method = function() {};
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS126')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS126');
      expect(errors[0].message).toContain('Prototype manipulation is not supported');
    });

    it('should reject prototype assignment', () => {
      const source = `
class MyClass {}
MyClass.prototype = { x: 1 };
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS126')).toBe(true);
    });

    it('should reject Object.prototype access', () => {
      const source = `
const proto = Object.prototype;
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS126')).toBe(true);
    });

    it('should reject constructor.prototype access', () => {
      const source = `
class MyClass {
  method() {
    const p = this.constructor.prototype;
  }
}
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS126')).toBe(true);
    });

    it('should reject __proto__ access', () => {
      const source = `
const obj = {};
const proto = obj.__proto__;
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS126')).toBe(true);
    });
  });

  it('should accept regular arrays', () => {
    const source = `
const arr = [1, 2, 3];
arr.push(4);
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS120')).toBe(false);
    expect(hasError(result.diagnostics, 'GS121')).toBe(false);
    expect(hasError(result.diagnostics, 'GS122')).toBe(false);
    expect(hasError(result.diagnostics, 'GS123')).toBe(false);
    expect(hasError(result.diagnostics, 'GS124')).toBe(false);
    expect(hasError(result.diagnostics, 'GS125')).toBe(false);
    expect(hasError(result.diagnostics, 'GS126')).toBe(false);
  });
});

