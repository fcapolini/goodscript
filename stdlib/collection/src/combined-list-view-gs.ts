/**
 * CombinedListView - A view of several arrays combined into a single array.
 * 
 * Translated from Dart's collection package.
 * Source: https://github.com/dart-lang/core/blob/main/pkgs/collection/lib/src/combined_wrappers/combined_list.dart
 * 
 * All methods treat the CombinedListView as if it were a single concatenated array,
 * but the underlying implementation lazily accesses individual array instances.
 * This means if the underlying arrays change, the CombinedListView reflects those changes.
 * 
 * Note: get(index) and getLength() are O(lists) rather than O(1).
 * This view is unmodifiable - all mutation operations throw errors.
 * 
 * @example
 * const list1 = [1, 2, 3];
 * const list2 = [4, 5];
 * const list3 = [6, 7, 8, 9];
 * const combined = new CombinedListView([list1, list2, list3]);
 * 
 * combined.getLength(); // 9
 * combined.get(0);      // 1
 * combined.get(3);      // 4
 * combined.get(7);      // 8
 * 
 * // Reflects changes in underlying arrays
 * list1.push(10);
 * combined.getLength(); // 10
 * combined.get(3);      // 10
 */
export class CombinedListView<T> {
  private lists: T[][];

  /**
   * Creates a combined view of multiple arrays.
   * 
   * @param lists - The arrays to combine into a single view
   */
  constructor(lists: T[][]) {
    this.lists = lists;
  }

  /**
   * Returns the total length across all underlying arrays.
   * 
   * Performance: O(n) where n is the number of arrays.
   * 
   * @returns Total number of elements across all arrays
   */
  getLength(): number {
    let totalLength = 0;
    for (const list of this.lists) {
      totalLength += list.length;
    }
    return totalLength;
  }

  /**
   * Returns the element at the given index across all arrays.
   * 
   * Performance: O(n) where n is the number of arrays.
   * 
   * @param index - The index to access (0-based, across all arrays)
   * @returns The element at the given index
   * @throws RangeError if index is out of bounds
   */
  get(index: number): T {
    const initialIndex = index;
    
    // Check for negative index or index >= length
    if (index < 0 || index >= this.getLength()) {
      throw new RangeError(`Index out of range: ${initialIndex}, length: ${this.getLength()}`);
    }
    
    for (let i = 0; i < this.lists.length; i++) {
      const list = this.lists[i];
      if (index < list.length) {
        return list[index];
      }
      index -= list.length;
    }
    
    throw new RangeError(`Index out of range: ${initialIndex}, length: ${this.getLength()}`);
  }

  /**
   * Converts the combined view to a single array.
   * 
   * Creates a new array containing all elements from all underlying arrays.
   * 
   * @returns A new array with all elements
   */
  toArray(): T[] {
    const result: T[] = [];
    for (const list of this.lists) {
      for (const item of list) {
        result.push(item);
      }
    }
    return result;
  }

  /**
   * Checks if the combined view is empty.
   * 
   * @returns true if all underlying arrays are empty
   */
  isEmpty(): boolean {
    for (const list of this.lists) {
      if (list.length > 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Checks if the combined view contains the given element.
   * 
   * @param element - The element to search for
   * @returns true if any underlying array contains the element
   */
  contains(element: T): boolean {
    for (const list of this.lists) {
      if (list.includes(element)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Returns the first element, or null if empty.
   * 
   * @returns The first element across all arrays, or null if all arrays are empty
   */
  getFirst(): T | null {
    for (const list of this.lists) {
      if (list.length > 0) {
        return list[0];
      }
    }
    return null;
  }

  /**
   * Returns the last element, or null if empty.
   * 
   * @returns The last element across all arrays, or null if all arrays are empty
   */
  getLast(): T | null {
    for (let i = this.lists.length - 1; i >= 0; i--) {
      const list = this.lists[i];
      if (list.length > 0) {
        return list[list.length - 1];
      }
    }
    return null;
  }

  /**
   * Finds the index of the first occurrence of element.
   * 
   * @param element - The element to find
   * @param start - Optional starting index (defaults to 0)
   * @returns The index of the element, or -1 if not found
   */
  indexOf(element: T, start: number = 0): number {
    let currentIndex = 0;
    
    for (const list of this.lists) {
      for (let i = 0; i < list.length; i++) {
        if (currentIndex >= start && list[i] === element) {
          return currentIndex;
        }
        currentIndex++;
      }
    }
    
    return -1;
  }

  /**
   * Executes a function on each element.
   * 
   * @param fn - Function to execute on each element
   */
  forEach(fn: (element: T, index: number) => void): void {
    let index = 0;
    for (const list of this.lists) {
      for (const element of list) {
        fn(element, index);
        index++;
      }
    }
  }

  /**
   * Tests whether at least one element passes the test.
   * 
   * @param test - Function to test each element
   * @returns true if at least one element passes the test
   */
  some(test: (element: T) => boolean): boolean {
    for (const list of this.lists) {
      for (const element of list) {
        if (test(element)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Tests whether all elements pass the test.
   * 
   * @param test - Function to test each element
   * @returns true if all elements pass the test
   */
  every(test: (element: T) => boolean): boolean {
    for (const list of this.lists) {
      for (const element of list) {
        if (!test(element)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Maps each element to a new value using the provided function.
   * 
   * @param fn - Function to transform each element
   * @returns Array of transformed elements
   */
  map<U>(fn: (element: T) => U): U[] {
    const result: U[] = [];
    for (const list of this.lists) {
      for (const element of list) {
        result.push(fn(element));
      }
    }
    return result;
  }

  /**
   * Filters elements that pass the test.
   * 
   * @param predicate - Function to test each element
   * @returns Array of elements that pass the test
   */
  filter(predicate: (element: T) => boolean): T[] {
    const result: T[] = [];
    for (const list of this.lists) {
      for (const element of list) {
        if (predicate(element)) {
          result.push(element);
        }
      }
    }
    return result;
  }
}
