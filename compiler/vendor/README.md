# Vendored Dependencies

This directory contains third-party libraries bundled with GoodScript for ease of installation and deployment.

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

## Future Dependencies

Additional libraries that may be vendored in the future:

- **PCRE2** - For RegExp support (BSD license)
  - Currently requires system installation via brew/pkg-config
  - Plan: Vendor sources and compile on-the-fly (same pattern as MPS)

## License Compliance

All vendored dependencies are under permissive licenses (MIT, BSD) that allow:
- ✅ Use in commercial software
- ✅ Bundling/redistribution
- ✅ Modification (though we don't modify)

See each dependency's LICENSE file for full terms.
