/**
 * AST-Based C++ Code Generator
 * 
 * Minimal proof-of-concept - supports only const number/string/boolean variables
 * Will be built up incrementally to replace the legacy cpp-codegen.ts
 */

import * as ts from 'typescript';
import * as ast from './ast';
import { render } from './renderer';
import { cpp } from './builder';

export class AstCodegen {
  constructor(private checker?: ts.TypeChecker) {}
  
  generate(sourceFile: ts.SourceFile): string {
    const includes = [new ast.Include('gs_runtime.hpp', false)];
    const declarations: ast.Declaration[] = [];
    
    for (const stmt of sourceFile.statements) {
      if (ts.isVariableStatement(stmt)) {
        declarations.push(...this.visitVariableStatement(stmt));
      } else if (ts.isFunctionDeclaration(stmt)) {
        const func = this.visitFunction(stmt);
        if (func) declarations.push(func);
      } else if (ts.isClassDeclaration(stmt)) {
        const cls = this.visitClass(stmt);
        if (cls) declarations.push(cls);
      } else if (ts.isInterfaceDeclaration(stmt)) {
        const iface = this.visitInterface(stmt);
        if (iface) declarations.push(iface);
      }
    }
    
    const ns = new ast.Namespace('gs', declarations);
    const tu = new ast.TranslationUnit(includes, [ns]);
    
    return render(tu);
  }
  
  private visitVariableStatement(node: ts.VariableStatement): ast.Declaration[] {
    const result: ast.Declaration[] = [];
    const isConst = (node.declarationList.flags & ts.NodeFlags.Const) !== 0;
    
    for (const decl of node.declarationList.declarations) {
      const name = this.escapeName(decl.name.getText());
      const cppType = this.mapType(decl.type!);
      
      let init: ast.Expression | undefined;
      if (decl.initializer) {
        init = this.visitExpression(decl.initializer);
      }
      
      // VariableDecl constructor: (name, type, initializer, isConst)
      result.push(new ast.VariableDecl(name, cppType, init, isConst));
    }
    
    return result;
  }
  
  private visitFunction(node: ts.FunctionDeclaration): ast.Function | undefined {
    if (!node.name) return undefined;
    
    const name = this.escapeName(node.name.text);
    const returnType = node.type ? this.mapType(node.type) : new ast.CppType('void');
    
    const params: ast.Parameter[] = [];
    for (const param of node.parameters) {
      const paramName = this.escapeName(param.name.getText());
      const paramType = param.type ? this.mapType(param.type) : new ast.CppType('auto');
      const passByConstRef = this.shouldPassByConstRef(param.type);
      const passByMutableRef = this.shouldPassByMutableRef(param.type);
      params.push(new ast.Parameter(paramName, paramType, undefined, passByConstRef, passByMutableRef));
    }
    
    const body = node.body ? this.visitBlock(node.body) : new ast.Block([]);
    
    return new ast.Function(name, returnType, params, body);
  }
  
  private visitClass(node: ts.ClassDeclaration): ast.Class | undefined {
    if (!node.name) return undefined;
    
    const name = this.escapeName(node.name.text);
    const fields: ast.Field[] = [];
    const constructors: ast.Constructor[] = [];
    const methods: ast.Method[] = [];
    
    // Collect fields
    for (const member of node.members) {
      if (ts.isPropertyDeclaration(member)) {
        const fieldName = this.escapeName(member.name.getText());
        const fieldType = member.type ? this.mapType(member.type) : new ast.CppType('auto');
        fields.push(new ast.Field(fieldName, fieldType));
      }
    }
    
    // Collect constructors
    for (const member of node.members) {
      if (ts.isConstructorDeclaration(member)) {
        const params: ast.Parameter[] = [];
        for (const param of member.parameters) {
          const paramName = this.escapeName(param.name.getText());
          const paramType = param.type ? this.mapType(param.type) : new ast.CppType('auto');
          const passByConstRef = this.shouldPassByConstRef(param.type);
          const passByMutableRef = this.shouldPassByMutableRef(param.type);
          params.push(new ast.Parameter(paramName, paramType, undefined, passByConstRef, passByMutableRef));
        }
        
        const body = member.body ? this.visitBlock(member.body) : new ast.Block([]);
        
        // Create member initializers from constructor body assignments
        const initList: ast.MemberInitializer[] = [];
        
        constructors.push(new ast.Constructor(params, initList, body));
      }
    }
    
    // Collect methods
    for (const member of node.members) {
      if (ts.isMethodDeclaration(member)) {
        const methodName = this.escapeName(member.name.getText());
        const returnType = member.type ? this.mapType(member.type) : new ast.CppType('void');
        
        const params: ast.Parameter[] = [];
        for (const param of member.parameters) {
          const paramName = this.escapeName(param.name.getText());
          const paramType = param.type ? this.mapType(param.type) : new ast.CppType('auto');
          const passByConstRef = this.shouldPassByConstRef(param.type);
          const passByMutableRef = this.shouldPassByMutableRef(param.type);
          params.push(new ast.Parameter(paramName, paramType, undefined, passByConstRef, passByMutableRef));
        }
        
        const body = member.body ? this.visitBlock(member.body) : new ast.Block([]);
        
        methods.push(new ast.Method(methodName, returnType, params, body));
      }
    }
    
    return new ast.Class(name, fields, constructors, methods);
  }
  
