# GoodScript Compiler v0.12.9

Complete TypeScript-to-C++/TypeScript compiler with binary compilation support and comprehensive runtime library.

## Installation

```bash
# Install globally
npm install -g goodscript

# Or use with pnpm
pnpm add -g goodscript
```

**Requirements**:
- **Node.js** v18+ (for all features)
- **Zig** (optional, only needed for `--gsCompile` to create native binaries)

### Why Zig is Optional

GoodScript takes a modular approach similar to Rust's architecture:
- **Core compiler** (Node.js only): Validates GoodScript restrictions and generates C++ code
- **Binary compilation** (requires Zig): Compiles generated C++ to native executables

This design offers several advantages:
- ⚡ **Lightweight installation**: Package stays small (<5MB) without bundling Zig (~50-80MB)
- 🎯 **Progressive enhancement**: Start with validation/C++ generation, add Zig when you need binaries
- 🔧 **Flexibility**: Use your preferred Zig version or system package manager
- 📦 **Separation of concerns**: Compiler and build toolchain are independent

**Without Zig installed**:
```bash
gsc --gsValidateOnly src/main-gs.ts  # ✅ Works - validates GoodScript restrictions
gsc --gsTarget cpp src/main-gs.ts    # ✅ Works - generates C++ code
```

**With Zig installed**:
```bash
gsc --gsTarget cpp --gsCompile -o myapp src/main-gs.ts  # ✅ Compiles to native binary
```

**Installing Zig** (when you need binary compilation):
```bash
# macOS
brew install zig

# Linux
# Download from https://ziglang.org/download/

# Windows
# Download from https://ziglang.org/download/
# Or use: winget install -e --id Zig.Zig
```

For complete CLI documentation, see [CLI.md](./CLI.md).

## Architecture

```
TypeScript Source
      ↓
[Phase 1: Frontend]
  - Parser (TypeScript AST)
  - Validator (Good Parts restrictions)
      ↓
[Phase 2: Analysis]
  - Ownership Analyzer (DAG for share<T>)
  - Null Checker (use<T> lifetime safety)
  - Type Signatures (structural typing)
      ↓
[Phase 3: IR Lowering]
  - TypeScript AST → GoodScript IR
  - SSA-based, typed, ownership-aware
      ↓
[Phase 4: Optimizer]
  - Constant folding
  - Dead code elimination
  - Multi-pass optimization
      ↓
[Phase 5: Code Generation]
  - C++ Codegen (ownership/gc mode)
      ↓
[Phase 6: Binary Compilation]
  - Zig compiler integration
  - Cross-platform native binaries
      ↓
Native Binary / TypeScript
```

## Key Improvements over v0.11

1. **Proper IR**: SSA-based, explicitly typed intermediate representation
2. **Single source of truth**: All type and ownership info in IR
3. **Clean separation**: Frontend, IR, optimizer, backend are independent
4. **Multiple backends**: C++ (ownership/GC modes), TypeScript
5. **Better optimizations**: IR enables dataflow analysis
6. **Binary compilation**: End-to-end native binary generation via Zig

## Directory Structure

```
src/
├── ir/              # IR types, builder, visitor, signatures
├── frontend/        # TS parsing, validation, lowering
├── analysis/        # Ownership & null checking
├── backend/         # Code generation (C++, TS)
│   └── cpp/         # C++ codegen + Zig compiler
├── optimizer/       # IR optimization passes
├── compiler.ts      # Main entry point
└── types.ts         # Shared types
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Test (394 tests passing)
pnpm test

# Watch mode
pnpm dev
```

## Status

✅ **Phases 1-8 Complete** (394 tests passing, 19 skipped)
- ✅ Phase 1: Frontend (validator, parser)
- ✅ Phase 2: Analysis (ownership, null checking, type signatures)
- ✅ Phase 3: IR Lowering (AST → IR, statement types, async context)
- ✅ Phase 4: Optimizer (constant folding, DCE)
- ✅ Phase 5: Code Generation (C++, string concat, async/await)
- ✅ Phase 6: Binary Compilation (Zig + cppcoro integration)
- ✅ Phase 7: Runtime Library (FileSystem, async/await, Math, JSON, String, Array, Map)
- ✅ Phase 8: Union Types (T | null, T | undefined)
- ✅ CLI Tool (`gsc` command - drop-in replacement for `tsc`)

