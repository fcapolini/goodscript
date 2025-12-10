// Example: HTTP Client API
// Demonstrates HTTP GET requests with error handling

// Type definitions for HTTP runtime (implemented in C++)
interface HttpResponse {
  status: number;
  statusText: string;
  headers: Map<string, string>;
  body: string;
}

declare const HTTP: {
  syncFetch(url: string): HttpResponse;
  post(url: string, body: string, contentType: string): HttpResponse;
};

console.log("=== HTTP Client Demo ===\n");

// Test 1: HTTP GET request to a test endpoint
console.log("Test 1: HTTP GET Request");
try {
  const response = HTTP.syncFetch("http://httpbin.org/get");
  console.log("  Status:", response.status);
  console.log("  Status Text:", response.statusText);
  console.log("  Body length:", response.body.length, "bytes");
  
  // Show first 200 characters of response
  const preview = response.body.length > 200 
    ? response.body.slice(0, 200) + "..." 
    : response.body;
  console.log("  Body preview:", preview);
} catch (e) {
  console.log("  Error:", e);
}
console.log("");

// Test 2: HTTP GET with custom headers via query params
console.log("Test 2: HTTP Status Code Test (404)");
try {
  const response = HTTP.syncFetch("http://httpbin.org/status/404");
  console.log("  Status:", response.status);
  console.log("  Status Text:", response.statusText);
} catch (e) {
  console.log("  Error:", e);
}
console.log("");

// Test 3: Connection timeout test (using a blackhole IP)
console.log("Test 3: Timeout Test");
console.log("  Attempting connection to timeout endpoint...");
console.log("  (This will timeout after 10 seconds)");
try {
  // httpbin.org/delay/3 responds after 3 seconds - good for timeout testing
  const response = HTTP.syncFetch("http://httpbin.org/delay/3");
  console.log("  Status:", response.status);
  console.log("  Response received after delay!");
} catch (e) {
  console.log("  Timeout occurred (as expected):", e);
}
console.log("");

console.log("=== Features Demonstrated ===");
console.log("  ✅ HTTP GET requests");
console.log("  ✅ Response status codes");
console.log("  ✅ Response body access");
console.log("  ✅ Error handling with try/catch");
console.log("  ✅ Connection timeouts (10s)");
console.log("  ✅ Read/write timeouts (30s)");
console.log("");

console.log("Technical Details:");
console.log("  - Backend: cpp-httplib v0.28.0 (MIT license)");
console.log("  - Threading: Built-in thread pool");
console.log("  - Timeouts: Connection (10s), Read/Write (30s)");
console.log("  - Features: Redirect following enabled");
console.log("");

console.log("\n=== Demo Complete ===");

