# GoodScript v0.12 - GitHub Copilot Instructions

## Project Overview

GoodScript is a statically analyzable subset of TypeScript that compiles to both native C++ and JavaScript/TypeScript. It enforces "good parts" restrictions to ensure code is predictable, type-safe, and optimizable. It uses ES modules for code organization and supports incremental compilation.

**Current Status**: Phase 1-3 implementation complete (77 tests passing)
- ✅ Validator (15 language restrictions)
- ✅ IR type system with ownership semantics
- ✅ Type signature system (structural typing)
- ✅ AST → IR lowering
- ⏳ Ownership analyzer (stub)
- ⏳ Null checker (stub)
- ⏳ Optimizer (stub)
- ⏳ C++/TypeScript backends (stubs)

## Architecture

### Compilation Pipeline (5 Phases)

```
TypeScript Source
    ↓
[Phase 1] Validator → Enforce "Good Parts" restrictions (GS101-GS126)
    ↓
[Phase 2a] Ownership Analysis → Detect share<T> cycles (DAG requirement)
    ↓
[Phase 2b] Null Checker → Validate use<T> safety
    ↓
[Phase 2c] Type Signatures → Structural typing (duck typing)
    ↓
[Phase 3] IR Lowering → TypeScript AST → IR
    ↓
[Phase 4] Optimizer → SSA, constant folding, DCE
    ↓
[Phase 5] Codegen → C++ (GC or ownership mode) or TypeScript
```

### Key Files

- `compiler/src/frontend/validator.ts` - Phase 1: Language restrictions
- `compiler/src/frontend/lowering.ts` - Phase 3: AST → IR conversion
- `compiler/src/ir/types.ts` - IR type system definitions
- `compiler/src/ir/builder.ts` - IR construction helpers
- `compiler/src/ir/signatures.ts` - Phase 2c: Structural type signatures
- `compiler/src/analysis/` - Phase 2a/2b stubs
- `compiler/src/optimizer/` - Phase 4 stubs
- `compiler/src/codegen/` - Phase 5 stubs

### Documentation

- `compiler/docs/LANGUAGE.md` - Complete language specification
- `compiler/docs/RESTRICTIONS.md` - Detailed restriction reference
- `compiler/docs/ARCHITECTURE.md` - Compiler implementation guide

## Type System

### Primitive Types

```typescript
number      // IEEE 754 double
integer     // int32_t (32-bit signed)
integer53   // int64_t (53-bit JS-safe: ±9,007,199,254,740,991)
string      // UTF-8 string
boolean     // true/false
void        // absence of value
never       // unreachable
```

### Ownership System

```typescript
own<T>      // Unique ownership (std::unique_ptr or GC pointer)
share<T>    // Shared ownership (std::shared_ptr or GC pointer, DAG in ownership mode)
use<T>      // Borrowed reference (raw pointer, non-owning)
```

### Structural Typing

GoodScript uses duck typing: two types with identical structure are compatible.
Type signatures are canonicalized for efficient checking (see `signatures.ts`).

## Module System

- **ES modules**: Standard `import`/`export` syntax
- **Per-module compilation**: Each `.gs` file → separate output file
- **Incremental builds**: Only rebuild changed modules
- **Module resolution**: Relative paths, package imports, index files
- **C++ output**: Modules → namespaces (e.g., `src/math.gs` → `namespace goodscript::math`)
- **Cross-module ownership**: `own<T>` transfers, `share<T>` shares freely

```typescript
// math.gs
export function add(a: number, b: number): number {
  return a + b;
}

// main.gs
import { add } from './math.js';
console.log(add(1, 2));
```

## Language Restrictions ("Good Parts")

