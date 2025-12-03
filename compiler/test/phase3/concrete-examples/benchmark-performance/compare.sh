#!/bin/bash

# Performance Comparison: Reference C++ vs GoodScript-generated code vs Node.js
# 
# This script runs all implementations and compares their performance

cd /Users/bilbo/Devel/oss/goodscript/goodscript/compiler/test/phase3/concrete-examples/benchmark-performance

echo "==================================================================="
echo "Performance Benchmark Comparison"
echo "==================================================================="
echo ""
echo "Running 5 implementations:"
echo "  1. Node.js (V8 JIT)"
echo "  2. GoodScript Ownership Mode (generated C++ with smart pointers)"
echo "  3. GoodScript GC Mode (generated C++ with MPS garbage collector)"
echo "  4. Reference C++ (hand-written idiomatic C++)"
echo "  5. Go (with garbage collection)"
echo ""
echo "==================================================================="
echo ""

echo "--- 1. Node.js (V8) ---"
node dist/main.js 2>/dev/null
echo ""

echo "--- 2. GoodScript Ownership Mode ---"
./dist/benchmark-performance 2>/dev/null
echo ""

echo "--- 3. GoodScript GC Mode ---"
./dist/gc/main 2>/dev/null
echo ""

echo "--- 4. Reference C++ ---"
./reference/benchmark_reference 2>/dev/null
echo ""

echo "--- 5. Go (with GC) ---"
./reference/benchmark_go 2>/dev/null
echo ""

echo "==================================================================="
echo "Analysis:"
echo "==================================================================="
echo ""
echo "The reference C++ shows the theoretical upper limit of performance"
echo "achievable with modern C++ using standard library containers."
echo ""
echo "Go provides a comparison with another garbage-collected, natively"
echo "compiled language, showing the performance impact of GC vs ownership."
echo ""
echo "Comparing GoodScript-generated code reveals:"
echo "  - How close our codegen is to hand-written C++"
echo "  - Performance of GC mode vs Go (both use garbage collection)"
echo "  - Performance of ownership mode vs Go (deterministic vs GC)"
echo "  - Opportunities for optimization in code generation"
echo "  - Overhead from runtime library abstractions"
echo ""
