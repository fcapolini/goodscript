# GoodScript: A Strongly Typed, Memory-Safe Language

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

***

## Implementation Strategy (Phased Approach)

The language will be implemented incrementally, focusing on safety and correctness before optimization.

| Phase | Core Goal | Output Target | Primary Value Delivered |
| :--- | :--- | :--- | :--- |
| **Phase 1: Strict Semantics** | Remove all dynamic/unsafe JS features; enforce explicit ownership syntax. | Standard JavaScript/TypeScript | **Enterprise Safety.** Provides a cleaner, bug-resistant syntax and a valid value proposition immediately. |
| **Phase 2: Ownership Analysis** | Implement the **DAG Check** on $\text{shared}<T>$ links within the TypeScript AST. | Standard JavaScript/TypeScript | **Compile-Time Safety.** Proves the memory model is sound before code generation. |
| **Phase 3: Rust Code Generation** | Transpile the verified AST to optimized Rust source code. | Rust | **Performance & Final Safety.** Delivers the zero-cost binary using `Box<T>`, `Rc<T>`, and `Weak<T>`. |

***

## 🔢 Primitive vs. Reference Types

Only the following **Value Types** can be used without an explicit qualifier:

* `number` (mapped to `f64` in Rust)
* `boolean`

All other complex types, including **Strings** and **Arrays**, are treated as heap-allocated **Reference Types** and **must** be qualified (e.g., `let s: unique<string>`).

> **Future Evolution**: Additional numeric types (like dedicated integer types) may be added in post-Phase 3 releases.

***

## Null and Undefined Handling

GoodScript treats `null` and `undefined` as **synonyms** representing the absence of a value. This design decision prioritizes developer ergonomics while maintaining type safety:

### Unified Null Semantics

* **Both `null` and `undefined` are valid** and can be used interchangeably in GoodScript code
* **Type system equivalence:** `T | null` and `T | undefined` are treated as identical types
* **Equality semantics:** Both `==` and `===` treat `null` and `undefined` as equal values
* **Null checks accept either:** Checking `if (x !== null)` or `if (x !== undefined)` both satisfy the compiler's null-safety requirements

### Rationale

JavaScript's distinction between `null` and `undefined` is a historical artifact that adds cognitive overhead without providing meaningful type safety benefits. TypeScript's built-in APIs (like `Map.get()`, `Array.find()`, optional properties) return `undefined`, while developers often use `null` for explicit absence.

By treating them as synonyms, GoodScript:
1. **Eliminates conversion boilerplate** - No need for `?? null` when using standard library APIs
2. **Maintains compatibility** - Works naturally with TypeScript's type system and standard library
3. **Simplifies mental model** - One concept for "no value" instead of two
4. **Follows industry practice** - Languages like Kotlin, Swift, and Rust have a single null/nil/None concept

### Example

```typescript
const map = new Map<string, number>();
map.set("a", 42);

// Both patterns are valid and equivalent
const value1 = map.get("b");  // Type: number | undefined
if (value1 !== undefined) {
  console.log(value1);
}

const value2 = map.get("c");  // Type: number | undefined (treated as number | null)
if (value2 !== null) {
  console.log(value2);
}

// Optional chaining works naturally
console.log(map.get("d")?.toString());
```

### Weak Reference Null Safety

All `weak<T>` references are implicitly nullable (either `null` or `undefined` may occur at runtime). The compiler enforces null checks before dereferencing:

```typescript
class Node {
  parent: weak<Node>;  // Implicitly nullable
  
  getParentValue(): string {
    // Must check before access
    if (this.parent !== null) {  // or !== undefined
      return this.parent.value;
    }
    return "no parent";
  }
}
```
