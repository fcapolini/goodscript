# Partition

Split collections into multiple sub-groups based on predicates or key functions.

## Import

```typescript
import { 
  partition,
  partitionByIndexed,
  splitAfter,
  splitBefore,
  splitBetween 
} from '@goodscript/collection';
```

## Functions

### `partition<T>(iterable: Iterable<T>, test: (element: T) => boolean): [T[], T[]]`

Splits elements into two arrays based on a test predicate.

**Returns:** `[matching, notMatching]`

**Example:**
```typescript
const [evens, odds] = partition([1, 2, 3, 4, 5], n => n % 2 === 0);
// evens: [2, 4]
// odds: [1, 3, 5]
```

### `partitionByIndexed<T>(iterable: Iterable<T>, test: (index: number, element: T) => boolean): [T[], T[]]`

Partition with index awareness.

**Example:**
```typescript
const items = ['a', 'b', 'c', 'd'];
const [evenIdx, oddIdx] = partitionByIndexed(items, (i, _) => i % 2 === 0);
// evenIdx: ['a', 'c']
// oddIdx: ['b', 'd']
```

### `splitAfter<T>(iterable: Iterable<T>, test: (element: T) => boolean): T[][]`

Split into chunks after elements that satisfy test.

**Example:**
```typescript
const parts = splitAfter([1, 0, 2, 1, 5, 7], n => n === 0 || n === 5);
// [[1, 0], [2, 1, 5], [7]]
```

### `splitBefore<T>(iterable: Iterable<T>, test: (element: T) => boolean): T[][]`

Split into chunks before elements that satisfy test.

**Example:**
```typescript
const parts = splitBefore([1, 0, 2, 1, 5, 7], n => n > 3);
// [[1, 0, 2, 1], [5], [7]]
```

### `splitBetween<T>(iterable: Iterable<T>, test: (first: T, second: T) => boolean): T[][]`

Split between adjacent elements where test returns true.

**Example:**
```typescript
const nums = [1, 2, 5, 6, 7, 10];
const parts = splitBetween(nums, (a, b) => b - a > 1);
// [[1, 2], [5, 6, 7], [10]]
```

## Use Cases

**Separate valid/invalid data:**
```typescript
const [valid, invalid] = partition(data, validate);
```

**Group consecutive elements:**
```typescript
const runs = splitBetween(items, (a, b) => a !== b);
```

**Split on separators:**
```typescript
const sections = splitAfter(lines, line => line === '---');
```
