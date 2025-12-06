# EqualityMap

A hash map with custom equality and hash code functions for keys, enabling value-based key comparison.

Translated from [Dart's EqualityMap](https://pub.dev/documentation/collection/latest/collection/EqualityMap-class.html)

## Overview

`EqualityMap<K, V>` uses custom `equals()` and `hash()` functions for keys instead of default `===` equality. This allows using objects as keys with field-based equality.

## Import

```typescript
import { EqualityMap, Equality } from '@goodscript/collection';
```

## Constructor

```typescript
new EqualityMap<K, V>(equality?: Equality<K>)
```

Creates an empty map. If `equality` is not provided, uses default `===` equality.

## Static Methods

### `fromEntries<K, V>(entries: Array<[K, V]>, equality?: Equality<K>): EqualityMap<K, V>`

Creates a map from key-value pairs.

**Example:**
```typescript
const map = EqualityMap.fromEntries([
  [new Point(1, 2), "A"],
  [new Point(3, 4), "B"]
], new PointEquality());
```

## Methods

- `get(key: K): V | null` - Get value for key (null if not found)
- `set(key: K, value: V): void` - Set value for key
- `has(key: K): boolean` - Check if key exists
- `delete(key: K): boolean` - Remove key-value pair
- `clear(): void` - Remove all entries
- `getLength(): number` - Number of entries
- `isEmpty(): boolean` - True if empty
- `isNotEmpty(): boolean` - True if not empty
- `getKeys(): K[]` - Array of all keys
- `getValues(): V[]` - Array of all values
- `getEntries(): Array<[K, V]>` - Array of [key, value] pairs
- `forEach(fn: (value: V, key: K) => void): void` - Iterate over entries

## Iteration

Supports `for...of` loops over `[key, value]` pairs:

```typescript
for (const [key, value] of map) {
  console.log(key, value);
}
```

## Example

```typescript
class Point {
  constructor(public x: number, public y: number) {}
}

class PointEquality implements Equality<Point> {
  equals(a: Point, b: Point): boolean {
    return a.x === b.x && a.y === b.y;
  }
  hash(p: Point): number {
    return p.x * 31 + p.y;
  }
}

const map = new EqualityMap<Point, string>(new PointEquality());
map.set(new Point(1, 2), "Origin");
map.set(new Point(3, 4), "Target");

const p = new Point(1, 2); // Different instance, same value
map.get(p); // "Origin" - found by value equality
```

## Performance

All operations are O(1) average case, O(n) worst case (hash collisions).

## See Also

- [EqualitySet](./EqualitySet.md)
- [CanonicalizedMap](./CanonicalizedMap.md)
