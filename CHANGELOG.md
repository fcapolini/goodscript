# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.11.0] - 2024-12-05 🎉 Go-Like Developer Experience Complete!

### Major Achievement: "Go for TypeScript Developers" Positioning Fully Enabled

This release completes the **Go-like DX Roadmap** - GoodScript now delivers the same "install and go" experience as Go, while keeping TypeScript syntax.

### Added

- **Phase 1: Vendored cppcoro** ✅ Complete
  - Bundled cppcoro C++20 coroutine library (70 files) for async/await support
  - Removed git submodule dependency
  - On-the-fly compilation with caching (~1 second first time)
  - All 20 async/await tests passing
  - **Impact**: Async/await works out-of-the-box, no external library needed

- **Phase 2 Part A: Vendored MPS (Memory Pool System)** ✅ Complete
  - Bundled MPS 1.118.0 sources (233 files, 84K lines) for garbage collection
  - Removed git submodule and architecture-specific pre-built libraries
  - On-the-fly compilation with caching (~2 seconds first time)
  - **CRITICAL**: GC mode now works on ALL platforms (darwin, linux, windows × arm64, x64)
  - Previously only worked on macOS Apple Silicon (arm64)
  - All 190 concrete example tests passing
  - **Impact**: GC mode (the strategic differentiator) works everywhere

- **Phase 2 Part B: Vendored PCRE2** ✅ Complete
  - Bundled PCRE2 10.47 sources (40 files, 82K lines) for regular expressions
  - Created `pcre2_all.c` amalgamation file for simplified compilation
  - On-the-fly compilation with caching (~3 seconds first time)
  - Removed system dependency (no more `brew install pcre2` required)
  - All 28 RegExp tests passing
  - **Impact**: RegExp works out-of-the-box on all platforms

- **Phase 3: Comprehensive Installation Documentation** ✅ Complete (Option C)
  - Created `docs/INSTALLATION.md` with detailed platform-specific instructions
  - Platform coverage: macOS (Homebrew, manual), Linux (snap, apt, dnf, pacman), Windows (winget, scoop)
  - Troubleshooting section and first-run dependency compilation explanation
  - Improved Zig detection with helpful error messages including platform-specific install commands
  - Updated README.md to emphasize Zig as only external dependency
  - **Impact**: Clear expectations, helpful guidance, matches Go's "require installation" approach

### Changed

- **Package contents now include vendored dependencies**
  - Added `runtime/` directory (612 KB) - C++ runtime headers
  - Added `vendor/` directory (6.1 MB) - cppcoro, MPS, PCRE2 sources
  - Total package size increase: ~6.7 MB (acceptable for "batteries included" philosophy)
  - All dependencies compile automatically on first use and are cached

- **Updated README.md prerequisites**
  - Removed outdated PCRE2 installation instructions
  - Emphasized Zig as only external dependency
  - Listed bundled dependencies (cppcoro, MPS, PCRE2)
  - Clarified "batteries included" philosophy

### Performance

- **First compilation overhead**: ~6 seconds total (one-time cost)
  - cppcoro: ~1 second
  - MPS: ~2 seconds
  - PCRE2: ~3 seconds
  - Subsequent compilations: instant (dependencies cached in tmpdir)

### Strategic Wins

✅ **Single command install**: `npm i -g goodscript` (only Zig separate)  
✅ **All dependencies bundled**: cppcoro, MPS, PCRE2 included  
✅ **Works everywhere**: darwin/linux/windows × arm64/x64  
✅ **Clear documentation**: Installation guide + helpful errors  
✅ **GC mode enabled**: Automatic garbage collection on all platforms  
✅ **RegExp built-in**: No system packages needed  
✅ **Async/await ready**: C++20 coroutines included  

**Comparison with Go:**
- Go: `brew install go` → one dependency
- GoodScript: `brew install zig` → one dependency
- Both: Everything else bundled
- Both: Cross-compile from any platform to any platform

### Migration Guide

