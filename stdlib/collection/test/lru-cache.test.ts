import { describe, it, expect } from 'vitest';
import { LRUCache, type Loader } from '../src/lru-cache-gs';

describe('LRUCache', () => {
  describe('constructor', () => {
    it('creates cache with valid size', () => {
      const cache = new LRUCache<string, number>(5);
      expect(cache.getMaxSize()).toBe(5);
      expect(cache.getSize()).toBe(0);
      expect(cache.isEmpty()).toBe(true);
    });

    it('throws on invalid size', () => {
      expect(() => new LRUCache<string, number>(0)).toThrow(/positive/);
      expect(() => new LRUCache<string, number>(-1)).toThrow(/positive/);
    });
  });

  describe('basic operations', () => {
    it('sets and gets values', async () => {
      const cache = new LRUCache<string, number>(3);
      
      await cache.set('a', 1);
      await cache.set('b', 2);
      await cache.set('c', 3);
      
      expect(await cache.get('a')).toBe(1);
      expect(await cache.get('b')).toBe(2);
      expect(await cache.get('c')).toBe(3);
      expect(cache.getSize()).toBe(3);
    });

    it('returns null for missing keys', async () => {
      const cache = new LRUCache<string, number>(3);
      expect(await cache.get('missing')).toBe(null);
    });

    it('updates existing values', async () => {
      const cache = new LRUCache<string, number>(3);
      
      await cache.set('a', 1);
      expect(await cache.get('a')).toBe(1);
      
      await cache.set('a', 10);
      expect(await cache.get('a')).toBe(10);
      expect(cache.getSize()).toBe(1);
    });

    it('checks if key exists', async () => {
      const cache = new LRUCache<string, number>(3);
      
      await cache.set('a', 1);
      expect(cache.has('a')).toBe(true);
      expect(cache.has('missing')).toBe(false);
    });
  });

  describe('LRU eviction', () => {
    it('evicts least recently used when full', async () => {
      const cache = new LRUCache<string, number>(3);
      
      await cache.set('a', 1);
      await cache.set('b', 2);
      await cache.set('c', 3);
      
      // Cache is full, adding 'd' should evict 'a' (least recently used)
      await cache.set('d', 4);
      
      expect(await cache.get('a')).toBe(null); // Evicted
      expect(await cache.get('b')).toBe(2);
      expect(await cache.get('c')).toBe(3);
      expect(await cache.get('d')).toBe(4);
      expect(cache.getSize()).toBe(3);
    });

    it('updates access order on get', async () => {
      const cache = new LRUCache<string, number>(3);
      
      await cache.set('a', 1);
      await cache.set('b', 2);
      await cache.set('c', 3);
      
      // Access 'a', making it most recently used
      await cache.get('a');
      
      // Add 'd', should evict 'b' (now least recently used)
      await cache.set('d', 4);
      
      expect(await cache.get('a')).toBe(1);  // Still there
      expect(await cache.get('b')).toBe(null); // Evicted
      expect(await cache.get('c')).toBe(3);
      expect(await cache.get('d')).toBe(4);
    });

    it('updates access order on set', async () => {
      const cache = new LRUCache<string, number>(3);
      
      await cache.set('a', 1);
      await cache.set('b', 2);
      await cache.set('c', 3);
      
      // Update 'a', making it most recently used
      await cache.set('a', 10);
      
      // Add 'd', should evict 'b'
      await cache.set('d', 4);
      
      expect(await cache.get('a')).toBe(10);
      expect(await cache.get('b')).toBe(null); // Evicted
      expect(await cache.get('c')).toBe(3);
      expect(await cache.get('d')).toBe(4);
    });
  });

  describe('invalidation', () => {
    it('removes entries', async () => {
      const cache = new LRUCache<string, number>(3);
      
      await cache.set('a', 1);
      await cache.set('b', 2);
      
      const removed = await cache.invalidate('a');
      expect(removed).toBe(true);
      expect(await cache.get('a')).toBe(null);
      expect(cache.getSize()).toBe(1);
    });

    it('returns false for missing keys', async () => {
      const cache = new LRUCache<string, number>(3);
      const removed = await cache.invalidate('missing');
      expect(removed).toBe(false);
    });

    it('allows adding after invalidation', async () => {
      const cache = new LRUCache<string, number>(2);
      
      await cache.set('a', 1);
      await cache.set('b', 2);
      await cache.invalidate('a');
      await cache.set('c', 3);
      
      expect(await cache.get('a')).toBe(null);
      expect(await cache.get('b')).toBe(2);
      expect(await cache.get('c')).toBe(3);
      expect(cache.getSize()).toBe(2);
    });
  });

  describe('clear', () => {
    it('removes all entries', async () => {
      const cache = new LRUCache<string, number>(3);
      
      await cache.set('a', 1);
      await cache.set('b', 2);
      await cache.set('c', 3);
      
      await cache.clear();
      
      expect(cache.getSize()).toBe(0);
      expect(cache.isEmpty()).toBe(true);
      expect(await cache.get('a')).toBe(null);
      expect(await cache.get('b')).toBe(null);
      expect(await cache.get('c')).toBe(null);
    });

    it('allows adding after clear', async () => {
      const cache = new LRUCache<string, number>(3);
      
      await cache.set('a', 1);
      await cache.clear();
      await cache.set('b', 2);
      
      expect(await cache.get('b')).toBe(2);
      expect(cache.getSize()).toBe(1);
    });
  });

  describe('loader function', () => {
    it('loads value on cache miss', async () => {
      const cache = new LRUCache<string, number>(3);
      let loadCount = 0;
      
      const loader: Loader<string, number> = async (key: string) => {
        loadCount++;
        return key.length;
      };
      
      const value = await cache.get('hello', loader);
      
      expect(value).toBe(5);
      expect(loadCount).toBe(1);
      expect(cache.has('hello')).toBe(true);
    });

    it('does not load on cache hit', async () => {
      const cache = new LRUCache<string, number>(3);
      let loadCount = 0;
      
      await cache.set('hello', 10);
      
      const loader: Loader<string, number> = async (key: string) => {
        loadCount++;
        return key.length;
      };
      
      const value = await cache.get('hello', loader);
      
      expect(value).toBe(10); // Existing value, not loaded value
      expect(loadCount).toBe(0); // Loader not called
    });

    it('loader can perform async operations', async () => {
      const cache = new LRUCache<string, string>(3);
      
      const loader: Loader<string, string> = async (key: string) => {
        // Simulate async operation
        return `loaded:${key}`;
      };
      
      const value = await cache.get('test', loader);
      expect(value).toBe('loaded:test');
    });
  });

  describe('iteration', () => {
    it('gets keys in MRU order', async () => {
      const cache = new LRUCache<string, number>(3);
      
      await cache.set('a', 1);
      await cache.set('b', 2);
      await cache.set('c', 3);
      
      expect(cache.getKeys()).toEqual(['c', 'b', 'a']);
      
      // Access 'a', making it most recently used
      await cache.get('a');
      expect(cache.getKeys()).toEqual(['a', 'c', 'b']);
    });

    it('gets values in MRU order', async () => {
      const cache = new LRUCache<string, number>(3);
      
      await cache.set('a', 1);
      await cache.set('b', 2);
      await cache.set('c', 3);
      
      expect(cache.getValues()).toEqual([3, 2, 1]);
      
      await cache.get('a');
      expect(cache.getValues()).toEqual([1, 3, 2]);
    });

    it('gets entries in MRU order', async () => {
      const cache = new LRUCache<string, number>(3);
      
      await cache.set('a', 1);
      await cache.set('b', 2);
      await cache.set('c', 3);
      
      expect(cache.getEntries()).toEqual([
        ['c', 3],
        ['b', 2],
        ['a', 1]
      ]);
    });

    it('returns empty arrays when cache is empty', () => {
      const cache = new LRUCache<string, number>(3);
      
      expect(cache.getKeys()).toEqual([]);
      expect(cache.getValues()).toEqual([]);
      expect(cache.getEntries()).toEqual([]);
    });
  });

  describe('size tracking', () => {
    it('tracks size correctly', async () => {
      const cache = new LRUCache<string, number>(3);
      
      expect(cache.getSize()).toBe(0);
      expect(cache.isEmpty()).toBe(true);
      expect(cache.isFull()).toBe(false);
      
      await cache.set('a', 1);
      expect(cache.getSize()).toBe(1);
      expect(cache.isEmpty()).toBe(false);
      expect(cache.isFull()).toBe(false);
      
      await cache.set('b', 2);
      await cache.set('c', 3);
      expect(cache.getSize()).toBe(3);
      expect(cache.isFull()).toBe(true);
      
      await cache.set('d', 4); // Evicts one
      expect(cache.getSize()).toBe(3);
      expect(cache.isFull()).toBe(true);
      
      await cache.invalidate('b');
      expect(cache.getSize()).toBe(2);
      expect(cache.isFull()).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles single-entry cache', async () => {
      const cache = new LRUCache<string, number>(1);
      
      await cache.set('a', 1);
      expect(await cache.get('a')).toBe(1);
      
      await cache.set('b', 2); // Evicts 'a'
      expect(await cache.get('a')).toBe(null);
      expect(await cache.get('b')).toBe(2);
    });

    it('handles complex types as values', async () => {
      const cache = new LRUCache<string, { x: number; y: number }>(3);
      
      await cache.set('point1', { x: 1, y: 2 });
      await cache.set('point2', { x: 3, y: 4 });
      
      const value = await cache.get('point1');
      expect(value).not.toBe(null);
      if (value !== null) {
        expect(value.x).toBe(1);
        expect(value.y).toBe(2);
      }
    });

    it('handles number keys', async () => {
      const cache = new LRUCache<number, string>(3);
      
      await cache.set(1, 'one');
      await cache.set(2, 'two');
      
      expect(await cache.get(1)).toBe('one');
      expect(await cache.get(2)).toBe('two');
    });

    it('handles large cache', async () => {
      const cache = new LRUCache<number, number>(1000);
      
      // Fill cache
      for (let i = 0; i < 1000; i++) {
        await cache.set(i, i * 2);
      }
      
      expect(cache.getSize()).toBe(1000);
      expect(cache.isFull()).toBe(true);
      
      // Add one more, should evict oldest
      await cache.set(1000, 2000);
      expect(await cache.get(0)).toBe(null); // Evicted
      expect(await cache.get(1000)).toBe(2000);
      expect(cache.getSize()).toBe(1000);
    });
  });
});
