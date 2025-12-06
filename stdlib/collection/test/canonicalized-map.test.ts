import { describe, it, expect } from 'vitest';
import { CanonicalizedMap, MapEntry } from '../src/canonicalized-map-gs';

describe('CanonicalizedMap', () => {
  describe('constructor', () => {
    it('creates an empty map', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );
      expect(map.isEmpty()).toBe(true);
      expect(map.getLength()).toBe(0);
    });

    it('accepts custom isValidKey function', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase(),
        (key) => key.length > 0
      );
      map.set('', 1);
      expect(map.getLength()).toBe(0); // Empty string rejected
      
      map.set('A', 1);
      expect(map.getLength()).toBe(1);
    });
  });

  describe('from', () => {
    it('creates map from existing map', () => {
      const source = new Map<string, number>();
      source.set('Apple', 1);
      source.set('Banana', 2);
      source.set('Cherry', 3);

      const map = CanonicalizedMap.from(
        source,
        (key) => key.toLowerCase()
      );

      expect(map.getLength()).toBe(3);
      expect(map.get('apple')).toBe(1);
      expect(map.get('BANANA')).toBe(2);
      expect(map.get('ChErRy')).toBe(3);
    });

    it('handles duplicate canonical keys', () => {
      const source = new Map<string, number>();
      source.set('Apple', 1);
      source.set('APPLE', 2);
      source.set('apple', 3);

      const map = CanonicalizedMap.from(
        source,
        (key) => key.toLowerCase()
      );

      // Last write wins
      expect(map.getLength()).toBe(1);
      expect(map.get('Apple')).toBe(3);
    });
  });

  describe('fromEntries', () => {
    it('creates map from entries', () => {
      const entries = [
        new MapEntry('Apple', 1),
        new MapEntry('Banana', 2),
        new MapEntry('Cherry', 3)
      ];

      const map = CanonicalizedMap.fromEntries(
        entries,
        (key) => key.toLowerCase()
      );

      expect(map.getLength()).toBe(3);
      expect(map.get('apple')).toBe(1);
      expect(map.get('BANANA')).toBe(2);
    });
  });

  describe('case-insensitive string keys', () => {
    it('treats keys with same canonical form as equal', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      map.set('Apple', 1);
      expect(map.get('Apple')).toBe(1);
      expect(map.get('apple')).toBe(1);
      expect(map.get('APPLE')).toBe(1);
      expect(map.get('ApPlE')).toBe(1);
      expect(map.getLength()).toBe(1);
    });

    it('overwrites value for same canonical key', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      map.set('Apple', 1);
      map.set('APPLE', 2);
      map.set('apple', 3);

      expect(map.getLength()).toBe(1);
      expect(map.get('Apple')).toBe(3);
    });

    it('preserves original key casing', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      map.set('Apple', 1);
      map.set('BANANA', 2);

      const keys = map.getKeys();
      expect(keys).toContain('Apple');
      expect(keys).toContain('BANANA');
    });

    it('updates with last-set key casing', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      map.set('Apple', 1);
      map.set('APPLE', 2);

      const keys = map.getKeys();
      expect(keys.length).toBe(1);
      expect(keys[0]).toBe('APPLE'); // Last set wins for key casing
    });
  });

  describe('get/set', () => {
    it('returns null for missing keys', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      expect(map.get('missing')).toBe(null);
    });

    it('stores and retrieves values', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      map.set('One', 1);
      map.set('Two', 2);
      map.set('Three', 3);

      expect(map.get('one')).toBe(1);
      expect(map.get('TWO')).toBe(2);
      expect(map.get('Three')).toBe(3);
    });
  });

  describe('containsKey', () => {
    it('checks for key existence (canonicalized)', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      map.set('Apple', 1);

      expect(map.containsKey('Apple')).toBe(true);
      expect(map.containsKey('apple')).toBe(true);
      expect(map.containsKey('APPLE')).toBe(true);
      expect(map.containsKey('Banana')).toBe(false);
    });
  });

  describe('containsValue', () => {
    it('checks for value existence', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      map.set('A', 1);
      map.set('B', 2);

      expect(map.containsValue(1)).toBe(true);
      expect(map.containsValue(2)).toBe(true);
      expect(map.containsValue(3)).toBe(false);
    });
  });

  describe('remove', () => {
    it('removes entries by canonical key', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      map.set('Apple', 1);
      expect(map.getLength()).toBe(1);

      const removed = map.remove('APPLE');
      expect(removed).toBe(1);
      expect(map.getLength()).toBe(0);
      expect(map.containsKey('apple')).toBe(false);
    });

    it('returns null for non-existent keys', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      expect(map.remove('missing')).toBe(null);
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      map.set('A', 1);
      map.set('B', 2);
      map.set('C', 3);
      expect(map.getLength()).toBe(3);

      map.clear();
      expect(map.getLength()).toBe(0);
      expect(map.isEmpty()).toBe(true);
    });
  });

  describe('forEach', () => {
    it('iterates over all entries', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      map.set('A', 1);
      map.set('B', 2);
      map.set('C', 3);

      const collected: [string, number][] = [];
      map.forEach((k, v) => {
        collected.push([k, v]);
      });

      expect(collected.length).toBe(3);
      expect(collected).toContainEqual(['A', 1]);
      expect(collected).toContainEqual(['B', 2]);
      expect(collected).toContainEqual(['C', 3]);
    });
  });

  describe('getKeys/getValues/getEntries', () => {
    it('returns keys with original casing', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      map.set('Apple', 1);
      map.set('BANANA', 2);

      const keys = map.getKeys();
      expect(keys).toContain('Apple');
      expect(keys).toContain('BANANA');
    });

    it('returns values', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      map.set('A', 1);
      map.set('B', 2);

      const values = map.getValues();
      expect(values).toContain(1);
      expect(values).toContain(2);
    });

    it('returns entries', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      map.set('A', 1);
      map.set('B', 2);

      const entries = map.getEntries();
      expect(entries.length).toBe(2);
      
      const entryA = entries.find(e => e.key === 'A');
      expect(entryA?.value).toBe(1);
      
      const entryB = entries.find(e => e.key === 'B');
      expect(entryB?.value).toBe(2);
    });
  });

  describe('putIfAbsent', () => {
    it('adds value if key is absent', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      const result = map.putIfAbsent('Apple', () => 1);
      expect(result).toBe(1);
      expect(map.get('apple')).toBe(1);
    });

    it('returns existing value if key is present', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      map.set('Apple', 1);
      const result = map.putIfAbsent('APPLE', () => 2);
      expect(result).toBe(1); // Existing value
      expect(map.get('apple')).toBe(1);
    });

    it('does not call ifAbsent if key exists', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      map.set('Apple', 1);
      
      let called = false;
      map.putIfAbsent('APPLE', () => {
        called = true;
        return 2;
      });
      
      expect(called).toBe(false);
    });
  });

  describe('update', () => {
    it('updates existing value', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      map.set('Apple', 1);
      const result = map.update('APPLE', (v) => v + 10);
      
      expect(result).toBe(11);
      expect(map.get('apple')).toBe(11);
    });

    it('uses ifAbsent if key is missing', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      const result = map.update('Apple', (v) => v + 10, () => 5);
      
      expect(result).toBe(5);
      expect(map.get('apple')).toBe(5);
    });

    it('throws if key is missing and no ifAbsent', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      expect(() => {
        map.update('Apple', (v) => v + 10);
      }).toThrow();
    });
  });

  describe('updateAll', () => {
    it('updates all values', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      map.set('A', 1);
      map.set('B', 2);
      map.set('C', 3);

      map.updateAll((k, v) => v * 10);

      expect(map.get('a')).toBe(10);
      expect(map.get('b')).toBe(20);
      expect(map.get('c')).toBe(30);
    });
  });

  describe('removeWhere', () => {
    it('removes entries matching predicate', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      map.set('A', 1);
      map.set('B', 2);
      map.set('C', 3);
      map.set('D', 4);

      map.removeWhere((k, v) => v % 2 === 0);

      expect(map.getLength()).toBe(2);
      expect(map.containsKey('A')).toBe(true);
      expect(map.containsKey('B')).toBe(false);
      expect(map.containsKey('C')).toBe(true);
      expect(map.containsKey('D')).toBe(false);
    });
  });

  describe('copy', () => {
    it('creates independent copy', () => {
      const map1 = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      map1.set('Apple', 1);
      map1.set('Banana', 2);

      const map2 = map1.copy();

      expect(map2.getLength()).toBe(2);
      expect(map2.get('apple')).toBe(1);
      expect(map2.get('BANANA')).toBe(2);

      // Modify original
      map1.set('Cherry', 3);

      // Copy is independent
      expect(map1.getLength()).toBe(3);
      expect(map2.getLength()).toBe(2);
      expect(map2.containsKey('Cherry')).toBe(false);
    });
  });

  describe('toMap', () => {
    it('converts to regular Map with original keys', () => {
      const cmap = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      cmap.set('Apple', 1);
      cmap.set('BANANA', 2);

      const regularMap = cmap.toMap();

      expect(regularMap.size).toBe(2);
      expect(regularMap.get('Apple')).toBe(1);
      expect(regularMap.get('BANANA')).toBe(2);
      // Regular map is case-sensitive
      expect(regularMap.get('apple')).toBe(undefined);
    });
  });

  describe('toMapOfCanonicalKeys', () => {
    it('converts to Map with canonical keys', () => {
      const cmap = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      cmap.set('Apple', 1);
      cmap.set('BANANA', 2);

      const canonicalMap = cmap.toMapOfCanonicalKeys();

      expect(canonicalMap.size).toBe(2);
      expect(canonicalMap.get('apple')).toBe(1);
      expect(canonicalMap.get('banana')).toBe(2);
      // Original casing not present
      expect(canonicalMap.get('Apple')).toBe(undefined);
    });
  });

  describe('mapEntries', () => {
    it('transforms entries to new map', () => {
      const cmap = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      cmap.set('A', 1);
      cmap.set('B', 2);

      const result = cmap.mapEntries((k, v) => 
        new MapEntry(k + k, v * 10)
      );

      expect(result.size).toBe(2);
      expect(result.get('AA')).toBe(10);
      expect(result.get('BB')).toBe(20);
    });
  });

  describe('toString', () => {
    it('returns string representation', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      map.set('A', 1);
      map.set('B', 2);

      const str = map.toString();
      expect(str).toContain('A: 1');
      expect(str).toContain('B: 2');
    });

    it('handles empty map', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      expect(map.toString()).toBe('{}');
    });
  });

  describe('advanced canonicalization', () => {
    it('works with trimming whitespace', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.trim()
      );

      map.set('  Apple  ', 1);
      expect(map.get('Apple')).toBe(1);
      expect(map.get('  Apple')).toBe(1);
      expect(map.get('Apple  ')).toBe(1);
    });

    it('works with numeric string normalization', () => {
      const map = new CanonicalizedMap<number, string, string>(
        (key) => parseInt(key, 10)
      );

      map.set('01', 'one');
      map.set('001', 'also one');

      expect(map.get('1')).toBe('also one');
      expect(map.getLength()).toBe(1);
    });

    it('works with path normalization', () => {
      const normalizePath = (path: string): string => {
        return path.split('/').filter(p => p.length > 0).join('/');
      };

      const map = new CanonicalizedMap<string, string, string>(
        normalizePath
      );

      map.set('/path/to/file', 'value1');
      map.set('path//to///file/', 'value2');

      expect(map.getLength()).toBe(1);
      expect(map.get('path/to/file')).toBe('value2');
    });
  });

  describe('edge cases', () => {
    it('handles empty map operations', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      expect(map.isEmpty()).toBe(true);
      expect(map.isNotEmpty()).toBe(false);
      expect(map.getLength()).toBe(0);
      expect(map.getKeys()).toEqual([]);
      expect(map.getValues()).toEqual([]);
      expect(map.getEntries()).toEqual([]);
    });

    it('handles single element', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      map.set('Only', 42);

      expect(map.getLength()).toBe(1);
      expect(map.get('only')).toBe(42);
      expect(map.getKeys()).toEqual(['Only']);
      expect(map.getValues()).toEqual([42]);
    });

    it('handles many elements', () => {
      const map = new CanonicalizedMap<string, string, number>(
        (key) => key.toLowerCase()
      );

      for (let i = 0; i < 1000; i++) {
        map.set(`Key${i}`, i);
      }

      expect(map.getLength()).toBe(1000);
      
      for (let i = 0; i < 1000; i++) {
        expect(map.get(`key${i}`)).toBe(i);
      }
    });
  });
});
