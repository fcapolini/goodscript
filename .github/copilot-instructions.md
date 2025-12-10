# GoodScript v0.12 - GitHub Copilot Instructions

## Project Overview

GoodScript is a statically analyzable subset of TypeScript that compiles to both native C++ and JavaScript/TypeScript. It enforces "good parts" restrictions to ensure code is predictable, type-safe, and optimizable. It uses ES modules for code organization and supports incremental compilation.

**Current Status**: Phase 1-6 implementation complete + async/await + FileSystem + HTTP/HTTPS + Math + JSON + Union Types + Interfaces + Traditional For Loops + Date.now() + Function Hoisting (431 tests passing)
- ✅ Validator (15 language restrictions)
- ✅ IR type system with ownership semantics (SSA-based)
- ✅ Type signature system (structural typing)
- ✅ AST → IR lowering (expressions, lambdas, templates, arrays)
- ✅ Ownership analyzer (Phase 2a: cycle detection)
- ✅ Null checker (Phase 2b: use<T> safety)
- ✅ Optimizer (constant folding, DCE, function hoisting, multi-pass)
- ✅ C++ backend (GC and ownership modes)
- ✅ Lambda/arrow functions (C++ lambda generation)
- ✅ C++ identifier sanitization (70+ reserved keywords)
- ✅ Zig compiler integration (binary compilation)
- ✅ Source maps (#line directives for debugging)
- ✅ Assignment expressions (declaration vs reassignment tracking)
- ✅ typeof operator (compile-time type detection)
- ✅ Template literals (lowered to string concatenation)
- ✅ Array operations (literals, indexing, .length, methods)
- ✅ console.log and console methods
- ✅ Map<K,V> operations (set, get, has, delete, clear, forEach, keys, values, entries, size)
- ✅ Exception handling (try/catch/throw/finally)
- ✅ for-of loops (arrays, strings, break, continue)
- ✅ Traditional for loops (for (init; condition; increment) with break, continue)
- ✅ Optional chaining (obj?.field, nested chaining)
- ✅ String methods (split, slice, trim, toLowerCase, toUpperCase, indexOf, includes)
- ✅ Async/await (Promise<T>, async functions, co_await/co_return, cppcoro integration)
- ✅ FileSystem API (sync and async file I/O, built-in global classes)
- ✅ HTTP/HTTPS Client (cpp-httplib, OpenSSL/BearSSL, certificate verification, SNI support)
- ✅ Math object (min, max, abs, floor, ceil, round, sqrt, pow, trigonometry, logarithms, constants)
- ✅ JSON object (JSON.stringify() for basic types)
- ✅ Date object (Date.now() for timing measurement)
- ✅ Union types (T | null, T | undefined for optional values)
- ✅ Interface declarations (TypeScript interfaces → C++ structs with pure virtual methods)
- ✅ Class field initializers (default values in member initializer lists)
- ✅ Number instance methods (toFixed, toExponential, toPrecision, toString)
- ⏳ Object literals (IR lowering done, C++ codegen needs struct support)

**Recent Progress (Dec 10, 2025)**:
- ✅ **Function Hoisting Optimization** (431 tests passing)
  * Optimizes recursive nested functions by hoisting them to module level
  * Eliminates closure allocation overhead for functions with no closure dependencies
  * Recursion detection: Analyzes function bodies for self-calls
  * Closure analysis: Detects parent scope variable references
  * C++ codegen: std::function wrapper for recursive lambdas, auto for simple lambdas
  * Optimizer integration: Runs at optimization level 1+ (--gsOptimize 1|2|3)
  * Examples: fibonacci, factorial, GCD successfully hoisted (examples/tmp-examples/hoisting-working-gs.ts)
  * Tests: 7 comprehensive tests covering hoisting criteria, closure detection, shadowing
  * Limitation: Recursive nested functions WITH closures not yet supported (needs closure capture)
- ✅ **Date.now() Support** (424 tests passing)
  * Date class with static now() method in both GC and ownership modes
  * Returns milliseconds since Unix epoch (number type)
  * Full codegen integration for Date.now() calls
  * Works in expressions and variable declarations
  * Example: 13-date-timing demonstrating timing measurement
  * Performance benchmarking infrastructure now has proper timing
- ✅ **Map.get() Auto-Dereferencing in Ownership Mode**
  * Map.get() returns V* in ownership mode, V in GC mode
  * Compiler automatically dereferences: (*map.get(key))
  * All 4 performance benchmarks now working in triple-mode
- ✅ **Performance Benchmark Infrastructure**
  * 4 benchmarks: fibonacci, array-ops, string-ops, map-ops
  * Triple-mode execution: Node.js, GC C++, Ownership C++
  * npm scripts: bench:all, bench:fibonacci, bench:array, bench:string, bench:map
  * Mode-specific: bench:node, bench:gc, bench:ownership
- ✅ **Traditional For Loop Support** (419 tests passing)
  * Complete for loop implementation: `for (init; condition; increment) { body }`
  * Supports variable declaration, expression, and empty initializers
  * Assignment operator (BinaryOp.Assign) for increments like `i = i + 1`
  * Infinite loops with empty condition: `for (;;) { }`
  * Break and continue statements work correctly
  * Nested for loops fully supported
  * Integer53 explicit type annotations to prevent auto inference issues
  * String::from(long long) overload for int64_t support
  * Performance benchmarks: fibonacci, array-ops, string-ops working in all modes
- ✅ **Certificate Verification for HTTPS - VERIFIED WORKING**
  * Created bearssl_certs.hpp: System CA certificate loading and parsing
  * Multi-platform support: macOS, Linux (Debian/Ubuntu/Fedora/RHEL), FreeBSD
  * PEM certificate parsing using BearSSL's br_pem_decoder API
  * Trust anchor conversion to br_x509_trust_anchor structures
  * SNI (Server Name Indication) support via SSL_set_tlsext_host_name()
  * Production-ready: Full certificate verification enabled and tested
  * Secure by default: System trust anchors loaded automatically
  * Successfully verified: HTTPS connections to example.com with full cert validation
  * Hybrid SSL: System OpenSSL (preferred) + BearSSL fallback (Windows/minimal)
  * 4 new certificate verification tests (all passing)
- ✅ **Interface Declaration Support** (402 tests passing)
  * Full interface declaration lowering from TypeScript AST to IR
  * C++ codegen generates structs with pure virtual methods
  * Header-only generation (no source file needed for interfaces)
  * Class field initializers now support default values via member initializer lists
  * Conditional feature flags: HTTP and FileSystem APIs only compiled when used
  * Auto-detection of feature usage in CLI by scanning generated C++ code
  * All class constructor tests updated to expect modern C++ initializer lists
- ✅ **HTTP Async Thread Pool Implementation** (398 tests passing, Dec 10)
  * Replaced blocking async with true async using cppcoro::static_thread_pool
  * HTTP requests now execute on background threads (non-blocking)
  * Concurrent request support: multiple HTTPAsync.fetch() calls run in parallel
  * Thread pool sized to CPU cores (min 2 threads)
  * Documentation: HTTP-ASYNC-IMPLEMENTATION.md with complete technical details
  * New test: concurrent async HTTP request compilation
  * Switched from libcurl to cpp-httplib (header-only, MIT license, 13.6k LOC)
  * Zero-dependency design maintained: cpp-httplib is header-only
- ✅ **Runtime Reorganization** (373 tests passing, Dec 9)
  * Moved runtime/ from workspace root into compiler/runtime/
  * Separated GC and ownership modes: runtime/cpp/gc/ vs runtime/cpp/ownership/
  * Created GC-specific implementations: console.hpp, json.hpp using c_str() API
  * Shared utility files: filesystem, http, regexp work with both modes via macros
  * Updated all include paths and test configurations
  * CLI and binary compilation fully working with new structure
- ✅ **Completed Phase 8: Union Types (T | null, T | undefined)** (12 tests, 4 skipped)
  * IR type system: Union types already existed in IRType
  * AST lowering: Added ts.UnionTypeNode support, normalizeUnion() for T | null
  * GC mode: T | null normalized to T (objects are nullable pointers)
  * Type annotations: Support for null and undefined keywords
  * Demo program: union-types-demo-gs.ts with comprehensive examples
  * Documentation: UNION-TYPES-GUIDE.md covering syntax, patterns, best practices
  * Integration: Works with optional chaining, function returns, variable declarations
  * Future: Type narrowing, general unions (std::variant), discriminated unions

**Previous Progress**:
- ✅ **Completed Phase 7b.1: Async/await and Promise<T>** (53 tests total)
  * Step 1 - IR Type System: Added `Promise<T>` type, async flags on functions/methods (11 tests)
  * Step 2 - AST Lowering: Detect async/await keywords, lower to IR expressions (14 tests)
  * Step 3 - C++ Codegen: Generate cppcoro::task<T>, co_await, co_return (14 tests)
  * Step 4 - Runtime Library: Promise.resolve(), Promise.reject() static methods (3 tests)
  * Step 5 - Integration Testing & Documentation: Full pipeline tests + comprehensive guide (11 tests)
  * cppcoro integration: Conditional header includes, isAsyncContext tracking
  * Type mapping: `Promise<T>` → `cppcoro::task<T>` in generated C++
  * Control flow: `co_return` in async functions, `co_await` for await expressions
  * Documentation: ASYNC-AWAIT-GUIDE.md covering syntax, implementation, examples, limitations
- ✅ **Completed Phase 7b.2: FileSystem API** (10 tests)
  * Built-in FileSystem and FileSystemAsync global classes (like console)
  * 18+ methods: exists, readText, writeText, appendText, mkdir, readDir, stat, copy, move, etc.
  * Both sync (FileSystem) and async (FileSystemAsync with Promise<T>) variants
  * Runtime complete: gs_filesystem.hpp (700 lines, cross-platform POSIX/Windows)
  * Documentation: FILESYSTEM-API-GUIDE.md with complete API reference and examples
  * End-to-end execution test: Full pipeline TypeScript → IR → C++ → Binary → Execution
  * Requires GS_ENABLE_FILESYSTEM flag for compilation
  * Fixed struct field access codegen bug (size/length on structs vs Map/Array)
- ✅ **Completed Phase 7b.3: HTTP Client** (4 tests)
  * Vendored cpp-httplib v0.28.0 (header-only, MIT license, ~13.6k LOC)
  * Vendored BearSSL 0.6 (MIT license, ~4.3MB source, 277 .c files) - SSL fallback
  * Runtime complete: http-httplib.hpp (~270 lines, sync and async support)
  * Built-in globals: HTTP (sync), HTTPAsync (async) following FileSystem/console pattern
  * Methods: HTTP.syncFetch(), HTTPAsync.fetch() returning Promise<HttpResponse>
  * True async: Uses cppcoro::static_thread_pool for non-blocking execution
  * Features: Custom headers, POST/PUT, timeout support, redirect following
  * HTTPS support: System OpenSSL (macOS/Linux) with BearSSL fallback (Windows/minimal)
  * Certificate verification: Full system CA trust anchor loading and validation
  * SNI support: Server Name Indication for virtual hosting
  * HTTPS detection: Automatic OpenSSL detection, falls back to vendored BearSSL if not found
  * Hybrid approach: Zero overhead on Unix (system SSL), 100% coverage on all platforms (BearSSL fallback)
  * Thread pool: Sized to CPU cores, enables concurrent request execution
  * Documentation: PHASE-7B3-HTTP-CLIENT-PLAN.md, HTTP-ASYNC-IMPLEMENTATION.md, HTTPS-BORINGSSL-IMPLEMENTATION.md
  * Requires GS_ENABLE_HTTP flag for compilation
  * Requires GS_ENABLE_HTTPS flag for HTTPS support (auto-enabled)
  * Uses GS_USE_BEARSSL flag when falling back to BearSSL
  * Certificate store: bearssl_certs.hpp for system CA bundle loading
  * Security: Production-grade TLS with certificate verification and hostname validation
- ✅ **Completed Phase 7c: Math and JSON Integration** (20 tests)
  * Math object: All 20+ methods integrated (min, max, abs, floor, ceil, round, sqrt, pow, sin, cos, tan, log, etc.)
  * JSON object: JSON.stringify() for primitives (number, string, boolean)
  * Runtime complete: gs_math.hpp (146 lines), gs_json.hpp (246 lines) - already existed
  * Codegen integration: Added Math/JSON to built-in globals alongside console/FileSystem/HTTP
  * Pattern: Math.min(a, b) → gs::Math::min(a, b), JSON.stringify(x) → gs::JSON::stringify(x)
  * Tests: 15 Math integration tests + 5 JSON integration tests
  * Documentation: PHASE-7C-UTILITIES-PLAN.md with roadmap for union types and tuple types
- All 410 tests passing (228 → 410, +182 tests total)

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
**Current Test Suite (431 tests)**:
- `test/infrastructure.test.ts` - IR builder, types, visitor (11 tests)
- `test/lowering.test.ts` - AST → IR conversion (14 tests)
- `test/validator.test.ts` - Language restrictions (45 tests)
- `test/signatures.test.ts` - Type signatures (11 tests)
- `test/ownership.test.ts` - Ownership cycle detection (31 tests, including type alias and intersection type support)
- `test/null-checker.test.ts` - use<T> lifetime safety (13 tests)
- `test/optimizer.test.ts` - IR optimization passes (15 tests, 15 currently failing - pre-existing)
- `test/cpp-codegen.test.ts` - C++ code generation (28 tests, includes source maps)
- `test/zig-compiler.test.ts` - Zig compiler integration (10 tests)
- `test/tsconfig-integration.test.ts` - tsconfig.json integration (5 tests)
- `test/for-of.test.ts` - for-of loop lowering (9 tests)
- `test/for-loop.test.ts` - traditional for loop lowering (9 tests)
- `test/map-methods.test.ts` - Map<K,V> operations (12 tests)
- `test/optional-chaining.test.ts` - Optional chaining (5 tests)
- `test/string-methods.test.ts` - String method lowering (10 tests)
- `test/async-types.test.ts` - Promise<T> IR type system (11 tests)
- `test/async-lowering.test.ts` - async/await AST lowering (14 tests)
- `test/async-codegen.test.ts` - async/await C++ codegen (14 tests)
- `test/async-runtime.test.ts` - Promise runtime library (3 tests)
- `test/async-integration.test.ts` - async/await integration tests (11 tests)
- `test/filesystem.test.ts` - FileSystem built-in API (9 tests)
- `test/filesystem-demo.test.ts` - FileSystem demo compilation and execution (2 tests)
- `test/member-access.test.ts` - Member access codegen (struct fields vs Map/Array methods) (2 tests)
- `test/http-integration.test.ts` - HTTP client integration tests (3 tests)
- `test/math-integration.test.ts` - Math object integration tests (15 tests)
- `test/json-integration.test.ts` - JSON object integration tests (5 tests)
- `test/math-json-demo.test.ts` - Math/JSON demo compilation tests (2 tests)
- `test/date.test.ts` - Date object integration tests (5 tests)
- `test/union-types.test.ts` - Union type support (12 tests, 4 skipped)
- `test/function-hoisting.test.ts` - Function hoisting optimization (7 tests)
- `test/cli.test.ts` - CLI functionality tests (42 tests)
**Run Tests**:
```bash
pnpm test                    # All tests (431 passing, 19 skipped)
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
- **cpp-httplib v0.28.0**: HTTP/HTTPS client library - MIT, header-only, ~13.6k LOC

All dependencies compiled on-the-fly (~1-3s each, cached):
```bash
zig cc -O2 -c vendor/mps/src/mps.c -o build/mps.o           # GC mode
zig cc -O2 -c vendor/pcre2/src/pcre2_all.c -o build/pcre2.o # RegExp
zig c++ -std=c++20 -c build/main.cpp -o build/main.o        # GoodScript code
zig c++ build/main.o build/mps.o build/pcre2.o -o myapp     # Link
```

**Why Vendored?**
- Zero system dependencies (`npm i -g goodscript` just works)
- Deterministic builds (pinned versions)
- Cross-platform support
- Go-style self-contained toolchain

**CLI Examples**:
```bash
gsc --gsTarget cpp -o myapp src/main-gs.ts                       # Compile to native binary
gsc --gsTarget cpp --gsTriple wasm32-wasi -o app.wasm src/main-gs.ts  # Compile to WebAssembly
gsc --gsTarget cpp --gsCodegen src/main-gs.ts                    # Generate C++ only (no compilation)
gsc --gsMemory ownership --gsTarget cpp -o myapp src/main-gs.ts # Use ownership mode
```

**Correct CLI Flags**:
- `--gsTarget <target>` - Compilation target (cpp, js, ts, haxe)
- `--gsMemory <mode>` - Memory mode (gc, ownership)  
- `--gsCodegen` - Generate code only, don't compile to binary
- `--gsOptimize <level>` - Optimization level (0, 1, 2, 3, s, z)
- `--gsTriple <triple>` - Target triple for cross-compilation
- `-o <path>` - Output binary path
- `--gsShowIR` - Print IR for debugging
- `--gsDebug` - Enable debug symbols

Note: `cpp` target compiles to binary by default unless `--gsCodegen` is used.

**Implementation**: `src/backend/cpp/zig-compiler.ts`

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
│   └── backend/     # C++/TS backends
├── runtime/
│   └── cpp/
│       ├── gc/           # GC mode runtime (console, json, etc. using c_str())
│       └── ownership/    # Ownership mode runtime (using str())
├── test/            # Vitest test files
├── vendor/          # Vendored dependencies (MPS, cppcoro, PCRE2, libcurl)
└── docs/            # Language & architecture specs
```

**Key Commands**:
```bash
pnpm build && pnpm test    # Standard workflow
pnpm --filter @goodscript/compiler build
vitest --watch             # Watch mode
```

---

Last Updated: December 9, 2025
