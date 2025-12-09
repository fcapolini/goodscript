// Example: HTTP Client
// Shows synchronous and asynchronous HTTP requests

// Note: This example demonstrates the HTTP API syntax.
// Actual execution requires a network connection.

console.log("=== HTTP Client Examples ===");

// Synchronous GET request
console.log("\n1. Synchronous GET request:");
try {
  const response1 = HTTP.syncFetch("https://httpbin.org/get");
  console.log("Status:", response1.status);
  console.log("Body:", response1.body);
} catch (e) {
  console.log("Sync request failed:", e.message);
}

// Asynchronous GET request
console.log("\n2. Asynchronous GET request:");
async function asyncGetExample(): Promise<void> {
  try {
    const response = await HTTPAsync.fetch("https://httpbin.org/get");
    console.log("Status:", response.status);
    console.log("Body:", response.body);
  } catch (e) {
    console.log("Async GET failed:", e.message);
  }
  return Promise.resolve(undefined);
}

asyncGetExample();

// POST request with custom headers
console.log("\n3. POST request with headers:");
async function asyncPostExample(): Promise<void> {
  try {
    const headers = new Map<string, string>();
    headers.set("Content-Type", "application/json");
    headers.set("Accept", "application/json");
    
    const response = await HTTPAsync.fetch(
      "https://httpbin.org/post",
      "POST",
      '{"name": "GoodScript", "version": "0.12"}',
      headers,
      5000  // 5 second timeout
    );
    
    console.log("Status:", response.status);
    console.log("Body:", response.body);
  } catch (e) {
    console.log("Async POST failed:", e.message);
  }
  return Promise.resolve(undefined);
}

asyncPostExample();

console.log("\nNote: HTTP examples shown. Requires network connectivity.");
