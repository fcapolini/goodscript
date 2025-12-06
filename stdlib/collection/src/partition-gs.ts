/**
 * Partition utilities for splitting collections.
 * 
 * Inspired by Lodash's partition and Dart's where/whereType
 * Splits collections based on predicates.
 */

/**
 * Result of a partition operation.
 */
export class PartitionResult<T> {
  /**
   * Elements that satisfy the predicate.
   */
  matches: T[];
  
  /**
   * Elements that don't satisfy the predicate.
   */
  nonMatches: T[];

  constructor(matches: T[], nonMatches: T[]) {
    this.matches = matches;
    this.nonMatches = nonMatches;
  }
}

/**
 * Partitions an array into two arrays based on a predicate.
 * 
 * @param array - Array to partition
 * @param predicate - Function to test each element
 * @returns PartitionResult with matches and non-matches
 * 
 * Example:
 * ```
 * const result = partition([1, 2, 3, 4, 5], x => x % 2 === 0);
 * result.matches     // [2, 4]
 * result.nonMatches  // [1, 3, 5]
 * ```
 */
export function partition<T>(
  array: T[], 
  predicate: (element: T) => boolean
): PartitionResult<T> {
  const matches: T[] = [];
  const nonMatches: T[] = [];
  
  for (const element of array) {
    if (predicate(element)) {
      matches.push(element);
    } else {
      nonMatches.push(element);
    }
  }
  
  return new PartitionResult(matches, nonMatches);
}

/**
 * Splits an array into chunks of the specified size.
 * 
 * @param array - Array to split
 * @param size - Size of each chunk
 * @returns Array of chunks
 * 
 * Example:
 * ```
 * chunk([1, 2, 3, 4, 5], 2)  // [[1, 2], [3, 4], [5]]
 * ```
 */
export function chunk<T>(array: T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error('Chunk size must be positive');
  }
  
  const result: T[][] = [];
  
  for (let i = 0; i < array.length; i += size) {
    const chunkArray: T[] = [];
    for (let j = i; j < Math.min(i + size, array.length); j++) {
      chunkArray.push(array[j]);
    }
    result.push(chunkArray);
  }
  
  return result;
}

/**
 * Groups elements by a key function.
 * 
 * @param array - Array to group
 * @param keyFn - Function to extract the key from each element
 * @returns Map from keys to arrays of elements
 * 
 * Example:
 * ```
 * const people = [{name: 'Alice', age: 30}, {name: 'Bob', age: 30}];
 * const grouped = groupBy(people, p => p.age);
 * grouped.get(30)  // [{name: 'Alice', age: 30}, {name: 'Bob', age: 30}]
 * ```
 */
export function groupBy<T, K>(
  array: T[], 
  keyFn: (element: T) => K
): Map<K, T[]> {
  const result = new Map<K, T[]>();
  
  for (const element of array) {
    const key = keyFn(element);
    const group = result.get(key);
    
    if (group !== undefined) {
      group.push(element);
    } else {
      result.set(key, [element]);
    }
  }
  
  return result;
}

/**
 * Splits an array at the first element that satisfies the predicate.
 * The matched element is not included in either result.
 * 
 * @param array - Array to split
 * @param predicate - Function to test each element
 * @returns Tuple of [before, after] arrays
 * 
 * Example:
 * ```
 * splitAt([1, 2, 3, 4, 5], x => x === 3)  // [[1, 2], [4, 5]]
 * ```
 */
export function splitAt<T>(
  array: T[], 
  predicate: (element: T) => boolean
): [T[], T[]] {
  const before: T[] = [];
  const after: T[] = [];
  let found = false;
  
  for (const element of array) {
    if (!found && predicate(element)) {
      found = true;
      continue;
    }
    
    if (found) {
      after.push(element);
    } else {
      before.push(element);
    }
  }
  
  return [before, after];
}

/**
 * Takes elements from the array while the predicate is true.
 * 
 * @param array - Array to process
 * @param predicate - Function to test each element
 * @returns Array of elements before the first non-match
 * 
 * Example:
 * ```
 * takeWhile([1, 2, 3, 4, 1], x => x < 4)  // [1, 2, 3]
 * ```
 */
export function takeWhile<T>(
  array: T[], 
  predicate: (element: T) => boolean
): T[] {
  const result: T[] = [];
  
  for (const element of array) {
    if (!predicate(element)) {
      break;
    }
    result.push(element);
  }
  
  return result;
}

/**
 * Drops elements from the array while the predicate is true.
 * 
 * @param array - Array to process
 * @param predicate - Function to test each element
 * @returns Array of elements after the first non-match
 * 
 * Example:
 * ```
 * dropWhile([1, 2, 3, 4, 1], x => x < 3)  // [3, 4, 1]
 * ```
 */
export function dropWhile<T>(
  array: T[], 
  predicate: (element: T) => boolean
): T[] {
  const result: T[] = [];
  let dropping = true;
  
  for (const element of array) {
    if (dropping && predicate(element)) {
      continue;
    }
    dropping = false;
    result.push(element);
  }
  
  return result;
}
