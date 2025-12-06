/**
 * A queue implementation based on a growable list.
 * 
 * Translated from Dart's ListQueue (dart:collection)
 * Source: https://api.dart.dev/stable/dart-collection/ListQueue-class.html
 * 
 * A ListQueue keeps an internal buffer, and it grows to accommodate new entries
 * as needed. It efficiently implements both queue (add to end, remove from front)
 * and deque (add/remove from both ends) operations.
 */

const _INITIAL_CAPACITY = 8;

export class ListQueue<E> implements Iterable<E> {
  private table: (E | null)[];
  private head: number;
  private tail: number;

  constructor(initialCapacity?: number) {
    let capacity = _INITIAL_CAPACITY;
    if (initialCapacity !== null && initialCapacity !== undefined) {
      capacity = this.nextPowerOf2(initialCapacity);
    }
    this.table = new Array(capacity).fill(null);
    this.head = 0;
    this.tail = 0;
  }

  /**
   * Creates a queue from an iterable.
   */
  static from<E>(elements: E[]): ListQueue<E> {
    const queue = new ListQueue<E>(elements.length);
    queue.addAll(elements);
    return queue;
  }

  /**
   * Creates a queue with the given elements.
   */
  static of<E>(...elements: E[]): ListQueue<E> {
    return ListQueue.from(elements);
  }

  /**
   * Returns the number of elements in the queue.
   */
  getLength(): number {
    return (this.tail - this.head) & (this.table.length - 1);
  }

  /**
   * Whether the queue is empty.
   */
  isEmpty(): boolean {
    return this.head === this.tail;
  }

  /**
   * Whether the queue has at least one element.
   */
  isNotEmpty(): boolean {
    return this.head !== this.tail;
  }

  /**
   * Removes all elements from the queue.
   */
  clear(): void {
    this.table = new Array(_INITIAL_CAPACITY).fill(null);
    this.head = 0;
    this.tail = 0;
  }

  /**
   * Adds an element at the end of the queue.
   */
  add(element: E): void {
    this.addLast(element);
  }

  /**
   * Adds an element at the end of the queue.
   */
  addLast(element: E): void {
    this.table[this.tail] = element;
    this.tail = (this.tail + 1) & (this.table.length - 1);
    if (this.head === this.tail) {
      this.grow();
    }
  }

  /**
   * Adds an element at the beginning of the queue.
   */
  addFirst(element: E): void {
    this.head = (this.head - 1) & (this.table.length - 1);
    this.table[this.head] = element;
    if (this.head === this.tail) {
      this.grow();
    }
  }

  /**
   * Adds all elements from an array to the end of the queue.
   */
  addAll(elements: E[]): void {
    for (const element of elements) {
      this.addLast(element);
    }
  }

  /**
   * Removes and returns the first element.
   * Throws if the queue is empty.
   */
  removeFirst(): E {
    if (this.head === this.tail) {
      throw new Error('No element');
    }
    const result = this.table[this.head];
    this.table[this.head] = null;
    this.head = (this.head + 1) & (this.table.length - 1);
    return result as E;
  }

  /**
   * Removes and returns the last element.
   * Throws if the queue is empty.
   */
  removeLast(): E {
    if (this.head === this.tail) {
      throw new Error('No element');
    }
    this.tail = (this.tail - 1) & (this.table.length - 1);
    const result = this.table[this.tail];
    this.table[this.tail] = null;
    return result as E;
  }

  /**
   * Returns the first element without removing it.
   * Throws if the queue is empty.
   */
  getFirst(): E {
    if (this.head === this.tail) {
      throw new Error('No element');
    }
    return this.table[this.head] as E;
  }

  /**
   * Returns the last element without removing it.
   * Throws if the queue is empty.
   */
  getLast(): E {
    if (this.head === this.tail) {
      throw new Error('No element');
    }
    return this.table[(this.tail - 1) & (this.table.length - 1)] as E;
  }

  /**
   * Returns the element at the given index.
   * Throws if index is out of bounds.
   */
  elementAt(index: number): E {
    const length = this.getLength();
    if (index < 0 || index >= length) {
      throw new Error(`Index out of bounds: ${index}`);
    }
    return this.table[(this.head + index) & (this.table.length - 1)] as E;
  }

  /**
   * Returns all elements as an array.
   */
  toArray(): E[] {
    const length = this.getLength();
    const result: E[] = [];
    
    for (let i = 0; i < length; i++) {
      result.push(this.table[(this.head + i) & (this.table.length - 1)] as E);
    }
    
    return result;
  }
  
  /**
   * Returns an iterator over elements in order.
   */
  [Symbol.iterator](): Iterator<E> {
    return new ListQueueIterator(this);
  }

  /**
   * Returns a string representation of the queue.
   */
  toString(): string {
    return '{' + this.toArray().join(', ') + '}';
  }

  /**
   * Grows the internal buffer when it becomes full.
   */
  private grow(): void {
    const oldCapacity = this.table.length;
    const newTable = new Array(oldCapacity * 2).fill(null);
    
    // Split: elements from head to end of array
    const split = oldCapacity - this.head;
    for (let i = 0; i < split; i++) {
      newTable[i] = this.table[this.head + i];
    }
    
    // Wrap: elements from start of array to tail
    for (let i = 0; i < this.tail; i++) {
      newTable[split + i] = this.table[i];
    }
    
    this.head = 0;
    this.tail = oldCapacity;
    this.table = newTable;
  }

  /**
   * Returns the next power of 2 >= the given number.
   */
  private nextPowerOf2(n: number): number {
    if (n < 1) {
      return 1;
    }
    n = n - 1;
    n = n | (n >> 1);
    n = n | (n >> 2);
    n = n | (n >> 4);
    n = n | (n >> 8);
    n = n | (n >> 16);
    return n + 1;
  }
}

/**
 * Concrete implementation of IteratorResult
 */
class IteratorResultImpl<T> {
  done: boolean;
  value: T;
  
  constructor(done: boolean, value: T) {
    this.done = done;
    this.value = value;
  }
}

/**
 * Iterator for ListQueue - iterates in order from head to tail
 */
class ListQueueIterator<E> implements Iterator<E> {
  private queue: ListQueue<E>;
  private index: number;
  private length: number;
  
  constructor(queue: ListQueue<E>) {
    this.queue = queue;
    this.index = 0;
    this.length = queue.getLength();
  }
  
  next(): IteratorResult<E> {
    if (this.index < this.length) {
      const value = this.queue.elementAt(this.index);
      this.index++;
      return new IteratorResultImpl(false, value);
    }
    // When done, return first element as dummy (it won't be used)
    const dummyValue = this.queue.elementAt(0);
    return new IteratorResultImpl(true, dummyValue);
  }
}
