/**
 * Validator
 * 
 * Phase 1: TypeScript "Good Parts" validation
 * 
 * Enforces a statically analyzable subset of TypeScript by removing:
 * - Dynamic features (eval, with, arguments)
 * - Implicit coercion (==, !=, type mixing)
 * - var declarations
 * - for-in loops
 * - Prototypal manipulation
 * - Standalone this usage
 * - Truthy/falsy checks
 * - Delete operator
 * - Any type
 * - And more...
 * 
 * See: https://github.com/fcapolini/goodscript/blob/main/docs/GOOD-PARTS.md
 */

import ts from 'typescript';
import type { Diagnostic } from '../types.js';

export class Validator {
  private diagnostics: Diagnostic[] = [];
  private sourceFile!: ts.SourceFile;

  validate(sourceFile: ts.SourceFile): Diagnostic[] {
    this.diagnostics = [];
    this.sourceFile = sourceFile;
    
    this.visitNode(sourceFile);
    
    return this.diagnostics;
  }

  private visitNode(node: ts.Node): void {
    // Check for forbidden constructs
    this.checkWithStatement(node);
    this.checkEvalAndFunction(node);
    this.checkArguments(node);
    this.checkForInLoop(node);
    this.checkVarKeyword(node);
    this.checkEqualityOperators(node);
    this.checkThisUsage(node);
    this.checkAnyType(node);
    this.checkTruthyFalsy(node);
    this.checkDeleteOperator(node);
    this.checkCommaOperator(node);
    this.checkSwitchFallthrough(node);
    this.checkVoidOperator(node);
    this.checkPrimitiveConstructors(node);
    this.checkPrototypeAccess(node);
    this.checkDynamicImport(node);

    // Recursively visit children
    ts.forEachChild(node, child => this.visitNode(child));
  }

  /**
   * GS101: No with statement
   */
  private checkWithStatement(node: ts.Node): void {
    if (ts.isWithStatement(node)) {
      this.addError(
        node,
        'GS101',
        '"with" statement is forbidden - use explicit property access'
      );
    }
  }

