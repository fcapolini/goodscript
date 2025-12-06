# delay / delayValue

Simple async delay utilities for creating timed pauses in async workflows.

Translated from [Dart's Future.delayed](https://api.dart.dev/stable/dart-async/Future/Future.delayed.html).

## Functions

### delay(milliseconds: number): Promise\<void\>

Creates a Promise that resolves after the specified duration.

**Parameters:**
- `milliseconds: number` - Duration to wait before resolving (in milliseconds)

**Returns:** `Promise<void>` - A Promise that resolves after the delay

**Example:**
```typescript
import { delay } from '@goodscript/async';

async function example() {
  console.log('Start');
  await delay(1000);  // Wait 1 second
  console.log('After 1 second');
}
```

### delayValue\<T\>(milliseconds: number, value: T): Promise\<T\>

Creates a Promise that resolves with a value after the specified duration.

**Type Parameters:**
- `T` - The type of value to return

**Parameters:**
- `milliseconds: number` - Duration to wait before resolving (in milliseconds)
- `value: T` - Value to resolve with after the delay

**Returns:** `Promise<T>` - A Promise that resolves with the value after the delay

**Example:**
```typescript
import { delayValue } from '@goodscript/async';

async function example() {
  const result = await delayValue(500, 'ready');
  console.log(result);  // 'ready' after 500ms
}
```

## Use Cases

### Sequential Delays
```typescript
async function workflow() {
  console.log('Step 1');
  await delay(1000);
  
  console.log('Step 2');
  await delay(1000);
  
  console.log('Done');
}
```

### Delayed Values
```typescript
async function loadingSimulation() {
  const data = await delayValue(2000, { status: 'loaded' });
  return data;
}
```

### Timeout Implementation
```typescript
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = delayValue(ms, 'TIMEOUT');
  const result = await Promise.race([promise, timeout]);
  
  if (result === 'TIMEOUT') {
    throw new Error('Operation timed out');
  }
  
  return result as T;
}
```

### Throttling
```typescript
async function throttledOperations() {
  for (const item of items) {
    await processItem(item);
    await delay(100);  // Wait 100ms between operations
  }
}
```

### Testing Async Behavior
```typescript
import { test, expect } from 'vitest';
import { delay } from '@goodscript/async';

test('async operation completes', async () => {
  let completed = false;
  
  setTimeout(() => { completed = true; }, 50);
  
  await delay(100);  // Wait for operation
  expect(completed).toBe(true);
});
```

## Performance Characteristics

- **Time Complexity:** O(1) - constant time to set up delay
- **Space Complexity:** O(1) - constant memory usage
- **Precision:** Depends on event loop timing (typically ±few milliseconds)

## Implementation Notes

### Current Implementation
The current implementation uses a busy-wait loop for GoodScript validation:
```typescript
const start = Date.now();
while (Date.now() - start < milliseconds) {
  // Busy wait
}
```

### Future Implementation
In production, this will use proper async mechanisms:
- JavaScript: `setTimeout()` with Promise
- C++: `std::this_thread::sleep_for()` or event loop integration

The busy-wait is temporary for validation purposes and will be replaced with efficient async timing.

## Differences from Dart

1. **Function Signature**: Dart uses `Future.delayed(Duration, [callback])`, GoodScript uses standalone functions
2. **Duration Type**: Dart uses `Duration` class, GoodScript uses milliseconds (number)
3. **Value Variant**: Separate `delayValue<T>()` function instead of optional callback parameter

## See Also

- [Completer](./Completer.md) - For custom Promise completion patterns
- [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) - JavaScript Promise API
