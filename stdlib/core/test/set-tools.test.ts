import { describe, it, expect } from 'vitest';
import { SetTools } from '../src/set-tools-gs.js';

describe('SetTools', () => {
  describe('union', () => {
    it('should create union of sets', () => {
      const a = new Set([1, 2, 3]);
      const b = new Set([3, 4, 5]);
      const result = SetTools.union(a, b);
      expect(result.size).toBe(5);
      expect(result.has(1)).toBe(true);
      expect(result.has(5)).toBe(true);
    });

    it('should handle empty sets', () => {
      const a = new Set([1, 2]);
      const b = new Set<number>();
      expect(SetTools.union(a, b).size).toBe(2);
      expect(SetTools.union(b, a).size).toBe(2);
    });
  });

  describe('intersection', () => {
    it('should create intersection of sets', () => {
      const a = new Set([1, 2, 3]);
      const b = new Set([2, 3, 4]);
      const result = SetTools.intersection(a, b);
      expect(result.size).toBe(2);
      expect(result.has(2)).toBe(true);
      expect(result.has(3)).toBe(true);
    });

    it('should handle no overlap', () => {
      const a = new Set([1, 2]);
      const b = new Set([3, 4]);
      expect(SetTools.intersection(a, b).size).toBe(0);
    });
  });

  describe('difference', () => {
    it('should create difference of sets', () => {
      const a = new Set([1, 2, 3]);
      const b = new Set([2, 3, 4]);
      const result = SetTools.difference(a, b);
      expect(result.size).toBe(1);
      expect(result.has(1)).toBe(true);
    });

    it('should be asymmetric', () => {
      const a = new Set([1, 2, 3]);
      const b = new Set([2, 3, 4]);
      const aMinusB = SetTools.difference(a, b);
      const bMinusA = SetTools.difference(b, a);
      expect(aMinusB.has(1)).toBe(true);
      expect(bMinusA.has(4)).toBe(true);
    });
  });

  describe('symmetricDifference', () => {
    it('should create symmetric difference', () => {
      const a = new Set([1, 2, 3]);
      const b = new Set([2, 3, 4]);
      const result = SetTools.symmetricDifference(a, b);
      expect(result.size).toBe(2);
      expect(result.has(1)).toBe(true);
      expect(result.has(4)).toBe(true);
      expect(result.has(2)).toBe(false);
    });
  });

  describe('isSubset', () => {
    it('should check subset relationship', () => {
      const a = new Set([1, 2]);
      const b = new Set([1, 2, 3, 4]);
      expect(SetTools.isSubset(a, b)).toBe(true);
      expect(SetTools.isSubset(b, a)).toBe(false);
    });

    it('should handle equal sets', () => {
      const a = new Set([1, 2, 3]);
      const b = new Set([1, 2, 3]);
      expect(SetTools.isSubset(a, b)).toBe(true);
    });
  });

  describe('isSuperset', () => {
    it('should check superset relationship', () => {
      const a = new Set([1, 2, 3, 4]);
      const b = new Set([1, 2]);
      expect(SetTools.isSuperset(a, b)).toBe(true);
      expect(SetTools.isSuperset(b, a)).toBe(false);
    });
  });

  describe('isDisjoint', () => {
    it('should check if sets are disjoint', () => {
      const a = new Set([1, 2]);
      const b = new Set([3, 4]);
      expect(SetTools.isDisjoint(a, b)).toBe(true);
    });

    it('should return false for overlapping sets', () => {
      const a = new Set([1, 2, 3]);
      const b = new Set([3, 4, 5]);
      expect(SetTools.isDisjoint(a, b)).toBe(false);
    });
  });

  describe('toArray/fromArray', () => {
    it('should convert to array', () => {
      const set = new Set([1, 2, 3]);
      const arr = SetTools.toArray(set);
      expect(arr.length).toBe(3);
      expect(arr).toContain(1);
      expect(arr).toContain(3);
    });

    it('should create from array', () => {
      const arr = [1, 2, 2, 3];
      const set = SetTools.fromArray(arr);
      expect(set.size).toBe(3);
      expect(set.has(2)).toBe(true);
    });
  });

  describe('filter', () => {
    it('should filter set', () => {
      const set = new Set([1, 2, 3, 4, 5]);
      const result = SetTools.filter(set, x => x % 2 === 0);
      expect(result.size).toBe(2);
      expect(result.has(2)).toBe(true);
      expect(result.has(4)).toBe(true);
    });
  });

  describe('map', () => {
    it('should map set values', () => {
      const set = new Set([1, 2, 3]);
      const result = SetTools.map(set, x => x * 2);
      expect(result.size).toBe(3);
      expect(result.has(2)).toBe(true);
      expect(result.has(6)).toBe(true);
    });

    it('should handle duplicates after mapping', () => {
      const set = new Set([1, 2, 3]);
      const result = SetTools.map(set, x => Math.floor(x / 2));
      expect(result.size).toBe(2); // [0, 1, 1] -> {0, 1}
    });
  });
});
