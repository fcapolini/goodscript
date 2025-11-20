/**
 * Tests for switch statement fall-through restriction (GS113)
 */

import { describe, it, expect } from 'vitest';
import { compileSource, getErrors, hasError } from './test-helpers';

describe('Phase 1 - Switch Fall-Through (GS113)', () => {
  describe('should reject fall-through', () => {
    it('should reject case without break', () => {
      const source = `
        const test = (x: number): void => {
          switch (x) {
            case 1:
              console.log("one");
              // Missing break - falls through!
            case 2:
              console.log("two");
              break;
          }
        };
      `;

      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS113')).toBe(true);
    });

    it('should reject multiple cases without break', () => {
      const source = `
        const test = (x: number): void => {
          switch (x) {
            case 1:
              console.log("one");
            case 2:
              console.log("two");
            case 3:
              console.log("three");
              break;
          }
        };
      `;

      const result = compileSource(source);
      const errors = getErrors(result.diagnostics, 'GS113');
      expect(errors.length).toBe(2); // Two cases without break
    });

    it('should reject default without break before another case', () => {
      const source = `
        const test = (x: number): void => {
          switch (x) {
            default:
              console.log("default");
              // Missing break
            case 1:
              console.log("one");
              break;
          }
        };
      `;

      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS113')).toBe(true);
    });
  });

  describe('should allow valid patterns', () => {
    it('should allow case with break', () => {
      const source = `
        const test = (x: number): void => {
          switch (x) {
            case 1:
              console.log("one");
              break;
            case 2:
              console.log("two");
              break;
            default:
              console.log("other");
          }
        };
      `;

      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS113')).toBe(false);
    });

    it('should allow case with return', () => {
      const source = `
        const test = (x: number): number => {
          switch (x) {
            case 1:
              console.log("one");
              return 1;
            case 2:
              console.log("two");
              return 2;
            default:
              return 0;
          }
        };
      `;

      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS113')).toBe(false);
    });

    it('should allow case with throw', () => {
      const source = `
        const test = (x: number): void => {
          switch (x) {
            case 1:
              console.log("error");
              throw new Error("bad");
            case 2:
              console.log("two");
              break;
            default:
              console.log("ok");
          }
        };
      `;

      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS113')).toBe(false);
    });

    it('should allow empty cases (intentional fall-through)', () => {
      const source = `
        const test = (x: number): void => {
          switch (x) {
            case 1:
            case 2:
            case 3:
              console.log("1, 2, or 3");
              break;
            default:
              console.log("other");
          }
        };
      `;

      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS113')).toBe(false);
    });

    it('should allow last case without break', () => {
      const source = `
        const test = (x: number): void => {
          switch (x) {
            case 1:
              console.log("one");
              break;
            case 2:
              console.log("two");
              // Last case doesn't need break
          }
        };
      `;

      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS113')).toBe(false);
    });

    it('should allow default as last clause without break', () => {
      const source = `
        const test = (x: number): void => {
          switch (x) {
            case 1:
              console.log("one");
              break;
            default:
              console.log("other");
              // Last clause doesn't need break
          }
        };
      `;

      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS113')).toBe(false);
    });

    it('should allow conditional break', () => {
      const source = `
        const test = (x: number, flag: boolean): void => {
          switch (x) {
            case 1:
              console.log("one");
              if (flag === true) {
                break;
              }
              console.log("still one");
              break;
            case 2:
              console.log("two");
              break;
          }
        };
      `;

      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS113')).toBe(false);
    });

    it('should allow continue in switch inside loop', () => {
      const source = `
        const test = (items: number[]): void => {
          for (const x of items) {
            switch (x) {
              case 1:
                console.log("one");
                continue;
              case 2:
                console.log("two");
                break;
              default:
                console.log("other");
            }
          }
        };
      `;

      const result = compileSource(source);
      expect(hasError(result.diagnostics, 'GS113')).toBe(false);
    });
  });
});
