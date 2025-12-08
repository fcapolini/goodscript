/**
 * Lowering: TypeScript AST → IR
 * 
 * Converts TypeScript AST to our IR representation
 */

import ts from 'typescript';
import type { IRModule, IRProgram, IRDeclaration, IRExpr, IRType, IRBlock, IRInstruction } from '../ir/types.js';
import { BinaryOp, UnaryOp, Ownership } from '../ir/types.js';
import { IRBuilder, types, expr } from '../ir/builder.js';

export class IRLowering {
  private builder = new IRBuilder();
  private typeChecker!: ts.TypeChecker;

  lower(program: ts.Program): IRProgram {
    this.typeChecker = program.getTypeChecker();
    const modules: IRModule[] = [];

    for (const sourceFile of program.getSourceFiles()) {
      if (!sourceFile.isDeclarationFile) {
        modules.push(this.lowerModule(sourceFile));
      }
    }

    return { modules };
  }

  private lowerModule(sourceFile: ts.SourceFile): IRModule {
    this.builder.resetVersions();
    const declarations: IRDeclaration[] = [];
    
    ts.forEachChild(sourceFile, (node) => {
      const decl = this.lowerDeclaration(node, sourceFile);
      if (decl) {
        declarations.push(decl);
      }
    });

    return {
      path: sourceFile.fileName,
      declarations,
      imports: [],
    };
  }

  private lowerDeclaration(node: ts.Node, sourceFile: ts.SourceFile): IRDeclaration | null {
    if (ts.isVariableStatement(node)) {
      const decl = node.declarationList.declarations[0];
      if (!decl) return null;

      const name = decl.name.getText(sourceFile);
      const type = this.lowerType(decl, sourceFile);
      const init = decl.initializer ? this.lowerExpr(decl.initializer, sourceFile) : null;

      if (!init) return null;

      return {
        kind: 'const',
        name,
        type,
        value: init,
      };
    }

    if (ts.isFunctionDeclaration(node)) {
      return this.lowerFunction(node, sourceFile);
    }

    if (ts.isClassDeclaration(node)) {
      return this.lowerClass(node, sourceFile);
    }

    return null;
  }

  private lowerFunction(node: ts.FunctionDeclaration, sourceFile: ts.SourceFile): IRDeclaration | null {
    const name = node.name?.getText(sourceFile);
    if (!name) return null;

    const params = node.parameters.map(p => ({
      name: p.name.getText(sourceFile),
      type: this.lowerTypeNode(p.type, sourceFile),
    }));

    const returnType = this.lowerTypeNode(node.type, sourceFile);
    const body = node.body ? this.lowerBlock(node.body, sourceFile) : this.builder.block([], { kind: 'return', value: undefined });

    return {
      kind: 'function',
      name,
      params,
      returnType,
      body,
    };
  }

  private lowerClass(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): IRDeclaration | null {
    const name = node.name?.getText(sourceFile);
    if (!name) return null;

    const fields: Array<{ name: string; type: IRType; isReadonly: boolean }> = [];
    const methods: Array<{ name: string; params: { name: string; type: IRType }[]; returnType: IRType; body: IRBlock; isStatic: boolean }> = [];

    for (const member of node.members) {
      if (ts.isPropertyDeclaration(member)) {
        const fieldName = member.name.getText(sourceFile);
        const fieldType = this.lowerTypeNode(member.type, sourceFile);
        const isReadonly = member.modifiers?.some(m => m.kind === ts.SyntaxKind.ReadonlyKeyword) ?? false;
        fields.push({ name: fieldName, type: fieldType, isReadonly });
      } else if (ts.isMethodDeclaration(member)) {
        const method = this.lowerMethod(member, sourceFile);
        if (method) methods.push(method);
      }
    }

    return {
      kind: 'class',
      name,
      fields,
      methods,
      constructor: undefined,
    };
  }

  private lowerMethod(node: ts.MethodDeclaration, sourceFile: ts.SourceFile): { name: string; params: { name: string; type: IRType }[]; returnType: IRType; body: IRBlock; isStatic: boolean } | null {
    const name = node.name.getText(sourceFile);
    
    const params = node.parameters.map(p => ({
      name: p.name.getText(sourceFile),
      type: this.lowerTypeNode(p.type, sourceFile),
    }));

    const returnType = this.lowerTypeNode(node.type, sourceFile);
    const body = node.body ? this.lowerBlock(node.body, sourceFile) : this.builder.block([], { kind: 'return', value: undefined });
    const isStatic = node.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword) ?? false;

