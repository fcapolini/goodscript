/**
 * Ownership-Aware Type Checker
 * 
 * Wraps TypeScript's type checker to preserve ownership qualifiers (own<T>, share<T>, use<T>)
 * which are erased by the standard type checker because they're type aliases.
 * 
 * This class reads type information directly from the AST to preserve ownership semantics.
 */

import * as ts from 'typescript';
import * as cppUtils from './cpp-utils';

export interface OwnershipType {
  /** The base type (e.g., "Person", "number", "string") */
  baseType: string;
  /** The ownership qualifier, if any */
  ownership?: 'own' | 'share' | 'use';
  /** Whether this is an array type */
  isArray: boolean;
  /** If array, the element type */
  elementType?: OwnershipType;
  /** If Map, the key and value types */
  mapTypes?: { key: OwnershipType; value: OwnershipType };
  /** If Set, the element type */
  setType?: OwnershipType;
  /** Whether this is nullable (| null | undefined) */
  isNullable: boolean;
}

export class OwnershipAwareTypeChecker {
  private variableDeclarations = new Map<string, ts.VariableDeclaration | ts.ParameterDeclaration>();
  private propertyDeclarations = new Map<string, ts.PropertyDeclaration>();
  
  constructor(private checker: ts.TypeChecker) {}
  
  /**
   * Register a variable declaration for later type lookup
   */
  registerVariable(name: string, decl: ts.VariableDeclaration | ts.ParameterDeclaration): void {
    this.variableDeclarations.set(name, decl);
  }
  
  /**
   * Register a class property for later type lookup
   */
  registerProperty(className: string, propName: string, decl: ts.PropertyDeclaration): void {
    this.propertyDeclarations.set(`${className}.${propName}`, decl);
  }
  
  /**
   * Get the ownership-aware type for an expression
   */
  getTypeOfExpression(expr: ts.Expression): OwnershipType | undefined {
    // Handle identifiers - look up their declaration
    if (ts.isIdentifier(expr)) {
      const decl = this.variableDeclarations.get(expr.text);
      if (decl) {
        // If type is explicitly annotated, use it
        if (decl.type) {
          return this.parseTypeNode(decl.type);
        }
        // Otherwise, try to infer from initializer
        if (ts.isVariableDeclaration(decl) && decl.initializer) {
          return this.getTypeOfExpression(decl.initializer);
        }
      }
    }
    
    // Handle property access (obj.prop)
    if (ts.isPropertyAccessExpression(expr)) {
      // Handle this.prop
      if (expr.expression.kind === ts.SyntaxKind.ThisKeyword) {
        const propKey = `this.${expr.name.text}`;
        const decl = this.propertyDeclarations.get(propKey);
        if (decl && decl.type) {
          return this.parseTypeNode(decl.type);
        }
        
        // Fallback: use TypeChecker to look up the property type (if available)
        if (this.checker) {
          const tsType = this.checker.getTypeAtLocation(expr.expression);
          const prop = tsType.getProperty(expr.name.text);
          if (prop && prop.valueDeclaration && ts.isPropertyDeclaration(prop.valueDeclaration) && prop.valueDeclaration.type) {
            return this.parseTypeNode(prop.valueDeclaration.type);
          }
        }
      }
      
      // Handle obj.prop where we need to infer the property type
      const objType = this.getTypeOfExpression(expr.expression);
      if (objType && this.checker) {
        // Look up the property in the class/interface
        const tsType = this.checker.getTypeAtLocation(expr.expression);
        const prop = tsType.getProperty(expr.name.text);
        if (prop && prop.valueDeclaration && ts.isPropertyDeclaration(prop.valueDeclaration)) {
          return this.parseTypeNode(prop.valueDeclaration.type);
        }
      }
    }
    
    // Handle element access (arr[i])
    if (ts.isElementAccessExpression(expr)) {
      const arrType = this.getTypeOfExpression(expr.expression);
      if (arrType?.isArray && arrType.elementType) {
        return arrType.elementType;
      }
    }
    
    // Handle call expressions - infer return type
    if (ts.isCallExpression(expr)) {
      return this.getReturnTypeOfCall(expr);
    }
    
    // Handle new expressions
    if (ts.isNewExpression(expr)) {
      const className = expr.expression.getText();
      
      // Built-in value types (Array, Map, Set, String, etc.) are NOT heap-allocated
      // Only user-defined classes get smart pointer ownership
      const builtInValueTypes = ['Array', 'Map', 'Set', 'String', 'RegExp', 'Date', 'Promise'];
      const isBuiltIn = builtInValueTypes.includes(className.split('<')[0]);
      
      if (isBuiltIn) {
        // Built-in types are stack values, no ownership
        return {
          baseType: className,
          ownership: undefined,
          isArray: className.startsWith('Array'),
          isNullable: false
        };
      }
      
      // User-defined class instances - default to shared ownership (matches JavaScript semantics)
      return {
        baseType: className,
        ownership: 'share',
        isArray: false,
        isNullable: false
      };
    }
    
    // Handle array literals
    if (ts.isArrayLiteralExpression(expr)) {
      if (expr.elements.length > 0) {
        const firstElemType = this.getTypeOfExpression(expr.elements[0]);
        if (firstElemType) {
          return {
            baseType: 'Array',
            isArray: true,
            elementType: firstElemType,
            isNullable: false
          };
        }
      }
    }
    
    // Fallback: use TypeChecker but we lose ownership info
    return undefined;
  }
  
