import { describe, it, expect } from 'vitest';
import { UnmodifiableListView } from '../src/unmodifiable-list-view-gs.js';

describe('UnmodifiableListView', () => {
  describe('constructor', () => {
    it('creates a view on an array', () => {
      const source = [1, 2, 3];
      const view = new UnmodifiableListView(source);
      expect(view.getLength()).toBe(3);
      expect(view.get(0)).toBe(1);
    });

    it('reflects changes to source array', () => {
      const source = [1, 2, 3];
      const view = new UnmodifiableListView(source);
      source[1] = 99;
      expect(view.get(1)).toBe(99);
    });
  });

  describe('get', () => {
    it('returns element at index', () => {
      const view = new UnmodifiableListView([10, 20, 30, 40]);
      expect(view.get(0)).toBe(10);
      expect(view.get(2)).toBe(30);
      expect(view.get(3)).toBe(40);
    });

    it('throws on negative index', () => {
      const view = new UnmodifiableListView([1, 2, 3]);
      expect(() => view.get(-1)).toThrow('Index out of bounds');
    });

    it('throws on index >= length', () => {
      const view = new UnmodifiableListView([1, 2, 3]);
      expect(() => view.get(3)).toThrow('Index out of bounds');
    });
  });

  describe('getLength', () => {
    it('returns the number of elements', () => {
      expect(new UnmodifiableListView([]).getLength()).toBe(0);
      expect(new UnmodifiableListView([1]).getLength()).toBe(1);
      expect(new UnmodifiableListView([1, 2, 3, 4, 5]).getLength()).toBe(5);
    });
  });

  describe('getFirst/getLast', () => {
    it('returns first and last elements', () => {
      const view = new UnmodifiableListView([10, 20, 30]);
      expect(view.getFirst()).toBe(10);
      expect(view.getLast()).toBe(30);
    });

    it('throws on empty list', () => {
      const view = new UnmodifiableListView<number>([]);
      expect(() => view.getFirst()).toThrow('No element');
      expect(() => view.getLast()).toThrow('No element');
    });
  });

  describe('isEmpty/isNotEmpty', () => {
    it('returns correct values', () => {
      const empty = new UnmodifiableListView<number>([]);
      const notEmpty = new UnmodifiableListView([1, 2, 3]);

      expect(empty.isEmpty()).toBe(true);
      expect(empty.isNotEmpty()).toBe(false);
      expect(notEmpty.isEmpty()).toBe(false);
      expect(notEmpty.isNotEmpty()).toBe(true);
    });
  });

  describe('toArray', () => {
    it('returns a copy of the elements', () => {
      const source = [1, 2, 3];
      const view = new UnmodifiableListView(source);
      const arr = view.toArray();

      expect(arr).toEqual([1, 2, 3]);

      // Modifying copy doesn't affect view
      arr[0] = 99;
      expect(view.get(0)).toBe(1);
    });
  });

  describe('indexOf', () => {
    it('returns index of first occurrence', () => {
      const view = new UnmodifiableListView([1, 2, 3, 2, 1]);
      expect(view.indexOf(1)).toBe(0);
      expect(view.indexOf(2)).toBe(1);
      expect(view.indexOf(3)).toBe(2);
    });

    it('returns -1 if not found', () => {
      const view = new UnmodifiableListView([1, 2, 3]);
      expect(view.indexOf(99)).toBe(-1);
    });

    it('accepts start index', () => {
      const view = new UnmodifiableListView([1, 2, 3, 2, 1]);
      expect(view.indexOf(2, 2)).toBe(3);
      expect(view.indexOf(1, 1)).toBe(4);
    });
  });

  describe('lastIndexOf', () => {
    it('returns index of last occurrence', () => {
      const view = new UnmodifiableListView([1, 2, 3, 2, 1]);
      expect(view.lastIndexOf(1)).toBe(4);
      expect(view.lastIndexOf(2)).toBe(3);
      expect(view.lastIndexOf(3)).toBe(2);
    });

    it('returns -1 if not found', () => {
      const view = new UnmodifiableListView([1, 2, 3]);
      expect(view.lastIndexOf(99)).toBe(-1);
    });

    it('accepts start index', () => {
      const view = new UnmodifiableListView([1, 2, 3, 2, 1]);
      expect(view.lastIndexOf(2, 2)).toBe(1);
      expect(view.lastIndexOf(1, 3)).toBe(0);
    });
  });

  describe('contains', () => {
    it('returns true if element exists', () => {
      const view = new UnmodifiableListView([1, 2, 3]);
      expect(view.contains(2)).toBe(true);
    });

    it('returns false if element does not exist', () => {
      const view = new UnmodifiableListView([1, 2, 3]);
      expect(view.contains(99)).toBe(false);
    });
  });

  describe('sublist', () => {
    it('returns a sublist view', () => {
      const view = new UnmodifiableListView([10, 20, 30, 40, 50]);
      const sub = view.sublist(1, 4);
      expect(sub.toArray()).toEqual([20, 30, 40]);
    });

    it('defaults end to length', () => {
      const view = new UnmodifiableListView([1, 2, 3, 4, 5]);
      const sub = view.sublist(2);
      expect(sub.toArray()).toEqual([3, 4, 5]);
    });

    it('throws on invalid range', () => {
      const view = new UnmodifiableListView([1, 2, 3]);
      expect(() => view.sublist(-1, 2)).toThrow('Invalid range');
      expect(() => view.sublist(0, 4)).toThrow('Invalid range');
      expect(() => view.sublist(2, 1)).toThrow('Invalid range');
    });

    it('sublist is also unmodifiable', () => {
      const view = new UnmodifiableListView([1, 2, 3, 4, 5]);
      const sub = view.sublist(1, 4);
      expect(() => sub.set(0, 99)).toThrow('Cannot modify');
    });
  });

  describe('reversed', () => {
    it('returns elements in reverse order', () => {
      const view = new UnmodifiableListView([1, 2, 3, 4, 5]);
      const rev = view.reversed();
      expect(rev.toArray()).toEqual([5, 4, 3, 2, 1]);
    });

    it('does not modify original', () => {
      const view = new UnmodifiableListView([1, 2, 3]);
      view.reversed();
      expect(view.toArray()).toEqual([1, 2, 3]);
    });
  });

  describe('toString', () => {
    it('returns string representation', () => {
      const view = new UnmodifiableListView([1, 2, 3]);
      expect(view.toString()).toBe('[1, 2, 3]');
    });

    it('handles empty list', () => {
      const view = new UnmodifiableListView<number>([]);
      expect(view.toString()).toBe('[]');
    });
  });

  describe('mutation methods throw errors', () => {
    const view = new UnmodifiableListView([1, 2, 3]);

    it('set throws', () => {
      expect(() => view.set(0, 99)).toThrow('Cannot modify an unmodifiable list');
    });

    it('setLength throws', () => {
      expect(() => view.setLength(5)).toThrow('Cannot modify an unmodifiable list');
    });

    it('add throws', () => {
      expect(() => view.add(4)).toThrow('Cannot modify an unmodifiable list');
    });

    it('addAll throws', () => {
      expect(() => view.addAll([4, 5])).toThrow('Cannot modify an unmodifiable list');
    });

    it('insert throws', () => {
      expect(() => view.insert(0, 99)).toThrow('Cannot modify an unmodifiable list');
    });

    it('remove throws', () => {
      expect(() => view.remove(1)).toThrow('Cannot modify an unmodifiable list');
    });

    it('removeAt throws', () => {
      expect(() => view.removeAt(0)).toThrow('Cannot modify an unmodifiable list');
    });

    it('clear throws', () => {
      expect(() => view.clear()).toThrow('Cannot modify an unmodifiable list');
    });
  });

  describe('edge cases', () => {
    it('handles single element', () => {
      const view = new UnmodifiableListView([42]);
      expect(view.getFirst()).toBe(42);
      expect(view.getLast()).toBe(42);
      expect(view.get(0)).toBe(42);
    });

    it('handles strings', () => {
      const view = new UnmodifiableListView(['a', 'b', 'c']);
      expect(view.indexOf('b')).toBe(1);
      expect(view.contains('c')).toBe(true);
    });
  });
});
