/**
 * IterableExtensions - Utility functions for working with iterables.
 * 
 * Translated from Dart's collection package:
 * https://github.com/dart-lang/collection/blob/master/lib/src/iterable_extensions.dart
 * 
 * Provides common operations on iterables like filtering, mapping with index,
 * finding elements, and statistical operations.
 */

/**
 * Returns elements that do not satisfy the test.
 * 
 * @param iterable - Source iterable
 * @param test - Predicate to test each element
 * @returns Array of elements that don't satisfy test
 */
export function whereNot<T>(
  iterable: Iterable<T>,
  test: (element: T) => boolean
): T[] {
  const result: T[] = [];
  for (const element of iterable) {
    if (!test(element)) {
      result.push(element);
    }
  }
  return result;
}

/**
 * Maps each element and its index to a new value.
 * 
 * @param iterable - Source iterable
 * @param convert - Function to convert element and index
 * @returns Array of converted values
 */
export function mapIndexed<T, R>(
  iterable: Iterable<T>,
  convert: (index: number, element: T) => R
): R[] {
  const result: R[] = [];
  let index = 0;
  for (const element of iterable) {
    result.push(convert(index++, element));
  }
  return result;
}

/**
 * Returns elements whose value and index satisfy the test.
 * 
 * @param iterable - Source iterable
 * @param test - Predicate to test index and element
 * @returns Array of matching elements
 */
export function whereIndexed<T>(
  iterable: Iterable<T>,
  test: (index: number, element: T) => boolean
): T[] {
  const result: T[] = [];
  let index = 0;
  for (const element of iterable) {
    if (test(index++, element)) {
      result.push(element);
    }
  }
  return result;
}

/**
 * Returns elements whose value and index do not satisfy the test.
 * 
 * @param iterable - Source iterable
 * @param test - Predicate to test index and element
 * @returns Array of non-matching elements
 */
export function whereNotIndexed<T>(
  iterable: Iterable<T>,
  test: (index: number, element: T) => boolean
): T[] {
  const result: T[] = [];
  let index = 0;
  for (const element of iterable) {
    if (!test(index++, element)) {
      result.push(element);
    }
  }
  return result;
}

/**
 * Calls action for each element along with its index.
 * 
 * @param iterable - Source iterable
 * @param action - Function to call for each index and element
 */
export function forEachIndexed<T>(
  iterable: Iterable<T>,
  action: (index: number, element: T) => void
): void {
  let index = 0;
  for (const element of iterable) {
    action(index++, element);
  }
}

/**
 * Returns the first element satisfying test, or null if none found.
 * 
 * @param iterable - Source iterable
 * @param test - Predicate to test each element
 * @returns First matching element or null
 */
export function firstWhereOrNull<T>(
  iterable: Iterable<T>,
  test: (element: T) => boolean
): T | null {
  for (const element of iterable) {
    if (test(element)) {
      return element;
    }
  }
  return null;
}

/**
 * Returns the first element whose value and index satisfy test, or null if none found.
 * 
 * @param iterable - Source iterable
 * @param test - Predicate to test index and element
 * @returns First matching element or null
 */
export function firstWhereIndexedOrNull<T>(
  iterable: Iterable<T>,
  test: (index: number, element: T) => boolean
): T | null {
  let index = 0;
  for (const element of iterable) {
    if (test(index++, element)) {
      return element;
    }
  }
  return null;
}

/**
 * Returns the first element, or null if iterable is empty.
 * 
 * @param iterable - Source iterable
 * @returns First element or null
 */
export function firstOrNull<T>(iterable: Iterable<T>): T | null {
  for (const element of iterable) {
    return element;
  }
  return null;
}

/**
 * Returns the last element satisfying test, or null if none found.
 * 
 * @param iterable - Source iterable
 * @param test - Predicate to test each element
 * @returns Last matching element or null
 */
export function lastWhereOrNull<T>(
  iterable: Iterable<T>,
  test: (element: T) => boolean
): T | null {
  let result: T | null = null;
  for (const element of iterable) {
    if (test(element)) {
      result = element;
    }
  }
  return result;
}

/**
 * Returns the last element whose index and value satisfy test, or null if none found.
 * 
 * @param iterable - Source iterable
 * @param test - Predicate to test index and element
 * @returns Last matching element or null
 */
export function lastWhereIndexedOrNull<T>(
  iterable: Iterable<T>,
  test: (index: number, element: T) => boolean
): T | null {
  let result: T | null = null;
  let index = 0;
  for (const element of iterable) {
    if (test(index++, element)) {
      result = element;
    }
  }
  return result;
}

/**
 * Returns the last element, or null if iterable is empty.
 * 
 * @param iterable - Source iterable
 * @returns Last element or null
 */
export function lastOrNull<T>(iterable: Iterable<T>): T | null {
  let result: T | null = null;
  for (const element of iterable) {
    result = element;
  }
  return result;
}

/**
 * Returns the element at index, or null if index is out of range.
 * 
 * @param iterable - Source iterable
 * @param index - Index of element to retrieve
 * @returns Element at index or null
 */
export function elementAtOrNull<T>(
  iterable: Iterable<T>,
  index: number
): T | null {
  if (index < 0) {
    return null;
  }
  let currentIndex = 0;
  for (const element of iterable) {
    if (currentIndex === index) {
      return element;
    }
    currentIndex++;
  }
  return null;
}

