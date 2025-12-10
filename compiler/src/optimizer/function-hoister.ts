/**
 * Function Hoisting Optimization
 * 
 * Hoists nested functions without closure dependencies to module level.
 * This eliminates closure allocation overhead for recursive functions.
 */

import type {
  IRProgram,
  IRModule,
  IRDeclaration,
  IRFunctionDecl,
  IRFunctionBody,
  IRStatement,
  IRExpression,
  IRParam,
} from '../ir/types.js';

export class FunctionHoister {
  /**
   * Hoist nested functions without closure dependencies to module level
   */
  hoist(program: IRProgram): IRProgram {
    return {
      modules: program.modules.map(m => this.hoistModule(m)),
    };
  }

  private hoistModule(module: IRModule): IRModule {
    const hoistedFunctions: IRFunctionDecl[] = [];
    const transformedDeclarations: IRDeclaration[] = [];

    for (const decl of module.declarations) {
      if (decl.kind === 'function') {
        const result = this.hoistInFunction(decl);
        transformedDeclarations.push(result.function);
        hoistedFunctions.push(...result.hoisted);
      } else {
        transformedDeclarations.push(decl);
      }
    }

    // Prepend hoisted functions to declarations
    return {
      ...module,
      declarations: [...hoistedFunctions, ...transformedDeclarations],
    };
  }

  private hoistInFunction(func: IRFunctionDecl): { function: IRFunctionDecl; hoisted: IRFunctionDecl[] } {
    // Only process AST-level bodies (IRFunctionBody)
    if (!this.isFunctionBody(func.body)) {
      return { function: func, hoisted: [] };
    }

    const hoistedFunctions: IRFunctionDecl[] = [];
    const transformedStatements: IRStatement[] = [];
    
    // Build parent scope (parameters of this function)
    const parentScope = new Set<string>(func.params.map(p => p.name));

    for (const stmt of func.body.statements) {
      if (stmt.kind === 'functionDecl') {
        const hoistResult = this.tryHoistNestedFunction(stmt, parentScope);
        
        if (hoistResult.shouldHoist) {
          // Hoist the function (possibly with extra parameters for closure variables)
          hoistedFunctions.push(hoistResult.hoistedFunction!);
          
          // If there are closure parameters, we need to keep a wrapper in the original location
          if (hoistResult.wrapperStatement) {
            transformedStatements.push(hoistResult.wrapperStatement);
          }
        } else {
          // Keep as nested function (non-recursive)
          transformedStatements.push(stmt);
        }
      } else if (stmt.kind === 'variableDeclaration') {
        // Track variables in scope
        parentScope.add(stmt.name);
        transformedStatements.push(stmt);
      } else {
        transformedStatements.push(stmt);
      }
    }

    return {
      function: {
        ...func,
        body: { statements: transformedStatements },
      },
      hoisted: hoistedFunctions,
    };
  }

  private isFunctionBody(body: any): body is IRFunctionBody {
    return body && 'statements' in body && Array.isArray(body.statements);
  }