  private visitInterface(node: ts.InterfaceDeclaration): ast.Class | undefined {
    const name = this.escapeName(node.name.text);
    const fields: ast.Field[] = [];
    
    // Convert interface properties to fields
    for (const member of node.members) {
      if (ts.isPropertySignature(member) && member.name) {
        const fieldName = this.escapeName(member.name.getText());
        const fieldType = member.type ? this.mapType(member.type) : new ast.CppType('auto');
        fields.push(new ast.Field(fieldName, fieldType));
      }
    }
    
    // Interfaces become structs (public by default)
    return new ast.Class(name, fields, [], [], undefined, [], true);
  }
  
  private visitBlock(node: ts.Block): ast.Block {
    const statements: ast.Statement[] = [];
    
    for (const stmt of node.statements) {
      const cppStmt = this.visitStatement(stmt);
      if (cppStmt) statements.push(cppStmt);
    }
    
    return new ast.Block(statements);
  }
  
  private visitStatement(node: ts.Statement): ast.Statement | undefined {
    if (ts.isReturnStatement(node)) {
      const expr = node.expression ? this.visitExpression(node.expression) : undefined;
      return new ast.ReturnStmt(expr);
    }
    
    if (ts.isExpressionStatement(node)) {
      return new ast.ExpressionStmt(this.visitExpression(node.expression));
    }
    
    if (ts.isIfStatement(node)) {
      return this.visitIfStatement(node);
    }
    
    if (ts.isForStatement(node)) {
      return this.visitForStatement(node);
    }
    
    if (ts.isWhileStatement(node)) {
      return this.visitWhileStatement(node);
    }
    
    if (ts.isForOfStatement(node)) {
      return this.visitForOfStatement(node);
    }
    
    if (ts.isVariableStatement(node)) {
      // Variable declarations as statements
      const decls = this.visitVariableStatement(node);
      // For now, just return the first one as a statement
      // TODO: Handle multiple declarations properly
      if (decls.length > 0) {
        return decls[0] as any; // VariableDecl is a Declaration but can act as Statement
      }
    }
    
    // Unsupported statement types
    return undefined;
  }
  
  private visitIfStatement(node: ts.IfStatement): ast.IfStmt {
    const condition = this.visitExpression(node.expression);
    const thenBlock = ts.isBlock(node.thenStatement) 
      ? this.visitBlock(node.thenStatement)
      : new ast.Block([this.visitStatement(node.thenStatement)!]);
    
    const elseBlock = node.elseStatement 
      ? (ts.isBlock(node.elseStatement)
          ? this.visitBlock(node.elseStatement)
          : new ast.Block([this.visitStatement(node.elseStatement)!]))
      : undefined;
    
    return new ast.IfStmt(condition, thenBlock, elseBlock);
  }
  
