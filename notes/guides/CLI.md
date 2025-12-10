# GoodScript CLI (`gsc`)

The `gsc` command is a drop-in replacement for TypeScript's `tsc` compiler, with added support for GoodScript-specific features like native C++ compilation.

## Installation

```bash
# Install globally
npm install -g goodscript

# Or use via pnpm
pnpm add -g goodscript
```

## Quick Start

```bash
# Transpile to JavaScript (default, tsc-compatible)
gsc src/main-gs.ts

# Generate C++ code
gsc --gsTarget cpp src/main-gs.ts

# Compile to native binary
gsc --gsTarget cpp --gsCompile -o myapp src/main-gs.ts

# Use tsconfig.json
gsc --project tsconfig.json
```

## Command-Line Options

### TypeScript-Compatible Options

These work exactly like `tsc`:

| Option | Alias | Description |
|--------|-------|-------------|
| `--help` | `-h` | Show help message |
| `--version` | `-v` | Show version |
| `--project FILE` | `-p` | Path to tsconfig.json |
| `--watch` | `-w` | Watch mode (recompile on changes) |
| `--outDir DIR` | | Output directory |
| `--outFile FILE` | | Single output file |
| `--noEmit` | | Type-check only |
| `--sourceMap` | | Generate source maps |

### GoodScript-Specific Options (`--gs*`)

All GoodScript options use the `--gs` prefix (camelCase):

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `--gsTarget` | cpp, js, ts, haxe | js | Compilation target |
| `--gsMemory` | gc, ownership | gc | Memory mode (C++ only) |
| `--gsCompile` | - | false | Compile to binary |
| `--gsOptimize` | 0-3, s, z | 3 | Optimization level |
| `--gsTriple` | string | host | Target triple (e.g., x86_64-linux-gnu) |
| `--gsDebug` | - | false | Debug symbols |
| `--gsShowIR` | - | false | Print IR |
| `--gsValidateOnly` | - | false | Validate only |
| `--gsSkipValidation` | - | false | Skip validation |
| `-o FILE` | - | - | Binary output path |

## Common Workflows

### Development

```bash
# Fast iteration with debug symbols
gsc --sourceMap --gsTarget cpp --gsDebug src/

# Type-check only (fast)
gsc --noEmit src/**/*-gs.ts

# Validate GoodScript restrictions
gsc --gsValidateOnly src/main-gs.ts
```

### Production

```bash
# Optimized native binary (GC mode)
gsc --gsTarget cpp --gsCompile --gsOptimize 3 -o myapp src/main-gs.ts

# Optimized binary with ownership mode (zero-cost abstractions)
gsc --gsTarget cpp --gsMemory ownership --gsCompile --gsOptimize 3 -o myapp src/main-gs.ts
```

### Cross-Compilation

Zig enables zero-configuration cross-compilation to any supported platform:

```bash
# Linux x86_64 (from macOS/Windows)
gsc --gsTarget cpp --gsCompile --gsTriple x86_64-linux-gnu -o myapp-linux src/main-gs.ts

# macOS ARM64 (Apple Silicon) (from Linux/Windows)
gsc --gsTarget cpp --gsCompile --gsTriple aarch64-apple-darwin -o myapp-macos src/main-gs.ts

# macOS x86_64 (Intel) (from Linux/Windows)
gsc --gsTarget cpp --gsCompile --gsTriple x86_64-apple-darwin -o myapp-macos-intel src/main-gs.ts

# Windows x86_64 (from macOS/Linux)
gsc --gsTarget cpp --gsCompile --gsTriple x86_64-windows-gnu -o myapp.exe src/main-gs.ts

# Linux ARM64 (from any platform)
gsc --gsTarget cpp --gsCompile --gsTriple aarch64-linux-gnu -o myapp-arm64 src/main-gs.ts

# WebAssembly
gsc --gsTarget cpp --gsCompile --gsTriple wasm32-wasi -o app.wasm src/main-gs.ts
```

**Common Target Triples**:
- `x86_64-linux-gnu` - Linux x86_64
- `aarch64-linux-gnu` - Linux ARM64
- `x86_64-apple-darwin` - macOS Intel
- `aarch64-apple-darwin` - macOS Apple Silicon
- `x86_64-windows-gnu` - Windows x86_64
- `wasm32-wasi` - WebAssembly

