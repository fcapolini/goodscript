/**
 * IR Type System
 * 
 * Explicitly typed, ownership-aware intermediate representation
 */

// ============================================================================
// Type System
// ============================================================================

export enum Ownership {
  /** Unique ownership - exclusive access */
  Own = 'own',
  /** Shared ownership - reference counted */
  Share = 'share',
  /** Borrowed reference - non-owning pointer */
  Use = 'use',
  /** Stack value - no ownership semantics */
  Value = 'value',
}

export type IRType = 
  | { kind: 'primitive'; type: PrimitiveType }
  | { kind: 'class'; name: string; ownership: Ownership; typeArgs?: IRType[] }
  | { kind: 'array'; element: IRType; ownership: Ownership }
  | { kind: 'map'; key: IRType; value: IRType; ownership: Ownership }
  | { kind: 'function'; params: IRType[]; returnType: IRType }
  | { kind: 'union'; types: IRType[] }
  | { kind: 'nullable'; inner: IRType };

export enum PrimitiveType {
  Number = 'number',
  String = 'string',
  Boolean = 'boolean',
  Void = 'void',
  Never = 'never',
}

// ============================================================================
// Program Structure
// ============================================================================

export interface IRProgram {
  modules: Map<string, IRModule>;
}

export interface IRModule {
  path: string;
  declarations: IRDeclaration[];
  imports: IRImport[];
  exports: IRExport[];
}

export interface IRImport {
  from: string;
  names: Array<{ name: string; alias?: string }>;
}

export interface IRExport {
  name: string;
  declaration?: IRDeclaration;
}

// ============================================================================
// Declarations
// ============================================================================

export type IRDeclaration =
  | IRFunctionDecl
  | IRClassDecl
  | IRInterfaceDecl
  | IRTypeAliasDecl;

export interface IRFunctionDecl {
  kind: 'function';
  name: string;
  params: IRParam[];
  returnType: IRType;
  body: IRBlock;
  typeParams?: IRTypeParam[];
}

export interface IRClassDecl {
  kind: 'class';
  name: string;
  fields: IRField[];
  methods: IRMethod[];
  constructor?: IRConstructor;
  extends?: string;
  implements?: string[];
  typeParams?: IRTypeParam[];
}

export interface IRInterfaceDecl {
  kind: 'interface';
  name: string;
  methods: IRMethodSignature[];
  extends?: string[];
  typeParams?: IRTypeParam[];
}

export interface IRTypeAliasDecl {
  kind: 'typeAlias';
  name: string;
  type: IRType;
  typeParams?: IRTypeParam[];
}

// ============================================================================
// Class Members
// ============================================================================

export interface IRField {
  name: string;
  type: IRType;
  initializer?: IRExpr;
  isReadonly: boolean;
}

export interface IRMethod {
  name: string;
  params: IRParam[];
  returnType: IRType;
  body: IRBlock;
  isStatic: boolean;
}

export interface IRMethodSignature {
  name: string;
  params: IRParam[];
  returnType: IRType;
}

export interface IRConstructor {
  params: IRParam[];
  body: IRBlock;
}

export interface IRParam {
  name: string;
  type: IRType;
}

export interface IRTypeParam {
  name: string;
  constraint?: IRType;
}

// ============================================================================
// Statements (SSA Form)
// ============================================================================

export interface IRBlock {
  id: number;
  instructions: IRInstruction[];
  terminator: IRTerminator;
}

export type IRInstruction =
  | IRAssign
  | IRCall
  | IRFieldAssign;

export interface IRAssign {
  kind: 'assign';
  target: IRVariable;
  value: IRExpr;
  type: IRType;
}

export interface IRCall {
  kind: 'call';
  target?: IRVariable; // undefined for void calls
  callee: IRExpr;
  args: IRExpr[];
  type: IRType;
}

export interface IRFieldAssign {
  kind: 'fieldAssign';
  object: IRExpr;
  field: string;
  value: IRExpr;
}

// ============================================================================
// Control Flow
// ============================================================================

export type IRTerminator =
  | { kind: 'return'; value?: IRExpr }
  | { kind: 'branch'; condition: IRExpr; trueBranch: number; falseBranch: number }
  | { kind: 'jump'; target: number }
  | { kind: 'unreachable' };

// ============================================================================
// Expressions
// ============================================================================

export type IRExpr =
  | IRLiteral
  | IRVariable
  | IRBinary
  | IRUnary
  | IRMemberAccess
  | IRIndexAccess
  | IRCallExpr
  | IRNew
  | IRArrayLiteral
  | IRObjectLiteral
  | IRMove
  | IRBorrow;

export interface IRLiteral {
  kind: 'literal';
  value: number | string | boolean | null;
  type: IRType;
}

export interface IRVariable {
  kind: 'variable';
  name: string;
  version: number; // SSA version
  type: IRType;
}

export interface IRBinary {
  kind: 'binary';
  op: BinaryOp;
  left: IRExpr;
  right: IRExpr;
  type: IRType;
}

export interface IRUnary {
  kind: 'unary';
  op: UnaryOp;
  operand: IRExpr;
  type: IRType;
}

export interface IRMemberAccess {
  kind: 'member';
  object: IRExpr;
  member: string;
  type: IRType;
}

export interface IRIndexAccess {
  kind: 'index';
  object: IRExpr;
  index: IRExpr;
  type: IRType;
}

export interface IRCallExpr {
  kind: 'callExpr';
  callee: IRExpr;
  args: IRExpr[];
  type: IRType;
}

export interface IRNew {
  kind: 'new';
  className: string;
  args: IRExpr[];
  type: IRType;
}

export interface IRArrayLiteral {
  kind: 'array';
  elements: IRExpr[];
  type: IRType;
}

export interface IRObjectLiteral {
  kind: 'object';
  properties: Array<{ key: string; value: IRExpr }>;
  type: IRType;
}

export interface IRMove {
  kind: 'move';
  source: IRExpr;
  type: IRType;
}

export interface IRBorrow {
  kind: 'borrow';
  source: IRExpr;
  type: IRType;
}

// ============================================================================
// Operators
// ============================================================================

export enum BinaryOp {
  Add = '+',
  Sub = '-',
  Mul = '*',
  Div = '/',
  Mod = '%',
  Eq = '==',
  Ne = '!=',
  Lt = '<',
  Le = '<=',
  Gt = '>',
  Ge = '>=',
  And = '&&',
  Or = '||',
}

export enum UnaryOp {
  Not = '!',
  Neg = '-',
  Plus = '+',
}
