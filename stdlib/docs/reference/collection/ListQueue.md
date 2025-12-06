# ListQueue

A queue implementation using a circular buffer with efficient operations at both ends.

Translated from [Dart's ListQueue](https://pub.dev/documentation/collection/latest/collection/ListQueue-class.html)

## Overview

Alternative queue implementation to QueueList, using a circular buffer for O(1) operations at both ends.

## Import

```typescript
import { ListQueue } from '@goodscript/collection';
```

## Constructor

```typescript
new ListQueue<E>(initialCapacity?: number)
```

## Static Methods

- `from<E>(elements: E[]): ListQueue<E>` - Create from array

## Methods

**Queue Operations:**
- `addFirst(element: E): void` - Add to front
- `addLast(element: E): void` - Add to back
- `removeFirst(): E` - Remove from front
- `removeLast(): E` - Remove from back

**Inspection:**
- `getFirst(): E` - View first element
- `getLast(): E` - View last element
- `getLength(): number` - Number of elements
- `isEmpty(): boolean`
- `isNotEmpty(): boolean`

**Bulk Operations:**
- `addAll(elements: E[]): void`
- `clear(): void`
- `toArray(): E[]`

## Iteration

Supports `for...of` loops:

```typescript
const queue = ListQueue.from([1, 2, 3]);
for (const item of queue) {
  console.log(item);
}
```

## Example

```typescript
const queue = new ListQueue<number>();
queue.addLast(1);
queue.addLast(2);
queue.addFirst(0);
// Queue: [0, 1, 2]

queue.removeFirst(); // 0
queue.removeLast();  // 2
// Queue: [1]
```

## Performance

All operations are O(1) amortized. Resizes when full (doubles capacity).
