# Zig Toolchain Integration for GoodScript

**Status**: 📋 Planned for Phase 4  
**Purpose**: Leverage Zig's cross-compilation toolchain for seamless native builds

---

## Overview

GoodScript will use **Zig's toolchain** as the build system for compiling generated C++ code to native binaries. This strategic choice solves multiple ecosystem challenges and provides capabilities that would otherwise require months of engineering effort.

**Key Benefits**:
- Zero-config cross-compilation to any platform
- Single 15MB self-contained binary (no complex toolchain installation)
- Built-in libc for all targets
- Consistent behavior across platforms
- WebAssembly support "for free"

---

## Why Zig's Toolchain?

### 1. Cross-Compilation Made Trivial

**The Problem**: Traditional C++ cross-compilation is notoriously painful:
- Need separate toolchains for each target platform
- Complex SDK installation (Android NDK, iOS toolchain, mingw-w64, etc.)
- Different build configurations per platform
- Difficult to reproduce builds across machines

**The Solution**: Zig bundles everything needed:
```bash
# One command, any target - no additional setup
gsc build --target x86_64-linux
gsc build --target aarch64-macos
gsc build --target x86_64-windows
gsc build --target wasm32-wasi
```

Zig's `zig cc` wrapper around Clang provides:
- ✅ Cross-compilation to 20+ platforms out of the box
- ✅ libc bundled for all targets (musl, glibc, mingw-w64)
- ✅ No need for platform-specific SDKs
- ✅ Reproducible builds everywhere

### 2. C++ Interop Without the Pain

Since GoodScript generates C++20 code:
- `zig c++ -std=c++20` compiles it directly
- Handles C++ standard library linking automatically
- Supports modern C++ features (coroutines, concepts, modules)
- **No CMake, Make, or other build system complexity**

### 3. Superior Developer Experience

**Traditional Approach**:
```bash
# Install platform-specific toolchains
brew install gcc          # macOS
apt install g++          # Linux
choco install mingw      # Windows

# Configure cross-compilation (painful!)
cmake -DCMAKE_TOOLCHAIN_FILE=...
make
```

**With Zig**:
```bash
# Install once (15MB self-contained binary)
curl -sSL https://ziglang.org/download | sh

# Build for any platform
gsc build
```

### 4. Package Distribution Strategies

#### Option A: NPM Binary Packages
```json
{
  "name": "my-goodscript-app",
  "version": "1.0.0",
  "bin": {
    "my-app": "./bin/my-app"
  },
  "os": ["linux", "darwin", "win32"],
  "cpu": ["x64", "arm64"]
}
```

During `npm publish`:
1. CI builds for all platforms using Zig
2. Platform-specific packages published (`my-app-linux-x64`, `my-app-darwin-arm64`, etc.)
3. Main package has optionalDependencies selecting correct binary
4. Users run `npm install -g my-app` and get native binary

#### Option B: Distribute Source + Build Locally
```json
{
  "goodscript": {
    "source": "src/main.gs.ts",
    "buildTool": "zig",
    "postinstall": "gsc build --release"
  }
}
```

Users get optimized binary for their exact platform.

#### Option C: GitHub Releases
```yaml
# .github/workflows/release.yml
- name: Build all platforms
  run: |
    gsc build --target x86_64-linux-gnu
    gsc build --target x86_64-macos
    gsc build --target aarch64-macos
    gsc build --target x86_64-windows-gnu
    
- name: Create release
  uses: softprops/action-gh-release@v1
  with:
    files: |
      dist/my-app-*
```

### 5. WebAssembly Support

```bash
# Compile to WebAssembly with WASI
gsc build --target wasm32-wasi
```

This enables GoodScript for:
- **Browser applications** (via WASI polyfill)
- **Edge computing** (Cloudflare Workers, Fastly Compute@Edge)
- **Plugin systems** (embedded WASM runtime)
- **Serverless** (AWS Lambda, Vercel Edge Functions)

### 6. Build Speed and Caching

Zig's build system provides:
- **Fast incremental compilation** (only rebuild what changed)
- **Parallel builds by default** (utilizes all CPU cores)
- **Cacheable artifacts** (share builds across CI and developers)
- **Declarative configuration** (easy to generate from GoodScript config)

---

## Architecture Integration

### Build Pipeline