  private visitForStatement(node: ts.ForStatement): ast.ForStmt {
    let init: ast.Statement | undefined;
    if (node.initializer) {
      if (ts.isVariableDeclarationList(node.initializer)) {
        const decls = node.initializer.declarations;
        if (decls.length > 0) {
          const decl = decls[0];
          const name = this.escapeName(decl.name.getText());
          
          // For loop iterators: use int instead of double for number types
          let type: ast.CppType;
          if (decl.type) {
            const tsType = decl.type.getText();
            if (tsType === 'number') {
              // Loop iterator - use int
              type = new ast.CppType('int');
            } else {
              type = this.mapType(decl.type);
            }
          } else {
            type = new ast.CppType('int');
          }
          
          const initExpr = decl.initializer ? this.visitExpression(decl.initializer) : undefined;
          init = new ast.VariableDecl(name, type, initExpr, false);
        }
      } else {
        init = new ast.ExpressionStmt(this.visitExpression(node.initializer));
      }
    }
    
    const condition = node.condition ? this.visitExpression(node.condition) : undefined;
    const increment = node.incrementor ? this.visitExpression(node.incrementor) : undefined;
    
    const body = ts.isBlock(node.statement)
      ? this.visitBlock(node.statement)
      : new ast.Block([this.visitStatement(node.statement)!]);
    
    return new ast.ForStmt(init, condition, increment, body);
  }
  
  private visitWhileStatement(node: ts.WhileStatement): ast.WhileStmt {
    const condition = this.visitExpression(node.expression);
    const body = ts.isBlock(node.statement)
      ? this.visitBlock(node.statement)
      : new ast.Block([this.visitStatement(node.statement)!]);
    
    return new ast.WhileStmt(condition, body);
  }
  
  private visitForOfStatement(node: ts.ForOfStatement): ast.RangeForStmt {
    // for (const num of numbers) → for (const auto& num : numbers)
    
    let varName = 'item';
    let isConst = false;
    
    if (ts.isVariableDeclarationList(node.initializer)) {
      const decl = node.initializer.declarations[0];
      varName = this.escapeName(decl.name.getText());
      isConst = (node.initializer.flags & ts.NodeFlags.Const) !== 0;
    }
    
    const iterable = this.visitExpression(node.expression);
    const body = ts.isBlock(node.statement)
      ? this.visitBlock(node.statement)
      : new ast.Block([this.visitStatement(node.statement)!]);
    
    return new ast.RangeForStmt(varName, isConst, iterable, body);
  }
  
  private visitExpression(node: ts.Expression): ast.Expression {
    if (ts.isNumericLiteral(node)) {
      // For numeric literals, create a raw identifier with the number value
      // (Literal class adds quotes)
      return cpp.id(node.text);
    }
    
    if (ts.isStringLiteral(node)) {
      // String literal already contains the text without quotes
      // We need to add quotes and escape
      const escaped = this.escapeString(node.text);
      return cpp.call(
        cpp.id('gs::String'),
        [cpp.id(`"${escaped}"`)] // Use id() not literal() to avoid double-quoting
      );
    }
    
    if (node.kind === ts.SyntaxKind.TrueKeyword) {
      return cpp.id('true');
    }
    
    if (node.kind === ts.SyntaxKind.FalseKeyword) {
      return cpp.id('false');
    }
    
    if (ts.isIdentifier(node)) {
      return cpp.id(this.escapeName(node.text));
    }
    
    if (ts.isBinaryExpression(node)) {
      return this.visitBinaryExpression(node);
    }
    
    if (ts.isCallExpression(node)) {
      return this.visitCallExpression(node);
    }
    
    if (ts.isPropertyAccessExpression(node)) {
      return this.visitPropertyAccess(node);
    }
    
    if (ts.isPostfixUnaryExpression(node)) {
      const operand = this.visitExpression(node.operand);
      const op = node.operator === ts.SyntaxKind.PlusPlusToken ? '++' : '--';
      return cpp.postfix(operand, op);
    }
    
    if (ts.isArrayLiteralExpression(node)) {
      const elements = node.elements.map(el => this.visitExpression(el));
      return cpp.initList(elements);
    }
    
    return cpp.id('/* UNSUPPORTED */');
  }
  
  private visitBinaryExpression(node: ts.BinaryExpression): ast.Expression {
    const left = this.visitExpression(node.left);
    const right = this.visitExpression(node.right);
    
    // Map operators
    let op = node.operatorToken.getText();
    if (op === '===') op = '==';
    if (op === '!==') op = '!=';
    
    return cpp.binary(left, op, right);
  }
  
