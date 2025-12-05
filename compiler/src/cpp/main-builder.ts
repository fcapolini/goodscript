/**
 * Main Function Builder
 * 
 * Handles generation of C++ main() function with special handling for async.
 */

import * as ts from 'typescript';
import * as ast from './ast';
import { cpp } from './builder';

export class MainFunctionBuilder {
  /**
   * Build C++ main function from top-level statements
   */
  buildMainFunction(
    mainStatements: ast.Statement[],
    hasAsyncMain: boolean
  ): ast.Function {
    // If no statements but async main exists, create wrapper
    if (mainStatements.length === 0 && hasAsyncMain) {
      return new ast.Function(
        'main',
        new ast.CppType('int'),
        [],
        new ast.Block([
          new ast.ExpressionStmt(
            cpp.call(
              cpp.id('cppcoro::sync_wait'),
              [cpp.call(cpp.id('gs::main'), [])]
            )
          ),
          new ast.ReturnStmt(cpp.id('0'))
        ])
      );
    }

    // If no statements at all, create empty main
    if (mainStatements.length === 0) {
      return new ast.Function(
        'main',
        new ast.CppType('int'),
        [],
        new ast.Block([new ast.ReturnStmt(cpp.id('0'))])
      );
    }

    // Check if we should wrap async main() in cppcoro::sync_wait
    if (hasAsyncMain && this.shouldWrapInSyncWait(mainStatements)) {
      return this.buildAsyncMainWrapper(mainStatements);
    }

    // Regular main function
    return this.buildSyncMain(mainStatements);
  }

  /**
   * Build async main wrapper with cppcoro::sync_wait
   */
  private buildAsyncMainWrapper(mainStatements: ast.Statement[]): ast.Function {
    const stmt = mainStatements[0];
    
    if (stmt instanceof ast.ExpressionStmt) {
      const expr = stmt.expression;
      
      if (expr instanceof ast.CallExpr) {
        const callee = expr.callee;
        
        if (callee instanceof ast.Identifier && 
            (callee.name === 'main' || callee.name === 'gs::main')) {
          // Replace main() with cppcoro::sync_wait(gs::main())
          return new ast.Function(
            'main',
            new ast.CppType('int'),
            [],
            new ast.Block([
              new ast.ExpressionStmt(
                cpp.call(
                  cpp.id('cppcoro::sync_wait'),
                  [cpp.call(cpp.id('gs::main'), [])]
                )
              ),
              new ast.ReturnStmt(cpp.id('0'))
            ])
          );
        }
      }
    }
    
    // Fallback: regular main
    return this.buildSyncMain(mainStatements);
  }

  /**
   * Build regular synchronous main function
   */
  private buildSyncMain(mainStatements: ast.Statement[]): ast.Function {
    return new ast.Function(
      'main',
      new ast.CppType('int'),
      [],
      new ast.Block([
        ...mainStatements,
        new ast.ReturnStmt(cpp.id('0'))
      ])
    );
  }

  /**
   * Check if statements should be wrapped in sync_wait
   */
  private shouldWrapInSyncWait(mainStatements: ast.Statement[]): boolean {
    if (mainStatements.length !== 1) {
      return false;
    }

    const stmt = mainStatements[0];
    if (!(stmt instanceof ast.ExpressionStmt)) {
      return false;
    }

    const expr = stmt.expression;
    if (!(expr instanceof ast.CallExpr)) {
      return false;
    }

    const callee = expr.callee;
    return callee instanceof ast.Identifier && 
           (callee.name === 'main' || callee.name === 'gs::main');
  }
}
