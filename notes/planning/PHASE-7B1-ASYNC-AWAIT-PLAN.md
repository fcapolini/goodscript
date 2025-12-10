# Phase 7b.1: Async/Await and Promise<T> - Implementation Plan

**Date**: December 9, 2025  
**Status**: Planning  
**Priority**: CRITICAL - Required for http and io modules

## Overview

Implement async/await syntax and Promise<T> type to enable asynchronous I/O operations in the stdlib. This is the foundation for the http and io modules.

## Requirements from STDLIB-REQUIREMENTS.md

### Required Syntax
```typescript
// Async function declaration
async function fetch(url: string): Promise<HttpResponse> {
  const response = await fetchImpl(url);
  return response;
}

// Async method
static async readText(path: string): Promise<string> {
  return await fs.promises.readFile(path, 'utf-8');
}

// Await expression
const data = await someAsyncFunction();
```

### Impact
- **30+ async functions** across stdlib modules
- **http module**: All async HTTP operations
- **io module**: All async file/directory operations

## Architecture

### 1. TypeScript AST Lowering

**Inputs**: TypeScript AST nodes
- `AsyncKeyword` on function declarations
- `AwaitExpression` for await syntax

**Outputs**: AST-level IR
- `IRAsyncFunction` (extends IRFunction with async flag)
- `IRAwaitExpression` (async operation)

**Files to modify**:
- `compiler/src/frontend/lowering.ts` - Add async/await lowering

### 2. IR Type System

**New Types**:
```typescript
// Promise type (generic over result type)
interface IRPromiseType extends IRType {
  kind: 'promise';
  resultType: IRType;  // Promise<T> → T
}

// Async function type
interface IRAsyncFunction extends IRFunction {
  async: boolean;  // true for async functions
  // Return type must be Promise<T>
}
```

**Files to modify**:
- `compiler/src/ir/types.ts` - Add Promise type
- `compiler/src/ir/builder.ts` - Add `types.promise(resultType)`

### 3. C++ Codegen with cppcoro

**cppcoro Integration**:
We already have cppcoro vendored in `compiler/vendor/cppcoro/`. It provides:
- `cppcoro::task<T>` - Async task type (like Promise<T>)
- `co_await` - C++20 coroutine support
- `co_return` - Return from coroutine

**Generated C++ Example**:
```typescript
// GoodScript
async function fetchData(url: string): Promise<string> {
  const response = await fetch(url);
  return response.text();
}
```

```cpp
// Generated C++
#include <cppcoro/task.hpp>

cppcoro::task<gs::String> fetchData(gs::String url) {
  auto response = co_await fetch(url);
  co_return response.text();
}
```

**Key Mappings**:
- `async function` → `cppcoro::task<T>` return type
- `await expr` → `co_await expr`
- `return value` → `co_return value`

**Files to modify**:
- `compiler/src/backend/cpp/codegen.ts` - Add async function and await codegen

### 4. Runtime Promise Implementation

**TypeScript Target**: Native Promise<T>
```typescript
// GoodScript async function
async function foo(): Promise<number> {
  return 42;
}

// Compiles to TypeScript as-is (no changes needed)
async function foo(): Promise<number> {
  return 42;
}
```

**C++ Target**: Wrapper around cppcoro::task<T>
```cpp
namespace gs {
  // Promise<T> → cppcoro::task<T>
  template<typename T>
  using Promise = cppcoro::task<T>;
  
  // Helper functions
  namespace promise {
    // Create resolved promise
    template<typename T>
    Promise<T> resolve(T value) {
      co_return value;
    }
    
    // Create rejected promise
    template<typename T>
    Promise<T> reject(Error error) {
      throw error;
    }
    
    // Promise.all (wait for multiple promises)
    template<typename... Ts>
    Promise<std::tuple<Ts...>> all(Promise<Ts>... promises);
  }
}
```

**Files to create**:
- `runtime/cpp/ownership/gs_promise.hpp` - Promise runtime
- `runtime/ts/promise.ts` - TypeScript Promise wrapper (if needed)

## Implementation Steps

### Step 1: IR Type System (Foundation)
**Goal**: Add Promise<T> type to IR

1. Add `IRPromiseType` to `ir/types.ts`
2. Add `types.promise(resultType)` builder helper
3. Add type signature support for Promise<T>
4. Update type checker to validate async function return types

**Tests**:
- `test/async-types.test.ts` - Promise type construction
- Verify `Promise<number>`, `Promise<string>`, nested promises

### Step 2: AST Lowering (Parser Integration)
**Goal**: Lower async/await from TypeScript AST to IR

1. Detect `AsyncKeyword` on function declarations
2. Add `async: boolean` flag to `IRFunction`
3. Lower `AwaitExpression` to `IRAwaitExpression`
4. Validate await only used in async functions
5. Validate async functions return Promise<T>

**Tests**:
- `test/async-lowering.test.ts` - Async function lowering
- Test async function declarations
- Test await expressions
- Test error cases (await outside async, wrong return type)

### Step 3: C++ Codegen (cppcoro)
**Goal**: Generate C++ coroutines with cppcoro

1. Import cppcoro headers
2. Generate `cppcoro::task<T>` for async functions
3. Generate `co_await` for await expressions
4. Generate `co_return` for return statements in async functions
5. Handle error propagation (exceptions in coroutines)

**Tests**:
- `test/async-codegen.test.ts` - C++ coroutine generation
- Verify cppcoro::task<T> generation
- Verify co_await/co_return generation
- Test with Zig compiler (end-to-end)

