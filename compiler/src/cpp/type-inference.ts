/**
 * Type Inference Strategies
 * 
 * Handles inferring C++ types from TypeScript variable initializers.
 */

import * as ts from 'typescript';
import * as ast from './ast';
import * as cppUtils from './cpp-utils';
import * as tsUtils from './ts-utils';
import { CppTypeMapper } from './type-mapper';
import { OwnershipAwareTypeChecker } from './ownership-aware-type-checker';

export interface TypeInferenceContext {
  checker?: ts.TypeChecker;
  ownershipChecker: OwnershipAwareTypeChecker;
  typeMapper: CppTypeMapper;
  interfaceNames: Set<string>;
}

/**
 * Base strategy for type inference
 */
abstract class TypeInferenceStrategy {
  constructor(protected ctx: TypeInferenceContext) {}
  
  abstract canHandle(initializer: ts.Expression): boolean;
  abstract inferType(initializer: ts.Expression): ast.CppType;
}

/**
 * Infer type from new expressions
 */
class NewExpressionInference extends TypeInferenceStrategy {
  canHandle(initializer: ts.Expression): boolean {
    return ts.isNewExpression(initializer);
  }

  inferType(initializer: ts.Expression): ast.CppType {
    const newExpr = initializer as ts.NewExpression;
    let className = cppUtils.escapeName(newExpr.expression.getText());
    
    // Try to extract generic type arguments
    if (this.ctx.checker) {
      const type = this.ctx.checker.getTypeAtLocation(newExpr);
      
      if (type.aliasSymbol || (type as any).target) {
        const typeRef = type as ts.TypeReference;
        const typeArgs = this.ctx.checker.getTypeArguments(typeRef);
        
        if (typeArgs && typeArgs.length > 0) {
          const cppTypeArgs = typeArgs.map(arg => {
            const argStr = this.ctx.checker!.typeToString(arg);
            return this.ctx.typeMapper.mapTypeScriptTypeToCpp(argStr);
          });
          className = `${className}<${cppTypeArgs.join(', ')}>`;
        }
      }
    }
    
    // Check if it's a built-in value type
    if (this.ctx.typeMapper.isBuiltInValueType(className)) {
      return new ast.CppType(`gs::${className}`);
    }
    
    // User-defined classes: smart pointers
    const ownershipType = this.getOwnershipTypeForNew(newExpr);
    if (ownershipType === 'unique') {
      return new ast.CppType(`std::unique_ptr<gs::${className}>`);
    }
    return new ast.CppType(`std::shared_ptr<gs::${className}>`);
  }

  private getOwnershipTypeForNew(newExpr: ts.NewExpression): 'unique' | 'shared' {
    // Check if parent context expects unique_ptr
    // For now, default to shared_ptr (safe default)
    return 'shared';
  }
}

/**
 * Infer type from array element access
 */
class ElementAccessInference extends TypeInferenceStrategy {
  canHandle(initializer: ts.Expression): boolean {
    return ts.isElementAccessExpression(initializer) && !!this.ctx.checker;
  }

  inferType(initializer: ts.Expression): ast.CppType {
    const elemAccess = initializer as ts.ElementAccessExpression;
    
    // Use ownership checker to preserve ownership annotations
    const arrayOwnership = this.ctx.ownershipChecker.getTypeOfExpression(elemAccess.expression);
    
    if (arrayOwnership?.isArray && arrayOwnership.elementType) {
      const elementOwnership = arrayOwnership.elementType;
      const elementTypeStr = elementOwnership.baseType;
      
      // Map ownership wrapper + type name to C++
      if (elementOwnership.ownership === 'share') {
        return new ast.CppType(`std::shared_ptr<gs::${cppUtils.escapeName(elementTypeStr)}>`);
      }
      if (elementOwnership.ownership === 'own') {
        return new ast.CppType(`std::unique_ptr<gs::${cppUtils.escapeName(elementTypeStr)}>`);
      }
      if (elementOwnership.ownership === 'use') {
        return new ast.CppType(`std::weak_ptr<gs::${cppUtils.escapeName(elementTypeStr)}>`);
      }
      if (this.ctx.interfaceNames.has(cppUtils.escapeName(elementTypeStr))) {
        return new ast.CppType(`std::shared_ptr<gs::${cppUtils.escapeName(elementTypeStr)}>`);
      }
      
      // Plain type
      return new ast.CppType(this.ctx.typeMapper.mapTypeScriptTypeToCpp(elementTypeStr));
    }
    
    // Fallback: use TypeChecker
    if (this.ctx.checker) {
      const arrayType = this.ctx.checker.getTypeAtLocation(elemAccess.expression);
      const arrayTypeStr = this.ctx.checker.typeToString(arrayType);
      const arrayMatch = arrayTypeStr.match(/^(?:Array<(.+)>|(.+)\[\])$/);
      
      if (arrayMatch) {
        const elementTypeStr = arrayMatch[1] || arrayMatch[2];
        const cppElementType = this.ctx.typeMapper.mapTypeScriptTypeToCpp(elementTypeStr.trim());
        return new ast.CppType(cppElementType);
      }
    }
    
    return new ast.CppType('auto');
  }
}

