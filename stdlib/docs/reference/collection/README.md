# Collection Library API Reference

Complete API documentation for [@goodscript/collection](../../../collection/).

## Data Structures

### Priority Queues
- [HeapPriorityQueue](./HeapPriorityQueue.md) - Min-heap priority queue with O(log n) operations

### Queues & Lists
- [QueueList](./QueueList.md) - Double-ended queue with O(1) operations at both ends

## Usage

All collection classes follow these conventions:

1. **No getter/setter syntax** - Use explicit methods (`getLength()`, `setLength()`)
2. **No iterator protocol** - Use `toArray()` for iteration
3. **Explicit indexing** - Use `get(i)` and `set(i, value)` methods
4. **Null-safe** - All operations explicitly handle null/undefined

## Source

Translated from [Dart's collection package](https://pub.dev/packages/collection).
