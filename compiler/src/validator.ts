/**
 * Validator
 * Enforces GoodScript language restrictions
 */

import * as ts from 'typescript';
import { Diagnostic, SourceLocation, ValidationResult } from './types';
import { Parser } from './parser';

export interface ValidatorOptions {
  /**
   * Permissive mode for Test262 conformance testing
   * Allows function expressions/declarations and implicit truthiness
   */
  permissive?: boolean;
}

export class Validator {
  private diagnostics: Diagnostic[] = [];
  private options: ValidatorOptions = {};

  /**
   * Validate a source file against GoodScript rules
   */
  validate(sourceFile: ts.SourceFile, checker: ts.TypeChecker, options: ValidatorOptions = {}): ValidationResult {
    this.options = options;
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
    
    // Check for assignment to reserved words/literals
    this.checkReservedWordAssignment(node, sourceFile);

    // Check for switch fall-through
    this.checkSwitchFallThrough(node, sourceFile);

    // Check ternary expression type consistency
    this.checkTernaryTypes(node, sourceFile, checker);

    // Check nullish coalescing type consistency
    this.checkNullishCoalescingTypes(node, sourceFile, checker);

    // Check function return type consistency
    this.checkFunctionReturnTypes(node, sourceFile, checker);

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

    // No 'as const' assertions (GS120) - implementation limitation, not a language design restriction
    if (ts.isAsExpression(node) && ts.isTypeReferenceNode(node.type)) {
      if (ts.isIdentifier(node.type.typeName) && node.type.typeName.text === 'const') {
        this.addError(
          'The "as const" assertion is not supported in the current implementation',
          location,
          'GS120'
        );
      }
    }

    // No readonly modifier (GS121) - implementation limitation
    // Check for TypeOperator with readonly (for readonly T[])
    if (node.kind === ts.SyntaxKind.TypeOperator) {
      const typeOp = node as ts.TypeOperatorNode;
      if (typeOp.operator === ts.SyntaxKind.ReadonlyKeyword) {
        this.addError(
          'The \"readonly\" modifier is not supported in the current implementation',
          location,
          'GS121'
        );
      }
    }
    // Check for standalone ReadonlyKeyword (for class/interface properties)
    if (node.kind === ts.SyntaxKind.ReadonlyKeyword) {
      this.addError(
        'The \"readonly\" modifier is not supported in the current implementation',
        location,
        'GS121'
      );
    }

    // No ReadonlyArray, Readonly, ReadonlyMap, ReadonlySet utility types (GS122) - implementation limitation
    if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
      const typeName = node.typeName.text;
      if (typeName === 'ReadonlyArray' || typeName === 'Readonly' || 
          typeName === 'ReadonlyMap' || typeName === 'ReadonlySet') {
        this.addError(
          `The "${typeName}<T>" type is not supported in the current implementation`,
          location,
          'GS122'
        );
      }
    }

