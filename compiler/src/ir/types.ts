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
  | { kind: 'interface'; name: string; ownership: Ownership; typeArgs?: IRType[] }
  | { kind: 'array'; element: IRType; ownership: Ownership }
  | { kind: 'map'; key: IRType; value: IRType; ownership: Ownership }
  | { kind: 'function'; params: IRType[]; returnType: IRType }
  | { kind: 'union'; types: IRType[] }
  | { kind: 'nullable'; inner: IRType };

export enum PrimitiveType {
  Number = 'number',
  Integer = 'integer',
  Integer53 = 'integer53',
  String = 'string',
  Boolean = 'boolean',
  Void = 'void',
  Never = 'never',
}

// ============================================================================
// Source Location Tracking
// ============================================================================

/**
 * Source location for debugging and error reporting
 */
export interface SourceLocation {
  file: string;     // Absolute path to source file
  line: number;     // 1-based line number
  column: number;   // 1-based column number
}

// ============================================================================
// Program Structure
// ============================================================================

export interface IRProgram {
  modules: IRModule[];
}

export interface IRModule {
  path: string;
  declarations: IRDeclaration[];
  imports: IRImport[];
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
  | IRTypeAliasDecl
  | IRConstDecl;

export interface IRConstDecl {
  kind: 'const';
  name: string;
  type: IRType;
  value: IRExpr;
  source?: SourceLocation;
}

export interface IRFunctionDecl {
  kind: 'function';
  name: string;
  params: IRParam[];
  returnType: IRType;
  body: IRBlock;
  typeParams?: IRTypeParam[];
  source?: SourceLocation;
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
  source?: SourceLocation;
}

export interface IRInterfaceDecl {
  kind: 'interface';
  name: string;
  properties: Array<{ name: string; type: IRType; location?: SourceLocation }>;
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
  | IRFieldAssign
  | IRExprStmt;

export interface IRExprStmt {
  kind: 'expr';
  value: IRExpr;
}

export interface IRAssign {
  kind: 'assign';
  target: IRVariable;
  value: IRExpr;
  type: IRType;
  isDeclaration?: boolean;  // True for initial declaration, false/undefined for reassignment
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
  | IRConditional
  | IRMemberAccess
  | IRIndexAccess
  | IRCallExpr
  | IRMethodCall
  | IRNew
  | IRArrayLiteral
  | IRObjectLiteral
  | IRLambda
  | IRMove
  | IRBorrow;

export interface IRLiteral {
  kind: 'literal';
  value: number | string | boolean | null;
  type: IRType;
  source?: SourceLocation;
}

export interface IRVariable {
  kind: 'variable';
  name: string;
  version: number; // SSA version
  type: IRType;
  source?: SourceLocation;
}

export interface IRBinary {
  kind: 'binary';
  op: BinaryOp;
  left: IRExpr;
  right: IRExpr;
  type: IRType;
  source?: SourceLocation;
}

export interface IRUnary {
  kind: 'unary';
  op: UnaryOp;
  operand: IRExpr;
  type: IRType;
  source?: SourceLocation;
}

export interface IRConditional {
  kind: 'conditional';
  condition: IRExpr;
  whenTrue: IRExpr;
  whenFalse: IRExpr;
  type: IRType;
  source?: SourceLocation;
}

export interface IRMemberAccess {
  kind: 'member';
  object: IRExpr;
  member: string;
  type: IRType;
  source?: SourceLocation;
}

export interface IRIndexAccess {
  kind: 'index';
  object: IRExpr;
  index: IRExpr;
  type: IRType;
  source?: SourceLocation;
}

export interface IRCallExpr {
  kind: 'callExpr';
  callee: IRExpr;
  args: IRExpr[];
  type: IRType;
  source?: SourceLocation;
}

export interface IRMethodCall {
  kind: 'methodCall';
  object: IRExpr;
  method: string;
  args: IRExpr[];
  type: IRType;
  source?: SourceLocation;
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

export interface IRLambda {
  kind: 'lambda';
  params: IRParam[];
  body: IRBlock;
  captures: Array<{ name: string; type: IRType }>; // Captured variables
  type: IRType; // Function type
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
  Typeof = 'typeof',
}

// ============================================================================
// AST-Level IR (for Phase 2 Analysis)
// ============================================================================

/**
 * AST-level expressions (before lowering to SSA)
 */
export type IRExpression =
  | { kind: 'literal'; value: number | string | boolean | null; type: IRType; location?: { line: number; column: number } }
  | { kind: 'identifier'; name: string; type: IRType; location?: { line: number; column: number } }
  | { kind: 'binary'; operator: BinaryOp; left: IRExpression; right: IRExpression; type: IRType; location?: { line: number; column: number } }
  | { kind: 'unary'; operator: UnaryOp; operand: IRExpression; type: IRType; location?: { line: number; column: number } }
  | { kind: 'call'; callee: IRExpression; arguments: IRExpression[]; type: IRType; location?: { line: number; column: number } }
  | { kind: 'memberAccess'; object: IRExpression; member: string; type: IRType; location?: { line: number; column: number } }
  | { kind: 'indexAccess'; object: IRExpression; index: IRExpression; type: IRType; location?: { line: number; column: number } }
  | { kind: 'assignment'; left: IRExpression; right: IRExpression; type: IRType; location?: { line: number; column: number } }
  | { kind: 'arrayLiteral'; elements: IRExpression[]; type: IRType; location?: { line: number; column: number } }
  | { kind: 'objectLiteral'; properties: Array<{ key: string; value: IRExpression }>; type: IRType; location?: { line: number; column: number } };

/**
 * AST-level statements (before lowering to SSA)
 */
export type IRStatement =
  | { kind: 'variableDeclaration'; name: string; variableType: IRType; initializer?: IRExpression; location?: { line: number; column: number } }
  | { kind: 'expressionStatement'; expression: IRExpression; location?: { line: number; column: number } }
  | { kind: 'return'; value?: IRExpression; location?: { line: number; column: number } }
  | { kind: 'if'; condition: IRExpression; thenBranch: IRStatement[]; elseBranch?: IRStatement[]; location?: { line: number; column: number } }
  | { kind: 'while'; condition: IRExpression; body: IRStatement[]; location?: { line: number; column: number } }
  | { kind: 'for'; initializer?: IRStatement; condition?: IRExpression; increment?: IRExpression; body: IRStatement[]; location?: { line: number; column: number } }
  | { kind: 'block'; statements: IRStatement[]; location?: { line: number; column: number } };

