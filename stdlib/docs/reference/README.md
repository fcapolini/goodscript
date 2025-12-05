# GoodScript Standard Library - API Reference

Complete API documentation for all GoodScript standard library packages.

## Packages

### [Collection](./collection/)
Data structures and algorithms
- [HeapPriorityQueue](./collection/HeapPriorityQueue.md)
- [QueueList](./collection/QueueList.md)

### Core (planned)
Core utilities

### Async (planned)
Async utilities

### I/O (planned)
I/O libraries

## Conventions

All stdlib libraries follow these GoodScript constraints:

1. **No getter/setter syntax** → Use methods (`getLength()`, `setLength()`)
2. **No iterator protocol** → Use `toArray()` pattern
3. **No array indexing on custom types** → Use `get(i)`, `set(i, value)`
4. **Explicit null handling** → All APIs are null-safe
5. **No `any` type** → Use generics or specific types
6. **Only strict equality** → `===` and `!==` only
7. **No type coercion** → Explicit conversions only

See [GOOD-PARTS.md](../../../../docs/GOOD-PARTS.md) for complete language restrictions.
