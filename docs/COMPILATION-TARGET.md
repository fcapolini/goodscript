# GoodScript Compilation Target Considerations: C++ vs Rust

**Audience:** GoodScript language and compiler designers, potential runtime contributors

**Purpose:** Outline the reasoning behind choosing C++ over Rust as the primary GoodScript compilation target, considering language design, memory safety, code generation, and ecosystem.

---

## 1️⃣ Memory Safety Alignment

* GoodScript enforces memory safety **intrinsically** through:

  * Explicit reference qualifiers: `own<T>`, `share<T>`, `use<T>`
  * DAG-based ownership analysis preventing cycles
  * Controlled derivation of references (`Unique` → `Weak`, `Shared` → `Shared`/`Weak`, `Weak` → `Weak`)

* These guarantees **already prevent dangling references and cycles**, making Rust’s borrow checker largely redundant.

* **C++ mapping:**

  * `own<T>` → `std::unique_ptr<T>`
  * `share<T>` → `std::shared_ptr<T>`
  * `use<T>` → `std::weak_ptr<T>`
  * Direct and intuitive mapping without compiler interference.

* **Rust mapping:**

  * `own<T>` → `Box<T>`
  * `share<T>` → `Rc<T>` / `Arc<T>`
  * `use<T>` → `use<T>`
  * Borrow checker enforces lifetimes, often requiring additional wrapping and unwrapping.

---

## 2️⃣ Developer Ergonomics & Codegen Simplicity

* **C++ target advantages:**

  1. Permissive compilation model allows **direct code generation** from GoodScript DAG rules.
  2. Minimal boilerplate: smart pointers naturally express GoodScript references.
  3. Async/await translation via C++20 coroutines (`cppcoro`) integrates cleanly.
  4. Easier integration with existing C++ libraries (math, networking, STL/Abseil).

* **Rust target considerations:**

  * Additional complexity in codegen due to lifetimes and borrow checker rules.
  * Async translation requires careful mapping to `async` functions returning `Future` and lifetime management.
  * Potential friction when wrapping C++ libraries for native GoodScript API support.

---

## 3️⃣ Performance Considerations

* Both C++ and Rust produce **highly optimized native binaries**.
* GoodScript’s DAG-based ownership and static typing already provide:

  * Predictable memory layout
  * Deterministic destruction
  * Minimal runtime overhead (weak reference access and reference counting)
* Rust safety mechanisms provide little additional **runtime performance gain**, since unsafe scenarios are already prevented.
* C++ smart pointers have **zero-cost moves** for `own<T>` and efficient reference counting for `share<T>`.

---

## 4️⃣ Ecosystem & Library Support

* **C++:**

  * Mature libraries for math, networking, ML, optimization, data structures.
  * Easier to wrap for TS-like APIs under a `gs` namespace.

* **Rust:**

  * Libraries exist, but FFI with C++-style ecosystem adds complexity.
  * Lifetime enforcement may complicate integration with external native code.

---

## 5️⃣ Async / Coroutine Integration

* **C++:**

  * C++20 coroutines with `cppcoro::task<T>` map directly to GoodScript async functions.
  * Weak reference upgrades and DAG-safe access are simple to implement.

* **Rust:**

  * Requires mapping to `async fn` returning `Future<T>`.
  * Lifetime and borrow checker rules may introduce additional wrapping for weak references and suspension points.

---

## 6️⃣ Summary Table

| Factor               | C++ Target                                                | Rust Target                                                      |
| -------------------- | --------------------------------------------------------- | ---------------------------------------------------------------- |
| Memory safety        | Guaranteed by DAG rules; direct mapping to smart pointers | Redundant with borrow checker; may require extra wrapping        |
| Codegen complexity   | Minimal; straightforward smart pointer mapping            | Higher; lifetimes and borrow rules complicate codegen            |
| Async/await          | C++20 coroutines (`cppcoro::task<T>`) integrate naturally | Requires `Future` and careful lifetime management                |
| Performance          | High; deterministic destruction and zero-cost moves       | High; similar runtime performance but extra compiler constraints |
| Ecosystem            | Rich C++ libraries; easy to wrap                          | Mature Rust libraries; integration more complex                  |
| Developer ergonomics | Familiar mapping; minimal boilerplate                     | More verbose; borrow checker friction                            |

---

## ✅ Conclusion

* **C++ is the preferred target** for GoodScript because:

  * The language’s DAG-based ownership guarantees memory safety on its own.
  * Code generation is simpler, with direct mapping to smart pointers.
  * Integration with libraries and async workflows is easier.
  * Performance is comparable to Rust with less friction.

* Rust could remain a secondary target for extra safety, but it introduces **unnecessary complexity** given GoodScript’s intrinsic memory guarantees.

---

*End of document.*
