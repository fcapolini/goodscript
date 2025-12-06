import { describe, it, expect } from 'vitest';
import {
  binarySearch,
  binarySearchBy,
  lowerBound,
  lowerBoundBy,
  sortRange,
  sortByCompare,
  shuffleRange,
  reverseRange,
  swap,
  equals,
  elementAtOrNull,
  slice,
  type Equality,
} from '../src/list-extensions-gs';

describe('ListExtensions', () => {
  describe('binarySearch', () => {
    it('finds element in sorted list', () => {
      const list = [1, 3, 5, 7, 9];
      expect(binarySearch(list, 5, (a, b) => a - b)).toBe(2);
      expect(binarySearch(list, 1, (a, b) => a - b)).toBe(0);
      expect(binarySearch(list, 9, (a, b) => a - b)).toBe(4);
    });

    it('returns -1 for missing element', () => {
      const list = [1, 3, 5, 7, 9];
      expect(binarySearch(list, 4, (a, b) => a - b)).toBe(-1);
      expect(binarySearch(list, 0, (a, b) => a - b)).toBe(-1);
      expect(binarySearch(list, 10, (a, b) => a - b)).toBe(-1);
    });

    it('works with empty list', () => {
      const list: number[] = [];
      expect(binarySearch(list, 5, (a, b) => a - b)).toBe(-1);
    });

    it('works with single element', () => {
      const list = [5];
      expect(binarySearch(list, 5, (a, b) => a - b)).toBe(0);
      expect(binarySearch(list, 3, (a, b) => a - b)).toBe(-1);
    });
  });

  describe('binarySearchBy', () => {
    it('finds element by key', () => {
      const list = [
        { id: 1, name: 'Alice' },
        { id: 3, name: 'Bob' },
        { id: 5, name: 'Charlie' },
      ];
      expect(binarySearchBy(list, u => u.id, (a, b) => a - b, { id: 3, name: 'Bob' })).toBe(1);
    });

    it('returns -1 when key not found', () => {
      const list = [
        { id: 1, name: 'Alice' },
        { id: 3, name: 'Bob' },
      ];
      expect(binarySearchBy(list, u => u.id, (a, b) => a - b, { id: 2, name: 'X' })).toBe(-1);
    });
  });

  describe('lowerBound', () => {
    it('returns index of existing element', () => {
      const list = [1, 3, 5, 7, 9];
      expect(lowerBound(list, 5, (a, b) => a - b)).toBe(2);
    });

    it('returns insertion point for missing element', () => {
      const list = [1, 3, 5, 7, 9];
      expect(lowerBound(list, 4, (a, b) => a - b)).toBe(2);
      expect(lowerBound(list, 0, (a, b) => a - b)).toBe(0);
      expect(lowerBound(list, 10, (a, b) => a - b)).toBe(5);
    });

    it('works with duplicates', () => {
      const list = [1, 3, 3, 3, 5, 7];
      expect(lowerBound(list, 3, (a, b) => a - b)).toBe(1);
    });

    it('works with empty list', () => {
      const list: number[] = [];
      expect(lowerBound(list, 5, (a, b) => a - b)).toBe(0);
    });
  });

  describe('lowerBoundBy', () => {
    it('returns insertion point by key', () => {
      const list = [
        { id: 1, name: 'Alice' },
        { id: 3, name: 'Bob' },
        { id: 5, name: 'Charlie' },
      ];
      expect(lowerBoundBy(list, u => u.id, (a, b) => a - b, { id: 4, name: 'X' })).toBe(2);
      expect(lowerBoundBy(list, u => u.id, (a, b) => a - b, { id: 0, name: 'X' })).toBe(0);
    });
  });

  describe('sortRange', () => {
    it('sorts a subrange', () => {
      const list = [5, 3, 8, 1, 9, 2];
      sortRange(list, 1, 4, (a, b) => a - b);
      expect(list).toEqual([5, 1, 3, 8, 9, 2]);
    });

    it('sorts entire list when range covers all', () => {
      const list = [5, 3, 1, 4, 2];
      sortRange(list, 0, 5, (a, b) => a - b);
      expect(list).toEqual([1, 2, 3, 4, 5]);
    });

    it('handles empty range', () => {
      const list = [5, 3, 1];
      sortRange(list, 1, 1, (a, b) => a - b);
      expect(list).toEqual([5, 3, 1]);
    });

    it('throws on invalid range', () => {
      const list = [1, 2, 3];
      expect(() => sortRange(list, -1, 2, (a, b) => a - b)).toThrow();
      expect(() => sortRange(list, 0, 10, (a, b) => a - b)).toThrow();
      expect(() => sortRange(list, 2, 1, (a, b) => a - b)).toThrow();
    });
  });

  describe('sortByCompare', () => {
    it('sorts by key function', () => {
      const list = [
        { id: 3, name: 'C' },
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ];
      sortByCompare(list, u => u.id, (a, b) => a - b);
      expect(list[0].id).toBe(1);
      expect(list[1].id).toBe(2);
      expect(list[2].id).toBe(3);
    });

    it('sorts range only', () => {
      const list = [
        { id: 5, name: 'E' },
        { id: 3, name: 'C' },
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 4, name: 'D' },
      ];
      sortByCompare(list, u => u.id, (a, b) => a - b, 1, 4);
      expect(list.map(u => u.id)).toEqual([5, 1, 2, 3, 4]);
    });
  });

  describe('shuffleRange', () => {
    it('shuffles a subrange', () => {
      const list = [1, 2, 3, 4, 5, 6];
      const original = [...list];
      shuffleRange(list, 1, 5);
      
      // First and last elements unchanged
      expect(list[0]).toBe(original[0]);
      expect(list[5]).toBe(original[5]);
      
      // Middle elements are the same set (just reordered)
      const middle = list.slice(1, 5).sort((a, b) => a - b);
      expect(middle).toEqual([2, 3, 4, 5]);
    });

    it('handles single element range', () => {
      const list = [1, 2, 3];
      shuffleRange(list, 1, 2);
      expect(list).toEqual([1, 2, 3]);
    });
  });

  describe('reverseRange', () => {
    it('reverses a subrange', () => {
      const list = [1, 2, 3, 4, 5, 6];
      reverseRange(list, 1, 5);
      expect(list).toEqual([1, 5, 4, 3, 2, 6]);
    });

    it('reverses entire list', () => {
      const list = [1, 2, 3, 4, 5];
      reverseRange(list, 0, 5);
      expect(list).toEqual([5, 4, 3, 2, 1]);
    });

    it('handles empty range', () => {
      const list = [1, 2, 3];
      reverseRange(list, 1, 1);
      expect(list).toEqual([1, 2, 3]);
    });

    it('handles single element', () => {
      const list = [1, 2, 3];
      reverseRange(list, 1, 2);
      expect(list).toEqual([1, 2, 3]);
    });
  });

  describe('swap', () => {
    it('swaps two elements', () => {
      const list = [1, 2, 3, 4, 5];
      swap(list, 1, 3);
      expect(list).toEqual([1, 4, 3, 2, 5]);
    });

    it('handles swapping element with itself', () => {
      const list = [1, 2, 3];
      swap(list, 1, 1);
      expect(list).toEqual([1, 2, 3]);
    });

    it('throws on invalid indices', () => {
      const list = [1, 2, 3];
      expect(() => swap(list, -1, 1)).toThrow();
      expect(() => swap(list, 0, 10)).toThrow();
      expect(() => swap(list, 10, 0)).toThrow();
    });
  });

  describe('equals', () => {
    it('returns true for equal lists', () => {
      const list1 = [1, 2, 3];
      const list2 = [1, 2, 3];
      expect(equals(list1, list2)).toBe(true);
    });

    it('returns false for different lengths', () => {
      const list1 = [1, 2, 3];
      const list2 = [1, 2];
      expect(equals(list1, list2)).toBe(false);
    });

    it('returns false for different elements', () => {
      const list1 = [1, 2, 3];
      const list2 = [1, 2, 4];
      expect(equals(list1, list2)).toBe(false);
    });

    it('returns true for empty lists', () => {
      const list1: number[] = [];
      const list2: number[] = [];
      expect(equals(list1, list2)).toBe(true);
    });

    it('works with custom equality', () => {
      const list1 = ['hello', 'WORLD'];
      const list2 = ['HELLO', 'world'];
      
      const caseInsensitive: Equality<string> = {
        equals: (a, b) => a.toLowerCase() === b.toLowerCase(),
        hash: (s) => {
          let hash = 0;
          const lower = s.toLowerCase();
          for (let i = 0; i < lower.length; i++) {
            hash = ((hash << 5) - hash) + lower.charCodeAt(i);
            hash = hash & hash;
          }
          return hash;
        }
      };
      
      expect(equals(list1, list2, caseInsensitive)).toBe(true);
    });
  });

  describe('elementAtOrNull', () => {
    it('returns element at valid index', () => {
      const list = [1, 2, 3, 4, 5];
      expect(elementAtOrNull(list, 0)).toBe(1);
      expect(elementAtOrNull(list, 2)).toBe(3);
      expect(elementAtOrNull(list, 4)).toBe(5);
    });

    it('returns null for out of bounds', () => {
      const list = [1, 2, 3];
      expect(elementAtOrNull(list, -1)).toBe(null);
      expect(elementAtOrNull(list, 3)).toBe(null);
      expect(elementAtOrNull(list, 10)).toBe(null);
    });

    it('returns null for empty list', () => {
      const list: number[] = [];
      expect(elementAtOrNull(list, 0)).toBe(null);
    });
  });

  describe('slice', () => {
    it('creates a view of a subrange', () => {
      const list = [1, 2, 3, 4, 5];
      const view = slice(list, 1, 4);
      
      expect(view.getLength()).toBe(3);
      expect(view.get(0)).toBe(2);
      expect(view.get(1)).toBe(3);
      expect(view.get(2)).toBe(4);
    });

    it('reflects changes in original list', () => {
      const list = [1, 2, 3, 4, 5];
      const view = slice(list, 1, 4);
      
      list[2] = 99;
      expect(view.get(1)).toBe(99);
    });

    it('defaults end to list length', () => {
      const list = [1, 2, 3, 4, 5];
      const view = slice(list, 2);
      
      expect(view.getLength()).toBe(3);
      expect(view.toArray()).toEqual([3, 4, 5]);
    });

    it('handles empty slice', () => {
      const list = [1, 2, 3];
      const view = slice(list, 1, 1);
      
      expect(view.getLength()).toBe(0);
      expect(view.isEmpty()).toBe(true);
    });

    it('supports getFirst and getLast', () => {
      const list = [1, 2, 3, 4, 5];
      const view = slice(list, 1, 4);
      
      expect(view.getFirst()).toBe(2);
      expect(view.getLast()).toBe(4);
    });

    it('throws on getFirst/getLast when empty', () => {
      const list = [1, 2, 3];
      const view = slice(list, 1, 1);
      
      expect(() => view.getFirst()).toThrow();
      expect(() => view.getLast()).toThrow();
    });

    it('supports nested slicing', () => {
      const list = [1, 2, 3, 4, 5, 6, 7];
      const view1 = slice(list, 1, 6);  // [2, 3, 4, 5, 6]
      const view2 = view1.slice(1, 4);   // [3, 4, 5]
      
      expect(view2.getLength()).toBe(3);
      expect(view2.toArray()).toEqual([3, 4, 5]);
    });

    it('throws on concurrent modification', () => {
      const list = [1, 2, 3, 4, 5];
      const view = slice(list, 1, 4);
      
      list.push(6);  // Modify length
      expect(() => view.get(0)).toThrow(/concurrent modification/i);
    });

    it('throws on invalid index access', () => {
      const list = [1, 2, 3, 4, 5];
      const view = slice(list, 1, 4);
      
      expect(() => view.get(-1)).toThrow();
      expect(() => view.get(3)).toThrow();
    });

    it('throws on invalid range', () => {
      const list = [1, 2, 3];
      expect(() => slice(list, -1, 2)).toThrow();
      expect(() => slice(list, 0, 10)).toThrow();
      expect(() => slice(list, 2, 1)).toThrow();
    });
  });

  describe('edge cases', () => {
    it('handles large lists efficiently', () => {
      const large = Array.from({ length: 10000 }, (_, i) => i);
      
      // Binary search should be O(log n)
      expect(binarySearch(large, 5000, (a, b) => a - b)).toBe(5000);
      expect(binarySearch(large, 9999, (a, b) => a - b)).toBe(9999);
      expect(binarySearch(large, -1, (a, b) => a - b)).toBe(-1);
    });

    it('handles strings correctly', () => {
      const list = ['apple', 'banana', 'cherry', 'date', 'elderberry'];
      expect(binarySearch(list, 'cherry', (a, b) => a < b ? -1 : a > b ? 1 : 0)).toBe(2);
      
      reverseRange(list, 1, 4);
      expect(list).toEqual(['apple', 'date', 'cherry', 'banana', 'elderberry']);
    });

    it('handles objects with deep comparison', () => {
      const list = [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
        { x: 5, y: 6 },
      ];
      
      const objectEquality: Equality<{ x: number; y: number }> = {
        equals: (a, b) => a.x === b.x && a.y === b.y,
        hash: (o) => o.x * 31 + o.y,
      };
      
      const list2 = [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
        { x: 5, y: 6 },
      ];
      
      expect(equals(list, list2, objectEquality)).toBe(true);
      
      list2[1].y = 99;
      expect(equals(list, list2, objectEquality)).toBe(false);
    });
  });
});
