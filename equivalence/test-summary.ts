#!/usr/bin/env tsx

/**
 * Test Summary Generator
 * 
 * Counts and displays all equivalence tests by category
 */

import { getAllTests, getTestCount } from './index.ts';

function main() {
  const allTests = getAllTests();
  
  console.log('GoodScript Equivalence Test Suite Summary');
  console.log('='.repeat(60));
  console.log();
  
  // Basic language features
  console.log('📦 BASIC LANGUAGE FEATURES');
  const basic = allTests.basic;
  for (const [name, tests] of Object.entries(basic)) {
    console.log(`   ${name.padEnd(20)} ${tests.length.toString().padStart(3)} tests`);
  }
  const basicTotal = Object.values(basic).reduce((sum, tests) => sum + tests.length, 0);
  console.log(`   ${'Total:'.padEnd(20)} ${basicTotal.toString().padStart(3)} tests`);
  console.log();
  
  // Standard library
  console.log('📚 STANDARD LIBRARY');
  const stdlib = allTests.stdlib;
  for (const [name, tests] of Object.entries(stdlib)) {
    console.log(`   ${name.padEnd(20)} ${tests.length.toString().padStart(3)} tests`);
  }
  const stdlibTotal = Object.values(stdlib).reduce((sum, tests) => sum + tests.length, 0);
  console.log(`   ${'Total:'.padEnd(20)} ${stdlibTotal.toString().padStart(3)} tests`);
  console.log();
  
  // Edge cases
  console.log('⚠️  EDGE CASES');
  const edgeCases = allTests.edgeCases;
  for (const [name, tests] of Object.entries(edgeCases)) {
    console.log(`   ${name.padEnd(20)} ${tests.length.toString().padStart(3)} tests`);
  }
  const edgeTotal = Object.values(edgeCases).reduce((sum, tests) => sum + tests.length, 0);
  console.log(`   ${'Total:'.padEnd(20)} ${edgeTotal.toString().padStart(3)} tests`);
  console.log();
  
  // Grand total
  const grandTotal = getTestCount();
  console.log('='.repeat(60));
  console.log(`GRAND TOTAL: ${grandTotal} tests`);
  console.log('='.repeat(60));
  console.log();
  console.log('Each test runs in 3 modes: Node.js, GC C++, Ownership C++');
  console.log(`Total executions: ${grandTotal * 3} (${grandTotal} × 3 modes)`);
  console.log();
}

main();
