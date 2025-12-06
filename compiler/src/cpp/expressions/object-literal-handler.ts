/**
 * Object Literal Handler
 * 
 * Handles object literal expressions with type inference for struct initialization.
 */

import * as ts from 'typescript';
import * as ast from '../ast';
import { cpp } from '../builder';
import { CppTypeMapper } from '../type-mapper';

export class ObjectLiteralHandler {
  constructor(
    private checker: ts.TypeChecker | undefined,
    private typeMapper: CppTypeMapper,
    private visitExpression: (node: ts.Expression) => ast.Expression
  ) {}

  /**
   * Handle object literal expressions: { key: value, ... }
   * Tries to infer if it's a struct initialization or generic object literal
   */
  handleObjectLiteral(node: ts.ObjectLiteralExpression): ast.Expression {
    // Try to infer the target type from context (e.g., Entry<K, V>)
    const targetType = this.inferTargetType(node);
    
    // Collect property values in order
    const propertyValues: ast.Expression[] = [];
    
    for (const prop of node.properties) {
      if (ts.isPropertyAssignment(prop)) {
        // Regular property: key: value
        const value = this.visitExpression(prop.initializer);
        propertyValues.push(value);
      } else if (ts.isShorthandPropertyAssignment(prop)) {
        // Shorthand property: { x } → use x's value
        const value = this.visitExpression(prop.name);
        propertyValues.push(value);
      }
      // Note: Method declarations, getters, setters not supported yet
    }
    
    if (targetType) {
      // Generate structured initialization: gs::Entry<K, V>{value1, value2, ...}
      if (propertyValues.length === 0) {
        return cpp.id(`${targetType}{}`);
      }
      return cpp.call(cpp.id(targetType), [cpp.initList(propertyValues)]);
    }
    
    // Fallback: Use gs::LiteralObject (for untyped object literals)
    return this.generateLiteralObject(node);
  }

  /**
   * Infer the target C++ type for the object literal
   * Returns the type name if it's a named interface/struct, undefined for anonymous types
   */
  private inferTargetType(node: ts.ObjectLiteralExpression): string | undefined {
    if (!this.checker) {
      return undefined;
    }

    const contextualType = this.checker.getContextualType(node);
    if (!contextualType) {
      return undefined;
    }

    const typeStr = this.checker.typeToString(contextualType);
    
    // Check if it's a user-defined interface/struct (not an anonymous type)
    // Anonymous types look like "{ key: K; value: V; }"
    // Named types look like "Entry<K, V>"
    if (!typeStr.startsWith('{') && !typeStr.includes(';')) {
      // It's a named type - use it for struct initialization
      return this.typeMapper.mapTypeScriptTypeToCpp(typeStr);
    }
    
    return undefined;
  }

  /**
   * Generate gs::LiteralObject for untyped object literals (legacy fallback)
   */
  private generateLiteralObject(node: ts.ObjectLiteralExpression): ast.Expression {
    const properties: [ast.Expression, ast.Expression][] = [];
    
    for (const prop of node.properties) {
      if (ts.isPropertyAssignment(prop)) {
        const keyStr = prop.name.getText();
        const key = cpp.literal(keyStr);
        const value = this.visitExpression(prop.initializer);
        const propertyValue = cpp.call(cpp.id('gs::Property'), [value]);
        properties.push([key, propertyValue]);
      } else if (ts.isShorthandPropertyAssignment(prop)) {
        const keyStr = prop.name.getText();
        const key = cpp.literal(keyStr);
        const value = this.visitExpression(prop.name);
        const propertyValue = cpp.call(cpp.id('gs::Property'), [value]);
        properties.push([key, propertyValue]);
      }
    }
    
    if (properties.length === 0) {
      return cpp.id('gs::LiteralObject{}');
    }
    
    const propInits = properties.map(([key, value]) => cpp.initList([key, value]));
    return cpp.call(cpp.id('gs::LiteralObject'), [cpp.initList(propInits)]);
  }
}
