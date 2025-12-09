// Example: Exception Handling
// Shows try-catch-finally for error handling

function riskyOperation(value: number): number {
  if (value < 0) {
    throw new Error("Negative values not allowed!");
  }
  if (value === 0) {
    throw new Error("Zero is not allowed!");
  }
  return 100 / value;
}

// Basic try-catch
console.log("Example 1: Basic try-catch");
try {
  const result1 = riskyOperation(10);
  console.log("Success! Result:", result1);
  
  const result2 = riskyOperation(-5);
  console.log("This won't print");
} catch (e) {
  console.log("Caught error:", e.message);
}

// Try-catch-finally
console.log("\nExample 2: With finally");
try {
  console.log("Attempting operation...");
  const result = riskyOperation(0);
  console.log("Result:", result);
} catch (e) {
  console.log("Error caught:", e.message);
} finally {
  console.log("Finally block always runs");
}

// Multiple operations
console.log("\nExample 3: Multiple operations");
const values = [5, -1, 2, 0, 10];

for (const val of values) {
  try {
    const result = riskyOperation(val);
    console.log(`  riskyOperation(${val}) = ${result}`);
  } catch (e) {
    console.log(`  riskyOperation(${val}) failed: ${e.message}`);
  }
}

console.log("\nProgram continues after exceptions!");
