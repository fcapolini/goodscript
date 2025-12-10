/**
 * GoodScript HTTP Client - Concurrent Requests Demo
 * 
 * Demonstrates true async HTTP execution with multiple concurrent requests.
 * This showcases the thread pool implementation allowing parallel I/O.
 */

async function fetchMultipleUrls(): Promise<void> {
  console.log('Starting concurrent HTTP requests...');
  
  // Simulate multiple API endpoints
  const urls: string[] = [
    'http://httpbin.org/delay/1',  // 1 second delay
    'http://httpbin.org/delay/1',  // 1 second delay
    'http://httpbin.org/delay/1',  // 1 second delay
  ];
  
  const startTime: number = Date.now();
  
  // Launch all requests concurrently
  // If truly async, this should take ~1 second (not 3 seconds)
  const promises: Promise<string>[] = [];
  
  for (const url of urls) {
    const promise = fetchUrl(url);
    promises.push(promise);
  }
  
  // Wait for all requests to complete
  const results: string[] = await Promise.all(promises);
  
  const elapsed: number = Date.now() - startTime;
  
  console.log('All requests completed!');
  console.log('Total time: ' + elapsed.toString() + 'ms');
  console.log('Expected: ~1000ms (concurrent)');
  console.log('If sequential: ~3000ms');
  
  // Verify results
  for (let i: integer = 0; i < results.length; i++) {
    console.log('Response ' + i.toString() + ' status: ' + results[i]);
  }
  
  // Performance check
  if (elapsed < 2000) {
    console.log('✓ PASS: Requests executed concurrently');
  } else {
    console.log('✗ FAIL: Requests appear to be sequential');
  }
}

async function fetchUrl(url: string): Promise<string> {
  const response = await HTTPAsync.fetch(url);
  return 'HTTP ' + response.status.toString();
}

// Main execution
async function main(): Promise<void> {
  await fetchMultipleUrls();
}

// Run the demo
main().then(() => {
  console.log('Demo completed successfully');
}).catch((error: Error) => {
  console.log('Error: ' + error.message);
});
