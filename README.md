# GoodScript

> **Rust performance for the rest of us**

Write clean TypeScript. Get native performance. No borrow checker required.

---

> ⚠️ **ALPHA STAGE**: GoodScript is under active development. Phase 1 (parsing, validation, JS target) is underway. Phase 2 (ownership analysis, implicit nullability) is next. Phase 3 (Rust code generation) will follow. APIs and language features may change.

---

**GoodScript** is two things:

- **A TypeScript variant with the "Good Parts" only**
  - Fully statically typed (no `any` type, no `eval`, no dynamic runtime types)
  - No type coercion, no `var`, no truthiness, no `this` surprises
  - Strict equality operators only (`===`, `!==`)
  - GoodScript sources use the `*.gs.ts` extension

- **A TypeScript to Rust transpiler**
  - Reference counting with ownership tracking (no GC, no borrow checker)
  - Static cycle detection prevents memory leaks
  - Compiles to Rust source code for native performance
  - Leverages Rust's `Rc`/`Weak` types for ownership semantics
  - Targets native executables and WASM via Rust toolchain
  - 1.05-1.15x overhead vs C/Rust, deterministic performance

The first part gets rid of JS baggage and results in a more robust, cleaner language overall. It can serve as a stricter replacement for TypeScript, offering better maintainability.

> The name GoodScript is a reference to "JavaScript: The Good Parts" by Douglas Crockford, from which this phylosophy was taken.

The secont part leverages what is now an enterprise level, fully statically typed language to add deterministic and efficient memory handling and making it compilable to self-contained binary executables.

> GoodScript handles compilation using the Rust toolchain, which allows for excellent performance, native binaries, and WASM modules generation.

## Clean TypeScript

GoodScript can be **incrementally adopted** in existing TypeScript projects. Use the `.gs.ts` file extension for GoodScript sources and continue using `.ts` for standard TypeScript files—they work side by side seamlessly.

Simply replace `tsc` with `gsc` in your build process:

```bash
# Instead of: tsc
gsc
```

Because GoodScript is a **strict subset of TypeScript**, you can gradually migrate files one at a time. Import GoodScript modules from TypeScript and vice versa:

```typescript
// node.ts (regular TypeScript)
import { Config } from './config.gs';  // Import from GoodScript

// config.gs.ts (GoodScript - strict rules enforced)
import { Node } from './node.gs';      // Import from GoodScript
import { logger } from './logger';     // Import from TypeScript
```

The `gsc` compiler enforces Phase 1 restrictions (no `var`, no `==`, arrow functions only, etc.) on `.gs.ts` files while treating `.ts` files as standard TypeScript. This allows you to introduce stricter coding standards incrementally without requiring a full codebase rewrite.

## Rust transpiler

In **Phase 3**, GoodScript will transpile to **optimized Rust source code**, delivering:

- **Native Performance:** 1.05-1.15x overhead vs hand-written C/Rust
- **Self-Contained Binaries:** No runtime dependencies, no garbage collector
- **WASM Support:** Compile to WebAssembly via Rust's `wasm32` target
- **Memory Safety:** Ownership system maps directly to Rust's `Box<T>`, `Rc<T>`, and `Weak<T>`
- **Deterministic Performance:** No GC pauses, predictable memory usage

The compiler's **DAG validation** (Phase 2) ensures that generated Rust code is memory-leak-free by preventing reference cycles at compile time. Complex data structures use the [arena pattern](docs/ARENA-PATTERN.md) to maintain DAG invariants while supporting natural graph/tree topologies.

```bash
# Compile GoodScript to Rust (Phase 3)
gsc --target rust src/main.gs.ts

# Build native binary via Rust toolchain
cd out/rust
cargo build --release
```

The Rust backend will support both server-side applications and browser WASM modules, making GoodScript suitable for performance-critical full-stack development.

## Language Overview

GoodScript combines TypeScript's familiar syntax with Rust's memory safety through a **Three-Tiered Ownership System**:

