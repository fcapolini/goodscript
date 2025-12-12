/**
 * Functional Equivalence Test Framework
 * 
 * Compiles and executes test cases in all three modes (Node.js, GC C++, Ownership C++)
 * and verifies they produce identical outputs.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);

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
 * Run a single test in all three modes (in parallel for maximum CPU utilization)
 */
export async function runEquivalenceTest(test: EquivalenceTest): Promise<TestResult[]> {
  if (test.skip) {
    return [];
  }

  const skipModes = new Set(test.skipModes || []);
  
  // Create temp directory for this test
  const testDir = join(tmpdir(), `goodscript-equiv-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(testDir, { recursive: true });
  
  try {
    const sourceFile = join(testDir, 'test-gs.ts');
    
    // Add GoodScript type aliases for Node.js compatibility
    const codeWithTypeAliases = `// GoodScript type aliases
type integer = number;
type integer53 = number;

${test.code}`;
    
    writeFileSync(sourceFile, codeWithTypeAliases);
    
    // Run all modes in parallel for maximum CPU utilization
    const promises: Promise<TestResult>[] = [];
    
    if (!skipModes.has('node')) {
      promises.push(runInNode(test.name, sourceFile, test.expectedOutput));
    }
    
    if (!skipModes.has('gc')) {
      promises.push(runInGC(test.name, sourceFile, testDir, test.expectedOutput));
    }
    
    if (!skipModes.has('ownership')) {
      promises.push(runInOwnership(test.name, sourceFile, testDir, test.expectedOutput));
    }
    
    // Wait for all modes to complete in parallel
    const results = await Promise.all(promises);
    return results;
  } finally {
    // Cleanup temp directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

async function runInNode(name: string, sourceFile: string, expectedOutput: string): Promise<TestResult> {
  const start = Date.now();
  try {
    // Use node with tsx CLI directly (tsx in .bin is a shell wrapper)
    const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
    const tsxCli = join(workspaceRoot, 'node_modules', '.pnpm', 'tsx@4.21.0', 'node_modules', 'tsx', 'dist', 'cli.mjs');
    const { stdout } = await execAsync(`node ${tsxCli} ${sourceFile}`, {
      encoding: 'utf-8',
      timeout: 5000,
      maxBuffer: 10 * 1024 * 1024,
      cwd: workspaceRoot
    });
    const duration = Date.now() - start;
    
    return {
      name,
      mode: 'node',
      passed: stdout === expectedOutput,
      output: stdout,
      duration
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    return {
      name,
      mode: 'node',
      passed: false,
      output: error.stdout || '',
      error: error.stderr || error.message || 'Unknown error',
      duration
    };
  }
}

async function runInGC(name: string, sourceFile: string, testDir: string, expectedOutput: string): Promise<TestResult> {
  const outBin = join(testDir, 'test-gc');
  const start = Date.now();
  
  try {
    // Compile
    await execAsync(`${COMPILER_BIN} --gsTarget cpp --gsMemory gc -o ${outBin} ${sourceFile}`, {
      encoding: 'utf-8',
      timeout: 10000,
      maxBuffer: 10 * 1024 * 1024
    });
    
    // Execute
    const { stdout } = await execAsync(outBin, {
      encoding: 'utf-8',
      timeout: 5000,
      maxBuffer: 10 * 1024 * 1024
    });
    const duration = Date.now() - start;
    
    return {
      name,
      mode: 'gc',
      passed: stdout === expectedOutput,
      output: stdout,
      duration
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    return {
      name,
      mode: 'gc',
      passed: false,
      output: error.stdout || '',
      error: error.stderr || error.message,
      duration
    };
  }
}

async function runInOwnership(name: string, sourceFile: string, testDir: string, expectedOutput: string): Promise<TestResult> {
  const outBin = join(testDir, 'test-ownership');
  const start = Date.now();
  
  try {
    // Compile
    await execAsync(`${COMPILER_BIN} --gsTarget cpp --gsMemory ownership -o ${outBin} ${sourceFile}`, {
      encoding: 'utf-8',
      timeout: 10000,
      maxBuffer: 10 * 1024 * 1024
    });
    
    // Execute
    const { stdout } = await execAsync(outBin, {
      encoding: 'utf-8',
      timeout: 5000,
      maxBuffer: 10 * 1024 * 1024
    });
    const duration = Date.now() - start;
    
    return {
      name,
      mode: 'ownership',
      passed: stdout === expectedOutput,
      output: stdout,
      duration
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    return {
      name,
      mode: 'ownership',
      passed: false,
      output: error.stdout || '',
      error: error.stderr || error.message,
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
