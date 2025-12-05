/**
 * Transform Context
 * 
 * Consolidates all state tracking during TypeScript → C++ AST transformation.
 * This replaces 15+ instance variables scattered across AstCodegen with a
 * single, well-organized context object.
 */

import * as ast from './ast';

/**
 * Tracks all contextual information needed during code generation
 */
export class TransformContext {
  // Type and ownership tracking
  readonly enumNames = new Set<string>();
  readonly variableTypes = new Map<string, ast.CppType>();
  readonly templateParameters = new Set<string>();
  readonly interfaceMethods = new Map<string, Set<string>>();
  readonly interfaceNames = new Set<string>();
  
  // Hoisting decisions (made during analysis phase)
  readonly hoistedFunctions = new Set<string>();
  readonly hoistedClasses = new Set<string>();
  readonly hoistedConstants = new Map<string, { type: ast.CppType, value: string }>();
  
  // Null-safety tracking
  readonly unwrappedOptionals = new Set<string>();
  readonly smartPointerNullChecks = new Set<string>();
  readonly pointerVariables = new Set<string>();
  
  // Special variable tracking
  readonly structuredBindingVariables = new Set<string>();
  
  // Current scope context (updated as we traverse)
  currentFunctionReturnType?: ast.CppType;
  currentFunctionIsAsync = false;
  currentClassName?: string;
  currentTemplateParams: string[] = [];
  
  /**
   * Reset context for a new file
   */
  reset(): void {
    this.enumNames.clear();
    this.variableTypes.clear();
    this.templateParameters.clear();
    this.interfaceMethods.clear();
    this.interfaceNames.clear();
    this.hoistedFunctions.clear();
    this.hoistedClasses.clear();
    this.hoistedConstants.clear();
    this.unwrappedOptionals.clear();
    this.smartPointerNullChecks.clear();
    this.pointerVariables.clear();
    this.structuredBindingVariables.clear();
    
    this.currentFunctionReturnType = undefined;
    this.currentFunctionIsAsync = false;
    this.currentClassName = undefined;
    this.currentTemplateParams = [];
  }
  
  /**
   * Push a new function scope context
   */
  enterFunction(returnType?: ast.CppType, isAsync = false): void {
    this.currentFunctionReturnType = returnType;
    this.currentFunctionIsAsync = isAsync;
    // Clear function-local tracking
    this.unwrappedOptionals.clear();
    this.smartPointerNullChecks.clear();
    this.pointerVariables.clear();
  }
  
  /**
   * Pop function scope context
   */
  exitFunction(): void {
    this.currentFunctionReturnType = undefined;
    this.currentFunctionIsAsync = false;
    this.unwrappedOptionals.clear();
    this.smartPointerNullChecks.clear();
    this.pointerVariables.clear();
  }
  
  /**
   * Enter a class context
   */
  enterClass(className: string, templateParams: string[] = []): void {
    this.currentClassName = className;
    this.currentTemplateParams = templateParams;
  }
  
  /**
   * Exit class context
   */
  exitClass(): void {
    this.currentClassName = undefined;
    this.currentTemplateParams = [];
  }
  
  /**
   * Check if a variable is known to be non-null in current scope
   */
  isNonNull(varName: string): boolean {
    return this.unwrappedOptionals.has(varName) || 
           this.smartPointerNullChecks.has(varName);
  }
  
  /**
   * Mark a variable as non-null in current scope
   */
  markNonNull(varName: string, isSmartPointer = false): void {
    if (isSmartPointer) {
      this.smartPointerNullChecks.add(varName);
    } else {
      this.unwrappedOptionals.add(varName);
    }
  }
  
  /**
   * Check if a name refers to a hoisted declaration
   */
  isHoisted(name: string): boolean {
    return this.hoistedFunctions.has(name) || 
           this.hoistedClasses.has(name) ||
           this.hoistedConstants.has(name);
  }
  
  /**
   * Check if we're currently in a class
   */
  isInClass(): boolean {
    return this.currentClassName !== undefined;
  }
  
  /**
   * Check if we're currently in an async function
   */
  isInAsyncFunction(): boolean {
    return this.currentFunctionIsAsync;
  }
  
  /**
   * Get interface methods for a given interface name
   */
  getInterfaceMethods(interfaceName: string): Set<string> | undefined {
    return this.interfaceMethods.get(interfaceName);
  }
  
  /**
   * Register an interface method
   */
  registerInterfaceMethod(interfaceName: string, methodName: string): void {
    if (!this.interfaceMethods.has(interfaceName)) {
      this.interfaceMethods.set(interfaceName, new Set());
    }
    this.interfaceMethods.get(interfaceName)!.add(methodName);
  }
  
  /**
   * Check if a type is an interface
   */
  isInterface(typeName: string): boolean {
    return this.interfaceNames.has(typeName);
  }
  
  /**
   * Check if a variable is a pointer variable (from Map.get(), etc.)
   */
  isPointerVariable(varName: string): boolean {
    return this.pointerVariables.has(varName);
  }
  
  /**
   * Mark a variable as a pointer variable
   */
  markPointerVariable(varName: string): void {
    this.pointerVariables.add(varName);
  }
  
  /**
   * Check if a type name is a template parameter
   */
  isTemplateParameter(name: string): boolean {
    return this.templateParameters.has(name);
  }
  
  /**
   * Register a template parameter
   */
  registerTemplateParameter(name: string): void {
    this.templateParameters.add(name);
  }
  
  /**
   * Unregister a template parameter (when exiting template scope)
   */
  unregisterTemplateParameter(name: string): void {
    this.templateParameters.delete(name);
  }
  
  /**
   * Get or set variable type
   */
  getVariableType(varName: string): ast.CppType | undefined {
    return this.variableTypes.get(varName);
  }
  
  setVariableType(varName: string, type: ast.CppType): void {
    this.variableTypes.set(varName, type);
  }
  
  deleteVariableType(varName: string): void {
    this.variableTypes.delete(varName);
  }
  
  /**
   * Save and restore state for block scoping
   */
  saveScope(): ScopeSnapshot {
    return {
      unwrappedOptionals: new Set(this.unwrappedOptionals),
      smartPointerNullChecks: new Set(this.smartPointerNullChecks),
      pointerVariables: new Set(this.pointerVariables),
    };
  }
  
  restoreScope(snapshot: ScopeSnapshot): void {
    this.unwrappedOptionals.clear();
    snapshot.unwrappedOptionals.forEach(v => this.unwrappedOptionals.add(v));
    
    this.smartPointerNullChecks.clear();
    snapshot.smartPointerNullChecks.forEach(v => this.smartPointerNullChecks.add(v));
    
    this.pointerVariables.clear();
    snapshot.pointerVariables.forEach(v => this.pointerVariables.add(v));
  }
}

/**
 * Snapshot of scope-specific state for save/restore
 */
export interface ScopeSnapshot {
  unwrappedOptionals: Set<string>;
  smartPointerNullChecks: Set<string>;
  pointerVariables: Set<string>;
}
