/**
 * Phase 3 Triple-Mode Tests: Numbers
 * 
 * Tests that number operations and Math functions produce identical output across:
 * 1. JavaScript (TypeScript execution)
 * 2. C++ Ownership Mode
 * 3. C++ GC Mode
 */

import { describe, it } from 'vitest';
import { expectTripleModeEquivalence } from '../triple-mode-helpers.js';

describe('Phase 3: Numbers (Triple-Mode)', () => {
  describe('Number Literals', () => {
    it('should handle integer literals', () => {
      expectTripleModeEquivalence(`
        console.log(0);
        console.log(1);
        console.log(42);
        console.log(100);
        console.log(1000);
      `);
    });

    it('should handle decimal literals', () => {
      expectTripleModeEquivalence(`
        console.log(1.5);
        console.log(3.14);
        console.log(0.5);
        console.log(10.25);
      `);
    });

    it('should handle negative numbers', () => {
      expectTripleModeEquivalence(`
        console.log(-1);
        console.log(-42);
        console.log(-3.14);
      `);
    });

    it('should handle zero', () => {
      expectTripleModeEquivalence(`
        console.log(0);
        console.log(0.0);
      `);
    });
  });

  describe('Number Variables', () => {
    it('should declare and use number variables', () => {
      expectTripleModeEquivalence(`
        const x = 42;
        console.log(x);
      `);
    });

    it('should reassign let variables', () => {
      expectTripleModeEquivalence(`
        let x = 10;
        console.log(x);
        x = 20;
        console.log(x);
      `);
    });

    it('should handle multiple variables', () => {
      expectTripleModeEquivalence(`
        const a = 5;
        const b = 10;
        const c = 15;
        console.log(a);
        console.log(b);
        console.log(c);
      `);
    });
  });

  describe('Number Arithmetic', () => {
    it('should add numbers', () => {
      expectTripleModeEquivalence(`
        const a = 10;
        const b = 5;
        const sum = a + b;
        console.log(sum);
      `);
    });

    it('should subtract numbers', () => {
      expectTripleModeEquivalence(`
        const a = 10;
        const b = 3;
        const diff = a - b;
        console.log(diff);
      `);
    });

    it('should multiply numbers', () => {
      expectTripleModeEquivalence(`
        const a = 6;
        const b = 7;
        const product = a * b;
        console.log(product);
      `);
    });

    it('should divide numbers evenly', () => {
      expectTripleModeEquivalence(`
        const a = 20;
        const b = 4;
        const quotient = a / b;
        console.log(quotient);
      `);
    });

    it('should handle modulo', () => {
      expectTripleModeEquivalence(`
        console.log(10 % 3);
        console.log(15 % 4);
        console.log(8 % 2);
      `);
    });
  });

  describe('Number Comparisons', () => {
    it('should compare with ===', () => {
      expectTripleModeEquivalence(`
        console.log(5 === 5);
        console.log(5 === 10);
        console.log(3.14 === 3.14);
      `);
    });

    it('should compare with !==', () => {
      expectTripleModeEquivalence(`
        console.log(5 !== 10);
        console.log(5 !== 5);
      `);
    });

    it('should compare with <', () => {
      expectTripleModeEquivalence(`
        console.log(3 < 5);
        console.log(5 < 3);
        console.log(5 < 5);
      `);
    });

    it('should compare with <=', () => {
      expectTripleModeEquivalence(`
        console.log(3 <= 5);
        console.log(5 <= 5);
        console.log(7 <= 5);
      `);
    });

    it('should compare with >', () => {
      expectTripleModeEquivalence(`
        console.log(5 > 3);
        console.log(3 > 5);
        console.log(5 > 5);
      `);
    });

    it('should compare with >=', () => {
      expectTripleModeEquivalence(`
        console.log(5 >= 3);
        console.log(5 >= 5);
        console.log(3 >= 5);
      `);
    });
  });

  describe('Number Type Consistency', () => {
    it('should maintain precision for exact divisions', () => {
      expectTripleModeEquivalence(`
        console.log(10 / 2);
        console.log(100 / 4);
        console.log(15 / 3);
      `);
    });

    it('should handle integer arithmetic', () => {
      expectTripleModeEquivalence(`
        const a = 5;
        const b = 3;
        console.log(a + b);
        console.log(a * b);
        console.log(a - b);
      `);
    });

    it('should handle decimal arithmetic', () => {
      expectTripleModeEquivalence(`
        const a = 2.5;
        const b = 1.5;
        console.log(a + b);
        console.log(a - b);
        console.log(a * 2);
      `);
    });
  });

  describe('Number Edge Cases', () => {
    it('should handle large numbers', () => {
      expectTripleModeEquivalence(`
        console.log(1000000);
        console.log(999999 + 1);
      `);
    });

    it('should handle very small decimals', () => {
      expectTripleModeEquivalence(`
        console.log(0.1);
        console.log(0.01);
        console.log(0.001);
      `);
    });
  });
});
