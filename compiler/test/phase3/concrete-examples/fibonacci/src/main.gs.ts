/**
 * Fibonacci calculator demonstrating:
 * - Simple recursion
 * - Number arithmetic
 * - Function calls
 * - Control flow
 */

const fibonacci = (n: number): number => {
  if (n <= 1) {
    return n;
  }
  return fibonacci(n - 1) + fibonacci(n - 2);
};

const fibonacciIterative = (n: number): number => {
  if (n <= 1) {
    return n;
  }
  
  let prev = 0;
  let curr = 1;
  
  for (let i = 2; i <= n; i++) {
    const next = prev + curr;
    prev = curr;
    curr = next;
  }
  
  return curr;
};

// Test both implementations
console.log('Fibonacci sequence (recursive):');
for (let i = 0; i < 10; i++) {
  console.log(`fib(${i}) = ${fibonacci(i)}`);
}

console.log('\nFibonacci sequence (iterative):');
for (let i = 0; i < 10; i++) {
  console.log(`fib(${i}) = ${fibonacciIterative(i)}`);
}

// Verify they produce same results
console.log('\nVerification:');
let allMatch = true;
for (let i = 0; i < 15; i++) {
  const rec = fibonacci(i);
  const iter = fibonacciIterative(i);
  if (rec !== iter) {
    console.log(`Mismatch at ${i}: recursive=${rec}, iterative=${iter}`);
    allMatch = false;
  }
}

if (allMatch === true) {
  console.log('All values match!');
}
