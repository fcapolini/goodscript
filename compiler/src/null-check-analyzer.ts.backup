/**
 * Null-Check Analyzer
 * Enforces null checks on weak references (implicit nullability)
 */

import * as ts from 'typescript';
import { Diagnostic, SourceLocation, OwnershipKind, OwnershipInfo } from './types';
import { Parser } from './parser';
import { OwnershipAnalyzer } from './ownership-analyzer';

export class NullCheckAnalyzer {
  private diagnostics: Diagnostic[] = [];
  private ownershipAnalyzer: OwnershipAnalyzer;

  constructor(ownershipAnalyzer: OwnershipAnalyzer) {
    this.ownershipAnalyzer = ownershipAnalyzer;
  }

  /**
   * Helper: Check if a node is null or undefined literal
   * GoodScript treats null and undefined as synonyms
   */
  private isNullOrUndefined(node: ts.Node): boolean {
    return node.kind === ts.SyntaxKind.NullKeyword || 
           node.kind === ts.SyntaxKind.UndefinedKeyword;
  }

  /**
   * Analyze a source file for missing null checks
   */
  analyze(sourceFile: ts.SourceFile, checker: ts.TypeChecker): void {
    this.diagnostics = [];
    this.visit(sourceFile, sourceFile, checker, new Set());
  }

  /**
   * Get accumulated diagnostics
   */
  getDiagnostics(): Diagnostic[] {
    return this.diagnostics;
  }

  /**
   * Visit AST nodes recursively
   */
  private visit(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker,
    checkedVars: Set<string>
  ): void {
    // Handle if statements - track null checks
    if (ts.isIfStatement(node)) {
      this.handleIfStatement(node, sourceFile, checker, checkedVars);
      return;
    }

    // Handle switch statements - track null checks
    if (ts.isSwitchStatement(node)) {
      this.handleSwitchStatement(node, sourceFile, checker, checkedVars);
      return;
    }

    // Handle while statements - track null checks
    if (ts.isWhileStatement(node)) {
      this.handleWhileStatement(node, sourceFile, checker, checkedVars);
      return;
    }

    // Handle do-while statements - track null checks
    if (ts.isDoStatement(node)) {
      this.handleDoWhileStatement(node, sourceFile, checker, checkedVars);
      return;
    }

    // Handle for statements - track null checks in condition
    if (ts.isForStatement(node)) {
      this.handleForStatement(node, sourceFile, checker, checkedVars);
      return;
    }

    // Handle reassignments - invalidate null checks
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      this.handleReassignment(node, sourceFile, checker, checkedVars);
      return;  // Don't recurse - we already visited children in handleReassignment
    }

    // Handle ternary expressions - track null checks in condition
    if (ts.isConditionalExpression(node)) {
      this.handleConditionalExpression(node, sourceFile, checker, checkedVars);
      return;
    }

    // Handle && expressions - support idiom like: x !== null && x.method()
    if (ts.isBinaryExpression(node) && 
        node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      this.handleAndExpression(node, sourceFile, checker, checkedVars);
      return;
    }

    // Handle property access - check for null safety (includes optional chaining)
    if (ts.isPropertyAccessExpression(node)) {
      this.checkPropertyAccess(node, sourceFile, checker, checkedVars);
    }

    // Handle element access (array/object indexing)
    if (ts.isElementAccessExpression(node)) {
      this.checkElementAccess(node, sourceFile, checker, checkedVars);
    }

