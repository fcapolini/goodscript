# Zip

Combines two iterables element-wise into pairs.

Translated from Dart's Zip utility

## Overview

`Zip<A, B>` creates an iterable of `[A, B]` pairs by combining elements from two source iterables. Iteration stops when the shorter iterable is exhausted.

## Import

```typescript
import { Zip } from '@goodscript/collection';
```

## Constructor

```typescript
new Zip<A, B>(first: Iterable<A>, second: Iterable<B>)
```

**Parameters:**
- `first` - First iterable
- `second` - Second iterable

## Methods

- `toArray(): Array<[A, B]>` - Convert to array of pairs

## Iteration

Zip implements the iterator protocol:

```typescript
const letters = ['a', 'b', 'c'];
const numbers = [1, 2, 3];
const zip = new Zip(letters, numbers);

for (const [letter, number] of zip) {
  console.log(letter, number);
}
// Output:
// a 1
// b 2
// c 3

// Convert to array
const pairs = [...zip]; // [['a', 1], ['b', 2], ['c', 3]]
```

## Examples

**Pair indices with values:**
```typescript
const items = ['apple', 'banana', 'cherry'];
const indices = new Range(0, items.length);
const zip = new Zip(indices, items);

for (const [i, item] of zip) {
  console.log(`${i}: ${item}`);
}
```

**Combine parallel arrays:**
```typescript
const names = ['Alice', 'Bob', 'Charlie'];
const ages = [25, 30, 35];
const people = new Zip(names, ages).toArray();
// [['Alice', 25], ['Bob', 30], ['Charlie', 35]]
```

**Different lengths (stops at shorter):**
```typescript
const a = [1, 2, 3, 4, 5];
const b = ['a', 'b'];
const pairs = new Zip(a, b).toArray();
// [[1, 'a'], [2, 'b']] - stops at length 2
```

**Create map from parallel arrays:**
```typescript
const keys = ['name', 'age', 'city'];
const values = ['Alice', 25, 'NYC'];
const map = new Map(new Zip(keys, values).toArray());
```

## Performance

- **Iteration**: O(min(n, m)) where n, m are input lengths
- **toArray()**: O(min(n, m))
- **Memory**: O(1) for iteration (lazy), O(min(n, m)) for toArray()

## Notes

- Iteration stops when either iterable is exhausted
- Does not modify source iterables
- Pairs are created lazily during iteration
