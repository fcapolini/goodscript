# GoodScript Performance Benchmarks

This directory contains performance tests that run in **triple-mode**:

1. **Node.js/TypeScript** - Native JavaScript execution
2. **GC C++** - Compiled C++ with garbage collection
3. **Ownership C++** - Compiled C++ with ownership semantics

## Running Benchmarks

```bash
# Run all benchmarks in triple-mode
pnpm bench:all

# Run all benchmarks (discovers all *-gs.ts files)
pnpm bench

# Run a specific benchmark
pnpm bench:fibonacci
pnpm bench:array
pnpm bench:string
pnpm bench:map

# Run benchmarks in specific modes only
pnpm bench:node      # Node.js only
pnpm bench:gc        # GC C++ only
pnpm bench:ownership # Ownership C++ only

# Advanced: Run specific benchmark in specific mode
tsx performance/run-benchmark.ts fibonacci node
tsx performance/run-benchmark.ts array-ops gc
```

## Benchmark Structure

Each benchmark is a `-gs.ts` file that:
- Must be valid GoodScript (compiles to both modes)
- Should be CPU-intensive enough to show meaningful differences
- Should measure its own execution time
- Should output results in a parseable format

## Available Benchmarks

- `fibonacci-gs.ts` - Recursive fibonacci calculation
- `array-ops-gs.ts` - Array manipulation and iteration
- `map-ops-gs.ts` - Map operations (insert, lookup, delete)
- `string-ops-gs.ts` - String concatenation and manipulation

## Results Format

Each benchmark outputs timing in the format:
```
Benchmark: <name>
Mode: <node|gc|ownership>
Time: <milliseconds>ms
Operations: <count>
Ops/sec: <rate>
```

## Adding New Benchmarks

1. Create a new `-gs.ts` file in this directory
2. Implement the benchmark logic
3. Use `console.log()` to output timing results
4. Test in all three modes to ensure compatibility
