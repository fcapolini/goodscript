/**
 * List utility extensions translated from Dart's collection package.
 * 
 * Source: https://github.com/dart-lang/collection/blob/master/lib/src/list_extensions.dart
 * 
 * Provides utility functions for list operations:
 * - binarySearch: Find element in sorted list (O(log n))
 * - lowerBound: Find insertion point in sorted list
 * - sortRange: Sort a subrange of the list
 * - shuffleRange: Shuffle a subrange randomly
 * - reverseRange: Reverse a subrange in-place
 * - swap: Swap two elements
 * - equals: Deep equality comparison
 * - elementAtOrNull: Safe element access
 * - slice: Create a view of a subrange
 */

/**
 * Default comparison function for elements.
 */
function defaultCompare<E>(a: E, b: E): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Identity function (returns its input unchanged).
 */
function identity<T>(x: T): T {
  return x;
}

/**
 * Returns the index of element in a sorted list using binary search.
 * 
 * The list must be sorted according to the compare function.
 * Returns -1 if element is not found.
 * 
 * Time complexity: O(log n)
 * 
 * @example
 * const list = [1, 3, 5, 7, 9];
 * binarySearch(list, 5, (a, b) => a - b); // Returns 2
 * binarySearch(list, 4, (a, b) => a - b); // Returns -1
 */
export function binarySearch<E>(
  list: E[],
  element: E,
  compare: (a: E, b: E) => number
): number {
  return binarySearchBy(list, identity, compare, element, 0, list.length);
}

/**
 * Returns the index of element in a sorted list using binary search.
 * Compares using the keyOf function to extract a comparable property.
 * 
 * @example
 * const users = [{id: 1, name: 'Alice'}, {id: 3, name: 'Bob'}];
 * const user = {id: 3, name: 'Bob'};
 * binarySearchBy(users, u => u.id, (a, b) => a - b, user); // Returns 1
 */
export function binarySearchBy<E, K>(
  list: E[],
  keyOf: (element: E) => K,
  compare: (a: K, b: K) => number,
  element: E,
  start: number = 0,
  end: number = list.length
): number {
  const key = keyOf(element);
  let min = start;
  let max = end;
  
  while (min < max) {
    const mid = min + ((max - min) >> 1);
    const comp = compare(keyOf(list[mid]), key);
    
    if (comp === 0) {
      return mid;
    }
    if (comp < 0) {
      min = mid + 1;
    } else {
      max = mid;
    }
  }
  
  return -1;
}

/**
 * Returns the index where element should be inserted to keep the list sorted.
 * 
 * Uses binary search to find the insertion point.
 * If element is already in the list, returns its index.
 * Otherwise returns the first position where adding element would keep the list sorted.
 * May return list.length if all elements compare less than element.
 * 
 * Time complexity: O(log n)
 * 
 * @example
 * const list = [1, 3, 5, 7, 9];
 * lowerBound(list, 5, (a, b) => a - b); // Returns 2 (element found)
 * lowerBound(list, 4, (a, b) => a - b); // Returns 2 (insertion point)
 * lowerBound(list, 10, (a, b) => a - b); // Returns 5 (end of list)
 */
export function lowerBound<E>(
  list: E[],
  element: E,
  compare: (a: E, b: E) => number
): number {
  return lowerBoundBy(list, identity, compare, element, 0, list.length);
}

/**
 * Returns the index where element should be inserted to keep the list sorted.
 * Compares using the keyOf function to extract a comparable property.
 * 
 * @example
 * const users = [{id: 1}, {id: 3}, {id: 5}];
 * lowerBoundBy(users, u => u.id, (a, b) => a - b, {id: 4}); // Returns 2
 */
export function lowerBoundBy<E, K>(
  list: E[],
  keyOf: (element: E) => K,
  compare: (a: K, b: K) => number,
  element: E,
  start: number = 0,
  end: number = list.length
): number {
  const key = keyOf(element);
  let min = start;
  let max = end;
  
  while (min < max) {
    const mid = min + ((max - min) >> 1);
    const comp = compare(keyOf(list[mid]), key);
    
    if (comp < 0) {
      min = mid + 1;
    } else {
      max = mid;
    }
  }
  
  return min;
}

/**
 * Sorts a range of elements in the list.
 * 
 * @param list The list to sort
 * @param start Start index of range to sort
 * @param end End index (exclusive) of range to sort
 * @param compare Comparison function
 * 
 * @example
 * const list = [5, 3, 8, 1, 9, 2];
 * sortRange(list, 1, 4, (a, b) => a - b);
 * // list is now [5, 1, 3, 8, 9, 2]
 */
