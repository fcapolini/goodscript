/**
 * C++ AST Node Definitions
 * 
 * This module defines the abstract syntax tree nodes for C++ code generation.
 * Using an AST-based approach provides better:
 * - Type safety for C++ constructs
 * - Composability and transformation
 * - Testing and validation
 * - Separation of concerns (construction vs. rendering)
 */

/**
 * Base class for all C++ AST nodes
 */
export abstract class CppNode {
  abstract accept<T>(visitor: CppVisitor<T>): T;
}

/**
 * Visitor interface for traversing C++ AST
 */
export interface CppVisitor<T> {
  visitTranslationUnit(node: TranslationUnit): T;
  visitInclude(node: Include): T;
  visitNamespace(node: Namespace): T;
  visitClass(node: Class): T;
  visitEnum(node: Enum): T;
  visitFunction(node: Function): T;
  visitMethod(node: Method): T;
  visitConstructor(node: Constructor): T;
  visitField(node: Field): T;
  visitParameter(node: Parameter): T;
  visitVariableDecl(node: VariableDecl): T;
  visitExpressionStmt(node: ExpressionStmt): T;
  visitReturnStmt(node: ReturnStmt): T;
  visitCoReturnStmt(node: CoReturnStmt): T;
  visitIfStmt(node: IfStmt): T;
  visitWhileStmt(node: WhileStmt): T;
  visitForStmt(node: ForStmt): T;
  visitRangeForStmt(node: RangeForStmt): T;
  visitBlock(node: Block): T;
  visitBinaryExpr(node: BinaryExpr): T;
  visitUnaryExpr(node: UnaryExpr): T;
  visitCallExpr(node: CallExpr): T;
  visitMemberExpr(node: MemberExpr): T;
  visitSubscriptExpr(node: SubscriptExpr): T;
  visitIdentifier(node: Identifier): T;
  visitLiteral(node: Literal): T;
  visitCast(node: Cast): T;
  visitNew(node: New): T;
  visitLambda(node: Lambda): T;
  visitArrayInit(node: ArrayInit): T;
  visitMapInit(node: MapInit): T;
  visitThrowStmt(node: ThrowStmt): T;
  visitTryCatch(node: TryCatch): T;
  visitBreakStmt(node: BreakStmt): T;
  visitContinueStmt(node: ContinueStmt): T;
  visitParenExpr(node: ParenExpr): T;
  visitConditionalExpr(node: ConditionalExpr): T;
  visitInitializerList(node: InitializerList): T;
  visitAwaitExpr(node: AwaitExpr): T;
}

// ============================================================================
// Types
// ============================================================================

export class CppType {
  constructor(
    public readonly name: string,
    public readonly templateArgs: CppType[] = [],
    public readonly isConst: boolean = false,
    public readonly isReference: boolean = false,
    public readonly isPointer: boolean = false
  ) {}

  toString(): string {
    let result = this.name;
    if (this.templateArgs.length > 0) {
      result += `<${this.templateArgs.map(t => t.toString()).join(', ')}>`;
    }
    if (this.isConst) result = `const ${result}`;
    if (this.isReference) result += '&';
    if (this.isPointer) result += '*';
    return result;
  }

  static auto(): CppType {
    return new CppType('auto');
  }

  static void(): CppType {
    return new CppType('void');
  }

  static int(): CppType {
    return new CppType('int');
  }

  static double(): CppType {
    return new CppType('double');
  }

  static bool(): CppType {
    return new CppType('bool');
  }

  static string(): CppType {
    return new CppType('gs::String');
  }

  static uniquePtr(elementType: CppType): CppType {
    return new CppType('std::unique_ptr', [elementType]);
  }

  static sharedPtr(elementType: CppType): CppType {
    return new CppType('gs::shared_ptr', [elementType]);
  }

  static weakPtr(elementType: CppType): CppType {
    return new CppType('gs::weak_ptr', [elementType]);
  }

  static optional(elementType: CppType): CppType {
    return new CppType('std::optional', [elementType]);
  }

  static vector(elementType: CppType): CppType {
    return new CppType('std::vector', [elementType]);
  }

  static map(keyType: CppType, valueType: CppType): CppType {
    return new CppType('std::unordered_map', [keyType, valueType]);
  }

  withConst(): CppType {
    return new CppType(this.name, this.templateArgs, true, this.isReference, this.isPointer);
  }

  withReference(): CppType {
    return new CppType(this.name, this.templateArgs, this.isConst, true, this.isPointer);
  }

  withPointer(): CppType {
    return new CppType(this.name, this.templateArgs, this.isConst, this.isReference, true);
  }
}

