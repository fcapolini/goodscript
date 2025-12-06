/**
 * ClassDeclarationHandler - Handles translation of TypeScript class declarations to C++
 * 
 * Extracted from AstCodegen (Phase 8) to improve maintainability.
 * Handles:
 * - Class fields (static, optional, ownership types)
 * - Constructors with super() calls
 * - Methods (async, static, const, virtual, override)
 * - Generic classes with template parameters
 * - Class inheritance (extends, implements)
 * - Interface method detection
 */

import ts from 'typescript';
import * as ast from './ast';
import { cpp } from './builder';
import * as cppUtils from './cpp-utils';
import * as tsUtils from './ts-utils';
import { TransformContext } from './transform-context';
import { OwnershipAwareTypeChecker } from './ownership-aware-type-checker';

export class ClassDeclarationHandler {
  constructor(
    private readonly checker: ts.TypeChecker | undefined,
    private readonly ctx: TransformContext,
    private readonly ownershipChecker: OwnershipAwareTypeChecker,
    private readonly mapType: (typeNode: ts.TypeNode | undefined) => ast.CppType,
    private readonly mapHeritageType: (expr: ts.ExpressionWithTypeArguments) => string,
    private readonly visitBlock: (node: ts.Block) => ast.Block,
    private readonly processConstructorBody: (
      body: ts.Block | undefined,
      baseClass: string | undefined
    ) => { initList: ast.MemberInitializer[]; body: ast.Block },
    private readonly getInterfaceMethodNames: (interfaceNames: string[]) => Set<string>
  ) {}

  /**
   * Handle class declaration
   */
  handleClass(node: ts.ClassDeclaration): ast.Class | undefined {
    if (!node.name) return undefined;
    
    const name = cppUtils.escapeName(node.name.text);
    
    // Handle template parameters
    const templateParams = this.collectTemplateParameters(node);
    
    // Enter class scope
    this.ctx.enterClass(name, templateParams);
    
    // Handle inheritance
    const { baseClass, baseClasses } = this.collectInheritance(node);
    
    // Collect class members
    const fields = this.collectFields(node, name);
    const constructors = this.collectConstructors(node, baseClass);
    const methods = this.collectMethods(node, baseClasses);
    
    // Special case: error classes inherit from std::exception
    const finalBaseClass = this.handleErrorClass(name, baseClass);
    
    // Exit class scope
    this.ctx.exitClass();
    
    // Clean up template parameters
    this.cleanupTemplateParameters(node);
    
    return new ast.Class(
      name,
      fields,
      constructors,
      methods,
      finalBaseClass,
      templateParams,
      false,
      baseClasses
    );
  }

  /**
   * Collect template parameters for generic classes
   */
  private collectTemplateParameters(node: ts.ClassDeclaration): string[] {
    const templateParams: string[] = [];
    
    if (node.typeParameters) {
      for (const typeParam of node.typeParameters) {
        const paramName = typeParam.name.text;
        templateParams.push(paramName);
        this.ctx.registerTemplateParameter(paramName);
      }
    }
    
    return templateParams;
  }

