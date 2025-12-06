# CombinedListView

A lazy concatenated view of multiple lists without copying data.

## Import

```typescript
import { CombinedListView } from '@goodscript/collection';
```

## Constructor

```typescript
new CombinedListView<E>(lists: E[][])
```

Creates a view that presents multiple lists as a single logical list.

## Methods

- `get(index: number): E` - Get element at logical index
- `getLength(): number` - Total length across all lists
- `isEmpty(): boolean`
- `isNotEmpty(): boolean`
- `toArray(): E[]` - Flatten to single array

## Example

```typescript
const list1 = [1, 2, 3];
const list2 = [4, 5];
const list3 = [6, 7, 8];

const combined = new CombinedListView([list1, list2, list3]);

combined.getLength(); // 8
combined.get(0);      // 1 (from list1)
combined.get(3);      // 4 (from list2)
combined.get(7);      // 8 (from list3)

// Changes to source lists are visible
list1.push(99);
combined.get(3); // 99
```

## Use Cases

- Combine multiple data sources without copying
- Virtual concatenation of large lists
- Building composite views

## Performance

- `get(index)`: O(k) where k = number of source lists
- `getLength()`: O(k)
- `toArray()`: O(n) where n = total elements
- Memory: O(1) overhead (references source lists)
