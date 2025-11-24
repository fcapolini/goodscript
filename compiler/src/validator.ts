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
    this.checkTruthyFalsy(node, sourceFile, checker);

    // Check for switch fall-through
    this.checkSwitchFallThrough(node, sourceFile);

    // Check ternary expression type consistency
    this.checkTernaryTypes(node, sourceFile, checker);

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

    // No String, Number, or Boolean constructors (GS116)
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text;
      if (name === 'String' || name === 'Number' || name === 'Boolean') {
        this.addError(
          `The "${name}" constructor is not allowed. Use template literals, .toString(), or explicit conversion methods instead`,
          location,
          'GS116'
        );
      }
    }

    // No String, Number, or Boolean constructors with 'new'
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text;
      if (name === 'String' || name === 'Number' || name === 'Boolean') {
        this.addError(
          `The "${name}" constructor with "new" is not allowed. Use primitive types instead`,
          location,
          'GS116'
        );
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

    // No delete operator (GS111)
    if (ts.isDeleteExpression(node)) {
      this.addError(
        'The "delete" operator is not allowed. Use optional properties or create new objects without the property',
        location,
        'GS111'
      );
    }

    // No comma operator (GS112) - but allow comma in array literals, parameters, etc.
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.CommaToken) {
      this.addError(
        'The comma operator is not allowed. Use separate statements instead',
        location,
        'GS112'
      );
    }

    // No void operator (GS115)
    if (ts.isVoidExpression(node)) {
      this.addError(
        'The "void" operator is not allowed. Use "undefined" directly if needed',
        location,
        'GS115'
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
  private checkTruthyFalsy(node: ts.Node, sourceFile: ts.SourceFile, checker: ts.TypeChecker): void {
    // Check if statements
    if (ts.isIfStatement(node)) {
      this.checkConditionExpression(node.expression, sourceFile, checker);
    }

    // Check while statements
    if (ts.isWhileStatement(node)) {
      this.checkConditionExpression(node.expression, sourceFile, checker);
    }

    // Check do-while statements
    if (ts.isDoStatement(node)) {
      this.checkConditionExpression(node.expression, sourceFile, checker);
    }

    // Check for loop conditions
    if (ts.isForStatement(node) && node.condition) {
      this.checkConditionExpression(node.condition, sourceFile, checker);
    }

    // Check ternary operator conditions
    if (ts.isConditionalExpression(node)) {
      this.checkConditionExpression(node.condition, sourceFile, checker);
    }
  }

  /**
   * Helper: Check if a condition expression is an implicit truthy/falsy check
   */
  private checkConditionExpression(expr: ts.Expression, sourceFile: ts.SourceFile, checker: ts.TypeChecker): void {
    // Allow explicit boolean expressions
    if (this.isExplicitBooleanExpression(expr, checker)) {
      return;
    }

    // Allow boolean literals (true/false)
    if (expr.kind === ts.SyntaxKind.TrueKeyword || expr.kind === ts.SyntaxKind.FalseKeyword) {
      return;
    }

    // Allow logical NOT of explicit boolean expression
    if (ts.isPrefixUnaryExpression(expr) && expr.operator === ts.SyntaxKind.ExclamationToken) {
      if (this.isExplicitBooleanExpression(expr.operand, checker)) {
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
  private isExplicitBooleanExpression(expr: ts.Expression, checker: ts.TypeChecker): boolean {
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
      return this.isExplicitBooleanExpression(expr.operand, checker);
    }

    // Function calls - check actual return type
    if (ts.isCallExpression(expr)) {
      const type = checker.getTypeAtLocation(expr);
      // Only allow if the function actually returns boolean
      return (type.flags & ts.TypeFlags.Boolean) !== 0 || (type.flags & ts.TypeFlags.BooleanLiteral) !== 0;
    }

    // Parenthesized expressions
    if (ts.isParenthesizedExpression(expr)) {
      return this.isExplicitBooleanExpression(expr.expression, checker);
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
   * Check for switch statement fall-through (GS113)
   */
  private checkSwitchFallThrough(node: ts.Node, sourceFile: ts.SourceFile): void {
    if (!ts.isSwitchStatement(node)) {
      return;
    }

    const clauses = node.caseBlock.clauses;
    
    for (let i = 0; i < clauses.length; i++) {
      const clause = clauses[i];
      
      // Skip empty cases (intentional fall-through to next case is allowed for empty cases)
      if (clause.statements.length === 0) {
        continue;
      }

      // Skip the last clause (doesn't need a break)
      if (i === clauses.length - 1) {
        continue;
      }

      // Check if the clause ends with a control flow statement
      const lastStatement = clause.statements[clause.statements.length - 1];
      const endsWithControlFlow = 
        ts.isBreakStatement(lastStatement) ||
        ts.isReturnStatement(lastStatement) ||
        ts.isThrowStatement(lastStatement) ||
        ts.isContinueStatement(lastStatement);

      if (!endsWithControlFlow) {
        const location = Parser.getLocation(clause, sourceFile);
        const clauseType = ts.isCaseClause(clause) ? 'case' : 'default';
        this.addError(
          `Switch ${clauseType} must end with break, return, throw, or continue to prevent fall-through. Fall-through is error-prone and not allowed in GoodScript`,
          location,
          'GS113'
        );
      }
    }
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
   * Check ternary expression type consistency
   * Both branches must have the same base type (no mixing strings and numbers)
   */
  private checkTernaryTypes(node: ts.Node, sourceFile: ts.SourceFile, checker: ts.TypeChecker): void {
    if (!ts.isConditionalExpression(node)) {
      return;
    }

    const location = Parser.getLocation(node, sourceFile);
    
    const trueType = checker.getTypeAtLocation(node.whenTrue);
    const falseType = checker.getTypeAtLocation(node.whenFalse);

    // Get base type names, stripping null/undefined from unions
    const getTrueName = this.getBaseTypeName(trueType, checker);
    const getFalseName = this.getBaseTypeName(falseType, checker);

    // If types are incompatible (different base types), reject
    if (getTrueName !== getFalseName) {
      this.addError(
        `Ternary expression branches must have compatible types. Got '${getTrueName}' and '${getFalseName}'. ` +
        `Use explicit type conversion or refactor to avoid mixed types.`,
        location,
        'GS107'
      );
    }
  }

  /**
   * Get the base type name, excluding null/undefined from unions
   */
  private getBaseTypeName(type: ts.Type, checker: ts.TypeChecker): string {
    // For union types, get the non-null/undefined member
    if (type.isUnion()) {
      const nonNullTypes = type.types.filter(t => 
        !(t.flags & ts.TypeFlags.Null) && 
        !(t.flags & ts.TypeFlags.Undefined) &&
        !(t.flags & ts.TypeFlags.Void)
      );
      
      if (nonNullTypes.length === 1) {
        type = nonNullTypes[0];
      } else if (nonNullTypes.length > 1) {
        // Multiple non-null types - return union representation
        return nonNullTypes.map(t => checker.typeToString(t)).join(' | ');
      }
    }

    // Handle string literals as 'string' type
    if (type.flags & ts.TypeFlags.StringLiteral) {
      return 'string';
    }

    // Handle number literals as 'number' type
    if (type.flags & ts.TypeFlags.NumberLiteral) {
      return 'number';
    }

    return checker.typeToString(type);
  }

  /**
   * Get diagnostics
   */
  getDiagnostics(): Diagnostic[] {
    return this.diagnostics;
  }
}