    return {
      name,
      params,
      returnType,
      body,
      isStatic,
    };
  }

  private lowerBlock(node: ts.Block, sourceFile: ts.SourceFile): IRBlock {
    const instructions: IRInstruction[] = [];
    
    for (const stmt of node.statements) {
      const instr = this.lowerStatement(stmt, sourceFile);
      if (instr) instructions.push(instr);
    }

    return this.builder.block(
      instructions,
      { kind: 'return', value: undefined }
    );
  }

  private lowerStatement(node: ts.Statement, sourceFile: ts.SourceFile): IRInstruction | null {
    if (ts.isVariableStatement(node)) {
      const decl = node.declarationList.declarations[0];
      if (!decl || !decl.initializer) return null;

      const name = decl.name.getText(sourceFile);
      const type = this.lowerType(decl, sourceFile);
      const value = this.lowerExpr(decl.initializer, sourceFile);
      const variable = this.builder.variable(name, type);

      return {
        kind: 'assign',
        target: variable,
        value,
        type,
      };
    }

    if (ts.isExpressionStatement(node)) {
      const value = this.lowerExpr(node.expression, sourceFile);
      return {
        kind: 'expr',
        value,
      };
    }

    return null;
  }

  private lowerExpr(node: ts.Expression, sourceFile: ts.SourceFile): IRExpr {
    // Literals
    if (ts.isNumericLiteral(node)) {
      return expr.literal(parseFloat(node.text), types.number());
    }

    if (ts.isStringLiteral(node)) {
      return expr.literal(node.text, types.string());
    }

    if (node.kind === ts.SyntaxKind.TrueKeyword) {
      return expr.literal(true, types.boolean());
    }

    if (node.kind === ts.SyntaxKind.FalseKeyword) {
      return expr.literal(false, types.boolean());
    }

    if (node.kind === ts.SyntaxKind.NullKeyword) {
      return expr.literal(null, types.nullable(types.void()));
    }

    // Binary expressions
    if (ts.isBinaryExpression(node)) {
      return this.lowerBinaryExpr(node, sourceFile);
    }

    // Unary expressions
    if (ts.isPrefixUnaryExpression(node)) {
      return this.lowerUnaryExpr(node, sourceFile);
    }

    // Variable reference
    if (ts.isIdentifier(node)) {
      const name = node.text;
      const type = this.inferType(node);
      return expr.variable(name, 0, type);
    }

    // Call expression
    if (ts.isCallExpression(node)) {
      return this.lowerCallExpr(node, sourceFile);
    }

    // Property access
    if (ts.isPropertyAccessExpression(node)) {
      const object = this.lowerExpr(node.expression, sourceFile);
      const property = node.name.text;
      const type = this.inferType(node);
      return expr.fieldAccess(object, property, type);
    }

    return expr.literal(null, types.void());
  }

  private lowerBinaryExpr(node: ts.BinaryExpression, sourceFile: ts.SourceFile): IRExpr {
    const left = this.lowerExpr(node.left, sourceFile);
    const right = this.lowerExpr(node.right, sourceFile);
    const op = this.getBinaryOp(node.operatorToken.kind);
    const type = this.inferType(node);

    return expr.binary(op, left, right, type);
  }

  private lowerUnaryExpr(node: ts.PrefixUnaryExpression, sourceFile: ts.SourceFile): IRExpr {
    const operand = this.lowerExpr(node.operand, sourceFile);
    const op = this.getUnaryOp(node.operator);
    const type = this.inferType(node);

    return expr.unary(op, operand, type);
  }

  private lowerCallExpr(node: ts.CallExpression, sourceFile: ts.SourceFile): IRExpr {
    const callee = this.lowerExpr(node.expression, sourceFile);
    const args = node.arguments.map(arg => this.lowerExpr(arg, sourceFile));
    const type = this.inferType(node);

    return expr.call(callee, args, type);
  }

  private getBinaryOp(kind: ts.SyntaxKind): BinaryOp {
    switch (kind) {
      case ts.SyntaxKind.PlusToken: return BinaryOp.Add;
      case ts.SyntaxKind.MinusToken: return BinaryOp.Sub;
      case ts.SyntaxKind.AsteriskToken: return BinaryOp.Mul;
      case ts.SyntaxKind.SlashToken: return BinaryOp.Div;
      case ts.SyntaxKind.PercentToken: return BinaryOp.Mod;
      case ts.SyntaxKind.EqualsEqualsEqualsToken: return BinaryOp.Eq;
      case ts.SyntaxKind.ExclamationEqualsEqualsToken: return BinaryOp.Ne;
      case ts.SyntaxKind.LessThanToken: return BinaryOp.Lt;
      case ts.SyntaxKind.LessThanEqualsToken: return BinaryOp.Le;
      case ts.SyntaxKind.GreaterThanToken: return BinaryOp.Gt;
      case ts.SyntaxKind.GreaterThanEqualsToken: return BinaryOp.Ge;
      case ts.SyntaxKind.AmpersandAmpersandToken: return BinaryOp.And;
      case ts.SyntaxKind.BarBarToken: return BinaryOp.Or;
      default: return BinaryOp.Add;
    }
  }

  private getUnaryOp(kind: ts.SyntaxKind): UnaryOp {
    switch (kind) {
      case ts.SyntaxKind.MinusToken: return UnaryOp.Neg;
      case ts.SyntaxKind.ExclamationToken: return UnaryOp.Not;
      default: return UnaryOp.Not;
    }
  }

  private lowerTypeNode(typeNode: ts.TypeNode | undefined, sourceFile: ts.SourceFile): IRType {
    if (!typeNode) return types.void();

    // Handle keyword types (number, string, boolean, void)
    switch (typeNode.kind) {
      case ts.SyntaxKind.NumberKeyword:
        return types.number();
      case ts.SyntaxKind.StringKeyword:
        return types.string();
      case ts.SyntaxKind.BooleanKeyword:
        return types.boolean();
      case ts.SyntaxKind.VoidKeyword:
        return types.void();
    }

    if (ts.isTypeReferenceNode(typeNode)) {
      const name = typeNode.typeName.getText(sourceFile);
      
      if (name === 'number') return types.number();
      if (name === 'integer') return types.integer();
      if (name === 'integer53') return types.integer53();
      if (name === 'string') return types.string();
      if (name === 'boolean') return types.boolean();
      if (name === 'void') return types.void();

      // Ownership wrappers
      if (name === 'own' || name === 'share' || name === 'use') {
        const ownership = name === 'own' ? Ownership.Own :
                         name === 'share' ? Ownership.Share :
                         Ownership.Use;
        
        if (typeNode.typeArguments && typeNode.typeArguments.length > 0) {
          const inner = this.lowerTypeNode(typeNode.typeArguments[0], sourceFile);
          if (inner.kind === 'class') {
            return { ...inner, ownership };
          }
        }
      }

      // Array type
      if (name === 'Array' && typeNode.typeArguments) {
        const element = this.lowerTypeNode(typeNode.typeArguments[0], sourceFile);
        return types.array(element, Ownership.Value);
      }

      return types.class(name, Ownership.Own);
    }

    if (ts.isArrayTypeNode(typeNode)) {
      const element = this.lowerTypeNode(typeNode.elementType, sourceFile);
      return types.array(element, Ownership.Value);
    }

    return types.void();
  }

  private lowerType(decl: ts.VariableDeclaration, sourceFile: ts.SourceFile): IRType {
    if (decl.type) {
      return this.lowerTypeNode(decl.type, sourceFile);
    }

    // Infer from initializer
    if (decl.initializer) {
      // Direct type inference from literal values
      if (ts.isNumericLiteral(decl.initializer)) {
        return types.number();
      }
      if (ts.isStringLiteral(decl.initializer)) {
        return types.string();
      }
      if (decl.initializer.kind === ts.SyntaxKind.TrueKeyword || 
          decl.initializer.kind === ts.SyntaxKind.FalseKeyword) {
        return types.boolean();
      }
      
      // Use type checker for complex expressions
      return this.inferType(decl.initializer);
    }

    return types.void();
  }

  private inferType(node: ts.Node): IRType {
    const tsType = this.typeChecker.getTypeAtLocation(node);
    
    if (tsType.flags & ts.TypeFlags.Number) {
      return types.number();
    }
    if (tsType.flags & ts.TypeFlags.String) {
      return types.string();
    }
    if (tsType.flags & ts.TypeFlags.Boolean) {
      return types.boolean();
    }
    if (tsType.flags & ts.TypeFlags.Void) {
      return types.void();
    }

    return types.void();
  }
}
