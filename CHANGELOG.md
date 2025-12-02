# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