### Step 4: Runtime Promise Library
**Goal**: Provide Promise runtime support

1. Create `gs_promise.hpp` with Promise<T> alias
2. Implement `promise::resolve()`, `promise::reject()`
3. Implement `promise::all()` for multiple promises
4. Add Promise integration with event loop (if needed)

**Tests**:
- `examples/async-test-gs.ts` - End-to-end async/await test
- Test promise resolution, rejection
- Test promise chaining
- Test Promise.all

### Step 5: Integration Testing
**Goal**: Verify async/await works end-to-end

1. Create comprehensive async examples
2. Test with real async operations (timers, file I/O)
3. Benchmark performance vs TypeScript
4. Update documentation

**Tests**:
- `examples/async-fetch-test-gs.ts` - Simulated fetch
- `examples/async-file-test-gs.ts` - Async file operations

## Technical Challenges

### Challenge 1: Event Loop
**Problem**: C++ coroutines need an event loop to schedule tasks

**Solution Options**:
1. **Simple**: Use cppcoro's `sync_wait()` for blocking execution
2. **Advanced**: Implement event loop with cppcoro's `io_service`
3. **Future**: Integrate with libuv or Boost.Asio

**Recommendation**: Start with sync_wait() for Phase 7b.1, add full event loop in Phase 8

### Challenge 2: Error Handling in Coroutines
**Problem**: C++ exceptions in coroutines behave differently

**Solution**:
- Use cppcoro's exception handling
- Propagate exceptions through `co_await` chain
- Catch at top level with try/catch

### Challenge 3: Type Inference
**Problem**: Async function return type inference

**Solution**:
- Require explicit `Promise<T>` return type annotation
- Infer `T` from function body
- Validate return statements match `T`

### Challenge 4: Capture by Reference
**Problem**: Lambdas with `co_await` need careful capture semantics

**Solution**:
- Default to capture by value for async lambdas
- Warn on capture by reference (lifetime issues)
- Document best practices

## Testing Strategy

### Unit Tests (Compiler)
1. **IR Type Tests**: Promise<T> type construction
2. **Lowering Tests**: async/await AST → IR conversion
3. **Codegen Tests**: IR → C++ coroutine generation
4. **Type Checker Tests**: Async function validation

### Integration Tests (Runtime)
1. **Basic Async**: Simple async functions
2. **Promise Chaining**: then/catch/finally
3. **Promise.all**: Multiple concurrent promises
4. **Error Handling**: Exceptions in async functions
5. **Real I/O**: File operations (Phase 7b.2)

### Performance Tests
1. **Coroutine Overhead**: Measure task creation cost
2. **Context Switching**: Benchmark co_await performance
3. **Memory Usage**: Track promise allocation

## Dependencies

### Required Components
- ✅ cppcoro (already vendored in `compiler/vendor/cppcoro/`)
- ✅ C++20 coroutines (supported by Zig cc)
- ✅ Exception handling (Phase 7a.1 complete)

### Future Dependencies
- ⏳ Event loop (Phase 8)
- ⏳ File I/O runtime (Phase 7b.2)
- ⏳ HTTP runtime (Phase 7b.3)

## Success Criteria

### Phase 7b.1 Complete When:
1. ✅ Promise<T> type in IR
2. ✅ async/await AST lowering working
3. ✅ C++ coroutine codegen working
4. ✅ Basic Promise runtime (resolve, reject)
5. ✅ All tests passing (compiler + runtime)
6. ✅ Documentation updated

### Example Code Compiles:
```typescript
async function delay(ms: integer): Promise<void> {
  // Simplified - real implementation needs event loop
  return Promise.resolve();
}

async function fetchData(url: string): Promise<string> {
  console.log("Fetching:", url);
  await delay(100);
  return "mock data";
}

async function main(): Promise<void> {
  const data = await fetchData("https://example.com");
  console.log("Data:", data);
}
```

## Timeline Estimate

### Week 1: Foundation
- Day 1-2: IR type system (Promise<T>)
- Day 3-4: AST lowering (async/await)
- Day 5: Tests and validation

### Week 2: Codegen
- Day 1-2: C++ coroutine generation
- Day 3: cppcoro integration
- Day 4-5: Runtime Promise implementation

### Week 3: Integration
- Day 1-2: End-to-end testing
- Day 3: Documentation
- Day 4-5: Bug fixes and polish

**Total**: ~3 weeks for complete async/await support

## Future Enhancements (Post-Phase 7b.1)

### Phase 8: Full Event Loop
- cppcoro::io_service integration
- Timer support (setTimeout, setInterval)
- Non-blocking I/O
- Worker thread pool

### Phase 9: Advanced Async
- Async generators (async function*)
- Async iterators (for await...of)
- AbortSignal support
- Structured concurrency

### Phase 10: Performance
- Promise pool (reduce allocations)
- Coroutine frame optimization
- Zero-copy promise chaining

## References

### Documentation
- cppcoro: https://github.com/lewissbaker/cppcoro
- C++20 Coroutines: https://en.cppreference.com/w/cpp/language/coroutines
- TypeScript async/await: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-1-7.html

### Similar Projects
- Rust async/await: tokio runtime model
- Python asyncio: Event loop architecture
- Go goroutines: M:N threading model

---

**Next Steps**: Begin Step 1 (IR Type System) implementation

Last Updated: December 9, 2025
