/**
 * An unmodifiable map view.
 * 
 * Translated from Dart's UnmodifiableMapView (dart:collection)
 * Source: https://api.dart.dev/stable/dart-collection/UnmodifiableMapView-class.html
 * 
 * View of a Map that disallows modifying the map.
 * A wrapper around a Map that forwards all members to the map provided in the constructor,
 * except for operations that modify the map. Modifying operations throw instead.
 */

export class UnmodifiableMapView<K, V> implements Iterable<[K, V]> {
  private source: Map<K, V>;

  constructor(source: Map<K, V>) {
    this.source = source;
  }

  /**
   * Returns the value for the given key, or null if key is not in the map.
   */
  get(key: K): V | undefined {
    return this.source.get(key);
  }

  /**
   * Returns the number of key/value pairs.
   */
  getLength(): number {
    return this.source.size;
  }

  /**
   * Whether there is no key/value pair in the map.
   */
  isEmpty(): boolean {
    return this.source.size === 0;
  }

  /**
   * Whether there is at least one key/value pair in the map.
   */
  isNotEmpty(): boolean {
    return this.source.size > 0;
  }

  /**
   * Whether this map contains the given key.
   */
  containsKey(key: K): boolean {
    return this.source.has(key);
  }

  /**
   * Whether this map contains the given value.
   */
  containsValue(value: V): boolean {
    for (const v of this.source.values()) {
      if (v === value) {
        return true;
      }
    }
    return false;
  }

  /**
   * Returns all keys as an array.
   */
  keys(): K[] {
    return Array.from(this.source.keys());
  }

  /**
   * Returns all values as an array.
   */
  values(): V[] {
    return Array.from(this.source.values());
  }

  /**
   * Returns all entries as an array of [key, value] pairs.
   */
  entries(): Array<[K, V]> {
    return Array.from(this.source.entries());
  }

  /**
   * Applies action to each key/value pair of the map.
   */
  forEach(action: (key: K, value: V) => void): void {
    for (const [key, value] of this.source.entries()) {
      action(key, value);
    }
  }

  /**
   * Returns a string representation of the map.
   */
  toString(): string {
    const entries: string[] = [];
    for (const [key, value] of this.source.entries()) {
      entries.push(`${key}: ${value}`);
    }
    return `{${entries.join(', ')}}`;
  }
  
  /**
   * Returns an iterator over entries (key-value pairs).
   */
  [Symbol.iterator](): Iterator<[K, V]> {
    return new UnmodifiableMapViewIterator(this);
  }

  // Mutation methods that throw errors

  /**
   * Not supported - map is unmodifiable.
   */
  set(key: K, value: V): void {
    throw new Error('Cannot modify an unmodifiable map');
  }

  /**
   * Not supported - map is unmodifiable.
   */
  delete(key: K): boolean {
    throw new Error('Cannot modify an unmodifiable map');
  }

  /**
   * Not supported - map is unmodifiable.
   */
  clear(): void {
    throw new Error('Cannot modify an unmodifiable map');
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
 * Iterator for UnmodifiableMapView
 */
class UnmodifiableMapViewIterator<K, V> implements Iterator<[K, V]> {
  private view: UnmodifiableMapView<K, V>;
  private entries: Array<[K, V]>;
  private index: number;
  private cachedFirst: [K, V] | undefined;
  
  constructor(view: UnmodifiableMapView<K, V>) {
    this.view = view;
    this.entries = view.entries();
    this.index = 0;
    // Cache first element for use as dummy value when done
    this.cachedFirst = this.entries.length > 0 ? this.entries[0] : undefined;
  }
  
  next(): IteratorResult<[K, V]> {
    if (this.index < this.entries.length) {
      const value = this.entries[this.index];
      this.index++;
      return new IteratorResultImpl(false, value);
    }
    // When done, value is required but won't be used
    return new IteratorResultImpl(true, this.cachedFirst as [K, V]);
  }
}
