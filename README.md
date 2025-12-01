# Introducing GoodScript: TypeScript with Deterministic Memory Safety

> **🚧 Alpha State:** GoodScript is currently in active development. The compiler is 100% complete (1051/1051 tests passing) with all core features working. Phase 3 (C++ code generation) is complete! See [Current Status](#7-current-status-december-2025) for details.

**Audience:** TypeScript developers interested in writing memory-safe systems code

**Purpose:** Highlight GoodScript's dual-mode workflow, tooling support, and memory-safety features.

---

## 1. What is GoodScript?

GoodScript is a **TypeScript specialization** designed to enable safe systems programming with deterministic memory management. It retains **TypeScript syntax** while removing JavaScript dynamic features which would prevent native compilation, and augmenting the language with **ownership qualifiers** which allow for automatic memory management without the need of a garbage collector or complex borrowing rules like in Rust.

This turns TypeScript into an enterprise-level, natively compilable language with deterministic memory management and small footprint, making it ideal for systems programming in alternative to Rust and Go.

> GoodScript's name is inspired by Douglas Crockford's "JavaScript: The Good Parts" as it advocated ignoring the "bad" or dangerous features of the language.

### 1.1. Fully Statically Typed Language

GoodScript enforces **"The Good Parts"** of TypeScript by removing JavaScript's dynamic features that prevent reliable static analysis and native compilation:

**Prohibited features:**
* No `var` keyword (only `const` and `let`)
* No loose equality operators (`==`, `!=`) — only strict equality (`===`, `!==`)
* No type coercion or truthy/falsy conversions
* No mixed-type ternary expressions — both branches must have compatible types
* No inconsistent function return types — all return statements must return compatible types
* No mixed-type nullish coalescing — both sides of `??` must have compatible types
* No `any` type — all types must be explicit
* No dynamic features: `eval`, `with`, `delete`, `arguments`, `new Function()`
* No `for-in` loops (use `for-of` or explicit iteration)
* No prototype manipulation or dynamic property access
* No unary plus operator for type coercion
* No `void` operator
* No comma operator
* No labeled statements
* No generators (`function*`)
* No `this` in standalone functions (only in class methods)
* No arrow functions with implicit `this` binding from outer scope

**Important differences from JavaScript:**

* **Arrays are not sparse** — GoodScript arrays use contiguous memory (`std::vector<T>` in C++). Writing to `arr[1000]` allocates memory for all elements 0-1000, not just index 1000. Avoid large index gaps to prevent excessive memory usage, or use Map instead.

  ```ts
  // ⚠️ Inefficient in GoodScript - allocates 1,000,001 elements
  const arr: number[] = [];
  arr[1000000] = 42;  // Resizes to 1,000,001 elements
  
  // ✅ Better - use Map for sparse data
  const map = new Map<number, number>();
  map.set(1000000, 42);  // Only stores one key-value pair
  ```

**Temporary implementation restrictions (will be added in future releases):**

* **No getters/setters** — Property accessors (`get`/`set`) are not yet implemented in native compilation. Use explicit getter/setter methods instead.
* **No destructuring** — Array and object destructuring (`const [a, b] = arr`, `const {x, y} = obj`) not yet supported.
* **No spread operator** — Spread syntax (`...arr`, `...obj`) not yet implemented.
* **No rest parameters** — Rest parameters in functions (`function f(...args)`) not yet supported.
* **No optional chaining beyond null checks** — Only `?.` for null/undefined checks is supported, not full optional chaining.
* **No template literal expressions** — Template literals work for simple strings but not with embedded expressions beyond variables.

**Why these restrictions?**
* Enable complete static type inference
* Guarantee predictable runtime behavior
* Allow safe transpilation to C++ with deterministic semantics
* Eliminate entire classes of bugs common in JavaScript

These restrictions make GoodScript code more maintainable and ensure that TypeScript development behavior matches native compilation behavior exactly.

### 1.2. Simple Automatic Memory Management

In GoodScript, reference to heap-allocated values are qualified using ownership qualifiers:

* `own<T>` — exclusive ownership of a value.
* `share<T>` — reference-counted shared ownership.
* `use<T>` — non-owning references (may be `null` or `undefined`).

The compiler checks the correctness of memory ownership rules and performs analysis to ensure no ownership loops can be formed at runtime in compiled apps. This allows GoodScript to reliably use simple and performant reference counting instead of complex and unpredictable garbage collection.

Complex structures which require cross referencing between nodes must be implemented using the Arena/Pool pattern, where node ownership is centralized in a single pool and nodes only keep non-owning references to each other.

This is rarely needed in most application, and it's a small price to pay for getting rid of garbage collection and gain in memory footprint, performance and predictability, completely eliminating GC latencies and huge binaries containing complex runtimes.

These types are **transparent in TypeScript**, making GoodScript code valid TS code for development and prototyping.

```ts
declare type own<T> = T;
declare type share<T> = T;
declare type use<T> = T | null | undefined;
```

---

## 2. Dual-Mode Workflow

GoodScript supports **two modes of execution** and **two memory management strategies**:

### **2.1 TypeScript Runtime Mode**

* `.gs.ts` files are valid TypeScript.
* Run directly in Node.js or Deno.
* Use standard TS tooling: type checking, linters, editors.
* Rapid development and testing without transpiling to native code.

Example:

```ts
async function example(sharedNode: share<Node>) {
    let weakNode: use<Node> = sharedNode;
    console.log(weakNode?.value); // Safe access in TS
}
```

### **2.2 Native Mode (Transpilation)**

GoodScript offers two compilation modes for native C++ targets:

#### **Ownership Mode** (default - deterministic memory management)

* Transpile `.gs.ts` to **C++20** with smart pointer-based ownership.
* Ownership qualifiers map to optimized C++ smart pointers:

  * `own<T>` → `std::unique_ptr<T>`
  * `share<T>` → `gs::shared_ptr<T>` (lightweight non-atomic refcounting, ~3x faster)
  * `use<T>` → `gs::weak_ptr<T>` (lightweight non-atomic weak references, ~3x faster)
* Requires explicit ownership annotations for complex data structures

#### **GC Mode** (new - automatic memory management)

* Compiles **Phase 1 code without ownership annotations**
* Uses automatic garbage collection (MPS-based, coming soon; malloc MVP currently)
* Lower barrier to entry - start coding immediately
* Gradual migration path to ownership mode for production
* See [GC Mode documentation](docs/GC-MODE.md) for details

```bash
# GC mode (no ownership annotations required)
gsc -t native -m gc -o dist src/main.gs.ts

# Ownership mode (requires ownership annotations)
gsc -t native -m ownership -o dist src/main.gs.ts  # or just -t native
```
* **Runtime Library**: TypeScript-compatible wrapper classes (`gs::String`, `gs::Array<T>`, `gs::Map<K,V>`, etc.)
  - Header-only, zero-overhead wrappers around C++ STL
  - Methods match TypeScript/JavaScript naming exactly
  - Complete test coverage
* Ensures **memory safety, deterministic destruction, and DAG-enforced ownership**.
* Uses **C++20 features** (concepts, ranges, coroutines for async/await).
* **Performance optimizations**: Custom smart pointers use non-atomic operations, safe for single-threaded execution.
* Optional: use **Zig toolchain** for zero-config cross-compilation.

---

## 3. Memory Safety and Reference Qualifiers

* All heap-allocated values must have **explicit reference qualification**.
* Reference derivation rules prevent cycles and unsafe memory access:

  * From `own<T>` → only `use<T>` can be derived.
  * From `share<T>` → `share<T>` or `use<T>`.
  * From `use<T>` → only `use<T>`.
* Weak references are accessed with optional chaining (`?.`) in TS, which maps to safe upgrade in native code.

---

## 4. Tooling Support

### **VSCode Extension**

* Supports `.gs.ts` files.
* Provides:

  * **Validation of GoodScript constraints** (no dynamic features, ownership qualifiers).
  * **Syntax highlighting** and IntelliSense for `.gs.ts` files.
  * **Real-time feedback** on memory-safety rules and DAG enforcement.
* Enables **fast feedback loop** during development while keeping code valid TypeScript.

### **Compiler (gsc) & Zig Toolchain**

GoodScript uses the **Zig C++ compiler** for native compilation, providing:

* **Zero-config cross-compilation** - Compile for any platform from any platform
* **No complex toolchain setup** - Single 15MB self-contained binary
* **Aggressive optimizations** - `-O2`, `-march=native`, `-ffast-math`, `-funroll-loops`
* **Multiple targets** - Linux, Windows, macOS, WebAssembly, and more

**Installation:**
```bash
# Zig compiler
# macOS
brew install zig

# Linux/Windows
# See https://ziglang.org/download/

# PCRE2 library (required for RegExp support)
# macOS
brew install pcre2

# Ubuntu/Debian
sudo apt-get install libpcre2-dev

# Fedora/RHEL
sudo dnf install pcre2-devel
```

**Compiler Implementation Phases:**
* **Phase 1**: Validates TypeScript "Good Parts" restrictions (no `var`, no `==`, etc.)
* **Phase 2**: Analyzes ownership and enforces DAG (Directed Acyclic Graph) rules
* **Phase 3**: Generates C++20 code with smart pointers
  * C++ source generation
  * Native binary compilation with Zig
  * Cross-compilation to any platform
  * Complete runtime library (String, Array, Map, Set, RegExp, JSON, console)
  * Class inheritance and generic base classes
  * Smart pointer management (custom non-atomic shared_ptr/weak_ptr)
* **Phase 4**: Standard library, module system, and deployment (📋 planned)

**CLI Examples:**

```bash
# Compile to JavaScript (TypeScript mode)
gsc -o dist src/main.gs.ts

# Generate C++ source
gsc -t native -o dist src/main.gs.ts

# Compile to native binary
gsc -t native -b -o dist src/main.gs.ts

# Cross-compile to Linux
gsc -t native -b -a x86_64-linux -o dist src/main.gs.ts

# Cross-compile to WebAssembly
gsc -t native -b -a wasm32-wasi -o dist src/main.gs.ts
```

---

## 5. Benefits for Developers

1. **Familiar TS syntax:** Minimal learning curve.
2. **Rapid iteration:** Node.js execution allows testing before native deployment.
3. **Memory-safe systems programming:** Safe ownership semantics enforced during transpilation.
4. **Cross-platform native builds:** C++20 backend + Zig toolchain for multiple targets.
5. **Safe complex data structures:** Arena/Pool pattern handles graphs and trees without violating DAG rules.
6. **Integrated tooling:** VSCode extension ensures errors are caught early.
7. **Modern C++ output:** RAII, smart pointers, and C++20 features (concepts, ranges, coroutines).

---

## 6. Example: GoodScript in Action

```ts
// .gs.ts file
declare type share<T> = T;
declare type use<T> = T | null | undefined;

class Node {
    value: number;
    parent: use<Node>;
    children: share<Node>[];
}

async function demo(node: share<Node>) {
    let child: share<Node> = node;
    let weakRef: use<Node> = child;
    console.log(weakRef?.value);
}
```

* Runs directly in Node.js.
* Transpiles to C++20 with optimized `gs::shared_ptr`/`gs::weak_ptr` (3x faster than standard library).

---

## 7. Current Status (December 2025)

### Completed
- ✅ **Phase 1**: TypeScript "Good Parts" validation (315/315 tests passing)
- ✅ **Phase 2**: Ownership analysis and DAG enforcement (237/237 tests passing)
- ✅ **Phase 3**: C++ code generation (100% complete - 1051/1051 tests passing) 🎉
  - ✅ **Complete AST traversal and code emission system**
  - ✅ **Type mappings**: primitives, arrays, maps, sets, ownership types
  - ✅ **Statement generation**: variables, functions, classes, control flow
  - ✅ **Expression generation**: operators, calls, literals, property access
  - ✅ **Class inheritance** with generic base classes and super() calls
  - ✅ **Smart pointer management**: Custom non-atomic shared_ptr/weak_ptr (~3x faster)
  - ✅ **Runtime Library**: Complete TypeScript-compatible wrappers
    - `gs::String` - Full String API (charAt, indexOf, substring, slice, match, replace, split, etc.)
    - `gs::Array<T>` - Full Array API (push, pop, map, filter, reduce, etc.) with auto-resize
    - `gs::Map<K,V>` & `gs::Set<T>` - TypeScript Map/Set APIs with insertion-order preservation
    - `gs::RegExp` - Full JavaScript regex semantics via PCRE2 (lookahead, lookbehind, Unicode, all flags)
    - `gs::JSON` - JSON.stringify() and JSON.parse()
    - `gs::console` - console.log(), error(), warn() with proper boolean/number formatting
    - Header-only, zero-overhead, composition-based (no STL inheritance)
  - ✅ **GC Mode**: malloc-based allocator for simpler memory model (100% compatibility)
  - ✅ **Triple-Mode Testing**: JavaScript + Ownership C++ + GC C++ equivalence validation
  - ✅ **Zig C++ compiler integration** for zero-config cross-compilation
  - ✅ **Native binary compilation** with aggressive optimizations
  - ✅ **Cross-compilation support** to Linux, Windows, macOS, WebAssembly
  - ✅ **15/15 concrete examples** passing (100%): binary-search-tree, fibonacci, linked-list, lru-cache, n-queens, json-parser, string-pool, hash-map, etc.

### Planned
- 📋 **Phase 4**: Standard library APIs, module system, package management, deployment tooling
- 📋 **Advanced Features**: Optional unwrapping, destructuring, getters/setters, spread operator

---

## 8. Conclusion

GoodScript allows developers to **write memory-safe systems code using familiar TypeScript syntax**, with a smooth transition from fast TS development to robust native deployment. The **VSCode extension** ensures validation and tooling support, while the **dual-mode workflow** enables both rapid iteration and high-performance native applications.

---

*End of document.*