  /**
   * Get the return type of a method call
   */
  private getReturnTypeOfCall(call: ts.CallExpression): OwnershipType | undefined {
    if (!ts.isPropertyAccessExpression(call.expression)) {
      return undefined;
    }
    
    const methodName = call.expression.name.text;
    const objType = this.getTypeOfExpression(call.expression.expression);
    
    if (!objType) return undefined;
    
    // Array methods that preserve the array type
    if (objType.isArray) {
      if (['filter', 'reverse', 'sort', 'slice'].includes(methodName)) {
        return objType; // Same type as input
      }
      
      if (methodName === 'map') {
        // map<U>((T) => U): Array<U>
        // Would need to analyze the callback to get U
        // For now, return unknown
        return undefined;
      }
      
      if (methodName === 'find') {
        // find returns T | undefined
        return objType.elementType ? {
          ...objType.elementType,
          isNullable: true
        } : undefined;
      }
    }
    
    // optional.value() returns the inner type (non-nullable)
    if (objType.isNullable && methodName === 'value') {
      return { ...objType, isNullable: false };
    }
    
    // Map.get() returns V | undefined
    if (objType.baseType === 'Map' && methodName === 'get') {
      if (objType.mapTypes?.value) {
        return {
          ...objType.mapTypes.value,
          isNullable: true
        };
      }
    }
    
    // String.split() returns string[]
    if (objType.baseType === 'string' && methodName === 'split') {
      return {
        baseType: 'Array',
        isArray: true,
        elementType: {
          baseType: 'string',
          isArray: false,
          isNullable: false
        },
        isNullable: false
      };
    }
    
    return undefined;
  }
  
  /**
   * Parse a TypeNode to extract ownership information
   */
  parseTypeNode(typeNode: ts.TypeNode | undefined): OwnershipType | undefined {
    if (!typeNode) return undefined;
    
    const typeText = typeNode.getText();
    
    // Check for ownership qualifiers
    const ownMatch = typeText.match(/^own<(.+)>$/);
    if (ownMatch) {
      const innerType = this.parseTypeString(ownMatch[1]);
      return { ...innerType, ownership: 'own' };
    }
    
    const shareMatch = typeText.match(/^share<(.+)>$/);
    if (shareMatch) {
      const innerType = this.parseTypeString(shareMatch[1]);
      return { ...innerType, ownership: 'share' };
    }
    
    const useMatch = typeText.match(/^use<(.+)>$/);
    if (useMatch) {
      const innerType = this.parseTypeString(useMatch[1]);
      return { ...innerType, ownership: 'use', isNullable: true };
    }
    
    return this.parseTypeString(typeText);
  }
  
  /**
   * Parse a type string to extract structure
   */
  private parseTypeString(typeStr: string): OwnershipType {
    // Handle nullable types (T | null | undefined)
    const isNullable = typeStr.includes('| null') || typeStr.includes('| undefined');
    const baseTypeStr = typeStr.split('|')[0].trim();
    
    // Handle ownership qualifiers in type strings
    const ownMatch = baseTypeStr.match(/^own<(.+)>$/);
    if (ownMatch) {
      const innerType = this.parseTypeString(ownMatch[1]);
      return { ...innerType, ownership: 'own', isNullable };
    }
    
    const shareMatch = baseTypeStr.match(/^share<(.+)>$/);
    if (shareMatch) {
      const innerType = this.parseTypeString(shareMatch[1]);
      return { ...innerType, ownership: 'share', isNullable };
    }
    
    const useMatch = baseTypeStr.match(/^use<(.+)>$/);
    if (useMatch) {
      const innerType = this.parseTypeString(useMatch[1]);
      return { ...innerType, ownership: 'use', isNullable: true };
    }
    
    // Handle arrays
    if (baseTypeStr.endsWith('[]')) {
      const elementTypeStr = baseTypeStr.slice(0, -2);
      return {
        baseType: 'Array',
        isArray: true,
        elementType: this.parseTypeString(elementTypeStr),
        isNullable
      };
    }
    
    // Handle Array<T>
    const arrayMatch = baseTypeStr.match(/^Array<(.+)>$/);
    if (arrayMatch) {
      return {
        baseType: 'Array',
        isArray: true,
        elementType: this.parseTypeString(arrayMatch[1]),
        isNullable
      };
    }
    
    // Handle Map<K, V>
    const mapMatch = baseTypeStr.match(/^Map<([^,]+),\s*(.+)>$/);
    if (mapMatch) {
      return {
        baseType: 'Map',
        isArray: false,
        mapTypes: {
          key: this.parseTypeString(mapMatch[1]),
          value: this.parseTypeString(mapMatch[2])
        },
        isNullable
      };
    }
    
    // Handle Set<T>
    const setMatch = baseTypeStr.match(/^Set<(.+)>$/);
    if (setMatch) {
      return {
        baseType: 'Set',
        isArray: false,
        setType: this.parseTypeString(setMatch[1]),
        isNullable
      };
    }
    
    // Simple type
    return {
      baseType: baseTypeStr,
      isArray: false,
      isNullable
    };
  }
  