  /**
   * Determine if a nested function should be hoisted to module level
   * 
   * Criteria:
   * 1. Function must be recursive (calls itself)
   * 2. Function must not reference variables from parent scope (no closure dependencies)
   */
  /**
   * Try to hoist a nested function, handling closures by adding parameters
   * 
   * Returns:
   * - shouldHoist: whether the function should be hoisted
   * - hoistedFunction: the hoisted function declaration (may have extra params for closures)
   * - wrapperStatement: optional wrapper that calls the hoisted function with closure vars
   */
  private tryHoistNestedFunction(
    func: { kind: 'functionDecl'; name: string; params: IRParam[]; returnType: any; body: IRFunctionBody; async?: boolean; location?: { line: number; column: number } },
    parentScope: Set<string>
  ): { shouldHoist: boolean; hoistedFunction?: IRFunctionDecl; wrapperStatement?: IRStatement } {
    // Check if function is recursive
    const isRecursive = this.isRecursive(func.name, func.body);
    
    // Only hoist recursive functions (C++ lambdas can't be recursive)
    if (!isRecursive) {
      return { shouldHoist: false };
    }
    
    // Check if function has closure dependencies
    const hasClosure = this.hasClosureDependencies(func.body, parentScope, func.params);
    
    if (!hasClosure) {
      // Simple case: no closures, just hoist as-is
      return {
        shouldHoist: true,
        hoistedFunction: {
          kind: 'function',
          name: func.name,
          params: func.params,
          returnType: func.returnType,
          body: func.body,
          async: func.async,
          source: func.location ? {
            file: 'unknown',
            line: func.location.line,
            column: func.location.column,
          } : undefined,
        },
        wrapperStatement: undefined, // No wrapper needed
      };
    }
    
    // Complex case: has closures
    // For now, don't hoist functions with closures
    // TODO: Implement closure parameter passing
    return { shouldHoist: false };
  }

  /**
   * Check if function calls itself (recursive)
   */
  private isRecursive(funcName: string, body: IRFunctionBody): boolean {
    for (const stmt of body.statements) {
      if (this.statementCallsFunction(stmt, funcName)) {
        return true;
      }
    }
    return false;
  }

  private statementCallsFunction(stmt: IRStatement, funcName: string): boolean {
    switch (stmt.kind) {
      case 'expressionStatement':
        return this.expressionCallsFunction(stmt.expression, funcName);
      case 'return':
        return stmt.value ? this.expressionCallsFunction(stmt.value, funcName) : false;
      case 'if':
        return this.expressionCallsFunction(stmt.condition, funcName) ||
               stmt.thenBranch.some(s => this.statementCallsFunction(s, funcName)) ||
               (stmt.elseBranch?.some(s => this.statementCallsFunction(s, funcName)) ?? false);
      case 'while':
        return this.expressionCallsFunction(stmt.condition, funcName) ||
               stmt.body.some(s => this.statementCallsFunction(s, funcName));
      case 'for':
        return (stmt.init ? this.statementCallsFunction(stmt.init, funcName) : false) ||
               (stmt.condition ? this.expressionCallsFunction(stmt.condition, funcName) : false) ||
               (stmt.increment ? this.expressionCallsFunction(stmt.increment, funcName) : false) ||
               stmt.body.some(s => this.statementCallsFunction(s, funcName));
      case 'for-of':
        return this.expressionCallsFunction(stmt.iterable, funcName) ||
               stmt.body.some(s => this.statementCallsFunction(s, funcName));
      case 'variableDeclaration':
        return stmt.initializer ? this.expressionCallsFunction(stmt.initializer, funcName) : false;
      case 'assignment':
        return this.expressionCallsFunction(stmt.value, funcName);
      case 'try':
        return stmt.tryBlock.some(s => this.statementCallsFunction(s, funcName)) ||
               (stmt.catchClause?.body.some(s => this.statementCallsFunction(s, funcName)) ?? false) ||
               (stmt.finallyBlock?.some(s => this.statementCallsFunction(s, funcName)) ?? false);
      case 'throw':
        return this.expressionCallsFunction(stmt.expression, funcName);
      case 'block':
        return stmt.statements.some(s => this.statementCallsFunction(s, funcName));
      case 'functionDecl':
        // Nested function declarations - we check their bodies recursively
        return this.isRecursive(funcName, stmt.body);
      default:
        return false;
    }
  }

