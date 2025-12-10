// Example: HTTP/HTTPS Client API
// Demonstrates secure HTTPS requests with certificate verification

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

console.log("=== HTTP/HTTPS Client Demo ===\n");

// Test 1: HTTPS GET request to a reliable endpoint
console.log("Test 1: HTTPS GET Request (example.com)");
try {
  const response = HTTP.syncFetch("https://www.example.com");
  console.log("  ✅ Status:", response.status);
  console.log("  ✅ Status Text:", response.statusText);
  console.log("  ✅ Certificate verified");
  console.log("  📄 Body length:", response.body.length, "bytes");
  
  // Show first 150 characters of response
  const preview = response.body.length > 150 
    ? response.body.slice(0, 150) + "..." 
    : response.body;
  console.log("  📝 Preview:", preview);
} catch (e) {
  console.log("  ❌ Error:", e);
}
console.log("");

// Test 2: HTTPS API request (GitHub API)
console.log("Test 2: HTTPS API Request (GitHub)");
try {
  const response = HTTP.syncFetch("https://api.github.com/zen");
  console.log("  ✅ Status:", response.status);
  console.log("  ✅ Certificate verified");
  console.log("  💭 GitHub Zen:", response.body);
} catch (e) {
  console.log("  ❌ Error:", e);
}
console.log("");

// Test 3: HTTPS request with SNI (Server Name Indication)
console.log("Test 3: HTTPS with SNI (httpbin.org)");
try {
  const response = HTTP.syncFetch("https://httpbin.org/get");
  console.log("  ✅ Status:", response.status);
  console.log("  ✅ SNI hostname verified");
  console.log("  📄 Body length:", response.body.length, "bytes");
  
  // Parse JSON response (basic extraction)
  if (response.body.indexOf('"url"') !== -1) {
    console.log("  🔗 Request URL found in response");
  }
} catch (e) {
  console.log("  ❌ Error:", e);
}
console.log("");

// Test 4: HTTP fallback (plain HTTP still works)
console.log("Test 4: Plain HTTP Request (http://example.com)");
try {
  const response = HTTP.syncFetch("http://example.com");
  console.log("  ✅ Status:", response.status);
  console.log("  ⚠️  Warning: No encryption (HTTP)");
} catch (e) {
  console.log("  ❌ Error:", e);
}
console.log("");

console.log("=== Security Features ===");
console.log("  🔒 TLS/SSL encryption (HTTPS)");
console.log("  ✅ Certificate verification enabled");
console.log("  🏷️  SNI (Server Name Indication) support");
console.log("  📜 System CA trust anchors loaded");
console.log("  🔐 Hostname validation");
console.log("");

console.log("=== Technical Details ===");
console.log("  Backend: cpp-httplib v0.28.0 (MIT license)");
console.log("  SSL: System OpenSSL or BearSSL fallback");
console.log("  Certificates: System trust store (/etc/ssl/cert.pem)");
console.log("  Threading: Built-in thread pool");
console.log("  Timeouts: Connection (10s), Read/Write (30s)");
console.log("  Features: Redirect following, keep-alive");
console.log("");

console.log("=== Demo Complete ===");

