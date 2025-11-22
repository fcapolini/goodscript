# Comparison of GoodScript's Ownership Model vs. Rust's Memory Safety Guarantees

**Audience:** Compiler designers and systems developers

**Purpose:** Provide a clear, developer-oriented comparison between GoodScript's ownership model (unique/shared/weak + DAG constraints) and Rust’s borrow-checker-based memory model.

---

# 1. Overview

GoodScript enforces memory safety using:

* **Qualified references:** `unique`, `shared`, `weak`
* **Static DAG ownership analysis** for all owning references
* **Smart-pointer–like semantics** in the generated backend

Rust enforces memory safety using:

* **Affine types and the borrow checker**
* **Strict aliasing rules** (no mutable and immutable references at the same time)
* **Lifetime inference** to ensure references never outlive their owners
* **Ownership + borrowing + lifetime constraints** enforced at compile time

Both approaches aim to eliminate use-after-free, double-free, dangling pointers, and memory cycles—but they do so with different constraints and trade-offs.

---

# 2. Core Safety Principles

| Safety Concern             | GoodScript                                                                                  | Rust                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Use-after-free             | Prevented by type qualifiers + refcounts                                                    | Prevented by borrow checker and lifetimes                   |
| Double-free                | Disallowed by ownership model and smart pointers                                            | Disallowed by exclusive ownership                           |
| Reference cycles           | Prevented **statically** via DAG check                                                      | Prevented **manually** via `Rc` + `Weak` patterns           |
| Dangling references        | Prevented with weak upgrade semantics                                                       | Prevented by static lifetimes                               |
| Aliasing bugs              | Prevented only for `unique`                                                                 | Prevented universally by aliasing rules                     |
| Data races (multithreaded) | Not applicable: GoodScript is single-threaded; parallelism occurs only via workers/isolates | Prevented statically by `Send`/`Sync` + ownership/borrowing |

---

# 3. What GoodScript Guarantees

GoodScript focuses purely on **safe memory management**, guaranteeing:

* No premature frees
* No leaks caused by ownership cycles
* No aliasing of unique references
* Safe use of non-owning references (weak)
* Deterministic destruction for unique objects
* Eventual destruction for shared objects

### What it *does not* enforce

Unlike Rust, GoodScript **does not impose aliasing or borrowing constraints** on non-unique references. This is acceptable because mutability conflicts are avoided by single-threaded execution.

---

# 4. What Rust Guarantees That GoodScript Does Not

Rust provides **memory safety + aliasing safety + thread safety**.

## 4.1 Aliasing and Mutability Rules

Rust enforces:

* "One mutable reference OR many immutable references"
* Mutability cannot be aliased unsafely
* Mutable access cannot occur through multiple paths

GoodScript does not track mutability for shared references, but this is safe under single-threaded execution.

## 4.2 Lifetime Enforcement for All References

Rust ensures that every reference has a statically determined lifetime, preventing dangling references.
GoodScript relies on refcounts and weak upgrade checks; combined with DAG analysis, this guarantees memory safety without static lifetime checking.

## 4.3 Thread-Safety Guarantees

Rust prevents data races using `Send`/`Sync` traits.
GoodScript does **not need** these guarantees because execution is single-threaded, and parallelism is handled through workers with isolated heaps.

---

# 5. What GoodScript Guarantees That Rust Does Not

## 5.1 No Borrow Checker Complexity

GoodScript avoids borrow-checking errors, non-lexical lifetime nuances, and the cognitive load associated with Rust’s borrow rules.

## 5.2 Guaranteed Acyclic Ownership Graph

GoodScript statically forbids ownership cycles, ensuring that shared objects are always eventually freed. In Rust, cycles can occur with `Rc` unless the programmer explicitly uses `Weak`.

## 5.3 More Predictable Semantics for Shared Objects

Shared ownership in GoodScript is guaranteed safe and leak-free without programmer intervention, unlike Rust's manual `Weak` usage.

---

# 6. Comparison of Expressiveness

| Feature                                         | GoodScript                   | Rust                                       |
| ----------------------------------------------- | ---------------------------- | ------------------------------------------ |
| Expressiveness for complex ownership topologies | Medium (DAG only)            | High (graphs, cycles, interior mutability) |
| Difficulty of implementation                    | Low/Medium                   | High                                       |
| Predictability                                  | High                         | Medium (borrow checker complexity)         |
| Low-level control                               | Medium                       | High                                       |
| Implicit aliasing guarantees                    | Low                          | Very high                                  |
| Thread-safety                                   | Not needed (single-threaded) | High (static enforcement)                  |

---

# 7. Summary

GoodScript provides a **sound and pragmatic memory safety system** that maps cleanly to C++ smart pointers while avoiding the complexity of Rust's borrow checker.

It guarantees:

* Safety from classic memory errors
* No ownership cycles
* Predictable object lifetimes

Rust guarantees these **plus** strong aliasing discipline, static lifetime checking, and thread-safety enforcement.

GoodScript is simpler and well-suited for transpilation to C++ with predictable semantics. Rust is stronger in multi-threaded and aliasing-heavy environments.

---

# 8. Conclusion

GoodScript’s memory model provides robust memory safety for a single-threaded language environment. It is simpler than Rust while retaining deterministic destruction and leak-free shared ownership, making it an excellent choice for transpilation to C++.

*End of document.*
