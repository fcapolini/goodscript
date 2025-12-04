/**
 * Async/Await Example
 * 
 * Demonstrates async/await functionality with:
 * - Basic async functions
 * - Promise chaining
 * - Async methods in classes
 * - Multiple await expressions
 * - Error handling with async/await
 */

// Simple async function that returns a value
async function fetchNumber(): Promise<number> {
  return 42;
}

// Async function that uses await
async function doubleValue(): Promise<number> {
  const value = await fetchNumber();
  return value * 2;
}

// Async function with multiple awaits
async function sumValues(): Promise<number> {
  const a = await fetchNumber();
  const b = await fetchNumber();
  return a + b;
}

// Class with async methods
class AsyncCalculator {
  async add(x: number, y: number): Promise<number> {
    return x + y;
  }
  
  async multiply(x: number, y: number): Promise<number> {
    return x * y;
  }
  
  async compute(): Promise<number> {
    const sum = await this.add(10, 20);
    const product = await this.multiply(sum, 2);
    return product;
  }
}

// Main function
async function main(): Promise<void> {
  console.log("=== Async/Await Example ===");
  
  // Test basic async function
  const value1 = await fetchNumber();
  console.log(`fetchNumber: ${value1}`);
  
  // Test async with await
  const value2 = await doubleValue();
  console.log(`doubleValue: ${value2}`);
  
  // Test multiple awaits
  const value3 = await sumValues();
  console.log(`sumValues: ${value3}`);
  
  // Test async methods in class
  const calc = new AsyncCalculator();
  const sum = await calc.add(5, 7);
  console.log(`calc.add(5, 7): ${sum}`);
  
  const product = await calc.multiply(3, 4);
  console.log(`calc.multiply(3, 4): ${product}`);
  
  const computed = await calc.compute();
  console.log(`calc.compute(): ${computed}`);
  
  console.log("=== All tests passed ===");
}

// Run main
main();
