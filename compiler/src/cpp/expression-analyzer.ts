/**
 * Expression Analysis Utilities
 * 
 * Provides analysis and validation for TypeScript expressions in the context
 * of C++ code generation. Extracted from codegen.ts to improve maintainability.
 */

import * as ts from 'typescript';
import * as ast from './ast';

export interface ExpressionAnalyzerContext {
  // Type checking and tracking
  isPrimitiveType(type: ast.CppType): boolean;
  
  // Access pattern detection  
  isSmartPointerAccess(expr: ts.Expression): boolean;
}

/**
 * Analyzes TypeScript expressions for optimization opportunities and safety validation
 */
export class ExpressionAnalyzer {
  /**
   * Check if a C++ type can be marked const.
   * - Primitives (number, bool): yes
   * - Strings: yes (immutable in TypeScript)
   * - Objects created with new: no (mutable)
   * - Arrays, Maps, Sets: no (mutable collections)
   */
  static isConstableType(type: ast.CppType, initializer?: ts.Expression): boolean {
    const name = type.name;
    
    // Primitives are always constable
    if (ExpressionAnalyzer.isPrimitiveType(type)) {
      return true;
    }
    
    // Strings are constable (immutable in TypeScript)
    if (name === 'gs::String') {
      return true;
    }
    
    // Arrays are mutable - not constable
    if (name.startsWith('gs::Array<')) {
      return false;
    }
    
    // Maps and Sets are mutable - not constable
    if (name.startsWith('gs::Map<') || name.startsWith('gs::Set<')) {
      return false;
    }
    
    // If initialized with 'new', it's a mutable object - not constable
    if (initializer && ts.isNewExpression(initializer)) {
      return false;
    }
    
    // Other cases: default to constable
    return true;
  }
  
  /**
   * Check if a C++ type is a primitive (number, bool)
   */
  static isPrimitiveType(type: ast.CppType): boolean {
    const name = type.name;
    return name === 'double' || name === 'int' || name === 'bool' || 
           name === 'float' || name === 'long' || name === 'short';
  }
  
