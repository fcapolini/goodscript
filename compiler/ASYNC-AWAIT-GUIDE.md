# Async/Await Implementation Guide

**Last Updated**: December 9, 2025  
**Status**: Phase 7b.1 Steps 1-4 Complete (270 tests passing)

## Overview

GoodScript supports async/await syntax for asynchronous operations, compiling to:
- **TypeScript**: Native async/await (no transformation needed)
- **C++**: cppcoro coroutines (C++20 coroutines with cppcoro library)

This enables writing asynchronous code in a synchronous style while maintaining compatibility with both JavaScript/TypeScript and native C++ backends.

## Basic Syntax

### Async Functions

Declare functions as `async` and return `Promise<T>`:

```typescript
async function fetchData(): Promise<string> {
  return "Hello, async!";
}

async function getNumber(): Promise<number> {
  return 42;
}

async function doWork(): Promise<void> {
  console.log("Working...");
}
```

### Await Expressions

Use `await` to wait for promises inside async functions:

```typescript
async function processData(): Promise<number> {
  const data = await fetchData();
  const num = await getNumber();
  return num * 2;
}

async function main(): Promise<void> {
  const result = await processData();
  console.log("Result:", result);
}
```

## Implementation Details

### IR Type System

The compiler represents promises with a dedicated IR type:

```typescript
// IR representation
{
  kind: 'promise',
  resultType: IRType  // The type T in Promise<T>
}

// Function declarations track async flag
{
  kind: 'function',
  name: 'fetchData',
  async: true,  // Async flag
  returnType: { kind: 'promise', resultType: { kind: 'string' } }
}
```

### AST Lowering

The TypeScript AST is lowered to IR with async/await detection:

1. **Async detection**: Check for `AsyncKeyword` modifier
2. **Await lowering**: Convert `AwaitExpression` to await IR expression
3. **Type extraction**: Extract `T` from `Promise<T>` for await result type

```typescript
// TypeScript AST
async function test(): Promise<number> {
  const x = await getNumber();
  return x * 2;
}

// Lowered to IR
{
  kind: 'function',
  async: true,
  returnType: Promise<number>,
  body: {
    statements: [
      { kind: 'variable', name: 'x', init: { kind: 'await', expression: call(getNumber) } },
      { kind: 'return', value: binary(x, '*', 2) }
    ]
  }
}
```

### C++ Code Generation

Async functions compile to C++20 coroutines using cppcoro:

```typescript
// GoodScript
async function test(): Promise<number> {
  return 42;
}

// Generated C++
cppcoro::task<double> test() {
  co_return 42;
}
```

Key transformations:
- `Promise<T>` → `cppcoro::task<T>`
- `await expr` → `co_await expr`
- `return value` → `co_return value` (in async context)

### Runtime Support

The `gs::Promise<T>` class wraps `cppcoro::task<T>` and provides:

1. **Storage semantics**: Store promises as member variables
2. **Static helpers**: `Promise.resolve()`, `Promise.reject()`
3. **Awaitable interface**: `co_await` support
4. **Sync wait**: `sync_wait()` for testing

```cpp
// Promise static methods
template<typename T>
static Promise<T> resolve(T value);

template<typename T>
static Promise<T> reject(gs::Error error);

// Promise<void> specializations
static Promise<void> resolve();
static Promise<void> reject(gs::Error error);
```

## Compilation Pipeline

```
TypeScript Source
    ↓
[Validator] - Ensure async/await syntax is valid
    ↓
[AST Lowering] - Detect async/await, lower to IR
    ↓
[Type Checker] - Validate Promise<T> return types
    ↓
[IR Optimization] - Optimize coroutine code
    ↓
[C++ Codegen] - Generate cppcoro::task<T>, co_await, co_return
    ↓
[Zig Compiler] - Compile C++ to native binary
```

## Limitations & Future Work

### Current Limitations

1. **No Promise.all()**: Not yet implemented (planned for future)
2. **No Promise.race()**: Not yet implemented
3. **No Promise chaining**: `.then()`, `.catch()`, `.finally()` not yet supported
4. **No event loop**: Using `sync_wait()` for blocking execution
5. **Single-threaded**: No multi-threading support (by design)

### Future Enhancements

1. **Promise combinators**: `Promise.all()`, `Promise.race()`
2. **Promise methods**: `.then()`, `.catch()`, `.finally()`
3. **Event loop**: Full async I/O with cppcoro's `io_service`
4. **Async iterators**: `for await (const x of iter)`
5. **Async generators**: `async function* generate()`

## Examples

### Simple Async Function

