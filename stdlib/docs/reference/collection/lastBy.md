# lastBy

Associates the elements of an iterable by the value returned by a key function, keeping only the last element for each key.

## Signature

```typescript
function lastBy<T, K>(
  values: Iterable<T>,
  keyOf: (element: T) => K
): Map<K, T>
```

## Parameters

- **values**: `Iterable<T>` - The iterable of values to associate
- **keyOf**: `(element: T) => K` - Function that extracts the key from each element

## Returns

`Map<K, T>` - A map from keys to the last element with that key

## Description

Similar to `groupBy`, but only keeps the *last* element for each key. If multiple elements map to the same key, later elements replace earlier ones.

This is useful for creating id-to-object mappings where you want the most recent version of each object.

## Examples

### Map users by ID, keeping latest version

```typescript
const users = [
  { id: 1, name: 'Alice', version: 1 },
  { id: 2, name: 'Bob', version: 1 },
  { id: 1, name: 'Alice Updated', version: 2 }
];

const byId = lastBy(users, user => user.id);

console.log(byId.get(1));
// { id: 1, name: 'Alice Updated', version: 2 }

console.log(byId.get(2));
// { id: 2, name: 'Bob', version: 1 }
```

### Create simple id-to-object mapping

```typescript
const items = [
  { id: 'A', value: 1 },
  { id: 'B', value: 2 },
  { id: 'C', value: 3 }
];

const map = lastBy(items, item => item.id);

console.log(map.get('A')?.value);
// 1

console.log(map.get('B')?.value);
// 2
```

### Last by first character

```typescript
const words = ['apple', 'apricot', 'banana'];
const lastByFirstChar = lastBy(words, word => word[0]);

console.log(lastByFirstChar.get('a'));
// 'apricot'  (last word starting with 'a')

console.log(lastByFirstChar.get('b'));
// 'banana'
```

### Processing log entries

```typescript
const logEntries = [
  { userId: 'alice', action: 'login', timestamp: 100 },
  { userId: 'bob', action: 'login', timestamp: 101 },
  { userId: 'alice', action: 'view', timestamp: 102 },
  { userId: 'alice', action: 'logout', timestamp: 103 }
];

// Get the last action for each user
const lastAction = lastBy(logEntries, entry => entry.userId);

console.log(lastAction.get('alice')?.action);
// 'logout'

console.log(lastAction.get('bob')?.action);
// 'login'
```

## Performance

- **Time Complexity**: O(n) where n is the number of elements
- **Space Complexity**: O(k) where k is the number of unique keys

## Edge Cases

- **Empty iterable**: Returns an empty map
- **Single element**: Returns a map with one entry
- **All elements map to same key**: Returns a map with one entry (the last element)
- **Each element maps to unique key**: Returns a map with n entries (same as groupBy with single-element arrays)

## Comparison with groupBy

| Feature | `groupBy` | `lastBy` |
|---------|----------|---------|
| Return type | `Map<K, T[]>` | `Map<K, T>` |
| Multiple elements per key | All kept in array | Only last kept |
| Use case | Analyze all items in each group | Get most recent/final value for each key |

### Example

```typescript
const items = [
  { category: 'A', value: 1 },
  { category: 'B', value: 2 },
  { category: 'A', value: 3 }
];

const grouped = groupBy(items, item => item.category);
const last = lastBy(items, item => item.category);

// groupBy keeps all items
console.log(grouped.get('A'));
// [{ category: 'A', value: 1 }, { category: 'A', value: 3 }]

// lastBy keeps only the last item
console.log(last.get('A'));
// { category: 'A', value: 3 }
```

## See Also

- [groupBy](#groupby) - Groups all elements for each key into an array
