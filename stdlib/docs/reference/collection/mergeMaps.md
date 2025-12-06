# mergeMaps<K, V>

Merges two maps into a new map.

## Signature

```typescript
function mergeMaps<K, V>(
  map1: Map<K, V>,
  map2: Map<K, V>,
  options?: MergeMapOptions<V>
): Map<K, V>

interface MergeMapOptions<V> {
  value?: (value1: V, value2: V) => V;
}
```

## Description

All entries from both maps are included in the result. If a key appears in both maps, the optional `value` function is used to determine the final value. If no merge function is provided, the value from `map2` wins (overwrites `map1`).

## Parameters

- **map1**: `Map<K, V>` - The first map
- **map2**: `Map<K, V>` - The second map
- **options**: `MergeMapOptions<V>` (optional) - Configuration object with optional merge function

## Returns

`Map<K, V>` - A new map with all entries from both maps

## Time Complexity

- **O(n + m)** where n = size of map1, m = size of map2
- Each entry is visited once

## Space Complexity

- **O(n + m)** - Creates a new map with all entries

## Examples

### Basic merge (map2 wins)

```typescript
const map1 = new Map([['a', 1], ['b', 2]]);
const map2 = new Map([['b', 3], ['c', 4]]);

const merged = mergeMaps(map1, map2);
// Map { 'a' => 1, 'b' => 3, 'c' => 4 }
```

### Custom merge: sum values

```typescript
const map1 = new Map([['a', 10], ['b', 20]]);
const map2 = new Map([['b', 30], ['c', 40]]);

const summed = mergeMaps(map1, map2, {
  value: (v1, v2) => v1 + v2
});
// Map { 'a' => 10, 'b' => 50, 'c' => 40 }
```

### Custom merge: take maximum

```typescript
const map1 = new Map([['x', 5], ['y', 10]]);
const map2 = new Map([['y', 3], ['z', 15]]);

const maxed = mergeMaps(map1, map2, {
  value: (v1, v2) => Math.max(v1, v2)
});
// Map { 'x' => 5, 'y' => 10, 'z' => 15 }
```

### Merge arrays

```typescript
const map1 = new Map([['a', [1, 2]], ['b', [3]]]);
const map2 = new Map([['b', [4, 5]], ['c', [6]]]);

const combined = mergeMaps(map1, map2, {
  value: (arr1, arr2) => [...arr1, ...arr2]
});
// Map { 'a' => [1, 2], 'b' => [3, 4, 5], 'c' => [6] }
```

## Edge Cases

- **Empty maps**: Returns empty map if both inputs are empty
- **One empty**: Returns copy of non-empty map
- **No conflicts**: All keys unique between maps - result is simple union
- **All conflicts**: All keys overlap - merge function called for every entry

## Implementation Notes

- Original maps are not modified
- Result is a completely new Map instance
- Iteration order follows insertion order (map1 entries, then map2 entries)
- Null/undefined values are treated as valid values

## Related Functions

- [`mapMap`](./mapMap.md) - Transform map keys and/or values
- [`groupBy`](./groupBy.md) - Group elements by key into map

## Source

[`stdlib/collection/src/merge-maps-gs.ts`](../../../collection/src/merge-maps-gs.ts)
