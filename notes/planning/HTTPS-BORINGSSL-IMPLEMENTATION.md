# HTTPS Support - Pragmatic Approach

**Date**: December 10, 2025  
**Status**: In Progress  
**Target**: Phase 7b.3 Enhancement

## Overview

Add HTTPS support to GoodScript's HTTP client with a pragmatic approach: detect system OpenSSL and enable HTTPS when available, gracefully fallback to HTTP-only when not.

## Revised Strategy

After investigating BoringSSL, its build complexity (assembly generation, CMake, platform-specific code) conflicts with GoodScript's "simple vendoring" philosophy. Instead:

1. **Detect system OpenSSL**: Check for OpenSSL at compile time
2. **Conditional HTTPS**: Enable when OpenSSL found, disable when not
3. **Clear messaging**: Inform users when HTTPS is unavailable
4. **Future-proof**: Document path to vendored SSL if needed later

## Goals

1. **Pragmatic approach**: Use system OpenSSL when available
2. **Cross-platform**: macOS (LibreSSL), Linux (OpenSSL), Windows (optional)
3. **No build failures**: Gracefully degrade to HTTP-only
4. **Modern TLS**: TLS 1.2/1.3 when SSL available

## Implementation Plan

### Phase 1: Vendor BoringSSL

**Tasks**:
1. Download BoringSSL source (~20MB)
2. Place in `compiler/vendor/boringssl/`
3. Create minimal build configuration
4. Document license (Apache 2.0 + ISC)

**BoringSSL Structure**:
```
vendor/boringssl/
├── LICENSE           # Apache 2.0 + ISC
├── README.md         # Attribution
├── crypto/          # Cryptography primitives
├── ssl/             # TLS/SSL implementation
└── include/         # Public headers
    └── openssl/     # OpenSSL-compatible API
```

### Phase 2: Build System Integration

**File**: `compiler/src/backend/cpp/zig-compiler.ts`

**Changes**:
1. Add `compileBoringSSL()` method
2. Build crypto library (libcrypto.a)
3. Build SSL library (libssl.a)
4. Cache compiled libraries
5. Link when `enableHTTP` is true

**Build Process**:
```typescript
async compileBoringSSL(vendorDir: string, options: CompileOptions): Promise<string[]> {
  // Compile crypto sources
  const cryptoSources = await this.findSourceFiles(
    path.join(vendorDir, 'boringssl/crypto')
  );
  const cryptoObjects = await this.compileObjects(cryptoSources, 'crypto');
  
  // Compile SSL sources
  const sslSources = await this.findSourceFiles(
    path.join(vendorDir, 'boringssl/ssl')
  );
  const sslObjects = await this.compileObjects(sslSources, 'ssl');
  
  return [...cryptoObjects, ...sslObjects];
}
```

### Phase 3: Enable HTTPS in cpp-httplib

**Files**:
- `compiler/runtime/cpp/gc/http-httplib.hpp`
- `compiler/runtime/cpp/ownership/gs_http.hpp`

**Changes**:
```cpp
// Before:
// #define CPPHTTPLIB_OPENSSL_SUPPORT

// After:
#define CPPHTTPLIB_OPENSSL_SUPPORT
```

**Update comments**:
```cpp
/**
 * Platform support:
 *   - macOS: HTTP/HTTPS via BoringSSL
 *   - Windows: HTTP/HTTPS via BoringSSL
 *   - Linux: HTTP/HTTPS via BoringSSL
 * 
 * Note: HTTPS enabled via vendored BoringSSL (zero external dependencies)
 */
```

### Phase 4: Testing

**New Tests**:
1. HTTPS GET request when OpenSSL available
2. HTTP fallback test
3. Error message when HTTPS unavailable
4. Mixed HTTP/HTTPS handling

**Test File**: `test/https-integration.test.ts`