// ============================================================================
// Top-level constructs
// ============================================================================

export class TranslationUnit extends CppNode {
  constructor(
    public readonly includes: Include[],
    public readonly declarations: Declaration[],
    public readonly mainFunction?: Function
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitTranslationUnit(this);
  }
}

export class Include extends CppNode {
  constructor(
    public readonly path: string,
    public readonly isSystemHeader: boolean = true
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitInclude(this);
  }
}

export class Namespace extends CppNode {
  constructor(
    public readonly name: string,
    public readonly declarations: Declaration[]
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitNamespace(this);
  }
}

// ============================================================================
// Declarations
// ============================================================================

export type Declaration = Class | Enum | Function | VariableDecl | Namespace;

export enum AccessSpecifier {
  Public = 'public',
  Private = 'private',
  Protected = 'protected'
}

export class Enum extends CppNode {
  constructor(
    public readonly name: string,
    public readonly members: EnumMember[]
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitEnum(this);
  }
}

export class EnumMember {
  constructor(
    public readonly name: string,
    public readonly value?: number
  ) {}
}

export class Class extends CppNode {
  constructor(
    public readonly name: string,
    public readonly fields: Field[],
    public readonly constructors: Constructor[],
    public readonly methods: Method[],
    public readonly baseClass?: string,
    public readonly templateParams: string[] = [],
    public readonly isStruct: boolean = false,
    public readonly baseClasses: string[] = [] // Support multiple base classes for implements
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitClass(this);
  }
}

export class Field extends CppNode {
  constructor(
    public readonly name: string,
    public readonly type: CppType,
    public readonly access: AccessSpecifier = AccessSpecifier.Public,
    public readonly initializer?: Expression
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitField(this);
  }
}

export class Constructor extends CppNode {
  constructor(
    public readonly params: Parameter[],
    public readonly initializerList: MemberInitializer[],
    public readonly body: Block,
    public readonly access: AccessSpecifier = AccessSpecifier.Public
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitConstructor(this);
  }
}

export class MemberInitializer {
  constructor(
    public readonly memberName: string,
    public readonly value: Expression | Expression[] // Support both single and multiple arguments
  ) {}
}

export class Method extends CppNode {
  constructor(
    public readonly name: string,
    public readonly returnType: CppType,
    public readonly params: Parameter[],
    public readonly body: Block,
    public readonly access: AccessSpecifier = AccessSpecifier.Public,
    public readonly isConst: boolean = false,
    public readonly isStatic: boolean = false,
    public readonly isVirtual: boolean = false,
    public readonly isPureVirtual: boolean = false,
    public readonly isOverride: boolean = false,
    public readonly isDefault: boolean = false,
    public readonly isAsync: boolean = false
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitMethod(this);
  }
}

export class Function extends CppNode {
  constructor(
    public readonly name: string,
    public readonly returnType: CppType,
    public readonly params: Parameter[],
    public readonly body: Block,
    public readonly templateParams: string[] = [],
    public readonly isAsync: boolean = false
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitFunction(this);
  }
}

export class Parameter extends CppNode {
  constructor(
    public readonly name: string,
    public readonly type: CppType,
    public readonly defaultValue?: Expression,
    public readonly passByConstRef: boolean = false,
    public readonly passByMutableRef: boolean = false
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitParameter(this);
  }
}

// ============================================================================
// Statements
// ============================================================================

export type Statement = 
  | VariableDecl 
  | ExpressionStmt 
  | ReturnStmt 
  | CoReturnStmt
  | IfStmt 
  | WhileStmt 
  | ForStmt 
  | RangeForStmt
  | Block
  | ThrowStmt
  | TryCatch
  | BreakStmt
  | ContinueStmt;

export class VariableDecl extends CppNode {
  constructor(
    public readonly name: string,
    public readonly type: CppType,
    public readonly initializer?: Expression,
    public readonly isConst: boolean = false
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitVariableDecl(this);
  }
}

export class ExpressionStmt extends CppNode {
  constructor(
    public readonly expression: Expression
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitExpressionStmt(this);
  }
}

export class ReturnStmt extends CppNode {
  constructor(
    public readonly value?: Expression
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitReturnStmt(this);
  }
}

export class CoReturnStmt extends CppNode {
  constructor(
    public readonly value?: Expression
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitCoReturnStmt(this);
  }
}

export class IfStmt extends CppNode {
  constructor(
    public readonly condition: Expression,
    public readonly thenBranch: Statement,
    public readonly elseBranch?: Statement
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitIfStmt(this);
  }
}

export class WhileStmt extends CppNode {
  constructor(
    public readonly condition: Expression,
    public readonly body: Statement
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitWhileStmt(this);
  }
}

