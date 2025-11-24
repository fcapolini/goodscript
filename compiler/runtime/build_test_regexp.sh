#!/bin/bash

# Build script for testing GoodScript RegExp functionality
# Requires PCRE2 library installed
# Uses Zig C++ compiler (same as GoodScript compilation)

set -e  # Exit on error

echo "🔨 Building GoodScript RegExp test..."
echo ""

# Check if Zig is available
if ! command -v zig &> /dev/null; then
  echo "❌ Zig compiler not found!"
  echo ""
  echo "Please install Zig:"
  echo "  macOS:    brew install zig"
  echo "  Linux:    See https://ziglang.org/download/"
  echo ""
  exit 1
fi

# Check if PCRE2 is installed (try brew on macOS)
if command -v brew &> /dev/null && brew list pcre2 &> /dev/null; then
  PCRE2_PREFIX=$(brew --prefix pcre2)
  PCRE2_INCLUDE="-I${PCRE2_PREFIX}/include"
  PCRE2_LIB="-L${PCRE2_PREFIX}/lib"
elif command -v pkg-config &> /dev/null && pkg-config --exists libpcre2-8; then
  PCRE2_INCLUDE=$(pkg-config --cflags libpcre2-8)
  PCRE2_LIB=$(pkg-config --libs-only-L libpcre2-8)
else
  echo "⚠️  PCRE2 library not found!"
  echo ""
  echo "Please install PCRE2:"
  echo "  macOS:    brew install pcre2"
  echo "  Ubuntu:   sudo apt-get install libpcre2-dev"
  echo "  Fedora:   sudo dnf install pcre2-devel"
  echo ""
  exit 1
fi

echo "Using Zig C++ compiler"
echo "PCRE2 include: $PCRE2_INCLUDE"
echo "PCRE2 lib: $PCRE2_LIB"
echo ""

# Compile with Zig
zig c++ -std=c++20 \
  $PCRE2_INCLUDE \
  $PCRE2_LIB \
  -o test_regexp \
  test_regexp.cpp \
  -lpcre2-8

echo "✅ Build successful!"
echo ""
echo "Running tests..."
echo ""

# Run tests
./test_regexp

# Clean up
rm -f test_regexp

echo ""
echo "🎉 All tests completed successfully!"