  /**
   * GS102: No eval or Function constructor
   */
  private checkEvalAndFunction(node: ts.Node): void {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      if (node.expression.text === 'eval') {
        this.addError(
          node,
          'GS102',
          'eval() is forbidden - use functions, objects, or proper parsing'
        );
      }
    }

    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
      if (node.expression.text === 'Function') {
        this.addError(
          node,
          'GS102',
          'Function constructor is forbidden - use functions, objects, or proper parsing'
        );
      }
    }
  }

  /**
   * GS103: No arguments object
   */
  private checkArguments(node: ts.Node): void {
    if (ts.isIdentifier(node) && node.text === 'arguments') {
      this.addError(
        node,
        'GS103',
        '"arguments" object is forbidden - use rest parameters (...args)'
      );
    }
  }

  /**
   * GS104: No for-in loops
   */
  private checkForInLoop(node: ts.Node): void {
    if (ts.isForInStatement(node)) {
      this.addError(
        node,
        'GS104',
        'for-in loops are forbidden - use for-of, Object.keys(), or Object.entries()'
      );
    }
  }

  /**
   * GS105: No var keyword
   */
  private checkVarKeyword(node: ts.Node): void {
    if (ts.isVariableDeclarationList(node)) {
      if ((node.flags & ts.NodeFlags.Let) === 0 && 
          (node.flags & ts.NodeFlags.Const) === 0) {
        this.addError(
          node,
          'GS105',
          'Use "const" or "let" instead of "var"'
        );
      }
    }
  }

  /**
   * GS106/GS107: Strict equality only
   */
  private checkEqualityOperators(node: ts.Node): void {
    if (ts.isBinaryExpression(node)) {
      const op = node.operatorToken.kind;
      
      if (op === ts.SyntaxKind.EqualsEqualsToken) {
        this.addError(
          node.operatorToken,
          'GS106',
          'Use "===" instead of "=="'
        );
      }
      
      if (op === ts.SyntaxKind.ExclamationEqualsToken) {
        this.addError(
          node.operatorToken,
          'GS107',
          'Use "!==" instead of "!="'
        );
      }
    }
  }

  /**
   * GS108: No 'this' in function declarations/expressions
   */
  private checkThisUsage(node: ts.Node): void {
    if (node.kind === ts.SyntaxKind.ThisKeyword) {
      let parent = node.parent;
      let inMethod = false;
      let inFunction = false;

      while (parent) {
        // Check if we're in a function declaration or expression
        if (ts.isFunctionDeclaration(parent) || ts.isFunctionExpression(parent)) {
          inFunction = true;
          break;
        }

        // Arrow functions have lexical 'this', so they're OK
        if (ts.isArrowFunction(parent)) {
          return;
        }

        // Class methods are OK
        if (ts.isMethodDeclaration(parent) || 
            ts.isConstructorDeclaration(parent) ||
            ts.isGetAccessorDeclaration(parent) ||
            ts.isSetAccessorDeclaration(parent)) {
          inMethod = true;
          break;
        }

        parent = parent.parent;
      }

      if (inFunction && !inMethod) {
        this.addError(
          node,
          'GS108',
          '"this" cannot be used in function declarations/expressions - use arrow functions for lexical "this", or class methods'
        );
      }
    }
  }

  /**
   * GS109: No any type
   */
  private checkAnyType(node: ts.Node): void {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      this.addError(
        node,
        'GS109',
        '"any" type is forbidden - use explicit types, generics, or unknown'
      );
    }
  }

  /**
   * GS110: No implicit truthy/falsy checks
   */
  private checkTruthyFalsy(node: ts.Node): void {
    // Check if conditions
    if (ts.isIfStatement(node) && !this.isExplicitBoolean(node.expression)) {
      this.addError(
        node.expression,
        'GS110',
        'Use explicit comparisons instead of truthy/falsy checks'
      );
    }

    // Check while conditions
    if (ts.isWhileStatement(node) && !this.isExplicitBoolean(node.expression)) {
      this.addError(
        node.expression,
        'GS110',
        'Use explicit comparisons instead of truthy/falsy checks'
      );
    }

    // Check for loops with conditions
    if (ts.isForStatement(node) && node.condition && !this.isExplicitBoolean(node.condition)) {
      this.addError(
        node.condition,
        'GS110',
        'Use explicit comparisons instead of truthy/falsy checks'
      );
    }

    // Check do-while conditions
    if (ts.isDoStatement(node) && !this.isExplicitBoolean(node.expression)) {
      this.addError(
        node.expression,
        'GS110',
        'Use explicit comparisons instead of truthy/falsy checks'
      );
    }

    // Check logical NOT (!) - only allow on explicit booleans
    if (ts.isPrefixUnaryExpression(node) && 
        node.operator === ts.SyntaxKind.ExclamationToken &&
        !this.isExplicitBoolean(node.operand)) {
      this.addError(
        node,
        'GS110',
        'Use explicit comparisons instead of truthy/falsy checks'
      );
    }
  }

  private isExplicitBoolean(expr: ts.Expression): boolean {
    // Literal true/false
    if (expr.kind === ts.SyntaxKind.TrueKeyword || expr.kind === ts.SyntaxKind.FalseKeyword) {
      return true;
    }

    // Comparison operators
    if (ts.isBinaryExpression(expr)) {
      const op = expr.operatorToken.kind;
      return op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
             op === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
             op === ts.SyntaxKind.LessThanToken ||
             op === ts.SyntaxKind.LessThanEqualsToken ||
             op === ts.SyntaxKind.GreaterThanToken ||
             op === ts.SyntaxKind.GreaterThanEqualsToken ||
             op === ts.SyntaxKind.AmpersandAmpersandToken ||
             op === ts.SyntaxKind.BarBarToken;
    }

    // Negation of explicit boolean
    if (ts.isPrefixUnaryExpression(expr) && expr.operator === ts.SyntaxKind.ExclamationToken) {
      return this.isExplicitBoolean(expr.operand);
    }

    // Parenthesized expression
    if (ts.isParenthesizedExpression(expr)) {
      return this.isExplicitBoolean(expr.expression);
    }

    return false;
  }

  /**
   * GS111: No delete operator
   */
  private checkDeleteOperator(node: ts.Node): void {
    if (ts.isDeleteExpression(node)) {
      this.addError(
        node,
        'GS111',
        '"delete" operator is forbidden - use optional properties or destructuring'
      );
    }
  }

  /**
   * GS112: No comma operator
   */
  private checkCommaOperator(node: ts.Node): void {
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.CommaToken) {
      this.addError(
        node,
        'GS112',
        'Comma operator is forbidden - use separate statements'
      );
    }
  }

  /**
   * GS113: No switch fall-through
   */
  private checkSwitchFallthrough(node: ts.Node): void {
    if (ts.isCaseClause(node)) {
      // Allow empty cases (intentional grouping)
      if (node.statements.length === 0) {
        return;
      }

      // Check if last statement is a terminator
      const lastStmt = node.statements[node.statements.length - 1];
      if (!this.isTerminatingStatement(lastStmt)) {
        this.addError(
          node,
          'GS113',
          'Switch cases must end with break, return, throw, or continue'
        );
      }
    }
  }

  private isTerminatingStatement(stmt: ts.Statement): boolean {
    return ts.isBreakStatement(stmt) ||
           ts.isReturnStatement(stmt) ||
           ts.isThrowStatement(stmt) ||
           ts.isContinueStatement(stmt);
  }

  /**
   * GS115: No void operator
   */
  private checkVoidOperator(node: ts.Node): void {
    if (ts.isVoidExpression(node)) {
      this.addError(
        node,
        'GS115',
        '"void" operator is forbidden - use undefined directly'
      );
    }
  }

  /**
   * GS116: No primitive wrapper constructors with 'new'
   */
  private checkPrimitiveConstructors(node: ts.Node): void {
    // Only check for new String(), new Number(), new Boolean()
    // Allow String(), Number(), Boolean() as type conversions
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text;
      if (name === 'String' || name === 'Number' || name === 'Boolean') {
        this.addError(
          node,
          'GS116',
          `new ${name}() creates wrapper objects - use ${name}() for type conversion instead`
        );
      }
    }
  }

  /**
   * GS126: No prototype manipulation
   */
  private checkPrototypeAccess(node: ts.Node): void {
    if (ts.isPropertyAccessExpression(node)) {
      const propName = node.name.text;
      
      if (propName === 'prototype' || propName === '__proto__') {
        this.addError(
          node,
          'GS126',
          'Prototype manipulation is not supported - use classes with static structure'
        );
      }
    }
  }

  /**
   * GS127: No dynamic import with non-literal paths
   */
  private checkDynamicImport(node: ts.Node): void {
    if (ts.isCallExpression(node) && 
        node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      // Dynamic import: import(path)
      const arg = node.arguments[0];
      
      // Allow only string literals
      if (!arg || !ts.isStringLiteral(arg)) {
        this.addError(
          node,
          'GS127',
          'Dynamic import requires a string literal path - computed paths are forbidden'
        );
      }
    }
  }

  private addError(node: ts.Node, code: string, message: string): void {
    const start = node.getStart(this.sourceFile);
    const { line, character } = this.sourceFile.getLineAndCharacterOfPosition(start);

    this.diagnostics.push({
      code,
      message,
      severity: 'error',
      location: {
        fileName: this.sourceFile.fileName,
        line: line + 1,
        column: character + 1,
      },
    });
  }
}