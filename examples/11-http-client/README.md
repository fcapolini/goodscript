# Example 11: HTTP Client API

This example demonstrates the HTTP client API in GoodScript using **cpp-httplib** (MIT license, header-only library).

## Current Status

✅ **Completed**:
- Switched from libcurl to cpp-httplib (simpler, header-only)
- HTTP runtime library (`gs::http` namespace) 
- Synchronous API (`HTTP.syncFetch()`)
- Asynchronous API (`HTTPAsync.fetch()`)
- Response structure (`HttpResponse`)
- Fixed codegen for `String.length` property access
- Compiles successfully to native binary

⏳ **In Progress**:
- Network request execution (requires socket/threading setup)
- Proper error handling and timeouts
- HTTPS support (requires OpenSSL integration)

## Why cpp-httplib?

We switched from libcurl to cpp-httplib because:
- **Single header file** - Much simpler integration
- **MIT licensed** - Compatible with GoodScript
- **No compilation** - Header-only library
- **No dependencies** - For basic HTTP (HTTPS needs OpenSSL)
- **13.6k lines** - vs 2.8MB of libcurl source

## API Reference

### HTTP (Synchronous)

```typescript
// Simple GET request
const response = HTTP.syncFetch("http://example.com");

// Access response data
console.log(response.status);      // 200
console.log(response.statusText);  // "OK"
console.log(response.body);        // Response body

// Check headers
if (response.headers.has("content-type")) {
  const ct = response.headers.get("content-type");
  console.log(ct);
}
```

### HTTPAsync (Asynchronous)

```typescript
async function fetchData(): Promise<void> {
  // Async GET request
  const response = await HTTPAsync.fetch("http://example.com");
  
  console.log(response.status);
  console.log(response.body);
  
  return Promise.resolve(undefined);
}
```

### Response Structure

```typescript
interface HttpResponse {
  status: number;                    // HTTP status code (200, 404, etc.)
  statusText: string;                // Status text ("OK", "Not Found", etc.)
  headers: Map<string, string>;      // Response headers
  body: string;                      // Response body as string
}
```

## Build and Run

```bash
# Compile the demonstration
../../compiler/bin/gsc --gsTarget cpp -o dist/http-client-demo src/main-gs.ts

# Run the demo
./dist/dist/http-client-demo
```

## Implementation Details

- **Library**: cpp-httplib v0.28.0 (header-only, MIT license)
- **Runtime**: `compiler/runtime/cpp/gc/http-httplib.hpp`
- **Vendor**: `compiler/vendor/cpp-httplib/httplib.h`
- **Size**: ~13,600 lines (single header)
- **HTTPS**: Disabled (would require OpenSSL)

## Next Steps

1. **Socket/Threading Setup** - cpp-httplib needs proper networking initialization
2. **Test with Local Server** - Validate with controlled HTTP server
3. **Error Handling** - Improve timeout and error reporting
4. **HTTPS Support** - Consider adding OpenSSL for secure connections
5. **Advanced Features** - Custom headers, POST/PUT/DELETE, authentication

## See Also

- [cpp-httplib GitHub](https://github.com/yhirose/cpp-httplib) - Official repository
- [PHASE-7B3-HTTP-CLIENT-PLAN.md](../../compiler/PHASE-7B3-HTTP-CLIENT-PLAN.md) - Original libcurl plan
- [http-httplib.hpp](../../compiler/runtime/cpp/gc/http-httplib.hpp) - Runtime implementation
