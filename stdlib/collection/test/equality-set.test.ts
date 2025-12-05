import { describe, it, expect } from 'vitest';
import { EqualitySet, Equality } from '../src/equality-set-gs.js';

// Custom equality for points
class Point {
  constructor(public x: number, public y: number) {}
}

class PointEquality implements Equality<Point> {
  equals(a: Point, b: Point): boolean {
    return a.x === b.x && a.y === b.y;
  }

  hash(p: Point): number {
    return p.x * 31 + p.y;
  }
}

describe('EqualitySet', () => {
  describe('constructor', () => {
    it('creates an empty set with default equality', () => {
      const set = new EqualitySet<number>();
      expect(set.isEmpty()).toBe(true);
      expect(set.getLength()).toBe(0);
    });

    it('creates an empty set with custom equality', () => {
      const set = new EqualitySet<Point>(new PointEquality());
      expect(set.isEmpty()).toBe(true);
    });
  });

  describe('from', () => {
    it('creates set from array with default equality', () => {
      const set = EqualitySet.from([1, 2, 3, 2, 1]);
      expect(set.getLength()).toBe(3);
      expect(set.contains(1)).toBe(true);
      expect(set.contains(2)).toBe(true);
      expect(set.contains(3)).toBe(true);
    });

    it('creates set from array with custom equality', () => {
      const points = [
        new Point(1, 2),
        new Point(3, 4),
        new Point(1, 2), // Duplicate
      ];
      const set = EqualitySet.from(points, new PointEquality());
      expect(set.getLength()).toBe(2);
    });
  });

  describe('add', () => {
    it('adds elements with default equality', () => {
      const set = new EqualitySet<number>();
      expect(set.add(1)).toBe(true);
      expect(set.add(2)).toBe(true);
      expect(set.add(1)).toBe(false); // Duplicate
      expect(set.getLength()).toBe(2);
    });

    it('adds elements with custom equality', () => {
      const set = new EqualitySet<Point>(new PointEquality());
      const p1 = new Point(1, 2);
      const p2 = new Point(1, 2); // Equal but different instance

      expect(set.add(p1)).toBe(true);
      expect(set.add(p2)).toBe(false); // Should be detected as duplicate
      expect(set.getLength()).toBe(1);
    });

    it('handles hash collisions', () => {
      // Create objects with same hash but different values
      class CollisionEquality implements Equality<number> {
        equals(a: number, b: number): boolean {
          return a === b;
        }
        hash(e: number): number {
          return 42; // Always same hash
        }
      }

      const set = new EqualitySet<number>(new CollisionEquality());
      expect(set.add(1)).toBe(true);
      expect(set.add(2)).toBe(true);
      expect(set.add(3)).toBe(true);
      expect(set.add(1)).toBe(false);
      expect(set.getLength()).toBe(3);
    });
  });

  describe('addAll', () => {
    it('adds multiple elements', () => {
      const set = new EqualitySet<number>();
      set.addAll([1, 2, 3, 2, 1]);
      expect(set.getLength()).toBe(3);
    });
  });

  describe('remove', () => {
    it('removes elements with default equality', () => {
      const set = EqualitySet.from([1, 2, 3]);
      expect(set.remove(2)).toBe(true);
      expect(set.remove(2)).toBe(false); // Already removed
      expect(set.getLength()).toBe(2);
      expect(set.contains(2)).toBe(false);
    });

    it('removes elements with custom equality', () => {
      const set = new EqualitySet<Point>(new PointEquality());
      const p1 = new Point(1, 2);
      set.add(p1);

      const p2 = new Point(1, 2); // Different instance, same value
      expect(set.remove(p2)).toBe(true);
      expect(set.isEmpty()).toBe(true);
    });

    it('returns false for non-existent element', () => {
      const set = EqualitySet.from([1, 2, 3]);
      expect(set.remove(99)).toBe(false);
    });
  });

  describe('contains', () => {
    it('checks existence with default equality', () => {
      const set = EqualitySet.from([1, 2, 3]);
      expect(set.contains(2)).toBe(true);
      expect(set.contains(99)).toBe(false);
    });

    it('checks existence with custom equality', () => {
      const set = new EqualitySet<Point>(new PointEquality());
      set.add(new Point(1, 2));

      expect(set.contains(new Point(1, 2))).toBe(true);
      expect(set.contains(new Point(3, 4))).toBe(false);
    });
  });

  describe('lookup', () => {
    it('finds equal element', () => {
      const set = new EqualitySet<Point>(new PointEquality());
      const p1 = new Point(1, 2);
      set.add(p1);

      const p2 = new Point(1, 2);
      const found = set.lookup(p2);
      expect(found).toBe(p1); // Returns the actual stored instance
    });

    it('returns null for non-existent element', () => {
      const set = EqualitySet.from([1, 2, 3]);
      expect(set.lookup(99)).toBe(null);
    });
  });

  describe('clear', () => {
    it('removes all elements', () => {
      const set = EqualitySet.from([1, 2, 3, 4, 5]);
      set.clear();
      expect(set.isEmpty()).toBe(true);
      expect(set.getLength()).toBe(0);
    });
  });

  describe('toArray', () => {
    it('returns all elements as array', () => {
      const set = EqualitySet.from([3, 1, 2]);
      const arr = set.toArray();
      expect(arr.length).toBe(3);
      expect(arr).toContain(1);
      expect(arr).toContain(2);
      expect(arr).toContain(3);
    });
  });

  describe('toString', () => {
    it('returns string representation', () => {
      const set = EqualitySet.from([1, 2, 3]);
      const str = set.toString();
      expect(str.startsWith('{')).toBe(true);
      expect(str.endsWith('}')).toBe(true);
    });
  });

  describe('union', () => {
    it('returns union of two sets', () => {
      const set1 = EqualitySet.from([1, 2, 3]);
      const set2 = EqualitySet.from([3, 4, 5]);
      const result = set1.union(set2);

      expect(result.getLength()).toBe(5);
      expect(result.contains(1)).toBe(true);
      expect(result.contains(5)).toBe(true);
    });
  });

  describe('intersection', () => {
    it('returns intersection of two sets', () => {
      const set1 = EqualitySet.from([1, 2, 3, 4]);
      const set2 = EqualitySet.from([3, 4, 5, 6]);
      const result = set1.intersection(set2);

      expect(result.getLength()).toBe(2);
      expect(result.contains(3)).toBe(true);
      expect(result.contains(4)).toBe(true);
      expect(result.contains(1)).toBe(false);
      expect(result.contains(5)).toBe(false);
    });
  });

  describe('difference', () => {
    it('returns difference of two sets', () => {
      const set1 = EqualitySet.from([1, 2, 3, 4]);
      const set2 = EqualitySet.from([3, 4, 5, 6]);
      const result = set1.difference(set2);

      expect(result.getLength()).toBe(2);
      expect(result.contains(1)).toBe(true);
      expect(result.contains(2)).toBe(true);
      expect(result.contains(3)).toBe(false);
      expect(result.contains(4)).toBe(false);
    });
  });

  describe('isEmpty/isNotEmpty', () => {
    it('returns correct values', () => {
      const set = new EqualitySet<number>();
      expect(set.isEmpty()).toBe(true);
      expect(set.isNotEmpty()).toBe(false);

      set.add(1);
      expect(set.isEmpty()).toBe(false);
      expect(set.isNotEmpty()).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles strings', () => {
      const set = EqualitySet.from(['a', 'b', 'c', 'a']);
      expect(set.getLength()).toBe(3);
      expect(set.contains('a')).toBe(true);
    });

    it('handles single element', () => {
      const set = EqualitySet.from([42]);
      expect(set.getLength()).toBe(1);
      expect(set.remove(42)).toBe(true);
      expect(set.isEmpty()).toBe(true);
    });

    it('handles null/undefined with default equality', () => {
      const set = new EqualitySet<number | null>();
      set.add(null);
      expect(set.contains(null)).toBe(true);
      expect(set.getLength()).toBe(1);
    });
  });

  describe('stress test', () => {
    it('handles many elements', () => {
      const set = new EqualitySet<number>();
      const n = 1000;

      for (let i = 0; i < n; i++) {
        set.add(i);
      }

      expect(set.getLength()).toBe(n);

      for (let i = 0; i < n; i++) {
        expect(set.contains(i)).toBe(true);
      }

      for (let i = 0; i < n / 2; i++) {
        set.remove(i);
      }

      expect(set.getLength()).toBe(n / 2);
    });
  });
});
