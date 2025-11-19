/**
 * Phase 1 Tests: Code generation comparison
 * Compile Phase 1 compliant source files with both GoodScript and TypeScript
 * and verify the generated TypeScript/JavaScript is identical
 */

import { describe, it, expect } from 'vitest';
import { Compiler } from '../../src/compiler';
import { Parser } from '../../src/parser';
import { TypeScriptCodegen } from '../../src/ts-codegen';
import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

/**
 * Generate TypeScript output from GoodScript source
 * (removes ownership annotations)
 */
const generateFromGoodScript = (filePath: string): string => {
  const parser = new Parser();
  const codegen = new TypeScriptCodegen();
  
  parser.createProgram([filePath]);
  const sourceFile = parser.getProgram().getSourceFile(filePath);
  
  if (!sourceFile) {
    throw new Error(`Could not load source file: ${filePath}`);
  }
  
  return codegen.generate(sourceFile);
};

/**
 * Compile TypeScript to JavaScript
 */
const compileTypeScriptToJS = (source: string): string => {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
    },
  });
  return result.outputText;
};

/**
 * Normalize code for comparison
 */
const normalizeCode = (code: string): string => {
  return code
    .replace(/\/\/# sourceMappingURL=.*/g, '') // Remove sourcemap comments
    .replace(/\/\/.*$/gm, '') // Remove single-line comments
    .replace(/\/\*.*?\*\//gs, '') // Remove block comments
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
};

/**
 * Validate a file with GoodScript compiler
 */
const validateWithGoodScript = (filePath: string) => {
  const compiler = new Compiler();
  return compiler.compile({
    files: [filePath],
    skipOwnershipChecks: true,  // Phase 1 only
  });
};

describe('Phase 1: Code generation comparison', () => {
  const fixtures = [
    'basic-functions.gs.ts',
    'control-flow.gs.ts',
    'classes.gs.ts',
    'types.gs.ts',
    'null-handling.gs.ts',
  ];

  fixtures.forEach(fixture => {
    it(`${fixture} should generate identical JS when compiled directly vs via GoodScript`, () => {
      const filePath = path.join(FIXTURES_DIR, fixture);
      const originalSource = fs.readFileSync(filePath, 'utf-8');
      
      // Path 1: Compile original TypeScript directly to JS
      const directJS = compileTypeScriptToJS(originalSource);
      
      // Path 2: GoodScript -> TypeScript -> JS
      const gsGeneratedTS = generateFromGoodScript(filePath);
      const gsGeneratedJS = compileTypeScriptToJS(gsGeneratedTS);
      
      // Compare normalized output
      const normalizedDirect = normalizeCode(directJS);
      const normalizedGS = normalizeCode(gsGeneratedJS);
      
      expect(normalizedGS).toBe(normalizedDirect);
    });

    it(`${fixture} should have no GoodScript Phase 1 errors`, () => {
      const filePath = path.join(FIXTURES_DIR, fixture);
      const result = validateWithGoodScript(filePath);
      
      const gsErrors = result.diagnostics.filter(d => 
        typeof d.code === 'string' && d.code.startsWith('GS')
      );
      
      if (gsErrors.length > 0) {
        const errorMessages = gsErrors.map(d => `${d.code}: ${d.message}`).join('\n');
        throw new Error(`GoodScript Phase 1 errors:\n${errorMessages}`);
      }
      
      expect(gsErrors).toHaveLength(0);
    });
  });

  it('all fixtures should be valid Phase 1 GoodScript', () => {
    fixtures.forEach(fixture => {
      const filePath = path.join(FIXTURES_DIR, fixture);
      const source = fs.readFileSync(filePath, 'utf-8');
      
      // Should not contain forbidden Phase 1 constructs
      expect(source).not.toMatch(/\bvar\b/); // No var keyword
      expect(source).not.toMatch(/\s==\s/); // No == operator
      expect(source).not.toMatch(/\s!=\s/); // No != operator
      expect(source).not.toMatch(/\bfunction\s+\w+\s*\(/); // No function declarations
      expect(source).not.toMatch(/\bfunction\s*\(/); // No function expressions
      expect(source).not.toMatch(/\barguments\b/); // No arguments object
      expect(source).not.toMatch(/\bfor\s*\(\s*\w+\s+in\s+/); // No for-in
      expect(source).not.toMatch(/\bwith\s*\(/); // No with statement
      expect(source).not.toMatch(/\beval\s*\(/); // No eval
      expect(source).not.toMatch(/\bFunction\s*\(/); // No Function constructor
      expect(source).not.toMatch(/new\s+Function\s*\(/); // No new Function
    });
  });
});
