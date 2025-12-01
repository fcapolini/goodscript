#!/bin/bash
# Test script to compile GC mode example

set -e

RUNTIME_DIR="../../runtime"

echo "Compiling GoodScript GC example..."
g++ -std=c++20 -O2 \
  -I$RUNTIME_DIR \
  gc-hello.cpp \
  -o gc-hello

echo "Running..."
./gc-hello

echo ""
echo "Success! 🎉"
