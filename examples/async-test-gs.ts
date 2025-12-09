/**
 * Async/await integration test - Phase 7b.1 Step 4
 * Tests Promise<T> runtime with cppcoro backend
 */

// Simple async function
async function getNumber(): Promise<number> {
  return 42;
}

// Async function with await
async function doubleNumber(): Promise<number> {
  const n = await getNumber();
  return n * 2;
}

// Async function returning string
async function getMessage(): Promise<string> {
  return "Hello, async!";
}

// Async function with multiple awaits
async function complexOperation(): Promise<number> {
  const a = await getNumber();
  const b = await getNumber();
  return a + b;
}

// Void async function
async function doSomething(): Promise<void> {
  const msg = await getMessage();
  console.log(msg);
}

// Test all async functions
async function main(): Promise<void> {
  console.log("Testing async/await...");
  
  const num = await getNumber();
  console.log("getNumber():", num);
  
  const doubled = await doubleNumber();
  console.log("doubleNumber():", doubled);
  
  const msg = await getMessage();
  console.log("getMessage():", msg);
  
  const complex = await complexOperation();
  console.log("complexOperation():", complex);
  
  await doSomething();
  
  console.log("All async tests passed!");
}
