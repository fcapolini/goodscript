/**
 * Main Compiler Entry Point
 */

import { Parser } from './frontend/parser.js';
import { Validator } from './frontend/validator.js';
import { OwnershipAnalyzer } from './frontend/ownership-analyzer.js';
import { NullChecker } from './frontend/null-checker.js';
import { IRLowering } from './frontend/lowering.js';
import { Optimizer } from './optimizer/optimizer.js';
import { CppCodegen } from './backend/cpp/codegen.js';
import { TypeScriptCodegen } from './backend/typescript.js';
import type { CompileOptions, CompileResult } from './types.js';

export function compile(options: CompileOptions): CompileResult {
  const diagnostics: CompileResult['diagnostics'] = [];

  try {
    // Phase 0: Parse
    const parser = new Parser();
    // TODO: Read files from disk
    const files = new Map<string, string>();
    const program = parser.createProgram(files);
    const checker = program.getTypeChecker();

    // Phase 1: Validate "Good Parts"
    if (!options.skipValidation) {
      const validator = new Validator();
      for (const sourceFile of program.getSourceFiles()) {
        if (!sourceFile.isDeclarationFile) {
          diagnostics.push(...validator.validate(sourceFile));
        }
      }
    }

    if (diagnostics.some(d => d.severity === 'error')) {
      return { success: false, diagnostics };
    }

    // Phase 2: Ownership Analysis (DAG + Null Safety)
    if (!options.skipValidation) {
      const ownershipAnalyzer = new OwnershipAnalyzer();
      const nullChecker = new NullChecker();

      // Analyze all source files
      for (const sourceFile of program.getSourceFiles()) {
        if (!sourceFile.isDeclarationFile) {
          ownershipAnalyzer.analyze(sourceFile, checker);
        }
      }

      // Finalize ownership analysis (detect cycles)
      diagnostics.push(...ownershipAnalyzer.finalize());

      // Run null checker
      for (const sourceFile of program.getSourceFiles()) {
        if (!sourceFile.isDeclarationFile) {
          diagnostics.push(...nullChecker.analyze(sourceFile, checker));
        }
      }
    }

    if (diagnostics.some(d => d.severity === 'error')) {
      return { success: false, diagnostics };
    }

    // Phase 2: Lower to IR
    const lowering = new IRLowering();
    let ir = lowering.lower(program);

    // Phase 3: Optimize
    if (options.optimize) {
      const optimizer = new Optimizer();
      ir = optimizer.optimize(ir, 1);
    }

    // Phase 4: Generate code
    let output: Map<string, string>;
    
    if (options.target === 'native') {
      const codegen = new CppCodegen();
      output = codegen.generate(ir, options.mode ?? 'gc');
    } else {
      const codegen = new TypeScriptCodegen();
      output = codegen.generate(ir);
    }

    return {
      success: true,
      diagnostics,
      output,
    };
  } catch (error) {
    diagnostics.push({
      code: 'INTERNAL',
      message: error instanceof Error ? error.message : String(error),
      severity: 'error',
    });

    return { success: false, diagnostics };
  }
}
