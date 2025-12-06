# minBy / maxBy

**Package**: `@goodscript/collection`  
**Source**: Translated from [Dart's collection/functions.dart](https://github.com/dart-lang/collection/blob/master/lib/src/functions.dart)

## Overview

`minBy` and `maxBy` are utility functions that find the minimum or maximum element in an iterable based on a projection function. Instead of comparing elements directly, they compare the values returned by a projection function (`orderBy`), making it easy to find elements with the smallest or largest properties.

## Functions

### minBy(values, orderBy, compare?)

```typescript
function minBy<S, T>(
  values: Iterable<S>,
  orderBy: (element: S) => T,
  compare?: (a: T, b: T) => number
): S | null
```

Returns the element of `values` for which `orderBy` returns the minimum value.

**Parameters:**
- `values: Iterable<S>` - The iterable to search
- `orderBy: (element: S) => T` - Function that returns the value to compare
- `compare?: (a: T, b: T) => number` - Optional comparison function (returns negative if a < b, 0 if equal, positive if a > b)

**Returns:** `S | null` - The element with minimum `orderBy` value, or null if empty

**Time Complexity:** O(n)

**Example:**
```typescript
const people = [
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 },
  { name: 'Charlie', age: 35 }
];

const youngest = minBy(people, p => p.age);
// { name: 'Bob', age: 25 }

const words = ['apple', 'pie', 'banana'];
const shortest = minBy(words, w => w.length);
// 'pie'
```

### maxBy(values, orderBy, compare?)

```typescript
function maxBy<S, T>(
  values: Iterable<S>,
  orderBy: (element: S) => T,
  compare?: (a: T, b: T) => number
): S | null
```

Returns the element of `values` for which `orderBy` returns the maximum value.

**Parameters:**
- `values: Iterable<S>` - The iterable to search
- `orderBy: (element: S) => T` - Function that returns the value to compare
- `compare?: (a: T, b: T) => number` - Optional comparison function (returns negative if a < b, 0 if equal, positive if a > b)

**Returns:** `S | null` - The element with maximum `orderBy` value, or null if empty

**Time Complexity:** O(n)

**Example:**
```typescript
const people = [
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 },
  { name: 'Charlie', age: 35 }
];

const oldest = maxBy(people, p => p.age);
// { name: 'Charlie', age: 35 }

const words = ['apple', 'pie', 'banana'];
const longest = maxBy(words, w => w.length);
// 'banana'
```

## Default Comparison

When `compare` is omitted, values are compared using the standard `<` and `>` operators:

```typescript
function defaultCompare<T>(a: T, b: T): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
```

This works for:
- Numbers: `3 < 5`
- Strings: `'a' < 'b'` (lexicographic)
- Dates: `date1 < date2`
- Any type with `<` and `>` operators

## Custom Comparators

Provide a custom `compare` function for special sorting:

```typescript
// Reverse comparison (find max with min function)
const reverseCompare = (a: number, b: number) => b - a;
const max = minBy(numbers, x => x, reverseCompare);

// Case-insensitive string comparison
const caseInsensitive = (a: string, b: string) => {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  if (aLower < bLower) return -1;
  if (aLower > bLower) return 1;
  return 0;
};
const result = minBy(items, x => x.name, caseInsensitive);
```

## Use Cases

### Find Cheapest Product

```typescript
interface Product {
  name: string;
  price: number;
  rating: number;
}

const products: Product[] = [
  { name: 'Widget A', price: 29.99, rating: 4.5 },
  { name: 'Widget B', price: 19.99, rating: 4.0 },
  { name: 'Widget C', price: 39.99, rating: 5.0 }
];

const cheapest = minBy(products, p => p.price);
// { name: 'Widget B', price: 19.99, rating: 4.0 }

const highest rated = maxBy(products, p => p.rating);
// { name: 'Widget C', price: 39.99, rating: 5.0 }
```

### Find Nearest Point

```typescript
interface Point {
  x: number;
  y: number;
}

function distance(p: Point): number {
  return Math.sqrt(p.x * p.x + p.y * p.y);
}

const points: Point[] = [
  { x: 3, y: 4 },  // distance = 5
  { x: 1, y: 1 },  // distance = 1.41
  { x: 5, y: 0 }   // distance = 5
];

const nearest = minBy(points, distance);
// { x: 1, y: 1 }

const farthest = maxBy(points, distance);
// { x: 3, y: 4 } (or { x: 5, y: 0 }, first occurrence wins)
```

### Find Earliest/Latest Date

```typescript
interface Event {
  name: string;
  date: Date;
}

const events: Event[] = [
  { name: 'Meeting', date: new Date('2024-03-15') },
  { name: 'Launch', date: new Date('2024-06-01') },
  { name: 'Review', date: new Date('2024-01-10') }
];

const earliest = minBy(events, e => e.date);
// { name: 'Review', date: ... }

const latest = maxBy(events, e => e.date);
// { name: 'Launch', date: ... }
```

### Find Best Value (Complex Scoring)

```typescript
interface Candidate {
  name: string;
  experience: number;
  education: number;
  skills: number;
}

function score(c: Candidate): number {
  return c.experience * 0.5 + c.education * 0.3 + c.skills * 0.2;
}

const candidates: Candidate[] = [
  { name: 'Alice', experience: 8, education: 7, skills: 9 },
  { name: 'Bob', experience: 6, education: 9, skills: 7 },
  { name: 'Charlie', experience: 9, education: 6, skills: 8 }
];

const best = maxBy(candidates, score);
// { name: 'Alice', ... } (highest composite score)
```

## Edge Cases

### Empty Iterable

Both functions return `null` for empty iterables:

```typescript
const result = minBy([], x => x);
// null
```

### Ties

When multiple elements have the same min/max value, the **first occurrence** is returned:

```typescript
const numbers = [3, 1, 4, 1, 5];
const min = minBy(numbers, x => x);
// 1 (first occurrence at index 1)
```

### All Elements Equal

Returns the first element:

```typescript
const items = [
  { name: 'a', value: 5 },
  { name: 'b', value: 5 },
  { name: 'c', value: 5 }
];
const result = minBy(items, x => x.value);
// { name: 'a', value: 5 }
```

### Single Element

Returns that element:

```typescript
const result = minBy([42], x => x);
// 42
```

## Performance Characteristics

| Operation | Time Complexity | Space Complexity |
|-----------|----------------|------------------|
| minBy | O(n) | O(1) |
| maxBy | O(n) | O(1) |

Where n is the number of elements in the iterable.

Both functions make a single pass through the iterable and use constant extra space.

## Comparison with Built-in Array Methods

### vs Array.reduce()

```typescript
// Using minBy
const youngest = minBy(people, p => p.age);

// Using reduce (more verbose)
const youngest = people.reduce((min, p) => 
  !min || p.age < min.age ? p : min
, null);
```

### vs Math.min/max with spread

```typescript
// minBy works with projections
const minAge = minBy(people, p => p.age)?.age;

// Math.min requires extracting values first
const minAge = Math.min(...people.map(p => p.age));
```

## Type Safety

Both functions are fully generic and type-safe:

```typescript
// S = element type, T = comparison value type
minBy<S, T>(
  values: Iterable<S>,
  orderBy: (element: S) => T,
  compare?: (a: T, b: T) => number
): S | null
```

TypeScript will infer types automatically:

```typescript
const people = [{ name: 'Alice', age: 30 }];
const result = minBy(people, p => p.age);
// result: { name: string; age: number } | null
```

## Differences from Source

1. **No Comparable constraint**: Dart requires types to implement `Comparable`. TypeScript uses `<` and `>` operators directly
2. **Explicit null checks**: GoodScript requires explicit null/undefined checks instead of Dart's null-safety operators
3. **Type inference**: TypeScript's type inference is more flexible than Dart's

## See Also

- [IterableExtensions](./IterableExtensions.md) - Includes `min()`, `max()`, `minOrNull()`, `maxOrNull()` for direct value comparison
- [Algorithms](./Algorithms.md) - Binary search and sorting utilities
- [Comparators](./Comparators.md) - String comparison functions
- [groupBy](./groupBy.md) - Group elements by key function
