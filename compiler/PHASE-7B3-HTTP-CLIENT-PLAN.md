# Phase 7b.3: HTTP Client Implementation

**Created**: December 9, 2025  
**Status**: Planning  
**Priority**: HIGH - Completes Phase 7b async runtime features

## Overview

Implement HTTP client runtime support to enable the `@goodscript/http` stdlib module. This requires vendoring libcurl, creating a C++ runtime wrapper, and integrating it as a built-in global similar to Console and FileSystem.

## Goals

1. ✅ Vendor libcurl (~1MB) in `compiler/vendor/curl/`
2. ✅ Create C++ HTTP runtime (`runtime/cpp/include/gs_http.hpp`)
3. ✅ Implement both sync and async HTTP operations
4. ✅ Add HTTP as built-in global to compiler
5. ✅ Create comprehensive integration tests
6. ✅ Update documentation

## Design

### Architecture Pattern

Follow the established pattern from FileSystem and Console:

```typescript
// Built-in global class (no import needed)
const response = await HTTP.fetch('https://api.example.com/data');
console.log(response.body);

// Or sync variant (blocking)
const response = HTTP.syncFetch('https://api.example.com/data');
```

### Runtime Structure

```
runtime/cpp/
├── include/
│   ├── gs_http.hpp         # NEW: HTTP client implementation
│   ├── gs_filesystem.hpp   # Existing pattern to follow
│   └── gs_runtime.hpp      # Master header (add #include "gs_http.hpp")
```

### Vendor Structure

```
compiler/vendor/
├── curl/                   # NEW
│   ├── include/
│   │   └── curl/
│   │       └── curl.h
│   ├── src/
│   │   └── curl_all.c      # Single amalgamated file
│   └── README.md           # Licensing and build info
├── cppcoro/                # Existing (async support)
├── mps/                    # Existing (GC)
└── pcre2/                  # Existing (RegExp)
```

## Implementation Steps

### Step 1: Vendor libcurl

**Options**:

A. **curl-impersonate** - Modern, minimal libcurl build
   - Single amalgamated file approach
   - ~500KB compiled
   - MIT license
   - Easier to integrate

B. **libcurl official** - Full featured
   - More dependencies (zlib, ssl)
   - ~1MB+ compiled
   - Harder to cross-compile
   - More features (HTTP/2, SSL, etc.)

**Recommendation**: Start with **curl-impersonate** or a minimal libcurl build focusing on HTTP/HTTPS only.

**Tasks**:
- [ ] Research minimal libcurl build options
- [ ] Create `compiler/vendor/curl/` structure
- [ ] Add curl source files (amalgamated if possible)
- [ ] Create README.md with licensing info
- [ ] Test compilation with Zig

### Step 2: C++ Runtime Implementation

**File**: `runtime/cpp/include/gs_http.hpp`

**Key Components**:

```cpp
namespace gs {
  namespace http {
    
    // Response type
    struct HttpResponse {
      int status;
      gs::String statusText;
      gs::Map<gs::String, gs::String> headers;
      gs::String body;
    };
    
    // Options type
    struct HttpOptions {
      std::optional<gs::String> method;
      std::optional<gs::Map<gs::String, gs::String>> headers;
      std::optional<gs::String> body;
      std::optional<int> timeout;
    };
    
    // Sync API
    class HTTP {
    public:
      static HttpResponse syncFetch(
        const gs::String& url,
        const std::optional<HttpOptions>& options = std::nullopt
      );
    };
    
    // Async API
    class HTTPAsync {
    public:
      static cppcoro::task<HttpResponse> fetch(
        const gs::String& url,
        const std::optional<HttpOptions>& options = std::nullopt
      );
    };
  }
}
```

**Implementation Details**:

1. **Sync Implementation** (`HTTP.syncFetch`):
   - Use libcurl easy interface
   - Blocking operations
   - Timeout support via `CURLOPT_TIMEOUT`
   - Error handling throws gs::Error

2. **Async Implementation** (`HTTPAsync.fetch`):
   - Use libcurl multi interface
   - Non-blocking with event loop integration
   - cppcoro::task<T> return type
   - Co_await compatible

