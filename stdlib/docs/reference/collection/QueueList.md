# QueueList

A double-ended queue (deque) that efficiently implements both Queue and List operations. Provides O(1) addition and removal at both ends, and O(1) indexed access.

**Package**: `@goodscript/collection`  
**Source**: Translated from [Dart's collection package](https://pub.dev/documentation/collection/latest/collection/QueueList-class.html)

## Overview

QueueList uses a circular buffer internally to provide efficient operations at both ends. Unlike a regular array, it can efficiently add and remove elements from the front without shifting all elements.

## Performance Characteristics

- `add()` / `addLast()`: O(1) amortized
- `addFirst()`: O(1) amortized
- `removeFirst()`: O(1)
- `removeLast()`: O(1)
- `get()`: O(1) indexed access
- `set()`: O(1) indexed update
- `addAll()`: O(k) where k is number of elements added
- `getLength()`: O(1)

## Constructors

### `new QueueList<E>(initialCapacity?)`

Creates an empty queue.

**Parameters:**
- `initialCapacity?: number` - Optional initial capacity. Will be rounded up to nearest power of 2.

**Example:**
```typescript
const queue = new QueueList<number>();
const largeQueue = new QueueList<string>(1000); // Pre-allocate space
```

### `QueueList.from<E>(source: E[])`

Creates a queue from an array.

**Parameters:**
- `source: E[]` - Array to copy elements from

**Example:**
```typescript
const queue = QueueList.from([1, 2, 3, 4, 5]);
console.log(queue.getLength()); // 5
console.log(queue.get(0)); // 1
```

## Queue Operations (Double-Ended)

### `add(element: E): void`

Adds an element to the end of the queue. Alias for `addLast()`.

**Example:**
```typescript
const queue = new QueueList<number>();
queue.add(1);
queue.add(2);
queue.add(3);
console.log(queue.toArray()); // [1, 2, 3]
```

### `addLast(element: E): void`

Adds an element to the end of the queue. O(1) amortized.

**Example:**
```typescript
const queue = QueueList.from([1, 2]);
queue.addLast(3);
console.log(queue.toArray()); // [1, 2, 3]
```

### `addFirst(element: E): void`

Adds an element to the front of the queue. O(1) amortized.

**Example:**
```typescript
const queue = QueueList.from([2, 3]);
queue.addFirst(1);
console.log(queue.toArray()); // [1, 2, 3]
```

### `removeFirst(): E`

Removes and returns the first element. O(1).

**Throws:** `Error` if the queue is empty.

**Example:**
```typescript
const queue = QueueList.from([1, 2, 3]);
console.log(queue.removeFirst()); // 1
console.log(queue.removeFirst()); // 2
console.log(queue.toArray()); // [3]
```

### `removeLast(): E`

Removes and returns the last element. O(1).

**Throws:** `Error` if the queue is empty.

**Example:**
```typescript
const queue = QueueList.from([1, 2, 3]);
console.log(queue.removeLast()); // 3
console.log(queue.removeLast()); // 2
console.log(queue.toArray()); // [1]
```

### `addAll(elements: E[]): void`

Adds all elements from an array to the end of the queue.

**Example:**
```typescript
const queue = QueueList.from([1, 2]);
queue.addAll([3, 4, 5]);
console.log(queue.toArray()); // [1, 2, 3, 4, 5]
```

## List Operations (Indexed Access)

### `get(index: number): E`

Gets the element at the specified index. O(1).

**Throws:** `Error` if index is out of bounds.

**Example:**
```typescript
const queue = QueueList.from([10, 20, 30, 40]);
console.log(queue.get(0)); // 10
console.log(queue.get(2)); // 30
```

### `set(index: number, value: E): void`

Sets the element at the specified index. O(1).

**Throws:** `Error` if index is out of bounds.

**Example:**
```typescript
const queue = QueueList.from([10, 20, 30]);
queue.set(1, 25);
console.log(queue.toArray()); // [10, 25, 30]
```

### `getLength(): number`

Returns the number of elements in the queue. O(1).

**Example:**
```typescript
const queue = QueueList.from([1, 2, 3]);
console.log(queue.getLength()); // 3
```

### `setLength(value: number): void`

Sets the length of the queue. Can increase (adds space) or decrease (removes elements from end).

**Throws:** `Error` if value is negative.

**Example:**
```typescript
const queue = QueueList.from([1, 2, 3, 4, 5]);

// Decrease length (removes from end)
queue.setLength(3);
console.log(queue.toArray()); // [1, 2, 3]

// Increase length (extends queue)
queue.setLength(5);
console.log(queue.getLength()); // 5
```

## General Methods

### `isEmpty(): boolean`

Returns `true` if the queue has no elements.

**Example:**
```typescript
const queue = new QueueList<number>();
console.log(queue.isEmpty()); // true

queue.add(1);
console.log(queue.isEmpty()); // false
```

### `isNotEmpty(): boolean`

Returns `true` if the queue has at least one element.

**Example:**
```typescript
const queue = QueueList.from([1, 2, 3]);
console.log(queue.isNotEmpty()); // true
```

### `clear(): void`

Removes all elements from the queue. Resets to initial capacity.

**Example:**
```typescript
const queue = QueueList.from([1, 2, 3, 4, 5]);
queue.clear();
console.log(queue.isEmpty()); // true
console.log(queue.getLength()); // 0
```

### `toArray(): E[]`

Returns all elements as a new array. The queue is not modified.

**Example:**
```typescript
const queue = QueueList.from([1, 2, 3]);
const arr = queue.toArray();
console.log(arr); // [1, 2, 3]

// Iterate over snapshot
for (const item of arr) {
  console.log(item);
}
```

### `toString(): string`

Returns a string representation of the queue with elements in curly braces.

**Example:**
```typescript
const queue = QueueList.from([1, 2, 3]);
console.log(queue.toString()); // "{1, 2, 3}"
```

## Use Cases

### Stack (LIFO)
```typescript
const stack = new QueueList<number>();
stack.addLast(1);  // Push
stack.addLast(2);
stack.addLast(3);
console.log(stack.removeLast()); // Pop: 3
console.log(stack.removeLast()); // Pop: 2
```

### Queue (FIFO)
```typescript
const queue = new QueueList<string>();
queue.addLast("first");   // Enqueue
queue.addLast("second");
queue.addLast("third");
console.log(queue.removeFirst()); // Dequeue: "first"
console.log(queue.removeFirst()); // Dequeue: "second"
```

### Deque (Double-Ended Queue)
```typescript
const deque = new QueueList<number>();
deque.addLast(2);      // [2]
deque.addFirst(1);     // [1, 2]
deque.addLast(3);      // [1, 2, 3]
deque.addFirst(0);     // [0, 1, 2, 3]

console.log(deque.removeFirst()); // 0
console.log(deque.removeLast());  // 3
// Now: [1, 2]
```

### Random Access List
```typescript
const list = QueueList.from([10, 20, 30, 40, 50]);

// Read
console.log(list.get(2)); // 30

// Update
list.set(2, 35);
console.log(list.get(2)); // 35

// Iterate
for (let i = 0; i < list.getLength(); i++) {
  console.log(list.get(i));
}
```

## Implementation Notes

**Circular Buffer**: QueueList uses a circular buffer (ring buffer) internally. Elements wrap around when reaching the end of the internal array, allowing O(1) operations at both ends.

**Automatic Growth**: The internal buffer grows automatically (doubles in size) when full. Capacity is always a power of 2 for efficient modulo operations using bitwise AND.

**Memory Efficiency**: When elements are removed, the slots are set to `null` to allow garbage collection. The buffer only shrinks on explicit `clear()` or `setLength()` operations.

## Differences from Dart Original

This implementation preserves all core functionality with these adaptations:

1. **List Interface**: Dart's `QueueList` implements the full `List` interface. This version provides the essential list operations via explicit methods:
   - Array indexing `queue[i]` → `queue.get(i)`
   - Array assignment `queue[i] = x` → `queue.set(i, x)`
   - `.length` → `.getLength()` / `.setLength()`

2. **No Iterator Protocol**: Use `toArray()` to iterate:
   ```typescript
   // Dart: for (var item in queue) { ... }
   // GoodScript:
   for (const item of queue.toArray()) { ... }
   ```

3. **Removed Methods**:
   - `cast<T>()` - Type system handles this automatically
   - List methods beyond queue/deque operations (use `toArray()` and array methods)

4. **Static Methods**: Only `from()` is provided. Dart's `_castFrom()` is not needed.

All algorithmic guarantees and performance characteristics are identical to the Dart original.

## See Also

- [Dart QueueList documentation](https://pub.dev/documentation/collection/latest/collection/QueueList-class.html)
- [Queue interface](https://api.dart.dev/stable/dart-collection/Queue-class.html)
- [Circular buffer on Wikipedia](https://en.wikipedia.org/wiki/Circular_buffer)