export function sortRange<E>(
  list: E[],
  start: number,
  end: number,
  compare: (a: E, b: E) => number
): void {
  if (start < 0 || end > list.length || start > end) {
    throw new RangeError('Invalid range');
  }
  
  // Extract the range, sort it, and put it back
  const range = list.slice(start, end);
  range.sort(compare);
  for (let i = 0; i < range.length; i++) {
    list[start + i] = range[i];
  }
}

/**
 * Sorts elements by the compare function applied to their keyOf property.
 * 
 * @example
 * const users = [{id: 3, name: 'C'}, {id: 1, name: 'A'}, {id: 2, name: 'B'}];
 * sortByCompare(users, u => u.id, (a, b) => a - b);
 * // users is now sorted by id
 */
export function sortByCompare<E, K>(
  list: E[],
  keyOf: (element: E) => K,
  compare: (a: K, b: K) => number,
  start: number = 0,
  end: number = list.length
): void {
  if (start < 0 || end > list.length || start > end) {
    throw new RangeError('Invalid range');
  }
  
  const range = list.slice(start, end);
  range.sort((a, b) => compare(keyOf(a), keyOf(b)));
  for (let i = 0; i < range.length; i++) {
    list[start + i] = range[i];
  }
}

/**
 * Shuffles a range of elements randomly.
 * 
 * @param list The list to shuffle
 * @param start Start index of range to shuffle
 * @param end End index (exclusive) of range to shuffle
 * 
 * @example
 * const list = [1, 2, 3, 4, 5, 6];
 * shuffleRange(list, 1, 5);
 * // Elements at indices 1-4 are shuffled, 0 and 5 unchanged
 */
export function shuffleRange<E>(
  list: E[],
  start: number,
  end: number
): void {
  if (start < 0 || end > list.length || start > end) {
    throw new RangeError('Invalid range');
  }
  
  for (let i = start; i < end - 1; i++) {
    const j = i + Math.floor(Math.random() * (end - i));
    const temp = list[i];
    list[i] = list[j];
    list[j] = temp;
  }
}

/**
 * Reverses elements in a range of the list in-place.
 * 
 * @param list The list to modify
 * @param start Start index of range to reverse
 * @param end End index (exclusive) of range to reverse
 * 
 * @example
 * const list = [1, 2, 3, 4, 5, 6];
 * reverseRange(list, 1, 5);
 * // list is now [1, 5, 4, 3, 2, 6]
 */
export function reverseRange<E>(
  list: E[],
  start: number,
  end: number
): void {
  if (start < 0 || end > list.length || start > end) {
    throw new RangeError('Invalid range');
  }
  
  let i = start;
  let j = end - 1;
  while (i < j) {
    const temp = list[i];
    list[i] = list[j];
    list[j] = temp;
    i++;
    j--;
  }
}

/**
 * Swaps two elements in the list.
 * 
 * @param list The list to modify
 * @param index1 First index
 * @param index2 Second index
 * 
 * @example
 * const list = [1, 2, 3, 4, 5];
 * swap(list, 1, 3);
 * // list is now [1, 4, 3, 2, 5]
 */
export function swap<E>(
  list: E[],
  index1: number,
  index2: number
): void {
  if (index1 < 0 || index1 >= list.length) {
    throw new RangeError('index1 out of range');
  }
  if (index2 < 0 || index2 >= list.length) {
    throw new RangeError('index2 out of range');
  }
  
  const temp = list[index1];
  list[index1] = list[index2];
  list[index2] = temp;
}

/**
 * Interface for custom equality comparisons.
 */
export interface Equality<E> {
  equals(e1: E, e2: E): boolean;
  hash(e: E): number;
}

/**
 * Default equality using === and a simple hash function.
 */
class DefaultEquality<E> implements Equality<E> {
  equals(e1: E, e2: E): boolean {
    return e1 === e2;
  }
  
  hash(e: E): number {
    // Simple hash for primitives
    if (typeof e === 'string') {
      let hash = 0;
      for (let i = 0; i < e.length; i++) {
        hash = ((hash << 5) - hash) + e.charCodeAt(i);
        hash = hash & hash; // Convert to 32-bit integer
      }
      return hash;
    }
    if (typeof e === 'number') {
      return e | 0;
    }
    if (typeof e === 'boolean') {
      return e === true ? 1 : 0;
    }
    // For objects, use identity
    return 0;
  }
}

