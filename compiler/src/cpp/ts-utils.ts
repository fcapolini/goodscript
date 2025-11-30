/**
 * TypeScript AST Utility Functions
 * 
 * Pure functions that analyze TypeScript AST nodes without requiring
 * the code generator's state or context.
 */

import * as ts from 'typescript';

/**
 * Check if an arrow function returns a value (vs void)
 * 
 * @param node Arrow function to analyze
 * @returns true if function returns a value, false if void
 */
export function arrowFunctionHasReturnValue(node: ts.ArrowFunction): boolean {
  // If body is an expression (not a block), it always returns a value
  if (!ts.isBlock(node.body)) {
    return true;
  }
  
  // Check if any return statement has a value
  let hasReturnValue = false;
  const visit = (n: ts.Node): void => {
    if (ts.isReturnStatement(n) && n.expression) {
      hasReturnValue = true;
    }
    // Don't recurse into nested functions
    if (!ts.isFunctionLike(n) || n === node) {
      ts.forEachChild(n, visit);
    }
  };
  visit(node.body);
  
  return hasReturnValue;
}

/**
 * Find instanceof checks in a catch block to determine the exception type
 * 
 * @param block Catch block to analyze
 * @param varName Name of the catch variable
 * @returns Type name from instanceof check, or undefined if not found
 * @example
 * if (e instanceof ValidationError) → "ValidationError"
 */
export function findInstanceofTypeInCatch(block: ts.Block, varName: string): string | undefined {
  let foundType: string | undefined;
  
  const visit = (node: ts.Node): void => {
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword) {
      // Check if left side is the catch variable
      if (ts.isIdentifier(node.left) && node.left.text === varName) {
        foundType = node.right.getText();
      }
    }
    ts.forEachChild(node, visit);
  };
  
  visit(block);
  return foundType;
}

/**
 * Extract variable name from null check expressions
 * 
 * @param expr Expression to analyze
 * @returns Variable name if a null check is found, undefined otherwise
 * @example
 * - x !== null → "x"
 * - x !== undefined → "x"
 * - x !== null && otherCondition → "x"
 */
export function extractNullCheck(expr: ts.Expression, escapeName: (name: string) => string): string | undefined {
  // Handle: x !== null or x !== undefined
  if (ts.isBinaryExpression(expr)) {
    const op = expr.operatorToken.kind;
    if (op === ts.SyntaxKind.ExclamationEqualsEqualsToken || op === ts.SyntaxKind.ExclamationEqualsToken) {
      // Check if comparing with null or undefined
      const isLeftNull = expr.left.kind === ts.SyntaxKind.NullKeyword;
      const isRightNull = expr.right.kind === ts.SyntaxKind.NullKeyword;
      const isLeftUndefined = ts.isIdentifier(expr.left) && expr.left.text === 'undefined';
      const isRightUndefined = ts.isIdentifier(expr.right) && expr.right.text === 'undefined';
      
      if ((isRightNull || isRightUndefined) && ts.isIdentifier(expr.left)) {
        return escapeName(expr.left.text);
      }
      if ((isLeftNull || isLeftUndefined) && ts.isIdentifier(expr.right)) {
        return escapeName(expr.right.text);
      }
    }
    
    // Handle: x !== null && otherCondition
    if (op === ts.SyntaxKind.AmpersandAmpersandToken) {
      // Check left side of &&
      const leftCheck = extractNullCheck(expr.left, escapeName);
      if (leftCheck) return leftCheck;
      
      // Check right side of &&
      const rightCheck = extractNullCheck(expr.right, escapeName);
      if (rightCheck) return rightCheck;
    }
  }
  
  return undefined;
}

/**
 * Check if an expression is a call to Map.get() or similar methods that return pointers
 * 
 * @param node Expression to check
 * @returns true if this is a Map.get() call
 */
export function isMapGetCall(node: ts.Expression): boolean {
  if (!ts.isCallExpression(node)) return false;
  if (!ts.isPropertyAccessExpression(node.expression)) return false;
  
  const methodName = node.expression.name.text;
  // Map.get(), Array operator[], etc. return pointers
  return methodName === 'get';
}

