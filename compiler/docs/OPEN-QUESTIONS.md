# GoodScript v0.12 - Open Questions

**Last Updated**: December 8, 2025

This document tracks design decisions that have been deferred for future consideration. The core v0.12 architecture is complete and ready for implementation, but these questions will need answers as the project matures.

---

## 1. Standard Library Design

### JavaScript Compatibility

**Question**: How much of JavaScript's built-in objects should we support?

**Considerations**:
- **Array methods**: `.map()`, `.filter()`, `.reduce()`, `.forEach()`, etc.
- **String methods**: `.substring()`, `.split()`, `.replace()`, `.trim()`, etc.
- **Map/Set**: Full API compatibility or subset?
- **Math**: All functions or common ones only?
- **JSON**: `JSON.parse()`, `JSON.stringify()` (critical for workers)
- **Date/Time**: Node.js-style or custom API?
- **Console**: `console.log()`, `console.error()`, etc.

**Current Status**: Undefined

**Recommendation**: Start with minimal set (Array basics, String basics, Math, JSON, console), expand based on user needs.

---

### String Encoding

**Question**: UTF-8 or UTF-16 for internal string representation?

**Trade-offs**:
- **UTF-16** (JavaScript standard):
  - ✅ Perfect JS compatibility
  - ✅ Simpler transpilation to JavaScript
  - ❌ 2-4 bytes per character (memory overhead)
  - ❌ Non-standard in C++ world
  
- **UTF-8** (C++ standard):
  - ✅ Standard in C++, Linux, web
  - ✅ Compact for ASCII (1 byte/char)
  - ✅ Better memory usage
  - ❌ Requires transcoding for JS backend
  - ❌ String indexing complexity (multi-byte chars)

**Current Status**: Undefined

**Recommendation**: UTF-8 for C++ backend (memory efficiency, C++ standard), UTF-16 for JS backend (compatibility). Accept transcoding cost at compile time.

---

### Regular Expression Syntax

**Question**: ECMAScript regex syntax or PCRE2 syntax?

**Considerations**:
- **ECMAScript** (JavaScript standard):
  - ✅ Perfect compatibility with JS/TS developers
  - ❌ PCRE2 doesn't support all features (lookahead/lookbehind differences)
  
- **PCRE2** (what we have vendored):
  - ✅ More powerful (recursive patterns, possessive quantifiers)
  - ✅ Already integrated
  - ❌ Syntax differences from JavaScript

**Current Status**: PCRE2 vendored but syntax compatibility undefined

**Recommendation**: Start with PCRE2, document differences from ECMAScript. Consider compiling ECMAScript regex to PCRE2 patterns (like V8 does internally).

---

## 2. Error Handling

### Exception Strategy

**Question**: C++ exceptions vs error codes for compiled C++ output?

**Trade-offs**:
- **C++ Exceptions** (`throw`/`try`/`catch`):
  - ✅ Matches JavaScript semantics perfectly
  - ✅ Simpler code generation (direct mapping)
  - ❌ Performance overhead (stack unwinding)
  - ❌ Code size increase (~10-20%)
  - ❌ Disabled in some embedded environments
  
- **Error Codes** (`Result<T>` pattern):
  - ✅ Zero overhead (no stack unwinding)
  - ✅ Explicit error handling
  - ✅ Works everywhere (embedded, WASM)
  - ❌ Verbose (manual propagation)
  - ❌ Doesn't match JavaScript semantics

**Current Status**: Undefined

**Recommendation**: Start with C++ exceptions (matches JS semantics), add `--no-exceptions` flag later for embedded targets (requires `Result<T>` wrapper).

---

### Stack Traces

**Question**: How to generate stack traces in C++ compiled code?

**Considerations**:
- **Debug builds**: Use `#line` directives + DWARF debug info (already planned)
- **Release builds**: Need runtime stack unwinding?
  - Option 1: Store frame pointers (performance cost)
  - Option 2: No stack traces in release (like C++)
  - Option 3: Compiler-generated stack trace table (code size cost)

**Current Status**: Debug mode solved (`#line` directives), release mode undefined

**Recommendation**: Release mode = no stack traces (C++ default). Users can enable `-g` flag for production debugging if needed.

---

### Worker Error Propagation

**Question**: How do errors propagate across worker boundaries?

**Considerations**:
- **Serialize errors to JSON**:
  ```typescript
  worker.onerror = (event) => {
    const error = JSON.parse(event.data);
    console.error(error.message, error.stack);
  };
  ```
  - ✅ Simple, universal
  - ❌ Loses error type information
  
- **Terminate worker on error** (like Web Workers):
  - ✅ Matches browser behavior
  - ❌ Can't recover from errors

**Current Status**: Undefined

**Recommendation**: Match Web Worker behavior (terminate on uncaught error), add `worker.onerror` handler for graceful cleanup.

