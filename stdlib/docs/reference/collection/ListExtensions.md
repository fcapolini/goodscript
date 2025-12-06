# ListExtensions

List utility functions providing efficient algorithms for searching, sorting, and manipulating arrays.

Translated from [Dart's collection/list_extensions.dart](https://github.com/dart-lang/collection/blob/master/lib/src/list_extensions.dart)

## Overview

ListExtensions provides a collection of standalone utility functions for common list operations:
- **Binary search** for O(log n) lookups in sorted lists
- **Range operations** for sorting, shuffling, and reversing subarrays
- **List slicing** for creating read-only views of subarrays
- **Utility functions** like swap, equals, and safe element access

All functions are efficient, type-safe, and follow functional programming principles where possible.

## Import

```typescript
import {
  binarySearch,
  binarySearchBy,
  lowerBound,
  lowerBoundBy,
  sortRange,
  sortByCompare,
  shuffleRange,
  reverseRange,
  swap,
  equals,
  elementAtOrNull,
  slice,
  type Equality,
} from '@goodscript/collection';
```

## Functions

### Binary Search

#### `binarySearch<E>(list: E[], element: E, compare: (a: E, b: E) => number): number`

Finds the index of element in a sorted list using binary search.

**Parameters:**
- `list` - The sorted array to search
- `element` - The element to find
- `compare` - Comparison function (returns negative if a < b, zero if equal, positive if a > b)

**Returns:** Index of element, or -1 if not found

**Time Complexity:** O(log n)

**Example:**
```typescript
const numbers = [1, 3, 5, 7, 9];
binarySearch(numbers, 5, (a, b) => a - b); // Returns 2
binarySearch(numbers, 4, (a, b) => a - b); // Returns -1 (not found)
```

#### `binarySearchBy<E, K>(list: E[], keyOf: (e: E) => K, compare: (a: K, b: K) => number, element: E, start?: number, end?: number): number`

Binary search using a key extraction function.

**Example:**
```typescript
const users = [
  { id: 1, name: 'Alice' },
  { id: 3, name: 'Bob' },
  { id: 5, name: 'Charlie' }
];
binarySearchBy(users, u => u.id, (a, b) => a - b, { id: 3, name: 'Bob' }); // Returns 1
```

### Insertion Point

#### `lowerBound<E>(list: E[], element: E, compare: (a: E, b: E) => number): number`

Returns the index where element should be inserted to keep the list sorted.

**Returns:** 
- Index of element if it exists in the list
- Index where element should be inserted otherwise
- May return `list.length` if all elements are less than the search element

**Example:**
```typescript
const numbers = [1, 3, 5, 7, 9];
lowerBound(numbers, 5, (a, b) => a - b); // Returns 2 (found)
lowerBound(numbers, 4, (a, b) => a - b); // Returns 2 (insertion point)
lowerBound(numbers, 10, (a, b) => a - b); // Returns 5 (end of list)
```

#### `lowerBoundBy<E, K>(list: E[], keyOf: (e: E) => K, compare: (a: K, b: K) => number, element: E, start?: number, end?: number): number`

Lower bound search using a key extraction function.

### Range Sorting

#### `sortRange<E>(list: E[], start: number, end: number, compare: (a: E, b: E) => number): void`

Sorts a subrange of the list in-place.

**Parameters:**
- `list` - The array to modify
- `start` - Start index (inclusive)
- `end` - End index (exclusive)
- `compare` - Comparison function

**Example:**
```typescript
const numbers = [5, 3, 8, 1, 9, 2];
sortRange(numbers, 1, 4, (a, b) => a - b);
// numbers is now [5, 1, 3, 8, 9, 2]
//                     ↑-----↑ sorted range
```

#### `sortByCompare<E, K>(list: E[], keyOf: (e: E) => K, compare: (a: K, b: K) => number, start?: number, end?: number): void`

Sorts elements by comparing their extracted key.

**Example:**
```typescript
const users = [
  { id: 3, name: 'C' },
  { id: 1, name: 'A' },
  { id: 2, name: 'B' }
];
sortByCompare(users, u => u.id, (a, b) => a - b);
// users is now sorted by id: [{id:1}, {id:2}, {id:3}]
```

### Range Manipulation

#### `shuffleRange<E>(list: E[], start: number, end: number): void`

Randomly shuffles a subrange of the list in-place using Fisher-Yates algorithm.

**Example:**
```typescript
const numbers = [1, 2, 3, 4, 5, 6];
shuffleRange(numbers, 1, 5);
// Elements at indices 1-4 are shuffled
// Elements at indices 0 and 5 are unchanged
```

#### `reverseRange<E>(list: E[], start: number, end: number): void`

Reverses elements in a subrange in-place.

**Example:**
```typescript
const numbers = [1, 2, 3, 4, 5, 6];
reverseRange(numbers, 1, 5);
// numbers is now [1, 5, 4, 3, 2, 6]
//                   ↑---------↑ reversed range
```

#### `swap<E>(list: E[], index1: number, index2: number): void`

Swaps two elements in the list.

**Example:**
```typescript
const numbers = [1, 2, 3, 4, 5];
swap(numbers, 1, 3);
// numbers is now [1, 4, 3, 2, 5]
```

### Comparison

#### `equals<E>(list1: E[], list2: E[], equality?: Equality<E>): boolean`

Checks if two lists have the same elements.

**Parameters:**
- `list1` - First list
- `list2` - Second list  
- `equality` - Optional custom equality checker (defaults to `===`)

**Returns:** `true` if lists have same length and corresponding elements are equal

**Example:**
```typescript
const a = [1, 2, 3];
const b = [1, 2, 3];
equals(a, b); // true

// Custom equality
const list1 = ['Hello', 'WORLD'];
const list2 = ['HELLO', 'world'];
const caseInsensitive: Equality<string> = {
  equals: (a, b) => a.toLowerCase() === b.toLowerCase(),
  hash: (s) => /* hash implementation */
};
equals(list1, list2, caseInsensitive); // true
```

### Safe Access

#### `elementAtOrNull<E>(list: E[], index: number): E | null`

Returns the element at index, or null if index is out of bounds.

**Example:**
```typescript
const numbers = [1, 2, 3];
elementAtOrNull(numbers, 1); // 2
elementAtOrNull(numbers, 5); // null
elementAtOrNull(numbers, -1); // null
```

### List Slicing

#### `slice<E>(list: E[], start: number, end?: number): ListSlice<E>`

Creates a read-only view of a portion of the list.

**Parameters:**
- `list` - The source list
- `start` - Start index (inclusive)
- `end` - End index (exclusive), defaults to `list.length`

**Returns:** A `ListSlice` view backed by the original list

**Key Characteristics:**
- Changes to the source list are visible through the slice
- The slice is read-only (no add/remove operations)
- Fixed length (determined at creation time)
- Throws if source list changes length
- Supports nested slicing

**Example:**
```typescript
const numbers = [1, 2, 3, 4, 5];
const view = slice(numbers, 1, 4);

view.getLength(); // 3
view.get(0); // 2
view.get(1); // 3
view.toArray(); // [2, 3, 4]

// Reflects changes in original
numbers[2] = 99;
view.get(1); // 99

// Nested slicing
const subview = view.slice(1, 3); // View of [99, 4]

// Error detection
numbers.push(6); // Changes length
view.get(0); // Throws: "Concurrent modification"
```

## ListSlice Class

A read-only view of a list range.

### Methods

**`getLength(): number`** - Returns the length of the slice

**`get(index: number): E`** - Returns element at index (throws if out of bounds)

**`isEmpty(): boolean`** - Checks if slice is empty

**`getFirst(): E`** - Returns first element (throws if empty)

**`getLast(): E`** - Returns last element (throws if empty)

**`toArray(): E[]`** - Converts slice to a new array

**`slice(start: number, end?: number): ListSlice<E>`** - Creates a slice of this slice

## Equality Interface

```typescript
interface Equality<E> {
  equals(e1: E, e2: E): boolean;
  hash(e: E): number;
}
```

Used by `equals()` for custom element comparison.

## Performance Characteristics

| Operation | Time Complexity | Space Complexity |
|-----------|----------------|------------------|
| `binarySearch` | O(log n) | O(1) |
| `lowerBound` | O(log n) | O(1) |
| `sortRange` | O(k log k) where k = range size | O(k) |
| `shuffleRange` | O(k) where k = range size | O(1) |
| `reverseRange` | O(k) where k = range size | O(1) |
| `swap` | O(1) | O(1) |
| `equals` | O(n) | O(1) |
| `slice` | O(1) creation, O(1) access | O(1) |

## Use Cases

1. **Efficient Search**: Binary search for O(log n) lookups in sorted data
2. **Partial Sorting**: Sort only a portion of a list without affecting the rest
3. **Random Sampling**: Shuffle a subrange for sampling or randomization
4. **Algorithm Implementation**: Building blocks for more complex algorithms
5. **Memory-Efficient Views**: Work with subarrays without copying data
6. **Custom Comparisons**: Deep equality checks with custom equality logic

## Differences from Dart

1. **No Extension Methods**: Functions are standalone instead of extension methods
2. **Array Notation**: Use standard array access `list[i]` instead of `get(i)`
3. **Type Safety**: TypeScript provides compile-time type checking
4. **slice() Behavior**: Returns custom `ListSlice` class instead of Dart's view
5. **Error Handling**: Uses exceptions for invalid ranges (no `RangeError` class in GoodScript)

## See Also

- [Algorithms](./Algorithms.md) - Sorting and searching utilities
- [IterableExtensions](./IterableExtensions.md) - Iterable utility functions
- [Comparators](./Comparators.md) - Comparison functions for strings
