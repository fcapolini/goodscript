import { describe, it, expect } from 'vitest';
import { groupBy, lastBy } from '../src/group-by-gs';

describe('groupBy', () => {
  describe('basic operations', () => {
    it('groups strings by first character', () => {
      const words = ['apple', 'apricot', 'banana', 'blueberry', 'cherry'];
      const grouped = groupBy(words, word => word[0]);
      
      expect(grouped.size).toBe(3);
      expect(grouped.get('a')).toEqual(['apple', 'apricot']);
      expect(grouped.get('b')).toEqual(['banana', 'blueberry']);
      expect(grouped.get('c')).toEqual(['cherry']);
    });

    it('groups numbers by even/odd', () => {
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8];
      const grouped = groupBy(numbers, n => n % 2 === 0 ? 'even' : 'odd');
      
      expect(grouped.size).toBe(2);
      expect(grouped.get('even')).toEqual([2, 4, 6, 8]);
      expect(grouped.get('odd')).toEqual([1, 3, 5, 7]);
    });

    it('groups objects by property', () => {
      const users = [
        { name: 'Alice', role: 'admin' },
        { name: 'Bob', role: 'user' },
        { name: 'Charlie', role: 'admin' },
        { name: 'David', role: 'user' }
      ];
      const grouped = groupBy(users, user => user.role);
      
      expect(grouped.size).toBe(2);
      expect(grouped.get('admin')?.length).toBe(2);
      expect(grouped.get('user')?.length).toBe(2);
      expect(grouped.get('admin')?.[0].name).toBe('Alice');
      expect(grouped.get('admin')?.[1].name).toBe('Charlie');
    });

    it('maintains order within groups', () => {
      const items = [
        { category: 'A', value: 1 },
        { category: 'B', value: 2 },
        { category: 'A', value: 3 },
        { category: 'B', value: 4 },
        { category: 'A', value: 5 }
      ];
      const grouped = groupBy(items, item => item.category);
      
      const aValues = grouped.get('A')?.map(item => item.value);
      const bValues = grouped.get('B')?.map(item => item.value);
      
      expect(aValues).toEqual([1, 3, 5]);
      expect(bValues).toEqual([2, 4]);
    });
  });

  describe('edge cases', () => {
    it('handles empty iterable', () => {
      const grouped = groupBy([], () => 'key');
      
      expect(grouped.size).toBe(0);
    });

    it('handles single element', () => {
      const grouped = groupBy([42], n => `key${n}`);
      
      expect(grouped.size).toBe(1);
      expect(grouped.get('key42')).toEqual([42]);
    });

    it('handles all elements mapping to same key', () => {
      const numbers = [1, 2, 3, 4, 5];
      const grouped = groupBy(numbers, () => 'same');
      
      expect(grouped.size).toBe(1);
      expect(grouped.get('same')).toEqual([1, 2, 3, 4, 5]);
    });

    it('handles each element mapping to unique key', () => {
      const numbers = [1, 2, 3, 4, 5];
      const grouped = groupBy(numbers, n => `key${n}`);
      
      expect(grouped.size).toBe(5);
      expect(grouped.get('key1')).toEqual([1]);
      expect(grouped.get('key5')).toEqual([5]);
    });

    it('works with number keys', () => {
      const strings = ['a', 'ab', 'abc', 'xy', 'xyz'];
      const grouped = groupBy(strings, s => s.length);
      
      expect(grouped.size).toBe(3);
      expect(grouped.get(1)).toEqual(['a']);
      expect(grouped.get(2)).toEqual(['ab', 'xy']);
      expect(grouped.get(3)).toEqual(['abc', 'xyz']);
    });

    it('works with object keys (by reference)', () => {
      const key1 = { id: 1 };
      const key2 = { id: 2 };
      const items = [
        { key: key1, value: 'a' },
        { key: key2, value: 'b' },
        { key: key1, value: 'c' }
      ];
      const grouped = groupBy(items, item => item.key);
      
      expect(grouped.size).toBe(2);
      expect(grouped.get(key1)?.length).toBe(2);
      expect(grouped.get(key2)?.length).toBe(1);
    });
  });

  describe('with arrays', () => {
    it('groups array elements', () => {
      const arr = [1, 2, 3, 4, 5, 6];
      const grouped = groupBy(arr, n => n > 3 ? 'high' : 'low');
      
      expect(grouped.get('low')).toEqual([1, 2, 3]);
      expect(grouped.get('high')).toEqual([4, 5, 6]);
    });
  });

  describe('with sets', () => {
    it('groups set elements', () => {
      const set = new Set(['apple', 'apricot', 'banana']);
      const grouped = groupBy(set, word => word[0]);
      
      expect(grouped.size).toBe(2);
      expect(grouped.get('a')?.length).toBe(2);
      expect(grouped.get('b')?.length).toBe(1);
    });
  });
});

