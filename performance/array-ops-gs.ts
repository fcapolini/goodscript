// Array operations benchmark
// Tests array allocation, iteration, and method performance

function arrayOperations(size: integer): integer53 {
  // Create and populate array
  const arr: number[] = [];
  for (let i: integer = 0; i < size; i = i + 1) {
    arr.push(i);
  }
  
  // Sum all elements
  let sum: integer53 = 0;
  for (const num of arr) {
    sum = sum + num;
  }
  
  // Map operation
  const doubled: number[] = [];
  for (const num of arr) {
    doubled.push(num * 2);
  }
  
  // Filter operation
  const evens: number[] = [];
  for (const num of arr) {
    if (num % 2 === 0) {
      evens.push(num);
    }
  }
  
  return sum;
}

function runBenchmark(): void {
  const size: integer = 100000;
  const iterations: integer = 10;
  
  const startTotal: number = Date.now();
  
  for (let i: integer = 0; i < iterations; i = i + 1) {
    const start: number = Date.now();
    const result: integer53 = arrayOperations(size);
    const elapsed: number = Date.now() - start;
    console.log(`Iteration ${i + 1}: sum = ${result} (${elapsed}ms)`);
  }
  
  const totalTime: number = Date.now() - startTotal;
  console.log(`Total time: ${totalTime}ms`);
}

runBenchmark();