3. **Helper Functions**:
   - `curlInit()` - Initialize CURL handle
   - `setCurlOptions()` - Configure request
   - `writeCallback()` - Capture response body
   - `headerCallback()` - Parse headers
   - `curlCleanup()` - Free resources

**Tasks**:
- [ ] Implement HttpResponse struct
- [ ] Implement HttpOptions struct
- [ ] Implement HTTP::syncFetch (blocking)
- [ ] Implement HTTPAsync::fetch (async)
- [ ] Add error handling
- [ ] Add timeout support
- [ ] Add header parsing
- [ ] Test with simple HTTP requests

### Step 3: Compiler Integration

**File**: `compiler/src/backend/cpp/codegen.ts`

Add HTTP as a built-in global (similar to Console, FileSystem):

```typescript
// In generateBuiltInGlobals()
private generateBuiltInGlobals(): string {
  return `
// Built-in globals
#include "gs_console.hpp"
#include "gs_filesystem.hpp"
#include "gs_http.hpp"        // NEW

namespace goodscript {
  // Make HTTP available globally
  using HTTP = gs::http::HTTP;
  using HTTPAsync = gs::http::HTTPAsync;
}
`;
}
```

**Tasks**:
- [ ] Add gs_http.hpp include
- [ ] Export HTTP and HTTPAsync to goodscript namespace
- [ ] Update type signatures for HTTP methods
- [ ] Test code generation

### Step 4: Zig Compiler Integration

**File**: `compiler/src/backend/cpp/zig-compiler.ts`

Add curl to vendored dependencies:

```typescript
const VENDORED_LIBS = {
  mps: { /* existing */ },
  pcre2: { /* existing */ },
  cppcoro: { /* existing */ },
  curl: {                    // NEW
    sources: ['vendor/curl/src/curl_all.c'],
    includes: ['vendor/curl/include'],
    flags: ['-DCURL_STATICLIB'],
    cache: 'curl.o'
  }
};
```

**Tasks**:
- [ ] Add curl to VENDORED_LIBS
- [ ] Configure curl compilation flags
- [ ] Test with Zig compilation
- [ ] Ensure cross-platform support

### Step 5: Testing

**Test File**: `compiler/test/http-integration.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { compile } from '../src/cli/compile.js';
import { exec } from 'child_process';

describe('HTTP Integration', () => {
  it('should compile sync HTTP fetch', async () => {
    const source = `
      const response = HTTP.syncFetch('https://httpbin.org/get');
      console.log(response.status);
      console.log(response.body);
    `;
    
    const cpp = await compile(source);
    expect(cpp).toContain('gs::http::HTTP::syncFetch');
  });
  
  it('should compile async HTTP fetch', async () => {
    const source = `
      async function fetchData(): Promise<string> {
        const response = await HTTPAsync.fetch('https://httpbin.org/get');
        return response.body;
      }
    `;
    
    const cpp = await compile(source);
    expect(cpp).toContain('gs::http::HTTPAsync::fetch');
    expect(cpp).toContain('co_await');
  });
  
  // End-to-end execution test
  it('should execute HTTP fetch', async () => {
    const source = `
      const response = HTTP.syncFetch('https://httpbin.org/status/200');
      console.log(response.status); // Should be 200
    `;
    
    // Compile and run
    const binary = await compileAndLink(source);
    const output = await executeProgram(binary);
    expect(output).toContain('200');
  });
});
```

**Test Cases**:
- [ ] Compile sync HTTP.syncFetch
- [ ] Compile async HTTPAsync.fetch
- [ ] End-to-end GET request
- [ ] POST request with body
- [ ] Custom headers
- [ ] Timeout handling
- [ ] Error handling
- [ ] HTTPS support

### Step 6: Documentation

**Files to Update**:

1. **`compiler/HTTP-CLIENT-GUIDE.md`** (NEW)
   - Complete API reference
   - Usage examples (sync and async)
   - Error handling patterns
   - Timeout configuration
   - Platform differences

2. **`STDLIB-REQUIREMENTS.md`**
   - Mark Phase 7b.3 as complete
   - Update test count
   - Update implementation status

