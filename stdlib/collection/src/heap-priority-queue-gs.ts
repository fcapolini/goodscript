// Heap-based priority queue for GoodScript
// Simplified from Dart's collection package
// Copyright (c) 2014, the Dart project authors. BSD-style license.
// Adapted for GoodScript compatibility

/**
 * A priority queue is a priority based work-list of elements.
 * 
 * The queue allows adding elements, and removing them again in priority order.
 */
export interface PriorityQueue<E> {
  /** Number of elements in the queue. */
  getLength(): number;
  
  /** Whether the queue is empty. */
  isEmpty(): boolean;
  
  /** Whether the queue has any elements. */
  isNotEmpty(): boolean;
  
  /**
   * Checks if object is in the queue.
   */
  contains(object: E): boolean;
  
  /**
   * Returns all elements as an array in no particular order.
   */
  getUnorderedElements(): E[];
  
  /**
   * Adds element to the queue.
   */
  add(element: E): void;
  
  /** Adds all elements to the queue. */
  addAll(elements: E[]): void;
  
  /**
   * Returns the next element without removing it.
   * The queue must not be empty.
   */
  getFirst(): E;
  
  /**
   * Removes and returns the element with the highest priority.
   * The queue must not be empty.
   */
  removeFirst(): E;
  
  /**
   * Removes an element that compares equal to element.
   * Returns true if found and removed.
   */
  remove(element: E): boolean;
  
  /**
   * Removes all elements and returns them in priority order.
   */
  removeAll(): E[];
  
  /** Removes all elements. */
  clear(): void;
  
  /** Returns all elements as an array. */
  toArray(): E[];
}

/**
 * Default comparison function for natural ordering.
 */
function defaultCompare<T>(a: T, b: T): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Min-heap based priority queue.
 * Elements with smaller comparison values have higher priority.
 */
export class HeapPriorityQueue<E> implements PriorityQueue<E> {
  private queue: E[];
  private length: number;
  private comparison: (a: E, b: E) => number;
  
  constructor(comparison?: (a: E, b: E) => number) {
    this.queue = [];
    this.length = 0;
    if (comparison === undefined) {
      this.comparison = defaultCompare as (a: E, b: E) => number;
    } else {
      this.comparison = comparison;
    }
  }
  
  private compare(a: E, b: E): number {
    return this.comparison(a, b);
  }
  
  add(element: E): void {
    this.queue[this.length] = element;
    this.length++;
    this.bubbleUp(this.length - 1);
  }
  
  addAll(elements: E[]): void {
    for (let i = 0; i < elements.length; i++) {
      this.add(elements[i]);
    }
  }
  
  clear(): void {
    this.queue = [];
    this.length = 0;
  }
  
  contains(object: E): boolean {
    return this.locate(object) >= 0;
  }
  
  getUnorderedElements(): E[] {
    const result: E[] = [];
    for (let i = 0; i < this.length; i++) {
      result[i] = this.queue[i];
    }
    return result;
  }
  
  getFirst(): E {
    if (this.length === 0) {
      throw new Error("No element");
    }
    return this.queue[0];
  }
  
  isEmpty(): boolean {
    return this.length === 0;
  }
  
  isNotEmpty(): boolean {
    return this.length > 0;
  }
  
  getLength(): number {
    return this.length;
  }
  
  remove(element: E): boolean {
    const index = this.locate(element);
    if (index < 0) {
      return false;
    }
    
    this.length--;
    if (index === this.length) {
      // Removing last element - just decrease length
      return true;
    }
    
    const last = this.queue[this.length];
    const comp = this.compare(last, element);
    if (comp <= 0) {
      this.bubbleDown(last, index);
    } else {
      this.bubbleUp(index, last);
    }
    return true;
  }
  
  removeAll(): E[] {
    const result: E[] = [];
    while (this.isNotEmpty()) {
      result[result.length] = this.removeFirst();
    }
    return result;
  }
  
  removeFirst(): E {
    if (this.length === 0) {
      throw new Error("No element");
    }
    
    const first = this.queue[0];
    this.length--;
    
    if (this.length > 0) {
      const last = this.queue[this.length];
      this.bubbleDown(last, 0);
    }
    
    return first;
  }
  
  toArray(): E[] {
    return this.getUnorderedElements();
  }
  
  toString(): string {
    const arr = this.toArray();
    let result = "";
    for (let i = 0; i < arr.length; i++) {
      if (i > 0) {
        result += ", ";
      }
      result += arr[i];
    }
    return result;
  }
  
  private locate(object: E): number {
    for (let i = 0; i < this.length; i++) {
      if (this.compare(this.queue[i], object) === 0) {
        return i;
      }
    }
    return -1;
  }
  
  private bubbleUp(index: number, element: E | null = null): void {
    let elem: E;
    if (element !== null) {
      elem = element;
    } else {
      elem = this.queue[index];
    }
    
    while (index > 0) {
      const parentIndex = (index - 1) >> 1;
      const parent = this.queue[parentIndex];
      
      if (this.compare(elem, parent) >= 0) {
        break;
      }
      
      this.queue[index] = parent;
      index = parentIndex;
    }
    
    this.queue[index] = elem;
  }
  
  private bubbleDown(element: E, index: number): void {
    while (true) {
      const leftIndex = (index * 2) + 1;
      const rightIndex = leftIndex + 1;
      
      if (leftIndex >= this.length) {
        break;
      }
      
      let minIndex = leftIndex;
      let minChild = this.queue[leftIndex];
      
      if (rightIndex < this.length) {
        const rightChild = this.queue[rightIndex];
        if (this.compare(rightChild, minChild) < 0) {
          minIndex = rightIndex;
          minChild = rightChild;
        }
      }
      
      if (this.compare(element, minChild) <= 0) {
        break;
      }
      
      this.queue[index] = minChild;
      index = minIndex;
    }
    
    this.queue[index] = element;
  }
}
