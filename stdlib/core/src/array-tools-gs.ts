/**
 * Array utilities with dual error handling pattern.
 * 
 * All fallible operations provide:
 * - `operation()` - throws Error on failure
 * - `tryOperation()` - returns null on failure
 */
export class ArrayTools {
  /**
   * Get element at index. Throws if index is out of bounds.
   */
  static at<T>(arr: Array<T>, index: number): T {
    const result = ArrayTools.tryAt(arr, index);
    if (result === null) {
      throw new Error(`Array index out of bounds: ${index} (length: ${arr.length})`);
    }
    return result;
  }

  /**
   * Get element at index. Returns null if index is out of bounds.
   */
  static tryAt<T>(arr: Array<T>, index: number): T | null {
    // Support negative indexing
    const actualIndex = index < 0 ? arr.length + index : index;
    if (actualIndex < 0 || actualIndex >= arr.length) {
      return null;
    }
    return arr[actualIndex];
  }

  /**
   * Get first element. Throws if array is empty.
   */
  static first<T>(arr: Array<T>): T {
    const result = ArrayTools.tryFirst(arr);
    if (result === null) {
      throw new Error('Cannot get first element of empty array');
    }
    return result;
  }

  /**
   * Get first element. Returns null if array is empty.
   */
  static tryFirst<T>(arr: Array<T>): T | null {
    if (arr.length === 0) {
      return null;
    }
    return arr[0];
  }

  /**
   * Get last element. Throws if array is empty.
   */
  static last<T>(arr: Array<T>): T {
    const result = ArrayTools.tryLast(arr);
    if (result === null) {
      throw new Error('Cannot get last element of empty array');
    }
    return result;
  }

  /**
   * Get last element. Returns null if array is empty.
   */
  static tryLast<T>(arr: Array<T>): T | null {
    if (arr.length === 0) {
      return null;
    }
    return arr[arr.length - 1];
  }

  /**
   * Split array into chunks of specified size.
   * Last chunk may be smaller if array length is not evenly divisible.
   */
  static chunk<T>(arr: Array<T>, size: number): Array<Array<T>> {
    if (size <= 0) {
      throw new Error(`Chunk size must be positive, got: ${size}`);
    }

    const result: Array<Array<T>> = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  }

  /**
   * Zip two arrays together into array of tuples.
   * Result length is minimum of input lengths.
   */
  static zip<T, U>(a: Array<T>, b: Array<U>): Array<[T, U]> {
    const length = Math.min(a.length, b.length);
    const result: Array<[T, U]> = [];
    for (let i = 0; i < length; i++) {
      result.push([a[i], b[i]]);
    }
    return result;
  }

  /**
   * Create range of integers [start, end).
   */
  static range(start: number, end: number, step: number = 1): Array<number> {
    if (step === 0) {
      throw new Error('Step cannot be zero');
    }
    if ((end - start) / step < 0) {
      throw new Error('Invalid range: step direction does not match start/end');
    }

    const result: Array<number> = [];
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
   * Flatten nested array one level deep.
   */
  static flatten<T>(arr: Array<Array<T>>): Array<T> {
    const result: Array<T> = [];
    for (const subArray of arr) {
      for (const item of subArray) {
        result.push(item);
      }
    }
    return result;
  }

  /**
   * Remove duplicate values from array.
   * Preserves first occurrence order.
   */
  static unique<T>(arr: Array<T>): Array<T> {
    const seen = new Set<T>();
    const result: Array<T> = [];
    for (const item of arr) {
      if (!seen.has(item)) {
        seen.add(item);
        result.push(item);
      }
    }
    return result;
  }

  /**
   * Partition array into two arrays based on predicate.
   * Returns [truthy, falsy] tuple.
   */
  static partition<T>(arr: Array<T>, predicate: (item: T) => boolean): [Array<T>, Array<T>] {
    const truthy: Array<T> = [];
    const falsy: Array<T> = [];
    for (const item of arr) {
      if (predicate(item)) {
        truthy.push(item);
      } else {
        falsy.push(item);
      }
    }
    return [truthy, falsy];
  }
}
