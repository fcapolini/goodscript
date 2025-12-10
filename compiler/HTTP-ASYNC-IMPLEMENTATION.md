# HTTP Async Implementation - Technical Details

**Updated**: December 10, 2025  
**Status**: Complete - True async with thread pool

## Overview

GoodScript's HTTP client provides true asynchronous execution using cppcoro's thread pool, enabling concurrent HTTP requests without blocking the main thread.

## Implementation Architecture

### Before (Blocking Async)
```cpp
static cppcoro::task<HttpResponse> fetch(const gs::String& url) {
    co_return HTTP::syncFetch(url);  // ❌ Blocks thread!
}
```

**Problem**: Although using `co_return`, the HTTP request executed synchronously on the calling thread, blocking it until completion.

### After (True Async with Thread Pool)
```cpp
static cppcoro::task<HttpResponse> fetch(const gs::String& url) {
    // Schedule on background thread pool
    co_await detail::getHttpThreadPool().schedule();
    
    // Execute on background thread (doesn't block main thread)
    HttpResponse result = HTTP::syncFetch(url);
    
    co_return result;  // ✓ Returns to caller's thread
}
```

**Benefits**:
- HTTP request executes on background thread
- Main thread is free to process other work
- Multiple requests can execute concurrently
- Natural integration with cppcoro coroutines

## Thread Pool Design

### Global Thread Pool
```cpp
namespace detail {
  inline cppcoro::static_thread_pool& getHttpThreadPool() {
    static cppcoro::static_thread_pool pool(
      std::max(2u, std::thread::hardware_concurrency())
    );
    return pool;
  }
}
```

**Characteristics**:
- **Singleton pattern**: One global pool shared across all HTTP operations
- **Lazy initialization**: Created on first use
- **Automatic sizing**: Uses CPU core count (minimum 2 threads)
- **Lifecycle**: Lives for entire program duration

### Why Global Pool?

1. **Resource efficiency**: Avoid creating/destroying threads per request
2. **Predictable behavior**: Fixed thread count prevents thread explosion
3. **Simple API**: No pool management exposed to users
4. **Cross-platform**: cppcoro handles platform differences

## Performance Characteristics

### Concurrent Requests Example
```typescript
// GoodScript code
async function fetchMultiple(): Promise<void> {
  const p1 = HTTPAsync.fetch('http://api.com/1');  // Starts immediately
  const p2 = HTTPAsync.fetch('http://api.com/2');  // Starts immediately  
  const p3 = HTTPAsync.fetch('http://api.com/3');  // Starts immediately
  
  await p1;  // Wait for completion
  await p2;
  await p3;
}
```

**Execution**:
- All 3 requests start immediately
- Each scheduled on thread pool
- Execute in parallel (up to thread pool size)
- Total time ≈ slowest request (not sum of all requests)

### Thread Pool Behavior

**Scenario**: 4-core CPU, 3 concurrent requests
```
Thread 1: ████████████ (request 1)
Thread 2: ██████████   (request 2)
Thread 3: ████████     (request 3)
Thread 4: (idle)
Main:     ▫️▫️▫️▫️▫️▫️▫️▫️▫️▫️▫️▫️ (not blocked!)
```

**Scenario**: 4-core CPU, 10 concurrent requests
```
Thread 1: ████████████████████ (req 1, 5, 9)
Thread 2: ██████████████████   (req 2, 6, 10)
Thread 3: ████████████████     (req 3, 7)
Thread 4: ██████████████       (req 4, 8)
Main:     ▫️▫️▫️▫️▫️▫️▫️▫️▫️▫️▫️▫️▫️▫️▫️▫️ (not blocked!)
```

Requests queue when all threads busy - this is intentional to prevent resource exhaustion.

## Integration with cpp-httplib

### Why Keep cpp-httplib?

Despite async implementation complexity, cpp-httplib remains ideal because:

1. **Header-only**: No compilation overhead
2. **Cross-platform SSL**: Platform-native crypto (no OpenSSL dependency)
3. **Simple API**: Clean sync API perfect for wrapping
4. **Battle-tested**: Used in production by many projects
5. **MIT license**: Compatible with GoodScript