---

## 3. Numeric Semantics

### Integer Overflow Behavior

**Question**: What happens when `integer` (32-bit) overflows?

**Options**:
1. **Wrap** (JavaScript/C default):
   ```typescript
   const x: integer = 2147483647;  // INT32_MAX
   const y: integer = x + 1;       // -2147483648 (wraps)
   ```
   - ✅ Fast (no checks)
   - ❌ Silent bugs
   
2. **Trap** (throw exception):
   ```typescript
   const x: integer = 2147483647;
   const y: integer = x + 1;  // throws IntegerOverflowError
   ```
   - ✅ Safe, catches bugs
   - ❌ Performance cost (every operation needs check)
   
3. **Saturate** (clamp to MIN/MAX):
   ```typescript
   const x: integer = 2147483647;
   const y: integer = x + 1;  // 2147483647 (saturates)
   ```
   - ✅ Safe, no exceptions
   - ❌ Silent clamping, still a bug

**Current Status**: Undefined

**Recommendation**: Wrap by default (JavaScript compatibility), add `--strict-integers` flag for trap mode (debug builds).

---

### Integer53 Validation

**Question**: Should `integer53` validate at runtime that values stay within ±9,007,199,254,740,991?

**Considerations**:
- ✅ Safety: Catches overflow bugs
- ❌ Performance: Every assignment needs range check
- Alternative: Compile-time analysis (prove values stay in range)

**Current Status**: Undefined

**Recommendation**: Runtime validation in debug builds, compiler warnings if value might exceed range, no checks in release builds (like `assert()`).

---

### NaN/Infinity Handling

**Question**: Should `number` type allow NaN and Infinity?

**Trade-offs**:
- **Allow** (JavaScript default):
  - ✅ Full compatibility
  - ✅ No runtime checks
  - ❌ Silent bugs (`NaN !== NaN`)
  
- **Trap** (throw on NaN/Infinity):
  - ✅ Catches division by zero
  - ✅ Safer numeric code
  - ❌ Performance cost
  - ❌ Breaks JavaScript semantics

**Current Status**: Allow (matches JavaScript)

**Recommendation**: Keep current behavior (allow NaN/Infinity), consider lint rules to warn on potential NaN propagation.

---

## 4. Debugging & Tooling

### REPL Implementation

**Question**: Should we provide an interactive REPL (Read-Eval-Print-Loop)?

**Considerations**:
- **Node.js-style REPL**:
  ```bash
  $ gsc repl
  > const x = 42;
  > x + 1
  43
  ```
  - ✅ Great for learning/debugging
  - ❌ Complex to implement (incremental compilation, state management)
  
- **No REPL** (compile-only):
  - ✅ Simpler compiler
  - ❌ Less accessible for beginners

**Current Status**: Not planned for v0.12

**Recommendation**: Defer to v0.13+. For v0.12, users can use TypeScript REPL for experimentation.

---

### Profiler Integration

**Question**: How should profiling work for compiled C++ code?

**Options**:
1. **Sampling profiler** (like `perf`, Instruments):
   - ✅ Low overhead (~1-5%)
   - ✅ Works with existing tools
   - ❌ Requires debug symbols
   
2. **Instrumentation** (compiler-injected counters):
   - ✅ Precise call counts
   - ✅ Custom metrics (GC pauses, allocations)
   - ❌ High overhead (~10-50%)
   
3. **No built-in profiler**:
   - Use system tools (`perf`, `gprof`, Instruments)

**Current Status**: Undefined

**Recommendation**: No built-in profiler. Document how to use system profilers with `#line` directives (GoodScript source shows up in profiles).

---

### Memory Leak Detection

**Question**: How to detect memory leaks in GC mode?

**Considerations**:
- **MPS has built-in leak detection**:
  - Enable with `MPS_DEBUG=1` environment variable
  - Reports unreachable objects at shutdown
  
- **Custom tooling**:
  - Heap snapshots (like Chrome DevTools)
  - Allocation tracking
  - Reference graph visualization

**Current Status**: Rely on MPS built-in tools

**Recommendation**: Document MPS debugging features. Future: Add `--heap-snapshot` flag to dump reachable objects.

---

## 5. FFI (Foreign Function Interface)

### Calling Native Libraries

**Question**: How can GoodScript code call native C/C++ libraries?

**Use Cases**:
- System APIs (file I/O, networking, graphics)
- Third-party libraries (SQLite, libcurl, OpenGL)
- Performance-critical code (SIMD, low-level algorithms)

**Options**:
1. **Manual bindings**:
   ```typescript
   // Manually write C++ wrapper
   // Compile and link with GoodScript code
   ```
   - ✅ Simple, no special compiler support needed
   - ❌ Tedious, error-prone
   
