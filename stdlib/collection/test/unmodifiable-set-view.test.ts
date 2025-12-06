import { describe, it, expect } from 'vitest';
import { UnmodifiableSetView } from '../src/unmodifiable-set-view-gs.js';

describe('UnmodifiableSetView', () => {
  describe('constructor', () => {
    it('creates a view on a set', () => {
      const source = new Set<number>();
      source.add(1);
      source.add(2);
      const view = new UnmodifiableSetView(source);
      expect(view.getLength()).toBe(2);
      expect(view.contains(1)).toBe(true);
    });

    it('reflects changes to source set', () => {
      const source = new Set<number>();
      source.add(1);
      const view = new UnmodifiableSetView(source);
      source.add(2);
      expect(view.getLength()).toBe(2);
      expect(view.contains(2)).toBe(true);
    });
  });

  describe('getLength', () => {
    it('returns the number of elements', () => {
      expect(new UnmodifiableSetView(new Set<number>()).getLength()).toBe(0);
      
      const source1 = new Set<number>();
      source1.add(1);
      expect(new UnmodifiableSetView(source1).getLength()).toBe(1);
      
      const source2 = new Set<number>();
      source2.add(1);
      source2.add(2);
      source2.add(3);
      expect(new UnmodifiableSetView(source2).getLength()).toBe(3);
    });
  });

  describe('isEmpty/isNotEmpty', () => {
    it('isEmpty returns true for empty set', () => {
      const view = new UnmodifiableSetView(new Set<number>());
      expect(view.isEmpty()).toBe(true);
      expect(view.isNotEmpty()).toBe(false);
    });

    it('isEmpty returns false for non-empty set', () => {
      const source = new Set<number>();
      source.add(1);
      const view = new UnmodifiableSetView(source);
      expect(view.isEmpty()).toBe(false);
      expect(view.isNotEmpty()).toBe(true);
    });
  });

  describe('contains', () => {
    it('returns true if element exists', () => {
      const source = new Set<string>();
      source.add('a');
      source.add('b');
      const view = new UnmodifiableSetView(source);
      expect(view.contains('a')).toBe(true);
      expect(view.contains('b')).toBe(true);
    });

    it('returns false if element does not exist', () => {
      const source = new Set<string>();
      source.add('a');
      const view = new UnmodifiableSetView(source);
      expect(view.contains('b')).toBe(false);
    });
  });

  describe('containsAll', () => {
    it('returns true if all elements exist', () => {
      const source = new Set<number>();
      source.add(1);
      source.add(2);
      source.add(3);
      const view = new UnmodifiableSetView(source);
      expect(view.containsAll([1, 2])).toBe(true);
      expect(view.containsAll([1, 2, 3])).toBe(true);
    });

    it('returns false if any element missing', () => {
      const source = new Set<number>();
      source.add(1);
      source.add(2);
      const view = new UnmodifiableSetView(source);
      expect(view.containsAll([1, 2, 3])).toBe(false);
    });

    it('returns true for empty array', () => {
      const source = new Set<number>();
      source.add(1);
      const view = new UnmodifiableSetView(source);
      expect(view.containsAll([])).toBe(true);
    });
  });

  describe('toArray', () => {
    it('returns all elements as array', () => {
      const source = new Set<number>();
      source.add(1);
      source.add(2);
      source.add(3);
      const view = new UnmodifiableSetView(source);
      const arr = view.toArray();
      expect(arr.length).toBe(3);
      expect(arr).toContain(1);
      expect(arr).toContain(2);
      expect(arr).toContain(3);
    });

    it('returns empty array for empty set', () => {
      const view = new UnmodifiableSetView(new Set<number>());
      expect(view.toArray()).toEqual([]);
    });
  });

  describe('forEach', () => {
    it('calls action for each element', () => {
      const source = new Set<number>();
      source.add(1);
      source.add(2);
      source.add(3);
      const view = new UnmodifiableSetView(source);
      
      const elements: number[] = [];
      view.forEach((elem) => {
        elements.push(elem);
      });
      
      expect(elements.length).toBe(3);
      expect(elements).toContain(1);
      expect(elements).toContain(2);
      expect(elements).toContain(3);
    });
  });

  describe('lookup', () => {
    it('returns element if found', () => {
      const source = new Set<string>();
      source.add('a');
      source.add('b');
      const view = new UnmodifiableSetView(source);
      expect(view.lookup('a')).toBe('a');
      expect(view.lookup('b')).toBe('b');
    });

    it('returns undefined if not found', () => {
      const source = new Set<string>();
      source.add('a');
      const view = new UnmodifiableSetView(source);
      expect(view.lookup('b')).toBeUndefined();
    });
  });

  describe('difference', () => {
    it('returns elements not in other set', () => {
      const source = new Set<number>();
      source.add(1);
      source.add(2);
      source.add(3);
      const view = new UnmodifiableSetView(source);
      
      const other = new Set<number>();
      other.add(2);
      other.add(4);
      
      const diff = view.difference(other);
      expect(diff.size).toBe(2);
      expect(diff.has(1)).toBe(true);
      expect(diff.has(3)).toBe(true);
      expect(diff.has(2)).toBe(false);
    });
  });

  describe('intersection', () => {
    it('returns elements in both sets', () => {
      const source = new Set<number>();
      source.add(1);
      source.add(2);
      source.add(3);
      const view = new UnmodifiableSetView(source);
      
      const other = new Set<number>();
      other.add(2);
      other.add(3);
      other.add(4);
      
      const inter = view.intersection(other);
      expect(inter.size).toBe(2);
      expect(inter.has(2)).toBe(true);
      expect(inter.has(3)).toBe(true);
      expect(inter.has(1)).toBe(false);
    });
  });

  describe('union', () => {
    it('returns elements from both sets', () => {
      const source = new Set<number>();
      source.add(1);
      source.add(2);
      const view = new UnmodifiableSetView(source);
      
      const other = new Set<number>();
      other.add(2);
      other.add(3);
      
      const un = view.union(other);
      expect(un.size).toBe(3);
      expect(un.has(1)).toBe(true);
      expect(un.has(2)).toBe(true);
      expect(un.has(3)).toBe(true);
    });
  });

  describe('toString', () => {
    it('returns string representation', () => {
      const source = new Set<number>();
      source.add(1);
      source.add(2);
      const view = new UnmodifiableSetView(source);
      const str = view.toString();
      expect(str).toContain('1');
      expect(str).toContain('2');
    });
  });

  describe('mutation methods throw errors', () => {
    const source = new Set<number>();
    source.add(1);
    const view = new UnmodifiableSetView(source);

    it('add throws', () => {
      expect(() => view.add(2)).toThrow('Cannot modify an unmodifiable set');
    });

    it('addAll throws', () => {
      expect(() => view.addAll([2, 3])).toThrow('Cannot modify an unmodifiable set');
    });

    it('remove throws', () => {
      expect(() => view.remove(1)).toThrow('Cannot modify an unmodifiable set');
    });

    it('removeAll throws', () => {
      expect(() => view.removeAll([1])).toThrow('Cannot modify an unmodifiable set');
    });

    it('clear throws', () => {
      expect(() => view.clear()).toThrow('Cannot modify an unmodifiable set');
    });
  });

  describe('iterator protocol', () => {
    it('iterates over elements', () => {
      const source = new Set<number>();
      source.add(1);
      source.add(2);
      source.add(3);
      const view = new UnmodifiableSetView(source);

      const elements: number[] = [];
      for (const elem of view) {
        elements.push(elem);
      }

      expect(elements.length).toBe(3);
      expect(elements).toContain(1);
      expect(elements).toContain(2);
      expect(elements).toContain(3);
    });

    it('iterates over empty set', () => {
      const view = new UnmodifiableSetView(new Set<number>());
      const elements: number[] = [];
      for (const elem of view) {
        elements.push(elem);
      }
      expect(elements.length).toBe(0);
    });

    it('iterates over strings', () => {
      const source = new Set<string>();
      source.add('a');
      source.add('b');
      source.add('c');
      const view = new UnmodifiableSetView(source);

      const elements: string[] = [];
      for (const elem of view) {
        elements.push(elem);
      }

      expect(elements.length).toBe(3);
      expect(elements).toContain('a');
      expect(elements).toContain('b');
      expect(elements).toContain('c');
    });
  });

  describe('edge cases', () => {
    it('handles single element', () => {
      const source = new Set<number>();
      source.add(42);
      const view = new UnmodifiableSetView(source);
      expect(view.getLength()).toBe(1);
      expect(view.contains(42)).toBe(true);
    });

    it('handles complex element types', () => {
      const source = new Set<string>();
      source.add('alpha');
      source.add('beta');
      const view = new UnmodifiableSetView(source);
      expect(view.contains('alpha')).toBe(true);
      expect(view.contains('beta')).toBe(true);
    });
  });
});
