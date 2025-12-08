/**
 * Null Checker
 * 
 * Phase 2b: Null Safety Analysis
 * 
 * Validates that use<T> (weak/borrowed references) are properly
 * null-checked before use.
 * 
 * Rules:
 * - use<T> is implicitly nullable (T | null | undefined)
 * - Must be checked before property access or method calls
 * - Validates control flow to track null state
 */

import ts from 'typescript';
import type { Diagnostic, SourceLocation } from '../types.js';

export class NullChecker {
  private diagnostics: Diagnostic[] = [];

  /**
   * Analyze a source file for null safety
   */
  analyze(sourceFile: ts.SourceFile, checker: ts.TypeChecker): Diagnostic[] {
    this.diagnostics = [];
    this.visitNode(sourceFile, sourceFile, checker, new Set());
    return this.diagnostics;
  }

  /**
   * Visit a node and check for null safety violations
   */
  private visitNode(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker,
    checkedVars: Set<string>
  ): void {
    // Check property access on potentially null values
    if (ts.isPropertyAccessExpression(node)) {
      this.checkPropertyAccess(node, sourceFile, checker, checkedVars);
    }

    // Check call expressions on potentially null values
    if (ts.isCallExpression(node)) {
      this.checkCallExpression(node, sourceFile, checker, checkedVars);
    }

    // Track null checks in if statements
    if (ts.isIfStatement(node)) {
      this.handleIfStatement(node, sourceFile, checker, checkedVars);
      return; // Don't visit children normally
    }

    // Visit children
    ts.forEachChild(node, child => this.visitNode(child, sourceFile, checker, checkedVars));
  }

  /**
   * Check if property access is safe
   */
  private checkPropertyAccess(
    node: ts.PropertyAccessExpression,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker,
    checkedVars: Set<string>
  ): void {
    const expr = node.expression;
    
    if (ts.isIdentifier(expr)) {
      const varName = expr.text;
      
      // Check if this is a use<T> type
      if (this.isUseType(expr, checker) && !checkedVars.has(varName)) {
        this.diagnostics.push({
          code: 'GS302',
          severity: 'error',
          message: `Property access on '${varName}' which may be null. Add null check: if (${varName}) { ... }`,
          location: this.getLocation(node, sourceFile),
        });
      }
    }
  }

  /**
   * Check if call expression is safe
   */
  private checkCallExpression(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker,
    checkedVars: Set<string>
  ): void {
    if (ts.isPropertyAccessExpression(node.expression)) {
      const expr = node.expression.expression;
      
      if (ts.isIdentifier(expr)) {
        const varName = expr.text;
        
        if (this.isUseType(expr, checker) && !checkedVars.has(varName)) {
          this.diagnostics.push({
            code: 'GS302',
            severity: 'error',
            message: `Method call on '${varName}' which may be null. Add null check: if (${varName}) { ... }`,
            location: this.getLocation(node, sourceFile),
          });
        }
      }
    }
  }

  /**
   * Handle if statement null checks
   */
  private handleIfStatement(
    node: ts.IfStatement,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker,
    checkedVars: Set<string>
  ): void {
    // Extract checked variables from condition
    const newCheckedVars = this.extractNullChecks(node.expression);
    
    // Visit then branch with updated checked vars
    const thenChecked = new Set([...checkedVars, ...newCheckedVars]);
    this.visitNode(node.thenStatement, sourceFile, checker, thenChecked);
    
    // Visit else branch with original checked vars
    if (node.elseStatement) {
      this.visitNode(node.elseStatement, sourceFile, checker, checkedVars);
    }

    // Don't propagate checks beyond the if statement
  }

  /**
   * Extract variables that are null-checked in an expression
   */
  private extractNullChecks(expr: ts.Expression): string[] {
    const checked: string[] = [];

    // Simple identifier: if (x) { ... }
    if (ts.isIdentifier(expr)) {
      checked.push(expr.text);
    }

    // Binary expression: if (x !== null) { ... }
    if (ts.isBinaryExpression(expr)) {
      if (expr.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
          expr.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsToken) {
        if (ts.isIdentifier(expr.left) && 
            (expr.right.kind === ts.SyntaxKind.NullKeyword || 
             expr.right.kind === ts.SyntaxKind.UndefinedKeyword)) {
          checked.push(expr.left.text);
        }
      }
    }

    // Prefix unary: if (!x) is NOT a null check, it's a falsy check
    // We're looking for truthiness checks

    return checked;
  }

  /**
   * Check if a type is use<T>
   */
  private isUseType(_node: ts.Node, _checker: ts.TypeChecker): boolean {
    // TODO: Implement proper type checking
    // For now, use simple heuristic based on declaration
    return false;
  }

  /**
   * Get source location from node
   */
  private getLocation(node: ts.Node, sourceFile: ts.SourceFile): SourceLocation {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    return {
      fileName: sourceFile.fileName,
      line: line + 1,
      column: character + 1,
    };
  }
}
