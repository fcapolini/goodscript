# BoolList

Space-efficient boolean list using bit packing.

## Import

```typescript
import { BoolList } from '@goodscript/collection';
```

## Constructor

```typescript
new BoolList(length: number, fill?: boolean)
```

Creates a boolean list of given length, optionally filled with a value.

## Static Methods

- `filled(length: number, fill: boolean): BoolList` - Create filled list
- `from(values: boolean[]): BoolList` - Create from array

## Methods

- `get(index: number): boolean` - Get value at index
- `set(index: number, value: boolean): void` - Set value at index
- `getLength(): number` - Number of elements
- `fill(value: boolean, start?: number, end?: number): void` - Fill range
- `toArray(): boolean[]` - Convert to array
- `toString(): string`

## Example

```typescript
// Create 100 boolean values (all false)
const flags = new BoolList(100);

flags.set(0, true);
flags.set(50, true);
flags.set(99, true);

flags.get(0);  // true
flags.get(1);  // false
flags.get(50); // true

// Fill a range
flags.fill(true, 10, 20); // Set indices 10-19 to true

// Create from array
const bools = BoolList.from([true, false, true, true]);
```

## Performance

- **Memory**: ~1/8 the size of `boolean[]` (uses bit packing)
- **get/set**: O(1)
- **fill**: O(n) where n = range size

## Use Cases

- Boolean flags for large datasets
- Bit vectors and masks
- Presence/absence indicators
- Memory-efficient boolean storage

## Implementation Notes

Uses bit packing to store 8 booleans per byte, significantly reducing memory usage for large boolean arrays.
