import { describe, it, expect } from 'vitest';
import { QueueList } from '../src/queue-list-gs';

describe('QueueList', () => {
  describe('constructor', () => {
    it('should create empty queue', () => {
      const queue = new QueueList<number>();
      expect(queue.isEmpty()).toBe(true);
      expect(queue.getLength()).toBe(0);
    });
    
    it('should accept initial capacity', () => {
      const queue = new QueueList<number>(16);
      expect(queue.isEmpty()).toBe(true);
    });
  });
  
  describe('from', () => {
    it('should create queue from array', () => {
      const queue = QueueList.from([1, 2, 3, 4, 5]);
      expect(queue.getLength()).toBe(5);
      expect(queue.get(0)).toBe(1);
      expect(queue.get(4)).toBe(5);
    });
    
    it('should handle empty array', () => {
      const queue = QueueList.from<number>([]);
      expect(queue.isEmpty()).toBe(true);
    });
  });
  
  describe('add/addLast', () => {
    it('should add elements to end', () => {
      const queue = new QueueList<number>();
      queue.add(1);
      queue.add(2);
      queue.add(3);
      
      expect(queue.getLength()).toBe(3);
      expect(queue.get(0)).toBe(1);
      expect(queue.get(1)).toBe(2);
      expect(queue.get(2)).toBe(3);
    });
    
    it('should handle many additions', () => {
      const queue = new QueueList<number>();
      for (let i = 0; i < 100; i++) {
        queue.add(i);
      }
      
      expect(queue.getLength()).toBe(100);
      expect(queue.get(0)).toBe(0);
      expect(queue.get(99)).toBe(99);
    });
  });
  
  describe('addFirst', () => {
    it('should add elements to front', () => {
      const queue = new QueueList<number>();
      queue.addFirst(1);
      queue.addFirst(2);
      queue.addFirst(3);
      
      expect(queue.getLength()).toBe(3);
      expect(queue.get(0)).toBe(3);
      expect(queue.get(1)).toBe(2);
      expect(queue.get(2)).toBe(1);
    });
    
    it('should mix with addLast', () => {
      const queue = new QueueList<number>();
      queue.add(2);
      queue.addFirst(1);
      queue.add(3);
      queue.addFirst(0);
      
      expect(queue.toArray()).toEqual([0, 1, 2, 3]);
    });
  });
  
  describe('removeFirst', () => {
    it('should remove from front', () => {
      const queue = QueueList.from([1, 2, 3]);
      
      expect(queue.removeFirst()).toBe(1);
      expect(queue.removeFirst()).toBe(2);
      expect(queue.removeFirst()).toBe(3);
      expect(queue.isEmpty()).toBe(true);
    });
    
    it('should throw when empty', () => {
      const queue = new QueueList<number>();
      expect(() => queue.removeFirst()).toThrow('No element');
    });
  });
  
  describe('removeLast', () => {
    it('should remove from end', () => {
      const queue = QueueList.from([1, 2, 3]);
      
      expect(queue.removeLast()).toBe(3);
      expect(queue.removeLast()).toBe(2);
      expect(queue.removeLast()).toBe(1);
      expect(queue.isEmpty()).toBe(true);
    });
    
    it('should throw when empty', () => {
      const queue = new QueueList<number>();
      expect(() => queue.removeLast()).toThrow('No element');
    });
  });
  
  describe('double-ended operations', () => {
    it('should work as deque', () => {
      const queue = new QueueList<number>();
      
      queue.addLast(1);      // [1]
      queue.addFirst(0);     // [0, 1]
      queue.addLast(2);      // [0, 1, 2]
      queue.addFirst(-1);    // [-1, 0, 1, 2]
      
      expect(queue.removeFirst()).toBe(-1);  // [0, 1, 2]
      expect(queue.removeLast()).toBe(2);    // [0, 1]
      expect(queue.removeFirst()).toBe(0);   // [1]
      expect(queue.removeLast()).toBe(1);    // []
      
      expect(queue.isEmpty()).toBe(true);
    });
  });
  
  describe('get/set', () => {
    it('should get element at index', () => {
      const queue = QueueList.from([10, 20, 30, 40]);
      
      expect(queue.get(0)).toBe(10);
      expect(queue.get(1)).toBe(20);
      expect(queue.get(2)).toBe(30);
      expect(queue.get(3)).toBe(40);
    });
    
    it('should set element at index', () => {
      const queue = QueueList.from([10, 20, 30]);
      
      queue.set(1, 25);
      expect(queue.get(1)).toBe(25);
      expect(queue.toArray()).toEqual([10, 25, 30]);
    });
    
    it('should throw on invalid index', () => {
      const queue = QueueList.from([1, 2, 3]);
      
      expect(() => queue.get(-1)).toThrow();
      expect(() => queue.get(3)).toThrow();
      expect(() => queue.set(-1, 0)).toThrow();
      expect(() => queue.set(3, 0)).toThrow();
    });
  });
  
  describe('addAll', () => {
    it('should add multiple elements', () => {
      const queue = new QueueList<number>();
      queue.addAll([1, 2, 3, 4, 5]);
      
      expect(queue.getLength()).toBe(5);
      expect(queue.toArray()).toEqual([1, 2, 3, 4, 5]);
    });
    
    it('should handle large batches', () => {
      const queue = new QueueList<number>();
      const batch = Array.from({ length: 100 }, (_, i) => i);
      queue.addAll(batch);
      
      expect(queue.getLength()).toBe(100);
      expect(queue.get(0)).toBe(0);
      expect(queue.get(99)).toBe(99);
    });
    
    it('should work with existing elements', () => {
      const queue = QueueList.from([1, 2]);
      queue.addAll([3, 4, 5]);
      
      expect(queue.toArray()).toEqual([1, 2, 3, 4, 5]);
    });
  });
  
  describe('setLength', () => {
    it('should decrease length', () => {
      const queue = QueueList.from([1, 2, 3, 4, 5]);
      queue.setLength(3);
      
      expect(queue.getLength()).toBe(3);
      expect(queue.toArray()).toEqual([1, 2, 3]);
    });
    
    it('should increase length', () => {
      const queue = QueueList.from([1, 2, 3]);
      queue.setLength(5);
      
      expect(queue.getLength()).toBe(5);
    });
    
    it('should throw on negative length', () => {
      const queue = new QueueList<number>();
      expect(() => queue.setLength(-1)).toThrow();
    });
  });
  
  describe('clear', () => {
    it('should remove all elements', () => {
      const queue = QueueList.from([1, 2, 3, 4, 5]);
      queue.clear();
      
      expect(queue.isEmpty()).toBe(true);
      expect(queue.getLength()).toBe(0);
    });
  });
  
  describe('toArray', () => {
    it('should return array of elements', () => {
      const queue = QueueList.from([1, 2, 3]);
      const arr = queue.toArray();
      
      expect(arr).toEqual([1, 2, 3]);
      expect(queue.getLength()).toBe(3); // Queue unchanged
    });
    
    it('should handle empty queue', () => {
      const queue = new QueueList<number>();
      expect(queue.toArray()).toEqual([]);
    });
  });
  
  describe('circular buffer behavior', () => {
    it('should handle wrap-around', () => {
      const queue = new QueueList<number>(4); // Small capacity
      
      // Fill queue
      queue.add(1);
      queue.add(2);
      queue.add(3);
      
      // Remove and add to cause wrap-around
      queue.removeFirst(); // Remove 1
      queue.add(4);
      queue.removeFirst(); // Remove 2
      queue.add(5);
      
      expect(queue.toArray()).toEqual([3, 4, 5]);
    });
  });
  
  describe('growth', () => {
    it('should grow capacity automatically', () => {
      const queue = new QueueList<number>(4);
      
      // Add more elements than initial capacity
      for (let i = 0; i < 20; i++) {
        queue.add(i);
      }
      
      expect(queue.getLength()).toBe(20);
      for (let i = 0; i < 20; i++) {
        expect(queue.get(i)).toBe(i);
      }
    });
  });
  
  describe('stress test', () => {
    it('should handle 1000 elements with mixed operations', () => {
      const queue = new QueueList<number>();
      
      // Add 500 to end
      for (let i = 0; i < 500; i++) {
        queue.add(i);
      }
      
      // Add 500 to front
      for (let i = 500; i < 1000; i++) {
        queue.addFirst(i);
      }
      
      expect(queue.getLength()).toBe(1000);
      
      // Remove from both ends
      for (let i = 0; i < 250; i++) {
        queue.removeFirst();
        queue.removeLast();
      }
      
      expect(queue.getLength()).toBe(500);
    });
  });
  
  describe('toString', () => {
    it('should format elements', () => {
      const queue = QueueList.from([1, 2, 3]);
      const str = queue.toString();
      
      expect(str).toContain('1');
      expect(str).toContain('2');
      expect(str).toContain('3');
    });
  });
});
