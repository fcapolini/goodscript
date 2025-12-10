// Date.now() demonstration
// Tests timing measurement in GoodScript

function fibonacci(n: integer): integer {
  if (n <= 1) {
    return n;
  }
  return fibonacci(n - 1) + fibonacci(n - 2);
}

function measureExecution(): void {
  console.log("Testing Date.now() for timing measurement");
  console.log("");
  
  const start: number = Date.now();
  const result: integer = fibonacci(35);
  const end: number = Date.now();
  const elapsed: number = end - start;
  
  console.log(`Computed fibonacci(35) = ${result}`);
  console.log(`Start time: ${start}ms`);
  console.log(`End time: ${end}ms`);
  console.log(`Elapsed time: ${elapsed}ms`);
}

measureExecution();
