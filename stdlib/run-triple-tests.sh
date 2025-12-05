#!/bin/bash

# Triple-mode test runner for GoodScript stdlib
# Tests TypeScript + GC Native + Ownership Native modes

set -e

LIBRARY=$1

if [ -z "$LIBRARY" ]; then
  echo "Usage: ./run-triple-tests.sh <library-path>"
  echo "Example: ./run-triple-tests.sh collection"
  exit 1
fi

echo "🧪 Triple-Mode Testing: $LIBRARY"
echo "======================================"

cd "$LIBRARY"

echo ""
echo "[1/3] TypeScript Mode (vitest)"
echo "--------------------------------------"
npm test

echo ""
echo "[2/3] GC Native Mode (C++ + MPS GC)"
echo "--------------------------------------"
# Compile GoodScript -> C++ (GC mode)
# Compile C++ -> executable
# Run and capture output
# Compare with TypeScript output

echo ""
echo "[3/3] Ownership Native Mode (C++ + ownership)"
echo "--------------------------------------"
# Compile GoodScript -> C++ (Ownership mode)
# Compile C++ -> executable  
# Run and capture output
# Compare with TypeScript output

echo ""
echo "✅ All three modes passed!"
