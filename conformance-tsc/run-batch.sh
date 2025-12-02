#!/bin/bash
# Run conformance tests with batching and concurrency control
# Usage: ./run-batch.sh [batch_number] [mode]
#   batch_number: 1-6 for specific batch, "summary" for summary only, or "all" for all batches
#   mode: "js" (default, fast), "native" (slow, compiles C++), or "quick" (first 2 batches native)

BATCH=${1:-all}
MODE=${2:-js}

# Set native mode if requested
if [ "$MODE" = "native" ]; then
  export TEST_NATIVE=1
  echo "🔧 Native mode enabled - tests will compile to C++ and execute (SLOW)"
elif [ "$MODE" = "quick" ]; then
  export TEST_NATIVE=1
  echo "🔧 Quick native mode - running first 2 batches with C++ compilation"
  npm test -- -t "Batch [12]/6"
  exit 0
else
  echo "📝 JavaScript mode - fast validation only"
fi

# Run tests
if [ "$BATCH" = "summary" ]; then
  echo "Running summary only..."
  npm test -- -t "Summary"
elif [ "$BATCH" = "all" ]; then
  echo "Running all batches..."
  npm test
elif [ "$BATCH" -ge 1 ] && [ "$BATCH" -le 6 ] 2>/dev/null; then
  echo "Running batch $BATCH/6..."
  npm test -- -t "Batch $BATCH/6"
else
  echo "Invalid batch. Use 1-6, 'all', or 'summary'"
  exit 1
fi
