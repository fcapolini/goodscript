/**
 * Tests for UnionSet
 */

import { describe, it, expect } from 'vitest';
import { UnionSet } from '../src/union-set-gs';

describe('UnionSet', () => {
  describe('constructor and basic operations', () => {
    it('creates union of multiple sets', () => {
      const set1 = new Set([1, 2, 3]);
      const set2 = new Set([3, 4, 5]);
      const set3 = new Set([5, 6, 7]);
      const union = new UnionSet([set1, set2, set3]);
      
      expect(union.getSize()).toBe(7);
      expect(union.has(1)).toBe(true);
      expect(union.has(4)).toBe(true);
      expect(union.has(7)).toBe(true);
      expect(union.has(8)).toBe(false);
    });
    
    it('handles overlapping sets correctly', () => {
      const set1 = new Set([1, 2, 3]);
      const set2 = new Set([2, 3, 4]);
      const union = new UnionSet([set1, set2]);
      
      expect(union.getSize()).toBe(4); // 1,2,3,4
    });
    
    it('handles empty sets', () => {
      const set1 = new Set<number>([]);
      const set2 = new Set([1, 2]);
      const set3 = new Set<number>([]);
      const union = new UnionSet([set1, set2, set3]);
      
      expect(union.getSize()).toBe(2);
      expect(union.has(1)).toBe(true);
    });
    
    it('handles all empty sets', () => {
      const union = new UnionSet<number>([new Set(), new Set()]);
      
      expect(union.getSize()).toBe(0);
      expect(union.isEmpty()).toBe(true);
    });
    
    it('handles single set', () => {
      const set = new Set([10, 20, 30]);
      const union = new UnionSet([set]);
      
      expect(union.getSize()).toBe(3);
      expect(union.has(20)).toBe(true);
    });
  });
  
  describe('disjoint optimization', () => {
    it('computes size faster for disjoint sets', () => {
      const set1 = new Set([1, 2, 3]);
      const set2 = new Set([4, 5, 6]);
      const set3 = new Set([7, 8, 9]);
      const union = new UnionSet([set1, set2, set3], true);
      
      expect(union.getSize()).toBe(9);
    });
    
    it('gives wrong size if marked disjoint but has overlaps', () => {
      const set1 = new Set([1, 2, 3]);
      const set2 = new Set([3, 4, 5]); // 3 overlaps!
      const union = new UnionSet([set1, set2], true);
      
      // Size will be wrong (counts 3 twice)
      expect(union.getSize()).toBe(6); // Should be 5, but disjoint assumes no overlap
    });
  });
  
  describe('reflects underlying changes', () => {
    it('reflects additions', () => {
      const set1 = new Set([1, 2]);
      const set2 = new Set([3, 4]);
      const union = new UnionSet([set1, set2]);
      
      expect(union.getSize()).toBe(4);
      expect(union.has(5)).toBe(false);
      
      set1.add(5);
      expect(union.getSize()).toBe(5);
      expect(union.has(5)).toBe(true);
    });
    
    it('reflects deletions', () => {
      const set1 = new Set([1, 2, 3]);
      const set2 = new Set([4, 5]);
      const union = new UnionSet([set1, set2]);
      
      expect(union.has(2)).toBe(true);
      set1.delete(2);
      expect(union.has(2)).toBe(false);
      expect(union.getSize()).toBe(4);
    });
  });
  
  describe('isEmpty', () => {
    it('returns true when all sets empty', () => {
      const union = new UnionSet<number>([new Set(), new Set(), new Set()]);
      expect(union.isEmpty()).toBe(true);
    });
    
    it('returns false when any set has elements', () => {
      const union = new UnionSet<number>([new Set(), new Set([1]), new Set()]);
      expect(union.isEmpty()).toBe(false);
    });
  });
  
  describe('toSet', () => {
    it('creates new set with all unique elements', () => {
      const set1 = new Set([1, 2, 3]);
      const set2 = new Set([3, 4, 5]);
      const union = new UnionSet([set1, set2]);
      
      const result = union.toSet();
      expect(result.size).toBe(5);
      expect(result.has(1)).toBe(true);
      expect(result.has(5)).toBe(true);
    });
    
    it('creates independent copy', () => {
      const set1 = new Set([1, 2]);
      const union = new UnionSet([set1]);
      const result = union.toSet();
      
      set1.add(3);
      expect(result.size).toBe(2);
      expect(union.toSet().size).toBe(3);
    });
  });
  
  describe('toArray', () => {
    it('converts to array of unique elements', () => {
      const set1 = new Set([1, 2]);
      const set2 = new Set([2, 3]);
      const union = new UnionSet([set1, set2]);
      
      const result = union.toArray();
      expect(result.length).toBe(3);
      expect(result.sort()).toEqual([1, 2, 3]);
    });
  });
  
  describe('forEach', () => {
    it('iterates over unique elements', () => {
      const set1 = new Set([1, 2]);
      const set2 = new Set([2, 3]);
      const union = new UnionSet([set1, set2]);
      
      const visited: number[] = [];
      union.forEach(e => visited.push(e));
      
      expect(visited.sort()).toEqual([1, 2, 3]);
    });
    
    it('visits each element only once', () => {
      const set1 = new Set([5, 5]); // Set deduplicates anyway
      const set2 = new Set([5]);
      const union = new UnionSet([set1, set2]);
      
      let count = 0;
      union.forEach(() => count++);
      expect(count).toBe(1);
    });
  });
  
  describe('some', () => {
    it('returns true if any element passes test', () => {
      const set1 = new Set([1, 2]);
      const set2 = new Set([3, 4]);
      const union = new UnionSet([set1, set2]);
      
      expect(union.some(x => x > 3)).toBe(true);
    });
    
    it('returns false if no element passes test', () => {
      const set1 = new Set([1, 2]);
      const set2 = new Set([3, 4]);
      const union = new UnionSet([set1, set2]);
      
      expect(union.some(x => x > 10)).toBe(false);
    });
  });
  
  describe('every', () => {
    it('returns true if all elements pass test', () => {
      const set1 = new Set([1, 2]);
      const set2 = new Set([3, 4]);
      const union = new UnionSet([set1, set2]);
      
      expect(union.every(x => x > 0)).toBe(true);
    });
    
    it('returns false if any element fails test', () => {
      const set1 = new Set([1, 2]);
      const set2 = new Set([3, 4]);
      const union = new UnionSet([set1, set2]);
      
      expect(union.every(x => x > 2)).toBe(false);
    });
  });
  
  describe('containsAll', () => {
    it('checks if union contains all elements', () => {
      const set1 = new Set([1, 2, 3]);
      const set2 = new Set([4, 5]);
      const union = new UnionSet([set1, set2]);
      
      expect(union.containsAll(new Set([1, 4]))).toBe(true);
      expect(union.containsAll(new Set([1, 6]))).toBe(false);
    });
  });
  
  describe('isSupersetOf', () => {
    it('checks superset relationship', () => {
      const set1 = new Set([1, 2, 3]);
      const set2 = new Set([4, 5]);
      const union = new UnionSet([set1, set2]);
      
      expect(union.isSupersetOf(new Set([1, 2]))).toBe(true);
      expect(union.isSupersetOf(new Set([1, 6]))).toBe(false);
    });
  });
  
  describe('isSubsetOf', () => {
    it('checks subset relationship', () => {
      const set1 = new Set([1, 2]);
      const set2 = new Set([3, 4]);
      const union = new UnionSet([set1, set2]);
      
      expect(union.isSubsetOf(new Set([1, 2, 3, 4, 5]))).toBe(true);
      expect(union.isSubsetOf(new Set([1, 2, 3]))).toBe(false);
    });
  });
  
  describe('intersection', () => {
    it('computes intersection with another set', () => {
      const set1 = new Set([1, 2, 3]);
      const set2 = new Set([3, 4, 5]);
      const union = new UnionSet([set1, set2]);
      
      const result = union.intersection(new Set([2, 3, 4, 6]));
      expect(result.size).toBe(3);
      expect(result.has(2)).toBe(true);
      expect(result.has(3)).toBe(true);
      expect(result.has(4)).toBe(true);
    });
    
    it('returns empty set for disjoint sets', () => {
      const set1 = new Set([1, 2]);
      const union = new UnionSet([set1]);
      
      const result = union.intersection(new Set([5, 6]));
      expect(result.size).toBe(0);
    });
  });
  
  describe('difference', () => {
    it('computes difference with another set', () => {
      const set1 = new Set([1, 2, 3]);
      const set2 = new Set([3, 4, 5]);
      const union = new UnionSet([set1, set2]);
      
      const result = union.difference(new Set([3, 4]));
      expect(result.size).toBe(3);
      expect(result.has(1)).toBe(true);
      expect(result.has(2)).toBe(true);
      expect(result.has(5)).toBe(true);
    });
  });
  
  describe('string sets', () => {
    it('works with strings', () => {
      const set1 = new Set(['hello', 'world']);
      const set2 = new Set(['world', 'foo']);
      const union = new UnionSet([set1, set2]);
      
      expect(union.getSize()).toBe(3);
      expect(union.has('hello')).toBe(true);
      expect(union.has('foo')).toBe(true);
      expect(union.toArray().sort()).toEqual(['foo', 'hello', 'world']);
    });
  });
  
  describe('complex types', () => {
    it('works with objects using reference equality', () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };
      const obj3 = { id: 3 };
      
      const set1 = new Set([obj1, obj2]);
      const set2 = new Set([obj2, obj3]);
      const union = new UnionSet([set1, set2]);
      
      expect(union.getSize()).toBe(3);
      expect(union.has(obj1)).toBe(true);
      expect(union.has(obj3)).toBe(true);
      expect(union.has({ id: 1 })).toBe(false); // Different reference
    });
  });
  
  describe('stress test', () => {
    it('handles many sets with many elements', () => {
      const sets: Set<number>[] = [];
      for (let i = 0; i < 100; i++) {
        const set = new Set<number>();
        for (let j = i * 5; j < (i + 1) * 5; j++) {
          set.add(j);
        }
        sets.push(set);
      }
      
      const union = new UnionSet(sets);
      
      expect(union.getSize()).toBe(500);
      expect(union.has(0)).toBe(true);
      expect(union.has(250)).toBe(true);
      expect(union.has(499)).toBe(true);
      expect(union.has(500)).toBe(false);
    });
    
    it('handles many sets with overlaps', () => {
      const sets: Set<number>[] = [];
      for (let i = 0; i < 50; i++) {
        sets.push(new Set([i, i + 1, i + 2])); // Overlapping ranges
      }
      
      const union = new UnionSet(sets);
      
      expect(union.getSize()).toBe(52); // 0 through 51
    });
  });
});
