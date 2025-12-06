/**
 * BinaryExpressionHandler - Handles translation of TypeScript binary expressions to C++
 * 
 * Extracted from AstCodegen (Phase 7) to improve maintainability.
 * Handles:
 * - Array element assignment with bounds checking
 * - instanceof operator → dynamic_pointer_cast
 * - Arithmetic operators with type coercion
 * - Comparison operators with null/undefined handling
 * - Bitwise operators with integer casting
 * - Smart pointer comparisons
 * - Optional value unwrapping
 * - Pointer dereferencing in arithmetic contexts
 */

import * as ts from 'typescript';
import * as ast from '../ast';
import { cpp } from '../builder';
import * as cppUtils from '../cpp-utils';
import * as tsUtils from '../ts-utils';
import { TransformContext } from '../transform-context';
import { ExpressionAnalyzer } from '../expression-analyzer';

export class BinaryExpressionHandler {
  constructor(
    private readonly checker: ts.TypeChecker | undefined,
    private readonly ctx: TransformContext,
    private readonly visitExpression: (node: ts.Expression) => ast.Expression,
    private readonly isArrayAccessInSafeBounds: (node: ts.ElementAccessExpression) => boolean
  ) {}

  /**
   * Handle binary expression: arithmetic, comparison, assignment, etc.
   */
  handleBinary(node: ts.BinaryExpression): ast.Expression {
    // Special case: array element assignment
    if (node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isElementAccessExpression(node.left)) {
      return this.handleArrayAssignment(node);
    }
    
    // Special case: array.length = n
    if (node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isPropertyAccessExpression(node.left) &&
        node.left.name.text === 'length') {
      return this.handleLengthAssignment(node);
    }
    
    // Handle instanceof
    if (node.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword) {
      return this.handleInstanceOf(node);
    }
    
    // Handle modulo with floating point
    if (node.operatorToken.kind === ts.SyntaxKind.PercentToken && this.checker) {
      const floatingMod = this.tryHandleFloatingModulo(node);
      if (floatingMod) return floatingMod;
    }
    
    // Map operators
    let op = node.operatorToken.getText();
    if (op === '===') op = '==';
    if (op === '!==') op = '!=';
    
    // Handle >>> (unsigned right shift) - needs special C++ handling
    const isUnsignedRightShift = op === '>>>';
    if (isUnsignedRightShift) {
      op = '>>';  // Will be wrapped in static_cast<unsigned> later
    }
    
    // Check for bitwise operators
    const isBitwiseOp = ['&', '|', '^', '<<', '>>', '>>>'].includes(node.operatorToken.getText());
    
    // Analyze null/undefined checks BEFORE visiting expressions
    const nullCheck = this.analyzeNullComparison(node);
    
    // Now visit the expressions
    let left = this.visitExpression(node.left);
    let right = this.visitExpression(node.right);
    
    // Handle bitwise operators
    if (isBitwiseOp && this.checker) {
      ({ left, right } = this.handleBitwiseOperands(node, left, right));
    }
    
    // Handle arithmetic/comparison with optional values
    const isArithmeticOrComparisonOp = ['+', '-', '*', '/', '%', '<', '>', '<=', '>='].includes(op);
    if (isArithmeticOrComparisonOp && this.checker) {
      ({ left, right } = this.unwrapOptionalOperands(node, left, right));
    }
    
    // Special case: optional null checks → has_value()
    if ((op === '==' || op === '!=') && nullCheck.isNullCheck) {
      const optionalCheck = this.tryOptionalHasValue(node, op, nullCheck, left, right);
      if (optionalCheck) return optionalCheck;
    }
    
    // Dereference pointer variables in arithmetic
    const isArithmeticOp = ['+', '-', '*', '/', '%', '<', '>', '<=', '>='].includes(op);
    if (isArithmeticOp) {
      ({ left, right } = this.dereferencePointerOperands(node, left, right));
    }
    
    // Handle pointer comparisons with null/undefined
    if (nullCheck.isNullCheck) {
      ({ left, right } = this.handlePointerNullComparison(node, nullCheck, left, right));
    }
    
    // Handle unsigned right shift >>> with proper casting
    if (isUnsignedRightShift) {
      // JavaScript: a >>> b
      // C++: static_cast<int>(static_cast<unsigned int>(a) >> b)
      const unsignedLeft = cpp.cast(new ast.CppType('unsigned int'), left);
      const shiftExpr = cpp.binary(unsignedLeft, '>>', right);
      return cpp.cast(new ast.CppType('int'), shiftExpr);
    }
    
    return cpp.binary(left, op, right);
  }

