// Example: HTTP Client API Demonstration
// Shows the HTTP client API structure
// Note: Actual HTTP functionality requires curl library compilation

console.log("=== HTTP Client API Demo ===\n");

// This example demonstrates the HTTP API that will be available
// once curl compilation is fully integrated

console.log("HTTP Client API (Future Implementation):");
console.log("");
console.log("1. Synchronous GET:");
console.log("   const response = HTTP.syncFetch('https://api.example.com');");
console.log("   console.log(response.status); // 200");
console.log("   console.log(response.body);   // Response body");
console.log("");

console.log("2. Asynchronous GET:");
console.log("   const response = await HTTPAsync.fetch('https://api.example.com');");
console.log("   console.log(response.status);");
console.log("");

console.log("3. POST with custom headers:");
console.log("   const headers = new Map<string, string>();");
console.log("   headers.set('Content-Type', 'application/json');");
console.log("   const response = await HTTPAsync.fetch(");
console.log("     'https://api.example.com/data',");
console.log("     'POST',");
console.log("     '{\"key\": \"value\"}',");
console.log("     headers,");
console.log("     5000  // timeout in ms");
console.log("   );");
console.log("");

console.log("4. Response object:");
console.log("   response.status   // HTTP status code (number)");
console.log("   response.body     // Response body (string)");
console.log("   response.headers  // Response headers (Map<string, string>)");
console.log("");

console.log("Note: Full HTTP support requires libcurl integration.");
console.log("      This demo shows the API structure for future use.");

// Demonstrate the API structure (won't make actual requests)
console.log("\n=== Type-Safe API Structure ===");

class HttpResponse {
  status: number;
  body: string;
  headers: Map<string, string>;

  constructor(status: number, body: string, headers: Map<string, string>) {
    this.status = status;
    this.body = body;
    this.headers = headers;
  }
}

// Mock response to demonstrate the type structure
function createMockResponse(): HttpResponse {
  const headers = new Map<string, string>();
  headers.set("content-type", "application/json");
  headers.set("server", "GoodScript-Demo");
  
  return new HttpResponse(
    200,
    '{"message": "This would be the actual response"}',
    headers
  );
}

const mockResponse = createMockResponse();
console.log("Mock HTTP Response:");
console.log("  Status:", mockResponse.status);
console.log("  Body:", mockResponse.body);
console.log("  Headers:");
const headerEntries = mockResponse.headers.entries();
for (const entry of headerEntries) {
  console.log("    " + entry[0] + ":", entry[1]);
}

console.log("\n=== Demo Complete ===");
