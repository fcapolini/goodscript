/**
 * CallExpressionHandler - Handles translation of TypeScript call expressions to C++
 * 
 * Extracted from AstCodegen (Phase 6) to improve maintainability.
 * Handles:
 * - Method calls (obj.method(args))
 * - Static method calls (Class.method(args))
 * - Built-in functions (console.log, Math.max, JSON.stringify, etc.)
 * - Array/Map/Set method calls with smart pointer handling
 * - Number instance methods (toFixed, toString, etc.)
 * - Lambda arguments (reduce, map, etc.)
 * - Interface parameter auto-dereferencing
 */

import ts from 'typescript';
import * as ast from './ast';
import { cpp } from './builder';
import * as cppUtils from './cpp-utils';
import * as tsUtils from './ts-utils';
import { TransformContext } from './transform-context';
import { OwnershipAwareTypeChecker } from './ownership-aware-type-checker';

export class CallExpressionHandler {
  constructor(
    private readonly checker: ts.TypeChecker | undefined,
    private readonly ctx: TransformContext,
    private readonly ownershipChecker: OwnershipAwareTypeChecker,
    private readonly visitExpression: (node: ts.Expression) => ast.Expression,
    private readonly getCurrentClassName: () => string | undefined,
    private readonly isSmartPointerAccess: (expr: ts.Expression) => boolean
  ) {}

  /**
   * Handle call expression: function calls and method calls
   */
  handleCall(node: ts.CallExpression): ast.Expression {
    // Handle property access: obj.method(args) first to get method name
    let methodName: string | undefined;
    let objNode: ts.Expression | undefined;
    
    if (ts.isPropertyAccessExpression(node.expression)) {
      methodName = cppUtils.escapeName(node.expression.name.text);
      objNode = node.expression.expression;
    }
    
    // Visit arguments and apply special handling
    const args = this.processArguments(node, methodName, objNode);
    
    // Handle property access: obj.method(args)
    if (ts.isPropertyAccessExpression(node.expression) && objNode && methodName) {
      return this.handleMethodCall(node, objNode, methodName, args);
    }
    
    // Regular function call
    return this.handleRegularCall(node, args);
  }

  /**
   * Process call arguments with special handling for array methods, reduce, etc.
   */
  private processArguments(
    node: ts.CallExpression,
    methodName: string | undefined,
    objNode: ts.Expression | undefined
  ): ast.Expression[] {
    return node.arguments.map((arg, index) => {
      let argExpr = this.visitExpression(arg);
      
      // Special handling for .push() on Array<share<T>> and Array<use<T>>
      if (methodName === 'push' && index === 0 && objNode && this.checker) {
        argExpr = this.handlePushArgument(arg, objNode, argExpr);
      }
      
      // Special handling for .reduce() initial value
      if (methodName === 'reduce' && index === 1 && ts.isNumericLiteral(arg) && this.checker) {
        argExpr = this.handleReduceInitialValue(node, arg, argExpr);
      }
      
      return argExpr;
    });
  }

  /**
   * Handle push() argument wrapping for smart pointer arrays
   */
  private handlePushArgument(
    arg: ts.Expression,
    objNode: ts.Expression,
    argExpr: ast.Expression
  ): ast.Expression {
    // Use OwnershipAwareTypeChecker to check if array has smart pointer elements
    const arrayHasSharedElements = this.ownershipChecker.hasSmartPointerElements(objNode, this.ctx.interfaceNames);
    
    if (arrayHasSharedElements) {
      // Get the element type from the array type
      const arrayType = this.ownershipChecker.getTypeOfExpression(objNode);
      const elementType = arrayType?.elementType?.baseType;
      const elementOwnership = arrayType?.elementType?.ownership;
      
      if (elementType && elementOwnership) {
        // Check if the argument is already a smart pointer
        const argOwnership = this.ownershipChecker.getTypeOfExpression(arg);
        const isAlreadyShared = argOwnership?.ownership === 'share';
        
        // If array element is use<T> (weak_ptr), don't wrap - shared_ptr converts to weak_ptr
        // If array element is share<T> and arg is not already shared, wrap it
        if (elementOwnership === 'share' && !isAlreadyShared) {
          return cpp.call(cpp.id(`std::make_shared<gs::${elementType}>`), [argExpr]);
        }
      }
    }
    
    return argExpr;
  }