/**
 * Returns true if no element satisfies test.
 * 
 * @param iterable - Source iterable
 * @param test - Predicate to test each element
 * @returns true if no elements satisfy test
 */
export function none<T>(
  iterable: Iterable<T>,
  test: (element: T) => boolean
): boolean {
  for (const element of iterable) {
    if (test(element)) {
      return false;
    }
  }
  return true;
}

/**
 * Groups elements into lists by the key returned by keyOf.
 * 
 * @param iterable - Source iterable
 * @param keyOf - Function to extract key from element
 * @returns Map from keys to lists of elements
 */
export function groupListsBy<K, T>(
  iterable: Iterable<T>,
  keyOf: (element: T) => K
): Map<K, T[]> {
  const result = new Map<K, T[]>();
  for (const element of iterable) {
    const key = keyOf(element);
    let list = result.get(key);
    if (list === undefined) {
      list = [];
      result.set(key, list);
    }
    list.push(element);
  }
  return result;
}

/**
 * Groups elements into sets by the key returned by keyOf.
 * 
 * @param iterable - Source iterable
 * @param keyOf - Function to extract key from element
 * @returns Map from keys to sets of elements
 */
export function groupSetsBy<K, T>(
  iterable: Iterable<T>,
  keyOf: (element: T) => K
): Map<K, Set<T>> {
  const result = new Map<K, Set<T>>();
  for (const element of iterable) {
    const key = keyOf(element);
    let set = result.get(key);
    if (set === undefined) {
      set = new Set<T>();
      result.set(key, set);
    }
    set.add(element);
  }
  return result;
}

/**
 * Splits elements into contiguous chunks of the given length.
 * 
 * Each chunk is `length` elements long, except the last one which may be shorter.
 * 
 * @param iterable - Source iterable
 * @param length - Size of each chunk (must be >= 1)
 * @returns Array of chunks
 */
export function slices<T>(iterable: Iterable<T>, length: number): T[][] {
  if (length < 1) {
    throw new RangeError('length must be at least 1');
  }
  
  const result: T[][] = [];
  let current: T[] = [];
  
  for (const element of iterable) {
    current.push(element);
    if (current.length === length) {
      result.push(current);
      current = [];
    }
  }
  
  if (current.length > 0) {
    result.push(current);
  }
  
  return result;
}

/**
 * Flattens an iterable of iterables into a single array.
 * 
 * @param iterable - Source iterable of iterables
 * @returns Flattened array
 */
export function flattened<T>(iterable: Iterable<Iterable<T>>): T[] {
  const result: T[] = [];
  for (const elements of iterable) {
    for (const element of elements) {
      result.push(element);
    }
  }
  return result;
}

/**
 * Returns the minimum element, or null if iterable is empty.
 * 
 * @param iterable - Source iterable of numbers
 * @returns Minimum value or null
 */
export function minOrNull(iterable: Iterable<number>): number | null {
  let result: number | null = null;
  for (const value of iterable) {
    if (result === null || value < result) {
      result = value;
    }
  }
  return result;
}

/**
 * Returns the minimum element.
 * 
 * @param iterable - Source iterable of numbers (must not be empty)
 * @returns Minimum value
 * @throws Error if iterable is empty
 */
export function min(iterable: Iterable<number>): number {
  const result = minOrNull(iterable);
  if (result === null) {
    throw new Error('No element');
  }
  return result;
}

/**
 * Returns the maximum element, or null if iterable is empty.
 * 
 * @param iterable - Source iterable of numbers
 * @returns Maximum value or null
 */
export function maxOrNull(iterable: Iterable<number>): number | null {
  let result: number | null = null;
  for (const value of iterable) {
    if (result === null || value > result) {
      result = value;
    }
  }
  return result;
}

/**
 * Returns the maximum element.
 * 
 * @param iterable - Source iterable of numbers (must not be empty)
 * @returns Maximum value
 * @throws Error if iterable is empty
 */
export function max(iterable: Iterable<number>): number {
  const result = maxOrNull(iterable);
  if (result === null) {
    throw new Error('No element');
  }
  return result;
}

/**
 * Returns the sum of all elements.
 * 
 * @param iterable - Source iterable of numbers
 * @returns Sum of all elements (0 if empty)
 */
export function sum(iterable: Iterable<number>): number {
  let result = 0;
  for (const value of iterable) {
    result += value;
  }
  return result;
}

/**
 * Returns the arithmetic mean of all elements.
 * 
 * @param iterable - Source iterable of numbers (must not be empty)
 * @returns Average of all elements
 * @throws Error if iterable is empty
 */
export function average(iterable: Iterable<number>): number {
  let result = 0;
  let count = 0;
  for (const value of iterable) {
    count++;
    result += (value - result) / count;
  }
  if (count === 0) {
    throw new Error('No elements');
  }
  return result;
}

/**
 * Counts elements satisfying the predicate.
 * 
 * @param iterable - Source iterable
 * @param test - Predicate to test each element
 * @returns Count of matching elements
 */
export function count<T>(
  iterable: Iterable<T>,
  test: (element: T) => boolean
): number {
  let result = 0;
  for (const element of iterable) {
    if (test(element)) {
      result++;
    }
  }
  return result;
}
