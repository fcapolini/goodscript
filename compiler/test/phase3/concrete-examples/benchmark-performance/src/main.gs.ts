/**
 * Performance Benchmark Suite
 * 
 * Tests various computational workloads to compare
 * GoodScript C++ vs Node.js performance.
 * 
 * Benchmarks included:
 * 1. Fibonacci (recursive) - function call overhead
 * 2. Array operations - memory allocation and iteration
 * 3. Simple arithmetic - raw computation speed
 */

// Get current timestamp in milliseconds
const now = (): number => {
  return Date.now();
};

// Benchmark 1: Recursive Fibonacci
const fibonacci = (n: number): number => {
  if (n <= 1) {
    return n;
  }
  return fibonacci(n - 1) + fibonacci(n - 2);
};

const benchFibonacci = (n: number): number => {
  const start = now();
  const result = fibonacci(n);
  const elapsed = now() - start;
  console.log('Fibonacci(' + n.toString() + ') = ' + result.toString() + ', time: ' + elapsed.toString() + 'ms');
  return elapsed;
};

// Benchmark 2: Array Operations
const benchArrayOps = (size: number): number => {
  const start = now();
  
  const arr = new Array<number>();
  for (let i = 0; i < size; i++) {
    arr.push(i);
  }
  
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum = sum + arr[i];
  }
  
  const filtered = new Array<number>();
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] % 2 === 0) {
      filtered.push(arr[i]);
    }
  }
  
  const elapsed = now() - start;
  console.log('Array ops (' + size.toString() + ' elements): sum=' + sum.toString() + ', filtered=' + filtered.length.toString() + ', time: ' + elapsed.toString() + 'ms');
  return elapsed;
};

// Benchmark 3: Simple arithmetic loop
const benchArithmetic = (iterations: number): number => {
  const start = now();
  
  let result = 0;
  for (let i = 0; i < iterations; i++) {
    result = result + (i * 2) - (i / 2);
  }
  
  const elapsed = now() - start;
  console.log('Arithmetic (' + iterations.toString() + ' iterations): result=' + result.toString() + ', time: ' + elapsed.toString() + 'ms');
  return elapsed;
};

// Run all benchmarks
console.log('=== GoodScript Performance Benchmark Suite ===');
console.log('');

console.log('--- Benchmark 1: Recursive Fibonacci ---');
const fibTime = benchFibonacci(35);

console.log('');
console.log('--- Benchmark 2: Array Operations ---');
const arrayTime = benchArrayOps(100000);

console.log('');
console.log('--- Benchmark 3: Arithmetic Loop ---');
const arithmeticTime = benchArithmetic(1000000);

console.log('');
console.log('=== Summary ===');
const totalTime = fibTime + arrayTime + arithmeticTime;
console.log('Total time: ' + totalTime.toString() + 'ms');
