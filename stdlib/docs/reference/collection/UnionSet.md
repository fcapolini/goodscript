# UnionSet

A lazy union view of multiple sets without copying data.

## Import

```typescript
import { UnionSet } from '@goodscript/collection';
```

## Constructor

```typescript
new UnionSet<E>(sets: Set<E>[])
```

Creates a view that presents multiple sets as their logical union.

## Methods

- `has(element: E): boolean` - Check if element is in any set
- `contains(element: E): boolean` - Alias for `has`
- `getLength(): number` - Total unique elements
- `isEmpty(): boolean`
- `isNotEmpty(): boolean`
- `toArray(): E[]` - Array of unique elements
- `toString(): string`

## Example

```typescript
const set1 = new Set([1, 2, 3]);
const set2 = new Set([3, 4, 5]);
const set3 = new Set([5, 6]);

const union = new UnionSet([set1, set2, set3]);

union.has(1);      // true
union.has(6);      // true
union.has(99);     // false
union.getLength(); // 6 (unique elements: 1,2,3,4,5,6)

// Changes to source sets are visible
set1.add(99);
union.has(99); // true
```

## Use Cases

- Combine multiple data sources without copying
- Virtual set unions for filtering/querying
- Building composite views

## Performance

- `has(element)`: O(k) where k = number of source sets
- `getLength()`: O(n) where n = total elements (must count unique)
- `toArray()`: O(n)
- Memory: O(1) overhead (references source sets)
