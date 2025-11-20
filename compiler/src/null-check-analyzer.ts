/**
 * Null-Check Analyzer
 * 
 * Enforces null-safety for Weak<T> references based on DAG-DETECTION.md principles.
 * 
 * Key Concepts:
 * 1. Weak<T> is implicitly nullable (equivalent to T | null | undefined)
 * 2. Both null and undefined are treated as synonyms in GoodScript
 * 3. Weak<T> references must be checked before dereferencing
 * 4. Flow-sensitive analysis tracks null checks through control flow
 * 
 * Checking Patterns:
 * - if (x !== null) or if (x !== undefined) - both valid
 * - if (x === null) or if (x === undefined) - both valid
 * - x && x.property - short-circuit null check
 * - x ? x.property : default - conditional check
 * - Optional chaining (x?.property) - automatic null-safety
 */

import * as ts from 'typescript';
import { Diagnostic, SourceLocation } from './types';
import { Parser } from './parser';

/**
 * Information about a null check performed on a variable
 */
interface NullCheckInfo {
  variable: string;      // Variable name that was checked
  isNonNull: boolean;    // true if check proves non-null, false if proves null
}

export class NullCheckAnalyzer {
  private diagnostics: Diagnostic[] = [];

  /**
   * Analyze a source file for Weak<T> null-safety violations
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
   * Check if a node is null or undefined literal
   * GoodScript treats null and undefined as synonyms
   */
  private isNullOrUndefined(node: ts.Node): boolean {
    // null keyword
    if (node.kind === ts.SyntaxKind.NullKeyword) {
      return true;
    }
    
    // undefined is an identifier, not a keyword in TypeScript AST
    if (ts.isIdentifier(node) && node.text === 'undefined') {
      return true;
    }
    
    return false;
  }

