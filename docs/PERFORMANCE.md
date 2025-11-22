# GoodScript Performance Summary

**Audience:** Developers evaluating GoodScript for high-performance systems programming.

**Purpose:** Highlight efficiency characteristics of GoodScript-compiled binaries compared to TypeScript running in Node.js, emphasizing memory and runtime performance.

---

## 1. Overview

GoodScript is a **statically typed, memory-safe TypeScript variant**. When transpiled to C++ and compiled to native binaries (optionally using the Zig toolchain), it provides significant performance advantages over standard TypeScript execution in Node.js or Bun.

Key factors contributing to efficiency:

* Fully static typing eliminates runtime type checks.
* Ownership qualifiers (`own<T>`, `share<T>`, `use<T>`) enable deterministic memory management.
* DAG-based ownership analysis prevents cycles, minimizing reference-counting overhead.
* Arena/Pool pattern optimizes allocation and deallocation for complex data structures.
* C++20 coroutines map async/await to efficient native suspension points.

---

## 2. Performance Comparison

| Feature                  | TypeScript (Node.js)                                    | GoodScript (C++/Native)                  | Notes                                                                     |
| ------------------------ | ------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------- |
| Type checking            | Dynamic at runtime                                      | Fully static at compile time             | Eliminates runtime type dispatch overhead                                 |
| Memory management        | GC-based, non-deterministic                             | Deterministic, smart pointers            | No GC pauses; predictable destruction                                     |
| Heap allocation          | Standard JS heap                                        | `unique_ptr`, `shared_ptr`, arenas       | Optimized cache locality with arenas; minimal reference counting overhead |
| Weak references          | Requires optional checks, can still hold objects longer | `weak_ptr` with conditional lock         | Minimal cost for safe access; predictable semantics                       |
| Async/await              | Event loop scheduling                                   | C++20 coroutines (cppcoro)               | Coroutine suspension is lightweight, no runtime polling overhead          |
| Complex graph management | Manual cycle prevention needed                          | Arena/Pool pattern centralizes ownership | Bulk deallocation improves efficiency and cache usage                     |
| Compilation              | JIT                                                     | Ahead-of-time                            | Native machine code with compiler optimizations                           |

---

## 3. Expected Gains

* **Execution speed:** Native compilation removes JIT and GC overhead, generally resulting in **multiplex speedup** for CPU-intensive workloads.
* **Memory predictability:** Deterministic destruction and reduced fragmentation improve cache locality.
* **Lower runtime overhead:** Most operations (especially on `unique_ptr` objects) compile down to **zero-cost moves**.
* **Safe concurrency model:** Even if coroutines are used, no data races occur because GoodScript is single-threaded; this avoids synchronization overhead.

---

## 4. Use Cases Where Performance Shines

* High-performance servers or CLI tools written in TypeScript syntax.
* Systems-level applications manipulating complex graphs, trees, or object networks.
* Applications requiring low-latency deterministic memory handling.
* Native deployment scenarios where Node.js runtime overhead is prohibitive.

---

## 5. Conclusion

By combining **fully static typing**, **ownership-qualified memory management**, **deterministic destruction**, and **native compilation**, GoodScript binaries are expected to be significantly more efficient than TypeScript running in Node.js, while preserving memory safety and developer ergonomics.

* Developers can **prototype rapidly** in Node.js and then **deploy high-performance native binaries** with minimal code changes.
* The Arena/Pool pattern and C++ smart pointer mapping ensure **safe and efficient handling of complex data structures**.

This makes GoodScript an ideal choice for developers looking to bridge **TypeScript productivity** with **systems-level performance**.

---

*End of document.*