For existing users:
1. Update to 0.11.0: `npm update -g goodscript`
2. First compilation will take ~6 seconds (dependencies compile and cache)
3. Remove any manual PCRE2 installations (no longer needed)
4. Enjoy universal cross-platform support!

### Test Results

- ✅ All 1169 compiler tests passing (100%)
- ✅ All 28 RegExp tests passing (100%)
- ✅ 195/198 concrete examples passing (98.5%)
- ✅ Phase 3.5 conformance: 84.4% native pass rate (27/32 TypeScript tests)

### Files Changed

- 3 commits across Phases 1, 2, and 3
- 300+ files added (vendored dependencies)
- 166,000+ lines of code added
- Package.json updated to include runtime/ and vendor/ directories

### Documentation

- New: `docs/INSTALLATION.md` - Comprehensive installation guide
- Updated: `docs/GO-LIKE-DX.md` - All phases marked complete
- Updated: `compiler/vendor/README.md` - Documents all vendored dependencies
- Updated: `README.md` - Prerequisites and bundled dependencies

---

## Previous Releases

### Changed

- **Relaxed GS108 Restriction** - Function declarations and expressions are now allowed, but cannot use `this`
  - Previously: All function declarations/expressions were prohibited (use arrow functions only)
  - Now: Function declarations/expressions allowed, but `this` keyword is prohibited within them
  - Use arrow functions for lexical `this` binding, or class methods for instance access
  - Benefits: Function hoisting, better performance, more TypeScript compatibility
  - Rationale: The real problem is dynamic `this` binding, not the function syntax itself
  - Updated validator to check for `this` usage in function bodies with proper nested function handling
  - Updated all tests and documentation to reflect the new rule

- **File Naming Convention Migration** - Migrated from `.gs.ts` double extension to `-gs.ts` suffix pattern
  - Files now use proper `.ts` extension with `-gs` suffix in basename (e.g., `module-gs.ts`)
  - Standard TypeScript tooling (VSCode, tsc, etc.) now works seamlessly without custom configuration
  - Imports must include the `-gs` suffix: `import from './module-gs'`
  - JavaScript output automatically removes `-gs` suffix: `module-gs.ts` → `module.js`
  - C++ output automatically removes `-gs` suffix: `module-gs.ts` → `module.cpp`
  - Updated compiler file renaming logic to correctly handle `outDir` vs source directory
  - All 24 test/example files migrated from `.gs.ts` to `-gs.ts`
  - All documentation updated to reflect new convention

### Fixed

- Fixed module resolution issues with `.gs.ts` double extension that prevented standard TypeScript tooling from working
- Fixed file renaming logic to look for compiled files in `outDir` instead of source directory
- Fixed CLI integration tests to use correct import syntax with `-gs` suffix
- Fixed test helper to prevent overwriting `dist/parser.js` during compilation

## [0.9.0] - 2025-12-02

### Added

- **GC Mode Performance Optimizations** 🚀 - Major performance improvements across all subsystems
  - Direct AST-based GC code generation (4x compilation speedup)
  - Optimized MVFF allocator with tuned parameters (20-30% runtime improvement)
  - Small String Optimization (SSO) with 23-byte inline buffer (50-80% fewer string allocations)
  - Bump allocator for short-lived objects (20x faster allocation at 7.76 ns/alloc)
  - Array growth optimization with 1.5x growth factor and memcpy for POD types (4% better memory efficiency)
  - Comprehensive benchmark suite validating all optimizations
  - New runtime components: `allocator-bump.hpp`, `string-sso.hpp`
  - AMC (Automatic Mostly-Copying) pool implementation (experimental, in `allocator-amc.hpp`)

### Changed