  private expressionCallsFunction(expr: IRExpression, funcName: string): boolean {
    switch (expr.kind) {
      case 'call':
        if (expr.callee.kind === 'identifier' && expr.callee.name === funcName) {
          return true;
        }
        return this.expressionCallsFunction(expr.callee, funcName) ||
               expr.arguments.some(arg => this.expressionCallsFunction(arg, funcName));
      case 'binary':
        return this.expressionCallsFunction(expr.left, funcName) ||
               this.expressionCallsFunction(expr.right, funcName);
      case 'unary':
        return this.expressionCallsFunction(expr.operand, funcName);
      case 'conditional':
        return this.expressionCallsFunction(expr.condition, funcName) ||
               this.expressionCallsFunction(expr.thenExpr, funcName) ||
               this.expressionCallsFunction(expr.elseExpr, funcName);
      case 'memberAccess':
        return this.expressionCallsFunction(expr.object, funcName);
      case 'indexAccess':
        return this.expressionCallsFunction(expr.object, funcName) ||
               this.expressionCallsFunction(expr.index, funcName);
      case 'arrayLiteral':
        return expr.elements.some(e => this.expressionCallsFunction(e, funcName));
      case 'objectLiteral':
        return expr.properties.some(p => this.expressionCallsFunction(p.value, funcName));
      // Note: lambda, await don't have nested calls in our IR
      case 'await':
        return this.expressionCallsFunction(expr.expression, funcName);
      default:
        return false;
    }
  }

  /**
   * Check if function references variables from parent scope
   */
  private hasClosureDependencies(body: IRFunctionBody, parentScope: Set<string>, params: IRParam[]): boolean {
    // Build local scope (function's own parameters)
    const localScope = new Set<string>(params.map(p => p.name));
    
    // Track variables declared in the function body
    this.collectLocalVariables(body, localScope);
    
    // Check if any statement references parent scope variables
    return body.statements.some(stmt => this.statementReferencesParentScope(stmt, parentScope, localScope));
  }

  private collectLocalVariables(body: IRFunctionBody, localScope: Set<string>): void {
    for (const stmt of body.statements) {
      this.collectVariablesInStatement(stmt, localScope);
    }
  }

  private collectVariablesInStatement(stmt: IRStatement, localScope: Set<string>): void {
    switch (stmt.kind) {
      case 'variableDeclaration':
        localScope.add(stmt.name);
        break;
      case 'if':
        stmt.thenBranch.forEach(s => this.collectVariablesInStatement(s, localScope));
        stmt.elseBranch?.forEach(s => this.collectVariablesInStatement(s, localScope));
        break;
      case 'while':
      case 'for-of':
        stmt.body.forEach(s => this.collectVariablesInStatement(s, localScope));
        if (stmt.kind === 'for-of') {
          localScope.add(stmt.variable);
        }
        break;
      case 'for':
        if (stmt.init) {
          this.collectVariablesInStatement(stmt.init, localScope);
        }
        stmt.body.forEach(s => this.collectVariablesInStatement(s, localScope));
        break;
      case 'try':
        stmt.tryBlock.forEach(s => this.collectVariablesInStatement(s, localScope));
        if (stmt.catchClause) {
          localScope.add(stmt.catchClause.variable);
          stmt.catchClause.body.forEach(s => this.collectVariablesInStatement(s, localScope));
        }
        stmt.finallyBlock?.forEach(s => this.collectVariablesInStatement(s, localScope));
        break;
      case 'block':
        stmt.statements.forEach(s => this.collectVariablesInStatement(s, localScope));
        break;
      case 'functionDecl':
        // Nested functions create their own scope
        localScope.add(stmt.name);
        break;
    }
  }

