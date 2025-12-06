import { describe, it, expect } from 'vitest';
import { EqualityMap, Equality } from '../src/equality-map-gs.js';

// Custom equality for points
class Point {
  constructor(public x: number, public y: number) {}
  toString(): string {
    return `(${this.x},${this.y})`;
  }
}

class PointEquality implements Equality<Point> {
  equals(a: Point, b: Point): boolean {
    return a.x === b.x && a.y === b.y;
  }

  hash(p: Point): number {
    return p.x * 31 + p.y;
  }
}

describe('EqualityMap', () => {
  describe('constructor', () => {
    it('creates an empty map with default equality', () => {
      const map = new EqualityMap<string, number>();
      expect(map.isEmpty()).toBe(true);
      expect(map.getLength()).toBe(0);
    });

    it('creates an empty map with custom equality', () => {
      const map = new EqualityMap<Point, string>(new PointEquality());
      expect(map.isEmpty()).toBe(true);
    });
  });

  describe('fromEntries', () => {
    it('creates map from entries with default equality', () => {
      const map = EqualityMap.fromEntries([
        ['a', 1],
        ['b', 2],
        ['c', 3],
      ]);
      expect(map.getLength()).toBe(3);
      expect(map.get('a')).toBe(1);
      expect(map.get('b')).toBe(2);
    });

    it('creates map from entries with custom equality', () => {
      const entries: Array<[Point, string]> = [
        [new Point(1, 2), 'first'],
        [new Point(3, 4), 'second'],
      ];
      const map = EqualityMap.fromEntries(entries, new PointEquality());
      expect(map.getLength()).toBe(2);
    });
  });

  describe('set/get', () => {
    it('sets and gets values with default equality', () => {
      const map = new EqualityMap<string, number>();
      map.set('a', 1);
      map.set('b', 2);
      expect(map.get('a')).toBe(1);
      expect(map.get('b')).toBe(2);
      expect(map.get('c')).toBe(null);
    });

    it('sets and gets values with custom equality', () => {
      const map = new EqualityMap<Point, string>(new PointEquality());
      const p1 = new Point(1, 2);
      map.set(p1, 'first');

      const p2 = new Point(1, 2); // Equal but different instance
      expect(map.get(p2)).toBe('first');
    });

    it('updates existing key', () => {
      const map = new EqualityMap<string, number>();
      map.set('a', 1);
      map.set('a', 99);
      expect(map.get('a')).toBe(99);
      expect(map.getLength()).toBe(1);
    });

    it('handles hash collisions', () => {
      class CollisionEquality implements Equality<string> {
        equals(a: string, b: string): boolean {
          return a === b;
        }
        hash(k: string): number {
          return 42; // Always same hash
        }
      }

      const map = new EqualityMap<string, number>(new CollisionEquality());
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);
      expect(map.get('a')).toBe(1);
      expect(map.get('b')).toBe(2);
      expect(map.get('c')).toBe(3);
      expect(map.getLength()).toBe(3);
    });
  });

  describe('has', () => {
    it('checks key existence with default equality', () => {
      const map = new EqualityMap<string, number>();
      map.set('a', 1);
      expect(map.has('a')).toBe(true);
      expect(map.has('b')).toBe(false);
    });

    it('checks key existence with custom equality', () => {
      const map = new EqualityMap<Point, string>(new PointEquality());
      map.set(new Point(1, 2), 'value');

      expect(map.has(new Point(1, 2))).toBe(true);
      expect(map.has(new Point(3, 4))).toBe(false);
    });
  });

  describe('delete', () => {
    it('removes entries with default equality', () => {
      const map = new EqualityMap<string, number>();
      map.set('a', 1);
      map.set('b', 2);

      expect(map.delete('a')).toBe(true);
      expect(map.delete('a')).toBe(false); // Already removed
      expect(map.getLength()).toBe(1);
      expect(map.has('a')).toBe(false);
    });

    it('removes entries with custom equality', () => {
      const map = new EqualityMap<Point, string>(new PointEquality());
      map.set(new Point(1, 2), 'value');

      expect(map.delete(new Point(1, 2))).toBe(true);
      expect(map.isEmpty()).toBe(true);
    });

    it('returns false for non-existent key', () => {
      const map = new EqualityMap<string, number>();
      map.set('a', 1);
      expect(map.delete('b')).toBe(false);
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      const map = new EqualityMap<string, number>();
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);
      map.clear();
      expect(map.isEmpty()).toBe(true);
      expect(map.getLength()).toBe(0);
    });
  });

  describe('keys', () => {
    it('returns all keys', () => {
      const map = new EqualityMap<string, number>();
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);

      const keys = map.keys();
      expect(keys.length).toBe(3);
      expect(keys).toContain('a');
      expect(keys).toContain('b');
      expect(keys).toContain('c');
    });
  });

  describe('values', () => {
    it('returns all values', () => {
      const map = new EqualityMap<string, number>();
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);

      const values = map.values();
      expect(values.length).toBe(3);
      expect(values).toContain(1);
      expect(values).toContain(2);
      expect(values).toContain(3);
    });
  });

  describe('entries', () => {
    it('returns all entries', () => {
      const map = new EqualityMap<string, number>();
      map.set('a', 1);
      map.set('b', 2);

      const entries = map.entries();
      expect(entries.length).toBe(2);
      expect(entries).toContainEqual(['a', 1]);
      expect(entries).toContainEqual(['b', 2]);
    });
  });

  describe('forEach', () => {
    it('iterates over entries', () => {
      const map = new EqualityMap<string, number>();
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);

      const collected: Array<[string, number]> = [];
      map.forEach((value, key) => {
        collected.push([key, value]);
      });

      expect(collected.length).toBe(3);
    });
  });

  describe('toString', () => {
    it('returns string representation', () => {
      const map = new EqualityMap<string, number>();
      map.set('a', 1);
      map.set('b', 2);

      const str = map.toString();
      expect(str.startsWith('{')).toBe(true);
      expect(str.endsWith('}')).toBe(true);
    });
  });

  describe('isEmpty/isNotEmpty', () => {
    it('returns correct values', () => {
      const map = new EqualityMap<string, number>();
      expect(map.isEmpty()).toBe(true);
      expect(map.isNotEmpty()).toBe(false);

      map.set('a', 1);
      expect(map.isEmpty()).toBe(false);
      expect(map.isNotEmpty()).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles single entry', () => {
      const map = new EqualityMap<string, number>();
      map.set('a', 42);
      expect(map.get('a')).toBe(42);
      expect(map.delete('a')).toBe(true);
      expect(map.isEmpty()).toBe(true);
    });

    it('handles null/undefined keys with default equality', () => {
      const map = new EqualityMap<string | null, number>();
      map.set(null, 0);
      expect(map.get(null)).toBe(0);
      expect(map.has(null)).toBe(true);
    });

    it('handles overwriting with different value types', () => {
      const map = new EqualityMap<string, number | string>();
      map.set('a', 1);
      map.set('a', 'string');
      expect(map.get('a')).toBe('string');
    });
  });

  describe('stress test', () => {
    it('handles many entries', () => {
      const map = new EqualityMap<number, string>();
      const n = 1000;

      for (let i = 0; i < n; i++) {
        map.set(i, `value${i}`);
      }

      expect(map.getLength()).toBe(n);

      for (let i = 0; i < n; i++) {
        expect(map.get(i)).toBe(`value${i}`);
      }

      for (let i = 0; i < n / 2; i++) {
        map.delete(i);
      }

      expect(map.getLength()).toBe(n / 2);
    });
  });

  describe('iterator protocol', () => {
    it('iterates over entries in a map', () => {
      const map = new EqualityMap<string, number>();
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);

      const entries: Array<[string, number]> = [];
      for (const entry of map) {
        entries.push(entry);
      }

      expect(entries.length).toBe(3);
      // Convert to object for comparison (order may vary)
      const obj: Record<string, number> = {};
      for (const [key, value] of entries) {
        obj[key] = value;
      }
      expect(obj['a']).toBe(1);
      expect(obj['b']).toBe(2);
      expect(obj['c']).toBe(3);
    });

    it('iterates over empty map', () => {
      const map = new EqualityMap<string, number>();
      const entries: Array<[string, number]> = [];
      for (const entry of map) {
        entries.push(entry);
      }
      expect(entries.length).toBe(0);
    });

    it('iterates over map with custom equality', () => {
      const map = new EqualityMap<Point, string>(new PointEquality());
      const p1 = new Point(1, 2);
      const p2 = new Point(3, 4);
      map.set(p1, 'first');
      map.set(p2, 'second');

      const entries: Array<[Point, string]> = [];
      for (const entry of map) {
        entries.push(entry);
      }

      expect(entries.length).toBe(2);
      // Verify both points appear
      const hasP1 = entries.some(([k, v]) => k.x === 1 && k.y === 2 && v === 'first');
      const hasP2 = entries.some(([k, v]) => k.x === 3 && k.y === 4 && v === 'second');
      expect(hasP1).toBe(true);
      expect(hasP2).toBe(true);
    });
  });
});
