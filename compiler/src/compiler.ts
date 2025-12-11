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
import { ZigCompiler } from './backend/cpp/zig-compiler.js';
import type { CompileOptions, CompileResult } from './types.js';

export async function compile(options: CompileOptions): Promise<CompileResult> {
  const diagnostics: CompileResult['diagnostics'] = [];
  const startTime = Date.now();

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
          diagnostics.push(...validator.validate(sourceFile, checker));
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

    // Phase 3: Lower to IR
    const lowering = new IRLowering();
    let ir = lowering.lower(program);

    // Phase 4: Optimize
    if (options.optimize) {
      const optimizer = new Optimizer();
      ir = optimizer.optimize(ir, 1);
    }

    // Phase 5: Generate code
    let output: Map<string, string> | undefined;
    
    if (options.target === 'cpp') {
      const codegen = new CppCodegen();
      output = codegen.generate(ir, options.mode ?? 'gc', options.sourceMap ?? false);
      
      // Phase 6: Compile to binary (optional)
      if (options.compile) {
        const zigCompiler = new ZigCompiler(
          options.buildDir ?? 'build',
          'vendor' // TODO: make configurable
        );
        
        const compileResult = await zigCompiler.compile({
          sources: output,
          output: options.outputBinary ?? 'a.out',
          mode: options.mode ?? 'gc',
          target: options.targetTriple,
          optimize: options.optimize ? '3' : '0',
          debug: options.debug,
        });
        
        // Add compilation diagnostics
        for (const msg of compileResult.diagnostics) {
          diagnostics.push({
            code: 'BUILD',
            message: msg,
            severity: 'info',
          });
        }
        
        if (!compileResult.success) {
          return { 
            success: false, 
            diagnostics,
            buildTime: Date.now() - startTime,
          };
        }
        
        return {
          success: true,
          diagnostics,
          output,
          binaryPath: compileResult.outputPath,
          buildTime: Date.now() - startTime,
        };
      }
    } else {
      // For non-C++ targets, just validate and return empty output
      output = new Map();
    }

    // For non-native targets, just validate and return empty output
    // Users can use tsc directly on their -gs.ts/-gs.tsx files
    return {
      success: true,
      diagnostics,
      output: output ?? new Map(),
      buildTime: Date.now() - startTime,
    };
  } catch (error) {
    diagnostics.push({
      code: 'INTERNAL',
      message: error instanceof Error ? error.message : String(error),
      severity: 'error',
    });

    return { 
      success: false, 
      diagnostics,
      buildTime: Date.now() - startTime,
    };
  }
}
