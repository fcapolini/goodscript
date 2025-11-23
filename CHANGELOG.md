# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.7.0]: https://github.com/fcapolini/goodscript/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/fcapolini/goodscript/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/fcapolini/goodscript/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/fcapolini/goodscript/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/fcapolini/goodscript/releases/tag/v0.3.0
