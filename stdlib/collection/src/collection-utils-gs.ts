/**
 * Collection utility functions translated from Dart's collection package.
 * 
 * Source: https://github.com/dart-lang/core/blob/main/pkgs/collection/lib/src/functions.dart
 * 
 * Provides higher-order functions for working with collections:
 * - groupBy: Group elements by a key function
 * - lastBy: Get last element for each key
 * - minBy/maxBy: Find min/max element by comparison function
 * - mergeMaps: Merge two maps with conflict resolution
 */

/**
 * Groups elements by the value returned by the key function.
 * 
 * Returns a map from keys to lists of all values that produced that key.
 * Values appear in the same relative order as in the input.
 * 
 * @param values - The iterable to group
 * @param key - Function that extracts the grouping key from each element
 * @returns Map from keys to arrays of elements with that key
 * 
 * @example
 * const people = [
 *   { name: 'Alice', age: 30 },
 *   { name: 'Bob', age: 25 },
 *   { name: 'Charlie', age: 30 }
 * ];
 * const byAge = groupBy(people, p => p.age);
 * // { 30: [Alice, Charlie], 25: [Bob] }
 */
export function groupBy<S, T>(
  values: S[],
  key: (element: S) => T
): Map<T, S[]> {
  const map = new Map<T, S[]>();
  
  for (const element of values) {
    const k = key(element);
    let list = map.get(k);
    
    if (list === null || list === undefined) {
      list = [];
      map.set(k, list);
    }
    
    list.push(element);
  }
  
  return map;
}

/**
 * Associates elements by the key function, keeping only the last value for each key.
 * 
 * If multiple elements produce the same key, only the last one is retained.
 * 
 * @param values - The iterable to process
 * @param key - Function that extracts the key from each element
 * @returns Map from keys to the last element with that key
 * 
 * @example
 * const items = [
 *   { id: 1, name: 'Alice' },
 *   { id: 2, name: 'Bob' },
 *   { id: 1, name: 'Alice Updated' }
 * ];
 * const byId = lastBy(items, item => item.id);
 * // { 1: {id: 1, name: 'Alice Updated'}, 2: {id: 2, name: 'Bob'} }
 */
export function lastBy<S, T>(
  values: S[],
  key: (element: S) => T
): Map<T, S> {
  const map = new Map<T, S>();
  
  for (const element of values) {
    map.set(key(element), element);
  }
  
  return map;
}

/**
 * Returns the element for which orderBy returns the minimum value.
 * 
 * Uses the compare function to determine ordering.
 * Returns null if the array is empty.
 * 
 * @param values - The array to search
 * @param orderBy - Function that extracts the value to compare
 * @param compare - Optional comparison function (defaults to natural ordering)
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
  values: S[],
  orderBy: (element: S) => T,
  compare?: (a: T, b: T) => number
): S | null {
  let cmp: (a: T, b: T) => number;
  if (compare !== null && compare !== undefined) {
    cmp = compare;
  } else {
    cmp = defaultCompare;
  }
  
  let minValue: S | null = null;
  let minOrderBy: T | null = null;
  
  for (const element of values) {
    const elementOrderBy = orderBy(element);
    
    if (minOrderBy === null || minOrderBy === undefined) {
      minValue = element;
      minOrderBy = elementOrderBy;
    } else if (cmp(elementOrderBy, minOrderBy) < 0) {
      minValue = element;
      minOrderBy = elementOrderBy;
    }
  }
  
  return minValue;
}

/**
 * Returns the element for which orderBy returns the maximum value.
 * 
 * Uses the compare function to determine ordering.
 * Returns null if the array is empty.
 * 
 * @param values - The array to search
 * @param orderBy - Function that extracts the value to compare
 * @param compare - Optional comparison function (defaults to natural ordering)
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
  values: S[],
  orderBy: (element: S) => T,
  compare?: (a: T, b: T) => number
): S | null {
  let cmp: (a: T, b: T) => number;
  if (compare !== null && compare !== undefined) {
    cmp = compare;
  } else {
    cmp = defaultCompare;
  }
  
  let maxValue: S | null = null;
  let maxOrderBy: T | null = null;
  
  for (const element of values) {
    const elementOrderBy = orderBy(element);
    
    if (maxOrderBy === null || maxOrderBy === undefined) {
      maxValue = element;
      maxOrderBy = elementOrderBy;
    } else if (cmp(elementOrderBy, maxOrderBy) > 0) {
      maxValue = element;
      maxOrderBy = elementOrderBy;
    }
  }
  
  return maxValue;
}

/**
 * Returns a new map with all key/value pairs from both maps.
 * 
 * If a key exists in both maps, the value function is used to resolve conflicts.
 * If no value function is provided, the value from map2 is used.
 * 
 * @param map1 - First map
 * @param map2 - Second map
 * @param value - Optional function to resolve conflicts (receives value1, value2)
 * @returns New map with merged entries
 * 
 * @example
 * const map1 = new Map([['a', 1], ['b', 2]]);
 * const map2 = new Map([['b', 3], ['c', 4]]);
 * 
 * // Default: map2 wins
 * const merged1 = mergeMaps(map1, map2);
 * // Map { 'a' => 1, 'b' => 3, 'c' => 4 }
 * 
 * // Custom: sum values
 * const merged2 = mergeMaps(map1, map2, (v1, v2) => v1 + v2);
 * // Map { 'a' => 1, 'b' => 5, 'c' => 4 }
 */
export function mergeMaps<K, V>(
  map1: Map<K, V>,
  map2: Map<K, V>,
  value?: (v1: V, v2: V) => V
): Map<K, V> {
  const result = new Map<K, V>();
  
  // Copy all entries from map1
  for (const entry of map1.entries()) {
    result.set(entry[0], entry[1]);
  }
  
  // If no value function, just overwrite with map2
  if (value === null || value === undefined) {
    for (const entry of map2.entries()) {
      result.set(entry[0], entry[1]);
    }
    return result;
  }
  
  // Use value function to resolve conflicts
  for (const entry of map2.entries()) {
    const key = entry[0];
    const mapValue = entry[1];
    
    if (result.has(key)) {
      const existing = result.get(key);
      if (existing !== null && existing !== undefined) {
        result.set(key, value(existing, mapValue));
      } else {
        result.set(key, mapValue);
      }
    } else {
      result.set(key, mapValue);
    }
  }
  
  return result;
}

/**
 * Default comparison function for comparable values.
 * Returns negative if a < b, zero if equal, positive if a > b.
 */
function defaultCompare(a: number | string, b: number | string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
