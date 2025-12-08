/**
 * Map utilities with dual error handling pattern.
 */
export class MapTools {
  /**
   * Get value from map, or return default if key doesn't exist.
   */
  static getOrDefault<K, V>(map: Map<K, V>, key: K, defaultValue: V): V {
    const value = map.get(key);
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Get value from map. Returns null if key doesn't exist.
   */
  static tryGet<K, V>(map: Map<K, V>, key: K): V | null {
    const value = map.get(key);
    return value !== undefined ? value : null;
  }

  /**
   * Get value from map. Throws if key doesn't exist.
   */
  static get<K, V>(map: Map<K, V>, key: K): V {
    const value = MapTools.tryGet(map, key);
    if (value === null) {
      throw new Error(`Key not found in map: ${String(key)}`);
    }
    return value;
  }

  /**
   * Get all keys as array.
   */
  static keys<K, V>(map: Map<K, V>): Array<K> {
    return Array.from(map.keys());
  }

  /**
   * Get all values as array.
   */
  static values<K, V>(map: Map<K, V>): Array<V> {
    return Array.from(map.values());
  }

  /**
   * Get all entries as array of tuples.
   */
  static entries<K, V>(map: Map<K, V>): Array<[K, V]> {
    return Array.from(map.entries());
  }

  /**
   * Create new map from array of tuples.
   */
  static fromEntries<K, V>(entries: Array<[K, V]>): Map<K, V> {
    return new Map(entries);
  }

  /**
   * Map over map values, returning new map with same keys.
   */
  static mapValues<K, V, U>(map: Map<K, V>, fn: (value: V, key: K) => U): Map<K, U> {
    const result = new Map<K, U>();
    for (const [key, value] of map.entries()) {
      result.set(key, fn(value, key));
    }
    return result;
  }

  /**
   * Filter map entries by predicate.
   */
  static filter<K, V>(map: Map<K, V>, predicate: (value: V, key: K) => boolean): Map<K, V> {
    const result = new Map<K, V>();
    for (const [key, value] of map.entries()) {
      if (predicate(value, key)) {
        result.set(key, value);
      }
    }
    return result;
  }

  /**
   * Merge multiple maps. Later maps override earlier ones.
   */
  static merge<K, V>(...maps: Array<Map<K, V>>): Map<K, V> {
    const result = new Map<K, V>();
    for (const map of maps) {
      for (const [key, value] of map.entries()) {
        result.set(key, value);
      }
    }
    return result;
  }
}
