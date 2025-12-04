# Go-Like Developer Experience Roadmap

## Vision

Match Go's simplicity: **one install command, everything works**.

```bash
# The Goal
npm i -g goodscript
gsc build main.gs      # Compiles to native binary immediately
```

## Current State (Dec 2024)

**What works:**
- ✅ TypeScript → C++ code generation
- ✅ GC mode with MPS (bundled as `compiler/mps/libmps.a`)
- ✅ Async/await with cppcoro (git submodule)
- ✅ Runtime library (bundled in `compiler/runtime/`)

**Dependencies:**
1. **Zig** - C++ compiler (external, must install)
2. **cppcoro** - Git submodule (requires `git submodule update --init`)
3. **PCRE2** - Optional, for RegExp (via `brew install pcre2` or pkg-config)

**Pain points:**
- Git submodule not included in npm package by default
- PCRE2 requires system installation
- Not "install and go"

## Roadmap to Go-Like DX

### Phase 1: Vendor cppcoro ✅ Next
**Goal:** Remove git submodule dependency

**Why we CAN vendor cppcoro:**
- Small footprint (~50 source files, mostly headers)
- We only need: `task.hpp`, `sync_wait.hpp`, `lightweight_manual_reset_event.cpp`
- MIT license (compatible)
- Stable API (C++20 coroutines)

**Actions:**
1. Copy needed cppcoro sources to `compiler/vendor/cppcoro/`
   ```
   compiler/vendor/cppcoro/
   ├── include/cppcoro/    # Headers we use
   │   ├── task.hpp
   │   ├── sync_wait.hpp
   │   └── detail/...
   └── lib/
       └── lightweight_manual_reset_event.cpp
   ```
2. Update compilation paths in test helpers
3. Remove `.gitmodules` and `compiler/cppcoro/` submodule
4. Add LICENSE file crediting andreasbuhr/cppcoro
5. Test all async/await tests still pass

**Result:** `npm i -g goodscript` includes everything for async/await

### Phase 2: Vendor PCRE2 ✅ Should Do This
**Goal:** Remove system dependency for RegExp support

**Why we CAN vendor PCRE2:**
- **Precompiled static libraries** approach (like MPS):
  - Build `libpcre2-8.a` for major platforms:
    - macOS arm64 (`libpcre2-8-darwin-arm64.a`)
    - macOS x64 (`libpcre2-8-darwin-x64.a`)
    - Linux x64 (`libpcre2-8-linux-x64.a`)
    - Windows x64 (`pcre2-8-win64.lib`)
  - Bundle in `compiler/pcre2/` (similar to `compiler/mps/`)
  - Auto-select correct library based on platform

**OR - Simpler alternative:**
- Bundle PCRE2 source files (minimal set for basic regex)
- Compile on-the-fly like we do with cppcoro
- PCRE2 is BSD license (compatible)

**Actions (Precompiled approach):**
1. Build static PCRE2 libraries for target platforms
2. Add to `compiler/pcre2/`:
   ```
   compiler/pcre2/
   ├── libpcre2-8-darwin-arm64.a
   ├── libpcre2-8-darwin-x64.a
   ├── libpcre2-8-linux-x64.a
   ├── pcre2-8-win64.lib
   └── include/
       └── pcre2.h
   ```
3. Update runtime-helpers.ts to auto-select platform library
4. Update concrete-examples-helpers.ts similarly
5. Remove brew/pkg-config detection code

**Result:** RegExp works out of the box, no system dependencies

### Phase 3: Zig Auto-Install (Optional)
**Goal:** Remove last external dependency

**Two approaches:**

**Option A: Platform-specific npm packages** (Bun/Deno model)
- Create packages: `@goodscript/zig-darwin-arm64`, `@goodscript/zig-linux-x64`, etc.
- Main package uses `optionalDependencies`
- Downloads ~40-50MB per platform
- Auto-selects correct Zig binary

**Option B: Download on first use** (Lazy approach)
- Detect if Zig installed on first `gsc` run
- If not, prompt: "Download Zig? (50MB) [Y/n]"
- Cache in `~/.goodscript/zig/`
- Future runs use cached Zig

**Option C: Document clearly** (Go's approach)
- Go doesn't bundle itself, just requires installation
- Clear README: "Prerequisites: Install Zig"
- Helpful error if Zig missing: "Zig not found. Install from: https://ziglang.org/download/"

**Recommendation:** Start with Option C (document clearly), implement Option B if users request it.

### Phase 4: Alternative Compiler Backend (Future)
**Goal:** Remove Zig dependency entirely

**Options:**
- Bundle Clang/LLVM (huge, ~100MB+)
- Use WebAssembly-based C++ compiler (emscripten-style)
- Self-hosting: GoodScript compiles GoodScript (long-term)

**Not recommended:** Too complex for current phase. Zig is an excellent C++ compiler and actively maintained.

## Implementation Priority

### ✅ Immediate (Dec 2024)
1. **Phase 1: Vendor cppcoro** - Removes git submodule pain
2. **Phase 2: Vendor PCRE2** - Complete bundling story

### 📋 Short-term (Q1 2025)
3. **Phase 3, Option C: Document Zig requirement** - Set expectations clearly
4. Add runtime check for Zig with helpful error message

### 🔮 Medium-term (Q2-Q3 2025)
5. **Phase 3, Option B: Zig auto-install** - If users request it
6. Platform-specific optimizations

### 🌟 Long-term (2025+)
7. Self-hosting or alternative compiler backend

## Why Bundle Everything?

**Comparison with Go:**

| Aspect | Go | GoodScript (Target) |
|--------|----|--------------------|
| Install | `brew install go` | `npm i -g goodscript` |
| Compiler | Bundled | Zig (external) |
| Runtime | Bundled | Bundled ✅ |
| Std lib | Bundled | Bundled ✅ |
| Async | Bundled | Bundled (after Phase 1) |
| Regex | Bundled | Bundled (after Phase 2) |
| GC | Bundled | Bundled (MPS) ✅ |

**After Phase 1 + 2:**
- **Only Zig required** (like Go requires Go installed)
- **Everything else bundled** in npm package
- **No system dependencies** (no brew, pkg-config, git submodules)
- **Cross-platform** by default

## Success Metrics

**Developer Experience:**
1. ⏱️ **Time to first binary:** < 5 minutes
   - `npm i -g goodscript` (1-2 min)
   - `zig` installation (2-3 min)
   - `gsc build hello.gs` (< 10 sec)

2. 📦 **Package size:** < 10MB
   - Runtime: ~100KB
   - MPS: ~2MB
   - cppcoro: ~500KB
   - PCRE2: ~2MB
   - Other: ~1MB

3. 🎯 **Zero configuration:** Works immediately after install

4. 🚀 **Native performance:** 2-3x faster than Node.js (Go's benchmark territory)

## References

- **MPS (bundled):** `compiler/mps/libmps.a` (~2MB, pre-built)
- **cppcoro (submodule):** `compiler/cppcoro/` (to be vendored)
- **PCRE2 (external):** Via brew/pkg-config (to be vendored)
- **Zig:** External C++ compiler

## Notes

**Why Zig over Clang/GCC?**
- Cross-compilation out of the box
- Single binary (~40MB)
- Fast compile times
- Active development
- Go uses its own compiler, we use Zig - similar philosophy

**License Compatibility:**
- GoodScript: MIT
- cppcoro: MIT ✅
- MPS: Sleepycat (commercial use requires license, but free for open source)
- PCRE2: BSD ✅
- Zig: MIT ✅

All vendored dependencies are license-compatible.
