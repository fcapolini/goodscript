/**
 * Phase 3 Triple-Mode Tests: Operators
 * 
 * Tests that operators produce identical output across:
 * 1. JavaScript (TypeScript execution)
 * 2. C++ Ownership Mode
 * 3. C++ GC Mode
 */

import { describe, it } from 'vitest';
import { expectTripleModeEquivalence } from '../triple-mode-helpers.js';

describe('Phase 3: Operators (Triple-Mode)', () => {
  describe('Arithmetic Operators', () => {
    it('should handle addition', () => {
      expectTripleModeEquivalence(`
        console.log(5 + 3);
        console.log(10 + 20);
        console.log(1.5 + 2.5);
      `);
    });

    it('should handle subtraction', () => {
      expectTripleModeEquivalence(`
        console.log(10 - 3);
        console.log(100 - 50);
        console.log(5.5 - 2.5);
      `);
    });

    it('should handle multiplication', () => {
      expectTripleModeEquivalence(`
        console.log(5 * 3);
        console.log(10 * 10);
        console.log(2.5 * 4);
      `);
    });

    it('should handle division', () => {
      expectTripleModeEquivalence(`
        console.log(10 / 2);
        console.log(100 / 4);
        console.log(7 / 2);
      `);
    });

    it('should handle modulo', () => {
      expectTripleModeEquivalence(`
        console.log(10 % 3);
        console.log(100 % 7);
        console.log(5 % 2);
      `);
    });

    it('should handle operator precedence', () => {
      expectTripleModeEquivalence(`
        console.log(2 + 3 * 4);
        console.log(10 - 4 / 2);
        console.log((2 + 3) * 4);
      `);
    });

    it('should handle unary minus', () => {
      expectTripleModeEquivalence(`
        const x = 5;
        console.log(-x);
        console.log(-10);
        console.log(-(3 + 4));
      `);
    });
  });

  describe('Comparison Operators', () => {
    it('should handle equality (===)', () => {
      expectTripleModeEquivalence(`
        console.log(5 === 5);
        console.log(5 === 3);
        console.log(10 === 10);
      `);
    });

    it('should handle inequality (!==)', () => {
      expectTripleModeEquivalence(`
        console.log(5 !== 3);
        console.log(5 !== 5);
        console.log(10 !== 20);
      `);
    });

    it('should handle less than', () => {
      expectTripleModeEquivalence(`
        console.log(3 < 5);
        console.log(5 < 3);
        console.log(5 < 5);
      `);
    });

    it('should handle less than or equal', () => {
      expectTripleModeEquivalence(`
        console.log(3 <= 5);
        console.log(5 <= 5);
        console.log(7 <= 5);
      `);
    });

    it('should handle greater than', () => {
      expectTripleModeEquivalence(`
        console.log(5 > 3);
        console.log(3 > 5);
        console.log(5 > 5);
      `);
    });

    it('should handle greater than or equal', () => {
      expectTripleModeEquivalence(`
        console.log(5 >= 3);
        console.log(5 >= 5);
        console.log(3 >= 5);
      `);
    });

    it('should handle string comparison', () => {
      expectTripleModeEquivalence(`
        console.log("abc" === "abc");
        console.log("abc" === "def");
        console.log("apple" < "banana");
      `);
    });
  });

  describe('Logical Operators', () => {
    it('should handle AND (&&)', () => {
      expectTripleModeEquivalence(`
        console.log(true && true);
        console.log(true && false);
        console.log(false && false);
      `);
    });

    it('should handle OR (||)', () => {
      expectTripleModeEquivalence(`
        console.log(true || false);
        console.log(false || false);
        console.log(false || true);
      `);
    });

    it('should handle NOT (!)', () => {
      expectTripleModeEquivalence(`
        console.log(!true);
        console.log(!false);
        console.log(!!true);
      `);
    });

    it('should handle complex boolean expressions', () => {
      expectTripleModeEquivalence(`
        console.log(true && (false || true));
        console.log((true || false) && false);
        console.log(!false && true);
      `);
    });
  });

  describe('Assignment Operators', () => {
    it('should handle simple assignment', () => {
      expectTripleModeEquivalence(`
        let x = 5;
        console.log(x);
        x = 10;
        console.log(x);
      `);
    });

    it('should handle compound assignment (+=)', () => {
      expectTripleModeEquivalence(`
        let x = 5;
        console.log(x);
        x += 3;
        console.log(x);
      `);
    });

    it('should handle compound assignment (-=)', () => {
      expectTripleModeEquivalence(`
        let x = 10;
        console.log(x);
        x -= 4;
        console.log(x);
      `);
    });

    it('should handle compound assignment (*=)', () => {
      expectTripleModeEquivalence(`
        let x = 5;
        console.log(x);
        x *= 2;
        console.log(x);
      `);
    });

    it('should handle compound assignment (/=)', () => {
      expectTripleModeEquivalence(`
        let x = 20;
        console.log(x);
        x /= 4;
        console.log(x);
      `);
    });
  });

  describe('Increment/Decrement Operators', () => {
    it('should handle post-increment', () => {
      expectTripleModeEquivalence(`
        let x = 5;
        console.log(x);
        x++;
        console.log(x);
      `);
    });

    it('should handle post-decrement', () => {
      expectTripleModeEquivalence(`
        let x = 5;
        console.log(x);
        x--;
        console.log(x);
      `);
    });

    it('should handle pre-increment', () => {
      expectTripleModeEquivalence(`
        let x = 5;
        console.log(x);
        ++x;
        console.log(x);
      `);
    });

    it('should handle pre-decrement', () => {
      expectTripleModeEquivalence(`
        let x = 5;
        console.log(x);
        --x;
        console.log(x);
      `);
    });
  });

  describe('Operator Combinations', () => {
    it('should handle mixed arithmetic and comparison', () => {
      expectTripleModeEquivalence(`
        const a = 10;
        const b = 5;
        console.log(a + b > 10);
        console.log(a - b < 10);
        console.log(a * 2 === 20);
      `);
    });

    it('should handle arithmetic with variables', () => {
      expectTripleModeEquivalence(`
        const x = 10;
        const y = 5;
        console.log(x + y);
        console.log(x - y);
        console.log(x * y);
        console.log(x / y);
      `);
    });

    it('should handle complex expressions', () => {
      expectTripleModeEquivalence(`
        const a = 5;
        const b = 3;
        const c = 2;
        console.log(a + b * c);
        console.log((a + b) * c);
        console.log(a * b + c);
      `);
    });
  });
});
