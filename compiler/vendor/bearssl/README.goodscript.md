# BearSSL

**Version**: 0.6  
**License**: MIT  
**Source**: https://bearssl.org/

## About

BearSSL is a minimal TLS/SSL library designed for embedded systems and environments where OpenSSL is too large. It supports TLS 1.0 through 1.3.

## Usage in GoodScript

GoodScript vendors BearSSL as a **fallback** SSL implementation for systems without OpenSSL:

- **macOS/Linux**: Use system OpenSSL (preferred, 0 overhead)
- **Windows/minimal systems**: Use vendored BearSSL (fallback, ~300KB)

This hybrid approach provides:
- Zero overhead on Unix systems (system SSL)
- 100% HTTPS coverage on all platforms (BearSSL fallback)
- Small binary size (~300KB vs OpenSSL's 10MB)
- Simple build (plain C, no configure scripts)

## License

BearSSL is licensed under the MIT License. See `LICENSE.txt` in this directory for full text.

## Files Compiled

From this vendored copy, GoodScript compiles:
- `src/**/*.c` - All BearSSL source files (~277 files)
- Headers from `inc/`

## Build Process

BearSSL is compiled only when system OpenSSL is not available:
1. Detect system OpenSSL first
2. If not found, compile BearSSL sources
3. Use OpenSSL-compatible adapter layer
4. Link with generated code
5. Cache compiled library for fast rebuilds

See `compiler/src/backend/cpp/zig-compiler.ts` for implementation details.

## Attribution

BearSSL is Copyright (c) 2016 Thomas Pornin <pornin@bolet.org>

For full documentation, see https://bearssl.org/
