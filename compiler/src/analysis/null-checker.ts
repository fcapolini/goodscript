/**
 * Phase 2b: Null Safety Checker
 * 
 * Validates use<T> lifetime safety to prevent dangling references.
 * 
 * Key Rules:
 * - use<T> cannot outlive the owned reference (own<T> or share<T>)
 * - use<T> cannot be stored in fields (temporary only)
 * - use<T> cannot be returned from functions
 * - use<T> parameters are valid only within function scope
 * 
 * Error Codes: GS401-GS499
 */

import {
  type IRModule,
  type IRFunctionDecl,
  type IRExpression,
  type IRStatement,
  type IRType,
  type IRClassDecl,
  type IRInterfaceDecl,
  Ownership,
  IRInstruction,
} from '../ir/types.js';

/**
 * Diagnostic message for null safety violations
 */
export interface NullSafetyDiagnostic {
  code: string;
  message: string;
  severity: 'error' | 'warning';
  location: {
    file: string;
    line: number;
    column: number;
  };
}

/**
 * Lifetime scope for tracking use<T> validity
 */
interface LifetimeScope {
  kind: 'function' | 'block';
  useRefs: Set<string>; // Names of use<T> variables
  ownedRefs: Set<string>; // Names of own<T>/share<T> variables
}

/**
 * Null Safety Checker
 * 
 * Ensures use<T> references cannot outlive their owned counterparts.
 * Only enforced in ownership mode (not GC mode).
 */
export class NullChecker {
  private diagnostics: NullSafetyDiagnostic[] = [];
  private scopeStack: LifetimeScope[] = [];
  private memoryMode: 'gc' | 'ownership';

  constructor(memoryMode: 'gc' | 'ownership' = 'ownership') {
    this.memoryMode = memoryMode;
  }

  /**
   * Analyze a module for null safety violations
   * 
   * In GC mode: Analysis is skipped (use<T> lifetime managed by GC)
   * In ownership mode: use<T> lifetime violations are errors
   */
  analyze(module: IRModule): NullSafetyDiagnostic[] {
    // Skip null safety checks in GC mode
    if (this.memoryMode === 'gc') {
      return [];
    }

    this.diagnostics = [];
    this.scopeStack = [];

    // Check classes for use<T> fields (forbidden)
    for (const decl of module.declarations) {
      if (decl.kind === 'class') {
        this.checkClassFields(decl as IRClassDecl, module.path);
      } else if (decl.kind === 'interface') {
        this.checkInterfaceProperties(decl as IRInterfaceDecl, module.path);
      } else if (decl.kind === 'function') {
        this.checkFunction(decl as IRFunctionDecl, module.path);
      }
    }

    return this.diagnostics;
  }

  /**
   * Check class fields for use<T> (GS401)
   */
  private checkClassFields(classDecl: IRClassDecl, modulePath: string): void {
    for (const field of classDecl.fields) {
      if (this.hasUseOwnership(field.type)) {
        this.addError(
          'GS401',
          `Class field '${field.name}' cannot use 'use<T>' ownership. Use 'own<T>' or 'share<T>' instead.`,
          modulePath,
          0,
          0
        );
      }
    }
  }

  /**
   * Check interface properties for use<T> (GS401)
   */
  private checkInterfaceProperties(interfaceDecl: IRInterfaceDecl, modulePath: string): void {
    for (const prop of interfaceDecl.properties) {
      if (this.hasUseOwnership(prop.type)) {
        this.addError(
          'GS401',
          `Interface property '${prop.name}' cannot use 'use<T>' ownership. Use 'own<T>' or 'share<T>' instead.`,
          modulePath,
          prop.location?.line ?? 0,
          prop.location?.column ?? 0
        );
      }
    }
  }

