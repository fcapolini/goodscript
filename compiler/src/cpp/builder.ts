/**
 * C++ AST Builder
 * 
 * Provides fluent API for constructing C++ AST nodes.
 * This makes code generation more readable and maintainable.
 */

import * as AST from './ast';

/**
 * Fluent builder for constructing C++ AST
 */
export class CppBuilder {
  
  // ============================================================================
  // Types
  // ============================================================================
  
  type(name: string, ...templateArgs: AST.CppType[]): AST.CppType {
    return new AST.CppType(name, templateArgs);
  }

  auto(): AST.CppType {
    return AST.CppType.auto();
  }

  void(): AST.CppType {
    return AST.CppType.void();
  }

  int(): AST.CppType {
    return AST.CppType.int();
  }

  double(): AST.CppType {
    return AST.CppType.double();
  }

  bool(): AST.CppType {
    return AST.CppType.bool();
  }

  string(): AST.CppType {
    return AST.CppType.string();
  }

  uniquePtr(elementType: AST.CppType): AST.CppType {
    return AST.CppType.uniquePtr(elementType);
  }

  sharedPtr(elementType: AST.CppType): AST.CppType {
    return AST.CppType.sharedPtr(elementType);
  }

  weakPtr(elementType: AST.CppType): AST.CppType {
    return AST.CppType.weakPtr(elementType);
  }

  optional(elementType: AST.CppType): AST.CppType {
    return AST.CppType.optional(elementType);
  }

  vector(elementType: AST.CppType): AST.CppType {
    return AST.CppType.vector(elementType);
  }

  map(keyType: AST.CppType, valueType: AST.CppType): AST.CppType {
    return AST.CppType.map(keyType, valueType);
  }

  // ============================================================================
  // Top-level
  // ============================================================================
  
  translationUnit(
    includes: AST.Include[],
    declarations: AST.Declaration[],
    mainFunction?: AST.Function
  ): AST.TranslationUnit {
    return new AST.TranslationUnit(includes, declarations, mainFunction);
  }

  include(path: string, isSystemHeader = true): AST.Include {
    return new AST.Include(path, isSystemHeader);
  }

  namespace(name: string, declarations: AST.Declaration[]): AST.Namespace {
    return new AST.Namespace(name, declarations);
  }

  // ============================================================================
  // Declarations
  // ============================================================================
  
  class_(
    name: string,
    options: {
      fields?: AST.Field[];
      constructors?: AST.Constructor[];
      methods?: AST.Method[];
      baseClass?: string;
      templateParams?: string[];
    } = {}
  ): AST.Class {
    return new AST.Class(
      name,
      options.fields || [],
      options.constructors || [],
      options.methods || [],
      options.baseClass,
      options.templateParams
    );
  }

  field(
    name: string,
    type: AST.CppType,
    options: {
      access?: AST.AccessSpecifier;
      initializer?: AST.Expression;
    } = {}
  ): AST.Field {
    return new AST.Field(name, type, options.access, options.initializer);
  }

  constructor_(
    params: AST.Parameter[],
    initializerList: AST.MemberInitializer[],
    body: AST.Block,
    access: AST.AccessSpecifier = AST.AccessSpecifier.Public
  ): AST.Constructor {
    return new AST.Constructor(params, initializerList, body, access);
  }

  memberInit(memberName: string, value: AST.Expression): AST.MemberInitializer {
    return new AST.MemberInitializer(memberName, value);
  }

  method(
    name: string,
    returnType: AST.CppType,
    params: AST.Parameter[],
    body: AST.Block,
    options: {
      access?: AST.AccessSpecifier;
      isConst?: boolean;
      isStatic?: boolean;
      isVirtual?: boolean;
    } = {}
  ): AST.Method {
    return new AST.Method(
      name,
      returnType,
      params,
      body,
      options.access || AST.AccessSpecifier.Public,
      options.isConst || false,
      options.isStatic || false,
      options.isVirtual || false
    );
  }

  function(
    name: string,
    returnType: AST.CppType,
    params: AST.Parameter[],
    body: AST.Block,
    templateParams: string[] = []
  ): AST.Function {
    return new AST.Function(name, returnType, params, body, templateParams);
  }

  param(name: string, type: AST.CppType, defaultValue?: AST.Expression): AST.Parameter {
    return new AST.Parameter(name, type, defaultValue);
  }

  // ============================================================================
  // Statements
  // ============================================================================
  
  varDecl(name: string, type: AST.CppType, initializer?: AST.Expression): AST.VariableDecl {
    return new AST.VariableDecl(name, type, initializer);
  }

  exprStmt(expression: AST.Expression): AST.ExpressionStmt {
    return new AST.ExpressionStmt(expression);
  }

  return_(value?: AST.Expression): AST.ReturnStmt {
    return new AST.ReturnStmt(value);
  }

  if_(
    condition: AST.Expression,
    thenBranch: AST.Statement,
    elseBranch?: AST.Statement
  ): AST.IfStmt {
    return new AST.IfStmt(condition, thenBranch, elseBranch);
  }

  while_(condition: AST.Expression, body: AST.Statement): AST.WhileStmt {
    return new AST.WhileStmt(condition, body);
  }

  for_(
    init: AST.Statement | undefined,
    condition: AST.Expression | undefined,
    increment: AST.Expression | undefined,
    body: AST.Statement
  ): AST.ForStmt {
    return new AST.ForStmt(init, condition, increment, body);
  }

  block(...statements: AST.Statement[]): AST.Block {
    return new AST.Block(statements);
  }