- **GC Runtime Improvements**
  - Updated `runtime/gc/allocator.hpp` with optimized MVFF parameters (64MB arena, 256MB commit limit)
  - Replaced `runtime/gc/string.hpp` with SSO implementation (backup in `string-old.hpp`)
  - Enhanced `runtime/gc/array.hpp` with 1.5x growth factor, memcpy/memmove optimizations
  - Updated `runtime/gs_gc_runtime.hpp` to include bump allocator
  - Updated `src/compiler.ts` to use `GcAstCodegen` for faster compilation

### Performance

- **Compilation**: 4x faster GC code generation (150 lines vs 360, AST-based vs string-based)
- **Runtime**: 20-30% faster execution from optimized MVFF allocator
- **Strings**: 50-80% reduction in heap allocations via SSO
- **Temporaries**: 20x faster allocation (7.76 ns vs 156 ns) via bump allocator
- **Arrays**: 99.5% memory efficiency (vs 95.4% with 2x growth)
- **Bulk operations**: 10-50x faster array shift/unshift for POD types (memcpy/memmove)

### Documentation

- Updated `docs/GC-MODE.md` with complete optimization details and benchmarks
- Added session notes documenting optimization process and results
- Performance characteristics section with concrete benchmark numbers

## [0.8.1] - 2025-12-02

### Changed

- **BREAKING**: Renamed ownership qualifiers for clarity and brevity
  - `Unique<T>` → `own<T>` (exclusive ownership)
  - `Shared<T>` → `share<T>` (shared ownership)
  - `Weak<T>` → `use<T>` (non-owning reference)
  - Updated all documentation, tests, and examples
  - More intuitive and matches common ownership terminology

### Fixed

- **DAG Analysis Enhancements** - Closed all 7 identified gaps in cycle detection
  - Index signatures: `[key: string]: share<T>` now properly analyzed
  - Tuple types: `[share<A>, share<B>]` now detected
  - Parenthesized unions: `(share<T> | null) | undefined` now unwrapped correctly
  - Generic type aliases: Full type parameter substitution with nested resolution
  - Mapped types: `{ [K in ...]: share<T> }` now analyzed
  - Conditional types: Both branches analyzed for ownership cycles
  - Nested type literals: Correctly detects cycles at any nesting depth
  - Added 18 comprehensive edge case tests (all passing)
  - 275 Phase 2 tests passing with no regressions

## [0.8.0] - 2025-12-02

### Added

- **Phase 3 Complete** 🎉 - C++ code generation now at 100% (1208/1208 tests passing)
  - AST-based code generation (migrated from legacy string-based approach)
  - Complete type mappings for primitives, ownership types, and collections
  - Full statement and expression generation support
  - Namespace wrapping (`gs::`) and keyword escaping
  - Runtime library (String, Array, Map, Set, JSON, console)
  - STL compatibility layer
  - Smart pointer wrapping helpers
  - Generic base classes with template argument mapping
  - Class inheritance support
  - Property accessor detection (array.length(), RegExp.global())
  - Array auto-resize with IIFE pattern
  - LiteralObject support for object literals
  - Optional field syntax (`field?: Type` → `std::optional<T>`)

- **Phase 3.5 TypeScript Conformance Testing** - Infrastructure 100% complete
  - TypeScript Compiler (TSC) conformance suite integration
  - Dual-mode validation (JavaScript transpilation + C++ compilation)

- **GC Mode (Experimental)** ⚠️ - C++ generation only, binary compilation not yet supported
  - GC mode generates valid C++ code but requires manual MPS library setup for compilation
  - Use ownership mode (default) for production binary compilation
  - Full automated GC mode support coming in future release
  - Feature filtering for "Good Parts" subset
  - Automated test batching and execution
  - JavaScript mode: 100% pass rate (17/17 eligible tests)
  - Native C++ mode: 84.4% pass rate (27/32 tests) - **14x improvement** from initial 5.9%
  - Auto-main() generation for declaration-only tests
  - typeof keyword handling (maps to `auto` in C++)
  - Function return type inference via TypeChecker API
  - Enhanced filters for TypeScript-specific features

