/**
 * Collection algorithms translated from Dart's collection package.
 * 
 * Source: https://github.com/dart-lang/core/blob/main/pkgs/collection/lib/src/algorithms.dart
 * 
 * Provides common algorithms for manipulating collections:
 * - binarySearch: Find element in sorted list
 * - lowerBound: Find insertion point in sorted list
 * - insertionSort: In-place stable sort (efficient for small lists)
 * - mergeSort: Stable sort with O(n log n) comparisons
 * - reverse: Reverse list or subrange
 * - shuffle: Randomly shuffle list or subrange
 * 
 * All functions support optional start/end ranges for partial operations.
 */

/**
 * Default comparison function for comparable elements.
 * Returns negative if a < b, zero if equal, positive if a > b.
 */
function defaultCompare(a: number | string, b: number | string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Returns the position of value in sortedList, or -1 if not found.
 * 
 * The list must be sorted according to the compare function.
 * If compare is omitted, uses default comparison (<, >, ===).
 * 
 * @param sortedList - The sorted list to search
 * @param value - The value to find
 * @param compare - Optional comparison function
 * @returns Index of value, or -1 if not found
 * 
 * @example
 * const list = [1, 3, 5, 7, 9];
 * binarySearch(list, 5); // Returns 2
 * binarySearch(list, 4); // Returns -1
 */
export function binarySearch<T>(
  sortedList: T[],
  value: T,
  compare?: (a: T, b: T) => number
): number {
  let cmp: (a: T, b: T) => number;
  if (compare !== null && compare !== undefined) {
    cmp = compare;
  } else {
    cmp = defaultCompare;
  }
  const end = sortedList.length;
  let min = 0;
  let max = end;
  
  while (min < max) {
    const mid = min + ((max - min) >> 1);
    const element = sortedList[mid];
    const comp = cmp(element, value);
    
    if (comp === 0) return mid;
    if (comp < 0) {
      min = mid + 1;
    } else {
      max = mid;
    }
  }
  
  return -1;
}

/**
 * Returns the first position in sortedList where value could be inserted
 * while maintaining sorted order.
 * 
 * Uses binary search to find the location in O(log n) comparisons.
 * Returns sortedList.length if all items are less than value.
 * 
 * @param sortedList - The sorted list to search
 * @param value - The value to find insertion point for
 * @param compare - Optional comparison function
 * @returns Index where value should be inserted
 * 
 * @example
 * const list = [1, 3, 5, 7, 9];
 * lowerBound(list, 4); // Returns 2 (insert before 5)
 * lowerBound(list, 5); // Returns 2 (insert before existing 5)
 * lowerBound(list, 10); // Returns 5 (insert at end)
 */
export function lowerBound<T>(
  sortedList: T[],
  value: T,
  compare?: (a: T, b: T) => number
): number {
  let cmp: (a: T, b: T) => number;
  if (compare !== null && compare !== undefined) {
    cmp = compare;
  } else {
    cmp = defaultCompare;
  }
  const end = sortedList.length;
  let min = 0;
  let max = end;
  
  while (min < max) {
    const mid = min + ((max - min) >> 1);
    const element = sortedList[mid];
    const comp = cmp(element, value);
    
    if (comp < 0) {
      min = mid + 1;
    } else {
      max = mid;
    }
  }
  
  return min;
}

/**
 * Reverses a list or subrange in-place.
 * 
 * @param elements - The list to reverse
 * @param start - Optional start index (default 0)
 * @param end - Optional end index (default length)
 * 
 * @example
 * const list = [1, 2, 3, 4, 5];
 * reverse(list); // [5, 4, 3, 2, 1]
 * reverse(list, 1, 4); // [5, 3, 2, 4, 1]
 */
export function reverse<T>(
  elements: T[],
  start?: number,
  end?: number
): void {
  let s: number;
  if (start !== null && start !== undefined) {
    s = start;
  } else {
    s = 0;
  }
  
  let e: number;
  if (end !== null && end !== undefined) {
    e = end;
  } else {
    e = elements.length;
  }
  
  let i = s;
  let j = e - 1;
  while (i < j) {
    const tmp = elements[i];
    elements[i] = elements[j];
    elements[j] = tmp;
    i++;
    j--;
  }
}

/**
 * Shuffles a list or subrange randomly.
 * 
 * Uses Fisher-Yates shuffle algorithm for uniform random distribution.
 * 
 * @param elements - The list to shuffle
 * @param start - Optional start index (default 0)
 * @param end - Optional end index (default length)
 * 
 * @example
 * const list = [1, 2, 3, 4, 5];
 * shuffle(list); // Random permutation, e.g., [3, 1, 5, 2, 4]
 */
export function shuffle<T>(
  elements: T[],
  start?: number,
  end?: number
): void {
  let s: number;
  if (start !== null && start !== undefined) {
    s = start;
  } else {
    s = 0;
  }
  
  let e: number;
  if (end !== null && end !== undefined) {
    e = end;
  } else {
    e = elements.length;
  }
  
  let length = e - s;
  while (length > 1) {
    const pos = Math.floor(Math.random() * length);
    length--;
    const tmp = elements[s + pos];
    elements[s + pos] = elements[s + length];
    elements[s + length] = tmp;
  }
}

/**
 * Sorts a list or subrange using insertion sort.
 * 
 * Insertion sort is stable (maintains relative order of equal elements).
 * Efficient for small lists (< 30 elements typically).
 * Time complexity: O(n²) worst case, O(n) for nearly sorted data.
 * Space complexity: O(1) - sorts in place.
 * 
 * @param elements - The list to sort
 * @param compare - Optional comparison function
 * @param start - Optional start index (default 0)
 * @param end - Optional end index (default length)
 * 
 * @example
 * const list = [5, 2, 8, 1, 9];
 * insertionSort(list); // [1, 2, 5, 8, 9]
 * 
 * // Custom comparison (descending)
 * insertionSort(list, (a, b) => b - a); // [9, 8, 5, 2, 1]
 */
export function insertionSort<T>(
  elements: T[],
  compare?: (a: T, b: T) => number,
  start?: number,
  end?: number
): void {
  let cmp: (a: T, b: T) => number;
  if (compare !== null && compare !== undefined) {
    cmp = compare;
  } else {
    cmp = defaultCompare;
  }
  
  let s: number;
  if (start !== null && start !== undefined) {
    s = start;
  } else {
    s = 0;
  }
  
  let e: number;
  if (end !== null && end !== undefined) {
    e = end;
  } else {
    e = elements.length;
  }
  
  for (let pos = s + 1; pos < e; pos++) {
    let min = s;
    let max = pos;
    const element = elements[pos];
    
    // Binary search to find insertion point
    while (min < max) {
      const mid = min + ((max - min) >> 1);
      const comparison = cmp(element, elements[mid]);
      if (comparison < 0) {
        max = mid;
      } else {
        min = mid + 1;
      }
    }
    
    // Shift elements right to make space
    for (let i = pos; i > min; i--) {
      elements[i] = elements[i - 1];
    }
    elements[min] = element;
  }
}

/**
 * Limit below which merge sort defaults to insertion sort.
 * Insertion sort is faster for small lists due to lower overhead.
 */
const MERGE_SORT_LIMIT = 32;

/**
 * Sorts a list or subrange using merge sort.
 * 
 * Merge sort is stable (maintains relative order of equal elements).
 * Guaranteed O(n log n) comparisons for all inputs.
 * Requires O(n) extra space for temporary arrays.
 * 
 * @param elements - The list to sort
 * @param compare - Optional comparison function
 * @param start - Optional start index (default 0)
 * @param end - Optional end index (default length)
 * 
 * @example
 * const list = [5, 2, 8, 1, 9, 3, 7];
 * mergeSort(list); // [1, 2, 3, 5, 7, 8, 9]
 */
export function mergeSort<T>(
  elements: T[],
  compare?: (a: T, b: T) => number,
  start?: number,
  end?: number
): void {
  let cmp: (a: T, b: T) => number;
  if (compare !== null && compare !== undefined) {
    cmp = compare;
  } else {
    cmp = defaultCompare;
  }
  
  let s: number;
  if (start !== null && start !== undefined) {
    s = start;
  } else {
    s = 0;
  }
  
  let e: number;
  if (end !== null && end !== undefined) {
    e = end;
  } else {
    e = elements.length;
  }
  
  const length = e - s;
  if (length < 2) return;
  
  if (length < MERGE_SORT_LIMIT) {
    insertionSort(elements, cmp, s, e);
    return;
  }
  
  // Split into two halves
  const firstLength = length >> 1;
  const middle = s + firstLength;
  const secondLength = e - middle;
  
  // Create scratch space for second half
  const scratchSpace: T[] = [];
  for (let i = 0; i < secondLength; i++) {
    scratchSpace.push(elements[middle + i]);
  }
  
  // Recursively sort second half into scratch space
  mergeSortHelper(elements, cmp, middle, e, scratchSpace, 0);
  
  // Recursively sort first half in-place (at end of range)
  const firstTarget = e - firstLength;
  mergeSortHelper(elements, cmp, s, middle, elements, firstTarget);
  
  // Merge both halves back into original position
  mergeArrays(
    cmp,
    elements, firstTarget, e,
    scratchSpace, 0, secondLength,
    elements, s
  );
}

/**
 * Internal helper for merge sort.
 * Sorts elements[start..end) into target[targetOffset..].
 */
function mergeSortHelper<T>(
  elements: T[],
  compare: (a: T, b: T) => number,
  start: number,
  end: number,
  target: T[],
  targetOffset: number
): void {
  const length = end - start;
  
  if (length < MERGE_SORT_LIMIT) {
    // Base case: use insertion sort for small ranges
    movingInsertionSort(elements, compare, start, end, target, targetOffset);
    return;
  }
  
  const middle = start + (length >> 1);
  const firstLength = middle - start;
  const secondLength = end - middle;
  const targetMiddle = targetOffset + firstLength;
  
  // Sort second half into end of target
  mergeSortHelper(elements, compare, middle, end, target, targetMiddle);
  
  // Sort first half into end of source
  mergeSortHelper(elements, compare, start, middle, elements, middle);
  
  // Merge both halves
  mergeArrays(
    compare,
    elements, middle, middle + firstLength,
    target, targetMiddle, targetMiddle + secondLength,
    target, targetOffset
  );
}

/**
 * Insertion sort that can sort into a different target array.
 */
function movingInsertionSort<T>(
  list: T[],
  compare: (a: T, b: T) => number,
  start: number,
  end: number,
  target: T[],
  targetOffset: number
): void {
  const length = end - start;
  if (length === 0) return;
  
  target[targetOffset] = list[start];
  
  for (let i = 1; i < length; i++) {
    const element = list[start + i];
    let min = targetOffset;
    let max = targetOffset + i;
    
    // Binary search for insertion point
    while (min < max) {
      const mid = min + ((max - min) >> 1);
      if (compare(element, target[mid]) < 0) {
        max = mid;
      } else {
        min = mid + 1;
      }
    }
    
    // Shift elements right
    for (let j = targetOffset + i; j > min; j--) {
      target[j] = target[j - 1];
    }
    target[min] = element;
  }
}

/**
 * Merges two sorted ranges into a target range.
 * Maintains stability: elements from first list preferred when equal.
 */
function mergeArrays<T>(
  compare: (a: T, b: T) => number,
  firstList: T[],
  firstStart: number,
  firstEnd: number,
  secondList: T[],
  secondStart: number,
  secondEnd: number,
  target: T[],
  targetOffset: number
): void {
  let cursor1 = firstStart;
  let cursor2 = secondStart;
  let targetPos = targetOffset;
  
  let firstElement = firstList[cursor1++];
  let secondElement = secondList[cursor2++];
  
  while (true) {
    if (compare(firstElement, secondElement) <= 0) {
      target[targetPos++] = firstElement;
      if (cursor1 === firstEnd) break;
      firstElement = firstList[cursor1++];
    } else {
      target[targetPos++] = secondElement;
      if (cursor2 !== secondEnd) {
        secondElement = secondList[cursor2++];
        continue;
      }
      // Second list empty, flush first list
      target[targetPos++] = firstElement;
      for (let i = cursor1; i < firstEnd; i++) {
        target[targetPos++] = firstList[i];
      }
      return;
    }
  }
  
  // First list empty, flush second list
  target[targetPos++] = secondElement;
  for (let i = cursor2; i < secondEnd; i++) {
    target[targetPos++] = secondList[i];
  }
}
