/**
 * Statement Handler
 * 
 * Handles translation of TypeScript statements to C++ AST nodes.
 */

import * as ts from 'typescript';
import * as ast from './ast';
import { cpp } from './builder';
import * as cppUtils from './cpp-utils';
import * as tsUtils from './ts-utils';
import { TransformContext } from './transform-context';

export class StatementHandler {
  constructor(
    private ctx: TransformContext,
    private visitExpression: (node: ts.Expression) => ast.Expression,
    private visitIfStatement: (node: ts.IfStatement) => ast.IfStmt,
    private visitForStatement: (node: ts.ForStatement) => ast.ForStmt,
    private visitWhileStatement: (node: ts.WhileStatement) => ast.WhileStmt,
    private visitForOfStatement: (node: ts.ForOfStatement) => ast.RangeForStmt,
    private visitVariableStatement: (node: ts.VariableStatement) => ast.Declaration[],
    private visitThrowStatement: (node: ts.ThrowStatement) => ast.ThrowStmt,
    private visitTryStatement: (node: ts.TryStatement) => ast.TryCatch
  ) {}

  /**
   * Handle translation of a TypeScript statement to C++ AST
   */
  handleStatement(node: ts.Statement): ast.Statement | undefined {
    if (ts.isReturnStatement(node)) {
      return this.handleReturnStatement(node);
    }
    
    if (ts.isExpressionStatement(node)) {
      return new ast.ExpressionStmt(this.visitExpression(node.expression));
    }
    
    if (ts.isIfStatement(node)) {
      return this.visitIfStatement(node);
    }
    
    if (ts.isForStatement(node)) {
      return this.visitForStatement(node);
    }
    
    if (ts.isWhileStatement(node)) {
      return this.visitWhileStatement(node);
    }
    
    if (ts.isForOfStatement(node)) {
      return this.visitForOfStatement(node);
    }
    
    if (ts.isVariableStatement(node)) {
      // Variable declarations as statements
      const decls = this.visitVariableStatement(node);
      // For now, just return the first one as a statement
      // TODO: Handle multiple declarations properly
      if (decls.length > 0) {
        return decls[0] as any; // VariableDecl is a Declaration but can act as Statement
      }
    }
    
    if (ts.isThrowStatement(node)) {
      return this.visitThrowStatement(node);
    }
    
    if (ts.isTryStatement(node)) {
      return this.visitTryStatement(node);
    }
    
    if (ts.isBreakStatement(node)) {
      return new ast.BreakStmt();
    }
    
    if (ts.isContinueStatement(node)) {
      return new ast.ContinueStmt();
    }
    
    if (ts.isEmptyStatement(node)) {
      // Empty statement (;) - emit nothing, just return empty block
      return new ast.Block([]);
    }
    
    // Unsupported statement types
    return undefined;
  }

  /**
   * Handle return statements with special cases for:
   * - new expressions with unique_ptr return type
   * - pointer-to-optional conversions
   * - async function co_return
   */
  private handleReturnStatement(node: ts.ReturnStatement): ast.Statement {
    // Check if returning a new expression with own<T> return type BEFORE visiting
    if (node.expression && ts.isNewExpression(node.expression) &&
        this.ctx.currentFunctionReturnType?.toString().startsWith('std::unique_ptr<')) {
      // Extract the type from std::unique_ptr<T>
      const returnTypeStr = this.ctx.currentFunctionReturnType.toString();
      const match = returnTypeStr.match(/std::unique_ptr<(.+)>/);
      if (match) {
        const innerType = match[1];
        // Visit arguments
        const args = node.expression.arguments 
          ? Array.from(node.expression.arguments).map(arg => this.visitExpression(arg))
          : [];
        // Create make_unique call
        const expr = cpp.call(cpp.id(`std::make_unique<${innerType}>`), args);
        // Use co_return for async functions
        return this.ctx.currentFunctionIsAsync ? cpp.coReturn(expr) : new ast.ReturnStmt(expr);
      }
    }
    
    let expr = node.expression ? this.visitExpression(node.expression) : undefined;
    
    // If returning a ternary with pointer branches and function returns optional, convert
    if (expr instanceof ast.ConditionalExpr && 
        this.ctx.currentFunctionReturnType?.toString().startsWith('std::optional') &&
        node.expression && ts.isConditionalExpression(node.expression)) {
      // Check if this is a pattern like: result !== undefined ? result : null
      // where result is from Map.get() (pointer)
      const isPointerTernary = tsUtils.isMapGetCall(node.expression.whenTrue) ||
                               (ts.isIdentifier(node.expression.whenTrue) && 
                                this.ctx.pointerVariables.has(cppUtils.escapeName(node.expression.whenTrue.text)));
      
      if (isPointerTernary) {
        // Extract the inner type from std::optional<T>
        const optType = this.ctx.currentFunctionReturnType.toString();
        const match = optType.match(/std::optional<(.+)>/);
        if (match) {
          const innerType = match[1];
          // Convert: (result != nullptr ? result : nullptr) 
          // To:      (result != nullptr ? std::make_optional(*result) : std::nullopt)
          const condition = expr.condition;
          const whenTrue = cpp.call(cpp.id('std::make_optional'), [cpp.unary('*', expr.whenTrue)]);
          const whenFalse = cpp.id('std::nullopt');
          expr = cpp.ternary(condition, whenTrue, whenFalse);
        }
      }
    }
    
    // If returning a pointer variable, dereference it
    if (expr instanceof ast.Identifier && ts.isIdentifier(node.expression!) && 
        this.ctx.pointerVariables.has(cppUtils.escapeName(node.expression.text))) {
      expr = cpp.unary('*', expr);
    }
    
    // If returning null and function returns optional, use std::nullopt
    if (expr instanceof ast.Identifier && expr.name === 'nullptr' && 
        this.ctx.currentFunctionReturnType?.toString().startsWith('std::optional')) {
      expr = cpp.id('std::nullopt');
    }
    
    // Use co_return for async functions, return for sync functions
    return this.ctx.currentFunctionIsAsync ? cpp.coReturn(expr) : new ast.ReturnStmt(expr);
  }
}
