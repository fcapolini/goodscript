/**
 * Tests for GS110: No implicit truthy/falsy checks
 * All conditions must be explicit boolean expressions
 */

import { describe, it, expect } from 'vitest';
import { compileSource, hasError, getErrors } from './test-helpers';

describe('GS110: No implicit truthy/falsy checks', () => {
  describe('if statements', () => {
    it('should reject variable in if condition', () => {
      const source = `
const x = 42;
if (x) {
  console.log('truthy');
}
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS110')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS110');
      expect(errors[0].message).toContain('Implicit truthy/falsy');
    });

    it('should reject negated variable in if condition', () => {
      const source = `
const x = 42;
if (!x) {
  console.log('falsy');
}
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS110')).toBe(true);
    });

    it('should accept explicit null check', () => {
      const source = `
const x: number | null = 42;
if (x !== null) {
  console.log(x);
}
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS110')).toBe(false);
    });

    it('should accept explicit undefined check', () => {
      const source = `
const x: number | undefined = 42;
if (x !== undefined) {
  console.log(x);
}
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS110')).toBe(false);
    });

    it('should accept explicit comparison', () => {
      const source = `
const x = 42;
if (x > 0) {
  console.log('positive');
}
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS110')).toBe(false);
    });

    it('should accept explicit length check', () => {
      const source = `
const arr = [1, 2, 3];
if (arr.length > 0) {
  console.log('not empty');
}
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS110')).toBe(false);
    });

    it('should accept boolean literals', () => {
      const source = `
if (true) {
  console.log('always');
}
if (false) {
  console.log('never');
}
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS110')).toBe(false);
    });

    it('should accept logical AND of explicit conditions', () => {
      const source = `
const x = 42;
const y = 10;
if (x > 0 && y > 0) {
  console.log('both positive');
}
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS110')).toBe(false);
    });

    it('should accept logical OR of explicit conditions', () => {
      const source = `
const x = 42;
const y = 10;
if (x > 0 || y > 0) {
  console.log('at least one positive');
}
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS110')).toBe(false);
    });

    it('should accept negation of explicit condition', () => {
      const source = `
const x = 42;
if (!(x > 0)) {
  console.log('not positive');
}
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS110')).toBe(false);
    });
  });

  describe('while statements', () => {
    it('should reject variable in while condition', () => {
      const source = `
let count = 10;
while (count) {
  count = count - 1;
}
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS110')).toBe(true);
    });

    it('should accept explicit comparison in while', () => {
      const source = `
let count = 10;
while (count > 0) {
  count = count - 1;
}
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS110')).toBe(false);
    });
  });

  describe('do-while statements', () => {
    it('should reject variable in do-while condition', () => {
      const source = `
let count = 10;
do {
  count = count - 1;
} while (count);
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS110')).toBe(true);
    });

    it('should accept explicit comparison in do-while', () => {
      const source = `
let count = 10;
do {
  count = count - 1;
} while (count > 0);
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS110')).toBe(false);
    });
  });

  describe('for loop conditions', () => {
    it('should reject variable in for condition', () => {
      const source = `
for (let i = 10; i; i = i - 1) {
  console.log(i);
}
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS110')).toBe(true);
    });

    it('should accept explicit comparison in for condition', () => {
      const source = `
for (let i = 0; i < 10; i = i + 1) {
  console.log(i);
}
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS110')).toBe(false);
    });
  });

  describe('ternary operator', () => {
    it('should reject variable in ternary condition', () => {
      const source = `
const x = 42;
const result = x ? 'yes' : 'no';
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS110')).toBe(true);
    });

    it('should accept explicit comparison in ternary', () => {
      const source = `
const x = 42;
const result = x > 0 ? 'positive' : 'non-positive';
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS110')).toBe(false);
    });
  });

  describe('function calls in conditions', () => {
    it('should accept function calls (assumed to return boolean)', () => {
      const source = `
const isValid = (): boolean => true;
if (isValid()) {
  console.log('valid');
}
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS110')).toBe(false);
    });
  });
});
