/**
 * Zip utilities for combining multiple iterables.
 * 
 * Inspired by Python's zip() and Dart's IterableZip
 * Combines elements from multiple arrays into tuples.
 */

/**
 * Combines two arrays element-wise into pairs.
 * Stops when the shorter array is exhausted.
 * 
 * @param first - First array
 * @param second - Second array
 * @returns Array of pairs [first[i], second[i]]
 * 
 * Example:
 * ```
 * zip2([1, 2, 3], ['a', 'b', 'c'])  // [[1, 'a'], [2, 'b'], [3, 'c']]
 * zip2([1, 2], ['a', 'b', 'c'])     // [[1, 'a'], [2, 'b']]
 * ```
 */
export function zip2<A, B>(first: A[], second: B[]): Array<[A, B]> {
  const result: Array<[A, B]> = [];
  const length = Math.min(first.length, second.length);
  
  for (let i = 0; i < length; i++) {
    result.push([first[i], second[i]]);
  }
  
  return result;
}

/**
 * Combines three arrays element-wise into triples.
 * Stops when the shortest array is exhausted.
 */
export function zip3<A, B, C>(
  first: A[], 
  second: B[], 
  third: C[]
): Array<[A, B, C]> {
  const result: Array<[A, B, C]> = [];
  const length = Math.min(first.length, second.length, third.length);
  
  for (let i = 0; i < length; i++) {
    result.push([first[i], second[i], third[i]]);
  }
  
  return result;
}

/**
 * Combines elements from two arrays using a combining function.
 * 
 * @param first - First array
 * @param second - Second array
 * @param combine - Function to combine elements
 * @returns Array of combined results
 * 
 * Example:
 * ```
 * zipWith([1, 2, 3], [4, 5, 6], (a, b) => a + b)  // [5, 7, 9]
 * ```
 */
export function zipWith<A, B, R>(
  first: A[], 
  second: B[], 
  combine: (a: A, b: B) => R
): R[] {
  const result: R[] = [];
  const length = Math.min(first.length, second.length);
  
  for (let i = 0; i < length; i++) {
    result.push(combine(first[i], second[i]));
  }
  
  return result;
}

/**
 * Enumerates an array, pairing each element with its index.
 * 
 * @param array - Array to enumerate
 * @returns Array of [index, element] pairs
 * 
 * Example:
 * ```
 * enumerate(['a', 'b', 'c'])  // [[0, 'a'], [1, 'b'], [2, 'c']]
 * ```
 */
export function enumerate<T>(array: T[]): Array<[number, T]> {
  const result: Array<[number, T]> = [];
  
  for (let i = 0; i < array.length; i++) {
    result.push([i, array[i]]);
  }
  
  return result;
}

/**
 * Unzips an array of pairs into two separate arrays.
 * 
 * @param pairs - Array of pairs
 * @returns Tuple of two arrays
 * 
 * Example:
 * ```
 * unzip([[1, 'a'], [2, 'b'], [3, 'c']])  // [[1, 2, 3], ['a', 'b', 'c']]
 * ```
 */
export function unzip<A, B>(pairs: Array<[A, B]>): [A[], B[]] {
  const first: A[] = [];
  const second: B[] = [];
  
  for (const [a, b] of pairs) {
    first.push(a);
    second.push(b);
  }
  
  return [first, second];
}

/**
 * Lazy iterable for zipping two arrays.
 */
export class Zip2Iterable<A, B> implements Iterable<[A, B]> {
  private first: A[];
  private second: B[];

  constructor(first: A[], second: B[]) {
    this.first = first;
    this.second = second;
  }

  [Symbol.iterator](): Iterator<[A, B]> {
    return new Zip2Iterator(this.first, this.second);
  }

  toArray(): Array<[A, B]> {
    return zip2(this.first, this.second);
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
 * Iterator for Zip2Iterable
 */
class Zip2Iterator<A, B> implements Iterator<[A, B]> {
  private first: A[];
  private second: B[];
  private index: number;
  private length: number;
  private cachedFirst: [A, B] | undefined;

  constructor(first: A[], second: B[]) {
    this.first = first;
    this.second = second;
    this.index = 0;
    this.length = Math.min(first.length, second.length);
    this.cachedFirst = this.length > 0 
      ? [first[0], second[0]] 
      : undefined;
  }

  next(): IteratorResult<[A, B]> {
    if (this.index < this.length) {
      const value: [A, B] = [this.first[this.index], this.second[this.index]];
      this.index++;
      return new IteratorResultImpl(false, value);
    }
    
    return new IteratorResultImpl(true, this.cachedFirst as [A, B]);
  }
}
