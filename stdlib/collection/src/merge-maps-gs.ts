/**
 * Options for merging two maps.
 */
export interface MergeMapOptions<V> {
  value?: (value1: V, value2: V) => V;
}

/**
 * Options for transforming map keys and values.
 */
export interface MapMapOptions<K1, V1, K2, V2> {
  key?: (key: K1, value: V1) => K2;
  value?: (key: K1, value: V1) => V2;
}

/**
 * Merges two maps into a new map.
 * 
 * All entries from both maps are included in the result. If a key appears in
 * both maps, the `value` function is used to determine the final value.
 * If no `value` function is provided, the value from `map2` wins.
 * 
 * @example
 * ```typescript
 * const map1 = new Map([['a', 1], ['b', 2]]);
 * const map2 = new Map([['b', 3], ['c', 4]]);
 * 
 * // Default: map2 wins
 * const merged = mergeMaps(map1, map2);
 * // Map { 'a' => 1, 'b' => 3, 'c' => 4 }
 * 
 * // Custom merge: sum values
 * const summed = mergeMaps(map1, map2, { value: (v1, v2) => v1 + v2 });
 * // Map { 'a' => 1, 'b' => 5, 'c' => 4 }
 * ```
 * 
 * @param map1 - The first map
 * @param map2 - The second map
 * @param options - Optional configuration
 * @returns A new map with all entries from both maps
 */
export function mergeMaps<K, V>(
  map1: Map<K, V>,
  map2: Map<K, V>,
  options?: MergeMapOptions<V>
): Map<K, V> {
  const result = new Map<K, V>();
  const valueFn = options?.value;
  
  // Add all entries from map1
  for (const [key, value] of map1) {
    result.set(key, value);
  }
  
  // Add entries from map2, merging conflicts
  for (const [key, value2] of map2) {
    const value1 = result.get(key);
    
    if (value1 !== null && value1 !== undefined) {
      // Key exists in both maps
      if (valueFn !== null && valueFn !== undefined) {
        result.set(key, valueFn(value1, value2));
      } else {
        // Default: map2 wins
        result.set(key, value2);
      }
    } else {
      // Key only in map2
      result.set(key, value2);
    }
  }
  
  return result;
}

/**
 * Creates a new map with transformed keys and/or values.
 * 
 * Each entry in the input map is transformed by the optional `key` and `value`
 * functions. If a function is not provided, the original key or value is kept.
 * 
 * @example
 * ```typescript
 * const map = new Map([['a', 1], ['b', 2], ['c', 3]]);
 * 
 * // Transform values only
 * const doubled = mapMap(map, { value: (k, v) => v * 2 });
 * // Map { 'a' => 2, 'b' => 4, 'c' => 6 }
 * 
 * // Transform keys only
 * const upper = mapMap(map, { key: (k, v) => k.toUpperCase() });
 * // Map { 'A' => 1, 'B' => 2, 'C' => 3 }
 * 
 * // Transform both
 * const transformed = mapMap(map, {
 *   key: (k, v) => k.toUpperCase(),
 *   value: (k, v) => v * 2
 * });
 * // Map { 'A' => 2, 'B' => 4, 'C' => 6 }
 * ```
 * 
 * @param map - The input map
 * @param options - Optional transformation functions
 * @returns A new map with transformed entries
 */
export function mapMap<K1, V1, K2, V2>(
  map: Map<K1, V1>,
  options?: MapMapOptions<K1, V1, K2, V2>
): Map<K2, V2> {
  const result = new Map<K2, V2>();
  const keyFn = options?.key;
  const valueFn = options?.value;
  
  for (const [key, value] of map) {
    const newKey = (keyFn !== null && keyFn !== undefined) 
      ? keyFn(key, value) 
      : (key as unknown as K2);
    const newValue = (valueFn !== null && valueFn !== undefined) 
      ? valueFn(key, value) 
      : (value as unknown as V2);
    
    result.set(newKey, newValue);
  }
  
  return result;
}