/**
 * Checks if two lists have the same elements.
 * 
 * Returns true if and only if other has the same length as this list,
 * and the elements at the same indices are equal according to the equality function.
 * 
 * @param list1 First list
 * @param list2 Second list
 * @param equality Custom equality function (defaults to ===)
 * 
 * @example
 * const list1 = [1, 2, 3];
 * const list2 = [1, 2, 3];
 * const list3 = [1, 2, 4];
 * equals(list1, list2); // true
 * equals(list1, list3); // false
 */
export function equals<E>(
  list1: E[],
  list2: E[],
  equality: Equality<E> = new DefaultEquality<E>()
): boolean {
  if (list1.length !== list2.length) {
    return false;
  }
  
  for (let i = 0; i < list1.length; i++) {
    if (!equality.equals(list1[i], list2[i])) {
      return false;
    }
  }
  
  return true;
}

/**
 * Returns the element at index, or null if index is out of bounds.
 * 
 * @param list The list to access
 * @param index The index to retrieve
 * 
 * @example
 * const list = [1, 2, 3];
 * elementAtOrNull(list, 1); // 2
 * elementAtOrNull(list, 5); // null
 * elementAtOrNull(list, -1); // null
 */
export function elementAtOrNull<E>(
  list: E[],
  index: number
): E | null {
  if (index < 0 || index >= list.length) {
    return null;
  }
  return list[index];
}

/**
 * Creates a read-only view of a portion of a list.
 * 
 * The slice is backed by the original list - changes to the original
 * list are reflected in the slice (but the slice length is fixed).
 * The slice does not allow modifications.
 * 
 * @param list The source list
 * @param start Start index (inclusive)
 * @param end End index (exclusive), defaults to list.length
 * 
 * @example
 * const list = [1, 2, 3, 4, 5];
 * const view = slice(list, 1, 4);
 * view.get(0); // 2
 * view.getLength(); // 3
 * list[1] = 99;
 * view.get(0); // 99 (reflects change in original)
 */
export function slice<E>(
  list: E[],
  start: number,
  end: number = list.length
): ListSlice<E> {
  if (start < 0 || end > list.length || start > end) {
    throw new RangeError('Invalid range');
  }
  return new ListSlice<E>(list, start, end);
}

/**
 * A read-only view of a range of a list.
 * 
 * Provides a fixed-length view of a portion of the source list.
 * The view is backed by the source list - modifications to the source
 * are visible through the slice.
 * The slice itself is read-only (no add/remove operations).
 */
export class ListSlice<E> {
  private _source: E[];
  private _start: number;
  private _length: number;
  private _initialSize: number;
  
  constructor(source: E[], start: number, end: number) {
    this._source = source;
    this._start = start;
    this._length = end - start;
    this._initialSize = source.length;
  }
  
  /**
   * Returns the length of this slice.
   */
  getLength(): number {
    return this._length;
  }
  
  /**
   * Returns the element at the given index.
   * 
   * @throws RangeError if index is out of bounds
   * @throws Error if source list has been modified
   */
  get(index: number): E {
    if (this._source.length !== this._initialSize) {
      throw new Error('Concurrent modification: source list changed length');
    }
    if (index < 0 || index >= this._length) {
      throw new RangeError('Index out of range');
    }
    return this._source[this._start + index];
  }
  
  /**
   * Checks if the slice is empty.
   */
  isEmpty(): boolean {
    return this._length === 0;
  }
  
  /**
   * Returns the first element, or throws if empty.
   */
  getFirst(): E {
    if (this._length === 0) {
      throw new Error('No element');
    }
    return this.get(0);
  }
  
  /**
   * Returns the last element, or throws if empty.
   */
  getLast(): E {
    if (this._length === 0) {
      throw new Error('No element');
    }
    return this.get(this._length - 1);
  }
  
  /**
   * Converts the slice to a regular array.
   */
  toArray(): E[] {
    const result: E[] = [];
    for (let i = 0; i < this._length; i++) {
      result.push(this.get(i));
    }
    return result;
  }
  
  /**
   * Creates a slice of this slice.
   */
  slice(start: number, end: number = this._length): ListSlice<E> {
    if (start < 0 || end > this._length || start > end) {
      throw new RangeError('Invalid range');
    }
    return new ListSlice<E>(
      this._source,
      this._start + start,
      this._start + end
    );
  }
}
