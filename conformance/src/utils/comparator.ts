/**
 * Output comparator for JavaScript vs C++ execution
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

export interface CompareOptions {
  expectedError?: string;
  timeout?: number;
}

export interface CompareResult {
  equivalent: boolean;
  difference?: string;
  jsOutput?: string;
  cppOutput?: string;
  jsError?: string;
  cppError?: string;
}

/**
 * Compare JavaScript and C++ execution outputs
 */
export async function compareOutputs(
  jsCode: string,
  cppCode: string,
  options: CompareOptions = {}
): Promise<CompareResult> {
  const timeout = options.timeout || 5000;

  try {
    // Execute JavaScript
    const jsResult = await executeJavaScript(jsCode, timeout);
    
    // Execute C++
    const cppResult = await executeCpp(cppCode, timeout);

    // Compare outputs
    if (options.expectedError) {
      // Both should error
      if (!jsResult.error && !cppResult.error) {
        return {
          equivalent: false,
          difference: `Expected error ${options.expectedError} but both succeeded`,
          jsOutput: jsResult.output,
          cppOutput: cppResult.output
        };
      }
      
      // Check error types match
      const jsHasError = jsResult.error?.includes(options.expectedError);
      const cppHasError = cppResult.error?.includes(options.expectedError);
      
      if (jsHasError !== cppHasError) {
        return {
          equivalent: false,
          difference: `Error mismatch: JS ${jsHasError ? 'has' : 'missing'} ${options.expectedError}, C++ ${cppHasError ? 'has' : 'missing'}`,
          jsError: jsResult.error,
          cppError: cppResult.error
        };
      }

      return {
        equivalent: true,
        jsError: jsResult.error,
        cppError: cppResult.error
      };
    }

    // Both should succeed
    if (jsResult.error || cppResult.error) {
      return {
        equivalent: false,
        difference: `Unexpected error: JS=${jsResult.error || 'none'}, C++=${cppResult.error || 'none'}`,
        jsOutput: jsResult.output,
        cppOutput: cppResult.output,
        jsError: jsResult.error,
        cppError: cppResult.error
      };
    }

    // Compare output strings
    const jsOut = normalizeOutput(jsResult.output);
    const cppOut = normalizeOutput(cppResult.output);

    if (jsOut !== cppOut) {
      return {
        equivalent: false,
        difference: `Output mismatch:\nJS:  ${jsOut}\nC++: ${cppOut}`,
        jsOutput: jsResult.output,
        cppOutput: cppResult.output
      };
    }

    return {
      equivalent: true,
      jsOutput: jsResult.output,
      cppOutput: cppResult.output
    };

  } catch (error) {
    return {
      equivalent: false,
      difference: `Comparison failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

async function executeJavaScript(
  code: string,
  timeout: number
): Promise<{ output: string; error?: string }> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gs-test-'));
  const tmpFile = path.join(tmpDir, 'test.js');

  try {
    await fs.writeFile(tmpFile, code);
    
    const { stdout, stderr } = await execAsync(`node ${tmpFile}`, {
      timeout,
      maxBuffer: 1024 * 1024
    });

    return {
      output: stdout,
      error: stderr || undefined
    };

  } catch (error: any) {
    return {
      output: error.stdout || '',
      error: error.stderr || error.message
    };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

async function executeCpp(
  code: string,
  timeout: number
): Promise<{ output: string; error?: string }> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gs-test-'));
  const srcFile = path.join(tmpDir, 'test.cpp');
  const binFile = path.join(tmpDir, 'test');

  try {
    // Write C++ code
    await fs.writeFile(srcFile, code);

    // Compile with g++ or clang++ using GC mode (simpler, closer to JavaScript semantics)
    const compiler = process.env.CXX || 'g++';
    const runtimePath = path.join(process.cwd(), '../compiler/runtime');
    // Compilation: ignore warnings in stderr (only fail on actual errors with non-zero exit)
    await execAsync(
      `${compiler} -std=c++20 -DGS_GC_MODE -I${runtimePath} -I${runtimePath}/gc -o ${binFile} ${srcFile}`,
      { timeout: timeout * 2 }
    );

    // Execute
    const { stdout, stderr } = await execAsync(binFile, {
      timeout,
      maxBuffer: 1024 * 1024
    });

    // Return output (compilation succeeded, execution succeeded, ignore any warnings)
    return {
      output: stdout,
      error: undefined
    };

  } catch (error: any) {
    return {
      output: error.stdout || '',
      error: error.stderr || error.message
    };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

function normalizeOutput(output: string): string {
  return output
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\s+$/gm, '') // Remove trailing whitespace
    .replace(/^\s+/gm, ''); // Remove leading whitespace
}
