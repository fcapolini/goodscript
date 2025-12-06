import { describe, it, expect } from 'vitest';
import { 
  partition, 
  chunk, 
  groupBy, 
  splitAt, 
  takeWhile, 
  dropWhile 
} from '../src/partition-gs.js';

describe('Partition utilities', () => {
  describe('partition', () => {
    it('splits by predicate', () => {
      const result = partition([1, 2, 3, 4, 5], x => x % 2 === 0);
      expect(result.matches).toEqual([2, 4]);
      expect(result.nonMatches).toEqual([1, 3, 5]);
    });

    it('handles all matches', () => {
      const result = partition([2, 4, 6], x => x % 2 === 0);
      expect(result.matches).toEqual([2, 4, 6]);
      expect(result.nonMatches).toEqual([]);
    });

    it('handles no matches', () => {
      const result = partition([1, 3, 5], x => x % 2 === 0);
      expect(result.matches).toEqual([]);
      expect(result.nonMatches).toEqual([1, 3, 5]);
    });

    it('handles empty array', () => {
      const result = partition([], x => x > 0);
      expect(result.matches).toEqual([]);
      expect(result.nonMatches).toEqual([]);
    });

    it('works with strings', () => {
      const result = partition(['apple', 'banana', 'avocado'], s => s.startsWith('a'));
      expect(result.matches).toEqual(['apple', 'avocado']);
      expect(result.nonMatches).toEqual(['banana']);
    });
  });

  describe('chunk', () => {
    it('splits array into chunks', () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
      expect(chunk([1, 2, 3, 4, 5, 6], 3)).toEqual([[1, 2, 3], [4, 5, 6]]);
    });

    it('handles exact division', () => {
      expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
    });

    it('handles chunk size larger than array', () => {
      expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
    });

    it('handles empty array', () => {
      expect(chunk([], 2)).toEqual([]);
    });

    it('throws on zero or negative size', () => {
      expect(() => chunk([1, 2], 0)).toThrow('Chunk size must be positive');
      expect(() => chunk([1, 2], -1)).toThrow('Chunk size must be positive');
    });

    it('handles single element chunks', () => {
      expect(chunk([1, 2, 3], 1)).toEqual([[1], [2], [3]]);
    });
  });

  describe('groupBy', () => {
    it('groups by key function', () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 30 },
        { name: 'Charlie', age: 25 }
      ];
      const grouped = groupBy(data, p => p.age);
      
      expect(grouped.get(30)).toHaveLength(2);
      expect(grouped.get(25)).toHaveLength(1);
      expect(grouped.get(30)).toContainEqual({ name: 'Alice', age: 30 });
      expect(grouped.get(30)).toContainEqual({ name: 'Bob', age: 30 });
    });

    it('groups strings by length', () => {
      const words = ['a', 'bb', 'ccc', 'dd', 'e'];
      const grouped = groupBy(words, w => w.length);
      
      expect(grouped.get(1)).toEqual(['a', 'e']);
      expect(grouped.get(2)).toEqual(['bb', 'dd']);
      expect(grouped.get(3)).toEqual(['ccc']);
    });

    it('handles empty array', () => {
      const grouped = groupBy([], x => x);
      expect(grouped.size).toBe(0);
    });

    it('handles single group', () => {
      const grouped = groupBy([1, 1, 1], x => x);
      expect(grouped.size).toBe(1);
      expect(grouped.get(1)).toEqual([1, 1, 1]);
    });
  });

  describe('splitAt', () => {
    it('splits at first match', () => {
      const [before, after] = splitAt([1, 2, 3, 4, 5], x => x === 3);
      expect(before).toEqual([1, 2]);
      expect(after).toEqual([4, 5]);
    });

    it('handles match at start', () => {
      const [before, after] = splitAt([1, 2, 3], x => x === 1);
      expect(before).toEqual([]);
      expect(after).toEqual([2, 3]);
    });

    it('handles match at end', () => {
      const [before, after] = splitAt([1, 2, 3], x => x === 3);
      expect(before).toEqual([1, 2]);
      expect(after).toEqual([]);
    });

    it('handles no match', () => {
      const [before, after] = splitAt([1, 2, 3], x => x === 5);
      expect(before).toEqual([1, 2, 3]);
      expect(after).toEqual([]);
    });

    it('handles empty array', () => {
      const [before, after] = splitAt([], x => x === 1);
      expect(before).toEqual([]);
      expect(after).toEqual([]);
    });
  });

  describe('takeWhile', () => {
    it('takes elements while predicate is true', () => {
      expect(takeWhile([1, 2, 3, 4, 1], x => x < 4)).toEqual([1, 2, 3]);
    });

    it('stops at first false', () => {
      expect(takeWhile([2, 4, 6, 7, 8], x => x % 2 === 0)).toEqual([2, 4, 6]);
    });

    it('handles all match', () => {
      expect(takeWhile([1, 2, 3], x => x < 10)).toEqual([1, 2, 3]);
    });

    it('handles no match', () => {
      expect(takeWhile([1, 2, 3], x => x > 10)).toEqual([]);
    });

    it('handles empty array', () => {
      expect(takeWhile([], x => true)).toEqual([]);
    });
  });

  describe('dropWhile', () => {
    it('drops elements while predicate is true', () => {
      expect(dropWhile([1, 2, 3, 4, 1], x => x < 3)).toEqual([3, 4, 1]);
    });

    it('stops dropping at first false', () => {
      expect(dropWhile([1, 3, 5, 6, 7], x => x % 2 !== 0)).toEqual([6, 7]);
    });

    it('handles all match', () => {
      expect(dropWhile([1, 2, 3], x => x < 10)).toEqual([]);
    });

    it('handles no match', () => {
      expect(dropWhile([1, 2, 3], x => x > 10)).toEqual([1, 2, 3]);
    });

    it('handles empty array', () => {
      expect(dropWhile([], x => true)).toEqual([]);
    });
  });

  describe('integration', () => {
    it('takeWhile and dropWhile are complementary', () => {
      const data = [1, 2, 3, 4, 5];
      const predicate = (x: number) => x < 3;
      const taken = takeWhile(data, predicate);
      const dropped = dropWhile(data, predicate);
      
      expect(taken).toEqual([1, 2]);
      expect(dropped).toEqual([3, 4, 5]);
      expect([...taken, ...dropped]).toEqual(data);
    });

    it('partition and filter are related', () => {
      const data = [1, 2, 3, 4, 5];
      const predicate = (x: number) => x % 2 === 0;
      const result = partition(data, predicate);
      
      expect(result.matches).toEqual(data.filter(predicate));
      expect(result.nonMatches).toEqual(data.filter(x => !predicate(x)));
    });
  });
});
