/**
 * LRU (Least Recently Used) Cache implementation.
 * 
 * Inspired by Quiver's cache implementation but simplified for GoodScript.
 * 
 * An LRU cache automatically evicts the least recently used entries when
 * the cache reaches its maximum size. This is useful for limiting memory usage
 * while maintaining frequently accessed data.
 * 
 * Features:
 * - Fixed maximum size
 * - O(1) get, set, and delete operations
 * - Automatic eviction of least recently used entries
 * - Optional loader function for automatic value generation
 * - Thread-safe Promise-based async operations
 */

/**
 * A node in the doubly-linked list used to track access order.
 */
class LRUNode<K, V> {
  key: K;
  value: V;
  prev: LRUNode<K, V> | null;
  next: LRUNode<K, V> | null;
  
  constructor(key: K, value: V) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

/**
 * Function that produces a value for a key when the cache needs to populate an entry.
 */
export type Loader<K, V> = (key: K) => Promise<V>;

/**
 * LRU (Least Recently Used) Cache.
 * 
 * Maintains a maximum number of entries. When the cache is full and a new entry
 * is added, the least recently used entry is automatically evicted.
 * 
 * Access order is tracked using a doubly-linked list, where the most recently
 * used items are at the front and least recently used items are at the back.
 * 
 * @example
 * const cache = new LRUCache<string, number>(3);
 * await cache.set('a', 1);
 * await cache.set('b', 2);
 * await cache.set('c', 3);
 * await cache.get('a'); // Returns 1, 'a' becomes most recently used
 * await cache.set('d', 4); // Evicts 'b' (least recently used)
 * await cache.get('b'); // Returns null (evicted)
 */
export class LRUCache<K, V> {
  private maxSize: number;
  private cache: Map<K, LRUNode<K, V>>;
  private head: LRUNode<K, V> | null;
  private tail: LRUNode<K, V> | null;
  
  /**
   * Creates a new LRU cache with the specified maximum size.
   * 
   * @param maxSize Maximum number of entries to store (must be > 0)
   */
  constructor(maxSize: number) {
    if (maxSize <= 0) {
      throw new Error('maxSize must be positive');
    }
    this.maxSize = maxSize;
    this.cache = new Map<K, LRUNode<K, V>>();
    this.head = null;
    this.tail = null;
  }
  
  /**
   * Returns the current number of entries in the cache.
   */
  getSize(): number {
    return this.cache.size;
  }
  
  /**
   * Returns the maximum number of entries the cache can hold.
   */
  getMaxSize(): number {
    return this.maxSize;
  }
  
  /**
   * Checks if the cache is empty.
   */
  isEmpty(): boolean {
    return this.cache.size === 0;
  }
  
  /**
   * Checks if the cache is full.
   */
  isFull(): boolean {
    return this.cache.size >= this.maxSize;
  }
  
  /**
   * Returns the value associated with the key, or null if not found.
   * 
   * If ifAbsent is provided and the key is not in the cache, the loader
   * function is called to generate a value, which is then cached and returned.
   * 
   * @param key The key to lookup
   * @param ifAbsent Optional loader function to generate a value if key not found
   * @returns The value associated with key, or null if not found and no loader provided
   * 
   * @example
   * const value = await cache.get('key');
   * const valueOrDefault = await cache.get('key', async (k) => fetchFromDB(k));
   */
  async get(key: K, ifAbsent?: Loader<K, V>): Promise<V | null> {
    const node = this.cache.get(key);
    
    if (node !== null && node !== undefined) {
      // Move to front (most recently used)
      this.moveToFront(node);
      return node.value;
    }
    
    // Key not found
    if (ifAbsent !== null && ifAbsent !== undefined) {
      const value = await ifAbsent(key);
      await this.set(key, value);
      return value;
    }
    
    return null;
  }
  
  /**
   * Sets the value associated with the key.
   * 
   * If the key already exists, updates the value and moves it to the front.
   * If the cache is full, evicts the least recently used entry before adding the new one.
   * 
   * @param key The key to set
   * @param value The value to associate with the key
   * 
   * @example
   * await cache.set('user:123', userData);
   */
  async set(key: K, value: V): Promise<void> {
    const existingNode = this.cache.get(key);
    
    if (existingNode !== null && existingNode !== undefined) {
      // Update existing entry
      existingNode.value = value;
      this.moveToFront(existingNode);
      return;
    }
    
    // Create new entry
    const newNode = new LRUNode(key, value);
    
    // Evict if necessary
    if (this.isFull()) {
      this.evictLRU();
    }
    
    // Add to cache and move to front
    this.cache.set(key, newNode);
    this.addToFront(newNode);
  }
  
  /**
   * Checks if the cache contains the given key.
   * 
   * Note: This does not update access order.
   * 
   * @param key The key to check
   * @returns true if the key exists in the cache
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }
  
  /**
   * Removes the entry associated with the key.
   * 
   * @param key The key to remove
   * @returns true if an entry was removed, false if key not found
   * 
   * @example
   * await cache.invalidate('stale-key');
   */
  async invalidate(key: K): Promise<boolean> {
    const node = this.cache.get(key);
    
    if (node === null || node === undefined) {
      return false;
    }
    
    this.removeNode(node);
    this.cache.delete(key);
    return true;
  }
  
  /**
   * Removes all entries from the cache.
   * 
   * @example
   * await cache.clear();
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.head = null;
    this.tail = null;
  }
  
  /**
   * Returns all keys in the cache, ordered from most recently used to least recently used.
   * 
   * @example
   * const keys = cache.getKeys();
   */
  getKeys(): K[] {
    const keys: K[] = [];
    let current = this.head;
    while (current !== null) {
      keys.push(current.key);
      current = current.next;
    }
    return keys;
  }
  
  /**
   * Returns all values in the cache, ordered from most recently used to least recently used.
   * 
   * @example
   * const values = cache.getValues();
   */
  getValues(): V[] {
    const values: V[] = [];
    let current = this.head;
    while (current !== null) {
      values.push(current.value);
      current = current.next;
    }
    return values;
  }
  
  /**
   * Returns all entries in the cache as [key, value] pairs,
   * ordered from most recently used to least recently used.
   * 
   * @example
   * const entries = cache.getEntries();
   * for (const [key, value] of entries) {
   *   console.log(`${key}: ${value}`);
   * }
   */
  getEntries(): Array<[K, V]> {
    const entries: Array<[K, V]> = [];
    let current = this.head;
    while (current !== null) {
      entries.push([current.key, current.value]);
      current = current.next;
    }
    return entries;
  }
  
  /**
   * Moves a node to the front of the list (most recently used position).
   */
  private moveToFront(node: LRUNode<K, V>): void {
    if (node === this.head) {
      return; // Already at front
    }
    
    // Remove from current position
    this.removeNode(node);
    
    // Add to front
    this.addToFront(node);
  }
  
  /**
   * Adds a node to the front of the list.
   */
  private addToFront(node: LRUNode<K, V>): void {
    node.next = this.head;
    node.prev = null;
    
    if (this.head !== null) {
      this.head.prev = node;
    }
    
    this.head = node;
    
    if (this.tail === null) {
      this.tail = node;
    }
  }
  
  /**
   * Removes a node from the list.
   */
  private removeNode(node: LRUNode<K, V>): void {
    if (node.prev !== null) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }
    
    if (node.next !== null) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }
  
  /**
   * Evicts the least recently used entry (the tail of the list).
   */
  private evictLRU(): void {
    if (this.tail === null) {
      return;
    }
    
    const lruNode = this.tail;
    this.removeNode(lruNode);
    this.cache.delete(lruNode.key);
  }
}