  /**
   * Handle array element assignment: arr[idx] = value
   */
  private handleArrayAssignment(node: ts.BinaryExpression): ast.Expression {
    const elementAccess = node.left as ts.ElementAccessExpression;
    
    // Check if we're in a safe bounds context
    const isInSafeBoundsContext = this.isArrayAccessInSafeBounds(elementAccess);
    
    const arrExpr = this.visitExpression(elementAccess.expression);
    const indexExpr = this.visitExpression(elementAccess.argumentExpression!);
    const valueExpr = this.visitExpression(node.right);
    
    // Cast index to int if needed
    const finalIndex = this.castIndexToInt(elementAccess.argumentExpression!, indexExpr);
    
    if (isInSafeBoundsContext) {
      // Use optimized set_unchecked - no resize checks needed
      return cpp.call(cpp.member(arrExpr, 'set_unchecked', false), [finalIndex, valueExpr]);
    } else {
      // Use bounds-checking set() method
      return cpp.call(cpp.member(arrExpr, 'set', false), [finalIndex, valueExpr]);
    }
  }

  /**
   * Handle array.length = n → array.resize(n)
   */
  private handleLengthAssignment(node: ts.BinaryExpression): ast.Expression {
    const propAccess = node.left as ts.PropertyAccessExpression;
    const obj = this.visitExpression(propAccess.expression);
    const newSize = this.visitExpression(node.right);
    const isThisPointer = propAccess.expression.kind === ts.SyntaxKind.ThisKeyword;
    return cpp.call(cpp.member(obj, 'resize', isThisPointer), [newSize]);
  }

  /**
   * Handle instanceof operator
   */
  private handleInstanceOf(node: ts.BinaryExpression): ast.Expression {
    const obj = this.visitExpression(node.left);
    const typeName = node.right.getText();
    
    // e instanceof Type → std::dynamic_pointer_cast<gs::Type>(e) != nullptr
    return cpp.binary(
      cpp.call(
        cpp.id('std::dynamic_pointer_cast'),
        [obj],
        [new ast.CppType(`gs::${typeName}`)]
      ),
      '!=',
      cpp.id('nullptr')
    );
  }

  /**
   * Try to handle floating-point modulo
   */
  private tryHandleFloatingModulo(node: ts.BinaryExpression): ast.Expression | undefined {
    const leftType = this.checker!.getTypeAtLocation(node.left);
    const rightType = this.checker!.getTypeAtLocation(node.right);
    const leftTypeStr = this.checker!.typeToString(leftType);
    const rightTypeStr = this.checker!.typeToString(rightType);
    
    // If either operand is 'number' (maps to double), use std::fmod
    if (leftTypeStr === 'number' || rightTypeStr === 'number') {
      const left = this.visitExpression(node.left);
      const right = this.visitExpression(node.right);
      return cpp.call(cpp.id('std::fmod'), [left, right]);
    }
    
    return undefined;
  }

  /**
   * Analyze null/undefined comparison context
   */
  private analyzeNullComparison(node: ts.BinaryExpression): {
    isNullCheck: boolean;
    isLeftNull: boolean;
    isRightNull: boolean;
    isLeftUndefined: boolean;
    isRightUndefined: boolean;
    isLeftMapGet: boolean;
    isRightMapGet: boolean;
    isLeftPointer: boolean;
    isRightPointer: boolean;
    isLeftSharedPtr: boolean;
    isRightSharedPtr: boolean;
  } {
    const isLeftNull = node.left.kind === ts.SyntaxKind.NullKeyword;
    const isRightNull = node.right.kind === ts.SyntaxKind.NullKeyword;
    const isLeftUndefined = ts.isIdentifier(node.left) && node.left.text === 'undefined';
    const isRightUndefined = ts.isIdentifier(node.right) && node.right.text === 'undefined';
    
    const isLeftMapGet = tsUtils.isMapGetCall(node.left);
    const isRightMapGet = tsUtils.isMapGetCall(node.right);
    
    const isLeftPointer = ts.isIdentifier(node.left) && 
      this.ctx.pointerVariables.has(cppUtils.escapeName(node.left.text));
    const isRightPointer = ts.isIdentifier(node.right) && 
      this.ctx.pointerVariables.has(cppUtils.escapeName(node.right.text));
    
    let isLeftSharedPtr = false;
    let isRightSharedPtr = false;
    
    if (this.checker) {
      isLeftSharedPtr = this.isSmartPointerType(node.left, isLeftNull, isLeftUndefined);
      isRightSharedPtr = this.isSmartPointerType(node.right, isRightNull, isRightUndefined);
    }
    
    return {
      isNullCheck: isLeftNull || isRightNull || isLeftUndefined || isRightUndefined,
      isLeftNull,
      isRightNull,
      isLeftUndefined,
      isRightUndefined,
      isLeftMapGet,
      isRightMapGet,
      isLeftPointer,
      isRightPointer,
      isLeftSharedPtr,
      isRightSharedPtr
    };
  }

