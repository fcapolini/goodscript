// String operations benchmark
// Tests string concatenation and method performance

function stringOperations(iterations: integer): integer {
  let result: string = "";
  
  // String concatenation
  for (let i: integer = 0; i < iterations; i = i + 1) {
    result = result + "x";
  }
  
  // String methods
  let count: integer = 0;
  for (let i: integer = 0; i < iterations; i = i + 1) {
    const test: string = `test${i}`;
    const upper: string = test.toUpperCase();
    const lower: string = upper.toLowerCase();
    count = count + lower.length;
  }
  
  return result.length + count;
}

function runBenchmark(): void {
  const size: integer = 10000;
  const iterations: integer = 10;
  
  // Just run the benchmark - timing handled externally
  for (let i: integer = 0; i < iterations; i = i + 1) {
    const result: integer = stringOperations(size);
    console.log(`Iteration ${i + 1}: length = ${result}`);
  }
}

runBenchmark();
