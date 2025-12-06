import { describe, it, expect } from 'vitest';
import { mergeMaps, mapMap } from '../src/merge-maps-gs';

describe('mergeMaps', () => {
  describe('basic operations', () => {
    it('merges two maps with no conflicts', () => {
      const map1 = new Map([['a', 1], ['b', 2]]);
      const map2 = new Map([['c', 3], ['d', 4]]);
      const merged = mergeMaps(map1, map2);
      
      expect(merged.size).toBe(4);
      expect(merged.get('a')).toBe(1);
      expect(merged.get('b')).toBe(2);
      expect(merged.get('c')).toBe(3);
      expect(merged.get('d')).toBe(4);
    });

    it('merges maps with conflicts - map2 wins by default', () => {
      const map1 = new Map([['a', 1], ['b', 2]]);
      const map2 = new Map([['b', 3], ['c', 4]]);
      const merged = mergeMaps(map1, map2);
      
      expect(merged.size).toBe(3);
      expect(merged.get('a')).toBe(1);
      expect(merged.get('b')).toBe(3); // map2 value wins
      expect(merged.get('c')).toBe(4);
    });

    it('uses custom merge function for conflicts', () => {
      const map1 = new Map([['a', 1], ['b', 2]]);
      const map2 = new Map([['b', 3], ['c', 4]]);
      const merged = mergeMaps(map1, map2, {
        value: (v1, v2) => v1 + v2
      });
      
      expect(merged.size).toBe(3);
      expect(merged.get('a')).toBe(1);
      expect(merged.get('b')).toBe(5); // 2 + 3
      expect(merged.get('c')).toBe(4);
    });

    it('preserves original maps unchanged', () => {
      const map1 = new Map([['a', 1]]);
      const map2 = new Map([['b', 2]]);
      const merged = mergeMaps(map1, map2);
      
      expect(map1.size).toBe(1);
      expect(map2.size).toBe(1);
      expect(merged.size).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('handles empty first map', () => {
      const map1 = new Map<string, number>();
      const map2 = new Map([['a', 1], ['b', 2]]);
      const merged = mergeMaps(map1, map2);
      
      expect(merged.size).toBe(2);
      expect(merged.get('a')).toBe(1);
      expect(merged.get('b')).toBe(2);
    });

    it('handles empty second map', () => {
      const map1 = new Map([['a', 1], ['b', 2]]);
      const map2 = new Map<string, number>();
      const merged = mergeMaps(map1, map2);
      
      expect(merged.size).toBe(2);
      expect(merged.get('a')).toBe(1);
      expect(merged.get('b')).toBe(2);
    });

    it('handles both maps empty', () => {
      const map1 = new Map<string, number>();
      const map2 = new Map<string, number>();
      const merged = mergeMaps(map1, map2);
      
      expect(merged.size).toBe(0);
    });

    it('handles all keys overlapping', () => {
      const map1 = new Map([['a', 1], ['b', 2]]);
      const map2 = new Map([['a', 3], ['b', 4]]);
      const merged = mergeMaps(map1, map2, {
        value: (v1, v2) => v1 * v2
      });
      
      expect(merged.size).toBe(2);
      expect(merged.get('a')).toBe(3); // 1 * 3
      expect(merged.get('b')).toBe(8); // 2 * 4
    });
  });

  describe('merge strategies', () => {
    it('can use max strategy', () => {
      const map1 = new Map([['a', 1], ['b', 5]]);
      const map2 = new Map([['a', 3], ['c', 2]]);
      const merged = mergeMaps(map1, map2, {
        value: (v1, v2) => Math.max(v1, v2)
      });
      
      expect(merged.get('a')).toBe(3);
      expect(merged.get('b')).toBe(5);
      expect(merged.get('c')).toBe(2);
    });

    it('can use min strategy', () => {
      const map1 = new Map([['a', 1], ['b', 5]]);
      const map2 = new Map([['a', 3], ['c', 2]]);
      const merged = mergeMaps(map1, map2, {
        value: (v1, v2) => Math.min(v1, v2)
      });
      
      expect(merged.get('a')).toBe(1);
      expect(merged.get('b')).toBe(5);
      expect(merged.get('c')).toBe(2);
    });

    it('can concatenate string values', () => {
      const map1 = new Map([['a', 'hello'], ['b', 'foo']]);
      const map2 = new Map([['a', 'world'], ['c', 'bar']]);
      const merged = mergeMaps(map1, map2, {
        value: (v1, v2) => v1 + ' ' + v2
      });
      
      expect(merged.get('a')).toBe('hello world');
      expect(merged.get('b')).toBe('foo');
      expect(merged.get('c')).toBe('bar');
    });

    it('can merge arrays', () => {
      const map1 = new Map([['a', [1, 2]], ['b', [3]]]);
      const map2 = new Map([['a', [4, 5]], ['c', [6]]]);
      const merged = mergeMaps(map1, map2, {
        value: (v1, v2) => [...v1, ...v2]
      });
      
      expect(merged.get('a')).toEqual([1, 2, 4, 5]);
      expect(merged.get('b')).toEqual([3]);
      expect(merged.get('c')).toEqual([6]);
    });
  });

  describe('with different key types', () => {
    it('works with number keys', () => {
      const map1 = new Map([[1, 'a'], [2, 'b']]);
      const map2 = new Map([[2, 'c'], [3, 'd']]);
      const merged = mergeMaps(map1, map2);
      
      expect(merged.get(1)).toBe('a');
      expect(merged.get(2)).toBe('c');
      expect(merged.get(3)).toBe('d');
    });

    it('works with object keys', () => {
      const key1 = { id: 1 };
      const key2 = { id: 2 };
      const map1 = new Map([[key1, 'a']]);
      const map2 = new Map([[key2, 'b']]);
      const merged = mergeMaps(map1, map2);
      
      expect(merged.get(key1)).toBe('a');
      expect(merged.get(key2)).toBe('b');
    });
  });
});

describe('mapMap', () => {
  describe('basic operations', () => {
    it('transforms values', () => {
      const map = new Map([['a', 1], ['b', 2], ['c', 3]]);
      const transformed = mapMap(map, {
        value: (k, v) => v * 2
      });
      
      expect(transformed.size).toBe(3);
      expect(transformed.get('a')).toBe(2);
      expect(transformed.get('b')).toBe(4);
      expect(transformed.get('c')).toBe(6);
    });

    it('transforms keys', () => {
      const map = new Map([['a', 1], ['b', 2], ['c', 3]]);
      const transformed = mapMap(map, {
        key: (k, v) => k.toUpperCase()
      });
      
      expect(transformed.size).toBe(3);
      expect(transformed.get('A')).toBe(1);
      expect(transformed.get('B')).toBe(2);
      expect(transformed.get('C')).toBe(3);
    });

    it('transforms both keys and values', () => {
      const map = new Map([['a', 1], ['b', 2], ['c', 3]]);
      const transformed = mapMap(map, {
        key: (k, v) => k.toUpperCase(),
        value: (k, v) => v * 2
      });
      
      expect(transformed.size).toBe(3);
      expect(transformed.get('A')).toBe(2);
      expect(transformed.get('B')).toBe(4);
      expect(transformed.get('C')).toBe(6);
    });

    it('returns copy when no transformations provided', () => {
      const map = new Map([['a', 1], ['b', 2]]);
      const transformed = mapMap(map);
      
      expect(transformed.size).toBe(2);
      expect(transformed.get('a')).toBe(1);
      expect(transformed.get('b')).toBe(2);
      expect(transformed).not.toBe(map);
    });

    it('preserves original map unchanged', () => {
      const map = new Map([['a', 1]]);
      const transformed = mapMap(map, { value: (k, v) => v * 2 });
      
      expect(map.get('a')).toBe(1);
      expect(transformed.get('a')).toBe(2);
    });
  });

  describe('value transformations', () => {
    it('can convert types', () => {
      const map = new Map([['a', 1], ['b', 2], ['c', 3]]);
      const transformed = mapMap(map, {
        value: (k, v) => v.toString()
      });
      
      expect(transformed.get('a')).toBe('1');
      expect(transformed.get('b')).toBe('2');
      expect(transformed.get('c')).toBe('3');
    });

    it('can use both key and value in transformation', () => {
      const map = new Map([['a', 1], ['b', 2], ['c', 3]]);
      const transformed = mapMap(map, {
        value: (k, v) => `${k}:${v}`
      });
      
      expect(transformed.get('a')).toBe('a:1');
      expect(transformed.get('b')).toBe('b:2');
      expect(transformed.get('c')).toBe('c:3');
    });

    it('can create objects from values', () => {
      const map = new Map([['a', 1], ['b', 2]]);
      const transformed = mapMap(map, {
        value: (k, v) => ({ key: k, value: v })
      });
      
      expect(transformed.get('a')).toEqual({ key: 'a', value: 1 });
      expect(transformed.get('b')).toEqual({ key: 'b', value: 2 });
    });
  });

  describe('key transformations', () => {
    it('can add prefixes to keys', () => {
      const map = new Map([['a', 1], ['b', 2]]);
      const transformed = mapMap(map, {
        key: (k, v) => 'prefix_' + k
      });
      
      expect(transformed.get('prefix_a')).toBe(1);
      expect(transformed.get('prefix_b')).toBe(2);
    });

    it('can convert key types', () => {
      const map = new Map([['1', 'a'], ['2', 'b']]);
      const transformed = mapMap(map, {
        key: (k, v) => parseInt(k, 10)
      });
      
      expect(transformed.get(1)).toBe('a');
      expect(transformed.get(2)).toBe('b');
    });

    it('can derive keys from values', () => {
      const map = new Map([['ignore', 'apple'], ['ignore2', 'banana']]);
      const transformed = mapMap(map, {
        key: (k, v) => v[0]
      });
      
      expect(transformed.get('a')).toBe('apple');
      expect(transformed.get('b')).toBe('banana');
    });
  });

  describe('edge cases', () => {
    it('handles empty map', () => {
      const map = new Map<string, number>();
      const transformed = mapMap(map, {
        value: (k, v) => v * 2
      });
      
      expect(transformed.size).toBe(0);
    });

    it('handles single entry', () => {
      const map = new Map([['a', 1]]);
      const transformed = mapMap(map, {
        key: (k, v) => k.toUpperCase(),
        value: (k, v) => v * 2
      });
      
      expect(transformed.size).toBe(1);
      expect(transformed.get('A')).toBe(2);
    });
  });

  describe('with different types', () => {
    it('can map string keys to number keys', () => {
      const map = new Map([['1', 'a'], ['2', 'b'], ['3', 'c']]);
      const transformed = mapMap(map, {
        key: (k, v) => parseInt(k, 10)
      });
      
      expect(transformed.get(1)).toBe('a');
      expect(transformed.get(2)).toBe('b');
      expect(transformed.get(3)).toBe('c');
    });

    it('can map number values to string values', () => {
      const map = new Map([[1, 100], [2, 200], [3, 300]]);
      const transformed = mapMap(map, {
        value: (k, v) => `$${v}`
      });
      
      expect(transformed.get(1)).toBe('$100');
      expect(transformed.get(2)).toBe('$200');
      expect(transformed.get(3)).toBe('$300');
    });
  });
});

describe('mergeMaps and mapMap integration', () => {
  it('can transform then merge', () => {
    const map1 = new Map([['a', 1], ['b', 2]]);
    const map2 = new Map([['c', 3], ['d', 4]]);
    
    const doubled1 = mapMap(map1, { value: (k, v) => v * 2 });
    const doubled2 = mapMap(map2, { value: (k, v) => v * 2 });
    const merged = mergeMaps(doubled1, doubled2);
    
    expect(merged.get('a')).toBe(2);
    expect(merged.get('b')).toBe(4);
    expect(merged.get('c')).toBe(6);
    expect(merged.get('d')).toBe(8);
  });

  it('can merge then transform', () => {
    const map1 = new Map([['a', 1], ['b', 2]]);
    const map2 = new Map([['b', 3], ['c', 4]]);
    
    const merged = mergeMaps(map1, map2, {
      value: (v1, v2) => v1 + v2
    });
    const transformed = mapMap(merged, {
      value: (k, v) => v * 10
    });
    
    expect(transformed.get('a')).toBe(10);
    expect(transformed.get('b')).toBe(50); // (2 + 3) * 10
    expect(transformed.get('c')).toBe(40);
  });
});