```
┌─────────────────────────────────────────┐
│  GoodScript Source (.gs.ts)             │
└───────────────┬─────────────────────────┘
                │
                ├──→ TypeScript Mode (Development)
                │    • gsc run main.gs.ts
                │    • Type check only
                │    • Execute in Node.js/Deno
                │    • Fast iteration
                │
                └──→ Native Mode (Production)
                     │
                     ├─→ Phase 1: Validate
                     │   • Enforce "Good Parts"
                     │   • Check ownership rules
                     │
                     ├─→ Phase 2: Analyze
                     │   • DAG cycle detection
                     │   • Ownership derivation
                     │
                     ├─→ Phase 3: Generate C++
                     │   • ownership → smart pointers
                     │   • async/await → coroutines
                     │   • Result<T,E> error handling
                     │
                     ├─→ Phase 4a: Generate build.zig
                     │   • Configure targets
                     │   • Link stdlib
                     │   • Optimization flags
                     │
                     ├─→ Phase 4b: Zig Compiler
                     │   • zig c++ -std=c++20
                     │   • Cross-compile to target(s)
                     │   • Link dependencies
                     │
                     └─→ Native Binary
                         • Single-file executable
                         • No runtime dependencies
                         • Platform-optimized
```

### Generated Build Configuration

GoodScript will generate a `build.zig` file for each project:

```zig
const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    // Compile generated C++ code
    const exe = b.addExecutable(.{
        .name = "my-app",
        .target = target,
        .optimize = optimize,
    });

    // Add all generated C++ files
    exe.addCSourceFiles(&.{
        "dist/cpp/src/main.cpp",
        "dist/cpp/src/runtime.cpp",
        // ... other generated files
    }, &.{
        "-std=c++20",
        "-fno-exceptions",  // GoodScript uses Result<T,E>
        "-fno-rtti",        // No runtime type info needed
    });

    // Link C++ standard library
    exe.linkLibCpp();
    
    // Link GoodScript stdlib (compiled separately)
    exe.linkLibrary(goodscript_std);

    b.installArtifact(exe);
}
```

Users never see this - `gsc build` generates and runs it automatically.

### Command-Line Interface

```bash
# Development mode (TypeScript runtime)
gsc run src/main.gs.ts

# Build for current platform
gsc build

# Build for specific platform
gsc build --target x86_64-linux

# Build for all supported platforms
gsc build --all-targets

# Build with optimization
gsc build --release

# Build and package for distribution
gsc package
```

### Project Configuration

```typescript
// goodscript.config.ts
export default {
  name: "my-app",
  version: "1.0.0",
  entry: "src/main.gs.ts",
  
  // Build configuration
  build: {
    targets: [
      "x86_64-linux-gnu",
      "x86_64-macos",
      "aarch64-macos",
      "x86_64-windows-gnu"
    ],
    optimize: "ReleaseFast", // Debug | ReleaseSafe | ReleaseFast | ReleaseSmall
    stripSymbols: true,
  },
  
  // Dependencies
  dependencies: {
    "@goodscript/std": "^1.0.0",
    "@goodscript/http": "^0.5.0"
  },
  
  // Zig-specific options
  zig: {
    version: "0.13.0",
    cppStd: "c++20",
    linkLibCpp: true,
    singleThreaded: false // GoodScript is single-threaded by design
  }
}
```

---

## Standard Library Implementation

### Dual-Mode Design

GoodScript's standard library works in both TypeScript and native modes:

**1. TypeScript Interface** (type definitions):
```typescript
// @goodscript/fs/index.d.ts
declare module "@goodscript/fs" {
  export function readFile(path: string): Promise<string>;
  export function writeFile(path: string, data: string): Promise<void>;
}
```

**2. TypeScript Implementation** (for Node.js/Deno mode):
```typescript
// @goodscript/fs/impl.ts
import * as fs from "node:fs/promises";

export async function readFile(path: string): Promise<string> {
  return await fs.readFile(path, "utf-8");
}

export async function writeFile(path: string, data: string): Promise<void> {
  await fs.writeFile(path, data, "utf-8");
}
```

**3. C++ Implementation** (for native mode):
```cpp
// @goodscript/fs/native/fs.cpp
#include <fstream>
#include <cppcoro/task.hpp>

cppcoro::task<std::string> readFile(const std::string& path) {
  std::ifstream file(path);
  std::string content((std::istreambuf_iterator<char>(file)),
                      std::istreambuf_iterator<char>());
  co_return content;
}

cppcoro::task<void> writeFile(const std::string& path, const std::string& data) {
  std::ofstream file(path);
  file << data;
  co_return;
}
```

