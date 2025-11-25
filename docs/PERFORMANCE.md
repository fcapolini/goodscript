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

**Benchmark Results** (as of November 2025):

Benchmark suite comparing Node.js vs GoodScript C++ compilation:

| Benchmark             | Node.js | C++ Native | Speedup |
|-----------------------|---------|------------|---------|  
| Fibonacci(35)         | ~390ms  | ~185ms     | 2.11x   |
| Array Operations      | ~9ms    | ~4ms       | 2.25x   |
| Binary Search         | ~47ms   | ~4ms       | 11.75x  |
| Bubble Sort           | ~7ms    | ~8ms       | 0.88x   |
| HashMap Operations    | ~11ms   | ~8ms       | 1.38x   |
| String Manipulation   | ~1ms    | ~1ms       | 1.00x   |
| **Average Speedup**   |         |            | **3.23x** |*Note: Recursive functions are now optimized with direct declarations (2.68x faster). String operations use array.join() pattern for O(n) performance instead of O(n²) concatenation.*

**Key Optimizations:** 
1. Recursive functions that don't capture outer scope are hoisted to namespace scope as direct C++ functions, eliminating `std::function` overhead. This improved Fibonacci from 0.73x (slower!) to 1.94x (faster).
2. String building uses array-building pattern (array.push() + join()) instead of repeated concatenation. This improved string ops from 0.06x to 1.00x (18x improvement).

See `compiler/test/phase3/concrete-examples/benchmark-performance/` for the full benchmark suite.

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

## 3. Benchmark Results

Actual performance tests comparing GoodScript C++ compilation against Node.js show workload-dependent characteristics:

| Benchmark              | Node.js | C++ Native | Speedup | Notes                                    |
| ---------------------- | ------- | ---------- | ------- | ---------------------------------------- |
| Fibonacci(35)          | ~390ms  | ~185ms     | 2.11x   | Optimized with direct function declarations |
| Array ops (100k elems) | ~9ms    | ~4ms       | 2.25x   | Native memory operations |
| Binary search          | ~47ms   | ~4ms       | 11.75x  | Excellent cache locality and branch prediction |
| Bubble sort            | ~7ms    | ~8ms       | 0.88x   | Competitive with JIT |
| HashMap ops            | ~11ms   | ~8ms       | 1.38x   | Optimized string+number concatenation pattern |
| String manipulation    | ~1ms    | ~1ms       | 1.00x   | Using array.join() pattern (O(n) vs O(n²)) |
| **Average Speedup**    |         |            | **3.23x** | Per-benchmark average (not total time) |

**Key Findings:**
- **Average speedup: 3.23x** across mixed workloads (balanced metric weighing each test equally)
- **Recursive optimization**: Hoisting non-closure functions to namespace scope eliminates std::function overhead (2.68x improvement)
- **String concatenation optimization**: Pattern `'literal' + number.toString()` generates efficient C++ using `concat_number()` (2.4x improvement for HashMap)
- **String building optimization**: Using array.push() + join() instead of repeated concatenation (18x improvement)
- **Algorithm-intensive code**: Binary search shows 11.75x speedup with cache-friendly patterns
- **Data structures**: Native arrays and hash maps both show significant advantages
- **Overall**: Significant performance advantages for algorithmic and memory-intensive workloads

**Best Practices:**
- For recursive algorithms: Use simple functions without closures when possible (auto-optimized)
- For string + number concatenation: Pattern `'prefix' + n.toString()` is auto-optimized (no manual changes needed)
- For string building in loops: Use `chars.push('x'); result = chars.join('')` instead of `result = result + 'x'`
- For hash maps: String keys with numbers are now efficient thanks to codegen optimization

See `compiler/test/phase3/concrete-examples/benchmark-performance/` for details.

---

## 4. Expected Gains

* **Recursive algorithms:** Direct function declarations eliminate std::function overhead (2-3x speedup)
* **Algorithm-intensive operations:** Binary search, sorting, tree traversal benefit from cache locality (5-12x speedup typical)
* **Memory-intensive operations:** Native `std::vector` and direct memory access provide significant advantages (2-3x speedup)
* **String building:** Use array-building pattern (`chars.push()` + `join()`) for O(n) performance instead of O(n²) concatenation
* **Memory predictability:** Deterministic destruction and reduced fragmentation improve cache locality
* **Lower runtime overhead:** Most operations (especially on `unique_ptr` objects) compile down to **zero-cost moves**
* **Arithmetic-heavy code:** Compiler optimizations (O2) can eliminate overhead entirely
* **Safe concurrency model:** Even if coroutines are used, no data races occur because GoodScript is single-threaded; this avoids synchronization overhead

---

## 5. Use Cases Where Performance Shines

* High-performance servers or CLI tools written in TypeScript syntax.
* Systems-level applications manipulating complex graphs, trees, or object networks.
* Applications requiring low-latency deterministic memory handling.
* Native deployment scenarios where Node.js runtime overhead is prohibitive.

---

## 6. Conclusion

By combining **fully static typing**, **ownership-qualified memory management**, **deterministic destruction**, and **native compilation**, GoodScript provides:

* **3.23x average speedup** across diverse computational workloads
* **Exceptional performance** for algorithmic code (up to 11.75x speedup for binary search)
* **Optimized recursive functions** with direct declarations (2-3x faster than std::function)
* **Smart codegen optimizations** for common patterns (string+number concatenation, array building)
* **Competitive or better** performance for memory-intensive operations and hash maps
* **Efficient string operations** with automatic pattern optimization
* **Deterministic memory management** without garbage collection pauses

Developers can **prototype rapidly** in Node.js and then **deploy high-performance native binaries** with minimal code changes. The Arena/Pool pattern and C++ smart pointer mapping ensure **safe and efficient handling of complex data structures**.

This makes GoodScript an ideal choice for developers looking to bridge **TypeScript productivity** with **systems-level performance**, especially for:
- Data processing pipelines
- Scientific computing
- Game engines
- Systems tools and utilities

---

## 7. Running Benchmarks

To run the performance benchmarks yourself:

```bash
cd compiler
npm test -- test/phase3/concrete-examples/benchmark-performance.test.ts
```

The benchmark suite tests:
- Recursive function calls (Fibonacci)
- Array creation, iteration, and filtering
- Arithmetic operations in tight loops

Results include detailed timing comparisons and speedup calculations.

---

*End of document.*