  private visitCallExpression(node: ts.CallExpression): ast.Expression {
    const args = node.arguments.map(arg => this.visitExpression(arg));
    
    // Handle property access: obj.method(args)
    if (ts.isPropertyAccessExpression(node.expression)) {
      const obj = node.expression.expression;
      const method = node.expression.name.text;
      
      // Special case: console.log, Math.max, etc.
      if (ts.isIdentifier(obj)) {
        const objName = obj.text;
        if (objName === 'console' || objName === 'Math' || objName === 'Number') {
          return cpp.call(cpp.id(`gs::${objName}::${method}`), args);
        }
      }
      
      // Regular method call: obj->method(args)
      const objExpr = this.visitExpression(obj);
      return cpp.call(cpp.member(objExpr, method), args);
    }
    
    // Regular function call
    const func = this.visitExpression(node.expression);
    return cpp.call(func, args);
  }
  
  private visitPropertyAccess(node: ts.PropertyAccessExpression): ast.Expression {
    const prop = node.name.text;
    
    // Handle 'this' - use this->property in C++
    if (node.expression.kind === ts.SyntaxKind.ThisKeyword) {
      return cpp.id(`this->${prop}`);
    }
    
    // Handle console, Math, Number as namespaces
    if (ts.isIdentifier(node.expression)) {
      const objName = node.expression.text;
      if (objName === 'console' || objName === 'Math' || objName === 'Number') {
        return cpp.id(`gs::${objName}::${prop}`);
      }
    }
    
    const obj = this.visitExpression(node.expression);
    return cpp.member(obj, prop);
  }
  
  private mapType(typeNode: ts.TypeNode | undefined): ast.CppType {
    // Handle undefined type (use auto)
    if (!typeNode) {
      return new ast.CppType('auto');
    }
    
    // Array types: number[] → gs::Array<double>
    if (ts.isArrayTypeNode(typeNode)) {
      const elementType = this.mapType(typeNode.elementType);
      return new ast.CppType(`gs::Array<${elementType.toString()}>`);
    }
    
    // Generic types: Map<K, V> → gs::Map<K, V>
    if (ts.isTypeReferenceNode(typeNode) && typeNode.typeArguments) {
      const baseName = typeNode.typeName.getText();
      const typeArgs = typeNode.typeArguments.map(arg => this.mapType(arg).toString());
      return new ast.CppType(`gs::${baseName}<${typeArgs.join(', ')}>`);
    }
    
    const text = typeNode.getText();
    
    if (text === 'number') {
      return new ast.CppType('double');
    }
    
    if (text === 'string') {
      return new ast.CppType('gs::String');
    }
    
    if (text === 'boolean') {
      return new ast.CppType('bool');
    }
    
    // User-defined types need gs:: prefix
    if (ts.isTypeReferenceNode(typeNode)) {
      return new ast.CppType(`gs::${text}`);
    }
    
    return new ast.CppType(text);
  }
  
  private shouldPassByConstRef(typeNode: ts.TypeNode | undefined): boolean {
    if (!typeNode) return false;
    
    const typeText = typeNode.getText();
    
    // String should be passed by const ref
    if (typeText === 'string') return true;
    
    // Arrays are passed by mutable ref, not const ref
    if (ts.isArrayTypeNode(typeNode)) return false;
    
    // Class/interface types should be passed by const ref
    // Primitives (number, boolean) should be passed by value
    if (typeText === 'number' || typeText === 'boolean') return false;
    
    // If it's a type reference (custom type name), pass by const ref
    if (ts.isTypeReferenceNode(typeNode)) return true;
    
    return false;
  }
  
  private shouldPassByMutableRef(typeNode: ts.TypeNode | undefined): boolean {
    if (!typeNode) return false;
    
    // Arrays should be passed by mutable reference
    if (ts.isArrayTypeNode(typeNode)) return true;
    
    return false;
  }
  
  private escapeName(name: string): string {
    const keywords = new Set(['class', 'namespace', 'template']);
    return keywords.has(name) ? name + '_' : name;
  }
  
  private escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n');
  }
}
