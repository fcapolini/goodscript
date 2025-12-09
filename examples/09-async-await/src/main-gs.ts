// Example: Async/Await
// Shows asynchronous programming with Promises

// Async function that simulates a delay
async function delay(ms: number): Promise<void> {
  return Promise.resolve(undefined);
}

// Async function that returns a value
async function fetchUserName(userId: integer): Promise<string> {
  await delay(100);
  
  if (userId === 1) {
    return Promise.resolve("Alice");
  } else if (userId === 2) {
    return Promise.resolve("Bob");
  } else {
    return Promise.resolve("Unknown");
  }
}

// Async function that may fail
async function fetchUserAge(userId: integer): Promise<integer> {
  await delay(50);
  
  if (userId === 1) {
    return Promise.resolve(30);
  } else if (userId === 2) {
    return Promise.resolve(25);
  } else {
    return Promise.reject(new Error("User not found"));
  }
}

// Main async function
async function main(): Promise<void> {
  console.log("Fetching user data...");
  
  // Sequential async calls
  const name1 = await fetchUserName(1);
  console.log("User 1:", name1);
  
  const name2 = await fetchUserName(2);
  console.log("User 2:", name2);
  
  // Error handling with try-catch
  try {
    const age = await fetchUserAge(1);
    console.log("User 1 age:", age);
  } catch (e) {
    console.log("Error:", e.message);
  }
  
  try {
    const age = await fetchUserAge(999);
    console.log("Unknown user age:", age);
  } catch (e) {
    console.log("Expected error:", e.message);
  }
  
  console.log("All async operations complete!");
  return Promise.resolve(undefined);
}

// Run the main function
main();
