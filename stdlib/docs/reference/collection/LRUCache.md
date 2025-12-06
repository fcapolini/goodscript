# LRUCache

**Package**: `@goodscript/collection`  
**Source**: Inspired by [Quiver's cache package](https://github.com/google/quiver-dart)

## Overview

`LRUCache<K, V>` is a Least Recently Used (LRU) cache that automatically evicts the least recently used entries when the cache reaches its maximum size. It provides O(1) time complexity for all operations using a combination of a hash map and a doubly-linked list.

## Type Parameters

- `K` - The type of keys
- `V` - The type of values

## Type Aliases

### Loader<K, V>

```typescript
type Loader<K, V> = (key: K) => Promise<V>
```

A function that produces a value for a key when the cache needs to populate an entry. Used with the optional `ifAbsent` parameter in `get()`.

## Constructor

### LRUCache(maxSize)

```typescript
constructor(maxSize: number)
```

Creates a new LRU cache with the specified maximum size.

**Parameters:**
- `maxSize: number` - Maximum number of entries to store (must be > 0)

**Throws:**
- `Error` if `maxSize` is less than or equal to 0

**Example:**
```typescript
const cache = new LRUCache<string, number>(100);
```

## Methods

### async get(key, ifAbsent?)

```typescript
async get(key: K, ifAbsent?: Loader<K, V>): Promise<V | null>
```

Returns the value associated with the key, or null if not found.

If the key exists, it's moved to the front of the access order (marked as most recently used).

If `ifAbsent` is provided and the key is not in the cache, the loader function is called to generate a value, which is then cached and returned.

**Parameters:**
- `key: K` - The key to lookup
- `ifAbsent?: Loader<K, V>` - Optional async function to generate a value if key not found

**Returns:** `Promise<V | null>` - The value, or null if not found and no loader provided

**Time Complexity:** O(1)

**Example:**
```typescript
// Simple get
const value = await cache.get('key1');

// Get with loader
const value = await cache.get('key2', async (k) => {
  const data = await fetchFromDatabase(k);
  return data;
});
```

### async set(key, value)

```typescript
async set(key: K, value: V): Promise<void>
```

Sets the value for the given key. If the cache is full, the least recently used entry is evicted.

If the key already exists, its value is updated and it's moved to the front (most recently used).

**Parameters:**
- `key: K` - The key to set
- `value: V` - The value to store

**Time Complexity:** O(1)

**Example:**
```typescript
await cache.set('key1', 42);
await cache.set('key2', 100);
```

### has(key)

```typescript
has(key: K): boolean
```

Checks if the cache contains the given key. Does not update access order.

**Parameters:**
- `key: K` - The key to check

**Returns:** `boolean` - True if key exists, false otherwise

**Time Complexity:** O(1)

**Example:**
```typescript
if (cache.has('key1')) {
  console.log('Key exists');
}
```

### async invalidate(key)

```typescript
async invalidate(key: K): Promise<boolean>
```

Removes an entry from the cache.

**Parameters:**
- `key: K` - The key to remove

**Returns:** `Promise<boolean>` - True if entry was removed, false if key didn't exist

**Time Complexity:** O(1)

**Example:**
```typescript
const removed = await cache.invalidate('key1');
```

### async clear()

```typescript
async clear(): Promise<void>
```

Removes all entries from the cache.

**Time Complexity:** O(n) where n is the number of entries

**Example:**
```typescript
await cache.clear();
```

### getKeys()

```typescript
getKeys(): K[]
```

Returns all keys in the cache in Most Recently Used (MRU) order (most recent first).

**Returns:** `K[]` - Array of keys

**Time Complexity:** O(n)

**Example:**
```typescript
const keys = cache.getKeys();
// keys[0] is the most recently used
// keys[keys.length - 1] is the least recently used
```

### getValues()

```typescript
getValues(): V[]
```

Returns all values in the cache in Most Recently Used (MRU) order.

**Returns:** `V[]` - Array of values

**Time Complexity:** O(n)

**Example:**
```typescript
const values = cache.getValues();
```

### getEntries()

```typescript
getEntries(): Array<{ key: K; value: V }>
```

Returns all entries in the cache in Most Recently Used (MRU) order.

**Returns:** `Array<{ key: K; value: V }>` - Array of key-value pairs

**Time Complexity:** O(n)

**Example:**
```typescript
const entries = cache.getEntries();
for (const { key, value } of entries) {
  console.log(`${key}: ${value}`);
}
```

### getSize()

```typescript
getSize(): number
```

Returns the current number of entries in the cache.

**Returns:** `number` - Current size

**Time Complexity:** O(1)

### getMaxSize()

```typescript
getMaxSize(): number
```

Returns the maximum number of entries the cache can hold.

**Returns:** `number` - Maximum size

**Time Complexity:** O(1)

### isEmpty()

```typescript
isEmpty(): boolean
```

Checks if the cache is empty.

**Returns:** `boolean` - True if cache has no entries

**Time Complexity:** O(1)

### isFull()

```typescript
isFull(): boolean
```

Checks if the cache is at maximum capacity.

**Returns:** `boolean` - True if cache is full

**Time Complexity:** O(1)

## Performance Characteristics

| Operation | Time Complexity | Space Complexity |
|-----------|----------------|------------------|
| get() | O(1) | O(1) |
| set() | O(1) | O(1) |
| has() | O(1) | O(1) |
| invalidate() | O(1) | O(1) |
| clear() | O(n) | O(1) |
| getKeys() | O(n) | O(n) |
| getValues() | O(n) | O(n) |
| getEntries() | O(n) | O(n) |

Space complexity for the entire cache is O(n) where n is the number of entries.

## Implementation Details

The cache uses two data structures:

1. **Map<K, LRUNode<K, V>>** - For O(1) key lookups
2. **Doubly-linked list** - For tracking access order in O(1) time

The doubly-linked list maintains entries from most recently used (head) to least recently used (tail). When an entry is accessed or updated, it's moved to the head. When the cache is full and a new entry is added, the tail (LRU entry) is evicted.

## Use Cases

### API Response Caching

```typescript
const apiCache = new LRUCache<string, Response>(1000);

async function fetchWithCache(url: string): Promise<Response> {
  return await apiCache.get(url, async (u) => {
    const response = await fetch(u);
    return response;
  });
}
```

### Memoization

```typescript
const fibCache = new LRUCache<number, number>(100);

async function fibonacci(n: number): Promise<number> {
  if (n <= 1) return n;
  
  const cached = await fibCache.get(n);
  if (cached !== null) return cached;
  
  const result = await fibonacci(n - 1) + await fibonacci(n - 2);
  await fibCache.set(n, result);
  return result;
}
```

### Session Storage

```typescript
interface Session {
  userId: string;
  data: Record<string, any>;
  timestamp: number;
}

const sessions = new LRUCache<string, Session>(10000);

async function getSession(sessionId: string): Promise<Session | null> {
  return await sessions.get(sessionId, async (id) => {
    // Load from database
    return await db.loadSession(id);
  });
}
```

### Image Thumbnail Cache

```typescript
const thumbnails = new LRUCache<string, Uint8Array>(500);

async function getThumbnail(imageId: string): Promise<Uint8Array> {
  return await thumbnails.get(imageId, async (id) => {
    const image = await loadImage(id);
    return await generateThumbnail(image);
  })!;
}
```

## Async/Await Support

This is one of the first GoodScript stdlib libraries to use async/await and Promise types:

- All mutating operations (`get`, `set`, `invalidate`, `clear`) are async
- Loader functions return `Promise<V>`
- Enables integration with async data sources (databases, APIs, file systems)

The async API provides natural composition with other async operations without blocking.

## Differences from Source

This implementation is inspired by Quiver's cache but adapted for GoodScript:

1. **Async by default** - All operations return Promises to support async loaders
2. **Simplified API** - Focused on core LRU functionality
3. **TypeScript native** - Uses TypeScript/JavaScript idioms instead of Dart patterns
4. **Map-based** - Uses native Map for O(1) lookups instead of custom hash table

## See Also

- [EqualityMap](./EqualityMap.md) - Map with custom equality for keys
- [CanonicalizedMap](./CanonicalizedMap.md) - Map with key canonicalization
- [UnmodifiableMapView](./UnmodifiableMapView.md) - Read-only map wrapper
