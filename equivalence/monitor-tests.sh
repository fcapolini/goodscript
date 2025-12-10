#!/usr/bin/env bash

# Monitor equivalence test progress

RESULTS_FILE="equivalence/test-results.txt"

echo "Monitoring equivalence test suite..."
echo "Results file: $RESULTS_FILE"
echo ""

# Wait for file to exist
while [ ! -f "$RESULTS_FILE" ]; do
  echo "Waiting for test run to start..."
  sleep 2
done

# Monitor file size
echo "Test suite running..."
prev_size=0
while true; do
  if [ -f "$RESULTS_FILE" ]; then
    size=$(wc -c < "$RESULTS_FILE" 2>/dev/null || echo 0)
    if [ "$size" -gt "$prev_size" ]; then
      echo "Progress: $size bytes written..."
      prev_size=$size
    else
      # File stopped growing, check if process is still running
      if ! ps aux | grep -q "[t]sx equivalence/run-equivalence.ts"; then
        echo ""
        echo "Test suite completed!"
        break
      fi
    fi
  fi
  sleep 5
done

echo ""
echo "=== TEST SUMMARY ==="
echo ""

# Count results
total=$(grep -c "^✅\|^❌" "$RESULTS_FILE" 2>/dev/null || echo 0)
passed=$(grep -c "^✅" "$RESULTS_FILE" 2>/dev/null || echo 0)
failed=$(grep -c "^❌" "$RESULTS_FILE" 2>/dev/null || echo 0)

echo "Total tests: $total"
echo "Passed: $passed ✅"
echo "Failed: $failed ❌"
echo ""

if [ $failed -gt 0 ]; then
  echo "Failed tests:"
  grep "^❌" "$RESULTS_FILE" | head -20
fi
