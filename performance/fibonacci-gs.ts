// Fibonacci benchmark - recursive implementation
// Tests function call overhead and stack performance

function fibonacci(n: integer): integer {
  if (n <= 1) {
    return n;
  }
  return fibonacci(n - 1) + fibonacci(n - 2);
}

function runBenchmark(): void {
  const n: integer = 30; // Smaller for faster iteration
  const iterations: integer = 5;
  
  // Just run the benchmark - timing handled externally
  for (let i: integer = 0; i < iterations; i = i + 1) {
    const result: integer = fibonacci(n);
    console.log(`Iteration ${i + 1}: fib(${n}) = ${result}`);
  }
}

runBenchmark();
