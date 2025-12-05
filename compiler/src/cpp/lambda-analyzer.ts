/**
 * Lambda and Closure Analysis Utilities
 * 
 * Provides analysis for arrow functions, lambdas, and closure detection.
 * Extracted from codegen.ts to improve maintainability.
 */

import * as ts from 'typescript';

/**
 * Analyzes lambda functions and closures for C++ code generation
 */
export class LambdaAnalyzer {
  /**
   * Check if a lambda function modifies a parameter (e.g., assigns to array elements)
   * 
   * This is important for determining capture modes in C++ lambdas.
   * If a parameter is modified, it needs to be captured by reference [&param].
   */
  static doesLambdaModifyParameter(node: ts.ArrowFunction, paramName: string): boolean {
    const checkNode = (n: ts.Node): boolean => {
      // Check for assignments to array elements: arr[i] = value
      if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        const left = n.left;
        // Check if left side is an element access on the parameter
        if (ts.isElementAccessExpression(left)) {
          const objName = left.expression.getText();
          if (objName === paramName) {
            return true; // Found assignment to parameter array element
          }
        }
      }
      
      // Recursively check children
      return ts.forEachChild(n, checkNode) || false;
    };
    
    return checkNode(node.body);
  }
  
  /**
   * Check if source file contains async functions/methods/arrow functions
   * Returns true if cppcoro support is needed
   */
  static sourceFileHasAsync(sourceFile: ts.SourceFile): boolean {
    const checkNode = (node: ts.Node): boolean => {
      // Check for async keyword on functions/methods
      if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || 
           ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
          node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword)) {
        return true;
      }
      
      // Check for await expressions
      if (ts.isAwaitExpression(node)) {
        return true;
      }
      
      // Recursively check children
      return ts.forEachChild(node, checkNode) ?? false;
    };
    
    return checkNode(sourceFile);
  }
  
  /**
   * Check if an arrow function uses any variables from the enclosing scope (closure)
   * Returns true if the function captures external variables, false otherwise
   * 
   * This determines whether the function can be hoisted to top-level (no closure)
   * or must remain inline as a C++ lambda (has closure).
   */
  static arrowFunctionUsesClosure(
    node: ts.ArrowFunction, 
    sourceFile: ts.SourceFile, 
    functionName?: string
  ): boolean {
    // Collect parameter names to exclude from closure check
    const paramNames = new Set<string>();
    for (const param of node.parameters) {
      paramNames.add(param.name.getText());
    }
    
    // Collect all top-level declarations in the source file
    const topLevelNames = new Set<string>();
    for (const stmt of sourceFile.statements) {
      if (ts.isFunctionDeclaration(stmt) && stmt.name) {
        topLevelNames.add(stmt.name.text);
      } else if (ts.isVariableStatement(stmt)) {
        for (const decl of stmt.declarationList.declarations) {
          topLevelNames.add(decl.name.getText());
        }
      } else if (ts.isClassDeclaration(stmt) && stmt.name) {
        topLevelNames.add(stmt.name.text);
      } else if (ts.isInterfaceDeclaration(stmt)) {
        topLevelNames.add(stmt.name.text);
      } else if (ts.isEnumDeclaration(stmt)) {
        topLevelNames.add(stmt.name.text);
      }
    }
    
    // Check if function body references any external variables
    const checkForClosure = (n: ts.Node): boolean => {
      // Check for identifier references
      if (ts.isIdentifier(n)) {
        const name = n.text;
        
        // Skip if it's a parameter
        if (paramNames.has(name)) {
          return false;
        }
        
        // Skip if it's the function's own name (recursion)
        if (functionName && name === functionName) {
          return false;
        }
        
        // Skip built-in globals
        const builtIns = ['console', 'Math', 'Array', 'String', 'Number', 'Object', 
                         'JSON', 'Date', 'RegExp', 'Error', 'Promise', 'Set', 'Map',
                         'undefined', 'null', 'true', 'false', 'NaN', 'Infinity'];
        if (builtIns.includes(name)) {
          return false;
        }
        
        // Skip top-level declarations (these are hoisted, not closures)
        if (topLevelNames.has(name)) {
          return false;
        }
        
        // Skip type names (they don't create closures)
        const parent = n.parent;
        if (parent && (ts.isTypeReferenceNode(parent) || ts.isTypeQueryNode(parent))) {
          return false;
        }
        
        // If we get here, it's likely a closure variable
        return true;
      }
      
      // Recursively check children
      return ts.forEachChild(n, checkForClosure) ?? false;
    };
    
    return checkForClosure(node.body);
  }
}
