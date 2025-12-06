# Collection Library API Reference

Complete API documentation for [@goodscript/collection](../../../collection/).

## Data Structures

### Priority Queues
- [HeapPriorityQueue](./HeapPriorityQueue.md) - Min-heap priority queue with O(log n) operations

### Queues & Lists
- [QueueList](./QueueList.md) - Double-ended queue with O(1) operations at both ends
- [ListQueue](./ListQueue.md) - Circular buffer queue implementation

### Sets
- [EqualitySet](./EqualitySet.md) - Hash set with custom equality function
- [UnmodifiableSetView](./UnmodifiableSetView.md) - Read-only set wrapper
- [UnionSet](./UnionSet.md) - Lazy union view of multiple sets
- [BoolList](./BoolList.md) - Space-efficient boolean list

### Maps
- [EqualityMap](./EqualityMap.md) - Hash map with custom equality function
- [CanonicalizedMap](./CanonicalizedMap.md) - Map with canonical keys (case-insensitive strings, etc.)
- [LRUCache](./LRUCache.md) - Least Recently Used cache with automatic eviction (async/await)
- [UnmodifiableMapView](./UnmodifiableMapView.md) - Read-only map wrapper

### Views
- [UnmodifiableListView](./UnmodifiableListView.md) - Read-only list wrapper
- [CombinedListView](./CombinedListView.md) - Lazy concatenated list view

## Utilities

### Iterable Operations
- [IterableExtensions](./IterableExtensions.md) - 29 utility functions for filtering, mapping, finding, grouping, and statistics
- [ListExtensions](./ListExtensions.md) - List utility functions (binary search, range operations, slicing)
- [Range](./Range.md) - Numeric sequence generator with iterator support
- [Zip](./Zip.md) - Combine multiple iterables element-wise
- [Partition](./Partition.md) - Split collections into groups

### Comparison & Sorting
- [Comparators](./Comparators.md) - String comparison functions (case-insensitive, natural sort)
- [Algorithms](./Algorithms.md) - Binary search, shuffle, reverse

### Map & Collection Utilities
- [groupBy](./groupBy.md) - Group elements by key function
- [lastBy](./lastBy.md) - Get last element by key function
- [minBy/maxBy](./minBy-maxBy.md) - Find min/max elements by projection function
- [mergeMaps](./mergeMaps.md) - Merge multiple maps
- [mapMap](./mapMap.md) - Transform map keys and values
- [CollectionUtils](./CollectionUtils.md) - Graph algorithms (SCC, transitive closure)

## Conventions

All collection classes follow these patterns:

1. **Getters → Methods**: Property access converted to method calls
   - `.length` → `.getLength()`
   - `.first` → `.getFirst()`
   - `.isEmpty` → `.isEmpty()`

2. **Iterator Support**: Most data structures support `for...of` loops
   - Implements `Symbol.iterator` protocol
   - Can use spread operator: `[...collection]`
   - Use `toArray()` when iterator not supported

3. **Explicit Indexing**: Array-like access uses methods
   - `collection[i]` → `collection.get(i)`
   - `collection[i] = x` → `collection.set(i, x)`

4. **Null-Safety**: Returns `null` instead of throwing for "not found"
   - `firstOrNull()`, `lastOrNull()`, `elementAtOrNull()`
   - `lookup()` for set/map membership

## Source

Translated from [Dart's collection package](https://pub.dev/packages/collection) with adaptations for GoodScript constraints.

**Total:** 24 libraries, 790 tests, 100% pass rate across TypeScript, GoodScript validation, and C++ native execution.

## See Also

- [@goodscript/async](../async/README.md) - Async utilities (Completer, delay)
