/**
 * Range utilities for generating numeric sequences.
 * 
 * Inspired by Dart's Iterable.generate and Python's range()
 * Provides lazy and eager range generation.
 */

/**
 * Generates a range of numbers from start (inclusive) to end (exclusive).
 * 
 * @param start - The starting value (inclusive)
 * @param end - The ending value (exclusive)
 * @param step - The increment (default: 1)
 * @returns Array of numbers in the range
 * 
 * Examples:
 * ```
 * range(0, 5)       // [0, 1, 2, 3, 4]
 * range(1, 10, 2)   // [1, 3, 5, 7, 9]
 * range(10, 0, -2)  // [10, 8, 6, 4, 2]
 * ```
 */
export function range(start: number, end: number, step: number = 1): number[] {
  if (step === 0) {
    throw new Error('Step cannot be zero');
  }
  
  const result: number[] = [];
  
  if (step > 0) {
    for (let i = start; i < end; i += step) {
      result.push(i);
    }
  } else {
    for (let i = start; i > end; i += step) {
      result.push(i);
    }
  }
  
  return result;
}

/**
 * Generates a range of integers from 0 to count (exclusive).
 * 
 * @param count - The number of elements to generate
 * @returns Array of numbers from 0 to count-1
 * 
 * Example:
 * ```
 * rangeCount(5)  // [0, 1, 2, 3, 4]
 * ```
 */
export function rangeCount(count: number): number[] {
  if (count < 0) {
    throw new Error('Count must be non-negative');
  }
  
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    result.push(i);
  }
  
  return result;
}

/**
 * Creates an iterable range that generates values lazily.
 * More memory efficient for large ranges.
 */
export class RangeIterable implements Iterable<number> {
  private start: number;
  private end: number;
  private step: number;

  constructor(start: number, end: number, step: number = 1) {
    if (step === 0) {
      throw new Error('Step cannot be zero');
    }
    this.start = start;
    this.end = end;
    this.step = step;
  }

  [Symbol.iterator](): Iterator<number> {
    return new RangeIterator(this.start, this.end, this.step);
  }

  /**
   * Converts the range to an array.
   */
  toArray(): number[] {
    return range(this.start, this.end, this.step);
  }

  /**
   * Returns the number of elements in the range.
   */
  getLength(): number {
    if (this.step > 0) {
      return Math.max(0, Math.ceil((this.end - this.start) / this.step));
    } else {
      return Math.max(0, Math.ceil((this.start - this.end) / -this.step));
    }
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
 * Iterator for RangeIterable
 */
class RangeIterator implements Iterator<number> {
  private current: number;
  private end: number;
  private step: number;
  private first: number;

  constructor(start: number, end: number, step: number) {
    this.current = start;
    this.end = end;
    this.step = step;
    this.first = start;
  }

  next(): IteratorResult<number> {
    const shouldContinue = this.step > 0 
      ? this.current < this.end 
      : this.current > this.end;

    if (shouldContinue) {
      const value = this.current;
      this.current += this.step;
      return new IteratorResultImpl(false, value);
    }
    
    return new IteratorResultImpl(true, this.first);
  }
}
