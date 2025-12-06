/**
 * Min/Max By utilities
 * Translated from Dart's collection/functions.dart
 * 
 * Find minimum and maximum elements based on a projection function.
 */

/**
 * Returns the element of values for which orderBy returns the minimum value.
 * 
 * The values returned by orderBy are compared using the compare function.
 * If compare is omitted, values are compared using standard < operator.
 * 
 * Returns null if values is empty.
 * 
 * @param values The iterable to search
 * @param orderBy Function that returns the value to compare
 * @param compare Optional comparison function (returns negative if a < b, 0 if equal, positive if a > b)
 * @returns The element with minimum orderBy value, or null if empty
 * 
 * @example
 * const people = [
 *   { name: 'Alice', age: 30 },
 *   { name: 'Bob', age: 25 },
 *   { name: 'Charlie', age: 35 }
 * ];
 * const youngest = minBy(people, p => p.age);
 * // { name: 'Bob', age: 25 }
 */
export function minBy<S, T>(
  values: Iterable<S>,
  orderBy: (element: S) => T,
  compare?: (a: T, b: T) => number
): S | null {
  let compareFunc: (a: T, b: T) => number;
  if (compare !== null && compare !== undefined) {
    compareFunc = compare;
  } else {
    compareFunc = (a: T, b: T) => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    };
  }
  
  let minValue: S | null = null;
  let minOrderBy: T | null = null;
  
  for (const element of values) {
    const elementOrderBy = orderBy(element);
    if (minOrderBy === null || compareFunc(elementOrderBy, minOrderBy) < 0) {
      minValue = element;
      minOrderBy = elementOrderBy;
    }
  }
  
  return minValue;
}

/**
 * Returns the element of values for which orderBy returns the maximum value.
 * 
 * The values returned by orderBy are compared using the compare function.
 * If compare is omitted, values are compared using standard > operator.
 * 
 * Returns null if values is empty.
 * 
 * @param values The iterable to search
 * @param orderBy Function that returns the value to compare
 * @param compare Optional comparison function (returns negative if a < b, 0 if equal, positive if a > b)
 * @returns The element with maximum orderBy value, or null if empty
 * 
 * @example
 * const people = [
 *   { name: 'Alice', age: 30 },
 *   { name: 'Bob', age: 25 },
 *   { name: 'Charlie', age: 35 }
 * ];
 * const oldest = maxBy(people, p => p.age);
 * // { name: 'Charlie', age: 35 }
 */
export function maxBy<S, T>(
  values: Iterable<S>,
  orderBy: (element: S) => T,
  compare?: (a: T, b: T) => number
): S | null {
  let compareFunc: (a: T, b: T) => number;
  if (compare !== null && compare !== undefined) {
    compareFunc = compare;
  } else {
    compareFunc = (a: T, b: T) => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    };
  }
  
  let maxValue: S | null = null;
  let maxOrderBy: T | null = null;
  
  for (const element of values) {
    const elementOrderBy = orderBy(element);
    if (maxOrderBy === null || compareFunc(elementOrderBy, maxOrderBy) > 0) {
      maxValue = element;
      maxOrderBy = elementOrderBy;
    }
  }
  
  return maxValue;
}
