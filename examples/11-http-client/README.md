# Example 11: HTTP/HTTPS Client API

This example demonstrates the HTTP/HTTPS client API in GoodScript using **cpp-httplib** with full TLS certificate verification.

## Current Status

✅ **Production Ready**:
- HTTP/HTTPS support with automatic SSL detection
- Full TLS certificate verification using system CA bundles
- SNI (Server Name Indication) for virtual hosting
- Synchronous API (`HTTP.syncFetch()`)
- Asynchronous API (`HTTPAsync.fetch()`) with thread pool
- True concurrent requests via cppcoro thread pool
- System OpenSSL (macOS/Linux) + BearSSL fallback (Windows)
- Response structure with status, headers, and body
- Native binary compilation with zero dependencies

## Security Features

🔒 **HTTPS Support**:
- TLS/SSL encryption for secure connections
- Certificate verification using system trust anchors
- Hostname validation via SNI
- Multi-platform CA bundle support (macOS, Linux, FreeBSD)
- System OpenSSL preferred, BearSSL fallback for portability

## Why cpp-httplib?

We use cpp-httplib because:
- **Single header file** - Simple integration
- **MIT licensed** - Compatible with GoodScript
- **Header-only** - No separate compilation needed
- **Full-featured** - HTTP/HTTPS, redirects, timeouts
- **13.6k lines** - Lightweight compared to alternatives

## API Reference

### HTTP (Synchronous)

```typescript
// HTTPS GET request with certificate verification
const response = HTTP.syncFetch("https://www.example.com");

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
  // Async HTTPS request with certificate verification
  const response = await HTTPAsync.fetch("https://api.github.com/zen");
  
  console.log(response.status);
  console.log(response.body);  // GitHub zen quote
  
  return Promise.resolve(undefined);
}

// Concurrent requests
async function fetchMultiple(): Promise<void> {
  const urls = [
    "https://www.example.com",
    "https://api.github.com/zen",
    "https://httpbin.org/get"
  ];
  
  // All requests execute concurrently on thread pool
  const promises = urls.map(url => HTTPAsync.fetch(url));
  const responses = await Promise.all(promises);
  
  console.log("All requests completed!");
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
# Compile the HTTPS demonstration
../../compiler/bin/gsc --gsTarget cpp -o dist/http-client-demo src/main-gs.ts

# Run the demo
./dist/http-client-demo
```

## Implementation Details

- **HTTP Library**: cpp-httplib v0.28.0 (header-only, MIT license)
- **SSL Library**: System OpenSSL or BearSSL 0.6 (MIT license, fallback)
- **Runtime**: `compiler/runtime/cpp/gc/http-httplib.hpp`
- **Certificates**: `compiler/runtime/cpp/bearssl_certs.hpp` (CA bundle loader)
- **Thread Pool**: cppcoro::static_thread_pool (sized to CPU cores)
- **Timeouts**: Connection (10s), Read/Write (30s)
- **Features**: Redirect following, keep-alive, SNI

## Certificate Verification

The HTTP client automatically loads system CA certificates:
- **macOS**: `/etc/ssl/cert.pem`
- **Linux**: `/etc/ssl/certs/ca-certificates.crt`, `/etc/pki/tls/certs/ca-bundle.crt`
- **FreeBSD**: `/usr/local/share/certs/ca-root-nss.crt`

Certificates are parsed using BearSSL's PEM decoder and verified during TLS handshake.

## Examples Included

All examples compile and run successfully with full HTTPS support:

1. **src/main-gs.ts** - Complete HTTPS demonstration with multiple endpoints
   - Example.com (basic HTTPS)
   - GitHub API (JSON responses)
   - HTTPBin (SNI demonstration)
   - HTTP fallback example

2. **concurrent-requests-gs.ts** - Parallel async HTTPS requests
   - Demonstrates thread pool execution
   - Multiple concurrent connections
   - Performance analysis

3. **simple-https-test-gs.ts** - Minimal HTTPS verification
   - Quick certificate validation check
   - Single endpoint test

4. **http-methods-test-gs.ts** - HTTP methods verification
   - GET requests
   - POST with JSON data
   - POST with form data
   - Response headers parsing
   - Multiple status codes (200, 404, 500)

## Running Examples

```bash
# Compile and run main demo
../../compiler/bin/gsc --gsTarget cpp -o dist/main src/main-gs.ts
./dist/dist/main

# Compile and run concurrent requests
../../compiler/bin/gsc --gsTarget cpp -o dist/concurrent concurrent-requests-gs.ts
./dist/dist/concurrent

# Compile and run simple HTTPS test
../../compiler/bin/gsc --gsTarget cpp -o dist/https-test simple-https-test-gs.ts
./dist/dist/https-test

# Compile and run HTTP methods test
../../compiler/bin/gsc --gsTarget cpp -o dist/methods-test http-methods-test-gs.ts
./dist/dist/methods-test
```

## See Also

- [cpp-httplib GitHub](https://github.com/yhirose/cpp-httplib) - Official repository
- [PHASE-7B3-HTTP-CLIENT-PLAN.md](../../compiler/PHASE-7B3-HTTP-CLIENT-PLAN.md) - Original libcurl plan
- [http-httplib.hpp](../../compiler/runtime/cpp/gc/http-httplib.hpp) - Runtime implementation
