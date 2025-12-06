/**
 * Tests for CombinedListView
 */

import { describe, it, expect } from 'vitest';
import { CombinedListView } from '../src/combined-list-view-gs';

describe('CombinedListView', () => {
  describe('constructor and basic access', () => {
    it('combines multiple arrays', () => {
      const list1 = [1, 2, 3];
      const list2 = [4, 5];
      const list3 = [6, 7, 8, 9];
      const combined = new CombinedListView([list1, list2, list3]);
      
      expect(combined.getLength()).toBe(9);
      expect(combined.get(0)).toBe(1);
      expect(combined.get(2)).toBe(3);
      expect(combined.get(3)).toBe(4);
      expect(combined.get(5)).toBe(6);
      expect(combined.get(8)).toBe(9);
    });
    
    it('handles empty arrays in the middle', () => {
      const list1 = [1, 2];
      const list2: number[] = [];
      const list3 = [3, 4];
      const combined = new CombinedListView([list1, list2, list3]);
      
      expect(combined.getLength()).toBe(4);
      expect(combined.get(0)).toBe(1);
      expect(combined.get(1)).toBe(2);
      expect(combined.get(2)).toBe(3);
      expect(combined.get(3)).toBe(4);
    });
    
    it('handles single array', () => {
      const list = [10, 20, 30];
      const combined = new CombinedListView([list]);
      
      expect(combined.getLength()).toBe(3);
      expect(combined.get(0)).toBe(10);
      expect(combined.get(2)).toBe(30);
    });
    
    it('handles empty combined view', () => {
      const combined = new CombinedListView<number>([]);
      
      expect(combined.getLength()).toBe(0);
      expect(combined.isEmpty()).toBe(true);
    });
    
    it('throws on out of bounds access', () => {
      const combined = new CombinedListView([[1, 2], [3, 4]]);
      
      expect(() => combined.get(4)).toThrow(RangeError);
      expect(() => combined.get(-1)).toThrow(RangeError);
      expect(() => combined.get(100)).toThrow(RangeError);
    });
  });
  
  describe('reflects underlying array changes', () => {
    it('reflects length changes', () => {
      const list1 = [1, 2, 3];
      const list2 = [4, 5];
      const combined = new CombinedListView([list1, list2]);
      
      expect(combined.getLength()).toBe(5);
      
      list1.push(10);
      expect(combined.getLength()).toBe(6);
      expect(combined.get(3)).toBe(10);
      
      list2.push(20);
      expect(combined.getLength()).toBe(7);
      expect(combined.get(6)).toBe(20);
    });
    
    it('reflects element changes', () => {
      const list1 = [1, 2, 3];
      const list2 = [4, 5];
      const combined = new CombinedListView([list1, list2]);
      
      expect(combined.get(1)).toBe(2);
      list1[1] = 100;
      expect(combined.get(1)).toBe(100);
      
      expect(combined.get(3)).toBe(4);
      list2[0] = 200;
      expect(combined.get(3)).toBe(200);
    });
  });
  
  describe('isEmpty', () => {
    it('returns true for all empty arrays', () => {
      const combined = new CombinedListView<number>([[], [], []]);
      expect(combined.isEmpty()).toBe(true);
    });
    
    it('returns false if any array has elements', () => {
      const combined = new CombinedListView([[], [1], []]);
      expect(combined.isEmpty()).toBe(false);
    });
  });
  
  describe('contains', () => {
    it('finds element in first array', () => {
      const combined = new CombinedListView([[1, 2], [3, 4], [5, 6]]);
      expect(combined.contains(1)).toBe(true);
    });
    
    it('finds element in middle array', () => {
      const combined = new CombinedListView([[1, 2], [3, 4], [5, 6]]);
      expect(combined.contains(3)).toBe(true);
    });
    
    it('finds element in last array', () => {
      const combined = new CombinedListView([[1, 2], [3, 4], [5, 6]]);
      expect(combined.contains(6)).toBe(true);
    });
    
    it('returns false for missing element', () => {
      const combined = new CombinedListView([[1, 2], [3, 4]]);
      expect(combined.contains(10)).toBe(false);
    });
  });
  
  describe('getFirst and getLast', () => {
    it('gets first from first non-empty array', () => {
      const combined = new CombinedListView<number>([[], [5, 6], [7, 8]]);
      expect(combined.getFirst()).toBe(5);
    });
    
    it('gets last from last non-empty array', () => {
      const combined = new CombinedListView<number>([[1, 2], [3, 4], []]);
      expect(combined.getLast()).toBe(4);
    });
    
    it('returns null for empty view', () => {
      const combined = new CombinedListView<number>([[], []]);
      expect(combined.getFirst()).toBe(null);
      expect(combined.getLast()).toBe(null);
    });
  });
  
  describe('indexOf', () => {
    it('finds index in combined view', () => {
      const combined = new CombinedListView([[1, 2], [3, 4], [5, 6]]);
      
      expect(combined.indexOf(1)).toBe(0);
      expect(combined.indexOf(2)).toBe(1);
      expect(combined.indexOf(3)).toBe(2);
      expect(combined.indexOf(6)).toBe(5);
    });
    
    it('returns -1 for missing element', () => {
      const combined = new CombinedListView([[1, 2], [3, 4]]);
      expect(combined.indexOf(10)).toBe(-1);
    });
    
    it('supports start parameter', () => {
      const combined = new CombinedListView([[1, 2, 1], [3, 1]]);
      
      expect(combined.indexOf(1)).toBe(0);
      expect(combined.indexOf(1, 1)).toBe(2);
      expect(combined.indexOf(1, 3)).toBe(4);
    });
  });
  
  describe('toArray', () => {
    it('creates single array from combined view', () => {
      const combined = new CombinedListView([[1, 2], [3, 4], [5, 6]]);
      const result = combined.toArray();
      
      expect(result).toEqual([1, 2, 3, 4, 5, 6]);
    });
    
    it('handles empty arrays', () => {
      const combined = new CombinedListView<number>([[], [1], [], [2, 3]]);
      expect(combined.toArray()).toEqual([1, 2, 3]);
    });
    
    it('creates independent copy', () => {
      const list1 = [1, 2];
      const combined = new CombinedListView([list1]);
      const result = combined.toArray();
      
      list1.push(3);
      expect(result).toEqual([1, 2]);
      expect(combined.toArray()).toEqual([1, 2, 3]);
    });
  });
  
  describe('forEach', () => {
    it('iterates over all elements', () => {
      const combined = new CombinedListView([[1, 2], [3], [4, 5]]);
      const visited: number[] = [];
      const indices: number[] = [];
      
      combined.forEach((element, index) => {
        visited.push(element);
        indices.push(index);
      });
      
      expect(visited).toEqual([1, 2, 3, 4, 5]);
      expect(indices).toEqual([0, 1, 2, 3, 4]);
    });
  });
  
  describe('some', () => {
    it('returns true if any element passes test', () => {
      const combined = new CombinedListView([[1, 2], [3, 4]]);
      expect(combined.some(x => x > 3)).toBe(true);
    });
    
    it('returns false if no element passes test', () => {
      const combined = new CombinedListView([[1, 2], [3, 4]]);
      expect(combined.some(x => x > 10)).toBe(false);
    });
    
    it('short-circuits on first match', () => {
      const combined = new CombinedListView([[1, 2], [3, 4]]);
      let callCount = 0;
      
      combined.some(x => {
        callCount++;
        return x === 2;
      });
      
      expect(callCount).toBe(2); // Should stop after finding 2
    });
  });
  
  describe('every', () => {
    it('returns true if all elements pass test', () => {
      const combined = new CombinedListView([[1, 2], [3, 4]]);
      expect(combined.every(x => x > 0)).toBe(true);
    });
    
    it('returns false if any element fails test', () => {
      const combined = new CombinedListView([[1, 2], [3, 4]]);
      expect(combined.every(x => x > 2)).toBe(false);
    });
    
    it('short-circuits on first failure', () => {
      const combined = new CombinedListView([[1, 2], [3, 4]]);
      let callCount = 0;
      
      combined.every(x => {
        callCount++;
        return x < 3;
      });
      
      expect(callCount).toBe(3); // Should stop after finding 3
    });
  });
  
  describe('string arrays', () => {
    it('works with strings', () => {
      const combined = new CombinedListView([
        ['hello', 'world'],
        ['foo'],
        ['bar', 'baz']
      ]);
      
      expect(combined.getLength()).toBe(5);
      expect(combined.get(0)).toBe('hello');
      expect(combined.get(2)).toBe('foo');
      expect(combined.contains('bar')).toBe(true);
      expect(combined.toArray()).toEqual(['hello', 'world', 'foo', 'bar', 'baz']);
    });
  });
  
  describe('complex types', () => {
    it('works with objects', () => {
      const combined = new CombinedListView([
        [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
        [{ id: 3, name: 'Charlie' }]
      ]);
      
      expect(combined.getLength()).toBe(3);
      expect(combined.get(0).id).toBe(1);
      expect(combined.get(2).name).toBe('Charlie');
      
      // Can use toArray() and then regular array methods
      const names = combined.toArray().map(obj => obj.name);
      expect(names).toEqual(['Alice', 'Bob', 'Charlie']);
    });
  });
  
  describe('stress test', () => {
    it('handles many arrays with many elements', () => {
      const arrays: number[][] = [];
      for (let i = 0; i < 100; i++) {
        const arr: number[] = [];
        for (let j = 0; j < 10; j++) {
          arr.push(i * 10 + j);
        }
        arrays.push(arr);
      }
      
      const combined = new CombinedListView(arrays);
      
      expect(combined.getLength()).toBe(1000);
      expect(combined.get(0)).toBe(0);
      expect(combined.get(50)).toBe(50);
      expect(combined.get(999)).toBe(999);
      expect(combined.contains(500)).toBe(true);
      expect(combined.contains(1000)).toBe(false);
    });
  });

  describe('generic methods', () => {
    it('map<U>() transforms elements to different type', () => {
      const combined = new CombinedListView([
        [1, 2, 3],
        [4, 5],
        [6, 7, 8]
      ]);
      
      // Map numbers to strings
      const strings = combined.map((n: number) => `num-${n}`);
      expect(strings).toEqual(['num-1', 'num-2', 'num-3', 'num-4', 'num-5', 'num-6', 'num-7', 'num-8']);
      
      // Map to objects
      const objects = combined.map((n: number) => ({ value: n, doubled: n * 2 }));
      expect(objects.length).toBe(8);
      expect(objects[0]).toEqual({ value: 1, doubled: 2 });
      expect(objects[7]).toEqual({ value: 8, doubled: 16 });
    });

    it('filter() returns elements matching predicate', () => {
      const combined = new CombinedListView([
        [1, 2, 3, 4],
        [5, 6, 7],
        [8, 9, 10]
      ]);
      
      const evens = combined.filter((n: number) => n % 2 === 0);
      expect(evens).toEqual([2, 4, 6, 8, 10]);
      
      const greaterThan5 = combined.filter((n: number) => n > 5);
      expect(greaterThan5).toEqual([6, 7, 8, 9, 10]);
    });

    it('filter() with empty result', () => {
      const combined = new CombinedListView([
        [1, 2, 3],
        [4, 5]
      ]);
      
      const result = combined.filter((n: number) => n > 10);
      expect(result).toEqual([]);
    });

    it('map() and filter() can be chained on result', () => {
      const combined = new CombinedListView([
        ['hello', 'world'],
        ['foo', 'bar']
      ]);
      
      // Filter then map
      const lengths = combined
        .filter((s: string) => s.length > 3)
        .map((s: string) => s.length);
      expect(lengths).toEqual([5, 5]);
    });
  });
});
