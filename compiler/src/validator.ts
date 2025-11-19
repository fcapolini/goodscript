/**
 * Validator
 * Enforces GoodScript language restrictions
 */

import * as ts from 'typescript';
import { Diagnostic, SourceLocation, ValidationResult } from './types';
import { Parser } from './parser';

export class Validator {
  private diagnostics: Diagnostic[] = [];

  /**
   * Validate a source file against GoodScript rules
   */
  validate(sourceFile: ts.SourceFile, checker: ts.TypeChecker): ValidationResult {
    this.diagnostics = [];
    this.visit(sourceFile, sourceFile, checker);

    return {
      success: this.diagnostics.filter(d => d.severity === 'error').length === 0,
      diagnostics: this.diagnostics,
    };
  }

  /**
   * Visit AST nodes recursively
   */
  private visit(node: ts.Node, sourceFile: ts.SourceFile, checker: ts.TypeChecker): void {
    // Check for prohibited features
    this.checkProhibitedFeatures(node, sourceFile);
    
    // Check for type coercion
    this.checkTypeCoercion(node, sourceFile, checker);

    // Check for var keyword
    this.checkVarKeyword(node, sourceFile);

    // Check for == operator (should use ===)
    this.checkStrictEquality(node, sourceFile);

    // Check for any type
    this.checkAnyType(node, sourceFile);

    // Check for truthy/falsy conditions
    this.checkTruthyFalsy(node, sourceFile);

    // Recurse into children
    ts.forEachChild(node, (child: ts.Node) => this.visit(child, sourceFile, checker));
  }

  /**
   * Check for prohibited language features
   */
  private checkProhibitedFeatures(node: ts.Node, sourceFile: ts.SourceFile): void {
    const location = Parser.getLocation(node, sourceFile);

    // No 'with' statement
    if (ts.isWithStatement(node)) {
      this.addError('The "with" statement is not allowed in GoodScript', location, 'GS101');
    }

    // No 'eval' or 'Function' constructor
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      if (node.expression.text === 'eval') {
        this.addError('The "eval" function is not allowed in GoodScript', location, 'GS102');
      }
      if (node.expression.text === 'Function') {
        this.addError('The "Function" constructor is not allowed in GoodScript', location, 'GS102');
      }
    }