/**
 * Infer type from function call expressions
 */
class CallExpressionInference extends TypeInferenceStrategy {
  canHandle(initializer: ts.Expression): boolean {
    return ts.isCallExpression(initializer) && !!this.ctx.checker;
  }

  inferType(initializer: ts.Expression): ast.CppType {
    const callExpr = initializer as ts.CallExpression;
    
    // Special case: Map/Set methods
    if (ts.isPropertyAccessExpression(callExpr.expression)) {
      const result = this.handleMapSetMethods(callExpr);
      if (result) return result;
    }
    
    // Check for nullable interface return type
    return this.handleNullableInterface(callExpr);
  }

  private handleMapSetMethods(callExpr: ts.CallExpression): ast.CppType | null {
    const propAccess = callExpr.expression as ts.PropertyAccessExpression;
    const methodName = propAccess.name.text;
    
    // Map.get() returns pointer - use auto
    if (methodName === 'get') {
      return new ast.CppType('auto');
    }
    
    // Map.keys(), Map.values(), Set.values()
    if (methodName === 'keys' || methodName === 'values') {
      const objType = this.ctx.checker!.getTypeAtLocation(propAccess.expression);
      const objTypeStr = this.ctx.checker!.typeToString(objType);
      
      // Match Map<K, V>
      const mapMatch = objTypeStr.match(/Map<([^,]+),\s*(.+)>/);
      if (mapMatch) {
        const keyType = mapMatch[1].trim();
        const valueType = mapMatch[2].trim();
        const elementType = methodName === 'keys' ? keyType : valueType;
        const cppElementType = this.ctx.typeMapper.mapTypeScriptTypeToCpp(elementType);
        return new ast.CppType(`gs::Array<${cppElementType}>`);
      }
      
      // Match Set<T>
      const setMatch = objTypeStr.match(/Set<(.+)>/);
      if (setMatch && methodName === 'values') {
        const valueType = setMatch[1].trim();
        const cppElementType = this.ctx.typeMapper.mapTypeScriptTypeToCpp(valueType);
        return new ast.CppType(`gs::Array<${cppElementType}>`);
      }
    }
    
    return null;
  }

  private handleNullableInterface(callExpr: ts.CallExpression): ast.CppType {
    const returnType = this.ctx.checker!.getTypeAtLocation(callExpr);
    const returnTypeStr = this.ctx.checker!.typeToString(returnType);
    
    // Check for union type with null
    if (returnTypeStr.includes(' | null')) {
      const baseType = returnTypeStr.replace(' | null', '').trim();
      if (this.ctx.interfaceNames.has(baseType)) {
        return new ast.CppType(`std::shared_ptr<gs::${baseType}>`);
      }
    }
    
    return new ast.CppType('auto');
  }
}

/**
 * Infer type from object literal expressions
 */
class ObjectLiteralInference extends TypeInferenceStrategy {
  canHandle(initializer: ts.Expression): boolean {
    return ts.isObjectLiteralExpression(initializer);
  }

  inferType(initializer: ts.Expression): ast.CppType {
    return new ast.CppType('gs::LiteralObject');
  }
}

/**
 * Infer type from arrow function expressions
 */
class ArrowFunctionInference extends TypeInferenceStrategy {
  canHandle(initializer: ts.Expression): boolean {
    return ts.isArrowFunction(initializer) && 
           !(initializer.typeParameters && initializer.typeParameters.length > 0);
  }

  inferType(initializer: ts.Expression): ast.CppType {
    const arrowFunc = initializer as ts.ArrowFunction;
    
    let returnType: ast.CppType;
    if (arrowFunc.type) {
      returnType = this.ctx.typeMapper.mapTsNodeType(arrowFunc.type);
    } else {
      const hasReturnValue = tsUtils.arrowFunctionHasReturnValue(arrowFunc);
      returnType = hasReturnValue ? new ast.CppType('double') : new ast.CppType('void');
    }
    
    const paramTypes = arrowFunc.parameters.map(p => 
      p.type ? this.ctx.typeMapper.mapTsNodeType(p.type) : new ast.CppType('double')
    );
    
    const paramTypeStrs = paramTypes.map(t => t.toString()).join(', ');
    return new ast.CppType(`std::function<${returnType.toString()}(${paramTypeStrs})>`);
  }
}

/**
 * Main type inference service
 */
export class TypeInferenceService {
  private strategies: TypeInferenceStrategy[];
  
  constructor(private ctx: TypeInferenceContext) {
    this.strategies = [
      new NewExpressionInference(ctx),
      new ElementAccessInference(ctx),
      new CallExpressionInference(ctx),
      new ObjectLiteralInference(ctx),
      new ArrowFunctionInference(ctx),
    ];
  }

  /**
   * Infer C++ type from variable initializer
   * Returns undefined if type should be inferred from explicit annotation or use 'auto'
   */
  inferType(initializer: ts.Expression | undefined): ast.CppType | undefined {
    if (!initializer) {
      return undefined;
    }

    // Try each strategy
    for (const strategy of this.strategies) {
      if (strategy.canHandle(initializer)) {
        return strategy.inferType(initializer);
      }
    }

    // No strategy matched - use auto
    return new ast.CppType('auto');
  }
}
