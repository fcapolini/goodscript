/**
 * Test GC Array methods
 */

const testMap = (): void => {
  console.log("=== Testing Array.map() ===");
  const numbers = [1, 2, 3, 4, 5];
  const doubled = numbers.map((x: number): number => x * 2);
  console.log(`Doubled: [${doubled.join(', ')}]`);
};

const testFilter = (): void => {
  console.log("\n=== Testing Array.filter() ===");
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const evens = numbers.filter((x: number): boolean => x % 2 === 0);
  console.log(`Even numbers: [${evens.join(', ')}]`);
};

testMap();
testFilter();
console.log("\nAll tests completed");