**Working Features**:
- **Core Language**: Functions, lambdas, classes, arrays, maps, strings
- **Async/await**: Full Promise<T> support with cppcoro
- **Exception handling**: try-catch-finally
- **File I/O**: FileSystem sync/async API
- **Math operations**: All Math.* methods
- **String operations**: Concatenation, slice, includes, split, trim, etc.
- **Type safety**: Compile-time constant detection, union types
- **Automatic conversions**: Number-to-string in concatenation
- **Built-in globals**: console, Math, JSON, Promise, FileSystem, String, Array, Map

**Working Examples** (8 out of 12):
- ✅ 03-functions: Lambda captures, higher-order functions
- ✅ 04-arrays: Array operations, methods, iteration
- ✅ 05-maps: Map construction, get/set/delete, forEach
- ✅ 06-strings: String methods and operations
- ✅ 07-math: All Math methods + string concatenation
- ✅ 08-exceptions: try-catch-finally error handling
- ✅ 09-async-await: async/await with Promise handling
- ✅ 10-file-io: FileSystem sync/async file operations

**In Progress**:
- ⏳ HTTP client (curl compilation issues)
- ⏳ Object literals/structs (for classes example)

**Next Steps**:
- Fix curl compilation for HTTP support
- Implement object literals/structs
- Watch mode for `gsc`
- IDE integration (LSP server)

## File Extensions

GoodScript uses `-gs.ts` and `-gs.tsx` suffixes (not `.gs`):
- `math-gs.ts` - GoodScript TypeScript file
- `component-gs.tsx` - GoodScript TSX/React file

**Why this convention?**
- ✅ All TypeScript tooling works out of the box (VSCode, tsc, ESLint, Prettier)
- ✅ No special IDE plugins needed
- ✅ Files are valid TypeScript - just import type aliases
- ✅ Clear intent: `-gs` signals "follows GoodScript restrictions"
- ✅ Gradual adoption: mix `.ts` and `-gs.ts` files in same project

**Example**:
```typescript
// math-gs.ts
import type { own, share, use, integer, integer53 } from '@goodscript/types';

export function fibonacci(n: integer): integer {
  // Your GoodScript code here - fully type-checked by tsc
}
```

Then compile to native binary:
```bash
gsc --target cpp --compile src/math-gs.ts -o build/math
```

## TypeScript/JavaScript Output

**Note**: For TypeScript/JavaScript output, just use `tsc` directly on your `-gs.ts` or `-gs.tsx` files.
GoodScript files are valid TypeScript with type aliases:
```typescript
// Ownership types (semantics only enforced in C++ mode)
type own<T> = T;
type share<T> = T;
type use<T> = T;

// Integer types (full semantics only in C++ mode)
type integer = number;    // int32_t in C++, number in JS
type integer53 = number;  // int64_t in C++, safe integer in JS
```

Integer semantics are only guaranteed in C++ compilation mode.

## tsconfig.json Integration

The compiler reads `tsconfig.json` to auto-configure C++ compilation:

**Debug Mode** (`"sourceMap": true`):
```json
{
  "compilerOptions": {
    "sourceMap": true  // Enables -g flag, -O0 (no optimization), #line directives
  }
}
```
- Generates debug symbols in C++ binary (`-g`)
- Disables optimizations for easier debugging (`-O0`)
- Embeds `#line` directives mapping C++ lines → `-gs.ts` source lines
- Stack traces show original TypeScript file and line numbers

**Production Mode** (no `sourceMap` or `false`):
```json
{
  "compilerOptions": {
    "sourceMap": false  // Enables -O3 (full optimization), no #line directives
  }
}
```
- Maximum optimizations (`-O3`)
- Smaller binary size
- Faster execution
- No source location tracking

Override with CLI flags:
```bash
gsc --debug src/main-gs.ts       # Force debug mode with source maps
gsc --optimize 3 src/main-gs.ts  # Force optimization level
```

**How Source Maps Work:**

When `sourceMap: true`, the compiler embeds C preprocessor `#line` directives:

```cpp
// Generated C++ code
#line 1 "/path/to/math-gs.ts"
double add(double a, double b) {
#line 2 "/path/to/math-gs.ts"
  auto result = (a + b);
  return result;
}
```

This makes debuggers (gdb, lldb) and crash reports show:
```
math-gs.ts:2  instead of  math.cpp:47
```

## License

Licensed under either of:

- Apache License, Version 2.0 ([LICENSE-APACHE](../LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT License ([LICENSE-MIT](../LICENSE-MIT) or http://opensource.org/licenses/MIT)

at your option.
