# @goodscript/collection

Collection data structures for GoodScript, translated from Dart's `collection` package.

## Included Data Structures

### Priority Queues
- **HeapPriorityQueue** - Min-heap priority queue with O(log n) operations

### Queues & Lists  
- **QueueList** - Double-ended queue with O(1) operations at both ends and O(1) indexed access

## Installation

```bash
npm install @goodscript/collection
```

## Usage

### HeapPriorityQueue

A heap-based priority queue that maintains elements in priority order.

```typescript
import { HeapPriorityQueue } from '@goodscript/collection';

// Create a priority queue (lower numbers = higher priority)
const pq = new HeapPriorityQueue<number>();

// Add elements
pq.add(5);
pq.add(2);
pq.add(8);
pq.add(1);

// Remove in priority order
console.log(pq.removeFirst()); // 1
console.log(pq.removeFirst()); // 2
console.log(pq.removeFirst()); // 5
console.log(pq.removeFirst()); // 8

// Custom comparator (reverse order)
const reversed = new HeapPriorityQueue<number>((a, b) => b - a);
reversed.addAll([5, 2, 8]);
console.log(reversed.removeFirst()); // 8 (highest first)
```

### QueueList

A double-ended queue supporting efficient operations at both ends.

```typescript
import { QueueList } from '@goodscript/collection';

// Create from array
const deque = QueueList.from([1, 2, 3]);

// Add at both ends
deque.addFirst(0);    // [0, 1, 2, 3]
deque.addLast(4);     // [0, 1, 2, 3, 4]

// Remove from both ends
console.log(deque.removeFirst()); // 0
console.log(deque.removeLast());  // 4

// Random access
console.log(deque.get(1)); // 2
deque.set(1, 99);
```

## Features

- **Production-ready**: Translated from Dart's battle-tested implementations
- **Well-documented**: Complete API docs for every data structure
- **GoodScript-compatible**: Follows GoodScript constraints and idioms
- **Fully tested**: Comprehensive test suites with edge cases

## Documentation

See [stdlib/docs/reference/collection/](../../docs/reference/collection/) for detailed API documentation:
- [HeapPriorityQueue](../../docs/reference/collection/HeapPriorityQueue.md)
- [QueueList](../../docs/reference/collection/QueueList.md)

## License

BSD-3-Clause (same as original Dart implementation)
