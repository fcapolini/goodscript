/**
 * GoodScript compiler wrapper for conformance testing
 */

import * as ts from 'typescript';
import { validate } from 'goodscript/dist/validator';
import { analyzeOwnership } from 'goodscript/dist/ownership-analyzer';
import { CppCodegen } from 'goodscript/dist/cpp/codegen';

export interface CompileOptions {
  strict?: boolean;
  generateCpp?: boolean;
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
    // Create TypeScript program
    const sourceFile = ts.createSourceFile(
      'test.gs.ts',
      code,
      ts.ScriptTarget.ES2020,
      true,
      ts.ScriptKind.TS
    );

    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ES2020,
      strict: options.strict ?? true,
      noEmit: true,
    };

    const host = ts.createCompilerHost(compilerOptions);
    host.getSourceFile = (fileName) => {
      if (fileName === 'test.gs.ts') return sourceFile;
      return undefined;
    };

    const program = ts.createProgram(['test.gs.ts'], compilerOptions, host);
    const checker = program.getTypeChecker();

    // Phase 1: Validate "Good Parts"
    const validationErrors = validate(sourceFile, program);
    if (validationErrors.length > 0) {
      return {
        success: false,
        errors: validationErrors.map(e => ({
          message: e.message,
          code: e.code || 'GS000',
          line: e.line,
          column: e.column
        }))
      };
    }

    // Phase 2: Ownership analysis
    const ownershipErrors = analyzeOwnership(sourceFile, checker);
    if (ownershipErrors.length > 0) {
      return {
        success: false,
        errors: ownershipErrors.map(e => ({
          message: e.message,
          code: e.code || 'GS300',
          line: e.line,
          column: e.column
        }))
      };
    }

    // JavaScript code is just the input (GoodScript is TypeScript-compatible)
    const jsCode = code;

    // Phase 3: Generate C++ if requested
    let cppCode: string | undefined;
    if (options.generateCpp) {
      const codegen = new CppCodegen(program, checker);
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
