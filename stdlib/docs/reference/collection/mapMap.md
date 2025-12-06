# mapMap<K1, V1, K2, V2>

Creates a new map with transformed keys and/or values.

## Signature

```typescript
function mapMap<K1, V1, K2, V2>(
  map: Map<K1, V1>,
  options?: MapMapOptions<K1, V1, K2, V2>
): Map<K2, V2>

interface MapMapOptions<K1, V1, K2, V2> {
  key?: (key: K1, value: V1) => K2;
  value?: (key: K1, value: V1) => V2;
}
```

## Description

Each entry in the input map is transformed by the optional `key` and `value` functions. If a function is not provided, the original key or value is kept (with type casting). Both transformation functions receive both the key and value, allowing value-based key transformations and vice versa.

## Parameters

- **map**: `Map<K1, V1>` - The input map to transform
- **options**: `MapMapOptions<K1, V1, K2, V2>` (optional) - Transformation functions

## Returns

`Map<K2, V2>` - A new map with transformed entries

## Time Complexity

- **O(n)** where n = size of input map
- Each entry is visited once and both transformations are O(1)

## Space Complexity

- **O(n)** - Creates a new map with same number of entries

## Examples

### Transform values only

```typescript
const map = new Map([['a', 1], ['b', 2], ['c', 3]]);

const doubled = mapMap(map, {
  value: (k, v) => v * 2
});
// Map { 'a' => 2, 'b' => 4, 'c' => 6 }
```

### Transform keys only

```typescript
const map = new Map([['a', 1], ['b', 2], ['c', 3]]);

const upper = mapMap(map, {
  key: (k, v) => k.toUpperCase()
});
// Map { 'A' => 1, 'B' => 2, 'C' => 3 }
```

### Transform both keys and values

```typescript
const map = new Map([['a', 1], ['b', 2], ['c', 3]]);

const transformed = mapMap(map, {
  key: (k, v) => k.toUpperCase(),
  value: (k, v) => v * 2
});
// Map { 'A' => 2, 'B' => 4, 'C' => 6 }
```

### Use value in key transformation

```typescript
const map = new Map([['x', 10], ['y', 20], ['z', 30]]);

const prefixed = mapMap(map, {
  key: (k, v) => `${k}_${v}`
});
// Map { 'x_10' => 10, 'y_20' => 20, 'z_30' => 30 }
```

### Use key in value transformation

```typescript
const map = new Map([['apple', 5], ['banana', 3]]);

const labeled = mapMap(map, {
  value: (k, v) => `${v} ${k}s`
});
// Map { 'apple' => '5 apples', 'banana' => '3 bananas' }
```

### Type conversion

```typescript
const map = new Map([['a', '10'], ['b', '20'], ['c', '30']]);

const parsed = mapMap(map, {
  value: (k, v) => parseInt(v, 10)
});
// Map<string, number> { 'a' => 10, 'b' => 20, 'c' => 30 }
```

### Create objects from entries

```typescript
const map = new Map([[1, 'Alice'], [2, 'Bob']]);

const objects = mapMap(map, {
  value: (id, name) => ({ id, name })
});
// Map { 1 => { id: 1, name: 'Alice' }, 2 => { id: 2, name: 'Bob' } }
```

## Edge Cases

- **Empty map**: Returns empty map
- **No transformations**: Returns a copy of the map (with type casting)
- **Identity**: Transformations can return the same values

## Implementation Notes

- Original map is not modified
- Result is a completely new Map instance
- If no transformations provided, original values are cast to target types
- Both transformation functions receive both key and value for maximum flexibility
- Iteration order is preserved (insertion order)

## Related Functions

- [`mergeMaps`](./mergeMaps.md) - Merge two maps with optional value merge function
- [`groupBy`](./groupBy.md) - Group elements by key

## Source

[`stdlib/collection/src/merge-maps-gs.ts`](../../../collection/src/merge-maps-gs.ts)