  /**
   * Collect inheritance information (extends, implements)
   */
  private collectInheritance(node: ts.ClassDeclaration): {
    baseClass: string | undefined;
    baseClasses: string[];
  } {
    let baseClass: string | undefined;
    const baseClasses: string[] = [];
    
    if (node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
          // extends - single base class
          if (clause.types.length > 0) {
            baseClass = this.mapHeritageType(clause.types[0]);
          }
        } else if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
          // implements - multiple interfaces
          for (const type of clause.types) {
            const baseTypeName = type.expression.getText();
            // Skip Iterable<T> - it's a marker interface in TypeScript
            // In C++, classes just need to have __iterator() method
            if (baseTypeName !== 'Iterable') {
              baseClasses.push(this.mapHeritageType(type));
            }
          }
        }
      }
    }
    
    return { baseClass, baseClasses };
  }

  /**
   * Collect class fields
   */
  private collectFields(node: ts.ClassDeclaration, className: string): ast.Field[] {
    const fields: ast.Field[] = [];
    
    for (const member of node.members) {
      if (ts.isPropertyDeclaration(member)) {
        const field = this.processField(member, className);
        if (field) {
          fields.push(field);
        }
      }
    }
    
    return fields;
  }

  /**
   * Process a single field declaration
   */
  private processField(member: ts.PropertyDeclaration, className: string): ast.Field | undefined {
    const fieldName = cppUtils.escapeName(member.name.getText());
    let fieldType = member.type ? this.mapType(member.type) : new ast.CppType('auto');
    
    // Check if property is static
    const isStatic = member.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword) ?? false;
    
    // Handle static numeric constants
    if (isStatic && member.initializer && ts.isNumericLiteral(member.initializer)) {
      const value = member.initializer.text;
      const initValue = cpp.literal(parseFloat(value));
      fieldType = new ast.CppType('static constexpr double');
      return new ast.Field(fieldName, fieldType, ast.AccessSpecifier.Public, initValue);
    }
    
    // Skip other static properties (not supported yet)
    if (isStatic) {
      return undefined;
    }
    
    // Handle optional fields
    const isOptional = member.questionToken !== undefined;
    if (isOptional) {
      const innerType = fieldType.toString();
      fieldType = new ast.CppType(`std::optional<${innerType}>`);
    }
    
    // Register property with ownership checker
    this.ownershipChecker.registerProperty(className, fieldName, member);
    
    // Track field types
    this.ctx.variableTypes.set(`this.${fieldName}`, fieldType);
    
    return new ast.Field(fieldName, fieldType);
  }

  /**
   * Collect constructors
   */
  private collectConstructors(
    node: ts.ClassDeclaration,
    baseClass: string | undefined
  ): ast.Constructor[] {
    const constructors: ast.Constructor[] = [];
    
    for (const member of node.members) {
      if (ts.isConstructorDeclaration(member)) {
        const params = this.collectParameters(member.parameters, false, true);
        const { initList, body } = this.processConstructorBody(member.body, baseClass);
        constructors.push(new ast.Constructor(params, initList, body));
      }
    }
    
    return constructors;
  }

  /**
   * Collect methods
   */
  private collectMethods(
    node: ts.ClassDeclaration,
    baseClasses: string[]
  ): ast.Method[] {
    const methods: ast.Method[] = [];
    
    for (const member of node.members) {
      if (ts.isMethodDeclaration(member)) {
        const method = this.processMethod(member, baseClasses);
        if (method) {
          methods.push(method);
        }
      }
    }
    
    return methods;
  }

  /**
   * Process a single method declaration
   */
  private processMethod(
    member: ts.MethodDeclaration,
    baseClasses: string[]
  ): ast.Method | undefined {
    // Handle computed property names like [Symbol.iterator]
    let methodName: string;
    if (ts.isComputedPropertyName(member.name)) {
      const expr = member.name.expression;
      // Check for Symbol.iterator
      if (ts.isPropertyAccessExpression(expr) &&
          ts.isIdentifier(expr.expression) &&
          expr.expression.text === 'Symbol' &&
          ts.isIdentifier(expr.name) &&
          expr.name.text === 'iterator') {
        methodName = '__iterator';  // Map [Symbol.iterator] → __iterator
      } else {
        // Other computed names not supported yet
        methodName = cppUtils.escapeName(member.name.getText());
      }
    } else {
      methodName = cppUtils.escapeName(member.name.getText());
    }
    
    const isAsync = member.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
    const isStatic = member.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword) ?? false;
    
    // Extract method-level type parameters
    const templateParams: string[] = [];
    if (member.typeParameters) {
      for (const typeParam of member.typeParameters) {
        templateParams.push(typeParam.name.text);
      }
    }
    
    // Register template parameters in context
    const previousTemplateParams = new Set(this.ctx.templateParameters);
    for (const param of templateParams) {
      this.ctx.templateParameters.add(param);
    }
    
    // Get return type
    const returnType = this.inferMethodReturnType(member, isAsync);
    
    // Track return type for the method body
    const previousReturnType = this.ctx.currentFunctionReturnType;
    const previousIsAsync = this.ctx.currentFunctionIsAsync;
    this.ctx.currentFunctionReturnType = returnType;
    this.ctx.currentFunctionIsAsync = isAsync;
    
    // Collect parameters
    const params = this.collectParameters(member.parameters, true, false);
    
    // Visit method body
    const body = member.body ? this.visitBlock(member.body) : new ast.Block([]);
    
    // Clean up parameter tracking
    this.cleanupParameters(member.parameters);
    
    // Restore previous return type and template params
    this.ctx.currentFunctionReturnType = previousReturnType;
    this.ctx.currentFunctionIsAsync = previousIsAsync;
    // Restore template params by clearing and re-adding (can't reassign readonly Set)
    this.ctx.templateParameters.clear();
    for (const param of previousTemplateParams) {
      this.ctx.templateParameters.add(param);
    }
    
    // Determine method attributes
    const interfaceMethodNames = this.getInterfaceMethodNames(baseClasses);
    const isVirtual = interfaceMethodNames.has(methodName);
    const isOverride = interfaceMethodNames.has(methodName);
    const isConst = isOverride ? true : (!isStatic && tsUtils.shouldMethodBeConst(member));
    
    return new ast.Method(
      methodName,
      returnType,
      params,
      body,
      ast.AccessSpecifier.Public,
      isConst,
      isStatic,
      isVirtual,
      false,
      isOverride,
      false,
      isAsync,
      templateParams
    );
  }

  /**
   * Infer method return type
   */
  private inferMethodReturnType(member: ts.MethodDeclaration, isAsync: boolean): ast.CppType {
    // If explicit type annotation exists
    if (member.type) {
      const typeText = member.type.getText();
      if (typeText.startsWith('Promise<')) {
        // Promise<T> will be mapped to cppcoro::task<T>
        return this.mapType(member.type);
      } else {
        const baseType = this.mapType(member.type);
        return isAsync ? cpp.task(baseType) : baseType;
      }
    }
    
    // Use TypeChecker to infer
    if (this.checker) {
      const signature = this.checker.getSignatureFromDeclaration(member);
      if (signature) {
        const tsReturnType = signature.getReturnType();
        const returnTypeStr = this.checker.typeToString(tsReturnType);
        const baseType = this.mapReturnTypeString(returnTypeStr, isAsync);
        return isAsync ? cpp.task(baseType) : baseType;
      }
    }
    
    // Default
    return isAsync ? cpp.task(new ast.CppType('void')) : new ast.CppType('void');
  }

  /**
   * Map return type string to C++ type
   */
  private mapReturnTypeString(returnTypeStr: string, isAsync: boolean): ast.CppType {
    // For async methods, unwrap Promise<T> to get T
    if (isAsync && returnTypeStr.startsWith('Promise<')) {
      const innerMatch = returnTypeStr.match(/Promise<(.+)>/);
      if (innerMatch) {
        const innerTypeStr = innerMatch[1];
        return this.mapBasicType(innerTypeStr);
      }
      return new ast.CppType('void');
    }
    
    return this.mapBasicType(returnTypeStr);
  }

  /**
   * Map basic TypeScript types to C++
   */
  private mapBasicType(typeStr: string): ast.CppType {
    switch (typeStr) {
      case 'number': return new ast.CppType('double');
      case 'string': return new ast.CppType('gs::String');
      case 'boolean': return new ast.CppType('bool');
      case 'void': return new ast.CppType('void');
      default: return new ast.CppType('auto');
    }
  }

  /**
   * Collect parameters from parameter list
   */
  private collectParameters(
    parameters: ts.NodeArray<ts.ParameterDeclaration>,
    trackTypes: boolean,
    inConstructor: boolean = false
  ): ast.Parameter[] {
    const params: ast.Parameter[] = [];
    
    for (const param of parameters) {
      const paramName = cppUtils.escapeName(param.name.getText());
      let paramType = param.type ? this.mapType(param.type) : new ast.CppType('auto');
      
      // Handle optional parameters
      const isOptional = param.questionToken !== undefined;
      if (isOptional) {
        const innerType = paramType.toString();
        paramType = new ast.CppType(`std::optional<${innerType}>`);
      }
      
      // Determine pass-by-reference strategy
      // In constructors, arrays should be passed by const ref (they're just assigned to fields)
      let passByConstRef: boolean;
      let passByMutableRef: boolean;
      
      if (inConstructor && param.type && ts.isArrayTypeNode(param.type)) {
        passByConstRef = true;
        passByMutableRef = false;
      } else {
        passByConstRef = tsUtils.shouldPassByConstRef(param.type);
        passByMutableRef = tsUtils.shouldPassByMutableRef(param.type);
      }
      
      params.push(new ast.Parameter(paramName, paramType, undefined, passByConstRef, passByMutableRef));
      
      // Track parameter types if needed
      if (trackTypes) {
        this.ctx.variableTypes.set(paramName, paramType);
        this.ownershipChecker.registerVariable(paramName, param);
      }
    }
    
    return params;
  }

  /**
   * Clean up parameter tracking after method processing
   */
  private cleanupParameters(parameters: ts.NodeArray<ts.ParameterDeclaration>): void {
    for (const param of parameters) {
      const paramName = cppUtils.escapeName(param.name.getText());
      this.ctx.variableTypes.delete(paramName);
    }
  }

  /**
   * Handle error class inheritance
   */
  private handleErrorClass(name: string, baseClass: string | undefined): string | undefined {
    if (name.endsWith('Error') && !baseClass) {
      return 'std::exception';
    }
    return baseClass;
  }

  /**
   * Clean up template parameters after class processing
   */
  private cleanupTemplateParameters(node: ts.ClassDeclaration): void {
    if (node.typeParameters) {
      for (const typeParam of node.typeParameters) {
        this.ctx.unregisterTemplateParameter(typeParam.name.text);
      }
    }
  }
}
