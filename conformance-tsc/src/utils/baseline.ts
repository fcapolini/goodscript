/**
 * TypeScript baseline file utilities
 * 
 * Handles reading and parsing TypeScript test baselines:
 * - .ts: Test source files
 * - .js: Expected JavaScript output
 * - .errors.txt: Expected compiler errors
 * - .types: Type information (optional)
 * - .symbols: Symbol information (optional)
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface TscTest {
  name: string;
  sourcePath: string;
  source: string;
  hasBaseline: boolean;
  baselineJs?: string;
  hasErrors: boolean;
  expectedErrors?: string[];
}

/**
 * Parse a TypeScript conformance test file
 */
export async function parseTscTest(
  testPath: string,
  baselinePath: string
): Promise<TscTest> {
  const name = path.basename(testPath, '.ts');
  const source = await fs.readFile(testPath, 'utf-8');
  
  // Check for JavaScript baseline
  const jsBaselinePath = path.join(baselinePath, `${name}.js`);
  let baselineJs: string | undefined;
  let hasBaseline = false;
  
  try {
    baselineJs = await fs.readFile(jsBaselinePath, 'utf-8');
    hasBaseline = true;
  } catch {
    // No baseline - test might expect errors
  }
  
  // Check for expected errors
  const errorsPath = path.join(baselinePath, `${name}.errors.txt`);
  let expectedErrors: string[] | undefined;
  let hasErrors = false;
  
  try {
    const errorsContent = await fs.readFile(errorsPath, 'utf-8');
    expectedErrors = parseErrorsFile(errorsContent);
    hasErrors = true;
  } catch {
    // No errors expected
  }
  
  return {
    name,
    sourcePath: testPath,
    source,
    hasBaseline,
    baselineJs,
    hasErrors,
    expectedErrors
  };
}

/**
 * Parse TypeScript .errors.txt file
 */
function parseErrorsFile(content: string): string[] {
  const errors: string[] = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and file headers
    if (!trimmed || trimmed.startsWith('===') || trimmed.startsWith('tests/')) {
      continue;
    }
    // Extract error messages (lines starting with error markers)
    if (trimmed.match(/^error TS\d+:/)) {
      errors.push(trimmed);
    }
  }
  
  return errors;
}

/**
 * Normalize JavaScript output for comparison
 * Removes comments, normalizes whitespace
 */
export function normalizeJsOutput(js: string): string {
  return js
    .split('\n')
    // Remove single-line comments
    .map(line => line.replace(/\/\/.*$/, ''))
    // Remove leading/trailing whitespace
    .map(line => line.trim())
    // Remove empty lines
    .filter(line => line.length > 0)
    .join('\n');
}

/**
 * Compare two JavaScript outputs for semantic equivalence
 */
export function compareJsOutputs(actual: string, expected: string): {
  equivalent: boolean;
  difference?: string;
} {
  const normalizedActual = normalizeJsOutput(actual);
  const normalizedExpected = normalizeJsOutput(expected);
  
  if (normalizedActual === normalizedExpected) {
    return { equivalent: true };
  }
  
  // Try line-by-line comparison to identify differences
  const actualLines = normalizedActual.split('\n');
  const expectedLines = normalizedExpected.split('\n');
  
  if (actualLines.length !== expectedLines.length) {
    return {
      equivalent: false,
      difference: `Line count mismatch: ${actualLines.length} vs ${expectedLines.length}`
    };
  }
  
  for (let i = 0; i < actualLines.length; i++) {
    if (actualLines[i] !== expectedLines[i]) {
      return {
        equivalent: false,
        difference: `Line ${i + 1} differs:\n  Actual:   ${actualLines[i]}\n  Expected: ${expectedLines[i]}`
      };
    }
  }
  
  return { equivalent: true };
}
