import { describe, it, expect } from 'vitest';
import { UnmodifiableMapView } from '../src/unmodifiable-map-view-gs.js';

describe('UnmodifiableMapView', () => {
  describe('constructor', () => {
    it('creates a view on a map', () => {
      const source = new Map<string, number>();
      source.set('a', 1);
      source.set('b', 2);
      const view = new UnmodifiableMapView(source);
      expect(view.getLength()).toBe(2);
      expect(view.get('a')).toBe(1);
    });

    it('reflects changes to source map', () => {
      const source = new Map<string, number>();
      source.set('a', 1);
      const view = new UnmodifiableMapView(source);
      source.set('b', 2);
      expect(view.getLength()).toBe(2);
      expect(view.get('b')).toBe(2);
    });
  });

  describe('get', () => {
    it('returns value for key', () => {
      const source = new Map<string, number>();
      source.set('x', 10);
      source.set('y', 20);
      const view = new UnmodifiableMapView(source);
      expect(view.get('x')).toBe(10);
      expect(view.get('y')).toBe(20);
    });

    it('returns undefined for missing key', () => {
      const source = new Map<string, number>();
      source.set('a', 1);
      const view = new UnmodifiableMapView(source);
      expect(view.get('b')).toBeUndefined();
    });
  });

  describe('getLength', () => {
    it('returns the number of entries', () => {
      const view1 = new UnmodifiableMapView(new Map<string, number>());
      expect(view1.getLength()).toBe(0);

      const source2 = new Map<string, number>();
      source2.set('a', 1);
      const view2 = new UnmodifiableMapView(source2);
      expect(view2.getLength()).toBe(1);

      const source3 = new Map<string, number>();
      source3.set('a', 1);
      source3.set('b', 2);
      source3.set('c', 3);
      const view3 = new UnmodifiableMapView(source3);
      expect(view3.getLength()).toBe(3);
    });
  });

  describe('isEmpty/isNotEmpty', () => {
    it('isEmpty returns true for empty map', () => {
      const view = new UnmodifiableMapView(new Map<string, number>());
      expect(view.isEmpty()).toBe(true);
      expect(view.isNotEmpty()).toBe(false);
    });

    it('isEmpty returns false for non-empty map', () => {
      const source = new Map<string, number>();
      source.set('a', 1);
      const view = new UnmodifiableMapView(source);
      expect(view.isEmpty()).toBe(false);
      expect(view.isNotEmpty()).toBe(true);
    });
  });

  describe('containsKey', () => {
    it('returns true if key exists', () => {
      const source = new Map<string, number>();
      source.set('a', 1);
      source.set('b', 2);
      const view = new UnmodifiableMapView(source);
      expect(view.containsKey('a')).toBe(true);
      expect(view.containsKey('b')).toBe(true);
    });

    it('returns false if key does not exist', () => {
      const source = new Map<string, number>();
      source.set('a', 1);
      const view = new UnmodifiableMapView(source);
      expect(view.containsKey('b')).toBe(false);
    });
  });

  describe('containsValue', () => {
    it('returns true if value exists', () => {
      const source = new Map<string, number>();
      source.set('a', 1);
      source.set('b', 2);
      const view = new UnmodifiableMapView(source);
      expect(view.containsValue(1)).toBe(true);
      expect(view.containsValue(2)).toBe(true);
    });

    it('returns false if value does not exist', () => {
      const source = new Map<string, number>();
      source.set('a', 1);
      const view = new UnmodifiableMapView(source);
      expect(view.containsValue(2)).toBe(false);
    });
  });

  describe('keys', () => {
    it('returns all keys as array', () => {
      const source = new Map<string, number>();
      source.set('a', 1);
      source.set('b', 2);
      source.set('c', 3);
      const view = new UnmodifiableMapView(source);
      const keys = view.keys();
      expect(keys.length).toBe(3);
      expect(keys).toContain('a');
      expect(keys).toContain('b');
      expect(keys).toContain('c');
    });
  });

  describe('values', () => {
    it('returns all values as array', () => {
      const source = new Map<string, number>();
      source.set('a', 1);
      source.set('b', 2);
      source.set('c', 3);
      const view = new UnmodifiableMapView(source);
      const values = view.values();
      expect(values.length).toBe(3);
      expect(values).toContain(1);
      expect(values).toContain(2);
      expect(values).toContain(3);
    });
  });

  describe('entries', () => {
    it('returns all entries as array', () => {
      const source = new Map<string, number>();
      source.set('a', 1);
      source.set('b', 2);
      const view = new UnmodifiableMapView(source);
      const entries = view.entries();
      expect(entries.length).toBe(2);
      expect(entries).toContainEqual(['a', 1]);
      expect(entries).toContainEqual(['b', 2]);
    });
  });

  describe('forEach', () => {
    it('calls action for each entry', () => {
      const source = new Map<string, number>();
      source.set('a', 1);
      source.set('b', 2);
      const view = new UnmodifiableMapView(source);
      
      const keys: string[] = [];
      const values: number[] = [];
      view.forEach((key, value) => {
        keys.push(key);
        values.push(value);
      });
      
      expect(keys.length).toBe(2);
      expect(values.length).toBe(2);
      expect(keys).toContain('a');
      expect(keys).toContain('b');
      expect(values).toContain(1);
      expect(values).toContain(2);
    });
  });

  describe('toString', () => {
    it('returns string representation', () => {
      const source = new Map<string, number>();
      source.set('a', 1);
      source.set('b', 2);
      const view = new UnmodifiableMapView(source);
      const str = view.toString();
      expect(str).toContain('a: 1');
      expect(str).toContain('b: 2');
    });
  });

  describe('mutation methods throw errors', () => {
    const source = new Map<string, number>();
    source.set('a', 1);
    const view = new UnmodifiableMapView(source);

    it('set throws', () => {
      expect(() => view.set('b', 2)).toThrow('Cannot modify an unmodifiable map');
    });

    it('delete throws', () => {
      expect(() => view.delete('a')).toThrow('Cannot modify an unmodifiable map');
    });

    it('clear throws', () => {
      expect(() => view.clear()).toThrow('Cannot modify an unmodifiable map');
    });
  });

  describe('iterator protocol', () => {
    it('iterates over entries', () => {
      const source = new Map<string, number>();
      source.set('a', 1);
      source.set('b', 2);
      source.set('c', 3);
      const view = new UnmodifiableMapView(source);

      const entries: Array<[string, number]> = [];
      for (const entry of view) {
        entries.push(entry);
      }

      expect(entries.length).toBe(3);
      expect(entries).toContainEqual(['a', 1]);
      expect(entries).toContainEqual(['b', 2]);
      expect(entries).toContainEqual(['c', 3]);
    });

    it('iterates over empty map', () => {
      const view = new UnmodifiableMapView(new Map<string, number>());
      const entries: Array<[string, number]> = [];
      for (const entry of view) {
        entries.push(entry);
      }
      expect(entries.length).toBe(0);
    });

    it('destructures entries in iteration', () => {
      const source = new Map<string, number>();
      source.set('x', 10);
      source.set('y', 20);
      const view = new UnmodifiableMapView(source);

      const keys: string[] = [];
      const values: number[] = [];
      for (const [key, value] of view) {
        keys.push(key);
        values.push(value);
      }

      expect(keys).toContain('x');
      expect(keys).toContain('y');
      expect(values).toContain(10);
      expect(values).toContain(20);
    });
  });

  describe('edge cases', () => {
    it('handles single entry', () => {
      const source = new Map<string, number>();
      source.set('only', 42);
      const view = new UnmodifiableMapView(source);
      expect(view.getLength()).toBe(1);
      expect(view.get('only')).toBe(42);
      expect(view.containsKey('only')).toBe(true);
    });

    it('handles complex value types', () => {
      const source = new Map<string, string[]>();
      source.set('a', ['x', 'y']);
      source.set('b', ['z']);
      const view = new UnmodifiableMapView(source);
      expect(view.get('a')).toEqual(['x', 'y']);
      expect(view.get('b')).toEqual(['z']);
    });
  });
});
