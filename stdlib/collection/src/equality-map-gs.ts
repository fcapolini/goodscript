/**
 * A map with custom equality and hash functions for keys.
 * 
 * Translated from Dart's EqualityMap (package:collection)
 * Source: https://pub.dev/documentation/collection/latest/collection/EqualityMap-class.html
 * 
 * A map that uses custom equality and hash code functions for keys instead of
 * the default === equality and identity hash code.
 */

export interface Equality<K> {
  equals(a: K, b: K): boolean;
  hash(k: K): number;
}

interface Entry<K, V> {
  key: K;
  value: V;
}

export class EqualityMap<K, V> {
  private equality: Equality<K>;
  private map: Map<number, Entry<K, V>[]>;
  private count: number;

  constructor(equality?: Equality<K>) {
    if (equality !== null && equality !== undefined) {
      this.equality = equality;
    } else {
      this.equality = new DefaultEquality<K>();
    }
    this.map = new Map();
    this.count = 0;
  }

  /**
   * Creates a map from key-value pairs using the given equality.
   */
  static fromEntries<K, V>(entries: Array<[K, V]>, equality?: Equality<K>): EqualityMap<K, V> {
    const map = new EqualityMap<K, V>(equality);
    for (const [key, value] of entries) {
      map.set(key, value);
    }
    return map;
  }

  /**
   * Returns the number of key-value pairs in the map.
   */
  getLength(): number {
    return this.count;
  }

  /**
   * Whether the map is empty.
   */
  isEmpty(): boolean {
    return this.count === 0;
  }

  /**
   * Whether the map has at least one entry.
   */
  isNotEmpty(): boolean {
    return this.count > 0;
  }

  /**
   * Gets the value for the given key.
   * Returns null if the key is not present.
   */
  get(key: K): V | null {
    const hashCode = this.equality.hash(key);
    const bucket = this.map.get(hashCode);

    if (bucket === null || bucket === undefined) {
      return null;
    }

    for (const entry of bucket) {
      if (this.equality.equals(entry.key, key)) {
        return entry.value;
      }
    }

    return null;
  }

  /**
   * Sets the value for the given key.
   */
  set(key: K, value: V): void {
    const hashCode = this.equality.hash(key);
    const bucket = this.map.get(hashCode);

    if (bucket === null || bucket === undefined) {
      this.map.set(hashCode, [{ key, value }]);
      this.count++;
      return;
    }

    for (let i = 0; i < bucket.length; i++) {
      if (this.equality.equals(bucket[i].key, key)) {
        bucket[i].value = value;
        return;
      }
    }

    bucket.push({ key, value });
    this.count++;
  }

  /**
   * Whether the map contains the given key.
   */
  has(key: K): boolean {
    return this.get(key) !== null;
  }

  /**
   * Removes the entry for the given key.
   * Returns true if the key was present, false otherwise.
   */
  delete(key: K): boolean {
    const hashCode = this.equality.hash(key);
    const bucket = this.map.get(hashCode);

    if (bucket === null || bucket === undefined) {
      return false;
    }

    for (let i = 0; i < bucket.length; i++) {
      if (this.equality.equals(bucket[i].key, key)) {
        bucket.splice(i, 1);
        this.count--;
        if (bucket.length === 0) {
          this.map.delete(hashCode);
        }
        return true;
      }
    }

    return false;
  }

  /**
   * Removes all entries from the map.
   */
  clear(): void {
    this.map.clear();
    this.count = 0;
  }

  /**
   * Returns all keys as an array.
   */
  keys(): K[] {
    const result: K[] = [];
    for (const bucket of this.map.values()) {
      for (const entry of bucket) {
        result.push(entry.key);
      }
    }
    return result;
  }

  /**
   * Returns all values as an array.
   */
  values(): V[] {
    const result: V[] = [];
    for (const bucket of this.map.values()) {
      for (const entry of bucket) {
        result.push(entry.value);
      }
    }
    return result;
  }

  /**
   * Returns all entries as an array of [key, value] pairs.
   */
  entries(): Array<[K, V]> {
    const result: Array<[K, V]> = [];
    for (const bucket of this.map.values()) {
      for (const entry of bucket) {
        result.push([entry.key, entry.value]);
      }
    }
    return result;
  }

  /**
   * Calls a function for each entry in the map.
   */
  forEach(fn: (value: V, key: K) => void): void {
    for (const bucket of this.map.values()) {
      for (const entry of bucket) {
        fn(entry.value, entry.key);
      }
    }
  }

  /**
   * Returns a string representation of the map.
   */
  toString(): string {
    const pairs = this.entries().map(([k, v]) => `${k}: ${v}`);
    return '{' + pairs.join(', ') + '}';
  }
}

/**
 * Default equality using === and a simple hash function.
 */
class DefaultEquality<K> implements Equality<K> {
  equals(a: K, b: K): boolean {
    return a === b;
  }

  hash(k: K): number {
    if (k === null || k === undefined) {
      return 0;
    }
    if (typeof k === 'number') {
      return k | 0;
    }
    if (typeof k === 'string') {
      return this.hashString(k);
    }
    if (typeof k === 'boolean') {
      return k === true ? 1 : 0;
    }
    // For objects, use a simple hash based on JSON
    return this.hashString(JSON.stringify(k));
  }

  private hashString(s: string): number {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      const char = s.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = (hash | 0); // Convert to 32-bit integer
    }
    return hash;
  }
}
