/**
 * Phase 3 Triple-Mode Tests: Booleans
 * 
 * Tests that boolean operations produce identical output across:
 * 1. JavaScript (TypeScript execution)
 * 2. C++ Ownership Mode
 * 3. C++ GC Mode
 */

import { describe, it } from 'vitest';
import { expectTripleModeEquivalence } from '../triple-mode-helpers.js';

describe('Phase 3: Booleans (Triple-Mode)', () => {
  describe('Boolean Literals', () => {
    it('should handle true', () => {
      expectTripleModeEquivalence(`
        console.log(true);
      `);
    });

    it('should handle false', () => {
      expectTripleModeEquivalence(`
        console.log(false);
      `);
    });

    it('should handle both values', () => {
      expectTripleModeEquivalence(`
        console.log(true);
        console.log(false);
      `);
    });
  });

  describe('Boolean Variables', () => {
    it('should declare const boolean', () => {
      expectTripleModeEquivalence(`
        const flag = true;
        console.log(flag);
      `);
    });

    it('should declare and reassign let boolean', () => {
      expectTripleModeEquivalence(`
        let flag = true;
        console.log(flag);
        flag = false;
        console.log(flag);
      `);
    });

    it('should handle multiple boolean variables', () => {
      expectTripleModeEquivalence(`
        const a = true;
        const b = false;
        const c = true;
        console.log(a);
        console.log(b);
        console.log(c);
      `);
    });
  });

  describe('Boolean Operators', () => {
    it('should handle AND (&&)', () => {
      expectTripleModeEquivalence(`
        console.log(true && true);
        console.log(true && false);
        console.log(false && true);
        console.log(false && false);
      `);
    });

    it('should handle OR (||)', () => {
      expectTripleModeEquivalence(`
        console.log(true || true);
        console.log(true || false);
        console.log(false || true);
        console.log(false || false);
      `);
    });

    it('should handle NOT (!)', () => {
      expectTripleModeEquivalence(`
        console.log(!true);
        console.log(!false);
        console.log(!!true);
        console.log(!!false);
      `);
    });

    it('should handle complex expressions', () => {
      expectTripleModeEquivalence(`
        console.log(true && (false || true));
        console.log((true || false) && false);
        console.log(!false && true);
        console.log(!(true && false));
      `);
    });
  });

  describe('Boolean Comparisons', () => {
    it('should compare with ===', () => {
      expectTripleModeEquivalence(`
        console.log(true === true);
        console.log(false === false);
        console.log(true === false);
        console.log(false === true);
      `);
    });

    it('should compare with !==', () => {
      expectTripleModeEquivalence(`
        console.log(true !== false);
        console.log(false !== true);
        console.log(true !== true);
        console.log(false !== false);
      `);
    });
  });

  describe('Boolean from Comparisons', () => {
    it('should get boolean from number comparison', () => {
      expectTripleModeEquivalence(`
        const result = 5 > 3;
        console.log(result);
      `);
    });

    it('should get boolean from equality', () => {
      expectTripleModeEquivalence(`
        const isEqual = 10 === 10;
        const isNotEqual = 5 === 3;
        console.log(isEqual);
        console.log(isNotEqual);
      `);
    });

    it('should use in conditions', () => {
      expectTripleModeEquivalence(`
        const x = 5;
        const isPositive = x > 0;
        if (isPositive) {
          console.log("positive");
        } else {
          console.log("not positive");
        }
      `);
    });
  });

  describe('Boolean in Control Flow', () => {
    it('should use in if statement', () => {
      expectTripleModeEquivalence(`
        const flag = true;
        if (flag) {
          console.log("yes");
        } else {
          console.log("no");
        }
      `);
    });

    it('should use in while loop', () => {
      expectTripleModeEquivalence(`
        let done = false;
        let count = 0;
        while (!done) {
          console.log(count);
          count++;
          if (count >= 3) {
            done = true;
          }
        }
      `);
    });

    it('should use in for loop condition', () => {
      expectTripleModeEquivalence(`
        const shouldRun = true;
        if (shouldRun) {
          for (let i = 0; i < 3; i++) {
            console.log(i);
          }
        }
      `);
    });
  });

  describe('Boolean Ternary', () => {
    it('should use in ternary operator', () => {
      expectTripleModeEquivalence(`
        const flag = true;
        const result = flag ? "yes" : "no";
        console.log(result);
      `);
    });

    it('should chain ternary operators', () => {
      expectTripleModeEquivalence(`
        const a = true;
        const b = false;
        const result = a ? "a is true" : b ? "b is true" : "both false";
        console.log(result);
      `);
    });

    it('should use with numbers', () => {
      expectTripleModeEquivalence(`
        const flag = false;
        const value = flag ? 100 : 200;
        console.log(value);
      `);
    });
  });

  describe('Boolean Short-Circuit Evaluation', () => {
    it('should short-circuit AND', () => {
      expectTripleModeEquivalence(`
        const a = false;
        const b = true;
        console.log(a && b);
        console.log(b && a);
      `);
    });

    it('should short-circuit OR', () => {
      expectTripleModeEquivalence(`
        const a = true;
        const b = false;
        console.log(a || b);
        console.log(b || a);
      `);
    });

    it('should combine AND and OR', () => {
      expectTripleModeEquivalence(`
        const a = true;
        const b = false;
        const c = true;
        console.log(a && b || c);
        console.log(a || b && c);
      `);
    });
  });

  describe('Boolean Negation', () => {
    it('should negate boolean variables', () => {
      expectTripleModeEquivalence(`
        const flag = true;
        console.log(!flag);
        console.log(!!flag);
      `);
    });

    it('should negate comparisons', () => {
      expectTripleModeEquivalence(`
        const x = 5;
        console.log(!(x > 10));
        console.log(!(x < 10));
      `);
    });

    it('should double negate', () => {
      expectTripleModeEquivalence(`
        console.log(!!true);
        console.log(!!false);
      `);
    });
  });
});