  private statementReferencesParentScope(stmt: IRStatement, parentScope: Set<string>, localScope: Set<string>): boolean {
    switch (stmt.kind) {
      case 'expressionStatement':
        return this.expressionReferencesParentScope(stmt.expression, parentScope, localScope);
      case 'return':
        return stmt.value ? this.expressionReferencesParentScope(stmt.value, parentScope, localScope) : false;
      case 'if':
        return this.expressionReferencesParentScope(stmt.condition, parentScope, localScope) ||
               stmt.thenBranch.some(s => this.statementReferencesParentScope(s, parentScope, localScope)) ||
               (stmt.elseBranch?.some(s => this.statementReferencesParentScope(s, parentScope, localScope)) ?? false);
      case 'while':
        return this.expressionReferencesParentScope(stmt.condition, parentScope, localScope) ||
               stmt.body.some(s => this.statementReferencesParentScope(s, parentScope, localScope));
      case 'for':
        return (stmt.init ? this.statementReferencesParentScope(stmt.init, parentScope, localScope) : false) ||
               (stmt.condition ? this.expressionReferencesParentScope(stmt.condition, parentScope, localScope) : false) ||
               (stmt.increment ? this.expressionReferencesParentScope(stmt.increment, parentScope, localScope) : false) ||
               stmt.body.some(s => this.statementReferencesParentScope(s, parentScope, localScope));
      case 'for-of':
        return this.expressionReferencesParentScope(stmt.iterable, parentScope, localScope) ||
               stmt.body.some(s => this.statementReferencesParentScope(s, parentScope, localScope));
      case 'variableDeclaration':
        return stmt.initializer ? this.expressionReferencesParentScope(stmt.initializer, parentScope, localScope) : false;
      case 'assignment':
        // Check if assigning to parent scope variable
        if (parentScope.has(stmt.target) && !localScope.has(stmt.target)) {
          return true;
        }
        return this.expressionReferencesParentScope(stmt.value, parentScope, localScope);
      case 'try':
        return stmt.tryBlock.some(s => this.statementReferencesParentScope(s, parentScope, localScope)) ||
               (stmt.catchClause?.body.some(s => this.statementReferencesParentScope(s, parentScope, localScope)) ?? false) ||
               (stmt.finallyBlock?.some(s => this.statementReferencesParentScope(s, parentScope, localScope)) ?? false);
      case 'throw':
        return this.expressionReferencesParentScope(stmt.expression, parentScope, localScope);
      case 'block':
        return stmt.statements.some(s => this.statementReferencesParentScope(s, parentScope, localScope));
      case 'functionDecl':
        // Nested functions - check their closure dependencies
        return this.hasClosureDependencies(stmt.body, parentScope, stmt.params);
      default:
        return false;
    }
  }

  private expressionReferencesParentScope(expr: IRExpression, parentScope: Set<string>, localScope: Set<string>): boolean {
    switch (expr.kind) {
      case 'identifier':
        // Reference to parent scope if:
        // 1. Variable is in parent scope
        // 2. Variable is NOT in local scope (not shadowed)
        return parentScope.has(expr.name) && !localScope.has(expr.name);
      case 'call':
        return this.expressionReferencesParentScope(expr.callee, parentScope, localScope) ||
               (expr.arguments?.some(arg => this.expressionReferencesParentScope(arg, parentScope, localScope)) ?? false);
      case 'binary':
        return this.expressionReferencesParentScope(expr.left, parentScope, localScope) ||
               this.expressionReferencesParentScope(expr.right, parentScope, localScope);
      case 'unary':
        return this.expressionReferencesParentScope(expr.operand, parentScope, localScope);
      case 'conditional':
        return this.expressionReferencesParentScope(expr.condition, parentScope, localScope) ||
               this.expressionReferencesParentScope(expr.thenExpr, parentScope, localScope) ||
               this.expressionReferencesParentScope(expr.elseExpr, parentScope, localScope);
      case 'memberAccess':
        return this.expressionReferencesParentScope(expr.object, parentScope, localScope);
      case 'indexAccess':
        return this.expressionReferencesParentScope(expr.object, parentScope, localScope) ||
               this.expressionReferencesParentScope(expr.index, parentScope, localScope);
      case 'arrayLiteral':
        return expr.elements.some(e => this.expressionReferencesParentScope(e, parentScope, localScope));
      case 'objectLiteral':
        return expr.properties.some(p => this.expressionReferencesParentScope(p.value, parentScope, localScope));
      // Note: lambda expressions would need special handling, but they're not in our current IR
      case 'await':
        return this.expressionReferencesParentScope(expr.expression, parentScope, localScope);
      default:
        return false;
    }
  }
}
