# IterableExtensions

Utility functions for working with iterables, providing filtering, mapping, searching, grouping, slicing, and statistical operations.

Translated from [Dart's collection/iterable_extensions.dart](https://github.com/dart-lang/collection/blob/master/lib/src/iterable_extensions.dart)

## Overview

IterableExtensions provides 29 utility functions for common iterable operations:
- **Filtering**: Filter by predicate, with or without index
- **Mapping**: Transform elements with index awareness
- **Element Finding**: Find first, last, or specific element with null-safety
- **Grouping**: Group elements into maps by key function
- **Slicing**: Split iterables into chunks
- **Flattening**: Combine nested iterables
- **Statistics**: Min, max, sum, average, count

All functions are pure and don't modify the input iterable.

## Import

```typescript
import {
  whereNot,
  mapIndexed,
  whereIndexed,
  whereNotIndexed,
  forEachIndexed,
  firstWhereOrNull,
  firstWhereIndexedOrNull,
  firstOrNull,
  lastWhereOrNull,
  lastWhereIndexedOrNull,
  lastOrNull,
  elementAtOrNull,
  none,
  groupListsBy,
  groupSetsBy,
  slices,
  flattened,
  minOrNull,
  min,
  maxOrNull,
  max,
  sum,
  average,
  count
} from '@goodscript/collection';
```

## Filtering Functions

### whereNot

Returns elements that do not satisfy the test predicate.

```typescript
function whereNot<T>(
  iterable: Iterable<T>,
  test: (element: T) => boolean
): T[]
```

**Example:**
```typescript
const numbers = [1, 2, 3, 4, 5];
const notEven = whereNot(numbers, n => n % 2 === 0);
// Result: [1, 3, 5]
```

### whereIndexed

Returns elements whose value and index satisfy the test.

```typescript
function whereIndexed<T>(
  iterable: Iterable<T>,
  test: (index: number, element: T) => boolean
): T[]
```

**Example:**
```typescript
const items = ['a', 'b', 'c', 'd'];
const evenIndices = whereIndexed(items, (i, x) => i % 2 === 0);
// Result: ['a', 'c']
```

### whereNotIndexed

Returns elements whose value and index do not satisfy the test.

```typescript
function whereNotIndexed<T>(
  iterable: Iterable<T>,
  test: (index: number, element: T) => boolean
): T[]
```

**Example:**
```typescript
const items = ['a', 'b', 'c', 'd'];
const oddIndices = whereNotIndexed(items, (i, x) => i % 2 === 0);
// Result: ['b', 'd']
```

## Mapping Functions

### mapIndexed

Maps each element and its index to a new value.

```typescript
function mapIndexed<T, R>(
  iterable: Iterable<T>,
  convert: (index: number, element: T) => R
): R[]
```

**Example:**
```typescript
const items = ['a', 'b', 'c'];
const indexed = mapIndexed(items, (i, x) => `${i}:${x}`);
// Result: ['0:a', '1:b', '2:c']
```

### forEachIndexed

Calls action for each element along with its index.

```typescript
function forEachIndexed<T>(
  iterable: Iterable<T>,
  action: (index: number, element: T) => void
): void
```

**Example:**
```typescript
const items = ['a', 'b', 'c'];
forEachIndexed(items, (i, x) => {
  console.log(`${i}: ${x}`);
});
// Prints: 0: a, 1: b, 2: c
```

## Element Finding Functions

### firstWhereOrNull

Returns the first element satisfying test, or null if none found.

```typescript
function firstWhereOrNull<T>(
  iterable: Iterable<T>,
  test: (element: T) => boolean
): T | null
```

**Example:**
```typescript
const numbers = [1, 2, 3, 4, 5];
const firstEven = firstWhereOrNull(numbers, n => n % 2 === 0);
// Result: 2

const firstBig = firstWhereOrNull(numbers, n => n > 10);
// Result: null
```

### firstWhereIndexedOrNull

Returns the first element whose value and index satisfy test, or null.

```typescript
function firstWhereIndexedOrNull<T>(
  iterable: Iterable<T>,
  test: (index: number, element: T) => boolean
): T | null
```

**Example:**
```typescript
const items = ['a', 'b', 'c', 'd'];
const found = firstWhereIndexedOrNull(items, (i, x) => i > 1 && x === 'c');
// Result: 'c'
```

### firstOrNull

Returns the first element, or null if the iterable is empty.

```typescript
function firstOrNull<T>(iterable: Iterable<T>): T | null
```

**Example:**
```typescript
firstOrNull([1, 2, 3]) // 1
firstOrNull([])        // null
```

### lastWhereOrNull

Returns the last element satisfying test, or null if none found.

```typescript
function lastWhereOrNull<T>(
  iterable: Iterable<T>,
  test: (element: T) => boolean
): T | null
```

**Example:**
```typescript
const numbers = [1, 2, 3, 4, 5];
const lastEven = lastWhereOrNull(numbers, n => n % 2 === 0);
// Result: 4
```

### lastWhereIndexedOrNull

Returns the last element whose value and index satisfy test, or null.

```typescript
function lastWhereIndexedOrNull<T>(
  iterable: Iterable<T>,
  test: (index: number, element: T) => boolean
): T | null
```

**Example:**
```typescript
const items = ['a', 'b', 'c', 'd'];
const found = lastWhereIndexedOrNull(items, (i, x) => i % 2 === 0);
// Result: 'c' (at index 2)
```

### lastOrNull

Returns the last element, or null if the iterable is empty.

```typescript
function lastOrNull<T>(iterable: Iterable<T>): T | null
```

**Example:**
```typescript
lastOrNull([1, 2, 3]) // 3
lastOrNull([])        // null
```

### elementAtOrNull

Returns the element at the given index, or null if index is out of bounds.

```typescript
function elementAtOrNull<T>(
  iterable: Iterable<T>,
  index: number
): T | null
```

**Example:**
```typescript
const items = ['a', 'b', 'c'];
elementAtOrNull(items, 1)  // 'b'
elementAtOrNull(items, 10) // null
```

### none

Returns true if no element satisfies the test.

```typescript
function none<T>(
  iterable: Iterable<T>,
  test: (element: T) => boolean
): boolean
```

**Example:**
```typescript
const numbers = [1, 3, 5];
none(numbers, n => n % 2 === 0) // true
none(numbers, n => n > 0)       // false
```

## Grouping Functions

### groupListsBy

Groups elements into lists by a key function.

```typescript
function groupListsBy<K, T>(
  iterable: Iterable<T>,
  keyOf: (element: T) => K
): Map<K, T[]>
```

**Example:**
```typescript
const words = ['apple', 'apricot', 'banana', 'berry'];
const byFirstLetter = groupListsBy(words, w => w[0]);
// Result: Map {
//   'a' => ['apple', 'apricot'],
//   'b' => ['banana', 'berry']
// }
```

### groupSetsBy

Groups elements into sets by a key function.

```typescript
function groupSetsBy<K, T>(
  iterable: Iterable<T>,
  keyOf: (element: T) => K
): Map<K, Set<T>>
```

**Example:**
```typescript
const numbers = [1, 2, 3, 4, 5, 6];
const byParity = groupSetsBy(numbers, n => n % 2 === 0 ? 'even' : 'odd');
// Result: Map {
//   'odd' => Set {1, 3, 5},
//   'even' => Set {2, 4, 6}
// }
```

## Slicing and Flattening

### slices

Returns contiguous slices of the iterable with the given length.

```typescript
function slices<T>(
  iterable: Iterable<T>,
  length: number
): T[][]
```

Each slice is `length` elements long, except the last one which may be shorter.

**Example:**
```typescript
const numbers = [1, 2, 3, 4, 5, 6, 7];
const chunks = slices(numbers, 3);
// Result: [[1, 2, 3], [4, 5, 6], [7]]
```

### flattened

Returns the sequential elements of each nested iterable.

```typescript
function flattened<T>(iterable: Iterable<Iterable<T>>): T[]
```

**Example:**
```typescript
const nested = [[1, 2], [3, 4], [5]];
const flat = flattened(nested);
// Result: [1, 2, 3, 4, 5]
```

## Statistical Functions

### minOrNull

Returns the minimum element, or null if the iterable is empty.

```typescript
function minOrNull(iterable: Iterable<number>): number | null
```

**Example:**
```typescript
minOrNull([3, 1, 4, 1, 5]) // 1
minOrNull([])              // null
```

### min

Returns the minimum element. Throws if the iterable is empty.

```typescript
function min(iterable: Iterable<number>): number
```

**Example:**
```typescript
min([3, 1, 4, 1, 5]) // 1
min([])              // throws Error
```

### maxOrNull

Returns the maximum element, or null if the iterable is empty.

```typescript
function maxOrNull(iterable: Iterable<number>): number | null
```

**Example:**
```typescript
maxOrNull([3, 1, 4, 1, 5]) // 5
maxOrNull([])              // null
```

### max

Returns the maximum element. Throws if the iterable is empty.

```typescript
function max(iterable: Iterable<number>): number
```

**Example:**
```typescript
max([3, 1, 4, 1, 5]) // 5
max([])              // throws Error
```

### sum

Returns the sum of all elements. Returns 0 for empty iterables.

```typescript
function sum(iterable: Iterable<number>): number
```

**Example:**
```typescript
sum([1, 2, 3, 4, 5]) // 15
sum([])              // 0
```

### average

Returns the arithmetic mean of the elements. Throws if the iterable is empty.

```typescript
function average(iterable: Iterable<number>): number
```

Uses numerically stable algorithm (Welford's method) to compute mean.

**Example:**
```typescript
average([1, 2, 3, 4, 5]) // 3
average([])              // throws Error
```

### count

Counts elements satisfying the predicate.

```typescript
function count<T>(
  iterable: Iterable<T>,
  test: (element: T) => boolean
): number
```

**Example:**
```typescript
const numbers = [1, 2, 3, 4, 5, 6];
count(numbers, n => n % 2 === 0) // 3 (even numbers)
count(numbers, n => n > 10)      // 0
```

## Performance Characteristics

All functions have O(n) time complexity where n is the length of the iterable:
- **Filtering functions**: Single pass with early termination where applicable
- **Mapping functions**: Single pass
- **Element finding**: Early termination on first/last match
- **Grouping functions**: Single pass with Map/Set overhead
- **Statistical functions**: Single pass (average uses Welford's algorithm for numerical stability)

Space complexity:
- Most functions: O(k) where k is output size
- `forEachIndexed`, `none`: O(1) (no array allocation)
- Grouping functions: O(n) in worst case (all unique keys)

## Use Cases

**Data Processing:**
```typescript
// Process CSV with row numbers
const rows = parseCSV(data);
const indexed = mapIndexed(rows, (i, row) => ({ rowNum: i + 1, ...row }));
```

**Filtering with Context:**
```typescript
// Remove consecutive duplicates
const items = [1, 1, 2, 3, 3, 3, 4];
const unique = whereIndexed(items, (i, x) => 
  i === 0 || items[i - 1] !== x
);
// Result: [1, 2, 3, 4]
```

**Data Analysis:**
```typescript
// Analyze test scores
const scores = [85, 92, 78, 95, 88];
const stats = {
  min: min(scores),
  max: max(scores),
  avg: average(scores),
  passing: count(scores, s => s >= 80)
};
// { min: 78, max: 95, avg: 87.6, passing: 4 }
```

**Batch Processing:**
```typescript
// Process data in batches
const items = Array.from({ length: 100 }, (_, i) => i);
const batches = slices(items, 10);
// Process each batch of 10 items
```

**Categorization:**
```typescript
// Group users by role
const users = [
  { name: 'Alice', role: 'admin' },
  { name: 'Bob', role: 'user' },
  { name: 'Charlie', role: 'admin' }
];
const byRole = groupListsBy(users, u => u.role);
// Map { 'admin' => [...], 'user' => [...] }
```

## Differences from Dart

1. **Return types**: Functions return arrays instead of lazy iterables (GoodScript doesn't support `sync*` generators)
2. **Null vs undefined**: Uses `null` for "not found" (Dart uses `null`)
3. **Error messages**: Simplified error messages
4. **No NaN handling**: Statistical functions don't have special NaN handling (not applicable in typical use)

## Implementation Notes

- All functions create new arrays rather than modifying inputs
- Index-based functions use 0-based indexing
- Statistical functions use numerically stable algorithms where applicable
- Grouping functions create new Maps with appropriate value collections
- All functions are type-safe with full generic support