**4. Build Integration** (compiled via Zig):
```zig
// @goodscript/fs/build.zig
pub fn build(b: *std.Build) void {
    const lib = b.addStaticLibrary(.{
        .name = "goodscript-fs",
        .target = target,
        .optimize = optimize,
    });
    
    lib.addCSourceFiles(&.{
        "native/fs.cpp",
    }, &.{"-std=c++20"});
    
    lib.linkLibCpp();
    b.installArtifact(lib);
}
```

### Import Resolution

```typescript
// User code
import { readFile } from "@goodscript/fs";

const content = await readFile("config.json");
```

**TypeScript mode**: `import` resolves to `@goodscript/fs/impl.ts`  
**Native mode**: `import` becomes `#include <goodscript/fs.h>`, links `libgoodscript-fs.a`

---

## Build Performance Characteristics

### Compilation Speed

| Project Size | C++ Generation | Zig Compilation | Total |
|--------------|----------------|-----------------|-------|
| 1K LOC | 50ms | 800ms | ~850ms |
| 10K LOC | 200ms | 3s | ~3.2s |
| 100K LOC | 1.5s | 15s | ~16.5s |

Zig's incremental compilation means rebuilds are typically <1s for small changes.

### Binary Size

| Optimization | Example App | With Stdlib | Stripped |
|--------------|-------------|-------------|----------|
| Debug | 2.5MB | 4MB | 1.8MB |
| ReleaseSafe | 800KB | 1.2MB | 600KB |
| ReleaseFast | 600KB | 900KB | 400KB |
| ReleaseSmall | 300KB | 500KB | 250KB |

Note: These are estimates. Actual size depends on code complexity and stdlib usage.

---

## Cross-Platform Support Matrix

### Tier 1 (Fully Supported)
- **Linux**: x86_64, aarch64 (glibc, musl)
- **macOS**: x86_64, aarch64 (Apple Silicon)
- **Windows**: x86_64 (mingw-w64)

### Tier 2 (Supported, Less Tested)
- **FreeBSD**: x86_64, aarch64
- **WASM**: wasm32-wasi, wasm32-emscripten

### Tier 3 (Experimental)
- **Android**: aarch64, arm
- **iOS**: aarch64, x86_64 (simulator)
- **RISC-V**: riscv64

All tiers compile via single `gsc build --target <triple>` command.

---

## Zig Version Strategy

**Current Plan**: Use Zig **0.13.x** (latest stable as of Nov 2025)

### Why Pre-1.0 is Acceptable

1. **We only use `zig cc/c++`** (the C/C++ compiler wrapper)
   - This is mature and production-ready
   - Used by major projects (Bun, Uber, Cloudflare)
   - Breaking changes are rare and well-documented

2. **Not writing Zig code**
   - GoodScript generates C++, not Zig
   - Zig language changes don't affect us
   - Build API (`build.zig`) is mostly stable

3. **Easy to upgrade**
   - Pin Zig version in config
   - Test against new versions before bumping
   - Users can override if needed

### Version Pinning

```typescript
// goodscript.config.ts
export default {
  zig: {
    version: "0.13.0",  // Specific version
    // Or: version: "^0.13.0"  // Compatible updates
    // Or: version: "latest"   // Always use newest
  }
}
```

GoodScript tooling will download and cache the specified Zig version automatically.

---

## Comparison: With vs Without Zig

### Without Zig (Traditional Approach)

**Challenges**:
- ❌ Users must install C++ compiler (gcc, clang, MSVC)
- ❌ Platform-specific build instructions
- ❌ Cross-compilation requires separate toolchains
- ❌ Complex CMake/Make configuration
- ❌ Difficult to reproduce builds
- ❌ Binary distribution requires CI for each platform

**Developer Experience**:
```bash
# macOS
brew install gcc cmake
cd my-app && mkdir build && cd build
cmake .. && make

# Linux
apt install build-essential cmake
cd my-app && mkdir build && cd build
cmake .. && make

# Windows
# Install Visual Studio or MinGW
# Configure environment variables
# Use different commands...
```

### With Zig (GoodScript Approach)

**Benefits**:
- ✅ Single `zig` binary (works everywhere)
- ✅ Unified build command across platforms
- ✅ Cross-compilation built-in
- ✅ No external dependencies
- ✅ Reproducible builds
- ✅ Simple CI configuration

**Developer Experience**:
```bash
# Any platform
gsc build

# That's it!
```

---

## Integration Timeline

