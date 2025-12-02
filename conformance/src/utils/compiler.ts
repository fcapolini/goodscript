/**
 * GoodScript compiler wrapper for conformance testing
 * 
 * Uses GC mode for C++ compilation to provide simpler memory management
 * that's closer to JavaScript semantics, making conformance testing more reliable.
 */

import * as ts from 'typescript';
import { Validator } from 'goodscript/dist/validator';
import { OwnershipAnalyzer } from 'goodscript/dist/ownership-analyzer';
import { AstCodegen } from 'goodscript/dist/cpp/codegen';
import * as fs from 'fs/promises';
import * as path from 'path';

// Test262 harness prelude  
const TEST262_HARNESS = `
class Test262Error extends Error {
  constructor(msg: string) {
    super(msg);
  }
  
  toString(): string {
    const msg = this.message;
    return "Test262Error: " + msg;
  }
  
  static thrower(msg: string): never {
    throw new Test262Error(msg);
  }
}

const $DONOTEVALUATE = (): never => {
  throw new Error("Test262: This statement should not be evaluated.");
};
`;


export interface CompileOptions {
  strict?: boolean;
  generateCpp?: boolean;
  useGcMode?: boolean;  // Default true for conformance testing
}

export interface CompileResult {
  success: boolean;
  jsCode?: string;
  cppCode?: string;
  errors?: Array<{
    message: string;
    code: string;
    line?: number;
    column?: number;
  }>;
}

/**
 * Compile GoodScript code
 */
export async function compileGoodScript(
  code: string,
  options: CompileOptions = {}
): Promise<CompileResult> {
  try {
    // Prepend Test262 harness for compatibility
    const fullCode = TEST262_HARNESS + '\n' + code;
    
    // Create TypeScript program
    const sourceFile = ts.createSourceFile(
      'test.gs.ts',
      fullCode,
      ts.ScriptTarget.ES2020,
      true,
      ts.ScriptKind.TS
    );

    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ES2020,
      strict: options.strict ?? true,
      noEmit: false,  // We need to emit to get JavaScript output
    };

    const host = ts.createCompilerHost(compilerOptions);
    host.getSourceFile = (fileName) => {
      if (fileName === 'test.gs.ts') return sourceFile;
      return undefined;
    };

    const program = ts.createProgram(['test.gs.ts'], compilerOptions, host);
    const checker = program.getTypeChecker();

    // Phase 1: Validate "Good Parts"
    const validator = new Validator();
    const validationResult = validator.validate(sourceFile, checker);
    if (!validationResult.success) {
      return {
        success: false,
        errors: validationResult.diagnostics.map((e: any) => ({
          message: e.message,
          code: e.code || 'GS000',
          line: e.line,
          column: e.column
        }))
      };
    }

    // Phase 2: Ownership analysis
    const ownershipAnalyzer = new OwnershipAnalyzer();
    ownershipAnalyzer.analyze(sourceFile, checker);
    ownershipAnalyzer.finalizeAnalysis();
    const ownershipDiagnostics = ownershipAnalyzer.getDiagnostics();
    if (ownershipDiagnostics.length > 0) {
      return {
        success: false,
        errors: ownershipDiagnostics.map((e: any) => ({
          message: e.message,
          code: e.code || 'GS300',
          line: e.line,
          column: e.column
        }))
      };
    }

    // JavaScript code: transpile TypeScript to JavaScript
    let jsCode: string | undefined;
    const emitResult = program.emit(sourceFile, (fileName, data) => {
      if (fileName.endsWith('.js')) {
        jsCode = data;
      }
    }, undefined, false);
    
    if (!jsCode) {
      // Fallback: just strip type annotations manually (basic)
      jsCode = fullCode
        .replace(/:\s*[a-zA-Z_][a-zA-Z0-9_<>[\]|&\s,]*(?=[;=),\n])/g, '')
        .replace(/\bconst\s+(\w+)\s*=\s*\(\)\s*:\s*never\s*=>/g, 'const $1 = () =>')
        .replace(/static\s+(\w+)\([^)]*\)\s*:\s*never/g, 'static $1()');
    }

    // Phase 3: Generate C++ if requested
    let cppCode: string | undefined;
    if (options.generateCpp) {
      const codegen = new AstCodegen(checker);
      cppCode = codegen.generate(sourceFile);
    }

    return {
      success: true,
      jsCode,
      cppCode
    };

  } catch (error) {
    return {
      success: false,
      errors: [{
        message: error instanceof Error ? error.message : String(error),
        code: 'GS999'
      }]
    };
  }
}
