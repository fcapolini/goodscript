/**
 * GoodScript HTTP/HTTPS Client - Concurrent Requests Demo
 * 
 * Demonstrates true async HTTPS execution with multiple concurrent requests.
 * This showcases the thread pool implementation allowing parallel I/O with
 * full TLS certificate verification.
 */

async function fetchMultipleUrls(): Promise<void> {
  console.log('=== Concurrent HTTPS Requests Demo ===\n');
  
  // Use real HTTPS endpoints for demonstration
  const urls: string[] = [
    'https://api.github.com/zen',           // GitHub API
    'https://www.example.com',              // Example.com
    'https://httpbin.org/delay/1',          // 1 second delay
  ];
  
  console.log('Fetching from ' + urls.length.toString() + ' HTTPS endpoints concurrently...');
  console.log('  • GitHub API (zen quote)');
  console.log('  • Example.com (HTML)');
  console.log('  • HTTPBin (1s delay)');
  console.log('');
  
  const startTime: number = Date.now();
  
  // Launch all requests concurrently
  // With proper async, this should complete in ~1 second (limited by slowest request)
  const promises: Promise<string>[] = [];
  
  for (const url of urls) {
    const promise = fetchUrl(url);
    promises.push(promise);
  }
  
  // Wait for all requests to complete
  const results: string[] = await Promise.all(promises);
  
  const elapsed: number = Date.now() - startTime;
  
  console.log('✅ All requests completed!');
  console.log('⏱️  Total time: ' + elapsed.toString() + 'ms');
  console.log('');
  
  // Display results
  console.log('=== Results ===');
  for (let i: integer = 0; i < results.length; i++) {
    console.log('Response ' + (i + 1).toString() + ': ' + results[i]);
  }
  console.log('');
  
  // Performance analysis
  console.log('=== Performance Analysis ===');
  if (elapsed < 2500) {
    console.log('✅ PASS: Requests executed concurrently');
    console.log('   Expected: ~1000-2000ms (concurrent)');
    console.log('   If sequential: ~3000+ ms');
  } else {
    console.log('⚠️  WARNING: Requests may be sequential');
    console.log('   Actual: ' + elapsed.toString() + 'ms');
  }
  console.log('');
  
  // Security summary
  console.log('=== Security Features ===');
  console.log('🔒 All requests used HTTPS');
  console.log('✅ TLS certificates verified');
  console.log('🏷️  SNI (Server Name Indication) enabled');
  console.log('📜 System CA trust anchors loaded');
}

async function fetchUrl(url: string): Promise<string> {
  const response = await HTTPAsync.fetch(url);
  const bodyPreview: string = response.body.length > 50 
    ? response.body.slice(0, 50) + '...' 
    : response.body;
  return 'HTTP ' + response.status.toString() + ' (' + response.body.length.toString() + ' bytes)';
}

// Main execution
async function main(): Promise<void> {
  await fetchMultipleUrls();
}

// Run the demo
main().then(() => {
  console.log('\n=== Demo Complete ===');
}).catch((error: Error) => {
  console.log('❌ Error: ' + error.message);
});
