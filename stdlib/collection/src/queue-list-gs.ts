// Translated from Dart's collection package
// Original: https://github.com/dart-lang/collection/blob/master/lib/src/queue_list.dart
// Copyright (c) 2014, the Dart project authors. BSD-style license.
// Adapted for GoodScript compatibility

/**
 * A double-ended queue (deque) that efficiently implements both Queue and List operations.
 * 
 * Provides O(1) addition and removal at both ends, and O(1) indexed access.
 * Uses a circular buffer internally for efficient operations.
 */
export class QueueList<E> {
  private static INITIAL_CAPACITY = 8;
  
  private table: (E | null)[];
  private head: number;
  private tail: number;
  
  /**
   * Creates an empty queue.
   * @param initialCapacity Optional initial capacity (will be rounded up to power of 2)
   */
  constructor(initialCapacity?: number) {
    const capacity = QueueList.computeInitialCapacity(initialCapacity);
    this.table = new Array<E | null>(capacity).fill(null);
    this.head = 0;
    this.tail = 0;
  }
  
  /**
   * Creates a queue from an iterable.
   */
  static from<E>(source: E[]): QueueList<E> {
    const length = source.length;
    const queue = new QueueList<E>(length + 1);
    
    for (let i = 0; i < length; i++) {
      queue.table[i] = source[i];
    }
    queue.tail = length;
    
    return queue;
  }
  
  private static computeInitialCapacity(initialCapacity: number | undefined): number {
    if (initialCapacity === undefined || initialCapacity < QueueList.INITIAL_CAPACITY) {
      return QueueList.INITIAL_CAPACITY;
    }
    
    let capacity = initialCapacity + 1;
    if (QueueList.isPowerOf2(capacity)) {
      return capacity;
    }
    return QueueList.nextPowerOf2(capacity);
  }
  
  private static isPowerOf2(number: number): boolean {
    return (number & (number - 1)) === 0;
  }
  
  private static nextPowerOf2(number: number): number {
    number = (number << 1) - 1;
    
    while (true) {
      const nextNumber = number & (number - 1);
      if (nextNumber === 0) {
        return number;
      }
      number = nextNumber;
    }
  }
  
  // Queue operations
  
  /**
   * Adds element to the end of the queue. O(1) amortized.
   */
  add(element: E): void {
    this.addLast(element);
  }
  
  /**
   * Adds all elements to the end of the queue.
   */
  addAll(elements: E[]): void {
    const addCount = elements.length;
    const length = this.getLength();
    
    if (length + addCount >= this.table.length) {
      this.preGrow(length + addCount);
      // After preGrow, all elements are at the start
      for (let i = 0; i < addCount; i++) {
        this.table[length + i] = elements[i];
      }
      this.tail += addCount;
    } else {
      // Adding elements won't reach head
      const endSpace = this.table.length - this.tail;
      
      if (addCount < endSpace) {
        for (let i = 0; i < addCount; i++) {
          this.table[this.tail + i] = elements[i];
        }
        this.tail += addCount;
      } else {
        const preSpace = addCount - endSpace;
        for (let i = 0; i < endSpace; i++) {
          this.table[this.tail + i] = elements[i];
        }
        for (let i = 0; i < preSpace; i++) {
          this.table[i] = elements[endSpace + i];
        }
        this.tail = preSpace;
      }
    }
  }
  
  /**
   * Adds element to the end of the queue. O(1) amortized.
   */
  addLast(element: E): void {
    this.table[this.tail] = element;
    this.tail = (this.tail + 1) & (this.table.length - 1);
    if (this.head === this.tail) {
      this.grow();
    }
  }
  
  /**
   * Adds element to the front of the queue. O(1) amortized.
   */
  addFirst(element: E): void {
    this.head = (this.head - 1) & (this.table.length - 1);
    this.table[this.head] = element;
    if (this.head === this.tail) {
      this.grow();
    }
  }
  
  /**
   * Removes and returns the first element. O(1).
   * Throws if queue is empty.
   */
  removeFirst(): E {
    if (this.head === this.tail) {
      throw new Error("No element");
    }
    
    const result = this.table[this.head];
    if (result === null) {
      throw new Error("No element");
    }
    
    this.table[this.head] = null;
    this.head = (this.head + 1) & (this.table.length - 1);
    return result;
  }
  
  /**
   * Removes and returns the last element. O(1).
   * Throws if queue is empty.
   */
  removeLast(): E {
    if (this.head === this.tail) {
      throw new Error("No element");
    }
    
    this.tail = (this.tail - 1) & (this.table.length - 1);
    const result = this.table[this.tail];
    if (result === null) {
      throw new Error("No element");
    }
    
    this.table[this.tail] = null;
    return result;
  }
  