2. **Automatic bindings** (like Node-API):
   ```typescript
   import { sqlite3_open } from 'native:sqlite3';
   ```
   - ✅ Convenient
   - ❌ Complex compiler integration
   - ❌ Type safety challenges
   
3. **No FFI** (pure GoodScript only):
   - ✅ Simplest
   - ❌ Limited ecosystem

**Current Status**: Not planned for v0.12

**Recommendation**: Defer to v0.13+. For v0.12, users can manually write C++ wrappers and link them.

---

### Exposing GoodScript to C++

**Question**: Can C++ code call GoodScript functions?

**Use Cases**:
- Embedding GoodScript in existing C++ applications
- Plugin systems
- Scripting for games/tools

**Considerations**:
- Need stable ABI (Application Binary Interface)
- Name mangling strategy
- Memory management (who owns objects?)

**Current Status**: Not planned for v0.12

**Recommendation**: Defer to v0.14+. Focus on standalone executables first.

---

### Platform-Specific APIs

**Question**: How to handle platform differences (file system, networking, etc.)?

**Options**:
1. **Standard library abstractions**:
   ```typescript
   import { readFile } from '@goodscript/fs';
   ```
   - ✅ Portable
   - ❌ Large API surface to maintain
   
2. **Conditional compilation**:
   ```typescript
   #if PLATFORM_LINUX
   import { epoll } from '@goodscript/linux';
   #endif
   ```
   - ✅ Full platform control
   - ❌ Non-portable code
   
3. **Minimal stdlib** (like Go):
   - Core types only (Array, Map, String)
   - Platform APIs via third-party packages

**Current Status**: Undefined

**Recommendation**: Start with option 3 (minimal stdlib). Let ecosystem provide platform-specific packages.

---

## 6. Build System Integration

### Package.json Support

**Question**: Should GoodScript projects use `package.json`?

**Considerations**:
- ✅ Familiar to JavaScript developers
- ✅ Can reuse npm ecosystem (TypeScript packages)
- ✅ Standard tooling (npm scripts, dependencies)
- ❌ Confusion: not all npm packages work (native modules, DOM APIs)

**Current Status**: Undefined (likely yes)

**Recommendation**: Use `package.json` with `"type": "goodscript"` to distinguish from Node.js projects. Document which npm packages are compatible.

---

### npm Package Dependencies

**Question**: Can GoodScript projects depend on TypeScript/JavaScript packages?

**Considerations**:
- **TypeScript packages** (type-only):
  - ✅ Can import types
  - ✅ Works for both JS and C++ backends
  
- **JavaScript packages** (runtime code):
  - ✅ Works for JS backend (just import)
  - ❌ Doesn't work for C++ backend (no runtime)
  - Possible solution: Compile JS packages to C++? (very complex)

**Current Status**: Undefined

**Recommendation**: Type-only imports allowed. Runtime imports allowed only for JS backend. For C++ backend, require GoodScript-native packages.

---

### Testing Framework

**Question**: Should we provide a testing framework for GoodScript code?

**Options**:
1. **Reuse Vitest/Jest**:
   ```typescript
   import { describe, it, expect } from 'vitest';
   
   describe('Math', () => {
     it('adds numbers', () => {
       expect(1 + 1).toBe(2);
     });
   });
   ```
   - ✅ Familiar
   - ❌ Only works for JS backend
   
2. **Custom test runner** (works for both backends):
   ```typescript
   import { test, assert } from '@goodscript/test';
   
   test('adds numbers', () => {
     assert.equal(1 + 1, 2);
   });
   ```
   - ✅ Works for C++ and JS
   - ❌ Maintenance burden
   
3. **No built-in testing**:
   - Use existing tools (Vitest for JS, Google Test for C++)

**Current Status**: Not planned for v0.12

**Recommendation**: Compiler uses Vitest for self-testing. For user code, recommend Vitest (JS backend) and document C++ testing workflow (Google Test) for v0.12. Consider unified test runner in v0.13+.

---

## Priority for Resolution

**High Priority** (affects v0.12 stdlib design):
1. Standard library scope (Array, String, Math, JSON)
2. String encoding (UTF-8 vs UTF-16)
3. Exception strategy (C++ exceptions vs error codes)

**Medium Priority** (affects v0.13+ features):
4. Integer overflow behavior
5. RegExp syntax compatibility
6. Package.json integration

**Low Priority** (can defer to v0.14+):
7. FFI design
8. REPL implementation
9. Custom profiler
10. Testing framework

---

## Decision Process

When ready to resolve a question:
1. Research prior art (Rust, Go, Swift, TypeScript, Zig)
2. Prototype if necessary
3. Gather community feedback (GitHub Discussions)
4. Document final decision in LANGUAGE.md or ARCHITECTURE.md
5. Remove from this file

---

**Note**: The core v0.12 compiler architecture is **complete and ready for implementation**. These open questions are for future iterations and do not block current work on Phase 2a (ownership analyzer).
