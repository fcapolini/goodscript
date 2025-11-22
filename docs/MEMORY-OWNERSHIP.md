# Formal Correctness of the Ownership & Reference Model

**Target format:** Markdown usable in a compiler repository

**Length:** Medium (5–7 pages equivalent)

**Audience:** Compiler developers implementing or maintaining the transpiler backend

---

# Overview

This document specifies and justifies the correctness of the memory ownership and reference model used by the language. The model statically enforces safe memory usage and ensures that all generated C++ code using `std::unique_ptr`, `std::shared_ptr`, and `std::weak_ptr` is free from memory errors.

The objective is to guarantee:

* no use-after-free
* no double-free
* no reference cycles
* predictable destruction
* safe upgrade/downgrade semantics
* stable, well-defined ownership

This is achieved *without* requiring a borrow checker, runtime garbage collector, or complex escape analysis.

---

# 1. Model Summary

## 1.1 Reference Qualifiers

Every reference to a heap-allocated value carries one of these qualifiers:

* **`unique`** — exclusive ownership of the object
* **`shared`** — reference-counted, owning
* **`weak`** — non-owning reference

These qualifiers are verified statically by the compiler.

## 1.2 Derivation Rules

Given a value of a qualified reference type:

* From **`unique`**, you may derive: `weak`
* From **`shared`**, you may derive: `shared`, `weak`
* From **`weak`**, you may derive: `weak`

No other derivations are legal.

These rules guarantee predictable ownership flow.

## 1.3 DAG Ownership Restriction

The compiler performs a directed acyclic graph (DAG) check across all owning references (`unique` and `shared`). Cycles in the ownership graph are disallowed.

This removes the primary hazard of reference-counted runtimes: **leaks caused by strong reference cycles**.

---

# 2. Operational Interpretation in C++

The generated C++ code maps the qualifiers as follows:

| Language Qualifier | C++ Type             |
| ------------------ | -------------------- |
| `unique`           | `std::unique_ptr<T>` |
| `shared`           | `std::shared_ptr<T>` |
| `weak`             | `std::weak_ptr<T>`   |

The semantics of each qualifier match the behavior of the corresponding standard smart pointer:

* `unique_ptr` → single owner, moves ownership, cannot be copied
* `shared_ptr` → refcounted ownership
* `weak_ptr` → non-owning, may expire

Because the language enforces invariants stronger than C++ itself, the emitted C++ code is safe and predictable.

---

# 3. Invariants Guaranteed by the Type System

## 3.1 Ownership Exclusivity (Unique References)

A `unique` reference has exactly one owner. This means:

* no aliasing
* no hidden copies
* moves are explicit in the IR

This prohibits double-free and use-after-free through implicit aliasing.

## 3.2 Shared Ownership Safety

A `shared` reference always corresponds to a `shared_ptr`, and all derived references maintain the reference count correctly.

Because the language prohibits forming ownership cycles, destruction of shared objects is guaranteed eventually.

## 3.3 Weak Reference Soundness

`weak` references:

* never extend the lifetime of an object
* can only be converted back to strong references via an explicit upgrade (e.g., `lock()`)

The type system ensures that weak references never become implicit strong references.

## 3.4 No Cycles in the Ownership Graph

The compiler builds a graph where nodes are objects and edges are owning references.

Any cycle in this graph would cause a memory leak if implemented via `shared_ptr`.

By rejecting cycles statically, the compiler eliminates the need for cycle detection or tracing GC.

---

# 4. Safety Guarantees

This chapter outlines what the system *prevents*.

## 4.1 No Use-After-Free

Use-after-free in C++ typically occurs when object lifetime ends but references remain.

**Unique case:** Impossible due to exclusivity.

**Shared case:** Refcount ensures object stays alive until last owner releases.

**Weak case:** Using a weak reference requires upgrading. Upgrade failure produces an empty result, not undefined behavior.

## 4.2 No Double-Free

Double-free occurs when memory is deallocated twice.

* `unique_ptr` manages deallocation once
* Program structure guarantees no other owning references exist
* `shared_ptr` manages its own refcount
* `weak_ptr` never deallocates

Combined with aliasing rules, double-free cannot happen.

## 4.3 No Leaks via Cycles

Because cycles of owning references are detected and rejected at compile time, all objects managed by `shared_ptr` eventually release.

## 4.4 No Dangling Weak References

Weak references can expire, but attempting to use one requires an explicit upgrade operation. The transpiler inserts runtime checks corresponding to `lock()`.

Thus, dangling weak pointers are safe by construction.

## 4.5 No Illegal Aliasing

C++ aliasing rules are not violated because:

* All heap references are wrapped in smart pointers
* Raw pointers for owning references never appear
* Unique references never alias

---

# 5. Destruction Semantics

## 5.1 Unique-Owned Objects

Destroyed when the unique owner goes out of scope or resets the pointer.

Guarantees deterministic destruction.

## 5.2 Shared-Owned Objects

Destroyed when the last `shared_ptr` reference disappears.

Since cycles are disallowed, shared objects are guaranteed to be reclaimed.

## 5.3 Weak References

Do not participate in destruction, do not influence lifetimes.

---

# 6. Proof Sketch of Memory Safety

This is an informal but rigorous justification for correctness.

## 6.1 Properties

We need to show:

1. **Liveness:** No reachable object is prematurely deallocated.
2. **Safety:** No deallocated object is reachable.
3. **Progress:** All unreachable objects are eventually deallocated.

## 6.2 Liveness

All owning references are tracked (`unique` or `shared`). Since all aliases are forbidden except through legal derivations:

* unique refs ensure exclusive ownership
* shared refs increment rc

Therefore, an object’s lifetime is strictly bound to the lifetime of its owning references.

## 6.3 Safety

Because weak references cannot be dereferenced without upgrading, and upgrading checks lifetime safety, dereferencing freed memory is impossible.

## 6.4 Progress

Because the ownership graph is acyclic:

* every object has a finite chain of owners
* shared ownership refcount eventually drops to zero
* unique-owned objects are freed deterministically

Thus all unreachable objects are eventually reclaimed.

---

# 7. Practical Considerations for Developers

## 7.1 Predictable Performance

* `unique` is zero-overhead.
* `shared` uses atomic or non-atomic refcounts depending on threading.
* `weak` is cheap, but upgrade operations cost a refcount load.

## 7.2 Interaction With User Data Structures

Developers must be aware that cyclic ownership through fields is rejected. Some data structures may require weak edges (e.g., parent pointers in trees).

## 7.3 Mutation Rules

If a structure must be shared and mutated, developers must use

* interior mutability wrappers in the language, or
* expose mutation only when a unique reference exists

## 7.4 Interoperability with C++

Generated C++ code produces idiomatic, predictable smart-pointer-based ownership patterns.

## 7.5 Debuggability

Because ownership is explicit, debugging memory issues is easier compared to traditional C++, where hidden aliasing can cause undefined behavior.

---

# 8. Conclusion

This ownership and reference model provides:

* Deterministic destruction
* Absence of memory safety bugs
* No reference cycles
* Clean mapping to C++ smart pointers
* Predictable semantics for developers

The system is simpler than Rust’s borrow checker while still guaranteeing memory correctness. This makes it well suited for transpilation into C++ while retaining strong safety guarantees.

---

# 9. Future Extensions

Possible future work:

* Linear types for buffers and regions
* Thread-aware shared reference types
* Scoped borrows for temporary aliasing
* Custom allocators

These can extend safety and performance without altering the core model.

---

*End of document.*
