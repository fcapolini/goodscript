import { describe, it, expect } from 'vitest';
import { HeapPriorityQueue } from '../src/heap-priority-queue-gs.js';

describe('HeapPriorityQueue', () => {
  describe('basic operations', () => {
    it('should be empty when created', () => {
      const pq = new HeapPriorityQueue<number>();
      expect(pq.isEmpty()).toBe(true);
      expect(pq.isNotEmpty()).toBe(false);
      expect(pq.getLength()).toBe(0);
    });
    
    it('should add elements', () => {
      const pq = new HeapPriorityQueue<number>();
      pq.add(5);
      expect(pq.isEmpty()).toBe(false);
      expect(pq.isNotEmpty()).toBe(true);
      expect(pq.getLength()).toBe(1);
    });
    
    it('should return first element without removing', () => {
      const pq = new HeapPriorityQueue<number>();
      pq.add(5);
      pq.add(3);
      pq.add(7);
      expect(pq.getFirst()).toBe(3); // Smallest has highest priority
      expect(pq.getLength()).toBe(3); // Still 3 elements
    });
    
    it('should remove elements in priority order', () => {
      const pq = new HeapPriorityQueue<number>();
      pq.add(5);
      pq.add(2);
      pq.add(8);
      pq.add(1);
      pq.add(9);
      
      expect(pq.removeFirst()).toBe(1);
      expect(pq.removeFirst()).toBe(2);
      expect(pq.removeFirst()).toBe(5);
      expect(pq.removeFirst()).toBe(8);
      expect(pq.removeFirst()).toBe(9);
      expect(pq.isEmpty()).toBe(true);
    });
  });
  
  describe('custom comparator', () => {
    it('should use custom comparison function', () => {
      // Reverse order: larger numbers have higher priority
      const pq = new HeapPriorityQueue<number>((a, b) => b - a);
      pq.add(5);
      pq.add(2);
      pq.add(8);
      
      expect(pq.removeFirst()).toBe(8);
      expect(pq.removeFirst()).toBe(5);
      expect(pq.removeFirst()).toBe(2);
    });
    
    it('should work with strings', () => {
      const pq = new HeapPriorityQueue<string>();
      pq.add('banana');
      pq.add('apple');
      pq.add('cherry');
      
      expect(pq.removeFirst()).toBe('apple');
      expect(pq.removeFirst()).toBe('banana');
      expect(pq.removeFirst()).toBe('cherry');
    });
  });
  
  describe('addAll', () => {
    it('should add multiple elements', () => {
      const pq = new HeapPriorityQueue<number>();
      pq.addAll([5, 2, 8, 1, 9]);
      
      expect(pq.getLength()).toBe(5);
      expect(pq.removeFirst()).toBe(1);
    });
  });
  
  describe('contains', () => {
    it('should find existing elements', () => {
      const pq = new HeapPriorityQueue<number>();
      pq.addAll([5, 2, 8]);
      
      expect(pq.contains(5)).toBe(true);
      expect(pq.contains(2)).toBe(true);
      expect(pq.contains(10)).toBe(false);
    });
  });
  
  describe('remove', () => {
    it('should remove specific element', () => {
      const pq = new HeapPriorityQueue<number>();
      pq.addAll([5, 2, 8, 1, 9]);
      
      expect(pq.remove(8)).toBe(true);
      expect(pq.getLength()).toBe(4);
      expect(pq.contains(8)).toBe(false);
      
      // Should still maintain heap property
      expect(pq.removeFirst()).toBe(1);
      expect(pq.removeFirst()).toBe(2);
      expect(pq.removeFirst()).toBe(5);
      expect(pq.removeFirst()).toBe(9);
    });
    
    it('should return false for non-existent element', () => {
      const pq = new HeapPriorityQueue<number>();
      pq.addAll([5, 2, 8]);
      
      expect(pq.remove(10)).toBe(false);
      expect(pq.getLength()).toBe(3);
    });
  });
  
  describe('clear', () => {
    it('should remove all elements', () => {
      const pq = new HeapPriorityQueue<number>();
      pq.addAll([5, 2, 8, 1, 9]);
      
      pq.clear();
      expect(pq.isEmpty()).toBe(true);
      expect(pq.getLength()).toBe(0);
    });
  });
  
  describe('removeAll', () => {
    it('should remove and return all elements', () => {
      const pq = new HeapPriorityQueue<number>();
      pq.addAll([5, 2, 8]);
      
      const elements = pq.removeAll();
      expect(elements.length).toBe(3);
      expect(pq.isEmpty()).toBe(true);
    });
  });
  
  describe('removeAll returns sorted list', () => {
    it('should return elements in sorted order', () => {
      const pq = new HeapPriorityQueue<number>();
      pq.addAll([5, 2, 8, 1, 9]);
      
      const list = pq.removeAll();
      expect(list).toEqual([1, 2, 5, 8, 9]);
      expect(pq.isEmpty()).toBe(true);
    });
  });
  
  describe('getUnorderedElements', () => {
    it('should return all elements', () => {
      const pq = new HeapPriorityQueue<number>();
      pq.addAll([5, 2, 8]);
      
      const list = pq.getUnorderedElements();
      expect(list.length).toBe(3);
      expect(list).toContain(5);
      expect(list).toContain(2);
      expect(list).toContain(8);
      expect(pq.getLength()).toBe(3); // Queue unchanged
    });
  });
  
  describe('toArray with duplicates', () => {
    it('should return array including duplicates', () => {
      const pq = new HeapPriorityQueue<number>();
      pq.addAll([5, 2, 8, 2, 5]); // Duplicates
      
      const arr = pq.toArray();
      expect(arr.length).toBe(5); // Duplicates included
      expect(pq.getLength()).toBe(5);
    });
  });
  
  describe('toArray', () => {
    it('should return all elements', () => {
      const pq = new HeapPriorityQueue<number>();
      pq.addAll([5, 2, 8]);
      
      const elements = pq.toArray();
      expect(elements.length).toBe(3);
      expect(elements).toContain(5);
      expect(elements).toContain(2);
      expect(elements).toContain(8);
    });
  });
  
  describe('edge cases', () => {
    it('should throw when accessing first on empty queue', () => {
      const pq = new HeapPriorityQueue<number>();
      expect(() => pq.getFirst()).toThrow('No element');
    });
    
    it('should throw when removing from empty queue', () => {
      const pq = new HeapPriorityQueue<number>();
      expect(() => pq.removeFirst()).toThrow('No element');
    });
    
    it('should handle large number of elements', () => {
      const pq = new HeapPriorityQueue<number>();
      const n = 1000;
      
      // Add random numbers
      for (let i = 0; i < n; i++) {
        pq.add(Math.floor(Math.random() * 1000));
      }
      
      expect(pq.getLength()).toBe(n);
      
      // Verify they come out sorted
      let prev = pq.removeFirst();
      for (let i = 1; i < n; i++) {
        const current = pq.removeFirst();
        expect(current).toBeGreaterThanOrEqual(prev);
        prev = current;
      }
    });
  });
});
