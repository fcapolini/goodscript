# CanonicalizedMap<C, K, V>

A map whose keys are converted to canonical values of type `C`.

This is useful for using case-insensitive String keys, for example. It's more efficient than a regular `Map` with custom equality because it only canonicalizes each key once, rather than doing so for each comparison.

**Source**: Translated from [Dart's collection/canonicalized_map.dart](https://github.com/dart-lang/collection/blob/master/lib/src/canonicalized_map.dart)

## Type Parameters

- **C**: The canonical type (e.g., lowercase string)
- **K**: The key type (e.g., original string)  
- **V**: The value type

## Constructors

### `new CanonicalizedMap<C, K, V>(canonicalize, isValidKey?)`

Creates an empty canonicalized map.

**Parameters:**
- `canonicalize: (key: K) => C` - Function to convert a key to its canonical form. Keys with the same canonical value are considered equivalent.
- `isValidKey?: (key: K) => boolean` - Optional function to validate keys before canonicalization. Can be used to filter out keys that can't be canonicalized.

**Example:**
```typescript
// Case-insensitive string keys
const map = new CanonicalizedMap<string, string, number>(
  (key) => key.toLowerCase()
);

map.set('Apple', 1);
console.log(map.get('APPLE')); // 1
console.log(map.get('apple')); // 1
```

### `CanonicalizedMap.from<C, K, V>(other, canonicalize, isValidKey?)`

Creates a canonicalized map that is initialized with the key/value pairs of `other`.

**Parameters:**
- `other: Map<K, V>` - Source map to copy entries from
- `canonicalize: (key: K) => C` - Canonicalization function
- `isValidKey?: (key: K) => boolean` - Optional key validation function

**Returns:** `CanonicalizedMap<C, K, V>`

**Example:**
```typescript
const source = new Map([
  ['Apple', 1],
  ['Banana', 2]
]);

const cmap = CanonicalizedMap.from(
  source,
  (key) => key.toLowerCase()
);

console.log(cmap.get('APPLE')); // 1
```

### `CanonicalizedMap.fromEntries<C, K, V>(entries, canonicalize, isValidKey?)`

Creates a canonicalized map that is initialized with the key/value pairs of `entries`.

**Parameters:**
- `entries: MapEntry<K, V>[]` - Array of map entries
- `canonicalize: (key: K) => C` - Canonicalization function
- `isValidKey?: (key: K) => boolean` - Optional key validation function

**Returns:** `CanonicalizedMap<C, K, V>`

## Methods

### Basic Operations

#### `get(key: K): V | null`

Gets the value for the given key, or `null` if key is not in the map.

**Example:**
```typescript
const map = new CanonicalizedMap<string, string, number>(
  (key) => key.toLowerCase()
);

map.set('Apple', 1);
console.log(map.get('APPLE')); // 1
console.log(map.get('banana')); // null
```

#### `set(key: K, value: V): void`

Associates the key with the given value.

If the canonical form already exists, the value is updated and the key's casing is updated to match the new key.

**Example:**
```typescript
map.set('Apple', 1);
map.set('APPLE', 2); // Updates value, key becomes 'APPLE'
```

#### `containsKey(key: K): boolean`

Whether this map contains the given key (using canonical comparison).

**Example:**
```typescript
map.set('Apple', 1);
console.log(map.containsKey('APPLE')); // true
console.log(map.containsKey('banana')); // false
```

#### `containsValue(value: V): boolean`

Whether this map contains the given value.

#### `remove(key: K): V | null`

Removes key and its associated value, if present, from the map.

**Returns:** The value that was associated with the key, or `null` if key was not in the map.

**Example:**
```typescript
map.set('Apple', 1);
const removed = map.remove('APPLE'); // 1
console.log(map.containsKey('apple')); // false
```

#### `clear(): void`

Removes all entries from the map.

### Size and Emptiness

#### `getLength(): number`

The number of key/value pairs in the map.

#### `isEmpty(): boolean`

Whether there are no entries in the map.

#### `isNotEmpty(): boolean`

Whether there is at least one entry in the map.

### Iteration

#### `forEach(action: (key: K, value: V) => void): void`

Applies `action` to each key/value pair of the map.

**Example:**
```typescript
map.forEach((key, value) => {
  console.log(`${key}: ${value}`);
});
```

#### `getKeys(): K[]`

Returns the keys of this map with their original (non-canonical) casing.

**Example:**
```typescript
map.set('Apple', 1);
map.set('BANANA', 2);
console.log(map.getKeys()); // ['Apple', 'BANANA']
```

#### `getValues(): V[]`

Returns the values of this map.

#### `getEntries(): MapEntry<K, V>[]`

Returns the entries of this map as an array of `MapEntry` objects.

### Bulk Operations

#### `addAll(other: Map<K, V>): void`

Adds all key/value pairs of `other` to this map.

#### `addEntries(entries: MapEntry<K, V>[]): void`

Adds all entries to this map.

#### `removeWhere(test: (key: K, value: V) => boolean): void`

Removes all entries that satisfy the given `test`.

**Example:**
```typescript
map.removeWhere((key, value) => value % 2 === 0);
```

### Update Operations

#### `putIfAbsent(key: K, ifAbsent: () => V): V`

Look up the value of key, or add a new entry if it isn't there.

**Returns:** The value associated with the key (existing or newly created).

**Example:**
```typescript
const value = map.putIfAbsent('Apple', () => 1);
console.log(value); // 1 if new, existing value otherwise
```

#### `update(key: K, update: (value: V) => V, ifAbsent?: () => V): V`

Updates the value for the provided key.

**Throws:** Error if key is not in map and `ifAbsent` is not provided.

**Example:**
```typescript
map.set('Apple', 1);
map.update('APPLE', (v) => v + 10); // Now 11

// With ifAbsent
map.update('Banana', (v) => v + 10, () => 5); // Creates with value 5
```

#### `updateAll(update: (key: K, value: V) => V): void`

Updates all values in the map.

**Example:**
```typescript
map.updateAll((key, value) => value * 2);
```

### Transformation

#### `mapEntries<K2, V2>(transform: (key: K, value: V) => MapEntry<K2, V2>): Map<K2, V2>`

Returns a new map where all entries of this map are transformed by the given function.

**Example:**
```typescript
const doubled = map.mapEntries((k, v) => 
  new MapEntry(k, v * 2)
);
```

#### `copy(): CanonicalizedMap<C, K, V>`

Copies this CanonicalizedMap instance without recalculating the canonical values of the keys.

Creates an independent copy that won't be affected by changes to the original.

**Example:**
```typescript
const copy = map.copy();
map.set('NewKey', 1); // Original modified
console.log(copy.containsKey('NewKey')); // false
```

#### `toMap(): Map<K, V>`

Creates a `Map<K, V>` (with the original key values).

The resulting map is case-sensitive and uses the original key casing from the last set operation.

**Example:**
```typescript
const regularMap = cmap.toMap();
console.log(regularMap.get('Apple')); // Works
console.log(regularMap.get('apple')); // undefined (case-sensitive)
```

#### `toMapOfCanonicalKeys(): Map<C, V>`

Creates a `Map<C, V>` (with the canonicalized keys).

**Example:**
```typescript
const canonical = cmap.toMapOfCanonicalKeys();
console.log(canonical.get('apple')); // Works (lowercase)
console.log(canonical.get('Apple')); // undefined
```

### Other

#### `toString(): string`

String representation of this map.

## Use Cases

### Case-Insensitive String Keys

```typescript
const settings = new CanonicalizedMap<string, string, string>(
  (key) => key.toLowerCase()
);

settings.set('UserName', 'alice');
settings.set('PASSWORD', 'secret');

console.log(settings.get('username')); // 'alice'
console.log(settings.get('password')); // 'secret'
```

### Trimmed Whitespace Keys

```typescript
const map = new CanonicalizedMap<string, string, number>(
  (key) => key.trim()
);

map.set('  Apple  ', 1);
console.log(map.get('Apple')); // 1
console.log(map.get('  Apple')); // 1
```

### Path Normalization

```typescript
const normalizePath = (path: string): string => {
  return path.split('/').filter(p => p.length > 0).join('/');
};

const fileCache = new CanonicalizedMap<string, string, string>(
  normalizePath
);

fileCache.set('/path/to/file', 'content');
console.log(fileCache.get('path//to///file/')); // 'content'
```

### Numeric String Normalization

```typescript
const map = new CanonicalizedMap<number, string, string>(
  (key) => parseInt(key, 10)
);

map.set('01', 'one');
map.set('001', 'also one'); // Overwrites

console.log(map.get('1')); // 'also one'
console.log(map.getLength()); // 1
```

### With Key Validation

```typescript
const map = new CanonicalizedMap<string, string, number>(
  (key) => key.toLowerCase(),
  (key) => key.length > 0  // Reject empty strings
);

map.set('', 1); // Silently ignored
map.set('Apple', 1); // Accepted
console.log(map.getLength()); // 1
```

## Performance Characteristics

- **Construction**: O(1)
- **get/set/containsKey**: O(1) average (hash table lookup with single canonicalization)
- **remove**: O(1) average
- **containsValue**: O(n) - must scan all entries
- **forEach/getKeys/getValues/getEntries**: O(n)
- **removeWhere/updateAll**: O(n)

**Memory**: O(n) where n is the number of entries. Each entry stores both the original key and its value.

## Key Differences from Dart

1. **Method naming**: Uses `getLength()`, `isEmpty()`, `isNotEmpty()` instead of properties
2. **Null handling**: Returns `null` instead of throwing for missing keys
3. **No iterator protocol**: Use `getKeys()`, `getValues()`, or `getEntries()` for iteration
4. **Static factory methods**: `from()` and `fromEntries()` are static methods
5. **MapEntry class**: Included in the same file for simplicity

## Implementation Notes

- **Key Preservation**: The original key casing is preserved. When you update a value for an existing canonical key, the key's casing is updated to match the most recent set operation.
- **Canonicalization Efficiency**: The canonicalization function is called exactly once per operation, not for each comparison.
- **Storage**: Internally uses a `Map<C, MapEntry<K, V>>` to store canonical keys mapped to entries containing both original keys and values.

## See Also

- **EqualityMap**: For custom equality comparison without canonicalization
- **Comparators**: Provides case-insensitive comparison functions that can be used with canonicalization
