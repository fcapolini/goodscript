/**
 * Lowering: TypeScript AST → IR
 * 
 * Converts TypeScript AST to our IR representation
 */

import ts from 'typescript';
import type { IRModule, IRProgram } from '../ir/types.js';

export class IRLowering {
  lower(program: ts.Program): IRProgram {
    const modules = new Map<string, IRModule>();

    for (const sourceFile of program.getSourceFiles()) {
      if (!sourceFile.isDeclarationFile) {
        modules.set(sourceFile.fileName, this.lowerModule(sourceFile, program));
      }
    }

    return { modules };
  }

  private lowerModule(sourceFile: ts.SourceFile, program: ts.Program): IRModule {
    // TODO: Implement full lowering
    return {
      path: sourceFile.fileName,
      declarations: [],
      imports: [],
      exports: [],
    };
  }
}
