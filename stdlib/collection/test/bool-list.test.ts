import { describe, it, expect } from 'vitest';
import { BoolList } from '../src/bool-list-gs';

describe('BoolList', () => {
  describe('constructor', () => {
    it('creates empty list', () => {
      const list = BoolList.create(0);
      expect(list.getLength()).toBe(0);
      expect(list.isEmpty()).toBe(true);
    });

    it('creates list with specified length', () => {
      const list = BoolList.create(10);
      expect(list.getLength()).toBe(10);
      expect(list.isEmpty()).toBe(false);
    });

    it('creates list filled with false by default', () => {
      const list = BoolList.create(5);
      for (let i = 0; i < 5; i++) {
        expect(list.get(i)).toBe(false);
      }
    });

    it('creates list filled with true when specified', () => {
      const list = BoolList.create(5, true);
      for (let i = 0; i < 5; i++) {
        expect(list.get(i)).toBe(true);
      }
    });

    it('rejects negative length', () => {
      expect(() => BoolList.create(-1)).toThrow(RangeError);
    });
  });

  describe('empty', () => {
    it('creates empty growable list', () => {
      const list = BoolList.empty();
      expect(list.getLength()).toBe(0);
      list.add(true);
      expect(list.getLength()).toBe(1);
    });

    it('creates empty fixed-length list', () => {
      const list = BoolList.empty(false);
      expect(list.getLength()).toBe(0);
      expect(() => list.add(true)).toThrow();
    });
  });

  describe('generate', () => {
    it('generates list from function', () => {
      const list = BoolList.generate(5, (i) => i % 2 === 0);
      expect(list.get(0)).toBe(true);
      expect(list.get(1)).toBe(false);
      expect(list.get(2)).toBe(true);
      expect(list.get(3)).toBe(false);
      expect(list.get(4)).toBe(true);
    });

    it('generates empty list', () => {
      const list = BoolList.generate(0, () => true);
      expect(list.getLength()).toBe(0);
    });
  });

  describe('of', () => {
    it('creates list from array', () => {
      const list = BoolList.of([true, false, true]);
      expect(list.getLength()).toBe(3);
      expect(list.get(0)).toBe(true);
      expect(list.get(1)).toBe(false);
      expect(list.get(2)).toBe(true);
    });

    it('creates from empty array', () => {
      const list = BoolList.of([]);
      expect(list.getLength()).toBe(0);
    });
  });

  describe('get/set', () => {
    it('gets and sets values', () => {
      const list = BoolList.create(3);
      list.set(0, true);
      list.set(1, false);
      list.set(2, true);
      expect(list.get(0)).toBe(true);
      expect(list.get(1)).toBe(false);
      expect(list.get(2)).toBe(true);
    });

    it('throws on out-of-bounds get', () => {
      const list = BoolList.create(3);
      expect(() => list.get(-1)).toThrow(RangeError);
      expect(() => list.get(3)).toThrow(RangeError);
    });

    it('throws on out-of-bounds set', () => {
      const list = BoolList.create(3);
      expect(() => list.set(-1, true)).toThrow(RangeError);
      expect(() => list.set(3, true)).toThrow(RangeError);
    });
  });

  describe('fillRange', () => {
    it('fills range with true', () => {
      const list = BoolList.create(10, false);
      list.fillRange(2, 7, true);
      expect(list.get(1)).toBe(false);
      expect(list.get(2)).toBe(true);
      expect(list.get(6)).toBe(true);
      expect(list.get(7)).toBe(false);
    });

    it('fills range with false', () => {
      const list = BoolList.create(10, true);
      list.fillRange(2, 7, false);
      expect(list.get(1)).toBe(true);
      expect(list.get(2)).toBe(false);
      expect(list.get(6)).toBe(false);
      expect(list.get(7)).toBe(true);
    });

    it('fills entire list', () => {
      const list = BoolList.create(10, false);
      list.fillRange(0, 10, true);
      for (let i = 0; i < 10; i++) {
        expect(list.get(i)).toBe(true);
      }
    });

    it('fills single element', () => {
      const list = BoolList.create(10, false);
      list.fillRange(5, 6, true);
      expect(list.get(4)).toBe(false);
      expect(list.get(5)).toBe(true);
      expect(list.get(6)).toBe(false);
    });

    it('handles empty range', () => {
      const list = BoolList.create(10, false);
      list.fillRange(5, 5, true);
      for (let i = 0; i < 10; i++) {
        expect(list.get(i)).toBe(false);
      }
    });

    it('throws on invalid range', () => {
      const list = BoolList.create(10);
      expect(() => list.fillRange(-1, 5, true)).toThrow(RangeError);
      expect(() => list.fillRange(5, 11, true)).toThrow(RangeError);
      expect(() => list.fillRange(7, 5, true)).toThrow(RangeError);
    });
  });

  describe('first/last', () => {
    it('gets first and last elements', () => {
      const list = BoolList.of([true, false, true]);
      expect(list.getFirst()).toBe(true);
      expect(list.getLast()).toBe(true);
    });

    it('sets first and last elements', () => {
      const list = BoolList.create(3, false);
      list.setFirst(true);
      list.setLast(true);
      expect(list.get(0)).toBe(true);
      expect(list.get(2)).toBe(true);
    });

    it('throws on empty list', () => {
      const list = BoolList.empty();
      expect(() => list.getFirst()).toThrow(RangeError);
      expect(() => list.getLast()).toThrow(RangeError);
      expect(() => list.setFirst(true)).toThrow(RangeError);
      expect(() => list.setLast(true)).toThrow(RangeError);
    });
  });

  describe('growable operations', () => {
    it('adds elements to growable list', () => {
      const list = BoolList.empty(true);
      list.add(true);
      list.add(false);
      list.add(true);
      expect(list.getLength()).toBe(3);
      expect(list.get(0)).toBe(true);
      expect(list.get(1)).toBe(false);
      expect(list.get(2)).toBe(true);
    });

    it('adds all elements', () => {
      const list = BoolList.empty(true);
      list.addAll([true, false, true]);
      expect(list.getLength()).toBe(3);
      expect(list.toArray()).toEqual([true, false, true]);
    });

    it('removes last element', () => {
      const list = BoolList.of([true, false, true], true);
      const value = list.removeLast();
      expect(value).toBe(true);
      expect(list.getLength()).toBe(2);
      expect(list.toArray()).toEqual([true, false]);
    });

    it('throws when modifying fixed-length list', () => {
      const list = BoolList.create(3, false, false);
      expect(() => list.add(true)).toThrow();
      expect(() => list.addAll([true])).toThrow();
      expect(() => list.removeLast()).toThrow();
      expect(() => list.setLength(5)).toThrow();
    });
  });

  describe('setLength', () => {
    it('grows list with false values', () => {
      const list = BoolList.of([true, false], true);
      list.setLength(5);
      expect(list.getLength()).toBe(5);
      expect(list.get(0)).toBe(true);
      expect(list.get(1)).toBe(false);
      expect(list.get(2)).toBe(false);
      expect(list.get(3)).toBe(false);
      expect(list.get(4)).toBe(false);
    });

    it('shrinks list', () => {
      const list = BoolList.of([true, false, true, false, true], true);
      list.setLength(2);
      expect(list.getLength()).toBe(2);
      expect(list.toArray()).toEqual([true, false]);
    });

    it('rejects negative length', () => {
      const list = BoolList.empty(true);
      expect(() => list.setLength(-1)).toThrow(RangeError);
    });
  });

  describe('contains/indexOf', () => {
    it('checks if value exists', () => {
      const list = BoolList.of([false, false, false]);
      expect(list.contains(false)).toBe(true);
      expect(list.contains(true)).toBe(false);
    });

    it('finds index of value', () => {
      const list = BoolList.of([false, true, false, true]);
      expect(list.indexOf(true)).toBe(1);
      expect(list.indexOf(false)).toBe(0);
      expect(list.indexOf(true, 2)).toBe(3);
    });

    it('returns -1 when not found', () => {
      const list = BoolList.of([false, false]);
      expect(list.indexOf(true)).toBe(-1);
    });

    it('finds last index of value', () => {
      const list = BoolList.of([true, false, true, false]);
      expect(list.lastIndexOf(true)).toBe(2);
      expect(list.lastIndexOf(false)).toBe(3);
      expect(list.lastIndexOf(true, 1)).toBe(0);
    });
  });

  describe('iteration', () => {
    it('iterates with forEach', () => {
      const list = BoolList.of([true, false, true]);
      const values: boolean[] = [];
      const indices: number[] = [];
      list.forEach((val, idx) => {
        values.push(val);
        indices.push(idx);
      });
      expect(values).toEqual([true, false, true]);
      expect(indices).toEqual([0, 1, 2]);
    });

    it('checks with some', () => {
      const list = BoolList.of([false, false, true, false]);
      expect(list.some((val) => val === true)).toBe(true);
      expect(list.some((val) => val === false)).toBe(true);
    });

    it('checks with every', () => {
      const list = BoolList.of([true, true, true]);
      expect(list.every((val) => val === true)).toBe(true);
      expect(list.every((val) => val === false)).toBe(false);
    });
  });

  describe('count', () => {
    it('counts occurrences', () => {
      const list = BoolList.of([true, false, true, false, true]);
      expect(list.count(true)).toBe(3);
      expect(list.count(false)).toBe(2);
    });

    it('counts in empty list', () => {
      const list = BoolList.empty();
      expect(list.count(true)).toBe(0);
      expect(list.count(false)).toBe(0);
    });
  });

  describe('toArray', () => {
    it('converts to array', () => {
      const list = BoolList.of([true, false, true]);
      expect(list.toArray()).toEqual([true, false, true]);
    });

    it('converts empty list', () => {
      const list = BoolList.empty();
      expect(list.toArray()).toEqual([]);
    });
  });

  describe('bitwise operations', () => {
    it('handles values across word boundaries', () => {
      // Create list with 100 elements (spans 4 words of 32 bits)
      const list = BoolList.create(100, false);
      
      // Set values in different words
      list.set(0, true);    // First word
      list.set(31, true);   // Last bit of first word
      list.set(32, true);   // First bit of second word
      list.set(63, true);   // Last bit of second word
      list.set(99, true);   // Last element
      
      expect(list.get(0)).toBe(true);
      expect(list.get(31)).toBe(true);
      expect(list.get(32)).toBe(true);
      expect(list.get(63)).toBe(true);
      expect(list.get(99)).toBe(true);
      
      // All other values should be false
      expect(list.count(true)).toBe(5);
      expect(list.count(false)).toBe(95);
    });

    it('fills across word boundaries', () => {
      const list = BoolList.create(100, false);
      list.fillRange(30, 65, true);
      
      expect(list.get(29)).toBe(false);
      expect(list.get(30)).toBe(true);
      expect(list.get(31)).toBe(true);
      expect(list.get(32)).toBe(true);
      expect(list.get(64)).toBe(true);
      expect(list.get(65)).toBe(false);
      
      expect(list.count(true)).toBe(35); // 65 - 30
    });
  });

  describe('stress test', () => {
    it('handles 10,000 elements efficiently', () => {
      // Create large list
      const list = BoolList.create(10000, false, true);
      
      // Set every 3rd element to true
      for (let i = 0; i < 10000; i += 3) {
        list.set(i, true);
      }
      
      // Verify
      expect(list.count(true)).toBe(3334);
      expect(list.count(false)).toBe(6666);
      
      // Fill middle section
      list.fillRange(4000, 6000, true);
      expect(list.count(true)).toBe(2000 + (3334 - 666)); // fillRange + (original - overlap)
      
      // Grow and shrink
      list.setLength(15000);
      expect(list.getLength()).toBe(15000);
      list.setLength(5000);
      expect(list.getLength()).toBe(5000);
    });
  });

  describe('edge cases', () => {
    it('handles single element list', () => {
      const list = BoolList.create(1, true);
      expect(list.getLength()).toBe(1);
      expect(list.get(0)).toBe(true);
      expect(list.getFirst()).toBe(true);
      expect(list.getLast()).toBe(true);
    });

    it('handles list with exactly 32 elements', () => {
      const list = BoolList.create(32, false);
      list.fillRange(0, 32, true);
      expect(list.count(true)).toBe(32);
    });

    it('handles list with exactly 64 elements', () => {
      const list = BoolList.create(64, false);
      list.fillRange(0, 64, true);
      expect(list.count(true)).toBe(64);
    });
  });
});
