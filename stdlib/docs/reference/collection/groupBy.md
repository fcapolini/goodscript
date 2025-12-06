# groupBy

Groups the elements of an iterable by the value returned by a key function.

## Signature

```typescript
function groupBy<T, K>(
  values: Iterable<T>,
  keyOf: (element: T) => K
): Map<K, T[]>
```

## Parameters

- **values**: `Iterable<T>` - The iterable of values to group
- **keyOf**: `(element: T) => K` - Function that extracts the grouping key from each element

## Returns

`Map<K, T[]>` - A map from keys to arrays of elements with that key

## Description

Each element is mapped to a key by calling `keyOf`. Elements with the same key are grouped into an array, and the result is a map from keys to arrays of elements.

The order of elements within each group is preserved from the original iterable.

## Examples

### Group strings by first character

```typescript
const words = ['apple', 'apricot', 'banana', 'blueberry', 'cherry'];
const grouped = groupBy(words, word => word[0]);

console.log(grouped.get('a'));
// ['apple', 'apricot']

console.log(grouped.get('b'));
// ['banana', 'blueberry']

console.log(grouped.get('c'));
// ['cherry']
```

### Group numbers by even/odd

```typescript
const numbers = [1, 2, 3, 4, 5, 6, 7, 8];
const grouped = groupBy(numbers, n => n % 2 === 0 ? 'even' : 'odd');

console.log(grouped.get('even'));
// [2, 4, 6, 8]

console.log(grouped.get('odd'));
// [1, 3, 5, 7]
```

### Group objects by property

```typescript
const users = [
  { name: 'Alice', role: 'admin' },
  { name: 'Bob', role: 'user' },
  { name: 'Charlie', role: 'admin' },
  { name: 'David', role: 'user' }
];

const grouped = groupBy(users, user => user.role);

console.log(grouped.get('admin'));
// [{ name: 'Alice', role: 'admin' }, { name: 'Charlie', role: 'admin' }]

console.log(grouped.get('user'));
// [{ name: 'Bob', role: 'user' }, { name: 'David', role: 'user' }]
```

### Group by numeric property

```typescript
const strings = ['a', 'ab', 'abc', 'xy', 'xyz'];
const grouped = groupBy(strings, s => s.length);

console.log(grouped.get(1));
// ['a']

console.log(grouped.get(2));
// ['ab', 'xy']

console.log(grouped.get(3));
// ['abc', 'xyz']
```

## Performance

- **Time Complexity**: O(n) where n is the number of elements
- **Space Complexity**: O(n) for the result map and arrays

## Edge Cases

- **Empty iterable**: Returns an empty map
- **Single element**: Returns a map with one entry
- **All elements map to same key**: Returns a map with one entry containing all elements
- **Each element maps to unique key**: Returns a map with n entries, each containing one element

## See Also

- [lastBy](#lastby) - Similar, but keeps only the last element for each key
