#!/usr/bin/env tsx

/**
 * Count equivalence tests across all suites
 */

import { getAllTests, getTestCount } from './index.ts';

const allTests = getAllTests();

console.log('📊 Equivalence Test Suite Statistics\n');
console.log('=' .repeat(60));

let grandTotal = 0;

for (const [categoryName, category] of Object.entries(allTests)) {
  console.log(`\n${categoryName.toUpperCase()}:`);
  
  let categoryTotal = 0;
  for (const [suiteName, tests] of Object.entries(category)) {
    const count = tests.length;
    categoryTotal += count;
    console.log(`  ${suiteName.padEnd(25)} ${count.toString().padStart(3)} tests`);
  }
  
  console.log(`  ${'SUBTOTAL'.padEnd(25)} ${categoryTotal.toString().padStart(3)} tests`);
  grandTotal += categoryTotal;
}

console.log('\n' + '='.repeat(60));
console.log(`GRAND TOTAL: ${grandTotal} tests`);
console.log(`Total executions (3 modes): ${grandTotal * 3}`);
console.log('='.repeat(60));

// Breakdown
console.log('\n📈 Coverage Breakdown:');
const basic = Object.values(allTests.basic).reduce((sum, tests) => sum + tests.length, 0);
const stdlib = Object.values(allTests.stdlib).reduce((sum, tests) => sum + tests.length, 0);
const edgeCases = Object.values(allTests.edgeCases).reduce((sum, tests) => sum + tests.length, 0);
const integration = Object.values(allTests.integration).reduce((sum, tests) => sum + tests.length, 0);

console.log(`  Basic:        ${basic} tests (${(basic/grandTotal*100).toFixed(1)}%)`);
console.log(`  Standard Lib: ${stdlib} tests (${(stdlib/grandTotal*100).toFixed(1)}%)`);
console.log(`  Edge Cases:   ${edgeCases} tests (${(edgeCases/grandTotal*100).toFixed(1)}%)`);
console.log(`  Integration:  ${integration} tests (${(integration/grandTotal*100).toFixed(1)}%)`);

console.log('\n✨ New test suites added:');
console.log('  • async-await (15 tests)');
console.log('  • recursion (12 tests)');
console.log('  • lambda-closures (12 tests)');
console.log('  • function-hoisting (10 tests)');
console.log('  • union-types (10 tests)');
console.log('  • array-advanced (10 tests)');
console.log('  • nested-control-flow (10 tests)');
console.log('  • object-literals (8 tests)');
console.log('  • interfaces (7 tests)');
console.log('\n  Total new tests: ~95');
