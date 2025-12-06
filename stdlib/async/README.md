# @goodscript/async

Async utilities for GoodScript, translated from Dart's async package.

## Utilities

- **Completer** - Deferred Promise completion for custom async flows
- **delay** - Async delay/sleep utilities (`delay()`, `delayValue<T>()`)

## Installation

```bash
npm install @goodscript/async
```

## Usage

```typescript
import { Completer } from '@goodscript/async';
import { delay, delayValue } from '@goodscript/async';

// Deferred Promise completion
const completer = new Completer<number>();
setTimeout(() => completer.complete(42), 100);
const result = await completer.getPromise();

// Simple delay
await delay(1000); // Wait 1 second

// Delay with value
const value = await delayValue(500, 'ready'); // Wait 500ms, then return 'ready'
```

## Testing

```bash
npm test
```

## Documentation

See [API Reference](../docs/reference/async/README.md) for detailed documentation.
