# Algorithms

Sorting and searching utilities for arrays.

## Import

```typescript
import {
  binarySearch,
  binarySearchBy,
  lowerBound,
  lowerBoundBy,
  shuffle,
  reverse
} from '@goodscript/collection';
```

## Functions

### `binarySearch<T>(list: T[], value: T, compare?: (a: T, b: T) => number): number`

Binary search in sorted array. Returns index if found, or `-(insertionPoint + 1)` if not found.

**Example:**
```typescript
const arr = [1, 3, 5, 7, 9];
binarySearch(arr, 5); // 2 (found at index 2)
binarySearch(arr, 4); // -3 (should insert at index 2, so -(2+1))
```

### `binarySearchBy<T, K>(list: T[], key: K, keyOf: (element: T) => K, compare?: (a: K, b: K) => number): number`

Binary search by extracted key.

**Example:**
```typescript
const users = [{ id: 1 }, { id: 3 }, { id: 5 }];
binarySearchBy(users, 3, u => u.id); // 1
```

### `lowerBound<T>(list: T[], value: T, compare?: (a: T, b: T) => number): number`

Find insertion point to maintain sort order.

**Example:**
```typescript
const arr = [1, 3, 3, 5];
lowerBound(arr, 3); // 1 (first position of 3)
lowerBound(arr, 4); // 3 (position to insert 4)
```

### `lowerBoundBy<T, K>(list: T[], key: K, keyOf: (element: T) => K, compare?: (a: K, b: K) => number): number`

Lower bound by extracted key.

### `shuffle<T>(list: T[]): void`

Randomly shuffle array in-place (Fisher-Yates algorithm).

**Example:**
```typescript
const arr = [1, 2, 3, 4, 5];
shuffle(arr);
// arr is now randomly ordered
```

### `reverse<T>(list: T[]): void`

Reverse array in-place.

**Example:**
```typescript
const arr = [1, 2, 3];
reverse(arr);
// arr is now [3, 2, 1]
```

## Performance

- Binary search: O(log n)
- Lower bound: O(log n)
- Shuffle: O(n)
- Reverse: O(n)
