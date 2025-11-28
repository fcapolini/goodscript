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
  private enumNames = new Set<string>(); // Track enum names for property access
  
  constructor(private checker?: ts.TypeChecker) {}
  
  generate(sourceFile: ts.SourceFile): string {
    this.enumNames.clear(); // Reset for each file
    const includes = [new ast.Include('gs_runtime.hpp', false)];
    const declarations: ast.Declaration[] = [];
    const mainStatements: ast.Statement[] = [];
    
    // Separate declarations from top-level statements
    for (const stmt of sourceFile.statements) {
      if (ts.isVariableStatement(stmt)) {
        // Top-level variables go into main()
        const decls = this.visitVariableStatement(stmt);
        mainStatements.push(...decls.map(d => d as any)); // VariableDecl can act as Statement
      } else if (ts.isFunctionDeclaration(stmt)) {
        const func = this.visitFunction(stmt);
        if (func) declarations.push(func);
      } else if (ts.isClassDeclaration(stmt)) {
        const cls = this.visitClass(stmt);
        if (cls) declarations.push(cls);
      } else if (ts.isInterfaceDeclaration(stmt)) {
        const iface = this.visitInterface(stmt);
        if (iface) declarations.push(iface);
      } else if (ts.isEnumDeclaration(stmt)) {
        const enumDecl = this.visitEnum(stmt);
        if (enumDecl) declarations.push(enumDecl);
      } else if (ts.isExpressionStatement(stmt)) {
        // Top-level expressions go into main()
        mainStatements.push(new ast.ExpressionStmt(this.visitExpression(stmt.expression)));
      }
    }
    
    const ns = new ast.Namespace('gs', declarations);
    
    // Create main function if there are top-level statements
    let mainFunction: ast.Function | undefined;
    if (mainStatements.length > 0) {
      mainFunction = new ast.Function(
        'main',
        new ast.CppType('int'),
        [],
        new ast.Block([...mainStatements, new ast.ReturnStmt(cpp.id('0'))])
      );
    }
    
    const tu = new ast.TranslationUnit(includes, [ns], mainFunction);
    
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
      
      // In C++, 'const' on objects makes them immutable, but in TypeScript,
      // 'const' just means the binding can't be reassigned.
      // - Primitives (number, bool) and strings: can be const
      // - Class instances: should NOT be const (objects are mutable)
      const useConst = isConst && this.isConstableType(cppType, decl.initializer);
      
      // VariableDecl constructor: (name, type, initializer, isConst)
      result.push(new ast.VariableDecl(name, cppType, init, useConst));
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
    
    // Handle extends clause
    let baseClass: string | undefined;
    const baseClasses: string[] = [];
    
    if (node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
          // extends - single base class
          if (clause.types.length > 0) {
            baseClass = this.escapeName(clause.types[0].expression.getText());
          }
        } else if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
          // implements - multiple interfaces (treated as base classes in C++)
          for (const type of clause.types) {
            baseClasses.push(this.escapeName(type.expression.getText()));
          }
        }
      }
    }
    
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
        
        // Extract super() call and generate initializer list
        const { initList, body } = this.processConstructorBody(member.body, baseClass);
        
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
    
    return new ast.Class(name, fields, constructors, methods, baseClass, [], false, baseClasses);
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
  
  private visitEnum(node: ts.EnumDeclaration): ast.Enum | undefined {
    const name = this.escapeName(node.name.text);
    this.enumNames.add(name); // Track enum name
    const members: ast.EnumMember[] = [];
    
    let nextValue = 0;
    for (const member of node.members) {
      const memberName = this.escapeName(member.name.getText());
      let value: number | undefined;
      
      if (member.initializer) {
        if (ts.isNumericLiteral(member.initializer)) {
          value = parseInt(member.initializer.text, 10);
          nextValue = value + 1;
        }
      } else {
        value = nextValue++;
      }
      
      members.push(new ast.EnumMember(memberName, value));
    }
    
    return new ast.Enum(name, members);
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
    
    if (ts.isThrowStatement(node)) {
      return this.visitThrowStatement(node);
    }
    
    if (ts.isTryStatement(node)) {
      return this.visitTryStatement(node);
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
  
  private visitThrowStatement(node: ts.ThrowStatement): ast.ThrowStmt {
    const expr = node.expression ? this.visitExpression(node.expression) : cpp.id('std::runtime_error("Unknown error")');
    return new ast.ThrowStmt(expr);
  }
  
  private visitTryStatement(node: ts.TryStatement): ast.TryCatch {
    let tryBlock = this.visitBlock(node.tryBlock);
    
    // C++ catch needs a variable name and type
    let catchVar = 'e';
    let catchType = new ast.CppType('const std::exception', [], false, true); // const std::exception&
    let catchBlock = new ast.Block([]);
    
    if (node.catchClause) {
      if (node.catchClause.variableDeclaration) {
        catchVar = this.escapeName(node.catchClause.variableDeclaration.name.getText());
        // Try to determine the exception type, default to std::exception
        if (node.catchClause.variableDeclaration.type) {
          const typeText = node.catchClause.variableDeclaration.type.getText();
          catchType = new ast.CppType(`const gs::${typeText}`, [], false, true);
        }
      }
      catchBlock = this.visitBlock(node.catchClause.block);
    }
    
    // TODO: Handle finally blocks (C++ doesn't have direct equivalent)
    // For now, we can add finally block statements to both try and catch blocks
    if (node.finallyBlock) {
      const finallyStatements = this.visitBlock(node.finallyBlock).statements;
      tryBlock = new ast.Block([...tryBlock.statements, ...finallyStatements]);
      catchBlock = new ast.Block([...catchBlock.statements, ...finallyStatements]);
    }
    
    return new ast.TryCatch(tryBlock, catchVar, catchType, catchBlock);
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
    
    if (ts.isNewExpression(node)) {
      return this.visitNewExpression(node);
    }
    
    return cpp.id('/* UNSUPPORTED */');
  }
  
  private visitBinaryExpression(node: ts.BinaryExpression): ast.Expression {
    // Handle instanceof specially
    if (node.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword) {
      const obj = this.visitExpression(node.left);
      const typeName = node.right.getText();
      // In C++, we'll use dynamic_cast for instanceof checks
      // obj instanceof Type → dynamic_cast<Type*>(&obj) != nullptr
      // This assumes the object is a pointer or reference
      // For now, just generate a simple type check comment
      return cpp.id(`/* instanceof ${typeName} check */`);
    }
    
    const left = this.visitExpression(node.left);
    const right = this.visitExpression(node.right);
    
    // Map operators
    let op = node.operatorToken.getText();
    if (op === '===') op = '==';
    if (op === '!==') op = '!=';
    
    return cpp.binary(left, op, right);
  }
  
  private visitNewExpression(node: ts.NewExpression): ast.Expression {
    // Get the class name
    const className = this.escapeName(node.expression.getText());
    
    // Get constructor arguments
    const args = node.arguments ? node.arguments.map(arg => this.visitExpression(arg)) : [];
    
    // In C++, we create objects on the stack by default
    // new ClassName(args) → gs::ClassName(args)
    return cpp.call(cpp.id(`gs::${className}`), args);
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
      
      // Check if it's an enum access
      if (this.enumNames.has(objName)) {
        return cpp.id(`gs::${objName}::${prop}`);
      }
      
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
  
  /**
   * Check if a C++ type is a primitive (number, bool)
   */
  private isPrimitiveType(type: ast.CppType): boolean {
    const name = type.name;
    return name === 'double' || name === 'int' || name === 'bool' || 
           name === 'float' || name === 'long' || name === 'short';
  }
  
  /**
   * Check if a variable can be const in C++.
   * - Primitives (number, bool): yes
   * - Strings: yes (immutable in TypeScript)
   * - Objects created with new: no (mutable)
   * - Other types: yes if not a new expression
   */
  private isConstableType(type: ast.CppType, initializer?: ts.Expression): boolean {
    const name = type.name;
    
    // Primitives are always constable
    if (this.isPrimitiveType(type)) {
      return true;
    }
    
    // Strings are constable (immutable in TypeScript)
    if (name === 'gs::String') {
      return true;
    }
    
    // If initialized with 'new', it's a mutable object - not constable
    if (initializer && ts.isNewExpression(initializer)) {
      return false;
    }
    
    // Other cases: default to constable
    return true;
  }
  
  /**
   * Process constructor body to extract super() calls and convert them to initializer list.
   * Returns the initializer list and the modified body (without super() call).
   */
  private processConstructorBody(
    body: ts.Block | undefined,
    baseClassName: string | undefined
  ): { initList: ast.MemberInitializer[], body: ast.Block } {
    const initList: ast.MemberInitializer[] = [];
    
    if (!body) {
      return { initList, body: new ast.Block([]) };
    }
    
    // Look for super() call in the first statement
    const statements = body.statements;
    const remainingStatements: ast.Statement[] = [];
    let foundSuper = false;
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      
      // Check if this is a super() call
      if (ts.isExpressionStatement(stmt) && ts.isCallExpression(stmt.expression)) {
        const call = stmt.expression;
        if (call.expression.kind === ts.SyntaxKind.SuperKeyword) {
          // Found super() call
          foundSuper = true;
          
          if (baseClassName) {
            // Convert arguments to expressions
            const args = call.arguments.map(arg => this.visitExpression(arg));
            
            // Pass arguments as array to MemberInitializer
            // This will render as: BaseClass(arg1, arg2, ...)
            initList.push(new ast.MemberInitializer(baseClassName, args));
          }
          
          // Skip this statement (don't add to body)
          continue;
        }
      }
      
      // Not a super() call, add to remaining statements
      const cppStmt = this.visitStatement(stmt);
      if (cppStmt) {
        remainingStatements.push(cppStmt);
      }
    }
    
    return {
      initList,
      body: new ast.Block(remainingStatements)
    };
  }
}
