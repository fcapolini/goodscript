# libcurl

**Version:** 8.7.1  
**License:** MIT-like (curl license)  
**Source:** https://curl.se/  
**Purpose:** HTTP/HTTPS client for stdlib HTTP module

## Files Included

- `lib/*.c` - All libcurl source files (133 files, ~2.8MB)
- `lib/*.h` - All libcurl headers (145 files)
- `include/curl/*.h` - Public API headers
- `lib/curl_config.h` - **CUSTOM**: Minimal configuration for GoodScript
- `LICENSE` - curl license (MIT-like)

## Configuration

We use a minimal `curl_config.h` that:

1. **Enables**: HTTP and HTTPS only
2. **Disables**: FTP, SMTP, IMAP, POP3, LDAP, Telnet, TFTP, Gopher, Dict, File, RTSP, SMB, MQTT
3. **Disables**: Cookies, crypto auth, proxy, netrc, verbose strings
4. **SSL/TLS**: 
   - macOS: Uses Secure Transport (native)
   - Windows: Uses Schannel (native)
   - Linux: Requires OpenSSL (or disable HTTPS)

This reduces binary size and compilation time significantly.

## Why Vendored?

libcurl is vendored to:
1. Ensure npm package includes everything needed for HTTP support
2. Eliminate need for system libcurl installation
3. Match Go's philosophy of bundling dependencies
4. Simplify installation to just `npm i -g goodscript`
5. Enable cross-platform HTTP support (macOS, Linux, Windows)

## Compilation

libcurl is compiled on-the-fly during build:

```bash
# Simple compilation (Zig handles all platforms)
zig cc -std=c99 -O2 \
  -DHAVE_CONFIG_H \
  -DCURL_STATICLIB \
  -I vendor/curl/include \
  -I vendor/curl/lib \
  -c vendor/curl/lib/*.c \
  -o build/curl.o

# Link with GoodScript code
zig c++ -std=c++20 -o program program.cpp build/curl.o
```

Compilation takes ~5-10 seconds and works on any platform with Zig.

## Platform Support

| Platform | SSL/TLS | Status |
|----------|---------|--------|
| macOS    | Secure Transport (native) | ✅ Full support |
| Windows  | Schannel (native) | ✅ Full support |
| Linux    | OpenSSL (optional) | ⚠️ HTTP only (no HTTPS without OpenSSL) |

For Linux HTTPS support, users can install OpenSSL development headers:
```bash
# Ubuntu/Debian
sudo apt-get install libssl-dev

# Fedora/RHEL
sudo dnf install openssl-devel

# Then rebuild with -DUSE_OPENSSL
```

## Modifications

- **`lib/curl_config.h`**: Custom minimal configuration (created by GoodScript team)
- All other files: Unmodified from curl 8.7.1 release

## Updating

To update to a newer version of libcurl:

```bash
# Download new version
cd /tmp
curl -L https://curl.se/download/curl-X.Y.Z.tar.gz -o curl.tar.gz
tar -xzf curl.tar.gz
cd curl-X.Y.Z

# Copy to GoodScript vendor directory
VENDOR=/path/to/goodscript/compiler/vendor/curl
cp -r lib $VENDOR/
cp -r include $VENDOR/
cp COPYING $VENDOR/LICENSE

# Restore custom config
# (Keep existing lib/curl_config.h)

# Test compilation
cd /path/to/goodscript/compiler
pnpm test test/http-integration.test.ts
```

## Size

- **Source**: ~2.8MB (all .c files)
- **Compiled**: ~500KB-1MB (depends on platform and optimization)
- **Impact**: Acceptable for zero-install toolchain

## License

libcurl uses a curl-specific license that is very permissive (MIT-like).

See `LICENSE` file for full text.

Key points:
- Free for commercial and non-commercial use
- Can modify and redistribute
- No warranty
- Must keep copyright notice

## References

- [libcurl Documentation](https://curl.se/libcurl/c/)
- [libcurl Easy Interface](https://curl.se/libcurl/c/libcurl-easy.html)
- [libcurl Multi Interface](https://curl.se/libcurl/c/libcurl-multi.html)
- [curl License](https://curl.se/docs/copyright.html)