  /**
   * Check if array access is used as an lvalue (left side of assignment).
   * 
   * Examples:
   * - arr[i] = value → true (assignment)
   * - arr[i] += value → true (compound assignment)
   * - arr[i]++ → true (increment)
   * - const x = arr[i] → false (read)
   */
  static isArrayAccessUsedAsLValue(arrayAccess: ts.ElementAccessExpression): boolean {
    const parent = arrayAccess.parent;
    
    // Check if it's the left side of an assignment
    if (parent && ts.isBinaryExpression(parent) && 
        parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        parent.left === arrayAccess) {
      return true;
    }
    
    // Check if it's used with compound assignment operators (+=, -=, etc.)
    if (parent && ts.isBinaryExpression(parent) && parent.left === arrayAccess) {
      const op = parent.operatorToken.kind;
      if (op === ts.SyntaxKind.PlusEqualsToken ||
          op === ts.SyntaxKind.MinusEqualsToken ||
          op === ts.SyntaxKind.AsteriskEqualsToken ||
          op === ts.SyntaxKind.SlashEqualsToken ||
          op === ts.SyntaxKind.PercentEqualsToken) {
        return true;
      }
    }
    
    // Check if it's used with ++ or --
    if (parent && (ts.isPrefixUnaryExpression(parent) || ts.isPostfixUnaryExpression(parent))) {
      const op = parent.operator;
      if (op === ts.SyntaxKind.PlusPlusToken || op === ts.SyntaxKind.MinusMinusToken) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Check if the array index is simple enough for optimization.
   * Simple indices are: identifiers, numeric literals, or simple arithmetic (i+1, i-1).
   */
  static isSimpleArrayIndex(indexExpr: ts.Expression): boolean {
    // Identifier: arr[i]
    if (ts.isIdentifier(indexExpr)) {
      return true;
    }
    
    // Numeric literal: arr[0]
    if (ts.isNumericLiteral(indexExpr)) {
      return true;
    }
    
    // Simple arithmetic: arr[i + 1] or arr[i - 1]
    if (ts.isBinaryExpression(indexExpr)) {
      const op = indexExpr.operatorToken.kind;
      if ((op === ts.SyntaxKind.PlusToken || op === ts.SyntaxKind.MinusToken) &&
          ts.isIdentifier(indexExpr.left) &&
          ts.isNumericLiteral(indexExpr.right)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Check if array access is within provably safe bounds.
   * Detects patterns like: for (let i = 0; i < arr.length; i++) { arr[i] = ... }
   * where the index is guaranteed to be in bounds.
   * 
   * SAFETY: Only returns true when we can PROVE bounds are safe:
   * - Loop variable matches array index
   * - Loop limit is arr.length or arr.length - N (same array)
   * - Index offset (if any) is accounted for in loop limit
   */
  static isArrayAccessInSafeBounds(arrayAccess: ts.ElementAccessExpression): boolean {
    const indexExpr = arrayAccess.argumentExpression;
    if (!indexExpr) {
      return false;
    }
    
    let indexVar: string | undefined;
    let indexOffset = 0;  // Track offset for arr[i+N] or arr[i-N]
    
    // Handle simple index: arr[j]
    if (ts.isIdentifier(indexExpr)) {
      indexVar = indexExpr.text;
      indexOffset = 0;
    }
    // Handle offset index: arr[j + 1] or arr[j - 1]
    else if (ts.isBinaryExpression(indexExpr) &&
             ts.isIdentifier(indexExpr.left) &&
             ts.isNumericLiteral(indexExpr.right)) {
      indexVar = indexExpr.left.text;
      const offsetValue = parseInt(indexExpr.right.text, 10);
      
      if (indexExpr.operatorToken.kind === ts.SyntaxKind.PlusToken) {
        indexOffset = offsetValue;  // arr[i + 2] -> offset = +2
      } else if (indexExpr.operatorToken.kind === ts.SyntaxKind.MinusToken) {
        indexOffset = -offsetValue;  // arr[i - 1] -> offset = -1
      } else {
        return false; // Unsupported operator
      }
    }
    else {
      return false; // Complex index expression, not safe to optimize
    }
    
    // Walk up the AST to find the containing for loop
    let current: ts.Node = arrayAccess;
    while (current) {
      if (ts.isForStatement(current)) {
        // Check if this is a pattern: for (let i = start; i < limit; i++)
        const init = current.initializer;
        const condition = current.condition;
        
        // Check initialization: let i = 0 or let i = start
        if (init && ts.isVariableDeclarationList(init)) {
          const decl = init.declarations[0];
          
          // IMPORTANT: Check if this loop's variable matches our index variable
          // If not, continue walking up (for nested loops)
          if (!decl || !ts.isIdentifier(decl.name) || decl.name.text !== indexVar) {
            current = current.parent;
            continue; // This is not the right loop, keep searching
          }
          
          // Found the loop with matching index variable
          
          // SAFETY CHECK 1: Verify loop starts at 0 or positive value
          let startsAtZeroOrPositive = false;
          if (decl.initializer) {
            if (ts.isNumericLiteral(decl.initializer)) {
              const initValue = parseInt(decl.initializer.text, 10);
              startsAtZeroOrPositive = initValue >= 0;
            }
          }
          
          if (!startsAtZeroOrPositive) {
            current = current.parent;
            continue;
          }
          
          // SAFETY CHECK 2: Verify upper bound condition
          if (condition && ts.isBinaryExpression(condition)) {
            const left = condition.left;
            const operator = condition.operatorToken.kind;
            const right = condition.right;
            
            // Check if left side is our index variable
            if (ts.isIdentifier(left) && left.text === indexVar) {
              // Check if operator is < or <=
              if (operator === ts.SyntaxKind.LessThanToken || 
                  operator === ts.SyntaxKind.LessThanEqualsToken) {
                
                // Pattern 1: i < arr.length (safe for arr[i] when offset=0)
                if (ts.isPropertyAccessExpression(right) && 
                    right.name.text === 'length') {
                  if (ts.isIdentifier(right.expression) &&
                      ts.isIdentifier(arrayAccess.expression) &&
                      right.expression.text === arrayAccess.expression.text) {
                    // SAFETY: Only safe if offset doesn't push us out of bounds
                    if (indexOffset <= 0) {
                      return true;
                    }
                    return false;
                  }
                }
                
                // Pattern 2: i < arr.length - N (safe when offset accounted for)
                if (ts.isBinaryExpression(right) &&
                    right.operatorToken.kind === ts.SyntaxKind.MinusToken) {
                  const leftOfMinus = right.left;
                  const rightOfMinus = right.right;
                  
                  // Must be arr.length - N
                  if (ts.isPropertyAccessExpression(leftOfMinus) &&
                      leftOfMinus.name.text === 'length' &&
                      ts.isIdentifier(leftOfMinus.expression) &&
                      ts.isIdentifier(arrayAccess.expression) &&
                      leftOfMinus.expression.text === arrayAccess.expression.text) {
                    
                    // SAFETY: Check if loop limit accounts for index offset
                    if (ts.isNumericLiteral(rightOfMinus)) {
                      const limitOffset = parseInt(rightOfMinus.text, 10);
                      if (indexOffset <= limitOffset) {
                        return true;
                      }
                    }
                    else if (indexOffset <= 0) {
                      return true;
                    }
                    
                    return false;
                  }
                }
                
                // Pattern 3: i < (subtraction expression involving array)
                if (ts.isBinaryExpression(right) && indexOffset <= 1) {
                  if (ExpressionAnalyzer.containsSubtraction(right) && 
                      ExpressionAnalyzer.expressionReferencesArray(right, arrayAccess.expression)) {
                    return true;
                  }
                }
              }
            }
          }
        }
      }
      
      current = current.parent;
    }
    
    return false;
  }
  
  /**
   * Check if a binary expression contains any subtraction operations.
   * Used to verify that loop bounds are conservative (won't exceed expected limit).
   */
  private static containsSubtraction(expr: ts.Expression): boolean {
    if (ts.isBinaryExpression(expr)) {
      if (expr.operatorToken.kind === ts.SyntaxKind.MinusToken) {
        return true;
      }
      // Recursively check both sides
      return ExpressionAnalyzer.containsSubtraction(expr.left) || 
             ExpressionAnalyzer.containsSubtraction(expr.right);
    }
    return false;
  }
  
  /**
   * Check if an expression references a specific array (directly or through a variable).
   * Used to verify that loop bounds are related to the array being accessed.
   * 
   * Examples that should match when arrayExpr is "arr":
   * - arr.length
   * - arr.length - 1
   * - n (conservatively assume it might reference arr.length)
   */
  private static expressionReferencesArray(expr: ts.Expression, arrayExpr: ts.Expression): boolean {
    // Direct reference: arr.length
    if (ts.isPropertyAccessExpression(expr) && expr.name.text === 'length') {
      if (ts.isIdentifier(expr.expression) && 
          ts.isIdentifier(arrayExpr) &&
          expr.expression.text === arrayExpr.text) {
        return true;
      }
    }
    
    // Variable reference: conservatively accept any identifier
    // This allows: const n = arr.length; for (i < n - 1)
    if (ts.isIdentifier(expr)) {
      return true;
    }
    
    // Binary expression: recursively check both sides
    if (ts.isBinaryExpression(expr)) {
      return ExpressionAnalyzer.expressionReferencesArray(expr.left, arrayExpr) ||
             ExpressionAnalyzer.expressionReferencesArray(expr.right, arrayExpr);
    }
    
    return false;
  }
}
