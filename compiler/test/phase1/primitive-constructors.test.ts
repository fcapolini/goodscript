/**
 * Tests for GS116: No String/Number/Boolean constructors
 */

import { describe, it, expect } from 'vitest';
import { compileSource, getErrors, hasError } from './test-helpers';

describe('GS116: No String/Number/Boolean constructors', () => {
  describe('String constructor - should reject', () => {
    it('should reject String() function call', () => {
      const result = compileSource(`
        const s = String(123);
      `);
      
      expect(hasError(result.diagnostics, 'GS116')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS116');
      expect(errors[0].message).toContain('String');
      expect(errors[0].message).toContain('template literals');
    });

    it('should reject new String() constructor', () => {
      const result = compileSource(`
        const s = new String("hello");
      `);
      
      expect(hasError(result.diagnostics, 'GS116')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS116');
      expect(errors[0].message).toContain('String');
      expect(errors[0].message).toContain('primitive types');
    });
  });

  describe('Number constructor - should reject', () => {
    it('should reject Number() function call', () => {
      const result = compileSource(`
        const n = Number("123");
      `);
      
      expect(hasError(result.diagnostics, 'GS116')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS116');
      expect(errors[0].message).toContain('Number');
    });

    it('should reject new Number() constructor', () => {
      const result = compileSource(`
        const n = new Number(42);
      `);
      
      expect(hasError(result.diagnostics, 'GS116')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS116');
      expect(errors[0].message).toContain('Number');
    });
  });

  describe('Boolean constructor - should reject', () => {
    it('should reject Boolean() function call', () => {
      const result = compileSource(`
        const b = Boolean(1);
      `);
      
      expect(hasError(result.diagnostics, 'GS116')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS116');
      expect(errors[0].message).toContain('Boolean');
    });

    it('should reject new Boolean() constructor', () => {
      const result = compileSource(`
        const b = new Boolean(true);
      `);
      
      expect(hasError(result.diagnostics, 'GS116')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS116');
      expect(errors[0].message).toContain('Boolean');
    });
  });

  describe('Valid alternatives - should accept', () => {
    it('should accept .toString() for string conversion', () => {
      const result = compileSource(`
        const n = 123;
        const s = n.toString();
      `);
      
      expect(hasError(result.diagnostics, 'GS116')).toBe(false);
    });

    it('should accept template literals for string conversion', () => {
      const result = compileSource(`
        const n = 123;
        const s = \`\${n}\`;
      `);
      
      expect(hasError(result.diagnostics, 'GS116')).toBe(false);
    });

    it('should accept string concatenation with + operator', () => {
      const result = compileSource(`
        const n = 123;
        const s = "" + n.toString();
      `);
      
      expect(hasError(result.diagnostics, 'GS116')).toBe(false);
    });

    it('should accept parseInt/parseFloat for number conversion', () => {
      const result = compileSource(`
        const s = "123";
        const n = parseInt(s, 10);
        const f = parseFloat(s);
      `);
      
      expect(hasError(result.diagnostics, 'GS116')).toBe(false);
    });

    it('should accept unary + for number conversion', () => {
      const result = compileSource(`
        const s = "123";
        const n = +s;
      `);
      
      expect(hasError(result.diagnostics, 'GS116')).toBe(false);
    });

    it('should accept explicit boolean comparisons', () => {
      const result = compileSource(`
        const x = 1;
        const b = x !== 0;
      `);
      
      expect(hasError(result.diagnostics, 'GS116')).toBe(false);
    });

    it('should accept primitive string literals', () => {
      const result = compileSource(`
        const s: string = "hello";
      `);
      
      expect(hasError(result.diagnostics, 'GS116')).toBe(false);
    });

    it('should accept primitive number literals', () => {
      const result = compileSource(`
        const n: number = 42;
      `);
      
      expect(hasError(result.diagnostics, 'GS116')).toBe(false);
    });

    it('should accept primitive boolean literals', () => {
      const result = compileSource(`
        const b: boolean = true;
      `);
      
      expect(hasError(result.diagnostics, 'GS116')).toBe(false);
    });
  });
});
