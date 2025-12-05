import { describe, it, expect } from 'vitest';
import { ListQueue } from '../src/list-queue-gs.js';

describe('ListQueue', () => {
  describe('constructor', () => {
    it('creates an empty queue', () => {
      const queue = new ListQueue<number>();
      expect(queue.isEmpty()).toBe(true);
      expect(queue.getLength()).toBe(0);
    });

    it('accepts initial capacity', () => {
      const queue = new ListQueue<number>(100);
      expect(queue.isEmpty()).toBe(true);
    });
  });

  describe('from', () => {
    it('creates queue from array', () => {
      const queue = ListQueue.from([1, 2, 3, 4, 5]);
      expect(queue.getLength()).toBe(5);
      expect(queue.toArray()).toEqual([1, 2, 3, 4, 5]);
    });

    it('creates empty queue from empty array', () => {
      const queue = ListQueue.from<number>([]);
      expect(queue.isEmpty()).toBe(true);
    });
  });

  describe('of', () => {
    it('creates queue from arguments', () => {
      const queue = ListQueue.of(1, 2, 3);
      expect(queue.toArray()).toEqual([1, 2, 3]);
    });
  });

  describe('add/addLast', () => {
    it('adds elements to the end', () => {
      const queue = new ListQueue<number>();
      queue.add(1);
      queue.add(2);
      queue.addLast(3);
      expect(queue.toArray()).toEqual([1, 2, 3]);
    });

    it('grows when full', () => {
      const queue = new ListQueue<number>(4);
      for (let i = 1; i <= 10; i++) {
        queue.add(i);
      }
      expect(queue.getLength()).toBe(10);
      expect(queue.toArray()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
  });

  describe('addFirst', () => {
    it('adds elements to the beginning', () => {
      const queue = new ListQueue<number>();
      queue.addFirst(1);
      queue.addFirst(2);
      queue.addFirst(3);
      expect(queue.toArray()).toEqual([3, 2, 1]);
    });

    it('works with addLast', () => {
      const queue = new ListQueue<number>();
      queue.addLast(2);
      queue.addFirst(1);
      queue.addLast(3);
      queue.addFirst(0);
      expect(queue.toArray()).toEqual([0, 1, 2, 3]);
    });
  });

  describe('addAll', () => {
    it('adds all elements from array', () => {
      const queue = ListQueue.from([1, 2]);
      queue.addAll([3, 4, 5]);
      expect(queue.toArray()).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('removeFirst', () => {
    it('removes and returns first element', () => {
      const queue = ListQueue.from([1, 2, 3]);
      expect(queue.removeFirst()).toBe(1);
      expect(queue.removeFirst()).toBe(2);
      expect(queue.toArray()).toEqual([3]);
    });

    it('throws on empty queue', () => {
      const queue = new ListQueue<number>();
      expect(() => queue.removeFirst()).toThrow('No element');
    });
  });

  describe('removeLast', () => {
    it('removes and returns last element', () => {
      const queue = ListQueue.from([1, 2, 3]);
      expect(queue.removeLast()).toBe(3);
      expect(queue.removeLast()).toBe(2);
      expect(queue.toArray()).toEqual([1]);
    });

    it('throws on empty queue', () => {
      const queue = new ListQueue<number>();
      expect(() => queue.removeLast()).toThrow('No element');
    });
  });

  describe('getFirst', () => {
    it('returns first element without removing', () => {
      const queue = ListQueue.from([1, 2, 3]);
      expect(queue.getFirst()).toBe(1);
      expect(queue.getLength()).toBe(3);
    });

    it('throws on empty queue', () => {
      const queue = new ListQueue<number>();
      expect(() => queue.getFirst()).toThrow('No element');
    });
  });

  describe('getLast', () => {
    it('returns last element without removing', () => {
      const queue = ListQueue.from([1, 2, 3]);
      expect(queue.getLast()).toBe(3);
      expect(queue.getLength()).toBe(3);
    });

    it('throws on empty queue', () => {
      const queue = new ListQueue<number>();
      expect(() => queue.getLast()).toThrow('No element');
    });
  });

  describe('elementAt', () => {
    it('returns element at index', () => {
      const queue = ListQueue.from([10, 20, 30, 40, 50]);
      expect(queue.elementAt(0)).toBe(10);
      expect(queue.elementAt(2)).toBe(30);
      expect(queue.elementAt(4)).toBe(50);
    });

    it('throws on negative index', () => {
      const queue = ListQueue.from([1, 2, 3]);
      expect(() => queue.elementAt(-1)).toThrow('Index out of bounds');
    });

    it('throws on index >= length', () => {
      const queue = ListQueue.from([1, 2, 3]);
      expect(() => queue.elementAt(3)).toThrow('Index out of bounds');
    });
  });

  describe('isEmpty/isNotEmpty', () => {
    it('returns correct values', () => {
      const queue = new ListQueue<number>();
      expect(queue.isEmpty()).toBe(true);
      expect(queue.isNotEmpty()).toBe(false);

      queue.add(1);
      expect(queue.isEmpty()).toBe(false);
      expect(queue.isNotEmpty()).toBe(true);
    });
  });

  describe('clear', () => {
    it('removes all elements', () => {
      const queue = ListQueue.from([1, 2, 3, 4, 5]);
      queue.clear();
      expect(queue.isEmpty()).toBe(true);
      expect(queue.getLength()).toBe(0);
    });
  });

  describe('toString', () => {
    it('returns string representation', () => {
      const queue = ListQueue.from([1, 2, 3]);
      expect(queue.toString()).toBe('{1, 2, 3}');
    });

    it('handles empty queue', () => {
      const queue = new ListQueue<number>();
      expect(queue.toString()).toBe('{}');
    });
  });

  describe('edge cases', () => {
    it('handles single element', () => {
      const queue = ListQueue.from([42]);
      expect(queue.getFirst()).toBe(42);
      expect(queue.getLast()).toBe(42);
      expect(queue.removeFirst()).toBe(42);
      expect(queue.isEmpty()).toBe(true);
    });

    it('handles wrap-around', () => {
      const queue = new ListQueue<number>(4);
      queue.add(1);
      queue.add(2);
      queue.add(3);
      queue.removeFirst();
      queue.removeFirst();
      queue.add(4);
      queue.add(5);
      queue.add(6);
      expect(queue.toArray()).toEqual([3, 4, 5, 6]);
    });

    it('handles alternating add/remove', () => {
      const queue = new ListQueue<string>();
      queue.addLast('a');
      queue.addFirst('b');
      expect(queue.removeFirst()).toBe('b');
      queue.addLast('c');
      expect(queue.removeLast()).toBe('c');
      expect(queue.toArray()).toEqual(['a']);
    });
  });

  describe('stress test', () => {
    it('handles many elements', () => {
      const queue = new ListQueue<number>();
      const n = 1000;

      for (let i = 0; i < n; i++) {
        queue.add(i);
      }

      expect(queue.getLength()).toBe(n);
      expect(queue.getFirst()).toBe(0);
      expect(queue.getLast()).toBe(n - 1);

      for (let i = 0; i < n; i++) {
        expect(queue.removeFirst()).toBe(i);
      }

      expect(queue.isEmpty()).toBe(true);
    });
  });
});