- **`unique<T>`** - Exclusive ownership (maps to Rust's `Box<T>`)
- **`shared<T>`** - Shared ownership with reference counting (maps to `Rc<T>`)  
- **`weak<T>`** - Non-owning references that break cycles (maps to `Weak<T>`)

The compiler enforces that `shared<T>` references form a **Directed Acyclic Graph (DAG)**, preventing memory leaks from reference cycles at compile time.

**Avoiding cycles:** For complex data structures like trees, graphs, and linked lists that would naturally create ownership cycles, use the **arena pattern** to centralize ownership. See [docs/ARENA-PATTERN.md](docs/ARENA-PATTERN.md) for detailed examples.

**Null handling:** GoodScript treats `null` and `undefined` as synonyms. All `weak<T>` references are implicitly nullable (`T | null | undefined`), and checking for either satisfies null-safety requirements.

**📖 See [docs/LANGUAGE.md](docs/LANGUAGE.md) for complete language specification**

## Implementation Phases

| Phase | Goal | Output | Status |
|-------|------|--------|--------|
| **Phase 1** | Strict TypeScript semantics | JavaScript/TypeScript | ✅ In Progress |
| **Phase 2** | Ownership analysis & DAG validation | JavaScript/TypeScript | 🚧 In Progress |
| **Phase 3** | Rust code generation | Native binaries via Rust | 📋 Planned |

See [docs/DAG-DETECTION.md](docs/DAG-DETECTION.md) for cycle detection implementation details.

## Installation

# Language description

> A Strongly Typed, Memory-Safe Language

GoodScript is a specialized dialect of TypeScript designed for **systems programming** and **large-scale enterprise applications**. Its primary goal is to combine the **developer productivity and syntax familiarity of TypeScript** with the **deterministic performance and memory safety guarantees of Rust**.

It achieves this by removing the unsafe, dynamic features of JavaScript and replacing implicit memory management with an explicit, compiler-enforced **Three-Tiered Ownership System**.

## Core Design Principles

The language is founded on the following strict rules:

1.  **Strict Static Typing:** All dynamic, runtime-changing aspects of standard JavaScript (like implicit coercion, `any`, and runtime type changes) are forbidden. All types must be known and fixed at compile time.
2.  **Explicit Ownership:** All complex, heap-allocated types (Objects, Arrays, Strings) must explicitly declare their lifetime management via an ownership qualifier.
3.  **Compile-Time Safety:** The language guarantees the elimination of memory leaks caused by ownership cycles by strictly enforcing that the graph of shared objects ($\text{shared}<T>$) is a **Directed Acyclic Graph (DAG)**.
4.  **Zero-Cost Abstraction:** When possible, the language maps ownership concepts to **zero-overhead Rust primitives** (like `Box<T>`), deferring to slower reference counting only when necessary.

***

## The Three-Tiered Ownership System

The core innovation is the requirement that all heap-allocated reference types (excluding primitives like `number` and `boolean`) must use one of these three ownership qualifiers.

### 1. Unique Ownership: $\text{unique}<T>$

* **Syntax Example:** `config: unique<Settings>`
* **Purpose:** Denotes **exclusive ownership**. The variable is the sole owner of the data on the heap.
* **Rust Mapping (Phase 3):** `std::boxed::Box<T>`
* **Memory Guarantee:** **Zero-Cost Abstraction.** The data is deallocated immediately when the `unique<T>` variable goes out of scope. Sharing or cloning is forbidden.

---

### 2. Shared Ownership: $\text{shared}<T>$

* **Syntax Example:** `nodes: shared<TreeNode>[]`
* **Purpose:** Denotes **co-ownership** where multiple variables may access and manage the lifetime of the same data. The data is only deallocated when the last co-owner is dropped.
* **Rust Mapping (Phase 3):** `std::rc::Rc<T>`
* **Memory Guarantee:** **Requires Static Analysis.** The compiler must verify that no path of `shared<T>` references leads back to itself (the **DAG Check**). If a cycle is detected, the definition is forbidden, and the developer must break the cycle using $\text{weak}<T>$. This is the foundation of the language's memory safety.

---

### 3. Non-Owning Reference: $\text{weak}<T>$

* **Syntax Example:** `parent: weak<TreeNode>`
* **Purpose:** Denotes a non-owning pointer used only for access. It does **not** contribute to the shared reference count.
* **Rust Mapping (Phase 3):** `std::rc::Weak<T>`
* **Memory Guarantee:** **Cycle Breaking.** Because it does not count towards the lifetime, it is used for back-pointers (e.g., Child $\to$ Parent) in complex structures, ensuring that shared ownership cycles cannot form. The reference must always be **conditionally dereferenced** (checked for existence) before use.
* **Null Semantics:** Weak references are implicitly nullable. GoodScript treats `null` and `undefined` as synonyms - both represent the absence of a value, and checking for either satisfies the compiler's null-safety requirements.

> [DAG-DETECTION.md](docs/DAG-DETECTION.md) contains a description of the DAG Check as it's implemented by the GoodScript compiler

***

## Null and Undefined Handling

GoodScript treats `null` and `undefined` as **synonyms** for developer ergonomics:

- **Type equivalence:** `T | null` and `T | undefined` are identical types
- **Equality:** Both `==` and `===` treat `null` and `undefined` as equal
- **Null checks:** Checking `if (x !== null)` or `if (x !== undefined)` both satisfy null-safety
- **Weak references:** All `weak<T>` types are implicitly `T | null | undefined`

This eliminates conversion boilerplate when using TypeScript's standard library (like `Map.get()` which returns `T | undefined`) while maintaining type safety.

See [docs/LANGUAGE.md](docs/LANGUAGE.md) for detailed null/undefined semantics.

***

## Implementation Strategy (Phased Approach)

The language will be implemented incrementally, focusing on safety and correctness before optimization.

| Phase | Core Goal | Output Target | Primary Value Delivered |
| :--- | :--- | :--- | :--- |
| **Phase 1: Strict Semantics** | Remove all dynamic/unsafe JS features. | Standard JavaScript/TypeScript | **Enterprise Safety.** Provides a cleaner, bug-resistant syntax and a valid value proposition immediately. |
| **Phase 2: Ownership Analysis** | Enforce explicit ownership syntax; implement the **DAG Check** on $\text{shared}<T>$ links within the TypeScript AST. | Standard JavaScript/TypeScript | **Compile-Time Safety.** Proves the memory model is sound before code generation. |
| **Phase 3: Rust Code Generation** | Transpile the verified AST to optimized Rust source code. | Rust | **Performance & Final Safety.** Delivers the zero-cost binary using `Box<T>`, `Rc<T>`, and `Weak<T>`. |

***

## 🔢 Primitive vs. Reference Types

Only the following **Value Types** can be used without an explicit qualifier:

* `number` (mapped to `f64` in Rust)
* `boolean`

All other complex types, including **Strings** and **Arrays**, are treated as heap-allocated **Reference Types** and **must** be qualified (e.g., `let s: unique<string>`).

> **Future Evolution**: Additional numeric types (like dedicated integer types) may be added in post-Phase 3 releases.