  /**
   * Check function for use<T> violations
   */
  private checkFunction(func: IRFunctionDecl, modulePath: string): void {
    // Enter function scope
    this.pushScope('function');

    // Track use<T> parameters
    for (const param of func.params) {
      if (this.hasUseOwnership(param.type)) {
        this.currentScope().useRefs.add(param.name);
      } else if (this.hasOwningType(param.type)) {
        this.currentScope().ownedRefs.add(param.name);
      }
    }

    // Check return type (GS402)
    if (this.hasUseOwnership(func.returnType)) {
      this.addError(
        'GS402',
        `function '${func.name}' cannot return 'use<T>'. Use 'own<T>' or 'share<T>' instead.`,
        modulePath,
        func.source?.line ?? 0,
        func.source?.column ?? 0
      );
    }

    // Check function body
    if (func.body && func.body.instructions && func.body.instructions.length > 0) {
      for (const instruction of func.body.instructions) {
        this.checkInstruction(instruction, modulePath);
      }
    }

    // Exit function scope
    this.popScope();
  }

  /**
   * Check instruction for use<T> violations
   */
  private checkInstruction(_instruction: IRInstruction, _modulePath: string): void {
    // TODO: Implement instruction-level checking
    // For now, this is a stub
  }

  /**
   * Check statement for use<T> violations
   */
  private checkStatement(stmt: IRStatement, modulePath: string): void {
    switch (stmt.kind) {
      case 'variableDeclaration':
        // Track variable ownership
        if (this.hasUseOwnership(stmt.variableType)) {
          this.currentScope().useRefs.add(stmt.name);
        } else if (this.hasOwningType(stmt.variableType)) {
          this.currentScope().ownedRefs.add(stmt.name);
        }

        // Check initializer
        if (stmt.initializer) {
          this.checkExpression(stmt.initializer, modulePath);
        }
        break;

      case 'return':
        // Check that we're not returning a use<T> variable (GS403)
        if (stmt.value) {
          this.checkReturnExpression(stmt.value, modulePath, stmt.location);
        }
        break;

      case 'if':
        this.checkExpression(stmt.condition, modulePath);
        this.pushScope('block');
        for (const s of stmt.thenBranch) {
          this.checkStatement(s, modulePath);
        }
        this.popScope();
        if (stmt.elseBranch) {
          this.pushScope('block');
          for (const s of stmt.elseBranch) {
            this.checkStatement(s, modulePath);
          }
          this.popScope();
        }
        break;

      case 'while':
        this.checkExpression(stmt.condition, modulePath);
        this.pushScope('block');
        for (const s of stmt.body) {
          this.checkStatement(s, modulePath);
        }
        this.popScope();
        break;

      case 'for':
        this.pushScope('block');
        if (stmt.initializer) {
          this.checkStatement(stmt.initializer, modulePath);
        }
        if (stmt.condition) {
          this.checkExpression(stmt.condition, modulePath);
        }
        if (stmt.increment) {
          this.checkExpression(stmt.increment, modulePath);
        }
        for (const s of stmt.body) {
          this.checkStatement(s, modulePath);
        }
        this.popScope();
        break;

      case 'expressionStatement':
        this.checkExpression(stmt.expression, modulePath);
        break;

      case 'block':
        this.pushScope('block');
        for (const s of stmt.statements) {
          this.checkStatement(s, modulePath);
        }
        this.popScope();
        break;
    }
  }

  /**
   * Check expression for use<T> violations
   */
  private checkExpression(expr: IRExpression, modulePath: string): void {
    switch (expr.kind) {
      case 'call':
        this.checkExpression(expr.callee, modulePath);
        for (const arg of expr.arguments) {
          this.checkExpression(arg, modulePath);
        }
        break;

      case 'memberAccess':
        this.checkExpression(expr.object, modulePath);
        break;

      case 'binary':
        this.checkExpression(expr.left, modulePath);
        this.checkExpression(expr.right, modulePath);
        break;

      case 'unary':
        this.checkExpression(expr.operand, modulePath);
        break;

      case 'assignment':
        this.checkExpression(expr.left, modulePath);
        this.checkExpression(expr.right, modulePath);
        break;

      case 'arrayLiteral':
        for (const element of expr.elements) {
          this.checkExpression(element, modulePath);
        }
        break;

      case 'objectLiteral':
        for (const prop of expr.properties) {
          this.checkExpression(prop.value, modulePath);
        }
        break;
    }
  }