export class ForStmt extends CppNode {
  constructor(
    public readonly init: Statement | undefined,
    public readonly condition: Expression | undefined,
    public readonly increment: Expression | undefined,
    public readonly body: Statement
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitForStmt(this);
  }
}

export class RangeForStmt extends CppNode {
  constructor(
    public readonly variable: string,
    public readonly isConst: boolean,
    public readonly iterable: Expression,
    public readonly body: Statement
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitRangeForStmt(this);
  }
}

export class Block extends CppNode {
  constructor(
    public readonly statements: Statement[]
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitBlock(this);
  }
}

export class ThrowStmt extends CppNode {
  constructor(
    public readonly expression: Expression
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitThrowStmt(this);
  }
}

export class TryCatch extends CppNode {
  constructor(
    public readonly tryBlock: Block,
    public readonly catchVar: string,
    public readonly catchType: CppType,
    public readonly catchBlock: Block
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitTryCatch(this);
  }
}

export class BreakStmt extends CppNode {
  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitBreakStmt(this);
  }
}

export class ContinueStmt extends CppNode {
  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitContinueStmt(this);
  }
}

// ============================================================================
// Expressions
// ============================================================================

export type Expression = 
  | BinaryExpr 
  | UnaryExpr 
  | CallExpr 
  | MemberExpr 
  | SubscriptExpr
  | Identifier 
  | Literal
  | Cast
  | New
  | Lambda
  | ArrayInit
  | MapInit
  | ParenExpr
  | ConditionalExpr
  | InitializerList
  | AwaitExpr;

export class BinaryExpr extends CppNode {
  constructor(
    public readonly left: Expression,
    public readonly operator: string,
    public readonly right: Expression
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitBinaryExpr(this);
  }
}

export class UnaryExpr extends CppNode {
  constructor(
    public readonly operator: string,
    public readonly operand: Expression,
    public readonly isPrefix: boolean = true
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitUnaryExpr(this);
  }
}

export class CallExpr extends CppNode {
  constructor(
    public readonly callee: Expression,
    public readonly args: Expression[],
    public readonly templateArgs: CppType[] = []
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitCallExpr(this);
  }
}

export class MemberExpr extends CppNode {
  constructor(
    public readonly object: Expression,
    public readonly member: string,
    public readonly isPointer: boolean = false
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitMemberExpr(this);
  }
}

export class SubscriptExpr extends CppNode {
  constructor(
    public readonly object: Expression,
    public readonly index: Expression
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitSubscriptExpr(this);
  }
}

export class Identifier extends CppNode {
  constructor(
    public readonly name: string
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitIdentifier(this);
  }
}

export class Literal extends CppNode {
  constructor(
    public readonly value: string | number | boolean | null,
    public readonly type: 'string' | 'number' | 'boolean' | 'null'
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitLiteral(this);
  }
}

export class Cast extends CppNode {
  constructor(
    public readonly type: CppType,
    public readonly expression: Expression,
    public readonly castType: 'static' | 'dynamic' | 'reinterpret' | 'const' = 'static'
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitCast(this);
  }
}

export class New extends CppNode {
  constructor(
    public readonly type: CppType,
    public readonly args: Expression[],
    public readonly smartPtrType?: 'unique' | 'shared'
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitNew(this);
  }
}

export class Lambda extends CppNode {
  constructor(
    public readonly params: Parameter[],
    public readonly body: Block | Expression,
    public readonly returnType?: CppType,
    public readonly capture: string = '[&]'
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitLambda(this);
  }
}

export class ArrayInit extends CppNode {
  constructor(
    public readonly elements: Expression[],
    public readonly elementType?: CppType
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitArrayInit(this);
  }
}

export class MapInit extends CppNode {
  constructor(
    public readonly entries: [Expression, Expression][],
    public readonly keyType?: CppType,
    public readonly valueType?: CppType
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitMapInit(this);
  }
}

export class ParenExpr extends CppNode {
  constructor(
    public readonly expression: Expression
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitParenExpr(this);
  }
}

export class ConditionalExpr extends CppNode {
  constructor(
    public readonly condition: Expression,
    public readonly whenTrue: Expression,
    public readonly whenFalse: Expression
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitConditionalExpr(this);
  }
}

export class InitializerList extends CppNode {
  constructor(
    public readonly elements: Expression[]
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitInitializerList(this);
  }
}

export class AwaitExpr extends CppNode {
  constructor(
    public readonly expression: Expression
  ) {
    super();
  }

  accept<T>(visitor: CppVisitor<T>): T {
    return visitor.visitAwaitExpr(this);
  }
}
