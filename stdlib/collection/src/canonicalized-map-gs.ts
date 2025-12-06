/**
 * CanonicalizedMap - A map whose keys are converted to canonical values.
 * 
 * Translated from Dart's collection package:
 * https://github.com/dart-lang/collection/blob/master/lib/src/canonicalized_map.dart
 * 
 * This is useful for using case-insensitive String keys, for example.
 * It's more efficient than a Map with a custom equality operator because
 * it only canonicalizes each key once, rather than doing so for each comparison.
 */

/**
 * A map whose keys are converted to canonical values of type C.
 * 
 * This is useful for using case-insensitive String keys, for example.
 * It's more efficient than a regular Map with custom equality because
 * it only canonicalizes each key once, rather than doing so for each comparison.
 * 
 * @template C - The canonical type (e.g., lowercase string)
 * @template K - The key type (e.g., original string)
 * @template V - The value type
 */
export class CanonicalizedMap<C, K, V> {
  private _canonicalize: (key: K) => C;
  private _isValidKeyFn: ((key: K) => boolean) | null;
  private _base: Map<C, MapEntry<K, V>>;

  /**
   * Creates an empty canonicalized map.
   * 
   * The `canonicalize` function should return the canonical value for the
   * given key. Keys with the same canonical value are considered equivalent.
   * 
   * The `isValidKey` function is called before calling `canonicalize` for
   * methods that take arbitrary objects. It can be used to filter out keys
   * that can't be canonicalized.
   * 
   * @param canonicalize - Function to convert a key to its canonical form
   * @param isValidKey - Optional function to validate keys before canonicalization
   */
  constructor(
    canonicalize: (key: K) => C,
    isValidKey: ((key: K) => boolean) | null = null
  ) {
    this._canonicalize = canonicalize;
    this._isValidKeyFn = isValidKey;
    this._base = new Map<C, MapEntry<K, V>>();
  }

  /**
   * Creates a canonicalized map that is initialized with the key/value pairs of `other`.
   * 
   * @param other - Source map to copy entries from
   * @param canonicalize - Function to convert a key to its canonical form
   * @param isValidKey - Optional function to validate keys before canonicalization
   */
  static from<C, K, V>(
    other: Map<K, V>,
    canonicalize: (key: K) => C,
    isValidKey: ((key: K) => boolean) | null = null
  ): CanonicalizedMap<C, K, V> {
    const map = new CanonicalizedMap<C, K, V>(canonicalize, isValidKey);
    map.addAll(other);
    return map;
  }

  /**
   * Creates a canonicalized map that is initialized with the key/value pairs of `entries`.
   * 
   * @param entries - Iterable of map entries
   * @param canonicalize - Function to convert a key to its canonical form
   * @param isValidKey - Optional function to validate keys before canonicalization
   */
  static fromEntries<C, K, V>(
    entries: MapEntry<K, V>[],
    canonicalize: (key: K) => C,
    isValidKey: ((key: K) => boolean) | null = null
  ): CanonicalizedMap<C, K, V> {
    const map = new CanonicalizedMap<C, K, V>(canonicalize, isValidKey);
    map.addEntries(entries);
    return map;
  }

  /**
   * Internal constructor for copying.
   */
  private static _copy<C, K, V>(
    canonicalize: (key: K) => C,
    isValidKey: ((key: K) => boolean) | null,
    base: Map<C, MapEntry<K, V>>
  ): CanonicalizedMap<C, K, V> {
    const map = new CanonicalizedMap<C, K, V>(canonicalize, isValidKey);
    for (const entry of base.entries()) {
      map._base.set(entry[0], entry[1]);
    }
    return map;
  }

  /**
   * Copies this CanonicalizedMap instance without recalculating the canonical values of the keys.
   * 
   * @returns A new map with the same entries
   */
  copy(): CanonicalizedMap<C, K, V> {
    return CanonicalizedMap._copy(this._canonicalize, this._isValidKeyFn, this._base);
  }