**No toolchain setup required!** Zig includes cross-compilation support for all targets out of the box.

## Configuration File (`tsconfig.json`)

GoodScript reads standard `tsconfig.json` with an optional `goodscript` section:

```json
{
  "compilerOptions": {
    "outDir": "./dist",
    "sourceMap": true,
    "strict": true
  },
  "include": ["src/**/*-gs.ts"],
  "goodscript": {
    "target": "cpp",
    "memory": "gc",
    "compile": true,
    "optimize": 3,
    "outFile": "./bin/myapp"
  }
}
```

CLI flags override `tsconfig.json` settings:

```bash
# Override memory mode from config
gsc --gsMemory ownership --project tsconfig.json
```

## Memory Management Modes

### GC Mode (Default)

```bash
gsc --gsTarget cpp --gsMemory gc src/main-gs.ts
```

- Uses garbage collection (Boehm GC)
- Allows cyclic references
- TypeScript/JavaScript-like behavior
- Easier migration path

### Ownership Mode

```bash
gsc --gsTarget cpp --gsMemory ownership src/main-gs.ts
```

- Smart pointers (`std::unique_ptr`, `std::shared_ptr`)
- Enforces DAG (no cycles in `share<T>`)
- Deterministic destruction
- Zero-cost abstractions

## Optimization Levels

| Level | Description | Use Case |
|-------|-------------|----------|
| `0` | No optimization | Development, debugging |
| `1` | Basic optimization | - |
| `2` | Moderate optimization | - |
| `3` | Full optimization | Production (default) |
| `s` | Size optimization | Embedded systems |
| `z` | Aggressive size | Minimal binaries |

**Auto-selection**: Debug mode (`--sourceMap`) defaults to `-O0`, production defaults to `-O3`.

## Examples

### Simple Compilation

```bash
# Input: src/main-gs.ts
export function main(): void {
  console.log("Hello, GoodScript!");
}

# Compile
gsc --gsTarget cpp --gsCompile -o hello src/main-gs.ts

# Run
./hello
```

### Multi-File Project

```bash
# Directory structure:
# src/
#   main-gs.ts
#   math-gs.ts
#   utils-gs.ts

# Compile all files
gsc --gsTarget cpp --gsCompile -o myapp src/main-gs.ts src/math-gs.ts src/utils-gs.ts

# Or use glob (future)
gsc --gsTarget cpp --gsCompile -o myapp src/**/*-gs.ts
```

### Debug Build

```bash
# With source maps and debug symbols
gsc --sourceMap --gsTarget cpp --gsCompile -o myapp-debug src/main-gs.ts

# Stack traces show original TypeScript line numbers!
```

## Troubleshooting

### Error: "No input files specified"

Provide at least one `.ts` or `-gs.ts` file:

```bash
gsc src/main-gs.ts
```

### Error: "--gsCompile requires --gsTarget cpp"

Binary compilation only works for C++ target:

```bash
gsc --gsTarget cpp --gsCompile -o myapp src/main-gs.ts
```

### Error: "Zig compiler not found"

Install Zig for binary compilation and cross-compilation:

```bash
# macOS
brew install zig

# Linux
# Download from https://ziglang.org/download/
# Or use package manager (version may be outdated):
sudo apt install zig  # Ubuntu/Debian
sudo dnf install zig  # Fedora

# Windows
# Download from https://ziglang.org/download/
# Or use winget:
winget install -e --id Zig.Zig
```

**Note**: Zig includes cross-compilation for all platforms out of the box - no additional toolchains needed!

## Advanced Usage

### Show IR (Intermediate Representation)

```bash
gsc --gsShowIR src/main-gs.ts
```

Useful for debugging compiler issues.

### Skip Validation (Dangerous!)

```bash
gsc --gsSkipValidation src/main-gs.ts
```

Bypasses GoodScript restriction checks. Only use if you know what you're doing.

### Custom Build Directory

```bash
gsc --gsTarget cpp --gsCompile --outDir build -o myapp src/main-gs.ts
```

Generated C++ files go to `build/`, binary at `myapp`.

## Next Steps

- [Language Guide](../docs/LANGUAGE.md) - Learn GoodScript syntax
- [Restrictions](../docs/RESTRICTIONS.md) - Understand GoodScript rules
- [Architecture](../docs/ARCHITECTURE.md) - Compiler internals

---

**Last Updated**: December 9, 2025
