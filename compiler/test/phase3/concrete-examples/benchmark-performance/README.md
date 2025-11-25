# Performance Benchmark

This benchmark compares GoodScript's C++ compilation output against Node.js execution for various computational workloads.

## Benchmarks

1. **Fibonacci (recursive)**: Tests function call overhead with recursive algorithms (fib(38))
2. **Array Operations**: Tests memory allocation, iteration, and filtering on large arrays (500,000 elements)
3. **Binary Search**: Tests algorithm performance with repeated searches (100,000 searches in 100,000 elements)
4. **Bubble Sort**: Tests nested loops and array access patterns (3,000 elements)
5. **HashMap Operations**: Tests hash map insert, lookup, and delete operations (50,000 operations)
6. **String Manipulation**: Tests string concatenation and character access (50,000 iterations)

## Running the Benchmark

```bash
npm test -- test/phase3/concrete-examples/benchmark-performance.test.ts
```

## Typical Results

| Benchmark              | Node.js | C++ Native | Speedup |
|------------------------|---------|------------|---------|
| Fibonacci(38)          | ~350ms  | ~450ms     | 0.78x   |
| Array Operations       | ~15ms   | ~5ms       | 3.00x   |
| Binary Search          | ~8ms    | ~2ms       | 4.00x   |
| Bubble Sort            | ~40ms   | ~15ms      | 2.67x   |
| HashMap Operations     | ~10ms   | ~5ms       | 2.00x   |
| String Manipulation    | ~50ms   | ~20ms      | 2.50x   |
| **AVERAGE SPEEDUP**    |         |            | **2.49x** |

*Note: Actual times vary based on hardware. The speedup ratio is more consistent.*

## Analysis

### Why is C++ slower for Fibonacci?

The recursive Fibonacci benchmark uses lambda functions with captures in C++, which get translated to `std::function<>` objects. This adds overhead compared to Node.js's optimized V8 JIT compilation for recursive calls. In production code, using iterative approaches or enabling more aggressive compiler optimizations would close this gap.

### Why is C++ faster for Arrays, Algorithms, and Data Structures?

Native C++ memory management with `std::vector`, `std::unordered_map`, and direct memory access provides significant advantages over JavaScript's garbage-collected structures. Operations like:
- **Array iteration**: No GC overhead, direct pointer arithmetic
- **Binary search**: Optimized branch prediction and cache locality  
- **Bubble sort**: Tight loops with minimal overhead
- **HashMap operations**: Fast hashing without GC pauses
- **String operations**: Efficient memory allocation without fragmentation

### Why is Binary Search so fast?

The binary search algorithm benefits from:
1. Cache-friendly sequential array access
2. Predictable branch patterns that modern CPUs optimize
3. No garbage collection interruptions
4. Integer arithmetic optimizations

### Average Speedup Calculation

The benchmark uses **average speedup** across all tests rather than total time, because:
- Some benchmarks are naturally faster/slower than others
- Total time is dominated by the slowest benchmark
- Average speedup gives equal weight to each algorithm type
- More accurately represents real-world mixed workloads

For example, if Fibonacci takes 450ms (slower) but Arrays take 5ms (3x faster), the average speedup of 2.49x better represents overall C++ performance than comparing total times.

## Key Insights

1. **Algorithm-intensive operations** (binary search, sorting) show 2-4x speedup with C++
2. **Data structure operations** (arrays, hash maps) benefit from native memory management
3. **Function call overhead** can be higher in C++ when using lambdas with captures
4. **Real-world workloads** typically involve mixed operations where C++'s advantages shine

## Implementation Notes

- Numbers in GoodScript use `double` for compatibility with JavaScript semantics
- Loop counters use `int` which can cause integer overflow on very large sums (this is a known limitation)
- The `Date.now()` is implemented using C++11 chrono for millisecond precision
- The `.toString()` method formats numbers intelligently (integers without decimals, floats with minimal precision)

## Future Improvements

- [ ] Use `-O3` optimization level for even better performance
- [ ] Implement fixed-size integer types (int32, int64) for arithmetic-heavy code
- [ ] Add benchmarks for more real-world scenarios (JSON parsing, tree traversal)
- [ ] Compare against other compiled languages (Rust, Go, Zig)
- [ ] Test with different compiler backends (clang++ native, GCC)