**Active Restrictions (16 total)**:
- GS101: No `with` statement
- GS102: No `eval` or `Function` constructor
- GS103: No `arguments` object (use rest params)
- GS104: No `for-in` loops (use `for-of`)
- GS105: No `var` keyword (use `const`/`let`)
- GS106/107: Only `===` and `!==` (no `==`/`!=`)
- GS108: No `this` in function declarations (use methods)
- GS109: No `any` type
- GS110: No implicit truthy/falsy (explicit boolean checks required)
- GS111: No `delete` operator (use `Map` for dynamic data)
- GS112: No comma operator
- GS113: No switch fallthrough
- GS115: No `void` operator (use `undefined`)
- GS116: No `new` with primitive constructors (allow `String()`, forbid `new String()`)
- GS126: No prototype manipulation
- GS127: No dynamic import paths (only string literals allowed)

**Removed Restrictions**:
- GS125: Symbol (now allowed)
- GS128: Getters/setters (now allowed)

## Memory Management (C++ Target)

Two modes (selected via `--memory` flag):

### GC Mode (Default)
```bash
gsc --target cpp myapp.gs
```
- Uses garbage collection (Boehm GC or custom)
- Allows cyclic `share<T>` references
- Easier for TypeScript/JavaScript developers
- All heap types → `T*` (GC-managed)

### Ownership Mode
```bash
gsc --target cpp --memory ownership myapp.gs
```
- Uses smart pointers (`unique_ptr`, `shared_ptr`)
- Enforces DAG for `share<T>` (no cycles)
- Deterministic destruction (RAII)
- Zero-cost abstractions

## Code Style & Conventions

### TypeScript/Vitest for Tests
```typescript
import { describe, it, expect } from 'vitest';

describe('Feature', () => {
  it('should do something', () => {
    expect(result).toBe(expected);
  });
});
```

### IR Construction
```typescript
import { types, exprs } from '../src/ir/builder.js';

const numType = types.number();
const literal = exprs.literal(42, numType);
```

### Error Codes
- GS1xx: Language restrictions (validator)
- GS3xx: Ownership errors (ownership analyzer)
- GS4xx: Null safety errors (null checker)

## Testing

**Current Test Suite (77 tests)**:
- `test/infrastructure.test.ts` - IR builder, types, visitor (11 tests)
- `test/lowering.test.ts` - AST → IR conversion (13 tests)
- `test/validator.test.ts` - Language restrictions (42 tests)
- `test/signatures.test.ts` - Type signatures (11 tests)

**Run Tests**:
```bash
pnpm test                    # All tests
pnpm build && pnpm test      # Build + test
```

## Build Toolchain

**C++ Compilation**: Uses **Zig** as the C++ compiler for cross-platform support

**Benefits**:
- Cross-compilation to Linux, macOS, Windows, WebAssembly
- Zero dependencies (no GCC/Clang/MSVC required)
- Build caching and incremental compilation
- First-class WASM support for browser targets

**Vendored Dependencies** (in `compiler/vendor/`):
- **MPS 1.118.0**: Garbage collection (GC mode) - BSD 2-clause, ~300KB
- **cppcoro**: Async/await via C++20 coroutines - MIT, header-only
- **PCRE2 10.47**: Regular expressions - BSD 3-clause, ~500KB

All dependencies compiled on-the-fly (~1-3s each, cached):
```bash
zig cc -O2 -c vendor/mps/src/mps.c -o build/mps.o           # GC mode
zig cc -O2 -c vendor/pcre2/src/pcre2_all.c -o build/pcre2.o # RegExp
zig c++ -std=c++20 -c build/main.cpp -o build/main.o        # GoodScript code
zig c++ build/main.o build/mps.o build/pcre2.o -o myapp    # Link
```

**Why Vendored?**
- Zero system dependencies (`npm i -g goodscript` just works)
- Deterministic builds (pinned versions)
- Cross-platform support
- Go-style self-contained toolchain

**CLI Examples**:
```bash
gsc --target cpp --compile src/main.gs -o myapp       # Compile to native binary
gsc --target cpp --compile --triple wasm32-wasi src/main.gs  # Compile to WebAssembly
gsc --target cpp src/main.gs                          # Generate C++ only (no compilation)
```

**Implementation**: `src/codegen/zig.ts` (future)

## Common Patterns