  /**
   * Handle reduce() initial value type coercion
   */
  private handleReduceInitialValue(
    node: ts.CallExpression,
    arg: ts.NumericLiteral,
    argExpr: ast.Expression
  ): ast.Expression {
    // If the initial value is a numeric literal (like 0) but the lambda expects double,
    // ensure we emit 0.0 not 0 for correct C++ template deduction
    const lambdaArg = node.arguments[0];
    if (ts.isArrowFunction(lambdaArg) || ts.isFunctionExpression(lambdaArg)) {
      const params = lambdaArg.parameters;
      if (params.length > 0) {
        const accParam = params[0];
        if (accParam.type) {
          const accTypeStr = accParam.type.getText();
          // If accumulator is 'number' (which maps to double in C++), ensure .0 suffix
          if (accTypeStr === 'number') {
            const numText = arg.text;
            // If it's an integer literal (no decimal point), add .0
            if (!numText.includes('.')) {
              return cpp.id(numText + '.0');
            }
          }
        }
      }
    }
    
    return argExpr;
  }

  /**
   * Handle method calls: obj.method(args)
   */
  private handleMethodCall(
    node: ts.CallExpression,
    objNode: ts.Expression,
    methodName: string,
    args: ast.Expression[]
  ): ast.Expression {
    // Special case: Built-in objects (console, Math, JSON, Date, String, Array, Number)
    if (ts.isIdentifier(objNode)) {
      const objName = objNode.text;
      if (this.isBuiltInObject(objName)) {
        return this.handleBuiltInMethod(objName, methodName, args, node);
      }
      
      // Check if this is a static method call on a user-defined class
      if (this.checker) {
        const staticCall = this.handleStaticMethodCall(objNode, objName, methodName, args);
        if (staticCall) return staticCall;
      }
    }
    
    // Special case: number instance methods
    if (this.checker && this.isNumberMethod(methodName)) {
      const numberMethod = this.handleNumberMethod(objNode, methodName, args);
      if (numberMethod) return numberMethod;
    }
    
    // For 'this', use this->method() directly
    if (objNode.kind === ts.SyntaxKind.ThisKeyword) {
      return cpp.call(cpp.id(`this->${methodName}`), args);
    }
    
    // Regular method call: obj.method(args) or obj->method(args)
    return this.handleRegularMethodCall(node, objNode, methodName, args);
  }

  /**
   * Check if object name is a built-in
   */
  private isBuiltInObject(objName: string): boolean {
    return objName === 'console' || objName === 'Math' || objName === 'Number' || 
           objName === 'JSON' || objName === 'Date' || objName === 'String' || 
           objName === 'Array';
  }

  /**
   * Check if method is a number instance method
   */
  private isNumberMethod(methodName: string): boolean {
    return methodName === 'toFixed' || methodName === 'toExponential' || 
           methodName === 'toPrecision' || methodName === 'toString';
  }

  /**
   * Handle built-in object methods (console.log, Math.max, etc.)
   */
  private handleBuiltInMethod(
    objName: string,
    methodName: string,
    args: ast.Expression[],
    node: ts.CallExpression
  ): ast.Expression {
    // Special case: Array.from(iterable) → just use the iterable directly
    if (objName === 'Array' && methodName === 'from') {
      return args[0];
    }
    
    // For console.log specifically, dereference pointers from Map.get() calls
    const processedArgs = (objName === 'console' && methodName === 'log') ? 
      args.map((arg, index) => {
        const argNode = node.arguments[index];
        // If argument is map.get() which returns V*, dereference it
        if (tsUtils.isMapGetCall(argNode)) {
          return cpp.unary('*', arg);
        }
        return arg;
      }) : args;
    
    return cpp.call(cpp.id(`gs::${objName}::${methodName}`), processedArgs);
  }

  /**
   * Handle static method calls on user-defined classes
   */
  private handleStaticMethodCall(
    objNode: ts.Identifier,
    objName: string,
    methodName: string,
    args: ast.Expression[]
  ): ast.Expression | undefined {
    const symbol = this.checker!.getSymbolAtLocation(objNode);
    if (symbol && symbol.flags & ts.SymbolFlags.Class) {
      // This is a class, so it's a static method call
      const currentClass = this.getCurrentClassName();
      if (currentClass === objName && this.ctx.currentTemplateParams.length > 0) {
        // Inside the template class, use template params: ClassName<T>::method
        const templateArgs = this.ctx.currentTemplateParams.join(', ');
        return cpp.call(cpp.id(`gs::${objName}<${templateArgs}>::${methodName}`), args);
      } else {
        // Outside or non-template class: ClassName::method
        return cpp.call(cpp.id(`gs::${objName}::${methodName}`), args);
      }
    }
    return undefined;
  }