    // No Object.freeze, Object.seal, Object.preventExtensions (GS123) - implementation limitation
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const expr = node.expression;
      if (ts.isIdentifier(expr.expression) && expr.expression.text === 'Object') {
        const methodName = expr.name.text;
        if (methodName === 'freeze' || methodName === 'seal' || methodName === 'preventExtensions') {
          this.addError(
            `Object.${methodName}() is not supported in the current implementation`,
            location,
            'GS123'
          );
        }
      }
    }

    // No unsupported Object methods (GS124) - implementation limitation
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const expr = node.expression;
      if (ts.isIdentifier(expr.expression) && expr.expression.text === 'Object') {
        const methodName = expr.name.text;
        const unsupportedMethods = [
          'defineProperty',
          'defineProperties',
          'create',
          'getPrototypeOf',
          'setPrototypeOf',
          'getOwnPropertyNames',
          'getOwnPropertySymbols',
          'getOwnPropertyDescriptor',
          'getOwnPropertyDescriptors'
        ];
        if (unsupportedMethods.includes(methodName)) {
          this.addError(
            `Object.${methodName}() is not supported - lacks reflection/prototype semantics in C++`,
            location,
            'GS124'
          );
        }
      }
    }

    // Allow Symbol.iterator for iterator protocol, block other Symbol usage (GS125)
    if (ts.isIdentifier(node) && node.text === 'Symbol') {
      const parent = node.parent;
      // Allow Symbol.iterator property access for iterator protocol
      if (ts.isPropertyAccessExpression(parent) && 
          parent.expression === node &&
          ts.isIdentifier(parent.name) && 
          parent.name.text === 'iterator') {
        // Allow Symbol.iterator - this is the iterator protocol
        return;
      }
      // Block all other Symbol usage
      if (ts.isTypeReferenceNode(parent) || 
          ts.isCallExpression(parent) || 
          ts.isNewExpression(parent) ||
          ts.isPropertyAccessExpression(parent)) {
        this.addError(
          'Symbol is only supported for iterator protocol (Symbol.iterator)',
          location,
          'GS125'
        );
      }
    }

    // No 'prototype' access (GS126) - implementation limitation
    if (ts.isPropertyAccessExpression(node) && 
        ts.isIdentifier(node.name) && 
        (node.name.text === 'prototype' || node.name.text === '__proto__')) {
      this.addError(
        'Prototype manipulation is not supported - C++ uses static class definitions',
        location,
        'GS126'
      );
    }

    // No Proxy (GS127) - implementation limitation
    if (ts.isIdentifier(node) && node.text === 'Proxy') {
      const parent = node.parent;
      if (ts.isNewExpression(parent) || ts.isCallExpression(parent)) {
        this.addError(
          'Proxy is not supported - lacks C++ equivalent for runtime interception',
          location,
          'GS127'
        );
      }
    }
    // Catch Proxy.revocable and other Proxy static methods
    if (ts.isPropertyAccessExpression(node) && 
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'Proxy') {
      this.addError(
        'Proxy is not supported - lacks C++ equivalent for runtime interception',
        location,
        'GS127'
      );
    }

    // No getters/setters (GS128) - implementation limitation (temporary)
    if (ts.isGetAccessor(node) || ts.isSetAccessor(node)) {
      const kind = ts.isGetAccessor(node) ? 'Getter' : 'Setter';
      this.addError(
        `${kind} accessors are not yet supported - use explicit methods like getValue() and setValue() instead`,
        location,
        'GS128'
      );
    }
    // Also catch Reflect API which is often used with Proxy
    if (ts.isPropertyAccessExpression(node) && 
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'Reflect') {
      this.addError(
        'Reflect API is not supported - lacks C++ equivalent for runtime interception',
        location,
        'GS127'
      );
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

    // No 'this' keyword in function declarations/expressions (only allowed in class methods)
    // Function declarations and expressions are allowed, but they cannot use 'this'
    // (Arrow functions, class methods, and constructors can use 'this')
    this.checkThisInFunction(node, sourceFile);
  }

  /**
   * Check for 'this' keyword usage in function declarations/expressions
   * 'this' is only allowed in:
   * - Class methods
   * - Class constructors
   * - Arrow functions (they inherit 'this' lexically)
   */
  private checkThisInFunction(node: ts.Node, sourceFile: ts.SourceFile): void {
    // Only check function declarations and expressions (not arrow functions or methods)
    if (!ts.isFunctionDeclaration(node) && !ts.isFunctionExpression(node)) {
      return;
    }

    // Allow if it's a class method, constructor, or function signature
    const parent = node.parent;
    const isMethod = ts.isMethodDeclaration(parent) || 
                    ts.isMethodSignature(parent) ||
                    ts.isConstructorDeclaration(parent);
    const isInterfaceMember = parent && parent.parent && ts.isInterfaceDeclaration(parent.parent);
    const isFunctionSignature = !node.body; // Function signature (no implementation)
    
    // Skip if it's a method or signature (they can use 'this')
    if (isMethod || isInterfaceMember || isFunctionSignature) {
      return;
    }

    // Now check if the function body contains 'this' keyword
    if (node.body) {
      const hasThis = this.containsThisKeyword(node.body, node);
      if (hasThis) {
        const location = Parser.getLocation(node, sourceFile);
        this.addError(
          'The "this" keyword is not allowed in function declarations and expressions. Use arrow functions for lexical "this" binding, or class methods',
          location,
          'GS108'
        );
      }
    }
  }

  /**
   * Check if a node or its descendants contain 'this' keyword
   * Don't recurse into nested functions/arrow functions (they have their own scope)
   */
  private containsThisKeyword(node: ts.Node, functionNode: ts.Node): boolean {
    // Found 'this' keyword
    if (node.kind === ts.SyntaxKind.ThisKeyword) {
      return true;
    }

    // Don't recurse into nested function declarations/expressions/arrow functions
    // (they have their own 'this' scope)
    if (node !== functionNode && (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node)
    )) {
      return false;
    }

    // Recurse into children
    let found = false;
    ts.forEachChild(node, (child: ts.Node) => {
      if (this.containsThisKeyword(child, functionNode)) {
        found = true;
      }
    });

    return found;
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
    // In permissive mode (Test262), allow implicit truthiness
    if (this.options.permissive) {
      return;
    }
    
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
   * Check for assignment to reserved words and literals (GS124)
   */
  private checkReservedWordAssignment(node: ts.Node, sourceFile: ts.SourceFile): void {
    // Check if this is a binary expression with assignment operator
    if (ts.isBinaryExpression(node)) {
      const op = node.operatorToken.kind;
      const isAssignment = 
        op === ts.SyntaxKind.EqualsToken ||
        op === ts.SyntaxKind.PlusEqualsToken ||
        op === ts.SyntaxKind.MinusEqualsToken ||
        op === ts.SyntaxKind.AsteriskEqualsToken ||
        op === ts.SyntaxKind.SlashEqualsToken ||
        op === ts.SyntaxKind.PercentEqualsToken ||
        op === ts.SyntaxKind.AmpersandEqualsToken ||
        op === ts.SyntaxKind.BarEqualsToken ||
        op === ts.SyntaxKind.CaretEqualsToken;
      
      if (isAssignment) {
        const left = node.left;
        
        // Check for assignment to boolean literals
        if (left.kind === ts.SyntaxKind.TrueKeyword || left.kind === ts.SyntaxKind.FalseKeyword) {
          const location = Parser.getLocation(left, sourceFile);
          this.addError(
            `SyntaxError: Cannot assign to "${left.kind === ts.SyntaxKind.TrueKeyword ? 'true' : 'false'}". It is a reserved keyword`,
            location,
            'GS124'
          );
        }
        
        // Check for assignment to null, undefined
        if (ts.isIdentifier(left)) {
          if (left.text === 'null' || left.text === 'undefined' || left.text === 'NaN' || left.text === 'Infinity') {
            const location = Parser.getLocation(left, sourceFile);
            this.addError(
              `SyntaxError: Cannot assign to "${left.text}". It is a reserved keyword or literal`,
              location,
              'GS124'
            );
          }
        }
      }
    }
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

    // Type-based checks require a valid checker
    if (!checker) {
      return false;
    }

    // Function calls - check actual return type
    if (ts.isCallExpression(expr)) {
      const type = checker.getTypeAtLocation(expr);
      return this.isBooleanType(type);
    }

    // Property access - check if the property type is boolean
    if (ts.isPropertyAccessExpression(expr)) {
      const type = checker.getTypeAtLocation(expr);
      return this.isBooleanType(type);
    }

    // Identifier - check if it's a boolean variable
    if (ts.isIdentifier(expr)) {
      const type = checker.getTypeAtLocation(expr);
      return this.isBooleanType(type);
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
   * Helper: Check if type is boolean (handles unions)
   */
  private isBooleanType(type: ts.Type): boolean {
    // Direct boolean type
    if ((type.flags & ts.TypeFlags.Boolean) !== 0 || (type.flags & ts.TypeFlags.BooleanLiteral) !== 0) {
      return true;
    }

    // Union type - check if contains at least one boolean type
    // (TypeScript may infer as boolean | undefined for optional fields)
    if (type.flags & ts.TypeFlags.Union) {
      const unionType = type as ts.UnionType;
      const hasBoolean = unionType.types.some(t => 
        (t.flags & ts.TypeFlags.Boolean) !== 0 || (t.flags & ts.TypeFlags.BooleanLiteral) !== 0
      );
      const allBooleanOrUndefined = unionType.types.every(t =>
        (t.flags & ts.TypeFlags.Boolean) !== 0 || 
        (t.flags & ts.TypeFlags.BooleanLiteral) !== 0 ||
        (t.flags & ts.TypeFlags.Undefined) !== 0 ||
        (t.flags & ts.TypeFlags.Null) !== 0
      );
      // Allow if it's a boolean union or boolean | undefined/null
      return hasBoolean && allBooleanOrUndefined;
    }

    return false;
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

    // Allow ternaries where one branch is a value type and the other is explicitly null/undefined
    // e.g., value ? value : null, or undefined ? null : value
    const isNullOrUndefined = (name: string) => name === 'null' || name === 'undefined' || name === 'void';
    
    // If types are incompatible (different base types), reject
    // Exception: allow if one side is the actual type and other is null/undefined
    if (getTrueName !== getFalseName && 
        !(isNullOrUndefined(getTrueName) || isNullOrUndefined(getFalseName))) {
      this.addError(
        `Ternary expression branches must have compatible types. Got '${getTrueName}' and '${getFalseName}'. ` +
        `Use explicit type conversion or refactor to avoid mixed types.`,
        location,
        'GS117'
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
        // Multiple non-null types
        // Check if all are boolean literals (true | false)
        const allBooleanLiterals = nonNullTypes.every(t => t.flags & ts.TypeFlags.BooleanLiteral);
        if (allBooleanLiterals) {
          return 'boolean';
        }
        
        // Normalize each type in the union
        const normalizedTypes = nonNullTypes.map(t => {
          if (t.flags & ts.TypeFlags.StringLiteral) return 'string';
          if (t.flags & ts.TypeFlags.NumberLiteral) return 'number';
          if (t.flags & ts.TypeFlags.BooleanLiteral) return 'boolean';
          return checker.typeToString(t);
        });
        
        // If all normalized to the same type, return that type
        const uniqueTypes = Array.from(new Set(normalizedTypes));
        if (uniqueTypes.length === 1) {
          return uniqueTypes[0];
        }
        
        // Otherwise return the union representation (for discriminated unions)
        return uniqueTypes.join(' | ');
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

    // Handle boolean literals as 'boolean' type
    if (type.flags & ts.TypeFlags.BooleanLiteral) {
      return 'boolean';
    }

    return checker.typeToString(type);
  }

  /**
   * Check nullish coalescing operator type consistency
   * Both sides of ?? must have compatible types
   */
  private checkNullishCoalescingTypes(node: ts.Node, sourceFile: ts.SourceFile, checker: ts.TypeChecker): void {
    if (!ts.isBinaryExpression(node)) {
      return;
    }

    if (node.operatorToken.kind !== ts.SyntaxKind.QuestionQuestionToken) {
      return;
    }

    const location = Parser.getLocation(node, sourceFile);
    
    // For both sides, try to get the declared type if it's a variable
    const getEffectiveType = (expr: ts.Expression): ts.Type => {
      if (ts.isIdentifier(expr)) {
        const symbol = checker.getSymbolAtLocation(expr);
        if (symbol && symbol.valueDeclaration && ts.isVariableDeclaration(symbol.valueDeclaration)) {
          if (symbol.valueDeclaration.type) {
            // Get type from the annotation, not the initialization
            return checker.getTypeFromTypeNode(symbol.valueDeclaration.type);
          }
        }
      }
      return checker.getTypeAtLocation(expr);
    };
    
    const leftType = getEffectiveType(node.left);
    const rightType = getEffectiveType(node.right);

    // Get base type names, stripping null/undefined from unions
    const leftTypeName = this.getBaseTypeName(leftType, checker);
    const rightTypeName = this.getBaseTypeName(rightType, checker);

    // If types are incompatible (different base types), reject
    if (leftTypeName !== rightTypeName) {
      this.addError(
        `Nullish coalescing operator (??) operands must have compatible types. Got '${leftTypeName}' and '${rightTypeName}'. ` +
        `Use explicit type conversion or refactor to avoid mixed types.`,
        location,
        'GS119'
      );
    }
  }

  /**
   * Check function return type consistency
   * All return statements in a function must return compatible types
   */
  private checkFunctionReturnTypes(node: ts.Node, sourceFile: ts.SourceFile, checker: ts.TypeChecker): void {
    // Only check function/method/arrow function declarations
    if (!ts.isFunctionDeclaration(node) && 
        !ts.isMethodDeclaration(node) && 
        !ts.isArrowFunction(node) &&
        !ts.isFunctionExpression(node)) {
      return;
    }

    // Skip if no body (interface/abstract method)
    if (!node.body) {
      return;
    }

    // Collect all return statements
    const returnStatements: ts.ReturnStatement[] = [];
    const collectReturns = (n: ts.Node): void => {
      if (ts.isReturnStatement(n)) {
        returnStatements.push(n);
      }
      // Don't recurse into nested functions
      if (n !== node && (ts.isFunctionDeclaration(n) || 
                        ts.isMethodDeclaration(n) || 
                        ts.isArrowFunction(n) ||
                        ts.isFunctionExpression(n))) {
        return;
      }
      ts.forEachChild(n, collectReturns);
    };
    collectReturns(node.body);

    // Need at least 2 return statements to check consistency
    if (returnStatements.length < 2) {
      return;
    }

    // Filter out returns without expressions (bare 'return' for void functions)
    const returnsWithValues = returnStatements.filter(r => r.expression !== undefined);
    
    if (returnsWithValues.length < 2) {
      return;
    }

    // Collect all unique base types from returns
    const returnTypes = new Map<string, { typeName: string, location: SourceLocation }>();
    
    for (const returnStmt of returnsWithValues) {
      const returnType = checker.getTypeAtLocation(returnStmt.expression!);
      const returnBaseName = this.getBaseTypeName(returnType, checker);
      
      // Skip null/undefined as they're compatible with nullable types
      if (returnBaseName === 'null' || returnBaseName === 'undefined') {
        continue;
      }
      
      if (!returnTypes.has(returnBaseName)) {
        returnTypes.set(returnBaseName, {
          typeName: returnBaseName,
          location: Parser.getLocation(returnStmt, sourceFile)
        });
      }
    }

    // If we have more than one distinct non-nullable type, check if they're simple incompatible types
    // (not part of a declared union type like Result<T>)
    if (returnTypes.size > 1) {
      const typeNames = Array.from(returnTypes.values());
      
      // Check if these are simple primitive mismatches (string vs number, etc.)
      // Allow object types which might be part of discriminated unions
      const hasSimplePrimitiveMismatch = typeNames.some(t1 => {
        return typeNames.some(t2 => {
          if (t1.typeName === t2.typeName) return false;
          
          // Check if both are simple primitives (string, number, boolean)
          const isT1Primitive = t1.typeName === 'string' || t1.typeName === 'number' || t1.typeName === 'boolean';
          const isT2Primitive = t2.typeName === 'string' || t2.typeName === 'number' || t2.typeName === 'boolean';
          
          // If both are primitives and different, that's a mismatch
          return isT1Primitive && isT2Primitive;
        });
      });

      if (hasSimplePrimitiveMismatch) {
        const first = typeNames[0];
        const second = typeNames.find(t => t.typeName !== first.typeName && 
          ((first.typeName === 'string' || first.typeName === 'number' || first.typeName === 'boolean') &&
           (t.typeName === 'string' || t.typeName === 'number' || t.typeName === 'boolean')));
        
        if (second) {
          this.addError(
            `Function return statements must have consistent types. ` +
            `Expected '${first.typeName}' but got '${second.typeName}'. ` +
            `Use a single return type or explicit type conversion.`,
            second.location,
            'GS118'
          );
        }
      }
    }
  }

  /**
   * Get diagnostics
   */
  getDiagnostics(): Diagnostic[] {
    return this.diagnostics;
  }
}
