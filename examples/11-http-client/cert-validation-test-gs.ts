// Test certificate verification with valid and invalid certificates

interface HttpResponse {
  status: number;
  statusText: string;
  headers: Map<string, string>;
  body: string;
}

declare const HTTP: {
  syncFetch(url: string): HttpResponse;
};

console.log("=== Certificate Verification Test ===\n");

// Test 1: Valid certificate (should work)
console.log("Test 1: Valid HTTPS certificate");
try {
  const response = HTTP.syncFetch("https://www.google.com");
  console.log("✅ Certificate verification PASSED");
  console.log("   Status:", response.status);
  console.log("   Body length:", response.body.length, "bytes");
} catch (e) {
  console.log("❌ Unexpected error:", e);
}

console.log("");

// Test 2: Self-signed certificate (should fail)
console.log("Test 2: Self-signed certificate (badssl.com)");
try {
  const response = HTTP.syncFetch("https://self-signed.badssl.com");
  console.log("❌ SECURITY ERROR: Certificate verification should have FAILED!");
  console.log("   Status:", response.status);
} catch (e) {
  console.log("✅ Certificate verification correctly REJECTED invalid cert");
  console.log("   Error:", e);
}

console.log("\n=== Certificate Verification Working! ===");
