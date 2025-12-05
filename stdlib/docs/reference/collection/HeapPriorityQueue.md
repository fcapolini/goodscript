# HeapPriorityQueue

A heap-based priority queue implementation. Elements are ordered by priority, with the smallest element (according to the comparison function) having the highest priority.

**Package**: `@goodscript/collection`  
**Source**: Translated from [Dart's collection package](https://pub.dev/documentation/collection/latest/collection/HeapPriorityQueue-class.html)

## Overview

The priority queue allows adding elements and removing them in priority order. The same element can be added multiple times. There is no guaranteed ordering for elements with equal priority (where the comparison function returns zero).

## Performance Characteristics

- `add()`: O(log n) amortized
- `removeFirst()`: O(log n) amortized  
- `getFirst()`: O(1) constant time
- `contains()`: O(n) linear search
- `remove()`: O(n) linear search + O(log n) rebalance
- `clear()`: O(1) constant time
- `getLength()`: O(1) constant time

## Constructor

### `new HeapPriorityQueue<E>(comparison?)`

Creates a new priority queue.

**Parameters:**
- `comparison?: (a: E, b: E) => number` - Optional comparison function. If omitted, uses natural ordering (< operator).

**Comparison function contract:**
- Returns negative if `a` has higher priority than `b`
- Returns positive if `b` has higher priority than `a`  
- Returns zero if equal priority

**Example:**
```typescript
// Natural ordering (smaller numbers = higher priority)
const pq1 = new HeapPriorityQueue<number>();
pq1.add(5);
pq1.add(2);
pq1.add(8);
console.log(pq1.removeFirst()); // 2

// Custom ordering (larger numbers = higher priority)
const pq2 = new HeapPriorityQueue<number>((a, b) => b - a);
pq2.add(5);
pq2.add(2);
pq2.add(8);
console.log(pq2.removeFirst()); // 8
```

## Methods

### `add(element: E): void`

Adds an element to the queue. The element will be removed in priority order relative to other elements.

**Example:**
```typescript
const pq = new HeapPriorityQueue<string>();
pq.add("banana");
pq.add("apple");
pq.add("cherry");
```

### `addAll(elements: E[]): void`

Adds all elements from an array to the queue.

**Example:**
```typescript
const pq = new HeapPriorityQueue<number>();
pq.addAll([5, 2, 8, 1, 9]);
```

### `getFirst(): E`

Returns the next element without removing it. The queue must not be empty.

**Throws:** `Error` if the queue is empty.

**Example:**
```typescript
const pq = new HeapPriorityQueue<number>();
pq.add(5);
pq.add(2);
console.log(pq.getFirst()); // 2
console.log(pq.getLength()); // Still 2 (not removed)
```

### `removeFirst(): E`

Removes and returns the element with the highest priority. The queue must not be empty.

**Throws:** `Error` if the queue is empty.

**Example:**
```typescript
const pq = new HeapPriorityQueue<number>();
pq.addAll([5, 2, 8]);
console.log(pq.removeFirst()); // 2
console.log(pq.removeFirst()); // 5
console.log(pq.removeFirst()); // 8
```

### `contains(element: E): boolean`

Checks if an element is in the queue. Uses the comparison function to test equality (returns true if comparison returns 0).

**Example:**
```typescript
const pq = new HeapPriorityQueue<number>();
pq.addAll([5, 2, 8]);
console.log(pq.contains(5)); // true
console.log(pq.contains(3)); // false
```

### `remove(element: E): boolean`

Removes a single element that compares equal to the given element. Returns `true` if an element was found and removed, `false` otherwise.

**Example:**
```typescript
const pq = new HeapPriorityQueue<number>();
pq.addAll([5, 2, 8, 2]);
console.log(pq.remove(2)); // true
console.log(pq.getLength()); // 3 (one 2 removed, one remains)
```

### `removeAll(): E[]`

Removes all elements from the queue and returns them in priority order.

**Example:**
```typescript
const pq = new HeapPriorityQueue<number>();
pq.addAll([5, 2, 8, 1, 9]);
const sorted = pq.removeAll();
console.log(sorted); // [1, 2, 5, 8, 9]
console.log(pq.isEmpty()); // true
```

### `clear(): void`

Removes all elements from the queue.

**Example:**
```typescript
const pq = new HeapPriorityQueue<number>();
pq.addAll([5, 2, 8]);
pq.clear();
console.log(pq.isEmpty()); // true
```

### `getLength(): number`

Returns the number of elements in the queue.

**Example:**
```typescript
const pq = new HeapPriorityQueue<number>();
pq.addAll([5, 2, 8]);
console.log(pq.getLength()); // 3
```

### `isEmpty(): boolean`

Returns `true` if the queue has no elements.

**Example:**
```typescript
const pq = new HeapPriorityQueue<number>();
console.log(pq.isEmpty()); // true
pq.add(5);
console.log(pq.isEmpty()); // false
```

### `isNotEmpty(): boolean`

Returns `true` if the queue has at least one element.

**Example:**
```typescript
const pq = new HeapPriorityQueue<number>();
console.log(pq.isNotEmpty()); // false
pq.add(5);
console.log(pq.isNotEmpty()); // true
```

### `getUnorderedElements(): E[]`

Returns all elements as an array in no particular order. The queue is not modified.

**Example:**
```typescript
const pq = new HeapPriorityQueue<number>();
pq.addAll([5, 2, 8]);
const elements = pq.getUnorderedElements();
console.log(elements.length); // 3
console.log(pq.getLength()); // Still 3 (not removed)
// Order is not guaranteed: could be [2, 5, 8] or [5, 2, 8] etc.
```

### `toArray(): E[]`

Alias for `getUnorderedElements()`. Returns all elements as an array in no particular order.

**Example:**
```typescript
const pq = new HeapPriorityQueue<number>();
pq.addAll([5, 2, 8]);
const snapshot = pq.toArray();
// Iterate over snapshot
for (const item of snapshot) {
  console.log(item);
}
```

### `toString(): string`

Returns a string representation of the queue elements, comma-separated.

**Example:**
```typescript
const pq = new HeapPriorityQueue<number>();
pq.addAll([5, 2, 8]);
console.log(pq.toString()); // "2, 5, 8" or similar (order not guaranteed)
```

## Differences from Dart Original

This implementation is a simplified adaptation of Dart's HeapPriorityQueue with the following changes:

1. **Getters → Methods**: Property access converted to method calls
   - `.length` → `.getLength()`
   - `.first` → `.getFirst()`
   - `.isEmpty` → `.isEmpty()`
   - `.isNotEmpty` → `.isNotEmpty()`
   - `.unorderedElements` → `.getUnorderedElements()`

2. **Removed features**:
   - `toList()` - Use `removeAll()` instead (destructive) or manually drain and rebuild
   - `toSet()` - Use `new Set(queue.toArray())` if needed
   - Iterator protocol (`Symbol.iterator`) - Use `toArray()` for iteration

3. **Implementation**: Uses compact array instead of sparse array for simpler C++ translation

All core algorithmic guarantees and behavior are preserved from the Dart original.

## See Also

- [Dart HeapPriorityQueue documentation](https://pub.dev/documentation/collection/latest/collection/HeapPriorityQueue-class.html)
- [PriorityQueue interface](https://pub.dev/documentation/collection/latest/collection/PriorityQueue-class.html)
