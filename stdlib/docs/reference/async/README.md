# Async Library API Reference

Complete API documentation for [@goodscript/async](../../../async/).

## Utilities

### Promise Control
- [Completer](./Completer.md) - Deferred Promise completion pattern
- [delay](./delay.md) - Async delay/sleep utilities

## Use Cases

### Async Gates
Wait for multiple async operations before proceeding:
```typescript
const completer = new Completer<void>();
let count = 0;

async function task(id: number) {
  await someAsyncOperation();
  count++;
  if (count === 3) {
    completer.complete(undefined);
  }
}

task(1); task(2); task(3);
await completer.getPromise(); // Waits for all 3 tasks
```

### Callback Bridges
Convert callback-based APIs to Promise-based:
```typescript
function callbackAPI(callback: (result: number) => void) {
  setTimeout(() => callback(42), 100);
}

function promiseAPI(): Promise<number> {
  const completer = new Completer<number>();
  callbackAPI((result) => completer.complete(result));
  return completer.getPromise();
}

const result = await promiseAPI();
```

### Timeout Patterns
Race between operation completion and timeout:
```typescript
const completer = new Completer<string>();
setTimeout(() => completer.completeError(new Error('Timeout')), 1000);

// Some async operation that might complete before timeout
asyncOp().then(result => completer.complete(result));

await completer.getPromise();
```

## Conventions

All async utilities follow these patterns:

1. **Promise-based**: All async operations return `Promise<T>`
2. **Error handling**: Use standard Error objects with `completeError()`
3. **Null-safety**: Explicit null checks and type guards
4. **Complete-once**: Most utilities enforce single-completion semantics

## Source

Translated from [Dart's async package](https://api.dart.dev/stable/dart-async/dart-async-library.html) with adaptations for GoodScript constraints.

**Total:** 2 libraries, 42 tests, 100% pass rate across TypeScript, GoodScript validation, and C++ native execution.