describe('lastBy', () => {
  describe('basic operations', () => {
    it('maps elements by key, keeping last value', () => {
      const words = ['apple', 'apricot', 'banana'];
      const lastByFirstChar = lastBy(words, word => word[0]);
      
      expect(lastByFirstChar.size).toBe(2);
      expect(lastByFirstChar.get('a')).toBe('apricot'); // Last one wins
      expect(lastByFirstChar.get('b')).toBe('banana');
    });

    it('updates with later values', () => {
      const users = [
        { id: 1, name: 'Alice', version: 1 },
        { id: 2, name: 'Bob', version: 1 },
        { id: 1, name: 'Alice Updated', version: 2 }
      ];
      const byId = lastBy(users, user => user.id);
      
      expect(byId.size).toBe(2);
      expect(byId.get(1)?.name).toBe('Alice Updated');
      expect(byId.get(1)?.version).toBe(2);
      expect(byId.get(2)?.name).toBe('Bob');
    });

    it('creates simple id-to-object mapping', () => {
      const items = [
        { id: 'A', value: 1 },
        { id: 'B', value: 2 },
        { id: 'C', value: 3 }
      ];
      const map = lastBy(items, item => item.id);
      
      expect(map.size).toBe(3);
      expect(map.get('A')?.value).toBe(1);
      expect(map.get('B')?.value).toBe(2);
      expect(map.get('C')?.value).toBe(3);
    });
  });

  describe('edge cases', () => {
    it('handles empty iterable', () => {
      const map = lastBy([], () => 'key');
      
      expect(map.size).toBe(0);
    });

    it('handles single element', () => {
      const map = lastBy([42], n => `key${n}`);
      
      expect(map.size).toBe(1);
      expect(map.get('key42')).toBe(42);
    });

    it('handles all elements mapping to same key', () => {
      const numbers = [1, 2, 3, 4, 5];
      const map = lastBy(numbers, () => 'same');
      
      expect(map.size).toBe(1);
      expect(map.get('same')).toBe(5); // Last element wins
    });

    it('handles each element mapping to unique key', () => {
      const numbers = [1, 2, 3, 4, 5];
      const map = lastBy(numbers, n => n);
      
      expect(map.size).toBe(5);
      expect(map.get(1)).toBe(1);
      expect(map.get(5)).toBe(5);
    });
  });

  describe('overwriting behavior', () => {
    it('correctly overwrites earlier values', () => {
      const data = [
        { key: 'x', value: 1 },
        { key: 'y', value: 2 },
        { key: 'x', value: 3 },
        { key: 'x', value: 4 }
      ];
      const map = lastBy(data, item => item.key);
      
      expect(map.size).toBe(2);
      expect(map.get('x')?.value).toBe(4);
      expect(map.get('y')?.value).toBe(2);
    });
  });

  describe('with arrays', () => {
    it('maps array elements', () => {
      const arr = [
        { id: 1, name: 'first' },
        { id: 2, name: 'second' },
        { id: 1, name: 'updated' }
      ];
      const map = lastBy(arr, item => item.id);
      
      expect(map.size).toBe(2);
      expect(map.get(1)?.name).toBe('updated');
    });
  });

  describe('with sets', () => {
    it('maps set elements', () => {
      const set = new Set(['a1', 'b2', 'a3']);
      const map = lastBy(set, str => str[0]);
      
      expect(map.size).toBe(2);
      expect(map.get('a')).toBe('a3');
      expect(map.get('b')).toBe('b2');
    });
  });
});

describe('groupBy vs lastBy comparison', () => {
  it('demonstrates the difference between groupBy and lastBy', () => {
    const items = [
      { category: 'A', value: 1 },
      { category: 'B', value: 2 },
      { category: 'A', value: 3 }
    ];
    
    const grouped = groupBy(items, item => item.category);
    const last = lastBy(items, item => item.category);
    
    // groupBy keeps all items
    expect(grouped.get('A')?.length).toBe(2);
    expect(grouped.get('A')?.[0].value).toBe(1);
    expect(grouped.get('A')?.[1].value).toBe(3);
    
    // lastBy keeps only the last item
    expect(last.get('A')?.value).toBe(3);
  });
});
