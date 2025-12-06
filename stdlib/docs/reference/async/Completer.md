# Completer\<T\>

A utility for creating a Promise whose completion is controlled externally. Useful for bridging callback-based APIs with async/await, implementing async gates, and building custom async control flows.

Translated from [Dart's Completer](https://api.dart.dev/stable/dart-async/Completer-class.html).

## Class Definition

```typescript
class Completer<T> {
  constructor();
  getPromise(): Promise<T>;
  complete(value: T): void;
  completeError(error: Error): void;
  isCompleted(): boolean;
}
```

## Type Parameters

- `T` - The type of value the Promise will resolve with

## Constructor

### Completer\<T\>()

Creates a new Completer instance.

**Example:**
```typescript
const completer = new Completer<number>();
```

## Methods

### getPromise(): Promise\<T\>

Returns the Promise controlled by this Completer. The Promise is created lazily on first call, and subsequent calls return the same instance.

**Returns:** `Promise<T>` - The Promise that will be completed when `complete()` or `completeError()` is called

**Example:**
```typescript
const completer = new Completer<string>();
const promise = completer.getPromise();

// Later...
completer.complete('done');
await promise;  // Resolves with 'done'
```

**Note:** If `complete()` or `completeError()` was called before `getPromise()`, the Promise will resolve/reject immediately when created.

### complete(value: T): void

Completes the Promise with the given value. If the Promise has already been retrieved via `getPromise()`, it will resolve. If not, the value is stored and the Promise will resolve immediately when `getPromise()` is called.

**Parameters:**
- `value: T` - The value to complete the Promise with

**Throws:** `Error` if the Completer has already been completed

**Example:**
```typescript
const completer = new Completer<number>();
completer.complete(42);

const result = await completer.getPromise();  // 42
```

### completeError(error: Error): void

Completes the Promise with an error. If the Promise has already been retrieved via `getPromise()`, it will reject. If not, the error is stored and the Promise will reject immediately when `getPromise()` is called.

**Parameters:**
- `error: Error` - The error to reject the Promise with

**Throws:** `Error` if the Completer has already been completed

**Example:**
```typescript
const completer = new Completer<string>();
completer.completeError(new Error('Failed'));

try {
  await completer.getPromise();
} catch (e) {
  console.log(e.message);  // 'Failed'
}
```

### isCompleted(): boolean

Returns whether the Completer has been completed (either with `complete()` or `completeError()`).

**Returns:** `boolean` - `true` if completed, `false` otherwise

**Example:**
```typescript
const completer = new Completer<void>();
console.log(completer.isCompleted());  // false

completer.complete(undefined);
console.log(completer.isCompleted());  // true
```

## Use Cases

### Async Gate Pattern

Wait for multiple async operations before proceeding:

```typescript
import { Completer } from '@goodscript/async';

const gate = new Completer<void>();
let count = 0;

async function task(id: number) {
  await someAsyncOperation(id);
  count++;
  if (count === 3) {
    gate.complete(undefined);
  }
}

// Start all tasks
task(1);
task(2);
task(3);

// Wait for all to complete
await gate.getPromise();
console.log('All tasks done');
```

### Callback Bridge Pattern

Convert callback-based APIs to Promise-based:

```typescript
function legacyAPI(callback: (result: string) => void) {
  setTimeout(() => callback('success'), 100);
}

function modernAPI(): Promise<string> {
  const completer = new Completer<string>();
  legacyAPI((result) => completer.complete(result));
  return completer.getPromise();
}

const result = await modernAPI();
```

### Timeout Pattern

Race between operation completion and timeout:

```typescript
async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number
): Promise<T> {
  const timeoutCompleter = new Completer<T>();
  
  setTimeout(
    () => timeoutCompleter.completeError(new Error('Timeout')),
    timeoutMs
  );
  
  return Promise.race([operation, timeoutCompleter.getPromise()]);
}

try {
  const result = await withTimeout(slowOperation(), 5000);
  console.log(result);
} catch (e) {
  console.log('Operation timed out');
}
```

### Manual Control Pattern

External code controls when async operation completes:

```typescript
class AsyncQueue<T> {
  private completer: Completer<T> | null = null;
  
  async next(): Promise<T> {
    this.completer = new Completer<T>();
    return this.completer.getPromise();
  }
  
  push(item: T): void {
    if (this.completer !== null && !this.completer.isCompleted()) {
      this.completer.complete(item);
      this.completer = null;
    }
  }
}

const queue = new AsyncQueue<number>();

// Consumer
async function consume() {
  const item = await queue.next();
  console.log('Got:', item);
}

// Producer
consume();  // Starts waiting
setTimeout(() => queue.push(42), 100);  // Completes the wait
```

### Complex Async Flow

Coordinate multiple async dependencies:

```typescript
const dataLoaded = new Completer<Data>();
const uiReady = new Completer<void>();

// Start data loading
loadData().then(data => dataLoaded.complete(data));

// Start UI initialization
initUI().then(() => uiReady.complete(undefined));

// Wait for both
const [data, _] = await Promise.all([
  dataLoaded.getPromise(),
  uiReady.getPromise()
]);

displayData(data);
```

## Performance Characteristics

- **Time Complexity:** 
  - `constructor()`: O(1)
  - `getPromise()`: O(1) first call (creates Promise), O(1) subsequent calls
  - `complete()`: O(1)
  - `completeError()`: O(1)
  - `isCompleted()`: O(1)

- **Space Complexity:** O(1) - stores Promise and completion state

## Implementation Details

### Complete-Before-getPromise Pattern

Completer supports calling `complete()` or `completeError()` **before** calling `getPromise()`:

```typescript
const c = new Completer<number>();
c.complete(42);  // Complete FIRST

const p = c.getPromise();  // Get Promise SECOND
const result = await p;  // Immediately resolves to 42
```

This is implemented by storing the completion state (`_isCompleted`, `_hasValue`, `_completedValue`, `_completedError`) and checking it in the Promise executor when the Promise is created.

### Optional Function Fields

In C++, the resolve/reject callbacks are stored as `std::optional<std::function<...>>` fields. The compiler automatically unwraps these with `.value()` when called:

```cpp
std::optional<std::function<void(T)>> _resolve;

// Calling the function
if (this->_resolve != std::nullopt) {
  this->_resolve.value()(value);  // .value() unwraps, then call
}
```

### Error on Double Completion

Attempting to complete a Completer twice throws an error:

```typescript
const c = new Completer<number>();
c.complete(42);
c.complete(100);  // Throws: "Completer already completed"
```

This prevents logic errors where the same Completer is inadvertently completed multiple times.

## Differences from Dart

1. **Single Promise Instance**: Dart's Future can only be awaited once. GoodScript's implementation returns the same Promise instance on multiple `getPromise()` calls, allowing it to be awaited multiple times.

2. **Explicit Error Type**: Dart accepts `Object` for errors. GoodScript requires `Error` type for type safety.

3. **No Sync Completer**: Dart has both `Completer()` and `Completer.sync()`. GoodScript only has the async version.

4. **Future vs Promise**: Dart uses `Future<T>`, GoodScript uses `Promise<T>`.

## See Also

- [delay](./delay.md) - Simple async delay utilities
- [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) - JavaScript Promise API