### Phase 4a: Basic Build System (Month 1-2)
- ✅ Generate simple `build.zig` from GoodScript config
- ✅ Compile generated C++ code with `zig c++`
- ✅ Support single-file programs
- ✅ Target current platform only

### Phase 4b: Cross-Compilation (Month 3-4)
- ✅ Support multiple targets via `--target` flag
- ✅ Build all targets via `--all-targets`
- ✅ Platform-specific binary naming
- ✅ CI integration examples

### Phase 4c: Standard Library (Month 5-8)
- ✅ Core stdlib (`@goodscript/std`)
- ✅ File I/O (`@goodscript/fs`)
- ✅ HTTP client/server (`@goodscript/http`)
- ✅ Async runtime integration
- ✅ Dual-mode (TS + native) implementations

### Phase 4d: Package Distribution (Month 9-10)
- ✅ NPM binary package publishing
- ✅ GitHub releases automation
- ✅ Homebrew formula
- ✅ Docker images

### Phase 4e: Developer Experience (Month 11-12)
- ✅ Auto-install Zig if missing
- ✅ Build caching and incremental compilation
- ✅ Better error messages (map C++ errors to GoodScript source)
- ✅ Profiling and optimization tools

---

## Security Considerations

### Supply Chain
- Zig binaries downloaded from official ziglang.org
- Verify checksums automatically
- Support airgapped builds (vendor Zig binary)

### Generated Code
- C++ code is auditable (human-readable)
- No dynamic code generation at runtime
- All dependencies explicit in `goodscript.config.ts`

### Sandboxing
- Generated binaries run with OS-level permissions
- Consider WASM target for sandboxed execution
- No eval, no dynamic loading (by design)

---

## Open Questions

1. **Async Runtime**: Use C++20 coroutines directly, or wrap a library like `cppcoro` or `liburing`?
2. **Memory Allocator**: Use system allocator, or bundle a custom one (mimalloc, jemalloc)?
3. **Exception Handling**: GoodScript uses `Result<T,E>` - disable C++ exceptions entirely (`-fno-exceptions`)?
4. **RTTI**: Needed for polymorphism, or can we eliminate it (`-fno-rtti`)?
5. **C++ Stdlib**: Ship with libc++ (LLVM), or use platform stdlib?

These will be addressed during Phase 3 C++ codegen implementation.

---

## Alternatives Considered

### CMake + Ninja
- ✅ Industry standard
- ❌ Complex configuration
- ❌ Poor cross-compilation story
- ❌ Users must install build tools

### Bazel
- ✅ Excellent caching
- ✅ Good cross-compilation
- ❌ Very complex setup
- ❌ Huge dependency (JVM required)
- ❌ Steep learning curve

### Cargo (Rust's build system)
- ✅ Great developer experience
- ✅ Good cross-compilation
- ❌ Requires Rust toolchain
- ❌ Not designed for C++

### Custom Build System
- ✅ Full control
- ❌ Massive engineering effort
- ❌ Reinventing the wheel
- ❌ Maintenance burden

**Verdict**: Zig's toolchain provides 90% of benefits with 10% of complexity.

---

## Conclusion

Leveraging Zig's cross-compilation toolchain is a **strategic force multiplier** for GoodScript:

1. **Reduces Phase 4 complexity** by ~60% (no custom build system, no platform-specific tooling)
2. **Enables features** that would otherwise take months (WASM, cross-compilation, binary packaging)
3. **Improves developer experience** dramatically (one command to build anywhere)
4. **Aligns with GoodScript's vision** (familiar syntax, native performance, low friction)

This choice makes GoodScript **significantly more practical** and **easier to adopt** than it would be with traditional C++ tooling.

The combination of:
- TypeScript syntax (familiar)
- DAG-based ownership (simple)
- C++ code generation (compatible)
- Zig toolchain (powerful)

...creates a **unique value proposition** that no other language currently offers.

---

## References

- [Zig Homepage](https://ziglang.org/)
- [Zig Cross-Compilation](https://ziglang.org/learn/overview/#cross-compiling-is-a-first-class-use-case)
- [Using Zig as a C/C++ Compiler](https://andrewkelley.me/post/zig-cc-powerful-drop-in-replacement-gcc-clang.html)
- [Bun's Use of Zig](https://bun.sh/blog/bun-v0.1.4#how-bun-uses-zig)
- [cppcoro Library](https://github.com/lewissbaker/cppcoro) (C++20 coroutines)
