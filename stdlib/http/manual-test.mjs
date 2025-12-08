#!/usr/bin/env node

// Simple manual test for HTTP async methods
import { Http } from './dist/index-gs.js';

async function main() {
  console.log('Testing Http.fetch() and Http.fetchJson()...\n');

  // Test 1: Simple GET request
  try {
    console.log('1. Testing fetch() with httpbin.org...');
    const response = await Http.fetch('https://httpbin.org/get');
    console.log(`   ✓ Status: ${response.status} ${response.statusText}`);
    console.log(`   ✓ OK: ${response.ok}`);
    console.log(`   ✓ Body length: ${response.body.length} bytes`);
    console.log(`   ✓ Content-Type: ${response.headers.get('content-type')}`);
  } catch (error) {
    console.error(`   ✗ Error: ${error}`);
  }

  console.log();

  // Test 2: JSON fetch
  try {
    console.log('2. Testing fetchJson() with httpbin.org...');
    const data = await Http.fetchJson('https://httpbin.org/get');
    console.log(`   ✓ Parsed JSON successfully`);
    console.log(`   ✓ URL: ${data.url}`);
    console.log(`   ✓ Headers: ${Object.keys(data.headers).length} headers`);
  } catch (error) {
    console.error(`   ✗ Error: ${error}`);
  }

  console.log();

  // Test 3: tryFetch() with safe error handling
  try {
    console.log('3. Testing tryFetch() with 404...');
    const result = await Http.tryFetch('https://httpbin.org/status/404');
    if (result.success) {
      console.log(`   ✓ Request succeeded (no network error)`);
      console.log(`   ✓ Status: ${result.response.status}`);
      console.log(`   ✓ OK: ${result.response.ok} (false because 404)`);
    } else {
      console.error(`   ✗ Unexpected error: ${result.error}`);
    }
  } catch (error) {
    console.error(`   ✗ Error: ${error}`);
  }

  console.log();

  // Test 4: tryFetchJson() with safe error handling
  try {
    console.log('4. Testing tryFetchJson()...');
    const result = await Http.tryFetchJson('https://httpbin.org/get');
    if (result.success) {
      console.log(`   ✓ JSON parsed successfully`);
      console.log(`   ✓ URL: ${result.value.url}`);
    } else {
      console.error(`   ✗ Error: ${result.error}`);
    }
  } catch (error) {
    console.error(`   ✗ Error: ${error}`);
  }

  console.log();

  // Test 5: Network error handling
  try {
    console.log('5. Testing error handling with invalid URL...');
    const result = await Http.tryFetch('https://invalid-domain-that-does-not-exist-12345.com');
    if (result.success) {
      console.error(`   ✗ Should have failed but got: ${result.response.status}`);
    } else {
      console.log(`   ✓ Correctly caught network error`);
      console.log(`   ✓ Error message: ${result.error.substring(0, 60)}...`);
    }
  } catch (error) {
    console.error(`   ✗ Unexpected throw: ${error}`);
  }

  console.log();
  console.log('All tests completed!');
}

main().catch(console.error);
