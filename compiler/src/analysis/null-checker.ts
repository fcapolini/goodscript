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
  type IRExpr,
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
    // Support both AST-level (IRFunctionBody) and SSA-level (IRBlock) bodies
    if (func.body && 'instructions' in func.body) {
      // SSA-level body (IRBlock) - used in tests
      for (const instruction of func.body.instructions) {
        this.checkInstruction(instruction, modulePath);
      }
      if (func.body.terminator) {
        this.checkTerminator(func.body.terminator, modulePath, func.returnType);
      }
    }
    // TODO: Check AST-level function body statements (IRFunctionBody)
    // For now, skip null-checking of AST-level bodies
    // This will be implemented when we add proper AST-level analysis

    // Exit function scope
    this.popScope();
  }

  /**
   * Check instruction for use<T> violations
   */
  private checkInstruction(instruction: IRInstruction, modulePath: string): void {
    switch (instruction.kind) {
      case 'assign':
        // Track variable ownership based on assignment type
        if (this.hasUseOwnership(instruction.type)) {
          this.currentScope().useRefs.add(instruction.target.name);
        } else if (this.hasOwningType(instruction.type)) {
          this.currentScope().ownedRefs.add(instruction.target.name);
        }
        // Check the value expression
        this.checkExpression(instruction.value, modulePath);
        break;

      case 'call':
        // Check callee and arguments
        this.checkExpression(instruction.callee, modulePath);
        for (const arg of instruction.args) {
          this.checkExpression(arg, modulePath);
        }
        break;

      case 'fieldAssign':
        this.checkExpression(instruction.object, modulePath);
        this.checkExpression(instruction.value, modulePath);
        break;

      case 'expr':
        this.checkExpression(instruction.value, modulePath);
        break;
    }
  }

  /**
   * Check terminator for use<T> violations (GS403)
   */
  private checkTerminator(terminator: any, modulePath: string, _returnType: any): void {
    if (terminator.kind === 'return' && terminator.value) {
      // Check if returning a use<T> variable
      if (terminator.value.kind === 'variable') {
        const varName = terminator.value.name;
        if (this.currentScope().useRefs.has(varName)) {
          this.addError(
            'GS403',
            `Cannot return 'use<T>' variable '${varName}'. Convert to owned or shared reference first.`,
            modulePath,
            0,
            0
          );
        }
      }
      // Check the return value expression
      this.checkExpression(terminator.value, modulePath);
    }
  }

  /**
   * Check statement for use<T> violations
   * @deprecated This method is for AST-level IR. Use checkInstruction for SSA-level IR.
   */
  // @ts-expect-error - Deprecated method for old AST-level IR
  private checkStatement(_stmt: IRStatement, _modulePath: string): void {
    // This method is no longer used with IRBlock-based functions
    // All checking is now done via checkInstruction and terminator analysis
  }

  /**
   * Check expression for use<T> violations
   */
  private checkExpression(expr: IRExpr, modulePath: string): void {
    switch (expr.kind) {
      case 'callExpr':
        this.checkExpression(expr.callee, modulePath);
        for (const arg of expr.args) {
          this.checkExpression(arg, modulePath);
        }
        break;

      case 'member':
        this.checkExpression(expr.object, modulePath);
        break;

      case 'index':
        this.checkExpression(expr.object, modulePath);
        this.checkExpression(expr.index, modulePath);
        break;

      case 'binary':
        this.checkExpression(expr.left, modulePath);
        this.checkExpression(expr.right, modulePath);
        break;

      case 'unary':
        this.checkExpression(expr.operand, modulePath);
        break;

      case 'array':
        for (const element of expr.elements) {
          this.checkExpression(element, modulePath);
        }
        break;

      case 'object':
        for (const prop of expr.properties) {
          this.checkExpression(prop.value, modulePath);
        }
        break;

      case 'move':
      case 'borrow':
        this.checkExpression(expr.source, modulePath);
        break;

      // Base cases: literal, variable, new
      case 'literal':
      case 'variable':
      case 'new':
        // No nested expressions to check
        break;
    }
  }

  /**
   * Check return expression for use<T> variables (GS403)
   */
  // @ts-expect-error - Temporarily unused, will be used when SSA-level analysis is implemented
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private checkReturnExpression(
    _expr: IRExpr,
    _modulePath: string,
    _location?: { line: number; column: number }
  ): void {
    // Check if expression is a use<T> variable reference
    if (_expr.kind === 'variable') {
      const varName = _expr.name;
      if (this.isUseRef(varName)) {
        this.addError(
          'GS403',
          `Cannot return 'use<T>' reference '${varName}'. Use 'own<T>' or 'share<T>' instead.`,
          _modulePath,
          _location?.line ?? _expr.source?.line ?? 0,
          _location?.column ?? _expr.source?.column ?? 0
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
