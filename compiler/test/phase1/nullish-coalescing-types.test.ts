/**
 * Phase 1 Tests: Nullish coalescing type consistency (GS119)
 * The ?? operator must have compatible types on both sides
 */

import { describe, it, expect } from 'vitest';
import { compileSource, hasError, getErrors } from './test-helpers';

describe('GS119: Nullish coalescing type consistency', () => {
  
  describe('rejections', () => {
    it('should reject number ?? string', () => {
      const source = `
        function getDefault(value: number | null): number | string {
          return value ?? "default";
        }
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS119')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS119');
      expect(errors[0].message).toContain('number');
      expect(errors[0].message).toContain('string');
    });

    it('should reject string ?? number', () => {
      const source = `
        function getDefault(value: string | null): string | number {
          return value ?? 0;
        }
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS119')).toBe(true);
    });

    it('should reject boolean ?? string', () => {
      const source = `
        function getDefault(value: boolean | null): boolean | string {
          return value ?? "false";
        }
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS119')).toBe(true);
    });

    it('should reject number ?? boolean', () => {
      const source = `
        const value: number | null = null;
        const result = value ?? true;
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS119')).toBe(true);
    });
  });

  describe('acceptances', () => {
    it('should accept number ?? number', () => {
      const source = `
        function getDefault(value: number | null): number {
          return value ?? 0;
        }
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS119')).toBe(false);
    });

    it('should accept string ?? string', () => {
      const source = `
        function getDefault(value: string | null): string {
          return value ?? "default";
        }
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS119')).toBe(false);
    });

    it('should accept boolean ?? boolean', () => {
      const source = `
        function getDefault(value: boolean | null): boolean {
          return value ?? false;
        }
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS119')).toBe(false);
    });

    it('should accept same object type on both sides', () => {
      const source = `
        class Item {
          value: number = 0;
        }
        
        function getDefault(value: Item | null, fallback: Item): Item {
          return value ?? fallback;
        }
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS119')).toBe(false);
    });

    it('should accept number literal ?? number', () => {
      const source = `
        const value: number | null = null;
        const result = value ?? 42;
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS119')).toBe(false);
    });

    it('should accept string literal ?? string', () => {
      const source = `
        const value: string | null = null;
        const result = value ?? "hello";
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS119')).toBe(false);
    });

    it('should accept undefined on left side', () => {
      const source = `
        function getDefault(value: number | undefined): number {
          return value ?? 0;
        }
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS119')).toBe(false);
    });

    it('should accept discriminated unions (different object types)', () => {
      const source = `
        interface Success {
          kind: 'success';
          value: number;
        }
        
        interface Error {
          kind: 'error';
          message: string;
        }
        
        type Result = Success | Error;
        
        function getResult(value: Result | null, fallback: Result): Result {
          return value ?? fallback;
        }
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS119')).toBe(false);
    });

    it('should accept with optional chaining', () => {
      const source = `
        interface User {
          name?: string;
        }
        
        function getUserName(user: User | null): string {
          return user?.name ?? "Anonymous";
        }
      `;
      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS119')).toBe(false);
    });
  });
});