    // Handle method calls
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      this.checkPropertyAccess(node.expression, sourceFile, checker, checkedVars);
    }

    // Recurse into children
    ts.forEachChild(node, (child: ts.Node) => 
      this.visit(child, sourceFile, checker, checkedVars)
    );
  }

  /**
   * Handle if statements for flow-sensitive analysis
   */
  private handleIfStatement(
    node: ts.IfStatement,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker,
    checkedVars: Set<string>
  ): void {
    const condition = node.expression;
    const thenCheckedVars = new Set(checkedVars);
    const elseCheckedVars = new Set(checkedVars);

    // Extract all null checks from condition (handles &&, ||, !, etc.)
    const { thenNonNull, elseNonNull } = this.extractAllNullChecks(condition, sourceFile);
    
    thenNonNull.forEach(v => thenCheckedVars.add(v));
    elseNonNull.forEach(v => elseCheckedVars.add(v));

    // Check if then branch has early exit (return/throw)
    const hasEarlyExit = this.hasEarlyExit(node.thenStatement);

    // Visit then branch with then-specific checked variables
    this.visit(node.thenStatement, sourceFile, checker, thenCheckedVars);

    // Visit else branch with else-specific checked variables
    if (node.elseStatement) {
      this.visit(node.elseStatement, sourceFile, checker, elseCheckedVars);
    } else if (hasEarlyExit) {
      // If then branch exits early and there's no else, propagate else assumptions
      // to the parent scope by updating checkedVars
      elseNonNull.forEach(v => checkedVars.add(v));
    }
  }

  /**
   * Check if a statement contains an early exit (return or throw)
   */
  private hasEarlyExit(statement: ts.Statement): boolean {
    let hasExit = false;

    const visit = (node: ts.Node) => {
      if (ts.isReturnStatement(node) || ts.isThrowStatement(node)) {
        hasExit = true;
        return;
      }
      // Don't recurse into nested functions
      if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
        return;
      }
      ts.forEachChild(node, visit);
    };

    visit(statement);
    return hasExit;
  }

  /**
   * Handle while statements for flow-sensitive analysis
   */
  private handleWhileStatement(
    node: ts.WhileStatement,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker,
    checkedVars: Set<string>
  ): void {
    const condition = node.expression;
    const newCheckedVars = new Set(checkedVars);

    // Check for null check patterns (only non-null checks make sense for loops)
    const nullCheck = this.extractNullCheck(condition, sourceFile);
    if (nullCheck && nullCheck.isNonNull) {
      newCheckedVars.add(nullCheck.variable);
    }

    // Visit loop body with extended checked variables
    this.visit(node.statement, sourceFile, checker, newCheckedVars);
  }

  /**
   * Handle do-while statements for flow-sensitive analysis
   */
  private handleDoWhileStatement(
    node: ts.DoStatement,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker,
    checkedVars: Set<string>
  ): void {
    const condition = node.expression;
    const newCheckedVars = new Set(checkedVars);

    // Check for null check patterns (only non-null checks make sense for loops)
    const nullCheck = this.extractNullCheck(condition, sourceFile);
    if (nullCheck && nullCheck.isNonNull) {
      newCheckedVars.add(nullCheck.variable);
    }

    // Visit loop body with extended checked variables
    this.visit(node.statement, sourceFile, checker, newCheckedVars);
  }

  /**
   * Handle for statements for flow-sensitive analysis
   */
  private handleForStatement(
    node: ts.ForStatement,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker,
    checkedVars: Set<string>
  ): void {
    const newCheckedVars = new Set(checkedVars);

    // Check condition for null check patterns (only non-null checks)
    if (node.condition) {
      const nullCheck = this.extractNullCheck(node.condition, sourceFile);
      if (nullCheck && nullCheck.isNonNull) {
        newCheckedVars.add(nullCheck.variable);
      }
    }

    // Visit initializer with original scope
    if (node.initializer) {
      this.visit(node.initializer, sourceFile, checker, checkedVars);
    }

    // Visit loop body with extended checked variables
    if (node.statement) {
      this.visit(node.statement, sourceFile, checker, newCheckedVars);
    }

    // Visit incrementor with extended checked variables
    if (node.incrementor) {
      this.visit(node.incrementor, sourceFile, checker, newCheckedVars);
    }
  }

  /**
   * Handle switch statements for flow-sensitive analysis
   */
  private handleSwitchStatement(
    node: ts.SwitchStatement,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker,
    checkedVars: Set<string>
  ): void {
    const expression = node.expression;
    
    // Visit the switch expression first to check for property access
    // This will error if user.role is accessed without checking user
    this.visit(expression, sourceFile, checker, checkedVars);
    
    // If the expression is a property access, the base object must be non-null
    // Add it to checked vars for all case clauses
    const baseCheckedVars = new Set(checkedVars);
    if (ts.isPropertyAccessExpression(expression)) {
      const baseExpr = expression.expression;
      if (ts.isIdentifier(baseExpr) || ts.isPropertyAccessExpression(baseExpr)) {
        baseCheckedVars.add(baseExpr.getText(sourceFile));
      }
    }
    
    // Visit each case clause
    for (const caseClause of node.caseBlock.clauses) {
      const caseCheckedVars = new Set(baseCheckedVars);
      
      // Check if this is a null case
      if (ts.isCaseClause(caseClause)) {
        // case null: or case undefined: means expression is null in this case
        if (this.isNullOrUndefined(caseClause.expression)) {
          // Don't add to checked vars in null case
        } else {
          // For non-null cases, if we're switching on a variable, it's non-null
          const exprText = expression.getText(sourceFile);
          if (ts.isIdentifier(expression) || ts.isPropertyAccessExpression(expression)) {
            caseCheckedVars.add(exprText);
          }
        }
      } else if (ts.isDefaultClause(caseClause)) {
        // In default clause, check if any case was null
        let hasNullCase = false;
        for (const otherCase of node.caseBlock.clauses) {
          if (ts.isCaseClause(otherCase) && this.isNullOrUndefined(otherCase.expression)) {
            hasNullCase = true;
            break;
          }
        }
        
        // If there was a null case, default means non-null
        if (hasNullCase) {
          const exprText = expression.getText(sourceFile);
          if (ts.isIdentifier(expression) || ts.isPropertyAccessExpression(expression)) {
            caseCheckedVars.add(exprText);
          }
        }
      }
      
      // Visit statements in this case
      for (const statement of caseClause.statements) {
        this.visit(statement, sourceFile, checker, caseCheckedVars);
      }
    }
  }

  /**
   * Handle reassignments - invalidate null checks for reassigned variables
   */
  private handleReassignment(
    node: ts.BinaryExpression,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker,
    checkedVars: Set<string>
  ): void {
    const left = node.left;
    const varName = left.getText(sourceFile);
    
    // Visit the right side FIRST (while variable is still in checkedVars)
    // This allows expressions like: node = node.next
    this.visit(node.right, sourceFile, checker, checkedVars);
    
    // THEN remove the variable from checked set
    // because it's being reassigned and may now be null
    if (checkedVars.has(varName)) {
      checkedVars.delete(varName);
    }
  }

  /**
   * Handle ternary/conditional expressions for flow-sensitive analysis
   */
  private handleConditionalExpression(
    node: ts.ConditionalExpression,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker,
    checkedVars: Set<string>
  ): void {
    // Extract null checks from condition
    const { thenNonNull, elseNonNull } = this.extractAllNullChecks(node.condition, sourceFile);
    
    // Visit condition first
    this.visit(node.condition, sourceFile, checker, checkedVars);
    
    // Visit then branch with then-specific checked variables
    const thenCheckedVars = new Set(checkedVars);
    thenNonNull.forEach(v => thenCheckedVars.add(v));
    this.visit(node.whenTrue, sourceFile, checker, thenCheckedVars);
    
    // Visit else branch with else-specific checked variables
    const elseCheckedVars = new Set(checkedVars);
    elseNonNull.forEach(v => elseCheckedVars.add(v));
    this.visit(node.whenFalse, sourceFile, checker, elseCheckedVars);
  }

  /**
   * Handle && expressions - support idiom like: x !== null && x.method()
   * This allows short-circuit evaluation as a null-check pattern
   */
  private handleAndExpression(
    node: ts.BinaryExpression,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker,
    checkedVars: Set<string>
  ): void {
    // Visit left side with current scope
    this.visit(node.left, sourceFile, checker, checkedVars);
    
    // Extract null checks from left side
    const { thenNonNull } = this.extractAllNullChecks(node.left, sourceFile);
    
    // Visit right side with extended scope (as if left side is true)
    const rightCheckedVars = new Set(checkedVars);
    thenNonNull.forEach(v => rightCheckedVars.add(v));
    this.visit(node.right, sourceFile, checker, rightCheckedVars);
  }

  /**
   * Extract variable name from null check condition
   * Returns { variable: string, isNonNull: boolean } or null
   */
  private extractNullCheck(condition: ts.Expression, sourceFile: ts.SourceFile): { variable: string; isNonNull: boolean } | null {
    // x ?? y - nullish coalescing: don't extract null checks
    // The operator itself handles the null case
    if (ts.isBinaryExpression(condition) &&
        condition.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
      return null;
    }
    
    // Handle: if (x !== null) or if (x === null)
    if (ts.isBinaryExpression(condition)) {
      const { left, operatorToken, right } = condition;
      
      // if (x !== null) or if (x !== undefined) -> non-null check
      if (
        (operatorToken.kind === ts.SyntaxKind.ExclamationEqualsToken ||
         operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken) &&
        this.isNullOrUndefined(right)
      ) {
        return { variable: left.getText(sourceFile), isNonNull: true };
      }

      // if (null !== x) or if (undefined !== x) -> non-null check
      if (
        (operatorToken.kind === ts.SyntaxKind.ExclamationEqualsToken ||
         operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken) &&
        this.isNullOrUndefined(left)
      ) {
        return { variable: right.getText(sourceFile), isNonNull: true };
      }

      // if (x === null) or if (x === undefined) -> null check
      if (
        (operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken ||
         operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken) &&
        this.isNullOrUndefined(right)
      ) {
        return { variable: left.getText(sourceFile), isNonNull: false };
      }

      // if (null === x) or if (undefined === x) -> null check
      if (
        (operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken ||
         operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken) &&
        this.isNullOrUndefined(left)
      ) {
        return { variable: right.getText(sourceFile), isNonNull: false };
      }
    }

    // Handle: if (x) - truthy check (non-null)
    if (ts.isIdentifier(condition) || ts.isPropertyAccessExpression(condition)) {
      return { variable: condition.getText(sourceFile), isNonNull: true };
    }

    return null;
  }

  /**
   * Extract all null checks from a complex condition
   * Handles &&, ||, !, and nested expressions
   */
  private extractAllNullChecks(
    condition: ts.Expression,
    sourceFile: ts.SourceFile
  ): { thenNonNull: Set<string>; elseNonNull: Set<string> } {
    const thenNonNull = new Set<string>();
    const elseNonNull = new Set<string>();

    this.extractNullChecksRecursive(condition, sourceFile, true, thenNonNull, elseNonNull);

    return { thenNonNull, elseNonNull };
  }

  /**
   * Recursively extract null checks from nested expressions
   */
  private extractNullChecksRecursive(
    condition: ts.Expression,
    sourceFile: ts.SourceFile,
    positive: boolean,  // true = then branch, false = else branch
    thenNonNull: Set<string>,
    elseNonNull: Set<string>
  ): void {
    // Handle parenthesized expressions
    if (ts.isParenthesizedExpression(condition)) {
      this.extractNullChecksRecursive(condition.expression, sourceFile, positive, thenNonNull, elseNonNull);
      return;
    }
    
    // Handle negation: !x or !(x === null)
    if (ts.isPrefixUnaryExpression(condition) && 
        condition.operator === ts.SyntaxKind.ExclamationToken) {
      // Flip the polarity
      this.extractNullChecksRecursive(condition.operand, sourceFile, !positive, thenNonNull, elseNonNull);
      return;
    }

    // Handle logical AND: x && y
    if (ts.isBinaryExpression(condition) && 
        condition.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      if (positive) {
        // x && y: both must be true in then branch
        this.extractNullChecksRecursive(condition.left, sourceFile, true, thenNonNull, elseNonNull);
        this.extractNullChecksRecursive(condition.right, sourceFile, true, thenNonNull, elseNonNull);
      } else {
        // !(x && y) = !x || !y: at least one is false
        // In else branch (where x && y is true), both are true
        this.extractNullChecksRecursive(condition.left, sourceFile, false, elseNonNull, thenNonNull);
        this.extractNullChecksRecursive(condition.right, sourceFile, false, elseNonNull, thenNonNull);
      }
      return;
    }

    // Handle logical OR: x || y
    if (ts.isBinaryExpression(condition) && 
        condition.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
      if (positive) {
        // x || y: at least one is true in then branch - can't determine which
        // In else branch, both are false
        this.extractNullChecksRecursive(condition.left, sourceFile, true, elseNonNull, thenNonNull);
        this.extractNullChecksRecursive(condition.right, sourceFile, true, elseNonNull, thenNonNull);
      } else {
        // !(x || y) = !x && !y: both are false
        // In then branch (where !(x || y) is true), both are false
        this.extractNullChecksRecursive(condition.left, sourceFile, false, thenNonNull, elseNonNull);
        this.extractNullChecksRecursive(condition.right, sourceFile, false, thenNonNull, elseNonNull);
      }
      return;
    }

    // Handle simple null check
    const nullCheck = this.extractNullCheck(condition, sourceFile);
    if (nullCheck) {
      const targetSet = positive ? thenNonNull : elseNonNull;
      const oppositeSet = positive ? elseNonNull : thenNonNull;
      
      if (nullCheck.isNonNull) {
        // x !== null: then gets x, else doesn't
        targetSet.add(nullCheck.variable);
      } else {
        // x === null: else gets x, then doesn't
        oppositeSet.add(nullCheck.variable);
      }
    }
  }

  /**
   * Check property access for null safety
   */
  private checkPropertyAccess(
    node: ts.PropertyAccessExpression,
    sourceFile: ts.SourceFile,
    _checker: ts.TypeChecker,
    checkedVars: Set<string>
  ): void {
    // Skip check if using optional chaining (?.)
    if (node.questionDotToken) {
      return;
    }
    
    // Get the expression being accessed (e.g., 'user' in 'user.name' or 'this.data' in 'this.data.value')
    const expr = node.expression;
    
    // Handle simple identifiers (user.name)
    if (ts.isIdentifier(expr)) {
      const varName = expr.getText(sourceFile);
      this.checkIdentifierAccess(varName, node, sourceFile, checkedVars);
      return;
    }

    // Handle property access chains (this.data.value)
    if (ts.isPropertyAccessExpression(expr)) {
      // Get the full path (e.g., "this.data")
      const fullPath = expr.getText(sourceFile);
      this.checkIdentifierAccess(fullPath, node, sourceFile, checkedVars);
      return;
    }
  }

  /**
   * Check if an identifier access is safe
   */
  private checkIdentifierAccess(
    varName: string,
    node: ts.PropertyAccessExpression,
    sourceFile: ts.SourceFile,
    checkedVars: Set<string>
  ): void {
    const expr = node.expression;
    
    // Check if this is a weak reference
    let ownershipInfo = this.ownershipAnalyzer.getOwnershipInfo(varName);
    
    // If not found and it's a property access chain, check if it's a field access
    if (!ownershipInfo && ts.isPropertyAccessExpression(expr)) {
      // For this.field, we need to look up field ownership differently
      // For now, we'll check the type annotation on the node itself
      ownershipInfo = this.inferOwnershipFromType(expr, sourceFile);
    }
    
    // ALL weak references need null checks
    // Only owned references (unique<T> or shared<T>) don't need checks
    if (!ownershipInfo || ownershipInfo.kind !== OwnershipKind.Weak) {
      // Not a weak reference (must be owned), no check needed
      return;
    }

    // Check if variable has been null-checked in this scope
    if (checkedVars.has(varName)) {
      // Already checked, safe to access
      return;
    }

    // Check if using optional chaining (user?.name)
    if (node.questionDotToken) {
      // Optional chaining is safe
      return;
    }

    // ERROR: Accessing weak reference without null check
    const location = Parser.getLocation(node, sourceFile);
    const propertyName = node.name.getText(sourceFile);

    this.addError(
      `Cannot access property '${propertyName}' on weak reference '${varName}' without null check`,
      location,
      'GS301',
      varName,
      ownershipInfo
    );
  }

  /**
   * Infer ownership from a type annotation
   */
  private inferOwnershipFromType(
    node: ts.Expression,
    sourceFile: ts.SourceFile
  ): OwnershipInfo | undefined {
    // Look up in ownership analyzer first
    const nodeName = node.getText(sourceFile);
    const info = this.ownershipAnalyzer.getOwnershipInfo(nodeName);
    if (info) {
      return info;
    }

    // For property access expressions like "this.field", we need to find the field
    if (ts.isPropertyAccessExpression(node)) {
      const propertyName = node.name.getText(sourceFile);
      
      // Try to find the field declaration
      const expr = node.expression;
      if (expr.kind === ts.SyntaxKind.ThisKeyword) {
        // Find containing class and check field
        const classDecl = this.findContainingClass(node);
        if (classDecl) {
          const className = classDecl.name?.getText(sourceFile);
          if (className) {
            // Look up field ownership (className.fieldName)
            const fieldInfo = this.ownershipAnalyzer.getOwnershipInfo(`${className}.${propertyName}`);
            if (fieldInfo) {
              return fieldInfo;
            }
            
            // Also try just the field name
            const fieldInfo2 = this.ownershipAnalyzer.getOwnershipInfo(propertyName);
            if (fieldInfo2) {
              return fieldInfo2;
            }
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Find the containing class declaration
   */
  private findContainingClass(node: ts.Node): ts.ClassDeclaration | undefined {
    let current = node.parent;
    while (current) {
      if (ts.isClassDeclaration(current)) {
        return current;
      }
      current = current.parent;
    }
    return undefined;
  }

  /**
   * Check element access for null safety
   */
  private checkElementAccess(
    node: ts.ElementAccessExpression,
    sourceFile: ts.SourceFile,
    _checker: ts.TypeChecker,
    checkedVars: Set<string>
  ): void {
    const expr = node.expression;
    
    if (!ts.isIdentifier(expr)) {
      return;
    }

    const varName = expr.getText(sourceFile);
    
    // Check if this is a weak reference (needs check)
    const ownershipInfo = this.ownershipAnalyzer.getOwnershipInfo(varName);
    if (!ownershipInfo || ownershipInfo.kind !== OwnershipKind.Weak) {
      return;
    }

    // Check if variable has been null-checked
    if (checkedVars.has(varName)) {
      return;
    }

    // ERROR: Accessing weak reference without null check
    const location = Parser.getLocation(node, sourceFile);

    this.addError(
      `Cannot access element on weak reference '${varName}' without null check`,
      location,
      'GS301',
      varName,
      ownershipInfo
    );
  }

  /**
   * Add an error diagnostic with helpful suggestions
   */
  private addError(
    message: string,
    location: SourceLocation,
    code: string,
    varName: string,
    ownershipInfo: any
  ): void {
    // Build helpful error message with suggestions (Phase 2 syntax)
    const fullMessage = `${message}
  │
  = note: '${varName}' is a weak reference (implicitly nullable) and requires null check
  = help: bare types (without ownership wrappers) are weak references that may become null
  = fix: add null check: if (${varName} !== null) { ... } or if (${varName} !== undefined) { ... }
      or use optional chaining: ${varName}?.property
      ${ownershipInfo.symbol === varName ? `or take ownership: unique<T> or shared<T> parameter` : ''}`;

    this.diagnostics.push({
      severity: 'error',
      message: fullMessage,
      location,
      code,
    });
  }
}
