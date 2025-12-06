import { describe, it, expect } from 'vitest';
import {
  binarySearch,
  lowerBound,
  reverse,
  shuffle,
  insertionSort,
  mergeSort,
} from '../src/algorithms-gs';

describe('Algorithms', () => {
  describe('binarySearch', () => {
    it('finds elements in sorted list', () => {
      const list = [1, 3, 5, 7, 9, 11, 13];
      expect(binarySearch(list, 1)).toBe(0);
      expect(binarySearch(list, 7)).toBe(3);
      expect(binarySearch(list, 13)).toBe(6);
    });

    it('returns -1 for missing elements', () => {
      const list = [1, 3, 5, 7, 9];
      expect(binarySearch(list, 0)).toBe(-1);
      expect(binarySearch(list, 4)).toBe(-1);
      expect(binarySearch(list, 10)).toBe(-1);
    });

    it('works with empty list', () => {
      const list: number[] = [];
      expect(binarySearch(list, 1)).toBe(-1);
    });

    it('works with single element', () => {
      expect(binarySearch([5], 5)).toBe(0);
      expect(binarySearch([5], 3)).toBe(-1);
    });

    it('works with custom comparator', () => {
      const list = ['a', 'c', 'e', 'g'];
      const cmp = (a: string, b: string) => a.localeCompare(b);
      expect(binarySearch(list, 'c', cmp)).toBe(1);
      expect(binarySearch(list, 'b', cmp)).toBe(-1);
    });

    it('works with descending order', () => {
      const list = [9, 7, 5, 3, 1];
      const descending = (a: number, b: number) => b - a;
      expect(binarySearch(list, 5, descending)).toBe(2);
      expect(binarySearch(list, 1, descending)).toBe(4);
    });
  });

  describe('lowerBound', () => {
    it('finds insertion point for existing elements', () => {
      const list = [1, 3, 5, 7, 9];
      expect(lowerBound(list, 5)).toBe(2); // Insert before existing 5
      expect(lowerBound(list, 1)).toBe(0);
      expect(lowerBound(list, 9)).toBe(4);
    });

    it('finds insertion point for missing elements', () => {
      const list = [1, 3, 5, 7, 9];
      expect(lowerBound(list, 0)).toBe(0);  // Before 1
      expect(lowerBound(list, 4)).toBe(2);  // Between 3 and 5
      expect(lowerBound(list, 6)).toBe(3);  // Between 5 and 7
      expect(lowerBound(list, 10)).toBe(5); // After 9
    });

    it('works with empty list', () => {
      const list: number[] = [];
      expect(lowerBound(list, 1)).toBe(0);
    });

    it('works with duplicates', () => {
      const list = [1, 3, 3, 3, 5, 7];
      expect(lowerBound(list, 3)).toBe(1); // First 3
    });

    it('works with custom comparator', () => {
      const list = ['a', 'c', 'e', 'g'];
      const cmp = (a: string, b: string) => a.localeCompare(b);
      expect(lowerBound(list, 'd', cmp)).toBe(2);
    });
  });

  describe('reverse', () => {
    it('reverses entire list', () => {
      const list = [1, 2, 3, 4, 5];
      reverse(list);
      expect(list).toEqual([5, 4, 3, 2, 1]);
    });

    it('reverses subrange', () => {
      const list = [1, 2, 3, 4, 5];
      reverse(list, 1, 4);
      expect(list).toEqual([1, 4, 3, 2, 5]);
    });

    it('works with empty list', () => {
      const list: number[] = [];
      reverse(list);
      expect(list).toEqual([]);
    });

    it('works with single element', () => {
      const list = [1];
      reverse(list);
      expect(list).toEqual([1]);
    });

    it('works with even-length list', () => {
      const list = [1, 2, 3, 4];
      reverse(list);
      expect(list).toEqual([4, 3, 2, 1]);
    });

    it('works with odd-length list', () => {
      const list = [1, 2, 3, 4, 5];
      reverse(list);
      expect(list).toEqual([5, 4, 3, 2, 1]);
    });
  });

  describe('shuffle', () => {
    it('shuffles list', () => {
      const list = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const original = [...list];
      shuffle(list);
      
      // Should contain same elements
      expect(list.sort((a, b) => a - b)).toEqual(original);
      
      // Probabilistically unlikely to be in same order
      // (would fail 1 in 3,628,800 times if truly random)
      // For deterministic testing, we just check it's a permutation
    });

    it('shuffles subrange', () => {
      const list = [1, 2, 3, 4, 5];
      const original = [...list];
      shuffle(list, 1, 4);
      
      // First and last elements should be unchanged
      expect(list[0]).toBe(1);
      expect(list[4]).toBe(5);
      
      // Middle elements should be permutation of [2, 3, 4]
      const middle = list.slice(1, 4).sort((a, b) => a - b);
      expect(middle).toEqual([2, 3, 4]);
    });

    it('works with empty list', () => {
      const list: number[] = [];
      shuffle(list);
      expect(list).toEqual([]);
    });

    it('works with single element', () => {
      const list = [1];
      shuffle(list);
      expect(list).toEqual([1]);
    });

    it('produces different results on repeated calls', () => {
      // Statistical test: shuffle 100 times, should not all be identical
      const results = new Set<string>();
      const list = [1, 2, 3, 4, 5];
      
      for (let i = 0; i < 100; i++) {
        const copy = [...list];
        shuffle(copy);
        results.add(copy.join(','));
      }
      
      // Should have multiple different permutations
      expect(results.size).toBeGreaterThan(1);
    });
  });

  describe('insertionSort', () => {
    it('sorts list', () => {
      const list = [5, 2, 8, 1, 9, 3, 7];
      insertionSort(list);
      expect(list).toEqual([1, 2, 3, 5, 7, 8, 9]);
    });

    it('sorts subrange', () => {
      const list = [1, 5, 2, 8, 3];
      insertionSort(list, undefined, 1, 4);
      expect(list).toEqual([1, 2, 5, 8, 3]);
    });

    it('works with already sorted list', () => {
      const list = [1, 2, 3, 4, 5];
      insertionSort(list);
      expect(list).toEqual([1, 2, 3, 4, 5]);
    });

    it('works with reverse sorted list', () => {
      const list = [5, 4, 3, 2, 1];
      insertionSort(list);
      expect(list).toEqual([1, 2, 3, 4, 5]);
    });

    it('works with duplicates', () => {
      const list = [3, 1, 4, 1, 5, 9, 2, 6, 5];
      insertionSort(list);
      expect(list).toEqual([1, 1, 2, 3, 4, 5, 5, 6, 9]);
    });

    it('works with custom comparator (descending)', () => {
      const list = [1, 5, 2, 8, 3];
      insertionSort(list, (a, b) => b - a);
      expect(list).toEqual([8, 5, 3, 2, 1]);
    });

    it('is stable', () => {
      interface Item { value: number; id: number; }
      const list: Item[] = [
        { value: 2, id: 1 },
        { value: 1, id: 2 },
        { value: 2, id: 3 },
        { value: 1, id: 4 },
      ];
      
      insertionSort(list, (a, b) => a.value - b.value);
      
      expect(list[0]).toEqual({ value: 1, id: 2 });
      expect(list[1]).toEqual({ value: 1, id: 4 });
      expect(list[2]).toEqual({ value: 2, id: 1 });
      expect(list[3]).toEqual({ value: 2, id: 3 });
    });

    it('works with empty list', () => {
      const list: number[] = [];
      insertionSort(list);
      expect(list).toEqual([]);
    });

    it('works with single element', () => {
      const list = [1];
      insertionSort(list);
      expect(list).toEqual([1]);
    });

    it('works with strings', () => {
      const list = ['dog', 'cat', 'elephant', 'bird'];
      insertionSort(list, (a, b) => a.localeCompare(b));
      expect(list).toEqual(['bird', 'cat', 'dog', 'elephant']);
    });
  });

  describe('mergeSort', () => {
    it('sorts list', () => {
      const list = [5, 2, 8, 1, 9, 3, 7, 4, 6];
      mergeSort(list);
      expect(list).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('sorts subrange', () => {
      const list = [1, 5, 2, 8, 3, 9];
      mergeSort(list, undefined, 1, 5);
      expect(list).toEqual([1, 2, 3, 5, 8, 9]);
    });

    it('works with already sorted list', () => {
      const list = [1, 2, 3, 4, 5];
      mergeSort(list);
      expect(list).toEqual([1, 2, 3, 4, 5]);
    });

    it('works with reverse sorted list', () => {
      const list = [5, 4, 3, 2, 1];
      mergeSort(list);
      expect(list).toEqual([1, 2, 3, 4, 5]);
    });

    it('works with duplicates', () => {
      const list = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5];
      mergeSort(list);
      expect(list).toEqual([1, 1, 2, 3, 3, 4, 5, 5, 5, 6, 9]);
    });

    it('works with custom comparator (descending)', () => {
      const list = [1, 5, 2, 8, 3, 7];
      mergeSort(list, (a, b) => b - a);
      expect(list).toEqual([8, 7, 5, 3, 2, 1]);
    });

    it('is stable', () => {
      interface Item { value: number; id: number; }
      const list: Item[] = [
        { value: 2, id: 1 },
        { value: 1, id: 2 },
        { value: 2, id: 3 },
        { value: 1, id: 4 },
        { value: 2, id: 5 },
      ];
      
      mergeSort(list, (a, b) => a.value - b.value);
      
      expect(list[0]).toEqual({ value: 1, id: 2 });
      expect(list[1]).toEqual({ value: 1, id: 4 });
      expect(list[2]).toEqual({ value: 2, id: 1 });
      expect(list[3]).toEqual({ value: 2, id: 3 });
      expect(list[4]).toEqual({ value: 2, id: 5 });
    });

    it('works with empty list', () => {
      const list: number[] = [];
      mergeSort(list);
      expect(list).toEqual([]);
    });

    it('works with single element', () => {
      const list = [1];
      mergeSort(list);
      expect(list).toEqual([1]);
    });

    it('works with large list', () => {
      // Test with 100 elements to ensure recursion works
      const list: number[] = [];
      for (let i = 100; i > 0; i--) {
        list.push(i);
      }
      
      mergeSort(list);
      
      for (let i = 0; i < 100; i++) {
        expect(list[i]).toBe(i + 1);
      }
    });

    it('works with strings', () => {
      const list = ['zebra', 'apple', 'mango', 'banana'];
      mergeSort(list, (a, b) => a.localeCompare(b));
      expect(list).toEqual(['apple', 'banana', 'mango', 'zebra']);
    });

    it('handles list crossing merge sort limit', () => {
      // Test with exactly 32 elements (MERGE_SORT_LIMIT)
      const list: number[] = [];
      for (let i = 32; i > 0; i--) {
        list.push(i);
      }
      
      mergeSort(list);
      
      for (let i = 0; i < 32; i++) {
        expect(list[i]).toBe(i + 1);
      }
    });
  });

  describe('edge cases', () => {
    it('all algorithms work with negative numbers', () => {
      const list = [-5, 3, -2, 8, -1];
      
      const sorted = [-5, -2, -1, 3, 8];
      
      const copy1 = [...list];
      insertionSort(copy1);
      expect(copy1).toEqual(sorted);
      
      const copy2 = [...list];
      mergeSort(copy2);
      expect(copy2).toEqual(sorted);
      
      expect(binarySearch(sorted, -2)).toBe(1);
      expect(lowerBound(sorted, -3)).toBe(1);
    });

    it('all algorithms work with floating point numbers', () => {
      const list = [3.14, 2.71, 1.41, 0.5, 2.0];
      
      const sorted = [0.5, 1.41, 2.0, 2.71, 3.14];
      
      const copy1 = [...list];
      insertionSort(copy1);
      expect(copy1).toEqual(sorted);
      
      const copy2 = [...list];
      mergeSort(copy2);
      expect(copy2).toEqual(sorted);
    });
  });

  describe('stress tests', () => {
    it('handles 1000 random elements', () => {
      const list: number[] = [];
      for (let i = 0; i < 1000; i++) {
        list.push(Math.floor(Math.random() * 1000));
      }
      
      const copy = [...list];
      mergeSort(copy);
      
      // Verify sorted
      for (let i = 1; i < copy.length; i++) {
        expect(copy[i]).toBeGreaterThanOrEqual(copy[i - 1]);
      }
      
      // Verify all elements present
      const sorted1 = [...list].sort((a, b) => a - b);
      expect(copy).toEqual(sorted1);
    });
  });
});