3. **`.github/copilot-instructions.md`**
   - Add HTTP client to completed features
   - Update test count
   - Update vendor dependencies

4. **`compiler/vendor/README.md`**
   - Add curl section
   - Document version, license, size
   - Build instructions

**Tasks**:
- [ ] Create HTTP-CLIENT-GUIDE.md
- [ ] Update STDLIB-REQUIREMENTS.md
- [ ] Update copilot-instructions.md
- [ ] Update vendor/README.md

## Technical Challenges

### Challenge 1: Async Event Loop

**Problem**: libcurl multi interface requires event loop integration

**Solutions**:
- Use `curl_multi_wait()` with timeout
- Integrate with cppcoro's event loop (if available)
- Create simple polling loop for initial implementation

### Challenge 2: SSL/TLS Support

**Problem**: HTTPS requires SSL library (OpenSSL, mbedTLS, etc.)

**Solutions**:
- Start with HTTP-only (simpler)
- Vendor mbedTLS (smaller than OpenSSL)
- Use system SSL libraries where available

### Challenge 3: Cross-Platform Compatibility

**Problem**: Different network APIs on Windows vs POSIX

**Solutions**:
- libcurl handles this internally
- Ensure curl is compiled with proper flags
- Test on macOS, Linux, Windows

## Success Criteria

### Minimum Viable Product (MVP)

- [ ] HTTP GET requests work (sync)
- [ ] HTTPS GET requests work (sync)
- [ ] Custom headers supported
- [ ] Error handling functional
- [ ] Compiles with Zig on macOS

### Full Implementation

- [ ] All HTTP methods (GET, POST, PUT, DELETE, etc.)
- [ ] Async variants with cppcoro
- [ ] Timeout support
- [ ] Request/response headers
- [ ] Request body support
- [ ] Comprehensive error handling
- [ ] Cross-platform (macOS, Linux, Windows)
- [ ] 10+ integration tests passing

## Timeline Estimate

- **Step 1 (Vendor)**: 1-2 hours (research + setup)
- **Step 2 (Runtime)**: 4-6 hours (implementation + debugging)
- **Step 3 (Compiler)**: 1 hour (integration)
- **Step 4 (Zig)**: 1-2 hours (build system)
- **Step 5 (Testing)**: 2-3 hours (comprehensive tests)
- **Step 6 (Docs)**: 1-2 hours (documentation)

**Total**: 10-16 hours (~2 work days)

## Alternative Approaches

### Option A: Use Node.js fetch() for TypeScript target

**Pros**:
- Already implemented in stdlib/http
- No C++ changes needed
- Works immediately

**Cons**:
- Only for TypeScript/JavaScript targets
- Doesn't help C++ or Haxe targets

### Option B: Defer HTTP to stdlib only

**Pros**:
- Less compiler complexity
- Leverage platform-specific libraries

**Cons**:
- Stdlib can't compile to native
- Defeats purpose of cross-platform compilation

### Option C: Use Haxe sys.net.Http

**Pros**:
- Works across all Haxe targets
- Minimal vendoring

**Cons**:
- Doesn't help C++ target
- Requires Haxe backend (future work)

**Recommendation**: Proceed with **libcurl approach** for C++ target parity with TypeScript.

## References

- [libcurl Documentation](https://curl.se/libcurl/c/)
- [libcurl Easy Interface](https://curl.se/libcurl/c/libcurl-easy.html)
- [libcurl Multi Interface](https://curl.se/libcurl/c/libcurl-multi.html)
- [cppcoro Integration](https://github.com/lewissbaker/cppcoro)
- [FileSystem Implementation](../runtime/cpp/include/gs_filesystem.hpp) - Pattern reference
- [Async/Await Guide](ASYNC-AWAIT-GUIDE.md) - cppcoro integration reference

## Next Steps

1. Research minimal libcurl builds (curl-impersonate vs official)
2. Create vendor structure and test compilation
3. Implement sync HTTP.syncFetch
4. Add compiler integration
5. Create basic tests
6. Iterate on async support

---

**Status**: Ready to begin implementation  
**Blockers**: None - all prerequisites complete (async/await, FileSystem pattern established)
