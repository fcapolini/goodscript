import { describe, it, expect } from 'vitest';
import { ArrayTools } from '../src/array-tools-gs.js';

describe('ArrayTools', () => {
  describe('at/tryAt', () => {
    it('should get element at positive index', () => {
      const arr = [1, 2, 3, 4, 5];
      expect(ArrayTools.at(arr, 0)).toBe(1);
      expect(ArrayTools.at(arr, 2)).toBe(3);
      expect(ArrayTools.at(arr, 4)).toBe(5);
    });

    it('should get element at negative index', () => {
      const arr = [1, 2, 3, 4, 5];
      expect(ArrayTools.at(arr, -1)).toBe(5);
      expect(ArrayTools.at(arr, -2)).toBe(4);
      expect(ArrayTools.at(arr, -5)).toBe(1);
    });

    it('should throw on out of bounds index', () => {
      const arr = [1, 2, 3];
      expect(() => ArrayTools.at(arr, 3)).toThrow('Array index out of bounds');
      expect(() => ArrayTools.at(arr, -4)).toThrow('Array index out of bounds');
    });

    it('should return null on out of bounds index with tryAt', () => {
      const arr = [1, 2, 3];
      expect(ArrayTools.tryAt(arr, 3)).toBeNull();
      expect(ArrayTools.tryAt(arr, -4)).toBeNull();
    });
  });

  describe('first/tryFirst', () => {
    it('should get first element', () => {
      expect(ArrayTools.first([1, 2, 3])).toBe(1);
      expect(ArrayTools.first(['a', 'b'])).toBe('a');
    });

    it('should throw on empty array', () => {
      expect(() => ArrayTools.first([])).toThrow('Cannot get first element of empty array');
    });

    it('should return null on empty array with tryFirst', () => {
      expect(ArrayTools.tryFirst([])).toBeNull();
    });
  });

  describe('last/tryLast', () => {
    it('should get last element', () => {
      expect(ArrayTools.last([1, 2, 3])).toBe(3);
      expect(ArrayTools.last(['a', 'b'])).toBe('b');
    });

    it('should throw on empty array', () => {
      expect(() => ArrayTools.last([])).toThrow('Cannot get last element of empty array');
    });

    it('should return null on empty array with tryLast', () => {
      expect(ArrayTools.tryLast([])).toBeNull();
    });
  });

  describe('chunk', () => {
    it('should chunk array evenly', () => {
      const arr = [1, 2, 3, 4, 5, 6];
      expect(ArrayTools.chunk(arr, 2)).toEqual([[1, 2], [3, 4], [5, 6]]);
      expect(ArrayTools.chunk(arr, 3)).toEqual([[1, 2, 3], [4, 5, 6]]);
    });

    it('should handle uneven chunks', () => {
      const arr = [1, 2, 3, 4, 5];
      expect(ArrayTools.chunk(arr, 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should handle chunk size larger than array', () => {
      const arr = [1, 2];
      expect(ArrayTools.chunk(arr, 5)).toEqual([[1, 2]]);
    });

    it('should throw on invalid chunk size', () => {
      expect(() => ArrayTools.chunk([1, 2], 0)).toThrow('Chunk size must be positive');
      expect(() => ArrayTools.chunk([1, 2], -1)).toThrow('Chunk size must be positive');
    });
  });

  describe('zip', () => {
    it('should zip two arrays of same length', () => {
      const a = [1, 2, 3];
      const b = ['a', 'b', 'c'];
      expect(ArrayTools.zip(a, b)).toEqual([[1, 'a'], [2, 'b'], [3, 'c']]);
    });

    it('should zip arrays of different lengths', () => {
      const a = [1, 2, 3, 4];
      const b = ['a', 'b'];
      expect(ArrayTools.zip(a, b)).toEqual([[1, 'a'], [2, 'b']]);
    });

    it('should handle empty arrays', () => {
      expect(ArrayTools.zip([], [])).toEqual([]);
      expect(ArrayTools.zip([1, 2], [])).toEqual([]);
      expect(ArrayTools.zip([], ['a', 'b'])).toEqual([]);
    });
  });

  describe('range', () => {
    it('should create positive range', () => {
      expect(ArrayTools.range(0, 5)).toEqual([0, 1, 2, 3, 4]);
      expect(ArrayTools.range(1, 4)).toEqual([1, 2, 3]);
    });

    it('should create range with step', () => {
      expect(ArrayTools.range(0, 10, 2)).toEqual([0, 2, 4, 6, 8]);
      expect(ArrayTools.range(1, 10, 3)).toEqual([1, 4, 7]);
    });

    it('should create negative range', () => {
      expect(ArrayTools.range(5, 0, -1)).toEqual([5, 4, 3, 2, 1]);
      expect(ArrayTools.range(10, 0, -2)).toEqual([10, 8, 6, 4, 2]);
    });

    it('should throw on zero step', () => {
      expect(() => ArrayTools.range(0, 5, 0)).toThrow('Step cannot be zero');
    });

    it('should throw on invalid range direction', () => {
      expect(() => ArrayTools.range(0, 5, -1)).toThrow('Invalid range');
      expect(() => ArrayTools.range(5, 0, 1)).toThrow('Invalid range');
    });
  });

  describe('flatten', () => {
    it('should flatten nested arrays', () => {
      expect(ArrayTools.flatten([[1, 2], [3, 4], [5]])).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle empty nested arrays', () => {
      expect(ArrayTools.flatten([[], [1, 2], [], [3]])).toEqual([1, 2, 3]);
    });

    it('should handle empty array', () => {
      expect(ArrayTools.flatten([])).toEqual([]);
    });
  });

  describe('unique', () => {
    it('should remove duplicates', () => {
      expect(ArrayTools.unique([1, 2, 2, 3, 1, 4])).toEqual([1, 2, 3, 4]);
      expect(ArrayTools.unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
    });

    it('should preserve order of first occurrence', () => {
      expect(ArrayTools.unique([3, 1, 2, 1, 3])).toEqual([3, 1, 2]);
    });

    it('should handle empty array', () => {
      expect(ArrayTools.unique([])).toEqual([]);
    });

    it('should handle array with no duplicates', () => {
      expect(ArrayTools.unique([1, 2, 3])).toEqual([1, 2, 3]);
    });
  });

  describe('partition', () => {
    it('should partition by predicate', () => {
      const arr = [1, 2, 3, 4, 5, 6];
      const [even, odd] = ArrayTools.partition(arr, x => x % 2 === 0);
      expect(even).toEqual([2, 4, 6]);
      expect(odd).toEqual([1, 3, 5]);
    });

    it('should handle all truthy', () => {
      const arr = [2, 4, 6];
      const [even, odd] = ArrayTools.partition(arr, x => x % 2 === 0);
      expect(even).toEqual([2, 4, 6]);
      expect(odd).toEqual([]);
    });

    it('should handle all falsy', () => {
      const arr = [1, 3, 5];
      const [even, odd] = ArrayTools.partition(arr, x => x % 2 === 0);
      expect(even).toEqual([]);
      expect(odd).toEqual([1, 3, 5]);
    });

    it('should handle empty array', () => {
      const [even, odd] = ArrayTools.partition([], x => x % 2 === 0);
      expect(even).toEqual([]);
      expect(odd).toEqual([]);
    });
  });
});