```typescript
describe('HTTPS Integration', () => {
  it('should fetch from HTTPS endpoint when OpenSSL available', async () => {
    const code = `
      async function main(): Promise<void> {
        const response = await HTTPAsync.fetch('https://httpbin.org/get');
        console.log(response.status);
      }
      main();
    `;
    
    // Detect if OpenSSL is available
    const hasSSL = await detectSystemOpenSSL();
    
    if (hasSSL) {
      const result = await compileAndRun(code);
      expect(result.stdout).toContain('200');
    } else {
      // Should throw error about HTTPS not supported
      const result = await compileAndRun(code);
      expect(result.stderr).toContain('HTTPS not supported');
    }
  });
  
  it('should work with HTTP regardless of SSL', async () => {
    const code = `
      async function main(): Promise<void> {
        const response = await HTTPAsync.fetch('http://httpbin.org/get');
        console.log(response.status);
      }
      main();
    `;
    const result = await compileAndRun(code);
    expect(result.stdout).toContain('200');
  });
});
```

### Phase 5: Documentation Updates

**Files to Update**:
1. `.github/copilot-instructions.md` - Update Phase 7b.3 status
2. `compiler/docs/ARCHITECTURE.md` - Add BoringSSL to vendored deps
3. `notes/implementation/HTTP-ASYNC-IMPLEMENTATION.md` - Update SSL section
4. `README.md` - Mention HTTPS support

## Technical Details

### System OpenSSL Detection

| Platform | OpenSSL Location | Installation |
|----------|------------------|--------------|
| **macOS** | `/usr/lib` (LibreSSL), `/opt/homebrew` (OpenSSL) | Comes with OS, or `brew install openssl` |
| **Linux** | `/usr/lib` | `apt install libssl-dev` or `yum install openssl-devel` |
| **Windows** | User-installed | Download from openssl.org or use vcpkg |

### Why Conditional SSL?

1. **Simpler than vendoring** - BoringSSL has complex build (CMake, assembly generation, 50MB)
2. **Works out-of-box on macOS/Linux** - OpenSSL/LibreSSL usually present
3. **Degrades gracefully** - HTTP still works, clear error for HTTPS
4. **Standard practice** - Most tools use system SSL (curl, git, etc.)
5. **Security updates** - System OpenSSL gets security patches automatically

### Comparison: Vendoring vs System SSL

| Aspect | Vendored BoringSSL | System OpenSSL |
|--------|-------------------|----------------|
| Build complexity | High (CMake, ASM, 30+ min first build) | Low (detect + link) |
| Binary size | +15MB | +0MB (dynamic link) |
| Dependencies | Zero | System OpenSSL |
| Maintenance | Manual updates | OS handles updates |
| Cross-compilation | Complex | Platform-specific |
| Security patches | Manual | Automatic (OS) |

### Compilation Strategy

**With OpenSSL detected**:
```bash
zig c++ -std=c++20 -DGS_ENABLE_HTTPS \\\n  main.cpp mps.o cppcoro.o \\\n  -lssl -lcrypto \\\n  -o myapp\n```

**Without OpenSSL**:
```bash
zig c++ -std=c++20 \\\n  main.cpp mps.o cppcoro.o \\\n  -o myapp\n# HTTPS disabled, HTTP-only mode
```

### Runtime Behavior

**HTTPS URL with SSL support**:
```typescript
const response = await HTTPAsync.fetch('https://api.example.com');\n// Works! Returns response
```

**HTTPS URL without SSL support**:
```typescript
const response = await HTTPAsync.fetch('https://api.example.com');\n// Throws: "HTTPS not supported - rebuild with OpenSSL to enable HTTPS"
```

**HTTP URL (always works)**:
```typescript
const response = await HTTPAsync.fetch('http://api.example.com');\n// Works regardless of SSL support
```

## Security Considerations

1. **Certificate validation**: Enabled by default in cpp-httplib
2. **TLS version**: Minimum TLS 1.2 (BoringSSL default)
3. **Cipher suites**: Modern, secure ciphers only
4. **No custom CA certs yet**: Uses system trust store

## Performance Impact

**Binary size**:
- Before: ~500KB (HTTP only, statically linked)
- After: ~500KB (HTTP only, same)
- With SSL: ~500KB + system libssl/libcrypto (dynamically linked)
- Increase: 0KB (dynamic linking)