```typescript
async function greet(name: string): Promise<string> {
  return `Hello, ${name}!`;
}

async function main(): Promise<void> {
  const message = await greet("World");
  console.log(message);  // Output: Hello, World!
}
```

### Multiple Awaits

```typescript
async function add(a: number, b: number): Promise<number> {
  return a + b;
}

async function calculate(): Promise<number> {
  const x = await add(10, 20);
  const y = await add(x, 30);
  return y;  // Returns 60
}
```

### Error Handling

```typescript
async function riskyOperation(): Promise<number> {
  throw new Error("Something went wrong");
}

async function handleErrors(): Promise<void> {
  try {
    const result = await riskyOperation();
    console.log("Result:", result);
  } catch (error) {
    console.log("Error:", error.message);
  }
}
```

### Async Class Methods

```typescript
class DataService {
  async fetch(url: string): Promise<string> {
    // Implementation
    return "data";
  }
  
  static async create(): Promise<DataService> {
    const service = new DataService();
    await service.initialize();
    return service;
  }
  
  private async initialize(): Promise<void> {
    console.log("Initializing...");
  }
}
```

## Testing

The async/await implementation has comprehensive test coverage:

- **11 tests**: IR type system (`async-types.test.ts`)
- **14 tests**: AST lowering (`async-lowering.test.ts`)
- **14 tests**: C++ codegen (`async-codegen.test.ts`)
- **3 tests**: Runtime library (`async-runtime.test.ts`)
- **Total**: 42 tests, all passing

### Running Tests

```bash
# All async tests
pnpm test async

# Specific test suites
pnpm test async-types
pnpm test async-lowering
pnpm test async-codegen
pnpm test async-runtime

# All tests
pnpm test
```

## Performance Considerations

### C++ Coroutines

C++20 coroutines are **zero-cost abstractions** when optimized:
- No heap allocation for simple coroutines (HALO optimization)
- Inline expansion of `co_await` chains
- Efficient state machine transformation

### cppcoro Library

The cppcoro library provides:
- Efficient task scheduling
- Minimal overhead for `co_await`
- Optional event loop integration

### Benchmarks

TODO: Add benchmarks comparing:
- TypeScript async/await
- C++ coroutines with cppcoro
- Traditional callback-based code

## Dependencies

### Compiler Dependencies

- TypeScript 5.6.0+ (for AST parsing)
- Zig 0.15.0+ (for C++ compilation)

### Runtime Dependencies

- **cppcoro**: Already vendored in `compiler/vendor/cppcoro/`
- **C++20**: Required for coroutine support
- **gs::Error**: Error class from runtime

### Conditional Compilation

The cppcoro headers are only included when async functions are present:

```cpp
#ifdef CPPCORO_TASK_HPP_INCLUDED
// Promise implementation using cppcoro
#endif
```

## Architecture Notes

### Two-Level IR

The compiler uses two IR levels:

1. **AST-level IR**: For initial lowering (`IRExpression`, `IRStatement`)
2. **SSA-level IR**: For analysis and optimization (`IRExpr`, `IRBlock`)

Async/await is represented in both levels:
- AST-level: `{ kind: 'await'; expression; type }`
- SSA-level: Used by optimizer (future work)

### Async Context Tracking

The C++ codegen tracks async context with a stack-based approach:

```typescript
private isAsyncContext = false;

generateFunctionBody(body, isAsync) {
  const wasAsync = this.isAsyncContext;
  this.isAsyncContext = isAsync ?? false;
  // ... generate body ...
  this.isAsyncContext = wasAsync;  // Restore
}
```

This ensures nested functions don't inherit async context incorrectly.

## Resources

- [cppcoro Documentation](https://github.com/lewissbaker/cppcoro)
- [C++20 Coroutines](https://en.cppreference.com/w/cpp/language/coroutines)
- [JavaScript Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [TypeScript Async/Await](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-1-7.html#asyncawait)

## Contributing

When adding async features:

1. Add IR type definitions in `ir/types.ts`
2. Update AST lowering in `frontend/lowering.ts`
3. Add C++ codegen in `backend/cpp/codegen.ts`
4. Update runtime in `runtime/cpp/ownership/gs_promise.hpp`
5. Add comprehensive tests for each layer
6. Update this documentation

## Changelog

### December 9, 2025 - Phase 7b.1 Complete

- ✅ Step 1: IR type system with `Promise<T>`
- ✅ Step 2: AST lowering for async/await
- ✅ Step 3: C++ codegen with cppcoro
- ✅ Step 4: Runtime Promise library
- ✅ Step 5: Integration testing and documentation
- Total: 42 tests passing, 270 tests overall
