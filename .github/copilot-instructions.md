# GoodScript v0.12 - GitHub Copilot Instructions

## Project Overview

GoodScript is a statically analyzable subset of TypeScript that compiles to both native C++ and JavaScript/TypeScript. It enforces "good parts" restrictions to ensure code is predictable, type-safe, and optimizable. It uses ES modules for code organization and supports incremental compilation.

**Current Status**: Phase 1-6 implementation complete (174 tests passing)
- ✅ Validator (15 language restrictions)
- ✅ IR type system with ownership semantics (SSA-based)
- ✅ Type signature system (structural typing)
- ✅ AST → IR lowering (expressions, lambdas, templates, arrays)
- ✅ Ownership analyzer (Phase 2a: cycle detection)
- ✅ Null checker (Phase 2b: use<T> safety)
- ✅ Optimizer (constant folding, DCE, multi-pass)
- ✅ C++ backend (GC and ownership modes)
- ✅ Lambda/arrow functions (C++ lambda generation)
- ✅ C++ identifier sanitization (70+ reserved keywords)
- ✅ Zig compiler integration (binary compilation)
- ✅ Source maps (#line directives for debugging)
- ✅ Assignment expressions (declaration vs reassignment tracking)
- ✅ typeof operator (compile-time type detection)
- ✅ Template literals (lowered to string concatenation)
- ✅ Array operations (literals, indexing, .length)
- ✅ console.log and console methods
- ⏳ Object literals (IR lowering done, C++ codegen needs struct support)

**Recent Progress (Dec 8, 2025 - Evening)**:
- Fixed console.log generation (now generates gs::console::log correctly)
- Enhanced type inference to use TypeScript's type checker for arrays
- Fixed array.length property access (now generates arr.length() method call)
- Fixed array indexing with number type (auto-cast to int, dereference primitives)
- Fixed empty array type inference using getContextualType()
- End-to-end compilation working for array operations
- All 174 tests passing
- Added undefined keyword support (maps to nullptr in C++)
- All expression types now generate correct C++ code

## Architecture

### Compilation Pipeline (6 Phases)

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
[Phase 5] Codegen → C++ (GC or ownership mode), TypeScript, or Haxe (multi-target)
    ↓
[Phase 6] Binary Compilation → Zig compiler (native binaries) or Haxe compiler (JVM/C#/Python/etc.)
```

### Key Files

- `compiler/src/frontend/validator.ts` - Phase 1: Language restrictions
- `compiler/src/frontend/lowering.ts` - Phase 3: AST → IR conversion
- `compiler/src/ir/types.ts` - IR type system definitions (SSA-based)
- `compiler/src/ir/builder.ts` - IR construction helpers
- `compiler/src/ir/signatures.ts` - Phase 2c: Structural type signatures
- `compiler/src/analysis/ownership.ts` - Phase 2a: Ownership cycle detection
- `compiler/src/analysis/null-checker.ts` - Phase 2b: use<T> lifetime safety
- `compiler/src/optimizer/optimizer.ts` - Phase 4: IR optimization passes
- `compiler/src/backend/cpp/codegen.ts` - Phase 5: C++ code generator
- `compiler/src/backend/cpp/zig-compiler.ts` - Phase 6: Zig compiler integration
- `compiler/src/backend/haxe/codegen.ts` - Phase 5: Haxe code generator (future)
- `compiler/src/backend/haxe/compiler.ts` - Phase 6: Haxe compiler integration (future)

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
- **Per-module compilation**: Each `-gs.ts` file → separate output file
- **Incremental builds**: Only rebuild changed modules
- **Module resolution**: Relative paths, package imports, index files
- **C++ output**: Modules → namespaces (e.g., `src/math-gs.ts` → `namespace goodscript::math`)
- **Cross-module ownership**: `own<T>` transfers, `share<T>` shares freely

```typescript
// math-gs.ts
export function add(a: number, b: number): number {
  return a + b;
}

// main-gs.ts
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

## IR Type System

GoodScript uses two levels of IR:

### AST-Level IR (`IRExpression`, `IRStatement`)
- Used during initial lowering from TypeScript AST
- Has `kind: 'identifier'` for variable references
- Statement-based control flow
- **Builder**: `exprs.identifier()`, `stmts.return()`
- **Used by**: `lowering.ts` (AST → IR conversion)

### SSA-Level IR (`IRExpr`, `IRInstruction`, `IRBlock`)
- Used for analysis and optimization
- Has `kind: 'variable'` with SSA version numbers
- Block-based control flow with terminators
- **Structure**: `IRBlock` with `instructions[]` and `terminator`
- **Used by**: `ownership.ts`, `null-checker.ts`, future optimizer
- **Key types**: `IRVariable`, `IRAssign`, `IRTerminator`

**Example**:
```typescript
// AST-level (from builder)
const expr = exprs.identifier('x', types.number());
// { kind: 'identifier', name: 'x', type: ... }

// SSA-level (in IRBlock)
const variable: IRVariable = { 
  kind: 'variable', 
  name: 'x', 
  version: 0,  // SSA version
  type: types.number() 
};

// Function body as IRBlock
const body: IRBlock = {
  id: 0,
  instructions: [/* IRInstruction[] */],
  terminator: { kind: 'return', value: variable }
};
```

## Testing

**Current Test Suite (156 tests)**:
- `test/infrastructure.test.ts` - IR builder, types, visitor (11 tests)
- `test/lowering.test.ts` - AST → IR conversion (13 tests)
- `test/validator.test.ts` - Language restrictions (45 tests)
- `test/signatures.test.ts` - Type signatures (11 tests)
- `test/ownership.test.ts` - Ownership cycle detection (16 tests)
- `test/null-checker.test.ts` - use<T> lifetime safety (13 tests)
- `test/optimizer.test.ts` - IR optimization passes (15 tests)
- `test/cpp-codegen.test.ts` - C++ code generation (17 tests, includes source maps)
- `test/zig-compiler.test.ts` - Zig compiler integration (10 tests)
- `test/tsconfig-integration.test.ts` - tsconfig.json integration (5 tests)

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
gsc --target cpp --compile src/main-gs.ts -o myapp       # Compile to native binary
gsc --target cpp --compile --triple wasm32-wasi src/main-gs.ts  # Compile to WebAssembly
gsc --target cpp src/main-gs.ts                          # Generate C++ only (no compilation)
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
const worker = new Worker('./worker-gs.ts');

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

1. **CLI tool**: Command-line interface for compilation
2. **Runtime library**: Core runtime support (workers, async, etc.)
3. **Standard library**: Leverage Haxe's cross-platform APIs for initial implementation
4. **Haxe backend**: Multi-target adapter (JVM, C#, Python, etc.) - enables broad platform support
5. **IDE support**: LSP server, syntax highlighting

**Note**: Source maps (C++ #line directives) and tsconfig.json integration are already implemented.

## Important Notes

- The IR is **ownership-aware** but **memory-mode agnostic**
- Type signatures enable structural typing (duck typing)
- Integer types: `integer` (32-bit), `integer53` (JS-safe 53-bit)
- All objects must be statically typed (no dynamic properties)
- Use `Map<K,V>` for dynamic data, not object properties
- Phase 2a behavior differs by mode: error (ownership) vs warning (GC) for cycles
- **Source locations**: IR tracks file/line/column for debugging and source maps
- **Two IR levels**: AST-level (`IRExpression`) for lowering, SSA-level (`IRExpr`) for analysis
- **IRBlock structure**: `{ id, instructions, terminator }` - terminators handle control flow
- **Variable tracking**: SSA version numbers (`IRVariable.version`) for dataflow analysis
- **Haxe backend**: Implementation detail for multi-target support (JVM, C#, Python, etc.) - GC-only mode
- **Standard library design**: Aligned with Haxe's cross-platform APIs for maximum portability

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
