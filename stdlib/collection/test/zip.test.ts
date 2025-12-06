import { describe, it, expect } from 'vitest';
import { zip2, zip3, zipWith, enumerate, unzip, Zip2Iterable } from '../src/zip-gs.js';

describe('Zip utilities', () => {
  describe('zip2', () => {
    it('combines two arrays of equal length', () => {
      const result = zip2([1, 2, 3], ['a', 'b', 'c']);
      expect(result).toEqual([[1, 'a'], [2, 'b'], [3, 'c']]);
    });

    it('stops at shorter array', () => {
      expect(zip2([1, 2], ['a', 'b', 'c'])).toEqual([[1, 'a'], [2, 'b']]);
      expect(zip2([1, 2, 3], ['a', 'b'])).toEqual([[1, 'a'], [2, 'b']]);
    });

    it('handles empty arrays', () => {
      expect(zip2([], ['a', 'b'])).toEqual([]);
      expect(zip2([1, 2], [])).toEqual([]);
      expect(zip2([], [])).toEqual([]);
    });

    it('works with different types', () => {
      const result = zip2([true, false], [1, 2]);
      expect(result).toEqual([[true, 1], [false, 2]]);
    });
  });

  describe('zip3', () => {
    it('combines three arrays of equal length', () => {
      const result = zip3([1, 2], ['a', 'b'], [true, false]);
      expect(result).toEqual([[1, 'a', true], [2, 'b', false]]);
    });

    it('stops at shortest array', () => {
      expect(zip3([1], ['a', 'b'], [true, false])).toEqual([[1, 'a', true]]);
      expect(zip3([1, 2, 3], ['a'], [true, false])).toEqual([[1, 'a', true]]);
    });

    it('handles empty arrays', () => {
      expect(zip3([], ['a'], [true])).toEqual([]);
    });
  });

  describe('zipWith', () => {
    it('combines arrays with custom function', () => {
      const result = zipWith([1, 2, 3], [4, 5, 6], (a, b) => a + b);
      expect(result).toEqual([5, 7, 9]);
    });

    it('works with string concatenation', () => {
      const result = zipWith(['hello', 'good'], [' world', 'bye'], (a, b) => a + b);
      expect(result).toEqual(['hello world', 'goodbye']);
    });

    it('stops at shorter array', () => {
      const result = zipWith([1, 2], [3, 4, 5], (a, b) => a * b);
      expect(result).toEqual([3, 8]);
    });

    it('handles empty arrays', () => {
      const result = zipWith([], [1, 2], (a, b) => a + b);
      expect(result).toEqual([]);
    });
  });

  describe('enumerate', () => {
    it('pairs elements with indices', () => {
      const result = enumerate(['a', 'b', 'c']);
      expect(result).toEqual([[0, 'a'], [1, 'b'], [2, 'c']]);
    });

    it('works with numbers', () => {
      const result = enumerate([10, 20, 30]);
      expect(result).toEqual([[0, 10], [1, 20], [2, 30]]);
    });

    it('handles empty array', () => {
      expect(enumerate([])).toEqual([]);
    });

    it('handles single element', () => {
      expect(enumerate(['only'])).toEqual([[0, 'only']]);
    });
  });

  describe('unzip', () => {
    it('splits pairs into two arrays', () => {
      const [first, second] = unzip([[1, 'a'], [2, 'b'], [3, 'c']]);
      expect(first).toEqual([1, 2, 3]);
      expect(second).toEqual(['a', 'b', 'c']);
    });

    it('handles empty array', () => {
      const [first, second] = unzip([]);
      expect(first).toEqual([]);
      expect(second).toEqual([]);
    });

    it('handles single pair', () => {
      const [first, second] = unzip([[1, 'a']]);
      expect(first).toEqual([1]);
      expect(second).toEqual(['a']);
    });

    it('is inverse of zip2', () => {
      const original1 = [1, 2, 3];
      const original2 = ['a', 'b', 'c'];
      const zipped = zip2(original1, original2);
      const [unzipped1, unzipped2] = unzip(zipped);
      expect(unzipped1).toEqual(original1);
      expect(unzipped2).toEqual(original2);
    });
  });

  describe('Zip2Iterable', () => {
    it('iterates over zipped pairs', () => {
      const zipper = new Zip2Iterable([1, 2, 3], ['a', 'b', 'c']);
      const values: Array<[number, string]> = [];
      for (const pair of zipper) {
        values.push(pair);
      }
      expect(values).toEqual([[1, 'a'], [2, 'b'], [3, 'c']]);
    });

    it('stops at shorter array', () => {
      const zipper = new Zip2Iterable([1, 2], ['a', 'b', 'c']);
      const values: Array<[number, string]> = [];
      for (const pair of zipper) {
        values.push(pair);
      }
      expect(values).toEqual([[1, 'a'], [2, 'b']]);
    });

    it('handles empty arrays', () => {
      const zipper = new Zip2Iterable([], ['a', 'b']);
      const values: Array<[never, string]> = [];
      for (const pair of zipper) {
        values.push(pair);
      }
      expect(values).toEqual([]);
    });

    it('converts to array', () => {
      const zipper = new Zip2Iterable([1, 2], ['a', 'b']);
      expect(zipper.toArray()).toEqual([[1, 'a'], [2, 'b']]);
    });
  });

  describe('integration', () => {
    it('enumerate then unzip gives indices and values', () => {
      const data = ['a', 'b', 'c'];
      const enumerated = enumerate(data);
      const [indices, values] = unzip(enumerated);
      expect(indices).toEqual([0, 1, 2]);
      expect(values).toEqual(['a', 'b', 'c']);
    });

    it('zipWith can implement zip2', () => {
      const result = zipWith([1, 2], ['a', 'b'], (a, b) => [a, b] as [number, string]);
      expect(result).toEqual([[1, 'a'], [2, 'b']]);
    });
  });
});