**Build time**:
- OpenSSL detection: ~0.5 seconds (compile test program)
- Subsequent builds: ~0s (cached result)
- Total impact: +0.5s on first build only

**Runtime**:
- HTTPS handshake: ~50-200ms (network dependent, same as any SSL)
- HTTP fallback: No overhead if using http://
- SSL library: Loaded dynamically only when HTTPS used

## Rollout Plan

1. ✅ Create implementation plan (this document)
2. ✅ Implement OpenSSL detection in zig-compiler.ts
3. ✅ Add conditional HTTPS support in runtime headers
4. ✅ Update HTTP error handling for HTTPS unavailable
5. ✅ **Vendor BearSSL as fallback SSL implementation**
6. ✅ **Implement BearSSL compilation in build system**
7. ✅ **Create OpenSSL compatibility shim for BearSSL**
8. ⏳ Test BearSSL compilation and linking
9. ⏳ Add integration tests
10. ⏳ Update documentation
11. ⏳ Test on macOS (with and without OpenSSL)
12. ⏳ Test on Linux
13. ⏳ Merge to main

## Implementation Summary (December 10, 2025)

**Phase 1 - System OpenSSL (Completed)**:
- ✅ OpenSSL detection at compile time (`detectOpenSSL()` in zig-compiler.ts)
- ✅ Conditional compilation flags (`GS_ENABLE_HTTPS`)
- ✅ Runtime error checking for HTTPS URLs without SSL support
- ✅ Automatic linking of `-lssl -lcrypto` when OpenSSL detected
- ✅ Graceful fallback to HTTP-only mode
- ✅ Clear user messaging about HTTPS availability
- ✅ Updated runtime headers (http-httplib.hpp)
- ✅ Existing HTTP tests passing (3/3)

**Phase 2 - BearSSL Fallback (In Progress)**:
- ✅ Vendored BearSSL 0.6 (~4.3MB source, 277 .c files)
- ✅ Created OpenSSL compatibility shim (bearssl_shim.hpp)
- ✅ Added BearSSL compilation support in zig-compiler.ts
- ✅ Compile all BearSSL source files (~277 files)
- ✅ Link BearSSL object files when system OpenSSL not found
- ✅ Added `GS_USE_BEARSSL` flag for conditional compilation
- ✅ Updated http-httplib.hpp to include shim when using BearSSL
- ⏳ Test BearSSL compilation (next step)
- ⏳ Implement full BearSSL I/O integration with cpp-httplib
- ⏳ HTTPS integration tests with BearSSL

**Pending**:
- ⏳ Complete BearSSL shim implementation (I/O callbacks)
- ⏳ HTTPS-specific integration tests
- ⏳ Documentation updates (ARCHITECTURE.md, README.md)
- ⏳ Cross-platform testing (Linux, Windows)

## Success Criteria

- [ ] HTTPS requests work when OpenSSL is available
- [ ] HTTP requests work regardless of OpenSSL
- [ ] Clear error message when HTTPS used without SSL
- [ ] OpenSSL detection works on macOS
- [ ] OpenSSL detection works on Linux
- [ ] Build succeeds even when OpenSSL not found
- [ ] Build time increase < 1s
- [ ] Binary size increase minimal (dynamic linking)
- [ ] All existing HTTP tests still pass
- [ ] Documentation updated with SSL requirements

## Future Enhancements

1. **Vendor minimal SSL**: If system SSL proves problematic, vendor BearSSL (simpler than BoringSSL, ~100KB)
2. **Custom CA certificates**: Allow loading custom trust store
3. **Client certificates**: Mutual TLS authentication
4. **Certificate pinning**: Pin specific certificates for security
5. **HTTP/2 support**: Upgrade to HTTP/2 over TLS

## References

- [cpp-httplib SSL support](https://github.com/yhirose/cpp-httplib#ssl-support)
- [OpenSSL Installation](https://www.openssl.org/source/)
- [BearSSL](https://bearssl.org/) (potential future alternative)
- [Zig C/C++ compilation](https://ziglang.org/documentation/master/#C)
