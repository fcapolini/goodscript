# Vendored Dependencies

This directory contains third-party libraries bundled with GoodScript for ease of installation and deployment.

## cpp-httplib

**Version:** 0.28.0  
**License:** MIT  
**Source:** https://github.com/yhirose/cpp-httplib  
**Purpose:** HTTP/HTTPS client library (header-only)

### Files Included

- `httplib.h` - Complete HTTP/HTTPS client implementation (~13.6k LOC)

### Why Vendored?

cpp-httplib is header-only and vendored to:
1. Enable HTTP/HTTPS support with zero external dependencies
2. Work seamlessly with both system OpenSSL and vendored BearSSL
3. Provide modern HTTP client without complex build requirements

### Modifications

None. File is copied directly from the upstream repository with no changes.

---

## BearSSL

**Version:** 0.6  
**License:** MIT  
**Source:** https://bearssl.org/  
**Purpose:** SSL/TLS library (fallback when system OpenSSL unavailable)

### Files Included

- `src/**/*.c` - BearSSL source files (~277 files)
- `inc/` - Public headers
- `LICENSE.txt` - MIT license

### Why Vendored?

BearSSL is vendored as a fallback SSL implementation:
1. **Hybrid approach**: Use system OpenSSL when available (macOS/Linux)
2. **Fallback**: Use BearSSL when OpenSSL not found (Windows/minimal systems)
3. **Small footprint**: ~300KB compiled vs OpenSSL's 10MB
4. **Simple build**: Plain C, no configure scripts
5. **100% HTTPS coverage**: Works on all platforms

### Modifications

None. Files are copied directly from the upstream distribution with no changes.

---

## cppcoro

**Version:** Based on andreasbuhr/cppcoro (C++20 fork of lewissbaker/cppcoro)  
**License:** MIT  
**Source:** https://github.com/andreasbuhr/cppcoro  
**Purpose:** Async/await support via C++20 coroutines

### Files Included

- `include/cppcoro/*.hpp` - All public headers
- `include/cppcoro/detail/*.hpp` - Internal implementation headers  
- `lib/lightweight_manual_reset_event.cpp` - Synchronization primitive for sync_wait
- `lib/spin_wait.cpp`, `lib/spin_mutex.cpp` - Supporting utilities
- `LICENSE` - MIT license from original project

### Why Vendored?

cppcoro is vendored (rather than using git submodule) to:
1. Ensure npm package includes everything needed for async/await
2. Eliminate need for `git submodule update --init`
3. Match Go's philosophy of bundling dependencies
4. Simplify installation to just `npm i -g goodscript`

### Modifications

None. Files are copied directly from the upstream repository with no changes.

### Updating

To update to a newer version of cppcoro:

```bash
# In a temporary directory
git clone https://github.com/andreasbuhr/cppcoro.git
cd cppcoro
git checkout <desired-tag-or-commit>

# Copy to GoodScript
cp -r include/cppcoro/*.hpp /path/to/goodscript/compiler/vendor/cppcoro/include/cppcoro/
cp -r include/cppcoro/detail/*.hpp /path/to/goodscript/compiler/vendor/cppcoro/include/cppcoro/detail/
cp lib/lightweight_manual_reset_event.cpp lib/spin_wait.cpp lib/spin_mutex.cpp lib/*.hpp \
   /path/to/goodscript/compiler/vendor/cppcoro/lib/
cp LICENSE.txt /path/to/goodscript/compiler/vendor/cppcoro/LICENSE

# Test
cd /path/to/goodscript/compiler
npm test test/phase3/basic/async-await.test.ts
npm test test/phase3/concrete-examples/async-await.test.ts
```

## MPS (Memory Pool System)

**Version:** 1.118.0 (from git submodule)  
**License:** BSD 2-clause  
**Source:** https://github.com/Ravenbrook/mps  
**Purpose:** Garbage collection for GC mode

### Files Included

- `src/mps.c` - Main amalgamation file (includes all other .c files)
- `src/*.c` - All MPS source files (~140 files)
- `src/*.h` - All MPS header files (~90 files)
- `LICENSE` - BSD 2-clause license

### Why Vendored?

MPS is vendored and compiled on-the-fly to:
1. Support all platforms (darwin, linux, windows) and architectures (arm64, x64)
2. Eliminate pre-built binaries (previous `libmps.a` only worked on macOS arm64)
3. Remove git submodule dependency
4. Enable "Go for TypeScript developers" positioning (GC mode works everywhere)

### Build Process

MPS is compiled on-the-fly during test execution:

```bash
# Simple single-file compilation
cc -O2 -c mps.c -o mps.o

# Then link with GC mode code
zig c++ -std=c++20 -o program program.cpp mps.o
```

Compilation takes ~1-2 seconds and works on any platform with a C compiler.

### Modifications

None. Files are copied directly from the MPS git repository with no changes.

### Updating

To update to a newer version of MPS:

