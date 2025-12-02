/**
 * TypeScript conformance tests: Classes
 * 
 * Tests basic class functionality from TypeScript's conformance suite
 * 
 * Run with TEST_NATIVE=1 to enable C++ compilation and execution
 */

import { describe, it, expect } from 'vitest';
import { resolve, join } from 'path';
import { readdirSync, statSync } from 'fs';
import { parseTscTest } from '../utils/baseline';
import { runTest, summarizeResults } from '../harness/runner';

const TSC_ROOT = resolve(__dirname, '../../typescript');
const CONFORMANCE_DIR = join(TSC_ROOT, 'tests/cases/conformance');
const BASELINES_DIR = join(TSC_ROOT, 'tests/baselines/reference');
const TEST_NATIVE = process.env.TEST_NATIVE === '1';

if (TEST_NATIVE) {
  console.log('🔧 Native mode enabled - tests will compile to C++ and execute');
}

/**
 * Get all test files in a category directory (recursively)
 */
function getTestFiles(category: string): string[] {
  const categoryPath = join(CONFORMANCE_DIR, category);
  const files: string[] = [];
  
  function walk(dir: string) {
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (entry.endsWith('.ts')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Could not read directory ${dir}:`, error);
    }
  }
  
  walk(categoryPath);
  return files;
}

describe('TypeScript Conformance: Classes', () => {
  const testFiles = getTestFiles('classes');
  
  it(`should have test files available (${testFiles.length} total tests)`, () => {
    expect(testFiles.length).toBeGreaterThan(0);
  });
});

// Batch 1: First 5 tests
describe('TypeScript Conformance: Classes - Batch 1/6', () => {
  const testFiles = getTestFiles('classes');
  const batchTests = testFiles.slice(0, 5);
  
  for (const testPath of batchTests) {
    const testName = testPath.split('/').pop()?.replace('.ts', '') || testPath;
    
    it(`should pass: ${testName}`, async () => {
      const test = await parseTscTest(testPath, BASELINES_DIR);
      const result = await runTest(test);
      
      if (result.skipped) {
        console.log(`  ⊘ SKIP: ${result.skipReason}`);
        return;
      }
      
      if (!result.passed) {
        console.error(`  ✗ FAIL: ${result.error}`);
      }
      
      expect(result.passed).toBe(true);
    }, 10000);
  }
});

// Batch 2: Tests 6-10
describe('TypeScript Conformance: Classes - Batch 2/6', () => {
  const testFiles = getTestFiles('classes');
  const batchTests = testFiles.slice(5, 10);
  
  for (const testPath of batchTests) {
    const testName = testPath.split('/').pop()?.replace('.ts', '') || testPath;
    
    it(`should pass: ${testName}`, async () => {
      const test = await parseTscTest(testPath, BASELINES_DIR);
      const result = await runTest(test);
      
      if (result.skipped) {
        console.log(`  ⊘ SKIP: ${result.skipReason}`);
        return;
      }
      
      if (!result.passed) {
        console.error(`  ✗ FAIL: ${result.error}`);
      }
      
      expect(result.passed).toBe(true);
    }, 10000);
  }
});

// Batch 3: Tests 11-15
describe('TypeScript Conformance: Classes - Batch 3/6', () => {
  const testFiles = getTestFiles('classes');
  const batchTests = testFiles.slice(10, 15);
  
  for (const testPath of batchTests) {
    const testName = testPath.split('/').pop()?.replace('.ts', '') || testPath;
    
    it(`should pass: ${testName}`, async () => {
      const test = await parseTscTest(testPath, BASELINES_DIR);
      const result = await runTest(test);
      
      if (result.skipped) {
        console.log(`  ⊘ SKIP: ${result.skipReason}`);
        return;
      }
      
      if (!result.passed) {
        console.error(`  ✗ FAIL: ${result.error}`);
      }
      
      expect(result.passed).toBe(true);
    }, 10000);
  }
});

// Batch 4: Tests 16-20
describe('TypeScript Conformance: Classes - Batch 4/6', () => {
  const testFiles = getTestFiles('classes');
  const batchTests = testFiles.slice(15, 20);
  
  for (const testPath of batchTests) {
    const testName = testPath.split('/').pop()?.replace('.ts', '') || testPath;
    
    it(`should pass: ${testName}`, async () => {
      const test = await parseTscTest(testPath, BASELINES_DIR);
      const result = await runTest(test);
      
      if (result.skipped) {
        console.log(`  ⊘ SKIP: ${result.skipReason}`);
        return;
      }
      
      if (!result.passed) {
        console.error(`  ✗ FAIL: ${result.error}`);
      }
      
      expect(result.passed).toBe(true);
    }, 10000);
  }
});

// Batch 5: Tests 21-25
describe('TypeScript Conformance: Classes - Batch 5/6', () => {
  const testFiles = getTestFiles('classes');
  const batchTests = testFiles.slice(20, 25);
  
  for (const testPath of batchTests) {
    const testName = testPath.split('/').pop()?.replace('.ts', '') || testPath;
    
    it(`should pass: ${testName}`, async () => {
      const test = await parseTscTest(testPath, BASELINES_DIR);
      const result = await runTest(test);
      
      if (result.skipped) {
        console.log(`  ⊘ SKIP: ${result.skipReason}`);
        return;
      }
      
      if (!result.passed) {
        console.error(`  ✗ FAIL: ${result.error}`);
      }
      
      expect(result.passed).toBe(true);
    }, 10000);
  }
});

// Batch 6: Tests 26-30
describe('TypeScript Conformance: Classes - Batch 6/6', () => {
  const testFiles = getTestFiles('classes');
  const batchTests = testFiles.slice(25, 30);
  
  for (const testPath of batchTests) {
    const testName = testPath.split('/').pop()?.replace('.ts', '') || testPath;
    
    it(`should pass: ${testName}`, async () => {
      const test = await parseTscTest(testPath, BASELINES_DIR);
      const result = await runTest(test);
      
      if (result.skipped) {
        console.log(`  ⊘ SKIP: ${result.skipReason}`);
        return;
      }
      
      if (!result.passed) {
        console.error(`  ✗ FAIL: ${result.error}`);
      }
      
      expect(result.passed).toBe(true);
    }, 10000);
  }
});

// Summary across all batches
describe('TypeScript Conformance: Classes - Summary', () => {
  it('should report overall pass rate', async () => {
    const testFiles = getTestFiles('classes');
    const pilotTests = testFiles.slice(0, 30);
    
    const tests = await Promise.all(
      pilotTests.map(path => parseTscTest(path, BASELINES_DIR))
    );
    
    const results = await Promise.all(tests.map(runTest));
    const summary = summarizeResults(results);
    
    console.log('\n=== Classes Category Summary ===');
    console.log(`Total tests: ${summary.total}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Skipped: ${summary.skipped}`);
    console.log(`Pass rate: ${summary.passRate}%`);
    console.log('================================\n');
    
    expect(summary.total).toBeGreaterThan(0);
  });
});