### Adding a New Primitive Type
1. Add to `PrimitiveType` enum in `ir/types.ts`
2. Add builder helper in `ir/builder.ts`
3. Add lowering support in `frontend/lowering.ts`
4. Add tests in `test/lowering.test.ts` and `test/signatures.test.ts`
5. Update documentation in `docs/LANGUAGE.md`

### Adding a Language Restriction
1. Add check method in `validator.ts`
2. Call from `visitNode()` traversal
3. Add tests in `test/validator.test.ts`
4. Document in `docs/RESTRICTIONS.md`

### Implementing a Stub
1. Check `docs/ARCHITECTURE.md` for design
2. Create implementation file in appropriate directory
3. Add comprehensive tests
4. Update architecture docs if design changes

## Build System

- **Package Manager**: pnpm (monorepo)
- **TypeScript**: 5.6.0 (strict mode)
- **Test Framework**: Vitest 2.1.0
- **Target**: ES2022, Node.js >= 18

```bash
pnpm install                          # Install dependencies
pnpm build                           # Build all packages
pnpm --filter @goodscript/compiler build
```

## Design Principles

1. **Static analyzability first**: Everything must be determinable at compile time
2. **Progressive enhancement**: GC mode (easy) → ownership mode (optimal)
3. **TypeScript compatibility**: Valid GoodScript is valid TypeScript
4. **Explicit over implicit**: No truthy/falsy, no type coercion
5. **Memory safety**: Ownership semantics prevent use-after-free
6. **Zero-cost abstractions**: When possible (ownership mode)
7. **Single-threaded + workers**: Match JavaScript concurrency model (no shared memory)

## Concurrency Model

**Single-threaded execution** with **worker-based parallelism** (matches JavaScript/TypeScript):

- Each worker = isolated heap (no shared memory)
- Message passing via JSON strings
- Workers API mirrors Web Workers / Node.js Worker Threads
- C++ implementation: OS threads + MPS arenas (GC mode) or std::thread (ownership mode)
- No data races by design

```typescript
// Spawn worker
const worker = new Worker('./worker.gs');

// Send message (JSON string)
worker.postMessage(JSON.stringify({ data: [1, 2, 3] }));

// Receive message
worker.onmessage = (event) => {
  const result = JSON.parse(event.data);
};
```

**Why JSON strings?**
- Simple, universal format (JS, C++, debugging)
- Naturally enforces "share nothing"
- Works identically in browser, Node.js, and native C++

## Next Steps (Priority Order)

1. **Phase 2a**: Ownership analyzer - cycle detection for `share<T>`
2. **Phase 2b**: Null checker - validate `use<T>` safety
3. **Phase 4**: Optimizer - constant folding, DCE, SSA
4. **Phase 5**: C++ backend - generate compilable C++ with source maps
5. **Phase 5**: TypeScript backend - clean transpilation with source maps
6. **Runtime**: Standard library implementation

## Important Notes

- The IR is **ownership-aware** but **memory-mode agnostic**
- Type signatures enable structural typing (duck typing)
- Integer types: `integer` (32-bit), `integer53` (JS-safe 53-bit)
- All objects must be statically typed (no dynamic properties)
- Use `Map<K,V>` for dynamic data, not object properties
- Phase 2a behavior differs by mode: error (ownership) vs warning (GC) for cycles
- **Source locations**: IR tracks file/line/column for debugging and source maps

## Quick Reference

**File Structure**:
```
compiler/
├── src/
│   ├── frontend/     # Parser, validator, lowering
│   ├── ir/          # IR types, builder, signatures
│   ├── analysis/    # Ownership, null checker
│   ├── optimizer/   # IR optimization passes
│   └── codegen/     # C++/TS backends
├── test/            # Vitest test files
└── docs/            # Language & architecture specs
```

**Key Commands**:
```bash
pnpm build && pnpm test    # Standard workflow
pnpm --filter @goodscript/compiler build
vitest --watch             # Watch mode
```

---

Last Updated: December 8, 2025
