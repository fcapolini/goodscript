# Range

An iterable that generates numeric sequences with start, end, and optional step values.

Translated from Dart's Range utility

## Overview

`Range` provides lazy iteration over numeric sequences. Supports both ascending and descending ranges with custom step sizes.

## Import

```typescript
import { Range } from '@goodscript/collection';
```

## Constructor

```typescript
new Range(start: number, end: number, step?: number)
```

**Parameters:**
- `start` - First value (inclusive)
- `end` - Last value (exclusive)
- `step` - Increment value (default: 1 for ascending, -1 for descending)

## Methods

- `getStart(): number` - Starting value
- `getEnd(): number` - Ending value (exclusive)
- `getStep(): number` - Step increment
- `toArray(): number[]` - Convert to array

## Iteration

Range implements the iterator protocol:

```typescript
// Basic range
for (const n of new Range(0, 5)) {
  console.log(n); // 0, 1, 2, 3, 4
}

// With step
for (const n of new Range(0, 10, 2)) {
  console.log(n); // 0, 2, 4, 6, 8
}

// Descending
for (const n of new Range(10, 0, -1)) {
  console.log(n); // 10, 9, 8, ..., 1
}

// Convert to array
const arr = [...new Range(1, 6)]; // [1, 2, 3, 4, 5]
```

## Examples

**Generate indices:**
```typescript
const items = ['a', 'b', 'c'];
for (const i of new Range(0, items.length)) {
  console.log(i, items[i]);
}
```

**Even numbers:**
```typescript
const evens = new Range(0, 20, 2).toArray();
// [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]
```

**Countdown:**
```typescript
for (const n of new Range(10, 0, -1)) {
  console.log(`T-minus ${n}`);
}
```

## Performance

- **Iteration**: O(n) where n = (end - start) / step
- **toArray()**: O(n)
- **Memory**: O(1) for iteration (lazy), O(n) for toArray()

## Notes

- End value is exclusive (not included in range)
- Step must not be zero
- For descending ranges, step should be negative
- Auto-detects direction if step not provided
