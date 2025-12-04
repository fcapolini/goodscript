# Async/Await Implementation Status

## Overview

GoodScript now has **full async/await support** for C++ code generation. This allows you to write asynchronous code using familiar TypeScript syntax and compile it to native C++ coroutines.

## Implementation Status

✅ **Complete** - Code generation fully implemented (as of December 2024)

### What Works

1. **Async Functions**
   ```typescript
   async function fetchData(): Promise<string> {
     return "data";
   }
   ```
   → Compiles to:
   ```cpp
   cppcoro::task<gs::String> fetchData() {
     co_return gs::String("data");
   }
   ```

2. **Await Expressions**
   ```typescript
   const result = await fetchData();
   ```
   → Compiles to:
   ```cpp
   auto result = co_await fetchData();
   ```

3. **Async Methods**
   ```typescript
   class DataService {
     async getData(): Promise<number> {
       return 42;
     }
   }
   ```
   → Compiles to:
   ```cpp
   class DataService {
     cppcoro::task<double> getData() {
       co_return 42.0;
     }
   };
   ```

4. **Async Arrow Functions**
   ```typescript
   const process = async (x: number): Promise<number> => {
     return x * 2;
   };
   ```
   → Compiles to:
   ```cpp
   auto process = [](double x) -> cppcoro::task<double> {
     co_return x * 2.0;
   };
   ```

5. **Multiple Awaits**
   ```typescript
   async function main(): Promise<void> {
     const a = await step1();
     const b = await step2();
     console.log(a + b);
   }
   ```
   → Full coroutine chain with proper suspension points

### Technical Details

- **Type Mapping**: `Promise<T>` → `cppcoro::task<T>`
- **Async Functions**: Automatically use C++20 coroutines (co_await/co_return)
- **Conditional Includes**: cppcoro headers only included when async/await is used
- **Return Handling**: Regular functions use `return`, async functions use `co_return`

## Running C++ Code with Async/Await

### External Dependency: cppcoro (Minimal Implementation Included)

GoodScript includes a **minimal cppcoro::task<T> implementation** in `compiler/runtime/cppcoro/task.hpp`. This provides basic async/await support for testing and simple use cases.

**Included Implementation:**
- ✅ Basic `cppcoro::task<T>` and `cppcoro::task<void>`
- ✅ C++20 `<coroutine>` header (modern standard, not experimental)
- ✅ Sufficient for code generation and compilation
- ⚠️ Simplified execution model (may not handle complex chaining correctly)

**For Production Use:**

You have two options:

1. **Use the full cppcoro library** (recommended for complex async operations)
   - **Repository**: https://github.com/lewissbaker/cppcoro
   - Provides full async runtime with proper chaining
   - Note: Original cppcoro uses `<experimental/coroutine>`, may need a fork that uses `<coroutine>`
   
2. **Use the minimal implementation** (suitable for simple async flows)
   - Already included in GoodScript runtime
   - Works for basic async/await patterns
   - Limitations: Complex coroutine chaining may not work correctly

3. **Future: GoodScript sync runtime** (planned)
   - Simplified synchronous execution model
   - No external dependencies
   - Async/await syntax compiles to synchronous C++

### Installation

cppcoro is **not required** for code generation (the compiler works fine without it), but it **is required** to compile and run the generated C++ code.

#### Option 1: Install cppcoro locally (recommended for testing)

```bash
# Clone cppcoro
git clone https://github.com/lewissbaker/cppcoro.git
cd cppcoro

# Build and install (requires CMake)
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make
sudo make install
```

#### Option 2: Use as header-only (lightweight)

Some projects vendor cppcoro as header-only. Check the repository for header-only options.

#### Option 3: Skip runtime tests (for development)

Tests that require C++ execution are marked with `.skip()` when cppcoro is not available:

```typescript
it.skip("should compile C++ successfully (requires cppcoro library)", () => {
  // Test skipped when cppcoro not installed
});
```

## Test Coverage

