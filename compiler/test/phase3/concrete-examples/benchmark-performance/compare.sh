#!/bin/bash

# Performance Comparison: Reference C++ vs GoodScript-generated code vs Node.js
# 
# This script runs all implementations and compares their performance

cd /Users/bilbo/Devel/oss/goodscript/goodscript/compiler/test/phase3/concrete-examples/benchmark-performance

echo "==================================================================="
echo "Performance Benchmark Comparison"
echo "==================================================================="
echo ""
echo "Running 4 implementations:"
echo "  1. Node.js (V8 JIT)"
echo "  2. GoodScript Ownership Mode (generated C++ with smart pointers)"
echo "  3. GoodScript GC Mode (generated C++ with MPS garbage collector)"
echo "  4. Reference C++ (hand-written idiomatic C++)"
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

echo "==================================================================="
echo "Analysis:"
echo "==================================================================="
echo ""
echo "The reference C++ shows the theoretical upper limit of performance"
echo "achievable with modern C++ using standard library containers."
echo ""
echo "Comparing GoodScript-generated code to the reference reveals:"
echo "  - How close our codegen is to hand-written C++"
echo "  - Opportunities for optimization in code generation"
echo "  - Overhead from runtime library abstractions"
echo ""