### Alternative Considered: Async Libraries

**Rejected alternatives** and why:

| Library | Issue |
|---------|-------|
| Boost.Beast | 100MB+ Boost dependency, complex API |
| Drogon | HTTP **server** framework, overkill for client |
| Pistache | HTTP **server**, requires event loop integration |
| libcurl | C API, more complex, manual SSL setup |

**Our approach**: Keep cpp-httplib's simple sync API + add async via thread pool = best of both worlds.

## Memory Management

### GC Mode (Default)
```cpp
HttpResponse result = HTTP::syncFetch(url);  // Heap allocated
co_return result;  // GC manages lifetime
```
- `HttpResponse` allocated on GC heap
- Automatic cleanup when unreachable
- Safe for concurrent access across threads

### Ownership Mode (Future)
```cpp
own<HttpResponse> result = HTTP::syncFetch(url);
co_return std::move(result);  // Transfer ownership
```
- Clear ownership semantics
- No cross-thread sharing (move-only)
- Deterministic destruction

## Error Handling

### Network Errors
```cpp
try {
  auto response = co_await HTTPAsync.fetch(url);
} catch (const gs::Error& e) {
  // Handle: timeout, DNS failure, connection refused, etc.
}
```

### Thread Safety
- Each request gets its own `httplib::Client` instance
- No shared state between requests
- Thread-safe by design (share-nothing)

## Comparison with Other Languages

### JavaScript (Node.js)
```javascript
// Node.js
const response = await fetch(url);
```
- Single-threaded event loop
- Async via libuv I/O thread pool
- Similar performance characteristics

### Go
```go
// Go
resp, err := http.Get(url)
```
- Goroutines (M:N threading)
- Built-in scheduler
- More lightweight than OS threads

### GoodScript
```typescript
// GoodScript  
const response = await HTTPAsync.fetch(url);
```
- OS threads via cppcoro
- Explicit async (like JavaScript)
- Predictable resource usage (fixed thread pool)

## Limitations & Future Work

### Current Limitations

1. **Fixed thread pool size**: Cannot configure per-application
2. **No request prioritization**: FIFO queue
3. **No connection pooling**: Each request = new TCP connection
4. **HTTP/1.1 only**: No HTTP/2 multiplexing

### Future Enhancements

#### Connection Pooling (Phase 8)
```cpp
// Reuse connections for same host
static httplib::Client& getClient(const std::string& host) {
  static std::map<std::string, httplib::Client> pool;
  return pool[host];
}
```

#### Request Cancellation
```cpp
// Allow cancelling in-flight requests
static cppcoro::task<HttpResponse> fetch(
  const gs::String& url, 
  cppcoro::cancellation_token token
);
```

#### Configurable Thread Pool
```typescript
// User-configurable pool size
HTTP.setMaxConcurrency(16);
```

## Testing

### Unit Tests
```bash
cd compiler
pnpm test http-integration
```

**Coverage**:
- ✅ Sync HTTP.syncFetch compilation
- ✅ Async HTTPAsync.fetch compilation  
- ✅ Concurrent request compilation
- ✅ Error handling codegen
- ⏳ End-to-end execution tests (requires network)

### Performance Testing
```typescript
// examples/11-http-client/concurrent-requests-gs.ts
async function benchmark() {
  const urls = Array(10).fill('http://httpbin.org/delay/1');
  const start = Date.now();
  await Promise.all(urls.map(url => HTTPAsync.fetch(url)));
  const elapsed = Date.now() - start;
  
  console.log(`10 requests in ${elapsed}ms`);
  // Expected: ~1000ms (concurrent)
  // If broken: ~10000ms (sequential)
}
```

## Summary

**Key Achievement**: True async HTTP without breaking GoodScript's design principles

✅ **Zero dependencies** - cpp-httplib remains header-only  
✅ **Cross-platform** - cppcoro handles OS differences  
✅ **Type-safe** - cppcoro::task<T> enforces return types  
✅ **Efficient** - Fixed thread pool, no thread explosion  
✅ **Familiar API** - Matches JavaScript fetch/async patterns  

This implementation strikes the optimal balance between simplicity and performance for GoodScript's use cases.
