# GoodScript Language Description for Implementors

**Audience:** Compiler engineers and language toolchain developers

**Purpose:** Provide a detailed, implementor-oriented overview of GoodScript, a TypeScript specialization designed for safe systems programming with deterministic memory management.

---

## 1. Language Overview

GoodScript is a **statically typed, memory-safe, single-threaded language** derived from TypeScript. It preserves the overall **TypeScript syntax and semantics** while removing dynamic features and introducing explicit memory management through ownership qualifiers.

**Key Design Goals:**

* Enable **safe systems programming** for TypeScript developers.
* Provide **deterministic destruction and memory safety** without garbage collection.
* Maintain familiar TypeScript syntax for easy adoption.
* Integrate **unique/shared/weak ownership semantics** for heap-allocated values.
* Support cross-compilation and C++ code generation.

---

## 2. Type System

### 2.1 Ownership Qualifiers

All heap-allocated values must be **qualified** with one of the following:

| Qualifier   | Semantics                                                                                                 |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| `own<T>` | Exclusive ownership; cannot be copied; destroyed deterministically.                                       |
| `share<T>` | Reference-counted ownership; multiple shared owners allowed; destroyed when last owner goes out of scope. |
| `use<T>`   | Non-owning reference; can be upgraded to `share<T>` conditionally if object is still alive.              |

### 2.2 Rules and Constraints

* The compiler performs **DAG analysis** on all owning references to prevent cycles.
* Reference derivation rules:

  * From `own<T>` → only `use<T>` can be derived.
  * From `share<T>` → `share<T>` or `use<T>` can be derived.
  * From `use<T>` → only `use<T>` can be derived.
* These rules guarantee **memory safety and correct destruction**.

### 2.3 Optional Access

* Weak references can be accessed conditionally using the **optional chaining operator** `?.`, e.g., `w?.value`.
* This corresponds to upgrading the weak reference to a strong reference in the generated C++ code, only if the object exists.

### 2.4 Immutability and Readonly

GoodScript supports TypeScript's `readonly` modifier for arrays, providing **const-correctness** in both TypeScript and generated C++ code.

**TypeScript Semantics:**
* `readonly T[]` parameters prevent modification of the array
* Cannot call mutating methods (`push`, `pop`, `sort`, `splice`, etc.)
* Cannot assign to array elements (`arr[0] = value`)
* Can read from arrays and iterate over elements

**C++ Code Generation:**
* `readonly T[]` → `const gs::Array<T>&` (const reference)
* `T[]` → `gs::Array<T>&` (mutable reference)

**Defense in Depth:**
* TypeScript's type checker rejects violations at compile time
* C++ compiler enforces the same restrictions if code bypasses TypeScript
* `const` prevents calling non-const methods and returns `const_reference` from `operator[]`

**Example:**
```typescript
// Readonly parameter - cannot modify
function sum(numbers: readonly number[]): number {
  let total = 0;
  for (const n of numbers) {
    total += n;  // ✓ Reading is allowed
  }
  // numbers.push(1);   // ✗ TypeScript error
  // numbers[0] = 1;    // ✗ TypeScript error
  return total;
}

// Mutable parameter - can modify
function double(values: number[]): void {
  for (let i = 0; i < values.length; i++) {
    values[i] *= 2;  // ✓ Modification allowed
  }
}
```

**Type Safety:**
* Regular arrays can be passed to `readonly` parameters (covariant)
* TypeScript enforces this at compile time, preventing memory safety issues

**Restrictions:**
* The `as const` assertion is **not allowed** in the current implementation (GS117)
* This is a temporary limitation due to code generation complexity, not a language design decision
* Use explicit `readonly` type annotations instead: `const arr: readonly number[] = [1, 2, 3]`
* Future versions may support `as const` once the code generator is more mature

---

## 3. Language Features

### 3.1 Core Language Features

* Full TypeScript **syntax and type system** minus dynamic features (no `any`, `eval`, `with`, `prototype` manipulation).
* Strongly typed functions, classes, interfaces, generics.
* Modules, imports, and exports are preserved.

### 3.2 Memory Management

* Heap allocation must use `new` with explicit ownership qualifier.
* Compiler enforces correct usage of `unique`, `shared`, and `weak`.
* No runtime garbage collection; destruction is deterministic.
* Cycles are prevented via DAG ownership checks; for complex structures, the **Arena/Pool pattern** is recommended.

### 3.3 Concurrency Model

* **Single-threaded execution**; parallelism via workers/isolates only.
* No shared-memory concurrency; therefore, thread-safety guarantees like Rust’s `Send`/`Sync` are unnecessary.

---

## 4. Interoperability and Backend

* GoodScript can be transpiled to **C++** using `unique_ptr`, `shared_ptr`, and `weak_ptr` for memory management.
* Optionally, **Zig toolchain** can be used to compile the generated C++ code to multiple platforms.
* Weak reference upgrades map to conditional dereferencing (`?.`) in GoodScript, and `lock()` checks in C++.

---

## 5. Developer Experience Considerations

* Ownership qualifiers are mostly inferred in simple cases.
* For complex graphs, developers use **Arena/Pool** to centralize ownership and express relationships as weak references.
* Compiler provides diagnostics if DAG rules are violated or if unsafe operations are attempted.
* Familiar TypeScript syntax reduces the learning curve.

---

## 6. Summary

GoodScript is a **deterministic, memory-safe, single-threaded TypeScript variant** that:

* Augments TypeScript with `own<T>`, `share<T>`, and `use<T>` ownership generics.
* Eliminates dynamic features for safer compilation.
* Guarantees safe memory handling via DAG enforcement.
* Provides optional conditional access for weak references.
* Integrates cleanly with C++ backends and cross-compilation toolchains like Zig.

This design allows TypeScript developers to safely write **systems-level code** while maintaining familiar syntax and idioms.

---

*End of document.*