  throw_(expression: AST.Expression): AST.ThrowStmt {
    return new AST.ThrowStmt(expression);
  }

  tryCatch(
    tryBlock: AST.Block,
    catchVar: string,
    catchType: AST.CppType,
    catchBlock: AST.Block
  ): AST.TryCatch {
    return new AST.TryCatch(tryBlock, catchVar, catchType, catchBlock);
  }

  break_(): AST.BreakStmt {
    return new AST.BreakStmt();
  }

  continue_(): AST.ContinueStmt {
    return new AST.ContinueStmt();
  }

  // ============================================================================
  // Expressions
  // ============================================================================
  
  binary(left: AST.Expression, operator: string, right: AST.Expression): AST.BinaryExpr {
    return new AST.BinaryExpr(left, operator, right);
  }

  unary(operator: string, operand: AST.Expression, isPrefix = true): AST.UnaryExpr {
    return new AST.UnaryExpr(operator, operand, isPrefix);
  }

  call(callee: AST.Expression, args: AST.Expression[], templateArgs: AST.CppType[] = []): AST.CallExpr {
    return new AST.CallExpr(callee, args, templateArgs);
  }

  member(object: AST.Expression, member: string, isPointer = false): AST.MemberExpr {
    return new AST.MemberExpr(object, member, isPointer);
  }

  subscript(object: AST.Expression, index: AST.Expression): AST.SubscriptExpr {
    return new AST.SubscriptExpr(object, index);
  }

  id(name: string): AST.Identifier {
    return new AST.Identifier(name);
  }

  literal(value: string | number | boolean | null): AST.Literal {
    let type: 'string' | 'number' | 'boolean' | 'null';
    if (value === null) {
      type = 'null';
    } else if (typeof value === 'string') {
      type = 'string';
    } else if (typeof value === 'number') {
      type = 'number';
    } else {
      type = 'boolean';
    }
    return new AST.Literal(value, type);
  }

  stringLit(value: string): AST.Literal {
    return new AST.Literal(value, 'string');
  }

  numberLit(value: number): AST.Literal {
    return new AST.Literal(value, 'number');
  }

  /**
   * Create an integer literal (e.g., 42)
   */
  intLit(value: number): AST.Literal {
    return new AST.Literal(Math.floor(value), 'number');
  }

  /**
   * Create a double literal (e.g., 42.0)
   */
  doubleLit(value: number): AST.Literal {
    // Ensure it has a decimal point
    const val = value.toString().includes('.') ? value : parseFloat(`${value}.0`);
    return new AST.Literal(val, 'number');
  }

  boolLit(value: boolean): AST.Literal {
    return new AST.Literal(value, 'boolean');
  }

  nullLit(): AST.Literal {
    return new AST.Literal(null, 'null');
  }

  cast(
    type: AST.CppType,
    expression: AST.Expression,
    castType: 'static' | 'dynamic' | 'reinterpret' | 'const' = 'static'
  ): AST.Cast {
    return new AST.Cast(type, expression, castType);
  }

  new_(
    type: AST.CppType,
    args: AST.Expression[],
    smartPtrType?: 'unique' | 'shared'
  ): AST.New {
    return new AST.New(type, args, smartPtrType);
  }

  lambda(
    params: AST.Parameter[],
    body: AST.Block | AST.Expression,
    returnType?: AST.CppType,
    capture = '[&]'
  ): AST.Lambda {
    return new AST.Lambda(params, body, returnType, capture);
  }

  arrayInit(elements: AST.Expression[], elementType?: AST.CppType): AST.ArrayInit {
    return new AST.ArrayInit(elements, elementType);
  }

  mapInit(
    entries: [AST.Expression, AST.Expression][],
    keyType?: AST.CppType,
    valueType?: AST.CppType
  ): AST.MapInit {
    return new AST.MapInit(entries, keyType, valueType);
  }

  // ============================================================================
  // Convenience methods for common patterns
  // ============================================================================
  
  /**
   * Create std::make_unique<T>(args...)
   */
  makeUnique(type: AST.CppType, ...args: AST.Expression[]): AST.CallExpr {
    return this.call(
      this.id('std::make_unique'),
      args,
      [type]
    );
  }

  /**
   * Create std::make_shared<T>(args...)
   */
  makeShared(type: AST.CppType, ...args: AST.Expression[]): AST.CallExpr {
    return this.call(
      this.id('gs::make_shared'),
      args,
      [type]
    );
  }

  /**
   * Create std::move(expr)
   */
  move(expr: AST.Expression): AST.CallExpr {
    return this.call(this.id('std::move'), [expr]);
  }

  /**
   * Create member access chain: obj.member1.member2...
   */
  memberChain(object: AST.Expression, ...members: string[]): AST.Expression {
    let result = object;
    for (const member of members) {
      result = this.member(result, member);
    }
    return result;
  }

  /**
   * Create pointer member access chain: obj->member1->member2...
   */
  ptrMemberChain(object: AST.Expression, ...members: string[]): AST.Expression {
    let result = object;
    for (const member of members) {
      result = this.member(result, member, true);
    }
    return result;
  }

  /**
   * Create assignment: lhs = rhs
   */
  assign(lhs: AST.Expression, rhs: AST.Expression): AST.BinaryExpr {
    return this.binary(lhs, '=', rhs);
  }

  /**
   * Create +=, -=, etc.
   */
  assignOp(lhs: AST.Expression, op: string, rhs: AST.Expression): AST.BinaryExpr {
    return this.binary(lhs, `${op}=`, rhs);
  }
}

/**
 * Default builder instance
 */
export const cpp = new CppBuilder();
