// Map operations benchmark
// Tests Map insert, lookup, and delete performance

function mapOperations(size: integer): integer {
  const map: Map<string, integer> = new Map();
  
  // Insert operations
  for (let i: integer = 0; i < size; i = i + 1) {
    const key: string = `key${i}`;
    map.set(key, i);
  }
  
  // Lookup operations
  let sum: integer = 0;
  for (let i: integer = 0; i < size; i = i + 1) {
    const key: string = `key${i}`;
    if (map.has(key) === true) {
      const value: integer = map.get(key);
      sum = sum + value;
    }
  }
  
  // Delete half the entries
  for (let i: integer = 0; i < size; i = i + 2) {
    const key: string = `key${i}`;
    map.delete(key);
  }
  
  return sum;
}

function runBenchmark(): void {
  const size: integer = 50000;
  const iterations: integer = 10;
  
  const startTotal: number = Date.now();
  
  for (let i: integer = 0; i < iterations; i = i + 1) {
    const start: number = Date.now();
    const result: integer = mapOperations(size);
    const elapsed: number = Date.now() - start;
    console.log(`Iteration ${i + 1}: sum = ${result} (${elapsed}ms)`);
  }
  
  const totalTime: number = Date.now() - startTotal;
  console.log(`Total time: ${totalTime}ms`);
}

runBenchmark();
