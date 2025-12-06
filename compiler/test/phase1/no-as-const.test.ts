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
      expect(errors[0].message).toContain('Symbol is only supported for iterator protocol');
    });

    it('should accept Symbol.iterator in iterator method', () => {
      const source = `
class MyIterable {
  [Symbol.iterator]() {
    return null;
  }
}
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS125')).toBe(false);
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

  describe('GS128: No getters/setters (temporary)', () => {
    it('should reject getter accessor', () => {
      const source = `
class Person {
  private _name: string = "";
  
  get name(): string {
    return this._name;
  }
}
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS128')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS128');
      expect(errors[0].message).toContain('Getter accessors are not yet supported');
    });

    it('should reject setter accessor', () => {
      const source = `
class Person {
  private _age: number = 0;
  
  set age(value: number) {
    this._age = value;
  }
}
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS128')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS128');
      expect(errors[0].message).toContain('Setter accessors are not yet supported');
    });

    it('should reject getter/setter pair', () => {
      const source = `
class Counter {
  private _count: number = 0;
  
  get count(): number {
    return this._count;
  }
  
  set count(value: number) {
    this._count = value;
  }
}
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS128')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS128');
      expect(errors.length).toBeGreaterThanOrEqual(2); // Both getter and setter flagged
    });

    it('should suggest using explicit methods', () => {
      const source = `
class Temperature {
  get celsius(): number { return 0; }
}
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS128')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS128');
      expect(errors[0].message).toContain('getValue()');
      expect(errors[0].message).toContain('setValue()');
    });

    it('should accept explicit getter/setter methods', () => {
      const source = `
class Person {
  private _name: string = "";
  
  getName(): string {
    return this._name;
  }
  
  setName(value: string): void {
    this._name = value;
  }
}
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS128')).toBe(false);
    });
  });

  describe('GS127: No Proxy', () => {
    it('should reject Proxy constructor', () => {
      const source = `
const handler = {
  get(target: any, prop: string) {
    return target[prop];
  }
};
const proxy = new Proxy({}, handler);
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS127')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS127');
      expect(errors[0].message).toContain('Proxy is not supported');
    });

    it('should reject Proxy.revocable', () => {
      const source = `
const { proxy, revoke } = Proxy.revocable({}, {});
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS127')).toBe(true);
    });

    it('should reject Reflect.get', () => {
      const source = `
const obj = { x: 1 };
const value = Reflect.get(obj, 'x');
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS127')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS127');
      expect(errors[0].message).toContain('Reflect API is not supported');
    });

    it('should reject Reflect.set', () => {
      const source = `
const obj = {};
Reflect.set(obj, 'x', 1);
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS127')).toBe(true);
    });

    it('should reject Reflect.has', () => {
      const source = `
const obj = { x: 1 };
const hasX = Reflect.has(obj, 'x');
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS127')).toBe(true);
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
    expect(hasError(result.diagnostics, 'GS127')).toBe(false);
    expect(hasError(result.diagnostics, 'GS128')).toBe(false);
  });
});