  /**
   * Gets the value for the given key, or null if key is not in the map.
   * 
   * @param key - The key to look up
   * @returns The value associated with the key, or null
   */
  get(key: K): V | null {
    if (!this._isValidKey(key)) {
      return null;
    }
    const pair = this._base.get(this._canonicalize(key));
    if (pair === undefined) {
      return null;
    }
    return pair.value;
  }

  /**
   * Associates the key with the given value.
   * 
   * @param key - The key
   * @param value - The value to associate with the key
   */
  set(key: K, value: V): void {
    if (!this._isValidKey(key)) {
      return;
    }
    this._base.set(this._canonicalize(key), new MapEntry(key, value));
  }

  /**
   * Adds all key/value pairs of `other` to this map.
   * 
   * @param other - Map to add entries from
   */
  addAll(other: Map<K, V>): void {
    for (const entry of other.entries()) {
      this.set(entry[0], entry[1]);
    }
  }

  /**
   * Adds all entries to this map.
   * 
   * @param entries - Entries to add
   */
  addEntries(entries: MapEntry<K, V>[]): void {
    for (const entry of entries) {
      this._base.set(
        this._canonicalize(entry.key),
        new MapEntry(entry.key, entry.value)
      );
    }
  }

  /**
   * Removes all entries from the map.
   */
  clear(): void {
    this._base.clear();
  }

  /**
   * Whether this map contains the given key.
   * 
   * @param key - The key to check
   * @returns true if the map contains the key
   */
  containsKey(key: K): boolean {
    if (!this._isValidKey(key)) {
      return false;
    }
    return this._base.has(this._canonicalize(key));
  }

  /**
   * Whether this map contains the given value.
   * 
   * @param value - The value to check
   * @returns true if the map contains the value
   */
  containsValue(value: V): boolean {
    for (const pair of this._base.values()) {
      if (pair.value === value) {
        return true;
      }
    }
    return false;
  }

  /**
   * Returns the entries of this map.
   * 
   * @returns Array of map entries
   */
  getEntries(): MapEntry<K, V>[] {
    const result: MapEntry<K, V>[] = [];
    for (const entry of this._base.values()) {
      result.push(new MapEntry(entry.key, entry.value));
    }
    return result;
  }

  /**
   * Applies `action` to each key/value pair of the map.
   * 
   * @param action - Function to apply to each key/value pair
   */
  forEach(action: (key: K, value: V) => void): void {
    for (const pair of this._base.values()) {
      action(pair.key, pair.value);
    }
  }

  /**
   * Whether there are no entries in the map.
   * 
   * @returns true if the map is empty
   */
  isEmpty(): boolean {
    return this._base.size === 0;
  }

  /**
   * Whether there is at least one entry in the map.
   * 
   * @returns true if the map is not empty
   */
  isNotEmpty(): boolean {
    return this._base.size !== 0;
  }

  /**
   * Returns the keys of this map.
   * 
   * @returns Array of keys
   */
  getKeys(): K[] {
    const result: K[] = [];
    for (const pair of this._base.values()) {
      result.push(pair.key);
    }
    return result;
  }

  /**
   * The number of key/value pairs in the map.
   * 
   * @returns The size of the map
   */
  getLength(): number {
    return this._base.size;
  }

  /**
   * Returns a new map where all entries of this map are transformed.
   * 
   * @param transform - Function to transform entries
   * @returns New map with transformed entries
   */
  mapEntries<K2, V2>(transform: (key: K, value: V) => MapEntry<K2, V2>): Map<K2, V2> {
    const result = new Map<K2, V2>();
    for (const pair of this._base.values()) {
      const newEntry = transform(pair.key, pair.value);
      result.set(newEntry.key, newEntry.value);
    }
    return result;
  }

  /**
   * Look up the value of key, or add a new entry if it isn't there.
   * 
   * @param key - The key to look up
   * @param ifAbsent - Function to create value if key is absent
   * @returns The value associated with the key
   */
  putIfAbsent(key: K, ifAbsent: () => V): V {
    const canonical = this._canonicalize(key);
    const existing = this._base.get(canonical);
    if (existing !== undefined) {
      return existing.value;
    }
    const newValue = ifAbsent();
    this._base.set(canonical, new MapEntry(key, newValue));
    return newValue;
  }

