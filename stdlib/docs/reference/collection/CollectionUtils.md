# Collection Utilities

Higher-order collection functions for common data transformations.

## Import

```typescript
import {
  stronglyConnectedComponents,
  transitiveClosure,
  mapToArray,
  getOrDefault
} from '@goodscript/collection';
```

## Functions

### `stronglyConnectedComponents<T>(graph: Map<T, T[]>): T[][]`

Find strongly connected components in a directed graph using Tarjan's algorithm.

**Parameters:**
- `graph` - Map from vertex to array of adjacent vertices

**Returns:** Array of components (each component is array of vertices)

**Example:**
```typescript
const graph = new Map([
  ['a', ['b']],
  ['b', ['c']],
  ['c', ['a', 'd']],
  ['d', []]
]);

const components = stronglyConnectedComponents(graph);
// [['d'], ['a', 'b', 'c']]
```

**Use Cases:**
- Dependency analysis
- Finding circular references
- Graph partitioning

### `transitiveClosure<T>(graph: Map<T, Set<T>>): Map<T, Set<T>>`

Compute transitive closure of a directed graph (all reachable vertices from each vertex).

**Parameters:**
- `graph` - Map from vertex to set of directly adjacent vertices

**Returns:** Map from vertex to set of all reachable vertices (including transitive)

**Example:**
```typescript
const graph = new Map([
  ['a', new Set(['b'])],
  ['b', new Set(['c'])],
  ['c', new Set()]
]);

const closure = transitiveClosure(graph);
// Map {
//   'a' => Set {'b', 'c'},
//   'b' => Set {'c'},
//   'c' => Set {}
// }
```

**Use Cases:**
- Permission inheritance
- Dependency resolution
- Reachability analysis

### `mapToArray<T>(map: Map<any, T>): T[]`

Extract all values from a map as an array.

**Example:**
```typescript
const map = new Map([['a', 1], ['b', 2], ['c', 3]]);
mapToArray(map); // [1, 2, 3]
```

### `getOrDefault<K, V>(map: Map<K, V>, key: K, defaultValue: V): V`

Get value from map with fallback default.

**Example:**
```typescript
const map = new Map([['a', 1]]);
getOrDefault(map, 'a', 0); // 1
getOrDefault(map, 'b', 0); // 0 (default)
```

## Performance

- **stronglyConnectedComponents**: O(V + E) - Tarjan's algorithm
- **transitiveClosure**: O(V³) - Floyd-Warshall variant
- **mapToArray**: O(n)
- **getOrDefault**: O(1)

where V = vertices, E = edges, n = map size