  /**
   * Handle number instance methods (toFixed, toString, etc.)
   */
  private handleNumberMethod(
    objNode: ts.Expression,
    methodName: string,
    args: ast.Expression[]
  ): ast.Expression | undefined {
    const objType = this.checker!.getTypeAtLocation(objNode);
    const objTypeStr = this.checker!.typeToString(objType);
    if (objTypeStr === 'number') {
      const objExpr = this.visitExpression(objNode);
      // Call static method with object as first argument
      return cpp.call(cpp.id(`gs::Number::${methodName}`), [objExpr, ...args]);
    }
    return undefined;
  }

  /**
   * Handle regular method calls with smart pointer handling
   */
  private handleRegularMethodCall(
    node: ts.CallExpression,
    objNode: ts.Expression,
    methodName: string,
    args: ast.Expression[]
  ): ast.Expression {
    const objExpr = this.visitExpression(objNode);
    
    // Check if obj is an array subscript or smart pointer - needs ->
    const isArraySubscript = ts.isElementAccessExpression(objNode);
    let isPointer = false;
    
    if (isArraySubscript) {
      // Check if array has smart pointer elements
      const arrayExpr = (objNode as ts.ElementAccessExpression).expression;
      const hasSmartPtrElements = this.ownershipChecker.hasSmartPointerElements(
        arrayExpr,
        this.ctx.interfaceNames
      );
      isPointer = hasSmartPtrElements;
    } else {
      // For non-array access, check if it's a smart pointer type
      isPointer = this.isSmartPointerAccess(objNode);
    }
    
    // If objExpr is a unary expression (like *arr[i]) and we're using ->, wrap in parens
    let memberObj: ast.Expression = objExpr;
    if (objExpr instanceof ast.UnaryExpr && isPointer) {
      memberObj = cpp.paren(objExpr);
    }
    
    // Optimization: str.charAt(i) when used in comparisons → charCodeAt(i)
    if (methodName === 'charAt' && this.checker) {
      const optimized = this.tryOptimizeCharAt(objNode, node, memberObj, args, isPointer);
      if (optimized) return optimized;
    }
    
    return cpp.call(cpp.member(memberObj, methodName, isPointer), args);
  }

  /**
   * Try to optimize charAt to charCodeAt in comparisons
   */
  private tryOptimizeCharAt(
    objNode: ts.Expression,
    node: ts.CallExpression,
    memberObj: ast.Expression,
    args: ast.Expression[],
    isPointer: boolean
  ): ast.Expression | undefined {
    const objType = this.checker!.getTypeAtLocation(objNode);
    const objTypeStr = this.checker!.typeToString(objType);
    if (objTypeStr === 'string') {
      // Check if parent is a comparison (===, !==, ==, !=)
      const parent = node.parent;
      if (parent && ts.isBinaryExpression(parent) &&
          (parent.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken ||
           parent.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
           parent.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken ||
           parent.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsToken)) {
        // Use charCodeAt instead for integer comparison (faster)
        return cpp.call(cpp.member(memberObj, 'charCodeAt', isPointer), args);
      }
    }
    return undefined;
  }

  /**
   * Handle regular function calls (non-method)
   */
  private handleRegularCall(node: ts.CallExpression, args: ast.Expression[]): ast.Expression {
    const func = this.visitExpression(node.expression);
    
    // For interface parameters, automatically dereference smart pointers
    const processedArgs = args.map((arg, index) => {
      const argNode = node.arguments[index];
      
      // Check if argument is an identifier (variable)
      if (ts.isIdentifier(argNode)) {
        const deref = this.tryDereferenceVariable(argNode, arg);
        if (deref) return deref;
      }
      
      // Check if argument is an element access (arr[i]) that returns a smart pointer
      if (ts.isElementAccessExpression(argNode)) {
        if (this.ownershipChecker.hasSmartPointerElements(argNode.expression, this.ctx.interfaceNames)) {
          return cpp.unary('*', arg);
        }
      }
      
      return arg;
    });
    
    return cpp.call(func, processedArgs);
  }

  /**
   * Try to dereference a variable if it's a smart pointer to an interface
   */
  private tryDereferenceVariable(
    argNode: ts.Identifier,
    arg: ast.Expression
  ): ast.Expression | undefined {
    const varName = cppUtils.escapeName(argNode.text);
    const varType = this.ctx.variableTypes.get(varName);
    
    // Check if it's a shared_ptr to a class that might implement an interface
    if (varType && varType.toString().startsWith('std::shared_ptr<gs::')) {
      // Extract the class name from std::shared_ptr<gs::ClassName>
      const match = varType.toString().match(/std::shared_ptr<gs::(.+)>/);
      if (match) {
        // Dereference the smart pointer to get the object reference
        return cpp.unary('*', arg);
      }
    }
    
    return undefined;
  }
}