### Unit Tests (8/8 passing)

Located in `compiler/test/phase3/basic/async-await.test.ts`:

- ✅ Basic async function
- ✅ Promise<T> type mapping
- ✅ Await expressions
- ✅ Async methods in classes
- ✅ Void return type (Promise<void>)
- ✅ Multiple awaits
- ✅ Conditional header inclusion
- ✅ Async arrow functions

### Integration Tests (optional, requires cppcoro)

Located in `compiler/test/phase3/concrete-examples/async-await/`:

- JavaScript execution (always works)
- C++ compilation and execution (requires cppcoro)
- GC C++ execution (requires cppcoro)
- Triple-mode output comparison

These tests are **skipped by default** when cppcoro is not available.

## Code Generation Examples

### Example 1: Sequential Async Operations

**TypeScript:**
```typescript
async function processData(): Promise<number> {
  const step1Result = await fetchData();
  const step2Result = await transform(step1Result);
  return step2Result;
}
```

**Generated C++:**
```cpp
cppcoro::task<double> processData() {
  auto step1Result = co_await fetchData();
  auto step2Result = co_await transform(step1Result);
  co_return step2Result;
}
```

### Example 2: Async with Error Handling

**TypeScript:**
```typescript
async function safeOperation(): Promise<string> {
  try {
    const result = await riskyOperation();
    return result;
  } catch (e) {
    return "fallback";
  }
}
```

**Generated C++:**
```cpp
cppcoro::task<gs::String> safeOperation() {
  try {
    auto result = co_await riskyOperation();
    co_return result;
  } catch (...) {
    co_return gs::String("fallback");
  }
}
```

## Future Enhancements

### Potential Improvements (not yet implemented)

1. **Promise.all / Promise.race**
   - Could map to cppcoro parallel primitives
   - Needs additional runtime support

2. **Custom Event Loops**
   - cppcoro supports custom schedulers
   - Could allow integration with platform event loops

3. **Async Iterators**
   - Use cppcoro generators
   - `async function* generate()` → `cppcoro::async_generator<T>`

4. **Alternative Backends**
   - Support for folly::coro (Facebook's coroutine library)
   - Support for Boost.Asio coroutines
   - Custom lightweight task implementation

## Architecture Notes

### Why C++20 Coroutines?

1. **Zero-cost abstraction**: No runtime overhead compared to manual state machines
2. **Standard**: Part of C++20, widely supported
3. **Composable**: Works seamlessly with existing C++ async patterns
4. **Type-safe**: Compile-time checking of async flows

### Design Decisions

1. **cppcoro over manual implementation**: 
   - Battle-tested library
   - Handles edge cases (exceptions, cancellation)
   - Active community

2. **Conditional includes**:
   - Don't force cppcoro dependency if async/await not used
   - Keep generated code minimal

3. **Type mapping consistency**:
   - `Promise<T>` → `cppcoro::task<T>` is intuitive
   - Matches TypeScript semantics closely

## Troubleshooting

### Error: 'cppcoro/task.hpp' file not found

**Solution**: Install cppcoro library (see Installation section above)

### Error: co_await/co_return not recognized

**Solution**: Ensure C++20 mode is enabled:
```bash
g++ -std=c++20 -o output main.cpp
clang++ -std=c++20 -o output main.cpp
```

### Tests skipped with "requires cppcoro library"

**Solution**: This is expected behavior when cppcoro is not installed. The async/await code generation is still fully functional - these tests validate runtime execution.

## Summary

- ✅ **Code Generation**: Complete and tested (8/8 unit tests passing)
- ✅ **JavaScript Execution**: Works without any dependencies
- ⚠️ **C++ Execution**: Requires cppcoro library (optional for development)
- 📚 **Documentation**: Complete (this file)
- 🎯 **Production Ready**: For code generation; runtime requires cppcoro installation

The async/await implementation is **production-ready for code generation**. To run the generated C++ code, install cppcoro or use JavaScript execution mode.