  /**
   * Check if expression has smart pointer type
   */
  private isSmartPointerType(
    expr: ts.Expression,
    isNull: boolean,
    isUndefined: boolean
  ): boolean {
    if (!this.checker || isNull || isUndefined || !ts.isIdentifier(expr)) {
      return false;
    }
    
    const varName = cppUtils.escapeName(expr.text);
    const varType = this.ctx.variableTypes.get(varName);
    if (!varType) return false;
    
    const typeStr = varType.toString();
    
    // Check if the DIRECT type is a smart pointer
    if (typeStr.startsWith('std::shared_ptr<') || 
        typeStr.startsWith('std::unique_ptr<') ||
        typeStr.startsWith('std::weak_ptr<')) {
      return true;
    }
    
    // Check TypeScript type for nullable class patterns (T | null, not T | undefined)
    if (varType.toString() === 'auto') {
      const tsType = this.checker.getTypeAtLocation(expr);
      if (tsType.isUnion && tsType.isUnion()) {
        const types = tsType.types;
        const hasNull = types.some(t => (t.flags & ts.TypeFlags.Null) !== 0);
        const hasUndefined = types.some(t => (t.flags & ts.TypeFlags.Undefined) !== 0);
        const classType = types.find(t => 
          (t.flags & ts.TypeFlags.Object) !== 0 &&
          (t as any).symbol &&
          !(t as any).symbol.getName().match(/Array|Map|Set|String|RegExp|Date|Promise/)
        );
        
        // T | null (without undefined) indicates a nullable reference
        if (hasNull && !hasUndefined && classType) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Handle bitwise operator operands - cast to int
   */
  private handleBitwiseOperands(
    node: ts.BinaryExpression,
    left: ast.Expression,
    right: ast.Expression
  ): { left: ast.Expression; right: ast.Expression } {
    const leftType = this.checker!.getTypeAtLocation(node.left);
    const rightType = this.checker!.getTypeAtLocation(node.right);
    const leftTypeStr = this.checker!.typeToString(leftType);
    const rightTypeStr = this.checker!.typeToString(rightType);
    
    // Cast left operand if it's a number (double)
    if (leftTypeStr === 'number') {
      left = cpp.cast(new ast.CppType('int'), left);
    }
    // Cast right operand if it's a number (double)
    if (rightTypeStr === 'number') {
      right = cpp.cast(new ast.CppType('int'), right);
    }
    
    return { left, right };
  }

  /**
   * Unwrap optional operands for arithmetic/comparison
   */
  private unwrapOptionalOperands(
    node: ts.BinaryExpression,
    left: ast.Expression,
    right: ast.Expression
  ): { left: ast.Expression; right: ast.Expression } {
    // Check left operand
    if (ts.isIdentifier(node.left)) {
      const varName = cppUtils.escapeName(node.left.text);
      const varType = this.ctx.variableTypes.get(varName);
      if (varType && varType.toString().startsWith('std::optional<')) {
        left = cpp.call(cpp.member(left, 'value'), []);
      }
    }
    
    // Check right operand
    if (ts.isIdentifier(node.right)) {
      const varName = cppUtils.escapeName(node.right.text);
      const varType = this.ctx.variableTypes.get(varName);
      if (varType && varType.toString().startsWith('std::optional<')) {
        right = cpp.call(cpp.member(right, 'value'), []);
      }
    }
    
    return { left, right };
  }

  /**
   * Try to use has_value() for optional null checks
   */
  private tryOptionalHasValue(
    node: ts.BinaryExpression,
    op: string,
    nullCheck: ReturnType<typeof this.analyzeNullComparison>,
    left: ast.Expression,
    right: ast.Expression
  ): ast.Expression | undefined {
    const valueExpr = nullCheck.isLeftNull || nullCheck.isLeftUndefined ? node.right : node.left;
    
    // Check if the value expression is an identifier with std::optional<T> type
    if (ts.isIdentifier(valueExpr)) {
      const varName = cppUtils.escapeName(valueExpr.text);
      const varType = this.ctx.variableTypes.get(varName);
      
      if (varType && varType.toString().startsWith('std::optional<')) {
        const valueIdent = nullCheck.isLeftNull || nullCheck.isLeftUndefined ? right : left;
        const hasValueCall = cpp.call(cpp.member(valueIdent, 'has_value'), []);
        
        // If operator is !== (not equal to null/undefined), keep has_value()
        // If operator is === (equal to null/undefined), negate it
        return op === '!=' ? hasValueCall : cpp.unary('!', hasValueCall);
      }
    }
    
    return undefined;
  }

  /**
   * Dereference pointer operands in arithmetic contexts
   */
  private dereferencePointerOperands(
    node: ts.BinaryExpression,
    left: ast.Expression,
    right: ast.Expression
  ): { left: ast.Expression; right: ast.Expression } {
    // Dereference left if it's a pointer variable
    if (ts.isIdentifier(node.left)) {
      const varName = cppUtils.escapeName(node.left.text);
      const alreadyDereferenced = this.ctx.unwrappedOptionals.has(varName) && 
                                  this.ctx.pointerVariables.has(varName);
      if (this.ctx.pointerVariables.has(varName) && 
          !this.ctx.structuredBindingVariables.has(varName) &&
          !alreadyDereferenced) {
        left = cpp.unary('*', left);
      }
    }
    
    // Dereference right if it's a pointer variable
    if (ts.isIdentifier(node.right)) {
      const varName = cppUtils.escapeName(node.right.text);
      const alreadyDereferenced = this.ctx.unwrappedOptionals.has(varName) && 
                                  this.ctx.pointerVariables.has(varName);
      if (this.ctx.pointerVariables.has(varName) && 
          !this.ctx.structuredBindingVariables.has(varName) &&
          !alreadyDereferenced) {
        right = cpp.unary('*', right);
      }
    }
    
    return { left, right };
  }

  /**
   * Handle pointer comparisons with null/undefined
   */
  private handlePointerNullComparison(
    node: ts.BinaryExpression,
    nullCheck: ReturnType<typeof this.analyzeNullComparison>,
    left: ast.Expression,
    right: ast.Expression
  ): { left: ast.Expression; right: ast.Expression } {
    // If comparing a pointer/shared_ptr with undefined/null, replace with nullptr
    if ((nullCheck.isLeftMapGet || nullCheck.isLeftPointer || nullCheck.isLeftSharedPtr) && 
        (nullCheck.isRightNull || nullCheck.isRightUndefined)) {
      right = cpp.id('nullptr');
    } else if ((nullCheck.isRightMapGet || nullCheck.isRightPointer || nullCheck.isRightSharedPtr) && 
               (nullCheck.isLeftNull || nullCheck.isLeftUndefined)) {
      left = cpp.id('nullptr');
    } else {
      // For other optional comparisons, use std::nullopt for null
      if (nullCheck.isLeftNull && left instanceof ast.Identifier && left.name === 'nullptr') {
        left = cpp.id('std::nullopt');
      }
      if (nullCheck.isRightNull && right instanceof ast.Identifier && right.name === 'nullptr') {
        right = cpp.id('std::nullopt');
      }
    }
    
    return { left, right };
  }

  /**
   * Cast array index to int if needed
   */
  private castIndexToInt(indexNode: ts.Expression, indexExpr: ast.Expression): ast.Expression {
    if (!this.checker) return indexExpr;
    
    const indexType = this.checker.getTypeAtLocation(indexNode);
    const indexTypeStr = this.checker.typeToString(indexType);
    
    if (indexTypeStr === 'number') {
      return cpp.cast(new ast.CppType('int'), indexExpr);
    }
    
    return indexExpr;
  }
}