    // No 'Function' constructor with 'new'
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
      if (node.expression.text === 'Function') {
        this.addError('The "Function" constructor is not allowed in GoodScript', location, 'GS102');
      }
    }

    // No 'arguments' object (in non-arrow functions)
    if (ts.isIdentifier(node) && node.text === 'arguments') {
      const func = this.findContainingFunction(node);
      if (func && !ts.isArrowFunction(func)) {
        this.addError(
          'The "arguments" object is not allowed. Use rest parameters instead',
          location,
          'GS103'
        );
      }
    }

    // No for-in loops
    if (ts.isForInStatement(node)) {
      this.addError(
        'for-in loops are not allowed. Use for-of or explicit iteration instead',
        location,
        'GS104'
      );
    }

    // No function declarations/expressions (lexical 'this' only - use arrow functions)
    if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) {
      // Allow if it's a class method, constructor, or function signature
      const parent = node.parent;
      const isMethod = ts.isMethodDeclaration(parent) || 
                      ts.isMethodSignature(parent) ||
                      ts.isConstructorDeclaration(parent);
      const isInterfaceMember = parent && parent.parent && ts.isInterfaceDeclaration(parent.parent);
      const isFunctionSignature = !node.body; // Function signature (no implementation)
      
      if (!isMethod && !isInterfaceMember && !isFunctionSignature) {
        this.addError(
          'Function declarations and expressions are not allowed. Use arrow functions for lexical "this" binding, or class methods',
          location,
          'GS108'
        );
      }
    }
  }

  /**
   * Check for implicit type coercion
   */
  private checkTypeCoercion(node: ts.Node, sourceFile: ts.SourceFile, checker: ts.TypeChecker): void {
    if (!ts.isBinaryExpression(node)) {
      return;
    }

    const location = Parser.getLocation(node, sourceFile);
    const leftType = checker.getTypeAtLocation(node.left);
    const rightType = checker.getTypeAtLocation(node.right);

    // Check for mixed types in + operator
    if (node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const leftIsString = this.isStringType(leftType);
      const rightIsString = this.isStringType(rightType);
      const leftIsNumber = this.isNumberType(leftType);
      const rightIsNumber = this.isNumberType(rightType);

      if ((leftIsString && rightIsNumber) || (leftIsNumber && rightIsString)) {
        this.addError(
          'Cannot mix string and number types. Use explicit conversion or template literals',
          location,
          'GS201'
        );
      }
    }
  }

  /**
   * Check for var keyword usage
   */
  private checkVarKeyword(node: ts.Node, sourceFile: ts.SourceFile): void {
    if (ts.isVariableDeclarationList(node)) {
      if ((node.flags & ts.NodeFlags.Let) === 0 && (node.flags & ts.NodeFlags.Const) === 0) {
        const location = Parser.getLocation(node, sourceFile);
        this.addError(
          'The "var" keyword is not allowed. Use "let" or "const" instead',
          location,
          'GS105'
        );
      }
    }
  }

  /**
   * Check for === operator (should use ==)
   */
  private checkStrictEquality(node: ts.Node, sourceFile: ts.SourceFile): void {
    if (ts.isBinaryExpression(node)) {
      const location = Parser.getLocation(node, sourceFile);
      
      if (node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken) {
        this.addError(
          'Use "===" instead of "==". GoodScript requires strict equality to match TypeScript semantics',
          location,
          'GS106'
        );
      }

      if (node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsToken) {
        this.addError(
          'Use "!==" instead of "!=". GoodScript requires strict inequality to match TypeScript semantics',
          location,
          'GS107'
        );
      }
    }
  }

  /**
   * Check for any type usage (GS109)
   */
  private checkAnyType(node: ts.Node, sourceFile: ts.SourceFile): void {
    // Check for 'any' keyword in various contexts
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      const location = Parser.getLocation(node, sourceFile);
      this.addError(
        'The "any" type is not allowed. Use explicit types or generics instead',
        location,
        'GS109'
      );
    }
  }

  /**
   * Check for implicit truthy/falsy conditions (GS110)
   */
  private checkTruthyFalsy(node: ts.Node, sourceFile: ts.SourceFile): void {
    // Check if statements
    if (ts.isIfStatement(node)) {
      this.checkConditionExpression(node.expression, sourceFile);
    }

    // Check while statements
    if (ts.isWhileStatement(node)) {
      this.checkConditionExpression(node.expression, sourceFile);
    }

    // Check do-while statements
    if (ts.isDoStatement(node)) {
      this.checkConditionExpression(node.expression, sourceFile);
    }

    // Check for loop conditions
    if (ts.isForStatement(node) && node.condition) {
      this.checkConditionExpression(node.condition, sourceFile);
    }

    // Check ternary operator conditions
    if (ts.isConditionalExpression(node)) {
      this.checkConditionExpression(node.condition, sourceFile);
    }
  }

  /**
   * Helper: Check if a condition expression is an implicit truthy/falsy check
   */
  private checkConditionExpression(expr: ts.Expression, sourceFile: ts.SourceFile): void {
    // Allow explicit boolean expressions
    if (this.isExplicitBooleanExpression(expr)) {
      return;
    }

    // Allow boolean literals (true/false)
    if (expr.kind === ts.SyntaxKind.TrueKeyword || expr.kind === ts.SyntaxKind.FalseKeyword) {
      return;
    }

    // Allow logical NOT of explicit boolean expression
    if (ts.isPrefixUnaryExpression(expr) && expr.operator === ts.SyntaxKind.ExclamationToken) {
      if (this.isExplicitBooleanExpression(expr.operand)) {
        return;
      }
    }

    // All other cases are implicit truthy/falsy checks
    const location = Parser.getLocation(expr, sourceFile);
    this.addError(
      'Implicit truthy/falsy check is not allowed. Use explicit comparison (e.g., "x !== null", "x > 0", "x.length > 0")',
      location,
      'GS110'
    );
  }

  /**
   * Helper: Check if expression is an explicit boolean expression
   */
  private isExplicitBooleanExpression(expr: ts.Expression): boolean {
    // Binary comparison operators
    if (ts.isBinaryExpression(expr)) {
      const op = expr.operatorToken.kind;
      return (
        op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
        op === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
        op === ts.SyntaxKind.LessThanToken ||
        op === ts.SyntaxKind.LessThanEqualsToken ||
        op === ts.SyntaxKind.GreaterThanToken ||
        op === ts.SyntaxKind.GreaterThanEqualsToken ||
        op === ts.SyntaxKind.AmpersandAmpersandToken ||
        op === ts.SyntaxKind.BarBarToken
      );
    }

    // Prefix unary ! with explicit boolean expression
    if (ts.isPrefixUnaryExpression(expr) && expr.operator === ts.SyntaxKind.ExclamationToken) {
      return this.isExplicitBooleanExpression(expr.operand);
    }

    // Function calls that return boolean (we assume they do)
    if (ts.isCallExpression(expr)) {
      return true; // Assume function calls return boolean if used in condition
    }

    // Parenthesized expressions
    if (ts.isParenthesizedExpression(expr)) {
      return this.isExplicitBooleanExpression(expr.expression);
    }

    return false;
  }

  /**
   * Helper: Find containing function
   */
  private findContainingFunction(node: ts.Node): ts.FunctionLikeDeclaration | undefined {
    let current = node.parent;
    while (current) {
      if (ts.isFunctionDeclaration(current) || 
          ts.isMethodDeclaration(current) || 
          ts.isArrowFunction(current)) {
        return current;
      }
      current = current.parent;
    }
    return undefined;
  }

  /**
   * Helper: Check if type is string
   */
  private isStringType(type: ts.Type): boolean {
    return (type.flags & ts.TypeFlags.String) !== 0 ||
           (type.flags & ts.TypeFlags.StringLiteral) !== 0;
  }

  /**
   * Helper: Check if type is number
   */
  private isNumberType(type: ts.Type): boolean {
    return (type.flags & ts.TypeFlags.Number) !== 0 ||
           (type.flags & ts.TypeFlags.NumberLiteral) !== 0;
  }

  /**
   * Add an error diagnostic
   */
  private addError(message: string, location: SourceLocation, code?: string): void {
    this.diagnostics.push({
      severity: 'error',
      message,
      location,
      code,
    });
  }

  /**
   * Get diagnostics
   */
  getDiagnostics(): Diagnostic[] {
    return this.diagnostics;
  }
}
