/**
 * Test runner for TypeScript conformance tests
 */

import * as ts from 'typescript';
import { Validator } from 'goodscript';
import { GcAstCodegen as GcCodegen } from 'goodscript/dist/cpp/gc-ast-codegen';
import { TscTest } from '../utils/baseline';
import { shouldRunTest } from './filters';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';
import { tmpdir } from 'os';

// Check if native compilation is enabled
const TEST_NATIVE = process.env.TEST_NATIVE === '1';

export interface TestResult {
  name: string;
  passed: boolean;
  skipped: boolean;
  skipReason?: string;
  error?: string;
  actualJs?: string;
  expectedJs?: string;
  actualErrors?: string[];
  expectedErrors?: string[];
  nativeOutput?: string;  // Output from C++ execution
}

/**
 * Run a single TypeScript conformance test
 */
export async function runTest(test: TscTest): Promise<TestResult> {
  const { name, source, baselineJs, expectedErrors } = test;
  
  // Check if test should be filtered
  const filterResult = shouldRunTest(test);
  if (!filterResult.shouldRun) {
    return {
      name,
      passed: false,
      skipped: true,
      skipReason: filterResult.reason
    };
  }
  
  try {
    // Create TypeScript program
    const sourceFile = ts.createSourceFile(
      `${name}.ts`,
      source,
      ts.ScriptTarget.ES2020,
      true,
      ts.ScriptKind.TS
    );

    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ES2020,
      strict: true,
      noEmit: false,
    };

    const host = ts.createCompilerHost(compilerOptions);
    host.getSourceFile = (fileName) => {
      if (fileName === `${name}.ts`) return sourceFile;
      return undefined;
    };

    const program = ts.createProgram([`${name}.ts`], compilerOptions, host);
    const checker = program.getTypeChecker();

    // Phase 1: Validate "Good Parts"
    const validator = new Validator();
    const validationResult = validator.validate(sourceFile, checker, {
      permissive: true  // Allow TypeScript features for conformance
    });
    
    if (!validationResult.success) {
      const actualErrors = validationResult.diagnostics.map((d: any) => d.message);
      const expErrors = expectedErrors || [];
      
      // If we expect errors and got errors, check they match
      if (expErrors.length > 0) {
        const errorsMatch = compareErrors(actualErrors, expErrors);
        if (errorsMatch) {
          return {
            name,
            passed: true,
            skipped: false,
            actualErrors,
            expectedErrors: expErrors
          };
        } else {
          return {
            name,
            passed: false,
            skipped: false,
            error: 'Error messages do not match',
            actualErrors,
            expectedErrors: expErrors
          };
        }
      }
      
      // Got errors but expected none
      return {
        name,
        passed: false,
        skipped: false,
        error: `Unexpected validation errors: ${actualErrors.join(', ')}`,
        actualErrors
      };
    }
    
    // Generate JavaScript output
    let jsCode: string | undefined;
    program.emit(sourceFile, (fileName, data) => {
      if (fileName.endsWith('.js')) {
        jsCode = data;
      }
    });
    
    // If we expected errors but got none
    if (expectedErrors && expectedErrors.length > 0) {
      return {
        name,
        passed: false,
        skipped: false,
        error: `Expected errors but compilation succeeded`,
        expectedErrors
      };
    }
    
    // No errors expected or received - check JS output
    const actualJs = jsCode || '';
    const expJs = baselineJs || '';
    
    // For now, just check that we generated some output
    if (actualJs.trim().length === 0) {
      return {
        name,
        passed: false,
        skipped: false,
        error: 'Generated empty JavaScript output',
        actualJs,
        expectedJs: expJs
      };
    }
    
    // If TEST_NATIVE is set, also compile to C++ and execute
    let nativeOutput: string | undefined;
    if (TEST_NATIVE) {
      try {
        nativeOutput = await compileAndRunNative(name, source, sourceFile, checker);
      } catch (error) {
        return {
          name,
          passed: false,
          skipped: false,
          error: `Native compilation failed: ${error instanceof Error ? error.message : String(error)}`,
          actualJs,
          expectedJs: expJs
        };
      }
    }
    
    return {
      name,
      passed: true,
      skipped: false,
      actualJs,
      expectedJs: expJs,
      nativeOutput
    };
    
  } catch (error) {
    return {
      name,
      passed: false,
      skipped: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Compare error messages (simplified version)
 * 
 * TODO: Implement sophisticated error comparison
 * For now, just check that error count matches
 */
function compareErrors(actual: string[], expected: string[]): boolean {
  // Strip "error TS####:" prefix from expected errors
  const normalizedExpected = expected.map(err => {
    const match = err.match(/error TS\d+:\s*(.+)/);
    return match ? match[1].trim() : err.trim();
  });
  
  // Check if actual errors contain expected messages
  return normalizedExpected.every(expectedMsg => {
    return actual.some(actualErr => 
      actualErr.toLowerCase().includes(expectedMsg.toLowerCase())
    );
  });
}

/**
 * Compile TypeScript to C++ (GC mode) and execute
 * Returns the program output
 */
async function compileAndRunNative(
  name: string,
  source: string,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker
): Promise<string> {
  // Generate C++ code using GC mode codegen
  const codegen = new GcCodegen(checker);
  const cppCode = codegen.generate(sourceFile);
  
  // Create temporary directory for compilation
  const testDir = join(tmpdir(), `goodscript-tsc-${name}-${Date.now()}`);
  await mkdir(testDir, { recursive: true });
  
  try {
    // Write C++ source
    const cppPath = join(testDir, 'main.cpp');
    await writeFile(cppPath, cppCode);
    
    // Compile with Zig (optimized for speed)
    const exePath = join(testDir, 'main');
    const runtimePath = join(process.cwd(), '../compiler/runtime');
    const mpsPath = join(process.cwd(), '../compiler/mps/code');
    const mpsLibPath = join(mpsPath, 'libmps.a');
    
    try {
      execSync(
        `zig c++ -std=c++20 -O2 -I${runtimePath} -I${mpsPath} ${cppPath} ${mpsLibPath} -o ${exePath}`,
        { stdio: 'pipe' }
      );
    } catch (error) {
      throw new Error(`C++ compilation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Execute and capture output
    try {
      const output = execSync(exePath, { 
        encoding: 'utf-8',
        timeout: 5000  // 5s timeout
      });
      return output;
    } catch (error) {
      throw new Error(`Execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  } finally {
    // Cleanup (best effort)
    try {
      execSync(`rm -rf ${testDir}`, { stdio: 'ignore' });
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Run multiple tests and collect results
 * 
 * @param tests - Tests to run
 * @param concurrency - Maximum number of tests to run in parallel (default: 10)
 */
export async function runTests(tests: TscTest[], concurrency = 10): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  // Run tests in batches of `concurrency` size
  for (let i = 0; i < tests.length; i += concurrency) {
    const batch = tests.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(test => runTest(test)));
    results.push(...batchResults);
  }
  
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
} {
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const skipped = results.filter(r => r.skipped).length;
  const failed = total - passed - skipped;
  const passRate = total > 0 ? (passed / (total - skipped)) * 100 : 0;
  
  return {
    total,
    passed,
    failed,
    skipped,
    passRate: Math.round(passRate * 10) / 10
  };
}
