#!/usr/bin/env tsx

/**
 * Equivalence Test Runner
 * 
 * Executes all equivalence tests across Node.js, GC C++, and Ownership C++ modes
 */

import { readdirSync } from 'fs';
import { join } from 'path';
import { runEquivalenceTest, formatResults, type TestResult } from './test-framework.js';

const EQUIV_DIR = import.meta.dirname || __dirname;

async function loadTests(dir: string): Promise<any[]> {
  const testFiles = readdirSync(dir)
    .filter(f => f.endsWith('.test.ts') || f.endsWith('.test.js'))
    .map(f => join(dir, f));

  const allTests: any[] = [];
  
  for (const file of testFiles) {
    try {
      const module = await import(file);
      if (module.tests && Array.isArray(module.tests)) {
        allTests.push(...module.tests);
      }
    } catch (error) {
      console.error(`Error loading ${file}:`, error);
    }
  }
  
  return allTests;
}

async function findAllTests(): Promise<any[]> {
  const categories = ['basic', 'edge-cases', 'stdlib', 'integration'];
  let allTests: any[] = [];
  
  for (const category of categories) {
    const categoryDir = join(EQUIV_DIR, category);
    try {
      const tests = await loadTests(categoryDir);
      allTests = allTests.concat(tests);
    } catch (error) {
      // Category directory doesn't exist yet, skip
    }
  }
  
  return allTests;
}

async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  const filterPattern = args.find(a => !a.startsWith('-'));
  
  console.log('Loading equivalence tests...\n');
  
  const tests = await findAllTests();
  const filteredTests = filterPattern
    ? tests.filter(t => t.name.toLowerCase().includes(filterPattern.toLowerCase()))
    : tests;
  
  if (filteredTests.length === 0) {
    console.error('No tests found!');
    process.exit(1);
  }
  
  console.log(`Running ${filteredTests.length} equivalence test(s)...\n`);
  
  const allResults: TestResult[][] = [];
  
  for (const test of filteredTests) {
    if (verbose) {
      console.log(`Running: ${test.name}...`);
    }
    
    const results = await runEquivalenceTest(test);
    allResults.push(results);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('EQUIVALENCE TEST RESULTS');
  console.log('='.repeat(60) + '\n');
  
  formatResults(allResults);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
