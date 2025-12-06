import { describe, it, expect } from 'vitest';
import * as iter from '../src/iterable-extensions-gs';

describe('IterableExtensions', () => {
  describe('whereNot', () => {
    it('filters out elements that satisfy test', () => {
      const numbers = [1, 2, 3, 4, 5, 6];
      const odds = iter.whereNot(numbers, (n) => n % 2 === 0);
      expect(odds).toEqual([1, 3, 5]);
    });

    it('returns all elements when none satisfy test', () => {
      const numbers = [1, 3, 5];
      const result = iter.whereNot(numbers, (n) => n % 2 === 0);
      expect(result).toEqual([1, 3, 5]);
    });

    it('returns empty when all satisfy test', () => {
      const numbers = [2, 4, 6];
      const result = iter.whereNot(numbers, (n) => n % 2 === 0);
      expect(result).toEqual([]);
    });
  });

  describe('mapIndexed', () => {
    it('maps elements with their indices', () => {
      const letters = ['a', 'b', 'c'];
      const result = iter.mapIndexed(letters, (i, v) => `${i}:${v}`);
      expect(result).toEqual(['0:a', '1:b', '2:c']);
    });

    it('handles empty iterable', () => {
      const result = iter.mapIndexed([], (i, v) => `${i}:${v}`);
      expect(result).toEqual([]);
    });
  });

  describe('whereIndexed', () => {
    it('filters based on index and value', () => {
      const numbers = [10, 20, 30, 40, 50];
      const result = iter.whereIndexed(numbers, (i, v) => i % 2 === 0 && v > 20);
      expect(result).toEqual([30, 50]);
    });
  });

  describe('whereNotIndexed', () => {
    it('filters out elements based on index and value', () => {
      const numbers = [10, 20, 30, 40, 50];
      const result = iter.whereNotIndexed(numbers, (i, v) => i % 2 === 0);
      expect(result).toEqual([20, 40]);
    });
  });

  describe('forEachIndexed', () => {
    it('calls action with index and element', () => {
      const letters = ['a', 'b', 'c'];
      const collected: string[] = [];
      iter.forEachIndexed(letters, (i, v) => {
        collected.push(`${i}:${v}`);
      });
      expect(collected).toEqual(['0:a', '1:b', '2:c']);
    });
  });

  describe('firstWhereOrNull', () => {
    it('returns first matching element', () => {
      const numbers = [1, 2, 3, 4, 5];
      const result = iter.firstWhereOrNull(numbers, (n) => n > 3);
      expect(result).toBe(4);
    });

    it('returns null when no match', () => {
      const numbers = [1, 2, 3];
      const result = iter.firstWhereOrNull(numbers, (n) => n > 10);
      expect(result).toBe(null);
    });
  });

  describe('firstWhereIndexedOrNull', () => {
    it('returns first matching element by index and value', () => {
      const numbers = [10, 20, 30, 40];
      const result = iter.firstWhereIndexedOrNull(numbers, (i, v) => i > 1 && v > 25);
      expect(result).toBe(30);
    });

    it('returns null when no match', () => {
      const numbers = [10, 20, 30];
      const result = iter.firstWhereIndexedOrNull(numbers, (i, v) => i > 10);
      expect(result).toBe(null);
    });
  });

  describe('firstOrNull', () => {
    it('returns first element', () => {
      const numbers = [1, 2, 3];
      expect(iter.firstOrNull(numbers)).toBe(1);
    });

    it('returns null for empty iterable', () => {
      expect(iter.firstOrNull([])).toBe(null);
    });
  });

  describe('lastWhereOrNull', () => {
    it('returns last matching element', () => {
      const numbers = [1, 2, 3, 4, 5];
      const result = iter.lastWhereOrNull(numbers, (n) => n < 4);
      expect(result).toBe(3);
    });

    it('returns null when no match', () => {
      const numbers = [1, 2, 3];
      const result = iter.lastWhereOrNull(numbers, (n) => n > 10);
      expect(result).toBe(null);
    });
  });

  describe('lastWhereIndexedOrNull', () => {
    it('returns last matching element by index and value', () => {
      const numbers = [10, 20, 30, 40];
      const result = iter.lastWhereIndexedOrNull(numbers, (i, v) => i < 3 && v > 15);
      expect(result).toBe(30);
    });
  });

  describe('lastOrNull', () => {
    it('returns last element', () => {
      const numbers = [1, 2, 3];
      expect(iter.lastOrNull(numbers)).toBe(3);
    });

    it('returns null for empty iterable', () => {
      expect(iter.lastOrNull([])).toBe(null);
    });
  });

  describe('elementAtOrNull', () => {
    it('returns element at index', () => {
      const numbers = [10, 20, 30, 40];
      expect(iter.elementAtOrNull(numbers, 0)).toBe(10);
      expect(iter.elementAtOrNull(numbers, 2)).toBe(30);
      expect(iter.elementAtOrNull(numbers, 3)).toBe(40);
    });

    it('returns null for out of range index', () => {
      const numbers = [10, 20, 30];
      expect(iter.elementAtOrNull(numbers, 5)).toBe(null);
      expect(iter.elementAtOrNull(numbers, -1)).toBe(null);
    });
  });

  describe('none', () => {
    it('returns true when no elements satisfy test', () => {
      const numbers = [1, 3, 5];
      expect(iter.none(numbers, (n) => n % 2 === 0)).toBe(true);
    });

    it('returns false when at least one element satisfies test', () => {
      const numbers = [1, 2, 3];
      expect(iter.none(numbers, (n) => n % 2 === 0)).toBe(false);
    });

    it('returns true for empty iterable', () => {
      expect(iter.none([], (n) => n > 0)).toBe(true);
    });
  });

  describe('groupListsBy', () => {
    it('groups elements into lists by key', () => {
      const words = ['apple', 'apricot', 'banana', 'blueberry', 'cherry'];
      const grouped = iter.groupListsBy(words, (w) => w[0]);
      
      expect(grouped.get('a')).toEqual(['apple', 'apricot']);
      expect(grouped.get('b')).toEqual(['banana', 'blueberry']);
      expect(grouped.get('c')).toEqual(['cherry']);
    });

    it('handles numeric keys', () => {
      const numbers = [1, 2, 3, 4, 5, 6];
      const grouped = iter.groupListsBy(numbers, (n) => n % 2);
      
      expect(grouped.get(0)).toEqual([2, 4, 6]);
      expect(grouped.get(1)).toEqual([1, 3, 5]);
    });

    it('returns empty map for empty iterable', () => {
      const result = iter.groupListsBy([], (n) => n);
      expect(result.size).toBe(0);
    });
  });

  describe('groupSetsBy', () => {
    it('groups elements into sets by key', () => {
      const words = ['apple', 'apricot', 'banana', 'banana', 'cherry'];
      const grouped = iter.groupSetsBy(words, (w) => w[0]);
      
      expect(grouped.get('a')).toEqual(new Set(['apple', 'apricot']));
      expect(grouped.get('b')).toEqual(new Set(['banana']));
      expect(grouped.get('c')).toEqual(new Set(['cherry']));
    });

    it('removes duplicates within groups', () => {
      const numbers = [1, 1, 2, 2, 3, 3, 4, 4];
      const grouped = iter.groupSetsBy(numbers, (n) => n % 2);
      
      expect(grouped.get(0)).toEqual(new Set([2, 4]));
      expect(grouped.get(1)).toEqual(new Set([1, 3]));
    });
  });

  describe('slices', () => {
    it('splits into equal-sized chunks', () => {
      const numbers = [1, 2, 3, 4, 5, 6];
      const result = iter.slices(numbers, 2);
      expect(result).toEqual([[1, 2], [3, 4], [5, 6]]);
    });

    it('handles last chunk being smaller', () => {
      const numbers = [1, 2, 3, 4, 5];
      const result = iter.slices(numbers, 2);
      expect(result).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('handles chunk size larger than iterable', () => {
      const numbers = [1, 2, 3];
      const result = iter.slices(numbers, 5);
      expect(result).toEqual([[1, 2, 3]]);
    });

    it('throws for invalid length', () => {
      expect(() => iter.slices([1, 2, 3], 0)).toThrow();
      expect(() => iter.slices([1, 2, 3], -1)).toThrow();
    });
  });

  describe('flattened', () => {
    it('flattens nested arrays', () => {
      const nested = [[1, 2], [3, 4], [5, 6]];
      const result = iter.flattened(nested);
      expect(result).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('handles empty sub-arrays', () => {
      const nested = [[1], [], [2, 3], []];
      const result = iter.flattened(nested);
      expect(result).toEqual([1, 2, 3]);
    });

    it('handles empty iterable', () => {
      const result = iter.flattened([]);
      expect(result).toEqual([]);
    });
  });

  describe('minOrNull', () => {
    it('returns minimum value', () => {
      const numbers = [5, 2, 8, 1, 9];
      expect(iter.minOrNull(numbers)).toBe(1);
    });

    it('returns null for empty iterable', () => {
      expect(iter.minOrNull([])).toBe(null);
    });

    it('handles single element', () => {
      expect(iter.minOrNull([42])).toBe(42);
    });

    it('handles negative numbers', () => {
      expect(iter.minOrNull([5, -2, 8, -10, 3])).toBe(-10);
    });
  });

  describe('min', () => {
    it('returns minimum value', () => {
      const numbers = [5, 2, 8, 1, 9];
      expect(iter.min(numbers)).toBe(1);
    });

    it('throws for empty iterable', () => {
      expect(() => iter.min([])).toThrow();
    });
  });

  describe('maxOrNull', () => {
    it('returns maximum value', () => {
      const numbers = [5, 2, 8, 1, 9];
      expect(iter.maxOrNull(numbers)).toBe(9);
    });

    it('returns null for empty iterable', () => {
      expect(iter.maxOrNull([])).toBe(null);
    });

    it('handles single element', () => {
      expect(iter.maxOrNull([42])).toBe(42);
    });
  });

  describe('max', () => {
    it('returns maximum value', () => {
      const numbers = [5, 2, 8, 1, 9];
      expect(iter.max(numbers)).toBe(9);
    });

    it('throws for empty iterable', () => {
      expect(() => iter.max([])).toThrow();
    });
  });

  describe('sum', () => {
    it('returns sum of all elements', () => {
      const numbers = [1, 2, 3, 4, 5];
      expect(iter.sum(numbers)).toBe(15);
    });

    it('returns 0 for empty iterable', () => {
      expect(iter.sum([])).toBe(0);
    });

    it('handles negative numbers', () => {
      expect(iter.sum([5, -2, 3, -1])).toBe(5);
    });
  });

  describe('average', () => {
    it('returns average of all elements', () => {
      const numbers = [1, 2, 3, 4, 5];
      expect(iter.average(numbers)).toBe(3);
    });

    it('handles non-integer averages', () => {
      const numbers = [1, 2, 3, 4];
      expect(iter.average(numbers)).toBe(2.5);
    });

    it('throws for empty iterable', () => {
      expect(() => iter.average([])).toThrow();
    });
  });

  describe('count', () => {
    it('counts matching elements', () => {
      const numbers = [1, 2, 3, 4, 5, 6];
      expect(iter.count(numbers, (n) => n % 2 === 0)).toBe(3);
    });

    it('returns 0 when no matches', () => {
      const numbers = [1, 3, 5];
      expect(iter.count(numbers, (n) => n % 2 === 0)).toBe(0);
    });

    it('returns 0 for empty iterable', () => {
      expect(iter.count([], (n) => n > 0)).toBe(0);
    });
  });

  describe('integration tests', () => {
    it('chains multiple operations', () => {
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      // Get odd numbers, map with index, take first 3
      const odds = iter.whereNot(numbers, (n) => n % 2 === 0);
      const indexed = iter.mapIndexed(odds, (i, v) => `${i}:${v}`);
      const first3 = indexed.slice(0, 3);
      
      expect(first3).toEqual(['0:1', '1:3', '2:5']);
    });

    it('works with Set as iterable', () => {
      const set = new Set([1, 2, 3, 4, 5]);
      const doubled = iter.mapIndexed(set, (i, v) => v * 2);
      expect(doubled).toEqual([2, 4, 6, 8, 10]);
    });

    it('statistical operations on filtered data', () => {
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const evens = iter.whereNot(numbers, (n) => n % 2 !== 0);
      
      expect(iter.sum(evens)).toBe(30);
      expect(iter.average(evens)).toBe(6);
      expect(iter.min(evens)).toBe(2);
      expect(iter.max(evens)).toBe(10);
    });
  });
});
