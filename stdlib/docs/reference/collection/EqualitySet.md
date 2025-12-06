# EqualitySet

A hash set with custom equality and hash code functions, allowing value-based equality instead of identity-based equality.

Translated from [Dart's EqualitySet](https://pub.dev/documentation/collection/latest/collection/EqualitySet-class.html)

## Overview

`EqualitySet<E>` is a set that uses custom `equals()` and `hash()` functions instead of the default `===` equality. This enables creating sets of objects where equality is determined by comparing field values rather than object identity.

**Key Features:**
- Custom equality comparison via `Equality<E>` interface
- O(1) average case add, remove, and contains operations
- Handles hash collisions efficiently with bucketing
- Full iterator support for `for...of` loops
- Type-safe generic implementation

## Import

```typescript
import { EqualitySet, Equality } from '@goodscript/collection';
```

## Constructor

### `new EqualitySet<E>(equality?: Equality<E>)`

Creates an empty set with optional custom equality.

**Parameters:**
- `equality` - Optional equality implementation. If not provided, uses default `===` equality.

**Example:**
```typescript
// Default equality (===)
const numbers = new EqualitySet<number>();

// Custom equality for objects
class PointEquality implements Equality<Point> {
  equals(a: Point, b: Point): boolean {
    return a.x === b.x && a.y === b.y;
  }
  hash(p: Point): number {
    return p.x * 31 + p.y;
  }
}

const points = new EqualitySet<Point>(new PointEquality());
```

## Static Methods

### `EqualitySet.from<E>(elements: E[], equality?: Equality<E>): EqualitySet<E>`

Creates a set from an array of elements.

**Parameters:**
- `elements` - Array of elements to add
- `equality` - Optional equality implementation

**Returns:** New set containing unique elements

**Example:**
```typescript
const numbers = EqualitySet.from([1, 2, 3, 2, 1]);
// Set contains: {1, 2, 3}

const points = EqualitySet.from(
  [new Point(1, 2), new Point(3, 4), new Point(1, 2)],
  new PointEquality()
);
// Set contains 2 unique points
```

## Properties

### `getLength(): number`

Returns the number of elements in the set.

**Example:**
```typescript
const set = EqualitySet.from([1, 2, 3]);
set.getLength(); // 3
```

### `isEmpty(): boolean`

Returns true if the set has no elements.

**Example:**
```typescript
const set = new EqualitySet<number>();
set.isEmpty(); // true
set.add(1);
set.isEmpty(); // false
```

### `isNotEmpty(): boolean`

Returns true if the set has at least one element.

## Methods

### `add(element: E): boolean`

Adds an element to the set.

**Parameters:**
- `element` - Element to add

**Returns:** `true` if added, `false` if already present

**Example:**
```typescript
const set = new EqualitySet<number>();
set.add(1); // true (added)
set.add(2); // true (added)
set.add(1); // false (already present)
```

### `addAll(elements: E[]): void`

Adds all elements from an array to the set.

**Parameters:**
- `elements` - Array of elements to add

**Example:**
```typescript
const set = new EqualitySet<number>();
set.addAll([1, 2, 3, 2, 1]);
set.getLength(); // 3 (duplicates ignored)
```

### `remove(element: E): boolean`

Removes an element from the set.

**Parameters:**
- `element` - Element to remove

**Returns:** `true` if removed, `false` if not present

**Example:**
```typescript
const set = EqualitySet.from([1, 2, 3]);
set.remove(2); // true
set.remove(5); // false
set.getLength(); // 2
```

### `contains(element: E): boolean`

Checks if the set contains an element.

**Parameters:**
- `element` - Element to check

**Returns:** `true` if present, `false` otherwise

**Example:**
```typescript
const set = EqualitySet.from([1, 2, 3]);
set.contains(2); // true
set.contains(5); // false
```

### `lookup(element: E): E | null`

Looks up an element equal to the given element and returns it.

Useful when you need the actual object stored in the set, not just a boolean.

**Parameters:**
- `element` - Element to look up

**Returns:** The stored element if found, otherwise `null`

**Example:**
```typescript
const set = new EqualitySet<Point>(new PointEquality());
const p1 = new Point(1, 2);
set.add(p1);

const p2 = new Point(1, 2); // Equal but different instance
const found = set.lookup(p2);
found === p1; // true (returns the stored instance)
```

### `clear(): void`

Removes all elements from the set.

**Example:**
```typescript
const set = EqualitySet.from([1, 2, 3]);
set.clear();
set.isEmpty(); // true
```

### `toArray(): E[]`

Returns all elements as an array.

**Example:**
```typescript
const set = EqualitySet.from([3, 1, 2]);
const arr = set.toArray();
// Order is not guaranteed: [1, 2, 3] or [3, 1, 2], etc.
```

### `toString(): string`

Returns a string representation of the set.

**Example:**
```typescript
const set = EqualitySet.from([1, 2, 3]);
set.toString(); // "{1, 2, 3}"
```

## Iteration

EqualitySet supports the iterator protocol and can be used with `for...of` loops:

**Example:**
```typescript
const set = EqualitySet.from([1, 2, 3]);

for (const item of set) {
  console.log(item);
}

// Convert to array
const arr = [...set];
```

## Equality Interface

To use custom equality, implement the `Equality<E>` interface:

```typescript
interface Equality<E> {
  equals(a: E, b: E): boolean;
  hash(e: E): number;
}
```

**Requirements:**
- `equals(a, b)` must be symmetric: `equals(a, b) === equals(b, a)`
- `equals(a, b)` must be transitive: if `equals(a, b)` and `equals(b, c)`, then `equals(a, c)`
- `hash(e)` must return the same value for equal elements
- `hash(e)` should distribute values evenly to minimize collisions

**Example Implementation:**
```typescript
class CaseInsensitiveStringEquality implements Equality<string> {
  equals(a: string, b: string): boolean {
    return a.toLowerCase() === b.toLowerCase();
  }

  hash(s: string): number {
    const lower = s.toLowerCase();
    let hash = 0;
    for (let i = 0; i < lower.length; i++) {
      hash = (hash * 31 + lower.charCodeAt(i)) | 0;
    }
    return hash;
  }
}

const set = new EqualitySet<string>(new CaseInsensitiveStringEquality());
set.add("Hello");
set.contains("HELLO"); // true
set.contains("hello"); // true
```

## Performance Characteristics

- **add**: O(1) average, O(n) worst case (hash collision)
- **remove**: O(1) average, O(n) worst case
- **contains**: O(1) average, O(n) worst case
- **lookup**: O(1) average, O(n) worst case
- **clear**: O(n)
- **toArray**: O(n)
- **iteration**: O(n)

Space complexity: O(n) where n is the number of elements.

Hash collisions are handled with buckets (separate chaining), so worst-case occurs when all elements hash to the same bucket.

## Use Cases

**1. Deduplication with custom equality:**
```typescript
const users = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
  { id: 1, name: "Alice" }, // Duplicate by ID
];

class UserEquality implements Equality<User> {
  equals(a: User, b: User): boolean {
    return a.id === b.id;
  }
  hash(u: User): number {
    return u.id;
  }
}

const uniqueUsers = EqualitySet.from(users, new UserEquality());
// Only 2 users
```

**2. Case-insensitive string sets:**
```typescript
const tags = new EqualitySet<string>(new CaseInsensitiveStringEquality());
tags.add("JavaScript");
tags.add("javascript"); // Not added (duplicate)
tags.add("JAVASCRIPT"); // Not added (duplicate)
tags.getLength(); // 1
```

**3. Geometric data structures:**
```typescript
const uniquePoints = new EqualitySet<Point>(new PointEquality());
uniquePoints.add(new Point(1, 2));
uniquePoints.add(new Point(1, 2)); // Not added
uniquePoints.add(new Point(3, 4)); // Added
uniquePoints.getLength(); // 2
```

**4. Finding duplicates:**
```typescript
function findDuplicates<T>(items: T[], equality: Equality<T>): T[] {
  const seen = new EqualitySet<T>(equality);
  const duplicates = new EqualitySet<T>(equality);
  
  for (const item of items) {
    if (seen.contains(item)) {
      duplicates.add(item);
    } else {
      seen.add(item);
    }
  }
  
  return duplicates.toArray();
}
```

## Differences from Dart

1. **Getters → Methods**: Property access converted to method calls
   - `.length` → `.getLength()`
   - `.isEmpty` → `.isEmpty()`
   - `.isNotEmpty` → `.isNotEmpty()`

2. **Iterator Support**: Full `Symbol.iterator` protocol support
   - Can use `for...of` loops directly
   - Compatible with spread operator and destructuring

3. **Null handling**: Returns `null` instead of throwing for `lookup()` when element not found

4. **No retention methods**: Dart's `retainAll()`, `removeAll()`, `retainWhere()` not implemented (use manual iteration)

## See Also

- [EqualityMap](./EqualityMap.md) - Map with custom equality for keys
- [Dart EqualitySet documentation](https://pub.dev/documentation/collection/latest/collection/EqualitySet-class.html)
