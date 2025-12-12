/**
 * Vitest Equivalence Test Suite
 * 
 * Runs all equivalence tests in parallel using Vitest
 * Each test runs in Node.js, GC C++, and Ownership C++ modes
 */

import { describe, it, expect } from 'vitest';
import { runEquivalenceTest } from './test-framework.js';
import { getAllTests } from './index.js';

// Flatten all tests from all categories
const allTestsGrouped = getAllTests();
const allTests: any[] = [];

for (const category of Object.values(allTestsGrouped)) {
  for (const suite of Object.values(category)) {
    allTests.push(...suite);
  }
}

// Run all tests in parallel at the top level for maximum concurrency
// This allows Vitest to run ALL tests simultaneously (up to maxConcurrency limit)
for (const test of allTests) {
  if (test.skip) {
    it.skip(test.name, () => {});
    continue;
  }

  it.concurrent(test.name, async () => {
    const results = await runEquivalenceTest(test);
    
    // Check all results
    for (const result of results) {
      if (!result.passed) {
        const error = result.error 
          ? `\n   Error: ${result.error}`
          : `\n   Expected: ${JSON.stringify(test.expectedOutput)}\n   Got:      ${JSON.stringify(result.output)}`;
        
        throw new Error(`[${result.mode}] Failed (${result.duration}ms)${error}`);
      }
    }
    
    // If we get here, all modes passed
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.passed)).toBe(true);
  }, {
    timeout: 60000 // 60 second timeout per test
  });
}
