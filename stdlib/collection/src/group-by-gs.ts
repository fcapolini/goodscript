/**
 * Groups the elements of an iterable by the value returned by a key function.
 * 
 * Each element is mapped to a key by calling `keyOf`. Elements with the same
 * key are grouped into a list, and the result is a map from keys to lists of elements.
 * 
 * @example
 * ```typescript
 * const words = ['apple', 'apricot', 'banana', 'blueberry'];
 * const grouped = groupBy(words, word => word[0]);
 * // Map { 'a' => ['apple', 'apricot'], 'b' => ['banana', 'blueberry'] }
 * ```
 * 
 * @param values - The iterable of values to group
 * @param keyOf - Function that extracts the grouping key from each element
 * @returns A map from keys to arrays of elements with that key
 */
export function groupBy<T, K>(
  values: Iterable<T>,
  keyOf: (element: T) => K
): Map<K, T[]> {
  const result = new Map<K, T[]>();
  
  for (const element of values) {
    const key = keyOf(element);
    const list = result.get(key);
    
    if (list === null || list === undefined) {
      result.set(key, [element]);
    } else {
      list.push(element);
    }
  }
  
  return result;
}

/**
 * Associates the elements of an iterable by the value returned by a key function.
 * 
 * Similar to `groupBy`, but only keeps the *last* element for each key.
 * If multiple elements map to the same key, later elements replace earlier ones.
 * 
 * @example
 * ```typescript
 * const users = [
 *   { id: 1, name: 'Alice' },
 *   { id: 2, name: 'Bob' },
 *   { id: 1, name: 'Alice Updated' }
 * ];
 * const byId = lastBy(users, user => user.id);
 * // Map { 1 => { id: 1, name: 'Alice Updated' }, 2 => { id: 2, name: 'Bob' } }
 * ```
 * 
 * @param values - The iterable of values to associate
 * @param keyOf - Function that extracts the key from each element
 * @returns A map from keys to the last element with that key
 */
export function lastBy<T, K>(
  values: Iterable<T>,
  keyOf: (element: T) => K
): Map<K, T> {
  const result = new Map<K, T>();
  
  for (const element of values) {
    const key = keyOf(element);
    result.set(key, element);
  }
  
  return result;
}
