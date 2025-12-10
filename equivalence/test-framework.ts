/**
 * Functional Equivalence Test Framework
 * 
 * Compiles and executes test cases in all three modes (Node.js, GC C++, Ownership C++)
 * and verifies they produce identical outputs.
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export interface EquivalenceTest {
  name: string;
  code: string;
  expectedOutput: string;
  skip?: boolean;
  skipModes?: ('node' | 'gc' | 'ownership')[];
}

export interface TestResult {
  name: string;
  mode: 'node' | 'gc' | 'ownership';
  passed: boolean;
  output: string;
  error?: string;
  duration: number;
}

const COMPILER_BIN = join(import.meta.dirname || __dirname, '..', 'compiler', 'bin', 'gsc');

export function defineEquivalenceTest(test: EquivalenceTest): EquivalenceTest {
  return test;
}

/**
 * Run a single test in all three modes
 */
export async function runEquivalenceTest(test: EquivalenceTest): Promise<TestResult[]> {
  if (test.skip) {
    return [];
  }

  const results: TestResult[] = [];
  const skipModes = new Set(test.skipModes || []);
  
  // Create temp directory for this test
  const testDir = join(tmpdir(), `goodscript-equiv-${Date.now()}`);
  mkdirSync(testDir, { recursive: true });
  
  try {
    const sourceFile = join(testDir, 'test-gs.ts');
    writeFileSync(sourceFile, test.code);
    
    // Run in Node.js
    if (!skipModes.has('node')) {
      results.push(await runInNode(test.name, sourceFile, test.expectedOutput));
    }
    
    // Run in GC C++
    if (!skipModes.has('gc')) {
      results.push(await runInGC(test.name, sourceFile, testDir, test.expectedOutput));
    }
    
    // Run in Ownership C++
    if (!skipModes.has('ownership')) {
      results.push(await runInOwnership(test.name, sourceFile, testDir, test.expectedOutput));
    }
  } finally {
    // Cleanup temp directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  }
  
  return results;
}

async function runInNode(name: string, sourceFile: string, expectedOutput: string): Promise<TestResult> {
  const start = Date.now();
  try {
    const output = execSync(`tsx ${sourceFile}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000
    });
    const duration = Date.now() - start;
    
    return {
      name,
      mode: 'node',
      passed: output === expectedOutput,
      output,
      duration
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    return {
      name,
      mode: 'node',
      passed: false,
      output: error.stdout || '',
      error: error.message,
      duration
    };
  }
}

async function runInGC(name: string, sourceFile: string, testDir: string, expectedOutput: string): Promise<TestResult> {
  const outBin = join(testDir, 'test-gc');
  const start = Date.now();
  
  try {
    // Compile
    execSync(`${COMPILER_BIN} --gsTarget cpp --gsMemory gc -o ${outBin} ${sourceFile}`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 10000
    });
    
    // Execute
    const output = execSync(outBin, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000
    });
    const duration = Date.now() - start;
    
    return {
      name,
      mode: 'gc',
      passed: output === expectedOutput,
      output,
      duration
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    return {
      name,
      mode: 'gc',
      passed: false,
      output: error.stdout || '',
      error: error.message,
      duration
    };
  }
}

async function runInOwnership(name: string, sourceFile: string, testDir: string, expectedOutput: string): Promise<TestResult> {
  const outBin = join(testDir, 'test-ownership');
  const start = Date.now();
  
  try {
    // Compile
    execSync(`${COMPILER_BIN} --gsTarget cpp --gsMemory ownership -o ${outBin} ${sourceFile}`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 10000
    });
    
    // Execute
    const output = execSync(outBin, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000
    });
    const duration = Date.now() - start;
    
    return {
      name,
      mode: 'ownership',
      passed: output === expectedOutput,
      output,
      duration
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    return {
      name,
      mode: 'ownership',
      passed: false,
      output: error.stdout || '',
      error: error.message,
      duration
    };
  }
}

/**
 * Format test results for display
 */
export function formatResults(allResults: TestResult[][]): void {
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  
  for (const results of allResults) {
    if (results.length === 0) continue;
    
    const testName = results[0].name;
    const allPassed = results.every(r => r.passed);
    totalTests++;
    
    if (allPassed) {
      passedTests++;
      console.log(`✅ ${testName}`);
    } else {
      failedTests++;
      console.log(`\n❌ ${testName}`);
      
      for (const result of results) {
        if (!result.passed) {
          console.log(`   [${result.mode}] Failed (${result.duration}ms)`);
          if (result.error) {
            console.log(`   Error: ${result.error}`);
          }
          console.log(`   Expected: ${JSON.stringify(results[0].output)}`);
          console.log(`   Got:      ${JSON.stringify(result.output)}`);
        }
      }
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Total: ${totalTests} tests`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log('='.repeat(60));
  
  if (failedTests > 0) {
    process.exit(1);
  }
}
