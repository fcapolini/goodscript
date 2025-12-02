/**
 * Test262 test runner for GoodScript conformance
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { parseTest262Test, Test262Test } from './parser';
import { shouldRunTest } from './filters';
import { compileGoodScript } from '../utils/compiler';
import { compareOutputs } from '../utils/comparator';

export interface TestResult {
  path: string;
  passed: boolean;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
  duration?: number;
  details?: {
    compileSuccess: boolean;
    jsOutput?: string;
    cppOutput?: string;
    compileError?: string;
    runtimeError?: string;
  };
}

export interface RunnerOptions {
  timeout?: number;
  skipCppExecution?: boolean;
  verbose?: boolean;
}

/**
 * Run a single Test262 test file
 */
export async function runTest262Test(
  testPath: string,
  options: RunnerOptions = {}
): Promise<TestResult> {
  const startTime = Date.now();
  const fullPath = path.join(process.cwd(), 'test262', testPath);

  try {
    // Parse test metadata
    const testContent = await fs.readFile(fullPath, 'utf-8');
    const test = parseTest262Test(testContent, testPath);

    // Check if we should run this test
    const filterResult = shouldRunTest(test);
    if (!filterResult.shouldRun) {
      return {
        path: testPath,
        passed: true,
        skipped: true,
        skipReason: filterResult.reason,
        duration: Date.now() - startTime
      };
    }

    // Compile with GoodScript
    const compileResult = await compileGoodScript(test.code, {
      strict: true,
      generateCpp: !options.skipCppExecution
    });

    // Handle expected compilation errors
    if (test.negative?.phase === 'parse' || test.negative?.phase === 'early') {
      const expectedError = test.negative.type;
      if (compileResult.success) {
        return {
          path: testPath,
          passed: false,
          error: `Expected ${expectedError} but compilation succeeded`,
          duration: Date.now() - startTime
        };
      }
      // Check error type matches
      const hasExpectedError = compileResult.errors?.some(e => 
        e.message.includes(expectedError)
      );
      return {
        path: testPath,
        passed: hasExpectedError,
        error: hasExpectedError ? undefined : 
          `Expected ${expectedError}, got: ${compileResult.errors?.[0]?.message}`,
        duration: Date.now() - startTime
      };
    }

    // Compilation should succeed
    if (!compileResult.success) {
      return {
        path: testPath,
        passed: false,
        error: `Unexpected compilation error: ${compileResult.errors?.[0]?.message}`,
        duration: Date.now() - startTime,
        details: {
          compileSuccess: false,
          compileError: compileResult.errors?.[0]?.message
        }
      };
    }

    // Execute and compare outputs
    const comparison = await compareOutputs(
      compileResult.jsCode!,
      compileResult.cppCode!,
      {
        expectedError: test.negative?.type,
        timeout: options.timeout
      }
    );

    return {
      path: testPath,
      passed: comparison.equivalent,
      error: comparison.equivalent ? undefined : comparison.difference,
      duration: Date.now() - startTime,
      details: {
        compileSuccess: true,
        jsOutput: comparison.jsOutput,
        cppOutput: comparison.cppOutput,
        runtimeError: comparison.difference
      }
    };

  } catch (error) {
    return {
      path: testPath,
      passed: false,
      error: `Test execution failed: ${error instanceof Error ? error.message : String(error)}`,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Run all Test262 tests in a directory
 */
export async function runTest262Suite(
  suitePath: string,
  options: RunnerOptions = {}
): Promise<TestResult[]> {
  const fullPath = path.join(process.cwd(), 'test262', suitePath);
  const results: TestResult[] = [];

  async function walkDirectory(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullEntryPath = path.join(dir, entry.name);
      const relativePath = path.relative(path.join(process.cwd(), 'test262'), fullEntryPath);

      if (entry.isDirectory()) {
        await walkDirectory(fullEntryPath);
      } else if (entry.name.endsWith('.js')) {
        const result = await runTest262Test(relativePath, options);
        results.push(result);
        
        if (options.verbose) {
          const status = result.passed ? '✓' : '✗';
          const info = result.skipped ? ' (skipped)' : '';
          console.log(`${status} ${relativePath}${info}`);
        }
      }
    }
  }

  await walkDirectory(fullPath);
  return results;
}

/**
 * Generate summary statistics from test results
 */
export function summarizeResults(results: TestResult[]): {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  passRate: number;
  avgDuration: number;
} {
  const total = results.length;
  const passed = results.filter(r => r.passed && !r.skipped).length;
  const failed = results.filter(r => !r.passed && !r.skipped).length;
  const skipped = results.filter(r => r.skipped).length;
  const passRate = total > 0 ? (passed / (total - skipped)) * 100 : 0;
  const avgDuration = total > 0 
    ? results.reduce((sum, r) => sum + (r.duration || 0), 0) / total 
    : 0;

  return { total, passed, failed, skipped, passRate, avgDuration };
}