```bash
# Update the MPS submodule (if it still exists)
cd /path/to/goodscript/compiler/mps
git fetch origin
git checkout release-1.XXX.0

# Or clone fresh
git clone https://github.com/Ravenbrook/mps.git /tmp/mps
cd /tmp/mps
git checkout release-1.XXX.0

# Copy to vendor/
cp /tmp/mps/code/*.c /path/to/goodscript/compiler/vendor/mps/src/
cp /tmp/mps/code/*.h /path/to/goodscript/compiler/vendor/mps/src/
cp /tmp/mps/license.txt /path/to/goodscript/compiler/vendor/mps/LICENSE

# Test
cd /path/to/goodscript/compiler
npm test test/phase3/concrete-examples  # GC mode tests
```

## PCRE2 (Perl-Compatible Regular Expressions)

**Version:** 10.47  
**License:** BSD 3-clause with PCRE2 exception  
**Source:** https://github.com/PCRE2Project/pcre2  
**Purpose:** Regular expression support (RegExp class in runtime library)

### Files Included

- `src/pcre2_all.c` - Amalgamation file (includes all necessary .c files)
- `src/pcre2_*.c` - All PCRE2 8-bit source files (31 files)
- `src/*.h` - Required header files (config.h, pcre2.h, internal headers)
- `src/pcre2_chartables.c` - Pre-generated character tables (default C locale)
- `LICENSE` - BSD 3-clause license with PCRE2 exception

### Why Vendored?

PCRE2 is vendored and compiled on-the-fly to:
1. Remove system dependency (previously required `brew install pcre2`)
2. Support all platforms without pre-installed packages
3. Match MPS pattern: vendor sources, compile on-demand
4. Enable RegExp to work out-of-the-box with `npm i -g goodscript`

### Build Process

PCRE2 is compiled on-the-fly during compilation of programs using RegExp:

```bash
# Compile PCRE2 (8-bit variant, no JIT) using Zig's C compiler
zig cc -O2 -DPCRE2_CODE_UNIT_WIDTH=8 -DHAVE_CONFIG_H -DPCRE2_STATIC \
   -c pcre2_all.c -o pcre2_all.o
zig cc -O2 -DPCRE2_CODE_UNIT_WIDTH=8 -DHAVE_CONFIG_H -DPCRE2_STATIC \
   -c pcre2_chartables.c -o pcre2_chartables.o

# Then link with program code
zig c++ -std=c++20 -o program program.cpp pcre2_all.o pcre2_chartables.o
```

Compilation takes ~2-3 seconds and produces ~500KB total object files.

**Note:** JIT support is disabled (requires sljit git submodule). The interpreter-based
matcher is fast enough for GoodScript's use cases (simple pattern matching, string operations).

### Modifications

None. Files are copied directly from PCRE2 10.47 release with no changes.
We use the generic config files: `config.h.generic` → `config.h`, `pcre2.h.generic` → `pcre2.h`.

### Updating

To update to a newer version of PCRE2:

```bash
# Clone desired release
git clone --depth=1 --branch=pcre2-10.XX https://github.com/PCRE2Project/pcre2.git /tmp/pcre2
cd /tmp/pcre2/src

# Copy source files to vendor/
cp pcre2_auto_possess.c pcre2_chkdint.c pcre2_chartables.c.dist \
   pcre2_compile*.c pcre2_config.c pcre2_context.c pcre2_convert.c \
   pcre2_dfa_match.c pcre2_error.c pcre2_extuni.c pcre2_find_bracket.c \
   pcre2_jit_compile.c pcre2_maketables.c pcre2_match*.c pcre2_newline.c \
   pcre2_ord2utf.c pcre2_pattern_info.c pcre2_script_run.c \
   pcre2_serialize.c pcre2_string_utils.c pcre2_study.c \
   pcre2_substitute.c pcre2_substring.c pcre2_tables.c pcre2_ucd.c \
   pcre2_valid_utf.c pcre2_xclass.c \
   /path/to/goodscript/compiler/vendor/pcre2/src/

# Copy headers
cp pcre2.h.generic pcre2_internal.h pcre2_intmodedep.h pcre2_compile.h \
   pcre2_ucp.h config.h.generic \
   /path/to/goodscript/compiler/vendor/pcre2/src/

# Copy license
cp /tmp/pcre2/LICENCE.md /path/to/goodscript/compiler/vendor/pcre2/LICENSE

# Update runtime copies
cd /path/to/goodscript/compiler/vendor/pcre2/src
cp config.h.generic config.h
cp pcre2.h.generic pcre2.h
cp pcre2_chartables.c.dist pcre2_chartables.c

# Test
cd /path/to/goodscript/compiler
npm test test/phase3/runtime-regexp.test.ts
npm test test/phase3/concrete-examples  # Tests that use RegExp
```

---

## License Compliance

All vendored dependencies are under permissive licenses (MIT, BSD) that allow:
- ✅ Use in commercial software
- ✅ Bundling/redistribution
- ✅ Modification (though we minimize modifications)

See each dependency's LICENSE file for full terms.

## License

The GoodScript compiler itself is licensed under either of:

- Apache License, Version 2.0 ([LICENSE-APACHE](../../LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT License ([LICENSE-MIT](../../LICENSE-MIT) or http://opensource.org/licenses/MIT)

at your option.