- **C++ AST-Based Code Generation Infrastructure**
  - `src/cpp/ast.ts` - Complete C++ AST node type definitions (735 lines)
  - `src/cpp/builder.ts` - Fluent API for type-safe AST construction (405 lines)
  - `src/cpp/renderer.ts` - AST to formatted C++ source converter (672 lines)
  - Visitor pattern for extensibility and transformations
  - Smart pointer helpers (`makeUnique`, `makeShared`, `move`)
  - Type-safe construction at compile time
  - Composable and reusable code patterns

### Changed

- Migrated from legacy string-based to AST-based codegen (December 1, 2025)
- Legacy codegen removed - AST-based implementation is now sole approach
- Updated architecture documentation to reflect AST-based approach
- Set implementation now uses insertion-order preservation (vector+index pattern)
- Improved method return type inference and tracking
- Better parameter type handling in methods

### Fixed

- Property accessor detection for array.length and RegExp properties
- Array out-of-bounds writes now properly auto-resize
- Object literal generation with mixed types
- Optional field unwrapping in C++ output
- Multiple codegen bugs discovered via conformance testing

## [0.7.0] - 2025-11-23

### Added

- **Zig C++ Compiler Integration** - Integrated Zig as the default C++ compiler (`zig c++`)
  - Zero-config cross-compilation to any platform
  - Single 15MB self-contained binary (no complex toolchain installation)
  - Replaces g++/clang++ with consistent cross-platform toolchain

- **Native Binary Compilation** - New `--compile-binary` / `-b` CLI flag
  - Compile GoodScript directly to native executables
  - Aggressive optimizations: `-O3 -march=native -ffast-math -funroll-loops`
  - Descriptive error messages when Zig not available

- **Cross-Compilation Support** - New `--arch` / `-a` CLI flag for target architectures
  - `x86_64-linux` - Linux x86-64
  - `x86_64-windows` - Windows x64
  - `aarch64-macos` - macOS Apple Silicon
  - `wasm32-wasi` - WebAssembly
  - And many more (see `zig targets` for full list)

- **Performance Optimizations**
  - Inlined `array_get` and `map_get` helper functions
  - CPU-specific optimizations with `-march=native` for native builds
  - Fast math optimizations for numeric code
  - Loop unrolling for better performance

- **Comprehensive CLI Tests** - 34 new tests
  - 19 native compilation tests (C++ generation, binary compilation, cross-compilation)
  - 15 gs wrapper tests (command delegation, error handling)
  - All 618 tests passing (100% coverage)

### Changed

- Updated test infrastructure to use Zig instead of g++/clang++
- Optimization flags now context-aware (native vs cross-compilation)
- Documentation updated with Zig integration and CLI usage examples

### Fixed

- Consistent build behavior across all platforms
- Improved error messages for missing dependencies

## [0.6.0] - 2024-11-19

### Added

- Phase 3 C++ code generation foundation
- 12 concrete example programs (cli-args, json-parser, lru-cache, n-queens)
- Runtime equivalence testing (JS vs C++ output validation)
- Smart pointer support (unique_ptr, shared_ptr, weak_ptr)
- JavaScript-compatible array auto-resize
- Map and Set collection support

### Changed

- Improved null handling and optional unwrapping
- Better smart pointer member access
- Enhanced type inference for ownership qualifiers

## [0.5.0] - 2024-11-15

### Added

- Phase 2 ownership analysis and DAG enforcement
- Ownership derivation rules validation
- Null check analysis for weak references
- Pool Pattern support for complex data structures

## [0.4.0] - 2024-11-10

### Added

- Phase 1 "Good Parts" validation
- TypeScript restriction enforcement
- VSCode extension for real-time validation

## [0.3.0] - 2024-11-05

Initial public release with basic compiler infrastructure.

[0.8.0]: https://github.com/fcapolini/goodscript/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/fcapolini/goodscript/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/fcapolini/goodscript/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/fcapolini/goodscript/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/fcapolini/goodscript/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/fcapolini/goodscript/releases/tag/v0.3.0