/**
 * Determine if a method should be marked as const
 * 
 * Methods that don't modify member variables should be const.
 * 
 * @param method Method declaration to analyze
 * @returns true if method should be const, false if it mutates state
 */
export function shouldMethodBeConst(method: ts.MethodDeclaration): boolean {
  // Check if method body has any mutations to 'this' or its properties
  if (!method.body) {
    return true; // Abstract methods can be const
  }
  
  let hasMutation = false;
  const visit = (node: ts.Node): void => {
    // Check for direct assignments to this.field
    if (ts.isBinaryExpression(node) && 
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      if (ts.isPropertyAccessExpression(node.left) &&
          node.left.expression.kind === ts.SyntaxKind.ThisKeyword) {
        hasMutation = true;
      }
      // Also check for assignments to this.field.property (e.g., this.items.length = n)
      // which becomes this.items.resize(n) in C++
      if (ts.isPropertyAccessExpression(node.left) &&
          ts.isPropertyAccessExpression(node.left.expression) &&
          node.left.expression.expression.kind === ts.SyntaxKind.ThisKeyword) {
        hasMutation = true;
      }
    }
    
    // Check for increment/decrement operators on this.field (e.g., this.size++)
    if ((ts.isPostfixUnaryExpression(node) || ts.isPrefixUnaryExpression(node)) &&
        ts.isPropertyAccessExpression(node.operand) &&
        node.operand.expression.kind === ts.SyntaxKind.ThisKeyword) {
      hasMutation = true;
    }
    
    // Check for method calls on this that might mutate
    // e.g., this.divide() where divide is non-const
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      if (node.expression.expression.kind === ts.SyntaxKind.ThisKeyword) {
        // Calling a method on this - conservatively assume it might mutate
        // (We could check if the called method is const, but that requires tracking)
        hasMutation = true;
      }
    }
    
    // Check for method calls on this.field that mutate state
    // e.g., this.map.set(), this.array.push(), this.array.resize()
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const methodName = node.expression.name.text;
      const mutatingMethods = ['set', 'push', 'pop', 'shift', 'unshift', 'splice', 'delete', 'delete_', 'clear', 'resize'];
      
      if (mutatingMethods.includes(methodName)) {
        // Check if this is called on a this.field
        const obj = node.expression.expression;
        if (ts.isPropertyAccessExpression(obj) && 
            obj.expression.kind === ts.SyntaxKind.ThisKeyword) {
          hasMutation = true;
        }
      }
    }
    
    ts.forEachChild(node, visit);
  };
  
  visit(method.body);
  
  return !hasMutation;
}

/**
 * Determine if a parameter should be passed by const reference in C++
 * 
 * @param typeNode TypeScript type node to analyze
 * @returns true if should be passed by const ref, false if by value
 */
export function shouldPassByConstRef(typeNode: ts.TypeNode | undefined): boolean {
  if (!typeNode) return false;
  
  const typeText = typeNode.getText();
  
  // String should be passed by const ref
  if (typeText === 'string') return true;
  
  // Arrays are passed by mutable ref, not const ref (unless in constructor)
  if (ts.isArrayTypeNode(typeNode)) return false;
  
  // Class/interface types should be passed by const ref
  // Primitives (number, boolean) should be passed by value
  if (typeText === 'number' || typeText === 'boolean') return false;
  
  // If it's a type reference (custom type name), pass by const ref
  if (ts.isTypeReferenceNode(typeNode)) return true;
  
  return false;
}

/**
 * Determine if a parameter should be passed by mutable reference in C++
 * 
 * @param typeNode TypeScript type node to analyze
 * @returns true if should be passed by mutable ref, false otherwise
 */
export function shouldPassByMutableRef(typeNode: ts.TypeNode | undefined): boolean {
  if (!typeNode) return false;
  
  // Arrays should be passed by mutable reference
  if (ts.isArrayTypeNode(typeNode)) return true;
  
  return false;
}