  /**
   * Check if a type is Weak<T> (implicitly nullable)
   */
  private isWeakType(node: ts.Node, sourceFile: ts.SourceFile, checker: ts.TypeChecker): boolean {
    // First, try to get the symbol and check its declaration
    const symbol = checker.getSymbolAtLocation(node);
    if (symbol && symbol.valueDeclaration) {
      if (this.hasWeakTypeInDeclaration(symbol.valueDeclaration, sourceFile, checker)) {
        return true;
      }
    }

    // Fallback: try type node conversion
    const type = checker.getTypeAtLocation(node);
    if (type) {
      const typeNode = checker.typeToTypeNode(type, node, ts.NodeBuilderFlags.None);
      if (typeNode && this.hasWeakAnnotation(typeNode, sourceFile, checker)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a declaration has Weak<T> type
   */
  private hasWeakTypeInDeclaration(decl: ts.Declaration, sourceFile: ts.SourceFile, checker: ts.TypeChecker): boolean {
    if (ts.isPropertyDeclaration(decl) || ts.isPropertySignature(decl)) {
      if (decl.type) {
        return this.hasWeakAnnotation(decl.type, sourceFile, checker);
      }
    }
    if (ts.isVariableDeclaration(decl)) {
      if (decl.type) {
        return this.hasWeakAnnotation(decl.type, sourceFile, checker);
      }
      // Check inferred type from initializer
      if (decl.initializer) {
        const type = checker.getTypeAtLocation(decl.initializer);
        const typeNode = checker.typeToTypeNode(type, decl, ts.NodeBuilderFlags.None);
        if (typeNode && this.hasWeakAnnotation(typeNode, sourceFile, checker)) {
          return true;
        }
      }
    }
    if (ts.isParameter(decl)) {
      if (decl.type) {
        return this.hasWeakAnnotation(decl.type, sourceFile, checker);
      }
    }
    return false;
  }

  /**
   * Check if a type node has Weak<T> annotation
   */
  private hasWeakAnnotation(typeNode: ts.TypeNode, sourceFile: ts.SourceFile, checker: ts.TypeChecker): boolean {
    // Union type containing Weak<T>
    if (ts.isUnionTypeNode(typeNode)) {
      for (const member of typeNode.types) {
        if (this.hasWeakAnnotation(member, sourceFile, checker)) {
          return true;
        }
      }
    }

    // Resolve type aliases (but not Weak/Shared/Unique themselves)
    const resolvedType = this.resolveTypeAlias(typeNode, checker);
    
    // Direct Weak<T> reference
    if (ts.isTypeReferenceNode(resolvedType)) {
      // Use .text property for identifiers to avoid source file issues
      const typeName = ts.isIdentifier(resolvedType.typeName)
        ? resolvedType.typeName.text
        : (resolvedType.typeName.pos >= 0 ? resolvedType.typeName.getText(sourceFile) : '');
      if (typeName === 'Weak') {
        return true;
      }
    }

    return false;
  }

  /**
   * Resolve type aliases to get the underlying type node
   * Does NOT resolve Shared/Weak/Unique - these are ownership wrappers, not aliases
   */
  private resolveTypeAlias(
    typeNode: ts.TypeNode,
    checker: ts.TypeChecker,
    visited: Set<ts.TypeNode> = new Set()
  ): ts.TypeNode {
    // Prevent infinite recursion
    if (visited.has(typeNode)) {
      return typeNode;
    }
    visited.add(typeNode);

    if (ts.isTypeReferenceNode(typeNode)) {
      // Don't resolve ownership wrappers - they are not aliases
      // Use the identifier text directly to avoid source file issues
      const typeNameText = ts.isIdentifier(typeNode.typeName) 
        ? typeNode.typeName.text 
        : (typeNode.typeName.pos >= 0 ? typeNode.typeName.getText() : '');
      if (typeNameText === 'Shared' || typeNameText === 'Weak' || typeNameText === 'Unique') {
        return typeNode;
      }
      
      // Get the symbol from the type name (this works for type aliases)
      const symbol = checker.getSymbolAtLocation(typeNode.typeName);
      if (symbol?.declarations?.[0]) {
        const declaration = symbol.declarations[0];
        if (ts.isTypeAliasDeclaration(declaration)) {
          // Recursively resolve nested aliases
          return this.resolveTypeAlias(declaration.type, checker, visited);
        }
      }
    }
    return typeNode;
  }

  /**
   * Visit AST nodes recursively with flow-sensitive null check tracking
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

    // Handle variable declarations with Weak<T> type
    if (ts.isVariableDeclaration(node)) {
      this.checkWeakVariableDeclaration(node, sourceFile, checker);
    }

    // Handle parameter declarations with Weak<T> type
    if (ts.isParameter(node)) {
      // Parameters are checked at usage sites
    }

    // Handle property access - check for null safety (unless optional chaining)
    if (ts.isPropertyAccessExpression(node) && 
        node.questionDotToken === undefined) {  // Not optional chaining
      this.checkPropertyAccess(node, sourceFile, checker, checkedVars);
    }

    // Handle element access (array/object indexing)
    if (ts.isElementAccessExpression(node)) {
      this.checkElementAccess(node, sourceFile, checker, checkedVars);
    }

    // Handle method calls
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      if (node.expression.questionDotToken === undefined) {  // Not optional chaining
        this.checkPropertyAccess(node.expression, sourceFile, checker, checkedVars);
      }
    }

    // Handle call expression arguments - check for Weak<T> passed to non-nullable params
    if (ts.isCallExpression(node)) {
      this.checkCallArguments(node, sourceFile, checker, checkedVars);
    }

    // Recurse into children (unless we've already handled them specially above)
    //
    // Don't recurse if we've already handled flow-sensitive analysis for:
    // - If statements (handled above with branch-specific checked vars)
    // - While/do-while/for statements (handled above with loop-specific vars)
    // - Conditional expressions (handled above with branch-specific vars)
    // - && expressions (handled above with left-right sequencing)
    const isHandledSpecially = ts.isIfStatement(node) ||
      ts.isWhileStatement(node) ||
      ts.isDoStatement(node) ||
      ts.isForStatement(node) ||
      ts.isConditionalExpression(node) ||
      (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken);
    
    if (!isHandledSpecially) {
      ts.forEachChild(node, (child: ts.Node) => 
        this.visit(child, sourceFile, checker, checkedVars)
      );
    }

    // Handle reassignments - invalidate null checks AFTER visiting children
    // This ensures we check the RHS before invalidating the LHS
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const leftText = node.left.getText(sourceFile);
      checkedVars.delete(leftText);  // Invalidate null check on reassignment
    }
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

    // Extract null checks from condition
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
      elseNonNull.forEach(v => checkedVars.add(v));
    }
  }

  /**
   * Check if a statement contains an early exit (return, throw, break, or continue)
   */
  private hasEarlyExit(statement: ts.Statement): boolean {
    let hasExit = false;

    const visit = (node: ts.Node) => {
      if (ts.isReturnStatement(node) || 
          ts.isThrowStatement(node) ||
          ts.isBreakStatement(node) ||
          ts.isContinueStatement(node)) {
        hasExit = true;
        return;
      }
      if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
        return; // Don't recurse into nested functions
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

    const nullCheck = this.extractNullCheck(condition, sourceFile);
    if (nullCheck && nullCheck.isNonNull) {
      newCheckedVars.add(nullCheck.variable);
    }

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

    const nullCheck = this.extractNullCheck(condition, sourceFile);
    if (nullCheck && nullCheck.isNonNull) {
      newCheckedVars.add(nullCheck.variable);
    }

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

    if (node.condition) {
      const { thenNonNull } = this.extractAllNullChecks(node.condition, sourceFile);
      thenNonNull.forEach(varName => newCheckedVars.add(varName));
    }

    if (node.initializer) {
      this.visit(node.initializer, sourceFile, checker, checkedVars);
    }

    if (node.statement) {
      this.visit(node.statement, sourceFile, checker, newCheckedVars);
    }

    if (node.incrementor) {
      this.visit(node.incrementor, sourceFile, checker, newCheckedVars);
    }
  }

  /**
   * Handle ternary conditional expressions
   */
  private handleConditionalExpression(
    node: ts.ConditionalExpression,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker,
    checkedVars: Set<string>
  ): void {
    const condition = node.condition;
    const { thenNonNull, elseNonNull } = this.extractAllNullChecks(condition, sourceFile);

    const thenCheckedVars = new Set(checkedVars);
    const elseCheckedVars = new Set(checkedVars);
    
    thenNonNull.forEach(v => thenCheckedVars.add(v));
    elseNonNull.forEach(v => elseCheckedVars.add(v));

    this.visit(node.whenTrue, sourceFile, checker, thenCheckedVars);
    this.visit(node.whenFalse, sourceFile, checker, elseCheckedVars);
  }

  /**
   * Handle && expressions (short-circuit null checks)
   */
  private handleAndExpression(
    node: ts.BinaryExpression,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker,
    checkedVars: Set<string>
  ): void {
    const leftCheckedVars = new Set(checkedVars);
    this.visit(node.left, sourceFile, checker, leftCheckedVars);

    // For right side, add any null checks from left
    const rightCheckedVars = new Set(checkedVars);
    const nullCheck = this.extractNullCheck(node.left, sourceFile);
    if (nullCheck && nullCheck.isNonNull) {
      rightCheckedVars.add(nullCheck.variable);
    }

    this.visit(node.right, sourceFile, checker, rightCheckedVars);
  }

  /**
   * Extract null check information from a condition
   */
  private extractNullCheck(condition: ts.Expression, sourceFile: ts.SourceFile): NullCheckInfo | null {
    // x !== null or x !== undefined
    if (ts.isBinaryExpression(condition) && 
        condition.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken) {
      if (this.isNullOrUndefined(condition.right)) {
        return {
          variable: condition.left.getText(sourceFile),
          isNonNull: true,
        };
      }
      if (this.isNullOrUndefined(condition.left)) {
        return {
          variable: condition.right.getText(sourceFile),
          isNonNull: true,
        };
      }
    }

    // x === null or x === undefined
    if (ts.isBinaryExpression(condition) && 
        condition.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken) {
      if (this.isNullOrUndefined(condition.right)) {
        return {
          variable: condition.left.getText(sourceFile),
          isNonNull: false,
        };
      }
      if (this.isNullOrUndefined(condition.left)) {
        return {
          variable: condition.right.getText(sourceFile),
          isNonNull: false,
        };
      }
    }

    // !x (truthy check)
    if (ts.isPrefixUnaryExpression(condition) && 
        condition.operator === ts.SyntaxKind.ExclamationToken) {
      return {
        variable: condition.operand.getText(sourceFile),
        isNonNull: false,
      };
    }

    // x (truthy check)
    if (ts.isIdentifier(condition) || ts.isPropertyAccessExpression(condition)) {
      return {
        variable: condition.getText(sourceFile),
        isNonNull: true,
      };
    }

    return null;
  }

  /**
   * Extract all null checks from a complex condition (handles &&, ||, !)
   */
  private extractAllNullChecks(
    condition: ts.Expression,
    sourceFile: ts.SourceFile
  ): { thenNonNull: Set<string>, elseNonNull: Set<string> } {
    const thenNonNull = new Set<string>();
    const elseNonNull = new Set<string>();

    const extract = (expr: ts.Expression, negate: boolean) => {
      // &&: both sides must be true
      if (ts.isBinaryExpression(expr) && 
          expr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
        extract(expr.left, negate);
        extract(expr.right, negate);
        return;
      }

      // ||: at least one side must be true
      if (ts.isBinaryExpression(expr) && 
          expr.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
        // For ||, we can't make strong assumptions about individual variables
        return;
      }

      // !: negate the check
      if (ts.isPrefixUnaryExpression(expr) && 
          expr.operator === ts.SyntaxKind.ExclamationToken) {
        extract(expr.operand, !negate);
        return;
      }

      // Extract single null check
      const nullCheck = this.extractNullCheck(expr, sourceFile);
      if (nullCheck) {
        const isNonNull = negate ? !nullCheck.isNonNull : nullCheck.isNonNull;
        if (isNonNull) {
          thenNonNull.add(nullCheck.variable);
        } else {
          elseNonNull.add(nullCheck.variable);
        }
      }
    };

    extract(condition, false);
    return { thenNonNull, elseNonNull };
  }

  /**
   * Check Weak<T> variable declaration
   */
  private checkWeakVariableDeclaration(
    node: ts.VariableDeclaration,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker
  ): void {
    // Check if the variable has Weak<T> type annotation
    if (!node.type || !ts.isTypeReferenceNode(node.type)) return;
    
    const typeName = node.type.typeName.getText(sourceFile);
    if (typeName !== 'weak') return;

    // Weak<T> variables should either:
    // 1. Be initialized with null/undefined
    // 2. Be initialized with a value (which we'll track for null checks)
    // 3. Have no initializer (default to undefined)
    // All cases are valid - we just track usage
  }

  /**
   * Check if a property access results in a Weak<T> type
   */
  private isPropertyAccessWeak(
    node: ts.PropertyAccessExpression,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker
  ): boolean {
    const propertySymbol = checker.getSymbolAtLocation(node.name);
    if (!propertySymbol || !propertySymbol.valueDeclaration) {
      return false;
    }
    return this.hasWeakTypeInDeclaration(propertySymbol.valueDeclaration, sourceFile, checker);
  }

  /**
   * Check property access for Weak<T> null-safety
   */
  private checkPropertyAccess(
    node: ts.PropertyAccessExpression,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker,
    checkedVars: Set<string>
  ): void {
    const baseExpr = node.expression;
    const baseText = baseExpr.getText(sourceFile);
    const fullText = node.getText(sourceFile);

    // Debug logging
    // console.log(`Checking property access: ${fullText}`);
    // console.log(`Base: ${baseText}, Property: ${node.name.text}`);
    // console.log(`Checked vars: ${Array.from(checkedVars).join(', ')}`);

    // First, check if the base expression is weak and unchecked
    if (!checkedVars.has(baseText) && this.isWeakType(baseExpr, sourceFile, checker)) {
      this.reportNullCheckRequired(node, baseText, sourceFile);
      return;
    }

    // Second, for nested property access (e.g., this.inner.item.value):
    // Check if the intermediate property (e.g., this.inner.item) is weak and being dereferenced
    // We only care if:
    // 1. The base expression is itself a property access (nested case)
    // 2. That property access results in a weak type
    // 3. It's not already checked
    if (ts.isPropertyAccessExpression(baseExpr) && 
        !checkedVars.has(baseText) && 
        this.isPropertyAccessWeak(baseExpr, sourceFile, checker)) {
      this.reportNullCheckRequired(node, baseText, sourceFile);
    }
  }

  /**
   * Check element access for Weak<T> null-safety
   */
  private checkElementAccess(
    node: ts.ElementAccessExpression,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker,
    checkedVars: Set<string>
  ): void {
    const baseExpr = node.expression;
    const baseText = baseExpr.getText(sourceFile);

    // Skip if already checked
    if (checkedVars.has(baseText)) return;

    // Check if base expression has Weak<T> type
    if (this.isWeakType(baseExpr, sourceFile, checker)) {
      this.reportNullCheckRequired(node, baseText, sourceFile);
    }
  }

  /**
   * Check call expression arguments for Weak<T> values passed to non-nullable parameters
   */
  private checkCallArguments(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker,
    checkedVars: Set<string>
  ): void {
    // Get the signature of the called function
    const signature = checker.getResolvedSignature(node);
    if (!signature) return;

    const parameters = signature.getParameters();
    
    // Check each argument
    for (let i = 0; i < node.arguments.length && i < parameters.length; i++) {
      const arg = node.arguments[i];
      const param = parameters[i];
      
      // Get parameter declaration to check its type
      const paramDecl = param.valueDeclaration;
      if (!paramDecl || !ts.isParameter(paramDecl)) continue;
      
      // Check if argument is a weak expression being passed to non-nullable param
      const argText = arg.getText(sourceFile);
      
      // If the argument is weak and not checked, report error
      if (!checkedVars.has(argText) && this.isWeakType(arg, sourceFile, checker)) {
        // Check if the parameter accepts nullable (has | null | undefined)
        const paramAcceptsNull = this.parameterAcceptsNull(paramDecl, checker);
        
        if (!paramAcceptsNull) {
          this.reportNullCheckRequired(arg, argText, sourceFile);
        }
      }
    }
  }

  /**
   * Check if a parameter type accepts null/undefined
   */
  private parameterAcceptsNull(param: ts.ParameterDeclaration, checker: ts.TypeChecker): boolean {
    if (!param.type) return false;
    
    const type = checker.getTypeFromTypeNode(param.type);
    
    // Check if type includes null or undefined
    if (type.isUnion()) {
      return type.types.some(t => 
        (t.flags & ts.TypeFlags.Null) !== 0 || 
        (t.flags & ts.TypeFlags.Undefined) !== 0
      );
    }
    
    return false;
  }

  /**
   * Report that a null check is required
   */
  private reportNullCheckRequired(
    node: ts.Node,
    varName: string,
    sourceFile: ts.SourceFile
  ): void {
    this.diagnostics.push({
      severity: 'error',
      code: 'GS302',
      message: `Variable '${varName}' must be checked for null before use. ` +
               `Use 'if (${varName} !== null)' or optional chaining '${varName}?.'`,
      location: Parser.getLocation(node, sourceFile),
    });
  }
}