  /**
   * Check return expression for use<T> variables (GS403)
   */
  private checkReturnExpression(
    expr: IRExpression,
    modulePath: string,
    location?: { line: number; column: number }
  ): void {
    // Check if expression is a use<T> variable reference
    if (expr.kind === 'identifier') {
      const varName = expr.name;
      if (this.isUseRef(varName)) {
        this.addError(
          'GS403',
          `Cannot return 'use<T>' reference '${varName}'. Use 'own<T>' or 'share<T>' instead.`,
          modulePath,
          location?.line ?? expr.location?.line ?? 0,
          location?.column ?? expr.location?.column ?? 0
        );
      }
    }
  }

  /**
   * Check if a type has use<T> ownership
   */
  private hasUseOwnership(type: IRType): boolean {
    if (type.kind === 'class' || type.kind === 'interface') {
      return type.ownership === Ownership.Use;
    }
    if (type.kind === 'array') {
      return type.ownership === Ownership.Use || this.hasUseOwnership(type.element);
    }
    if (type.kind === 'map') {
      return (
        type.ownership === Ownership.Use ||
        this.hasUseOwnership(type.key) ||
        this.hasUseOwnership(type.value)
      );
    }
    if (type.kind === 'nullable') {
      return this.hasUseOwnership(type.inner);
    }
    return false;
  }

  /**
   * Check if a type has owning semantics (own<T> or share<T>)
   */
  private hasOwningType(type: IRType): boolean {
    if (type.kind === 'class' || type.kind === 'interface') {
      return type.ownership === Ownership.Own || type.ownership === Ownership.Share;
    }
    if (type.kind === 'array') {
      return (
        type.ownership === Ownership.Own ||
        type.ownership === Ownership.Share ||
        this.hasOwningType(type.element)
      );
    }
    if (type.kind === 'map') {
      return (
        type.ownership === Ownership.Own ||
        type.ownership === Ownership.Share ||
        this.hasOwningType(type.key) ||
        this.hasOwningType(type.value)
      );
    }
    if (type.kind === 'nullable') {
      return this.hasOwningType(type.inner);
    }
    return false;
  }

  /**
   * Check if a variable is a use<T> reference
   */
  private isUseRef(varName: string): boolean {
    for (let i = this.scopeStack.length - 1; i >= 0; i--) {
      if (this.scopeStack[i].useRefs.has(varName)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Push a new lifetime scope
   */
  private pushScope(kind: 'function' | 'block'): void {
    this.scopeStack.push({
      kind,
      useRefs: new Set(),
      ownedRefs: new Set(),
    });
  }

  /**
   * Pop the current lifetime scope
   */
  private popScope(): void {
    this.scopeStack.pop();
  }

  /**
   * Get current scope
   */
  private currentScope(): LifetimeScope {
    return this.scopeStack[this.scopeStack.length - 1];
  }

  /**
   * Add an error diagnostic
   */
  private addError(
    code: string,
    message: string,
    file: string,
    line: number,
    column: number
  ): void {
    this.diagnostics.push({
      code,
      message,
      severity: 'error',
      location: { file, line, column },
    });
  }
}

/**
 * Analyze a module for null safety violations
 * 
 * @param module - The IR module to analyze
 * @param memoryMode - Memory management mode ('gc' or 'ownership')
 */
export function analyzeNullSafety(
  module: IRModule,
  memoryMode: 'gc' | 'ownership' = 'ownership'
): NullSafetyDiagnostic[] {
  const checker = new NullChecker(memoryMode);
  return checker.analyze(module);
}
