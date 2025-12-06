/**
 * Element Access Handler
 * 
 * Handles array subscript and tuple element access expressions.
 */

import * as ts from 'typescript';
import * as ast from '../ast';
import { cpp } from '../builder';
import * as cppUtils from '../cpp-utils';
import { TransformContext } from '../transform-context';
import { OwnershipAwareTypeChecker } from '../ownership-aware-type-checker';

export class ElementAccessHandler {
  constructor(
    private checker: ts.TypeChecker | undefined,
    private ctx: TransformContext,
    private ownershipChecker: OwnershipAwareTypeChecker,
    private visitExpression: (node: ts.Expression) => ast.Expression,
    private isArrayAccessUsedAsLValue: (node: ts.ElementAccessExpression) => boolean
  ) {}

  /**
   * Handle element access expressions: obj[index]
   * Supports both array subscripts and tuple element access
   */
  handleElementAccess(node: ts.ElementAccessExpression): ast.Expression {
    let obj = this.visitExpression(node.expression);
    let index = this.visitExpression(node.argumentExpression!);
    
    // Check if object expression type is a tuple and index is numeric
    if (this.checker && ts.isNumericLiteral(node.argumentExpression!)) {
      const objType = this.checker.getTypeAtLocation(node.expression);
      const objTypeStr = this.checker.typeToString(objType);
      
      // Detect tuple type: [string, number] or [T, U, V, ...]
      if (objTypeStr.startsWith('[') && objTypeStr.endsWith(']') && !objTypeStr.endsWith('[]')) {
        return this.handleTupleAccess(node, obj, objTypeStr);
      }
    }
    
    // Handle array element access
    return this.handleArrayAccess(node, obj, index);
  }

  /**
   * Handle tuple element access: tuple[0] → tuple.first or std::get<0>(tuple)
   */
  private handleTupleAccess(
    node: ts.ElementAccessExpression,
    obj: ast.Expression,
    objTypeStr: string
  ): ast.Expression {
    const indexValue = parseInt(node.argumentExpression!.getText(), 10);
    
    // Check if obj is an array subscript result (which returns a pointer)
    // The array subscript handler already dereferenced it (*arr[i])
    // So we just need to parenthesize it, not add another dereference
    const isArraySubscript = ts.isElementAccessExpression(node.expression);
    if (isArraySubscript) {
      // obj is already (*arr[i]), just parenthesize for member access
      obj = cpp.paren(obj);
    }
    
    // For 2-element tuples (std::pair), use .first and .second
    if (objTypeStr.split(',').length === 2) {
      if (indexValue === 0) {
        return cpp.member(obj, 'first');
      } else if (indexValue === 1) {
        return cpp.member(obj, 'second');
      }
    } else {
      // For 3+ element tuples, use std::get<N>()
      return cpp.call(cpp.id(`std::get<${indexValue}>`), [obj]);
    }
    
    // Fallback (shouldn't reach here)
    return cpp.call(cpp.id(`std::get<${indexValue}>`), [obj]);
  }

  /**
   * Handle array element access: arr[i] → arr.at_ref(i)
   */
  private handleArrayAccess(
    node: ts.ElementAccessExpression,
    obj: ast.Expression,
    index: ast.Expression
  ): ast.Expression {
    // Check if the object is a smart pointer to an array
    // e.g., shared_ptr<Array<T>> or unique_ptr<Array<T>>
    // NOTE: Check actual C++ type, not just TypeScript ownership annotation
    // because Array types are no longer wrapped in smart pointers by default
    const isSmartPtrToArray = this.isSmartPointerToArray(node);
    
    // If obj is a smart pointer to an array, we need to dereference it first
    // board[i] where board is shared_ptr<Array<T>> becomes (*board)[i]
    if (isSmartPtrToArray) {
      obj = cpp.paren(cpp.unary('*', obj));
    }
    
    // Cast index to int if it's not already
    // TypeScript number maps to C++ double, but array indices need int
    index = this.castIndexToInt(node, index);
    
    // gs::Array<T>::operator[] returns T*, which needs dereferencing in most contexts.
    // However, if this subscript is part of a property/method access chain (arr[i].prop),
    // we should NOT dereference here because we'll use -> instead.
    // Check if parent is a property access expression
    const parent = node.parent;
    const isPartOfPropertyAccess = parent && (
      ts.isPropertyAccessExpression(parent) && parent.expression === node ||
      ts.isCallExpression(parent) && ts.isPropertyAccessExpression(parent.expression) && 
        parent.expression.expression === node
    );
    
    // Check if array element type is shared_ptr using ownership-aware type checker
    // This preserves share<T> annotations that TypeChecker erases
    // Also checks if element type is an interface (which we wrap in shared_ptr)
    const hasSmartPtrElements = this.ownershipChecker.hasSmartPointerElements(
      node.expression, 
      this.ctx.interfaceNames
    );
    
    // Always use at_ref() for array element access - it returns a reference to the element
    // For Array<T>, at_ref() returns T&
    // For Array<shared_ptr<T>>, at_ref() returns shared_ptr<T>&
    // This is more consistent and safer than operator[] which returns T*
    const isSimpleRead = !isPartOfPropertyAccess && 
                        !this.isArrayAccessUsedAsLValue(node);
    
    if (isSimpleRead) {
      // Use at_ref() for direct access: arr.at_ref(i)
      return cpp.call(cpp.member(obj, 'at_ref', false), [index]);
    }
    
    // For property access chains (arr[i].prop or arr[i]->method()), 
    // still use at_ref() but wrap in dereference for smart pointers
    if (isPartOfPropertyAccess && hasSmartPtrElements) {
      // arr[i]->method() becomes arr.at_ref(i)->method()
      return cpp.call(cpp.member(obj, 'at_ref', false), [index]);
    }
    
    // Fallback for other cases
    return cpp.call(cpp.member(obj, 'at_ref', false), [index]);
  }

  /**
   * Check if the array is wrapped in a smart pointer
   */
  private isSmartPointerToArray(node: ts.ElementAccessExpression): boolean {
    if (ts.isIdentifier(node.expression)) {
      const varName = cppUtils.escapeName(node.expression.text);
      const varType = this.ctx.variableTypes.get(varName);
      if (varType) {
        const typeStr = varType.toString();
        return (typeStr.startsWith('std::shared_ptr<gs::Array<') || 
                typeStr.startsWith('std::unique_ptr<gs::Array<'));
      }
    }
    return false;
  }

  /**
   * Cast index to int if it's a TypeScript number (which maps to C++ double)
   */
  private castIndexToInt(node: ts.ElementAccessExpression, index: ast.Expression): ast.Expression {
    if (this.checker) {
      const indexType = this.checker.getTypeAtLocation(node.argumentExpression!);
      const indexTypeStr = this.checker.typeToString(indexType);
      if (indexTypeStr === 'number') {
        return cpp.cast(new ast.CppType('int'), index);
      }
    }
    return index;
  }
}
