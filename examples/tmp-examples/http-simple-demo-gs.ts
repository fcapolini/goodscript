/**
 * GoodScript HTTP Client Simple Demo
 * 
 * Demonstrates basic HTTP requests using the built-in HTTP client.
 */

// Simple GET request
console.log('Making HTTP GET request...');
const response = HTTP.syncFetch('https://httpbin.org/get');
console.log(`Status: ${response.status} ${response.statusText}`);
console.log(`Body length: ${response.body.length}`);

// POST request with body
console.log('\nMaking HTTP POST request...');
const postOptions: any = {
  method: 'POST',
  body: '{"name":"GoodScript","version":"0.12"}'
};
const postResponse = HTTP.syncFetch('https://httpbin.org/post', postOptions);
console.log(`Status: ${postResponse.status} ${postResponse.statusText}`);

// Test with timeout
console.log('\nTesting timeout...');
const timeoutOptions: any = {
  timeout: 5000 // 5 seconds
};
const timeoutResponse = HTTP.syncFetch('https://httpbin.org/delay/1', timeoutOptions);
console.log(`Status: ${timeoutResponse.status}`);

console.log('\nHTTP tests complete!');
