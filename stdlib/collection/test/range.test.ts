import { describe, it, expect } from 'vitest';
import { range, rangeCount, RangeIterable } from '../src/range-gs.js';

describe('Range utilities', () => {
  describe('range', () => {
    it('generates ascending range', () => {
      expect(range(0, 5)).toEqual([0, 1, 2, 3, 4]);
      expect(range(1, 4)).toEqual([1, 2, 3]);
    });

    it('generates range with custom step', () => {
      expect(range(0, 10, 2)).toEqual([0, 2, 4, 6, 8]);
      expect(range(1, 10, 3)).toEqual([1, 4, 7]);
    });

    it('generates descending range', () => {
      expect(range(10, 0, -1)).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
      expect(range(10, 0, -2)).toEqual([10, 8, 6, 4, 2]);
    });

    it('handles empty ranges', () => {
      expect(range(0, 0)).toEqual([]);
      expect(range(5, 0)).toEqual([]);
      expect(range(0, 5, -1)).toEqual([]);
    });

    it('throws on zero step', () => {
      expect(() => range(0, 5, 0)).toThrow('Step cannot be zero');
    });

    it('handles fractional step', () => {
      expect(range(0, 2, 0.5)).toEqual([0, 0.5, 1, 1.5]);
    });
  });

  describe('rangeCount', () => {
    it('generates range from 0 to count-1', () => {
      expect(rangeCount(5)).toEqual([0, 1, 2, 3, 4]);
      expect(rangeCount(3)).toEqual([0, 1, 2]);
    });

    it('handles zero count', () => {
      expect(rangeCount(0)).toEqual([]);
    });

    it('throws on negative count', () => {
      expect(() => rangeCount(-1)).toThrow('Count must be non-negative');
    });
  });

  describe('RangeIterable', () => {
    it('iterates over ascending range', () => {
      const r = new RangeIterable(0, 5);
      const values: number[] = [];
      for (const value of r) {
        values.push(value);
      }
      expect(values).toEqual([0, 1, 2, 3, 4]);
    });

    it('iterates over range with custom step', () => {
      const r = new RangeIterable(0, 10, 2);
      const values: number[] = [];
      for (const value of r) {
        values.push(value);
      }
      expect(values).toEqual([0, 2, 4, 6, 8]);
    });

    it('iterates over descending range', () => {
      const r = new RangeIterable(10, 0, -2);
      const values: number[] = [];
      for (const value of r) {
        values.push(value);
      }
      expect(values).toEqual([10, 8, 6, 4, 2]);
    });

    it('handles empty range', () => {
      const r = new RangeIterable(0, 0);
      const values: number[] = [];
      for (const value of r) {
        values.push(value);
      }
      expect(values).toEqual([]);
    });

    it('converts to array', () => {
      const r = new RangeIterable(1, 4);
      expect(r.toArray()).toEqual([1, 2, 3]);
    });

    it('calculates length correctly', () => {
      expect(new RangeIterable(0, 5).getLength()).toBe(5);
      expect(new RangeIterable(0, 10, 2).getLength()).toBe(5);
      expect(new RangeIterable(10, 0, -2).getLength()).toBe(5);
      expect(new RangeIterable(0, 0).getLength()).toBe(0);
    });

    it('throws on zero step', () => {
      expect(() => new RangeIterable(0, 5, 0)).toThrow('Step cannot be zero');
    });
  });

  describe('edge cases', () => {
    it('handles large ranges efficiently with RangeIterable', () => {
      const r = new RangeIterable(0, 10000);
      expect(r.getLength()).toBe(10000);
      
      // Iterate only first 10 (lazy evaluation benefit)
      const values: number[] = [];
      let count = 0;
      for (const value of r) {
        if (count++ >= 10) break;
        values.push(value);
      }
      expect(values).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('handles negative start and end', () => {
      expect(range(-5, 0)).toEqual([-5, -4, -3, -2, -1]);
      expect(range(-10, -5)).toEqual([-10, -9, -8, -7, -6]);
    });
  });
});