  // List operations
  
  /**
   * Returns the number of elements in the queue. O(1).
   */
  getLength(): number {
    return (this.tail - this.head) & (this.table.length - 1);
  }
  
  /**
   * Sets the length of the queue.
   * Can only increase length (fills with nulls - not supported in GoodScript).
   * Can decrease length (removes elements from end).
   */
  setLength(value: number): void {
    if (value < 0) {
      throw new Error("Length may not be negative");
    }
    
    const delta = value - this.getLength();
    
    if (delta >= 0) {
      // Increasing length - just move tail
      if (this.table.length <= value) {
        this.preGrow(value);
      }
      this.tail = (this.tail + delta) & (this.table.length - 1);
      return;
    }
    
    // Decreasing length - clear removed elements
    let newTail = this.tail + delta; // delta is negative
    
    if (newTail >= 0) {
      for (let i = newTail; i < this.tail; i++) {
        this.table[i] = null;
      }
    } else {
      newTail += this.table.length;
      for (let i = 0; i < this.tail; i++) {
        this.table[i] = null;
      }
      for (let i = newTail; i < this.table.length; i++) {
        this.table[i] = null;
      }
    }
    
    this.tail = newTail;
  }
  
  /**
   * Gets element at index. O(1).
   */
  get(index: number): E {
    const length = this.getLength();
    if (index < 0 || index >= length) {
      throw new Error(`Index ${index} must be in range [0..${length})`);
    }
    
    const result = this.table[(this.head + index) & (this.table.length - 1)];
    if (result === null) {
      throw new Error("Element is null");
    }
    return result;
  }
  
  /**
   * Sets element at index. O(1).
   */
  set(index: number, value: E): void {
    const length = this.getLength();
    if (index < 0 || index >= length) {
      throw new Error(`Index ${index} must be in range [0..${length})`);
    }
    
    this.table[(this.head + index) & (this.table.length - 1)] = value;
  }
  
  /**
   * Returns true if queue is empty.
   */
  isEmpty(): boolean {
    return this.head === this.tail;
  }
  
  /**
   * Returns true if queue is not empty.
   */
  isNotEmpty(): boolean {
    return this.head !== this.tail;
  }
  
  /**
   * Returns all elements as an array.
   */
  toArray(): E[] {
    const length = this.getLength();
    const result: E[] = [];
    
    for (let i = 0; i < length; i++) {
      const element = this.get(i);
      result[i] = element;
    }
    
    return result;
  }
  
  /**
   * Removes all elements from the queue.
   */
  clear(): void {
    this.head = 0;
    this.tail = 0;
    this.table = new Array<E | null>(QueueList.INITIAL_CAPACITY).fill(null);
  }
  
  /**
   * Returns string representation of the queue.
   */
  toString(): string {
    const elements = this.toArray();
    let result = "{";
    for (let i = 0; i < elements.length; i++) {
      if (i > 0) {
        result += ", ";
      }
      result += elements[i];
    }
    result += "}";
    return result;
  }
  
  // Internal helpers
  
  private grow(): void {
    const newTable = new Array<E | null>(this.table.length * 2).fill(null);
    const split = this.table.length - this.head;
    
    // Copy from head to end of old table
    for (let i = 0; i < split; i++) {
      newTable[i] = this.table[this.head + i];
    }
    
    // Copy from start of old table to tail
    for (let i = 0; i < this.head; i++) {
      newTable[split + i] = this.table[i];
    }
    
    this.head = 0;
    this.tail = this.table.length;
    this.table = newTable;
  }
  
  private preGrow(newElementCount: number): void {
    // Add 1.5x extra room
    newElementCount += newElementCount >> 1;
    const newCapacity = QueueList.nextPowerOf2(newElementCount);
    const newTable = new Array<E | null>(newCapacity).fill(null);
    
    this.tail = this.writeToList(newTable);
    this.table = newTable;
    this.head = 0;
  }
  
  private writeToList(target: (E | null)[]): number {
    if (this.head <= this.tail) {
      const length = this.tail - this.head;
      for (let i = 0; i < length; i++) {
        target[i] = this.table[this.head + i];
      }
      return length;
    } else {
      const firstPartSize = this.table.length - this.head;
      
      // Copy from head to end
      for (let i = 0; i < firstPartSize; i++) {
        target[i] = this.table[this.head + i];
      }
      
      // Copy from start to tail
      for (let i = 0; i < this.tail; i++) {
        target[firstPartSize + i] = this.table[i];
      }
      
      return this.tail + firstPartSize;
    }
  }
}
