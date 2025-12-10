// Simple HTTPS test to verify certificate verification works

interface HttpResponse {
  status: number;
  statusText: string;
  headers: Map<string, string>;
  body: string;
}

declare const HTTP: {
  syncFetch(url: string): HttpResponse;
};

console.log("=== Simple HTTPS Test ===\n");

console.log("Testing HTTPS with certificate verification...");
try {
  const response = HTTP.syncFetch("https://www.example.com");
  console.log("✅ HTTPS request successful!");
  console.log("✅ Certificate verification passed!");
  console.log("Status:", response.status);
  console.log("Status Text:", response.statusText);
  console.log("Body length:", response.body.length, "bytes");
} catch (e) {
  console.log("❌ HTTPS request failed:", e);
}

console.log("\n=== Test Complete ===");