  /**
   * Removes key and its associated value, if present, from the map.
   * 
   * @param key - The key to remove
   * @returns The value that was associated with the key, or null
   */
  remove(key: K): V | null {
    if (!this._isValidKey(key)) {
      return null;
    }
    const pair = this._base.get(this._canonicalize(key));
    if (pair === undefined) {
      return null;
    }
    this._base.delete(this._canonicalize(key));
    return pair.value;
  }

  /**
   * Removes all entries that satisfy the given test.
   * 
   * @param test - Function to test each entry
   */
  removeWhere(test: (key: K, value: V) => boolean): void {
    const toRemove: C[] = [];
    for (const entry of this._base.entries()) {
      const pair = entry[1];
      if (test(pair.key, pair.value)) {
        toRemove.push(entry[0]);
      }
    }
    for (const canonical of toRemove) {
      this._base.delete(canonical);
    }
  }

  /**
   * Updates the value for the provided key.
   * 
   * @param key - The key to update
   * @param update - Function to compute new value
   * @param ifAbsent - Optional function to create value if key is absent
   * @returns The new value
   */
  update(key: K, update: (value: V) => V, ifAbsent: (() => V) | null = null): V {
    const canonical = this._canonicalize(key);
    const existing = this._base.get(canonical);
    
    if (existing !== undefined) {
      const value = existing.value;
      const newValue = update(value);
      if (newValue !== value) {
        this._base.set(canonical, new MapEntry(key, newValue));
      }
      return newValue;
    }
    
    if (ifAbsent !== null) {
      const newValue = ifAbsent();
      this._base.set(canonical, new MapEntry(key, newValue));
      return newValue;
    }
    
    throw new Error('Key not in map and no ifAbsent function provided');
  }

  /**
   * Updates all values.
   * 
   * @param update - Function to update each value
   */
  updateAll(update: (key: K, value: V) => V): void {
    const updates: [C, MapEntry<K, V>][] = [];
    for (const entry of this._base.entries()) {
      const pair = entry[1];
      const value = pair.value;
      const key = pair.key;
      const newValue = update(key, value);
      if (newValue !== value) {
        updates.push([entry[0], new MapEntry(key, newValue)]);
      }
    }
    for (const [canonical, newEntry] of updates) {
      this._base.set(canonical, newEntry);
    }
  }

  /**
   * Returns the values of this map.
   * 
   * @returns Array of values
   */
  getValues(): V[] {
    const result: V[] = [];
    for (const pair of this._base.values()) {
      result.push(pair.value);
    }
    return result;
  }

  /**
   * Creates a Map<K, V> (with the original key values).
   * 
   * @returns Regular Map with original keys
   */
  toMap(): Map<K, V> {
    const result = new Map<K, V>();
    for (const pair of this._base.values()) {
      result.set(pair.key, pair.value);
    }
    return result;
  }

  /**
   * Creates a Map<C, V> (with the canonicalized keys).
   * 
   * @returns Map with canonical keys
   */
  toMapOfCanonicalKeys(): Map<C, V> {
    const result = new Map<C, V>();
    for (const entry of this._base.entries()) {
      result.set(entry[0], entry[1].value);
    }
    return result;
  }

  /**
   * String representation of this map.
   * 
   * @returns String representation
   */
  toString(): string {
    const entries: string[] = [];
    for (const pair of this._base.values()) {
      entries.push(`${pair.key}: ${pair.value}`);
    }
    return `{${entries.join(', ')}}`;
  }

  /**
   * Checks if a key is valid.
   * 
   * @param key - The key to validate
   * @returns true if the key is valid
   */
  private _isValidKey(key: K): boolean {
    return this._isValidKeyFn === null || this._isValidKeyFn(key);
  }
}

/**
 * A simple key-value pair.
 */
export class MapEntry<K, V> {
  key: K;
  value: V;

  constructor(key: K, value: V) {
    this.key = key;
    this.value = value;
  }
}