  /**
   * Convert OwnershipType to C++ type string
   */
  toCppType(type: OwnershipType): string {
    let cppType: string;
    
    // Handle ownership wrappers
    if (type.ownership === 'own') {
      const innerType = this.toCppType({ ...type, ownership: undefined });
      return `std::unique_ptr<${innerType}>`;
    }
    
    if (type.ownership === 'share') {
      const innerType = this.toCppType({ ...type, ownership: undefined });
      return `std::shared_ptr<${innerType}>`;
    }
    
    if (type.ownership === 'use') {
      const innerType = this.toCppType({ ...type, ownership: undefined });
      return `std::weak_ptr<${innerType}>`;
    }
    
    // Handle arrays
    if (type.isArray && type.elementType) {
      const elemType = this.toCppType(type.elementType);
      cppType = `gs::Array<${elemType}>`;
    }
    // Handle Map
    else if (type.baseType === 'Map' && type.mapTypes) {
      const keyType = this.toCppType(type.mapTypes.key);
      const valueType = this.toCppType(type.mapTypes.value);
      cppType = `gs::Map<${keyType}, ${valueType}>`;
    }
    // Handle Set
    else if (type.baseType === 'Set' && type.setType) {
      const elemType = this.toCppType(type.setType);
      cppType = `gs::Set<${elemType}>`;
    }
    // Handle primitives and classes
    else {
      cppType = this.mapPrimitiveType(type.baseType);
    }
    
    // Wrap in optional if nullable (but not for smart pointers which are already nullable)
    if (type.isNullable && !type.ownership) {
      return `std::optional<${cppType}>`;
    }
    
    return cppType;
  }
  
  /**
   * Map TypeScript primitive types to C++ types
   */
  private mapPrimitiveType(tsType: string): string {
    switch (tsType) {
      case 'number': return 'double';
      case 'string': return 'gs::String';
      case 'String': return 'gs::String';
      case 'boolean': return 'bool';
      case 'void': return 'void';
      case 'any': return 'void*'; // Discouraged but handle it
      default:
        // Assume it's a class name
        return `gs::${tsType}`;
    }
  }
  
  /**
   * Check if an expression results in a smart pointer
   */
  isSmartPointer(expr: ts.Expression): boolean {
    const type = this.getTypeOfExpression(expr);
    return !!type?.ownership && type.ownership !== 'use';
  }
  
  /**
   * Determine if a value needs to be wrapped in a smart pointer for assignment
   * @param targetType The type of the target (variable being assigned to)
   * @param sourceExpr The expression being assigned
   * @returns undefined (no wrapping), 'unique' (make_unique), or 'shared' (make_shared)
   */
  needsSmartPointerWrapping(targetType: OwnershipType, sourceExpr: ts.Expression): 'unique' | 'shared' | undefined {
    const sourceType = this.getTypeOfExpression(sourceExpr);
    
    // If target has ownership but source doesn't, we need to wrap
    if (targetType.ownership && !sourceType?.ownership) {
      // Don't wrap if source is already a 'new' expression (already creates smart pointer)
      if (ts.isNewExpression(sourceExpr)) {
        return undefined;
      }
      
      return targetType.ownership === 'own' ? 'unique' : 'shared';
    }
    
    return undefined;
  }
  
  /**
   * Check if an expression requires pointer access operator (->)
   * Returns true for smart pointers (unique_ptr, shared_ptr, weak_ptr after lock)
   */
  requiresPointerAccess(expr: ts.Expression): boolean {
    const type = this.getTypeOfExpression(expr);
    if (!type) return false;
    
    // Smart pointers (own, share, but not use since it needs lock() first)
    if (type.ownership === 'own' || type.ownership === 'share') {
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if an array has smart pointer elements
   */
  hasSmartPointerElements(expr: ts.Expression, interfaceNames: Set<string>): boolean {
    const type = this.getTypeOfExpression(expr);
    
    if (!type?.isArray || !type.elementType) {
      return false;
    }
    
    // Check if element type has ownership qualifier (own<T>, share<T>, use<T>)
    if (type.elementType.ownership) {
      return true;
    }
    
    // Check if element type is an interface (which we wrap in shared_ptr)
    if (interfaceNames.has(type.elementType.baseType)) {
      return true;
    }
    
    return false;
  }
}
