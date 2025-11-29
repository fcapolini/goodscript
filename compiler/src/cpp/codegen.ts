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
  private currentFunctionReturnType?: ast.CppType; // Track current function return type for null handling
  private unwrappedOptionals = new Set<string>(); // Track variables known to be non-null in current scope
  private variableTypes = new Map<string, ast.CppType>(); // Track variable types for smart pointer detection
  private pointerVariables = new Set<string>(); // Track variables that are pointers (from Map.get(), etc.)
  
  constructor(private checker?: ts.TypeChecker) {}
  
  generate(sourceFile: ts.SourceFile): string {
    this.enumNames.clear(); // Reset for each file
    this.unwrappedOptionals.clear(); // Reset for each file
    this.variableTypes.clear(); // Reset for each file
    this.pointerVariables.clear(); // Reset for each file
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
      } else {
        // Handle other statement types (if, for, while, for-of, try, etc.)
        const statement = this.visitStatement(stmt);
        if (statement) {
          mainStatements.push(statement);
        }
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
      
      // Get C++ type from explicit annotation if present
      let cppType: ast.CppType;
      if (decl.type) {
        cppType = this.mapType(decl.type);
      } else {
        // Use auto for inferred types - let C++ compiler figure it out
        cppType = new ast.CppType('auto');
      }
      
      // Special handling for function types (arrow functions)
      // If initializer is an arrow function and we don't have an explicit type,
      // use std::function to allow recursion
      if (decl.initializer && ts.isArrowFunction(decl.initializer)) {
        const arrowFunc = decl.initializer;
        const returnType = arrowFunc.type ? this.mapType(arrowFunc.type) : new ast.CppType('double');
        const paramTypes = arrowFunc.parameters.map(p => 
          p.type ? this.mapType(p.type) : new ast.CppType('double')
        );
        
        // Build std::function<ReturnType(ParamType1, ParamType2, ...)>
        const paramTypeStr = paramTypes.map(t => t.toString()).join(', ');
        cppType = new ast.CppType(`std::function<${returnType}(${paramTypeStr})>`);
      }
      
      // Check if initializer is Map.get() which returns a pointer, not optional
      if (decl.initializer && this.isMapGetCall(decl.initializer)) {
        // Map.get() returns V*, so if cppType is std::optional<T>, change to const T*
        const typeStr = cppType.toString();
        if (typeStr.startsWith('std::optional<') && typeStr.endsWith('>')) {
          const innerType = typeStr.slice('std::optional<'.length, -1);
          cppType = new ast.CppType(`const ${innerType}*`);
        }
        // Track this variable as a pointer
        this.pointerVariables.add(name);
      }
      
      let init: ast.Expression | undefined;
      let isShareArraySubscript = false;  // Track if we're initializing from share<T>[]
      
      if (decl.initializer) {
        // Special case: empty array literal with explicitly-typed variable
        // Use the variable's type to determine the array element type
        if (ts.isArrayLiteralExpression(decl.initializer) && 
            decl.initializer.elements.length === 0 &&
            decl.type) {
          const varTypeStr = decl.type.getText();
          // Extract element type from "number[]" or "Array<number>"
          let elementType: string | undefined;
          if (varTypeStr.endsWith('[]')) {
            elementType = this.mapTypeScriptTypeToCpp(varTypeStr.slice(0, -2));
          } else {
            const match = varTypeStr.match(/Array<(.+)>/);
            if (match) {
              elementType = this.mapTypeScriptTypeToCpp(match[1]);
            }
          }
          if (elementType) {
            init = cpp.call(cpp.id(`gs::Array<${elementType}>`), [cpp.initList([])]);
          } else {
            init = this.visitExpression(decl.initializer);
          }
        } else {
          init = this.visitExpression(decl.initializer);
        }
        
        // If initializer is an array subscript from a share<T> array, track variable type
        if (ts.isElementAccessExpression(decl.initializer) && this.checker) {
          const arrayExpr = decl.initializer.expression;
          const arrayType = this.checker.getTypeAtLocation(arrayExpr);
          const arrayTypeStr = this.checker.typeToString(arrayType);
          
          // Check if array element type is share<T> (maps to std::shared_ptr<T>)
          const shareMatch = arrayTypeStr.match(/(?:Array<)?share<([^>]+)>/);
          
          if (shareMatch) {
            // This variable will hold a shared_ptr, update its type
            const elementType = shareMatch[1];
            cppType = new ast.CppType(`std::shared_ptr<gs::${elementType}>`);
            isShareArraySubscript = true;  // Don't wrap again below
          }
        }
        
        // If the variable has share<T> type (std::shared_ptr), wrap the initializer
        // BUT skip if we just got it from a share<T> array (already wrapped)
        const typeStr = cppType.toString();
        if (typeStr.startsWith('std::shared_ptr<') && typeStr.endsWith('>') && !isShareArraySubscript) {
          const elementType = typeStr.slice('std::shared_ptr<'.length, -1);
          // Wrap in make_shared
          init = cpp.call(cpp.id(`std::make_shared<${elementType}>`), [init]);
        }
        
        // If initializing optional type with null, use std::nullopt instead of nullptr
        if (init instanceof ast.Identifier && init.name === 'nullptr' && 
            typeStr.startsWith('std::optional')) {
          init = cpp.id('std::nullopt');
        }
      }
      
      // Track variable type for smart pointer detection (AFTER potentially updating cppType)
      this.variableTypes.set(name, cppType);
      
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
    
    // Track return type for null handling in return statements
    const previousReturnType = this.currentFunctionReturnType;
    this.currentFunctionReturnType = returnType;
    
    const params: ast.Parameter[] = [];
    for (const param of node.parameters) {
      const paramName = this.escapeName(param.name.getText());
      const paramType = param.type ? this.mapType(param.type) : new ast.CppType('auto');
      const passByConstRef = this.shouldPassByConstRef(param.type);
      const passByMutableRef = this.shouldPassByMutableRef(param.type);
      params.push(new ast.Parameter(paramName, paramType, undefined, passByConstRef, passByMutableRef));
    }
    
    const body = node.body ? this.visitBlock(node.body) : new ast.Block([]);
    
    // Restore previous return type
    this.currentFunctionReturnType = previousReturnType;
    
    return new ast.Function(name, returnType, params, body);
  }
  
  private visitClass(node: ts.ClassDeclaration): ast.Class | undefined {
    if (!node.name) return undefined;
    
    const name = this.escapeName(node.name.text);
    const fields: ast.Field[] = [];
    const constructors: ast.Constructor[] = [];
    const methods: ast.Method[] = [];
    
    // Handle type parameters for generic classes
    const templateParams: string[] = [];
    if (node.typeParameters) {
      for (const typeParam of node.typeParameters) {
        templateParams.push(typeParam.name.text);
      }
    }
    
    // Handle extends clause
    let baseClass: string | undefined;
    const baseClasses: string[] = [];
    
    if (node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
          // extends - single base class
          if (clause.types.length > 0) {
            // Get full type including template arguments
            baseClass = this.escapeName(clause.types[0].getText());
          }
        } else if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
          // implements - multiple interfaces (treated as base classes in C++)
          for (const type of clause.types) {
            baseClasses.push(this.escapeName(type.getText()));
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
        // Track field types (prefixed with this. for class members)
        this.variableTypes.set(`this.${fieldName}`, fieldType);
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
        
        // Track return type for null handling in return statements
        const previousReturnType = this.currentFunctionReturnType;
        this.currentFunctionReturnType = returnType;
        
        const params: ast.Parameter[] = [];
        for (const param of member.parameters) {
          const paramName = this.escapeName(param.name.getText());
          const paramType = param.type ? this.mapType(param.type) : new ast.CppType('auto');
          const passByConstRef = this.shouldPassByConstRef(param.type);
          const passByMutableRef = this.shouldPassByMutableRef(param.type);
          params.push(new ast.Parameter(paramName, paramType, undefined, passByConstRef, passByMutableRef));
        }
        
        const body = member.body ? this.visitBlock(member.body) : new ast.Block([]);
        
        // Restore previous return type
        this.currentFunctionReturnType = previousReturnType;
        
        // Check if method should be const (doesn't modify 'this')
        const isConst = this.shouldMethodBeConst(member);
        
        methods.push(new ast.Method(methodName, returnType, params, body, ast.AccessSpecifier.Public, isConst));
      }
    }
    
    return new ast.Class(name, fields, constructors, methods, baseClass, templateParams, false, baseClasses);
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
    // Save current unwrapped state for block scoping
    const savedUnwrapped = new Set(this.unwrappedOptionals);
    
    const statements: ast.Statement[] = [];
    
    for (const stmt of node.statements) {
      const cppStmt = this.visitStatement(stmt);
      if (cppStmt) statements.push(cppStmt);
    }
    
    // Restore unwrapped state when block exits
    this.unwrappedOptionals = savedUnwrapped;
    
    return new ast.Block(statements);
  }
  
  private visitStatement(node: ts.Statement): ast.Statement | undefined {
    if (ts.isReturnStatement(node)) {
      let expr = node.expression ? this.visitExpression(node.expression) : undefined;
      
      // If returning a pointer variable, dereference it
      if (expr instanceof ast.Identifier && ts.isIdentifier(node.expression!) && 
          this.pointerVariables.has(this.escapeName(node.expression.text))) {
        expr = cpp.unary('*', expr);
      }
      
      // If returning null and function returns optional, use std::nullopt
      if (expr instanceof ast.Identifier && expr.name === 'nullptr' && 
          this.currentFunctionReturnType?.toString().startsWith('std::optional')) {
        expr = cpp.id('std::nullopt');
      }
      
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
    
    if (ts.isBreakStatement(node)) {
      return new ast.BreakStmt();
    }
    
    if (ts.isContinueStatement(node)) {
      return new ast.ContinueStmt();
    }
    
    // Unsupported statement types
    return undefined;
  }
  
  private visitIfStatement(node: ts.IfStatement): ast.IfStmt {
    // Detect null checks BEFORE visiting condition
    const unwrappedVar = this.extractNullCheck(node.expression);
    
    // Visit condition WITHOUT unwrapping (condition contains the null check itself)
    const condition = this.visitExpression(node.expression);
    
    // Process then block WITH unwrapped variable in scope
    if (unwrappedVar) {
      this.unwrappedOptionals.add(unwrappedVar);
    }
    
    const thenBlock = ts.isBlock(node.thenStatement) 
      ? this.visitBlock(node.thenStatement)
      : new ast.Block([this.visitStatement(node.thenStatement)!]);
    
    // Remove from unwrapped set after then block
    if (unwrappedVar) {
      this.unwrappedOptionals.delete(unwrappedVar);
    }
    
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
    
    // Handle regular expression literals: /pattern/flags
    if (node.kind === ts.SyntaxKind.RegularExpressionLiteral) {
      const regexText = node.getText();
      // Parse /pattern/flags
      const lastSlash = regexText.lastIndexOf('/');
      const pattern = regexText.substring(1, lastSlash);
      const flags = regexText.substring(lastSlash + 1);
      
      // Use raw string literal for pattern to avoid escaping issues
      // R"(pattern)" syntax handles most regex patterns without escaping
      const args: ast.Expression[] = [cpp.id(`R"(${pattern})"`)];
      
      // Add flags if present
      if (flags) {
        args.push(cpp.id(`"${flags}"`));
      }
      
      return cpp.call(cpp.id('gs::RegExp'), args);
    }
    
    if (node.kind === ts.SyntaxKind.TrueKeyword) {
      return cpp.id('true');
    }
    
    if (node.kind === ts.SyntaxKind.FalseKeyword) {
      return cpp.id('false');
    }
    
    if (node.kind === ts.SyntaxKind.NullKeyword) {
      return cpp.id('nullptr');
    }
    
    if (node.kind === ts.SyntaxKind.ThisKeyword) {
      return cpp.id('this');
    }
    
    if (ts.isIdentifier(node)) {
      const varName = node.text;
      
      // Handle special identifiers
      if (varName === 'undefined') {
        return cpp.id('std::nullopt');
      }
      
      const escapedName = this.escapeName(varName);
      
      // If this identifier is tracked as unwrapped
      if (this.unwrappedOptionals.has(escapedName)) {
        // Use * for pointer variables, .value() for optionals
        if (this.pointerVariables.has(escapedName)) {
          return cpp.unary('*', cpp.id(escapedName));
        } else {
          return cpp.id(`${escapedName}.value()`);
        }
      }
      
      return cpp.id(escapedName);
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
    
    if (ts.isElementAccessExpression(node)) {
      const obj = this.visitExpression(node.expression);
      let index = this.visitExpression(node.argumentExpression!);
      
      // Cast index to int if it's not already
      // TypeScript number maps to C++ double, but array indices need int
      if (this.checker) {
        const indexType = this.checker.getTypeAtLocation(node.argumentExpression!);
        const indexTypeStr = this.checker.typeToString(indexType);
        if (indexTypeStr === 'number') {
          index = cpp.cast(new ast.CppType('int'), index);
        }
      }
      
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
      
      const subscript = cpp.subscript(obj, index);
      
      if (isPartOfPropertyAccess) {
        // Don't dereference - parent will use -> to access
        return subscript;
      } else {
        // Dereference to get value
        return cpp.unary('*', subscript);
      }
    }
    
    if (ts.isPostfixUnaryExpression(node)) {
      const operand = this.visitExpression(node.operand);
      const op = node.operator === ts.SyntaxKind.PlusPlusToken ? '++' : '--';
      return cpp.postfix(operand, op);
    }
    
    if (ts.isPrefixUnaryExpression(node)) {
      const operand = this.visitExpression(node.operand);
      let op = '';
      switch (node.operator) {
        case ts.SyntaxKind.PlusToken: op = '+'; break;
        case ts.SyntaxKind.MinusToken: op = '-'; break;
        case ts.SyntaxKind.ExclamationToken: op = '!'; break;
        case ts.SyntaxKind.TildeToken: op = '~'; break;
        case ts.SyntaxKind.PlusPlusToken: op = '++'; break;
        case ts.SyntaxKind.MinusMinusToken: op = '--'; break;
      }
      return cpp.unary(op, operand);
    }
    
    if (ts.isArrayLiteralExpression(node)) {
      const elements = node.elements.map(el => this.visitExpression(el));
      
      // Try to determine element type from context using TypeChecker
      let elementType: string | undefined;
      if (this.checker) {
        const type = this.checker.getTypeAtLocation(node);
        const typeStr = this.checker.typeToString(type);
        
        // Extract element type from type string like "number[]" or "Array<number>"
        if (typeStr.endsWith('[]')) {
          const baseType = typeStr.slice(0, -2);
          elementType = this.mapTypeScriptTypeToCpp(baseType);
        } else if (typeStr.startsWith('Array<')) {
          const match = typeStr.match(/^Array<(.+)>$/);
          if (match) {
            elementType = this.mapTypeScriptTypeToCpp(match[1]);
          }
        }
        
        // Also try to get type arguments from type reference
        if (!elementType && (type as any).target) {
          const typeRef = type as ts.TypeReference;
          const typeArgs = this.checker.getTypeArguments(typeRef);
          if (typeArgs && typeArgs.length > 0) {
            const argStr = this.checker.typeToString(typeArgs[0]);
            elementType = this.mapTypeScriptTypeToCpp(argStr);
          }
        }
      }
      
      // Generate gs::Array<T>({...}) with explicit template parameter if we know the type
      // This prevents type inference issues with int vs double literals
      const arrayType = elementType ? `gs::Array<${elementType}>` : 'gs::Array';
      return cpp.call(cpp.id(arrayType), [cpp.initList(elements)]);
    }
    
    if (ts.isParenthesizedExpression(node)) {
      // Just visit the inner expression, parentheses will be added if needed
      return this.visitExpression(node.expression);
    }
    
    if (ts.isNewExpression(node)) {
      return this.visitNewExpression(node);
    }
    
    if (ts.isArrowFunction(node)) {
      return this.visitArrowFunction(node);
    }
    
    if (ts.isTemplateExpression(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      return this.visitTemplateLiteral(node);
    }
    
    if (ts.isConditionalExpression(node)) {
      // Ternary operator: condition ? whenTrue : whenFalse
      const condition = this.visitExpression(node.condition);
      const whenTrue = this.visitExpression(node.whenTrue);
      const whenFalse = this.visitExpression(node.whenFalse);
      
      // C++ has the same ternary syntax
      return cpp.ternary(condition, whenTrue, whenFalse);
    }
    
    return cpp.id('/* UNSUPPORTED */');
  }
  
  /**
   * Extract variable name from null check expressions like:
   * - x !== null
   * - x !== null && otherCondition
   * Returns the variable name if found, undefined otherwise
   */
  private extractNullCheck(expr: ts.Expression): string | undefined {
    // Handle: x !== null or x !== undefined
    if (ts.isBinaryExpression(expr)) {
      const op = expr.operatorToken.kind;
      if (op === ts.SyntaxKind.ExclamationEqualsEqualsToken || op === ts.SyntaxKind.ExclamationEqualsToken) {
        // Check if comparing with null or undefined
        const isLeftNull = expr.left.kind === ts.SyntaxKind.NullKeyword;
        const isRightNull = expr.right.kind === ts.SyntaxKind.NullKeyword;
        const isLeftUndefined = ts.isIdentifier(expr.left) && expr.left.text === 'undefined';
        const isRightUndefined = ts.isIdentifier(expr.right) && expr.right.text === 'undefined';
        
        if ((isRightNull || isRightUndefined) && ts.isIdentifier(expr.left)) {
          return this.escapeName(expr.left.text);
        }
        if ((isLeftNull || isLeftUndefined) && ts.isIdentifier(expr.right)) {
          return this.escapeName(expr.right.text);
        }
      }
      
      // Handle: x !== null && otherCondition
      if (op === ts.SyntaxKind.AmpersandAmpersandToken) {
        // Check left side of &&
        const leftCheck = this.extractNullCheck(expr.left);
        if (leftCheck) return leftCheck;
        
        // Check right side of &&
        const rightCheck = this.extractNullCheck(expr.right);
        if (rightCheck) return rightCheck;
      }
    }
    
    return undefined;
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
    
    // Handle modulo operator specially for floating point
    if (node.operatorToken.kind === ts.SyntaxKind.PercentToken && this.checker) {
      const leftType = this.checker.getTypeAtLocation(node.left);
      const rightType = this.checker.getTypeAtLocation(node.right);
      const leftTypeStr = this.checker.typeToString(leftType);
      const rightTypeStr = this.checker.typeToString(rightType);
      
      // If either operand is 'number' (maps to double), use std::fmod
      if (leftTypeStr === 'number' || rightTypeStr === 'number') {
        const left = this.visitExpression(node.left);
        const right = this.visitExpression(node.right);
        return cpp.call(cpp.id('std::fmod'), [left, right]);
      }
    }
    
    // Map operators
    let op = node.operatorToken.getText();
    if (op === '===') op = '==';
    if (op === '!==') op = '!=';
    
    // Check if we're comparing with null/undefined BEFORE visiting expressions
    const isLeftNull = node.left.kind === ts.SyntaxKind.NullKeyword;
    const isRightNull = node.right.kind === ts.SyntaxKind.NullKeyword;
    const isLeftUndefined = ts.isIdentifier(node.left) && node.left.text === 'undefined';
    const isRightUndefined = ts.isIdentifier(node.right) && node.right.text === 'undefined';
    
    // Check if either side is a Map.get() call which returns a pointer
    const isLeftMapGet = this.isMapGetCall(node.left);
    const isRightMapGet = this.isMapGetCall(node.right);
    
    // Check if either side is an identifier that holds a pointer value
    const isLeftPointer = ts.isIdentifier(node.left) && this.pointerVariables.has(this.escapeName(node.left.text));
    const isRightPointer = ts.isIdentifier(node.right) && this.pointerVariables.has(this.escapeName(node.right.text));
    
    // Now visit the expressions
    let left = this.visitExpression(node.left);
    let right = this.visitExpression(node.right);
    
    // If comparing a pointer (Map.get() or pointer variable) with undefined/null, replace with nullptr
    if ((isLeftMapGet || isLeftPointer) && (isRightNull || isRightUndefined)) {
      right = cpp.id('nullptr');
    } else if ((isRightMapGet || isRightPointer) && (isLeftNull || isLeftUndefined)) {
      left = cpp.id('nullptr');
    } else {
      // For other optional comparisons, use std::nullopt for null (undefined already mapped)
      if (isLeftNull && left instanceof ast.Identifier && left.name === 'nullptr') {
        left = cpp.id('std::nullopt');
      }
      if (isRightNull && right instanceof ast.Identifier && right.name === 'nullptr') {
        right = cpp.id('std::nullopt');
      }
    }
    
    return cpp.binary(left, op, right);
  }
  
  /**
   * Check if an expression is a call to Map.get() or similar methods that return pointers
   */
  private isMapGetCall(node: ts.Expression): boolean {
    if (!ts.isCallExpression(node)) return false;
    if (!ts.isPropertyAccessExpression(node.expression)) return false;
    
    const methodName = node.expression.name.text;
    // Map.get(), Array operator[], etc. return pointers
    return methodName === 'get';
  }
  
  private visitNewExpression(node: ts.NewExpression): ast.Expression {
    // Get the class name
    let className = this.escapeName(node.expression.getText());
    
    // Get constructor arguments
    const args = node.arguments ? node.arguments.map(arg => this.visitExpression(arg)) : [];
    
    // For generic types like Map, Array, etc., try to get template parameters from type checker
    if (this.checker) {
      const type = this.checker.getTypeAtLocation(node);
      
      // Try to extract type arguments for generic types
      if (type.aliasSymbol || (type as any).target) {
        const typeRef = type as ts.TypeReference;
        const typeArgs = this.checker.getTypeArguments(typeRef);
        
        if (typeArgs && typeArgs.length > 0) {
          // Map TypeScript type arguments to C++ types
          const cppTypeArgs = typeArgs.map(arg => {
            const argStr = this.checker!.typeToString(arg);
            return this.mapTypeScriptTypeToCpp(argStr);
          });
          
          className = `${className}<${cppTypeArgs.join(', ')}>`;
        }
      }
      
      // Fallback: try string parsing if type arguments weren't extracted
      if (!className.includes('<') && (className === 'Map' || className === 'Array' || className === 'Set')) {
        const typeStr = this.checker.typeToString(type);
        if (typeStr.includes('<')) {
          const match = typeStr.match(/^(\w+)<(.+)>$/);
          if (match) {
            const baseName = match[1];
            const templateArgs = match[2];
            const cppTemplateArgs = templateArgs.split(',').map(t => 
              this.mapTypeScriptTypeToCpp(t.trim())
            ).join(', ');
            className = `${baseName}<${cppTemplateArgs}>`;
          }
        }
      }
    }
    
    // In C++, we create objects on the stack by default
    // new ClassName(args) → gs::ClassName(args)
    return cpp.call(cpp.id(`gs::${className}`), args);
  }
  
  /**
   * Map TypeScript type string to C++ type string
   */
  private mapTypeScriptTypeToCpp(tsType: string): string {
    switch (tsType) {
      case 'string': return 'gs::String';
      case 'number': return 'double';
      case 'boolean': return 'bool';
      case 'void': return 'void';
      case 'never': return 'gs::String';  // Use gs::String as placeholder for empty arrays
      default:
        // For custom types, prefix with gs:: namespace
        return tsType.startsWith('gs::') ? tsType : `gs::${tsType}`;
    }
  }
  
  private visitArrowFunction(node: ts.ArrowFunction): ast.Expression {
    // Arrow functions in TypeScript: (x) => x * 2
    // In C++, use lambdas: [](auto x) { return x * 2; }
    
    const params: ast.Parameter[] = [];
    for (const param of node.parameters) {
      const paramName = this.escapeName(param.name.getText());
      // For lambdas, use auto for parameter types unless explicitly typed
      const paramType = param.type ? this.mapType(param.type) : new ast.CppType('auto');
      params.push(new ast.Parameter(paramName, paramType));
    }
    
    // Get return type if specified, otherwise undefined (C++ will infer)
    const returnType = node.type ? this.mapType(node.type) : undefined;
    
    // Arrow function body can be an expression or a block
    let body: ast.Block | ast.Expression;
    if (ts.isBlock(node.body)) {
      body = this.visitBlock(node.body);
    } else {
      // Expression body: (x) => x * 2
      // Convert to: [](auto x) { return x * 2; }
      const expr = this.visitExpression(node.body);
      body = new ast.Block([new ast.ReturnStmt(expr)]);
    }
    
    // Create a lambda expression
    // Use [&] capture to capture all by reference (safe for immediate use)
    return new ast.Lambda(params, body, returnType, '[&]');
  }
  
  private visitTemplateLiteral(node: ts.TemplateExpression | ts.NoSubstitutionTemplateLiteral): ast.Expression {
    // Template literal: `Hello ${name}, you are ${age} years old`
    // Convert to: gs::String("Hello ") + gs::String(name) + gs::String(", you are ") + gs::String(std::to_string(age)) + gs::String(" years old")
    
    if (ts.isNoSubstitutionTemplateLiteral(node)) {
      // Simple template with no substitutions: `hello`
      const text = node.text;
      const escaped = this.escapeString(text);
      return cpp.call(cpp.id('gs::String'), [cpp.id(`"${escaped}"`)]);
    }
    
    // Template with substitutions
    const parts: ast.Expression[] = [];
    
    // Add head text
    if (node.head.text) {
      const escaped = this.escapeString(node.head.text);
      parts.push(cpp.call(cpp.id('gs::String'), [cpp.id(`"${escaped}"`)]));
    }
    
    // Add template spans (expression + text)
    for (const span of node.templateSpans) {
      const expr = this.visitExpression(span.expression);
      
      // Wrap expression in gs::String::from() to handle any type (String, numbers, etc.)
      const wrappedExpr = cpp.call(cpp.id('gs::String::from'), [expr]);
      parts.push(wrappedExpr);
      
      if (span.literal.text) {
        const escaped = this.escapeString(span.literal.text);
        parts.push(cpp.call(cpp.id('gs::String'), [cpp.id(`"${escaped}"`)]));
      }
    }
    
    // Concatenate all parts with +
    if (parts.length === 0) {
      return cpp.call(cpp.id('gs::String'), [cpp.id('""')]);
    }
    
    let result = parts[0];
    for (let i = 1; i < parts.length; i++) {
      result = cpp.binary(result, '+', parts[i]);
    }
    
    return result;
  }
  
  private visitCallExpression(node: ts.CallExpression): ast.Expression {
    // Handle property access: obj.method(args) first to get method name
    let methodName: string | undefined;
    let objNode: ts.Expression | undefined;
    
    if (ts.isPropertyAccessExpression(node.expression)) {
      methodName = this.escapeName(node.expression.name.text);
      objNode = node.expression.expression;
    }
    
    // Visit arguments and apply special handling
    const args = node.arguments.map((arg, index) => {
      let argExpr = this.visitExpression(arg);
      
      // Special handling for .push() on Array<share<T>>
      // If pushing to an array of shared_ptrs, wrap the argument
      if (methodName === 'push' && index === 0 && objNode && this.checker) {
        const objType = this.checker.getTypeAtLocation(objNode);
        const objTypeStr = this.checker.typeToString(objType);
        
        // Check if array element type is share<T>
        // Pattern: "share<TypeName>[]" or "Array<share<TypeName>>"
        const shareArrayMatch = objTypeStr.match(/(?:Array<)?share<([^>]+)>/);
        if (shareArrayMatch) {
          const elementType = shareArrayMatch[1];
          // Wrap in std::make_shared if the argument is a new expression or stack object
          if (ts.isNewExpression(arg) || ts.isIdentifier(arg)) {
            argExpr = cpp.call(cpp.id(`std::make_shared<gs::${elementType}>`), [argExpr]);
          }
        }
      }
      
      return argExpr;
    });
    
    // Handle property access: obj.method(args)
    if (ts.isPropertyAccessExpression(node.expression) && objNode && methodName) {
      // Special case: console.log, Math.max, JSON.stringify, etc.
      if (ts.isIdentifier(objNode)) {
        const objName = objNode.text;
        if (objName === 'console' || objName === 'Math' || objName === 'Number' || objName === 'JSON' || objName === 'Date') {
          return cpp.call(cpp.id(`gs::${objName}::${methodName}`), args);
        }
      }
      
      // Special case: number instance methods (toFixed, toExponential, toPrecision, toString)
      // value.toFixed(2) → gs::Number::toFixed(value, 2)
      // value.toString() → gs::Number::toString(value)
      if (this.checker && (methodName === 'toFixed' || methodName === 'toExponential' || methodName === 'toPrecision' || methodName === 'toString')) {
        const objType = this.checker.getTypeAtLocation(objNode);
        const objTypeStr = this.checker.typeToString(objType);
        if (objTypeStr === 'number') {
          let objExpr = this.visitExpression(objNode);
          
          // If objNode is an array subscript, we need to dereference it
          // because visitExpression() didn't dereference (it thought it was part of property access)
          if (ts.isElementAccessExpression(objNode)) {
            objExpr = cpp.unary('*', objExpr);
          }
          
          // Call static method with object as first argument
          return cpp.call(cpp.id(`gs::Number::${methodName}`), [objExpr, ...args]);
        }
      }
      
      // For 'this', use this->method() directly
      if (objNode.kind === ts.SyntaxKind.ThisKeyword) {
        return cpp.call(cpp.id(`this->${methodName}`), args);
      }
      
      // Regular method call: obj.method(args) or obj->method(args)
      const objExpr = this.visitExpression(objNode);
      
      // Check if obj is an array subscript or smart pointer - needs ->
      const isArraySubscript = ts.isElementAccessExpression(objNode);
      const isPointer = isArraySubscript || this.isSmartPointerAccess(objNode);
      
      return cpp.call(cpp.member(objExpr, methodName, isPointer), args);
    }
    
    // Regular function call
    const func = this.visitExpression(node.expression);
    return cpp.call(func, args);
  }
  
  private visitPropertyAccess(node: ts.PropertyAccessExpression): ast.Expression {
    const prop = node.name.text;
    
    // Handle console, Math, Number as namespaces
    if (ts.isIdentifier(node.expression)) {
      const objName = node.expression.text;
      
      // Check if it's an enum access
      if (this.enumNames.has(objName)) {
        return cpp.id(`gs::${objName}::${prop}`);
      }
      
      if (objName === 'console' || objName === 'Math' || objName === 'Number' || objName === 'JSON' || objName === 'Date') {
        return cpp.id(`gs::${objName}::${prop}`);
      }
    }
    
    // Handle 'this' - use this->property in C++
    if (node.expression.kind === ts.SyntaxKind.ThisKeyword) {
      // Check if the field is a smart pointer type
      const fieldName = `this.${prop}`;
      const fieldType = this.variableTypes.get(fieldName);
      const isPointer = fieldType ? this.isSmartPointerType(fieldType) : false;
      
      // For consistency, wrap isPointer fields in another layer
      // this.input where input is share<String> → this->input (which is a shared_ptr)
      // So accessing properties on it needs another ->
      return cpp.member(cpp.id('this'), prop, true); // Always use -> for this
    }
    
    const obj = this.visitExpression(node.expression);
    
    // Special case: array.length and map.size should be method calls
    if (this.checker) {
      if (prop === 'length') {
        const objType = this.checker.getTypeAtLocation(node.expression);
        const objTypeStr = this.checker.typeToString(objType);
        // Check if this is an array type
        if (objTypeStr.endsWith('[]') || objTypeStr.startsWith('Array<') || objTypeStr === 'string') {
          return cpp.call(cpp.member(obj, 'length'), []);
        }
      }
      if (prop === 'size') {
        const objType = this.checker.getTypeAtLocation(node.expression);
        const objTypeStr = this.checker.typeToString(objType);
        // Check if this is a Map or Set type
        if (objTypeStr.startsWith('Map<') || objTypeStr.startsWith('Set<')) {
          return cpp.call(cpp.member(obj, 'size'), []);
        }
      }
    }
    
    // Check if object is an array subscript (arr[i]) - these return pointers, so use ->
    const isArraySubscript = ts.isElementAccessExpression(node.expression);
    
    // Check if the object is a smart pointer type (needs -> instead of .)
    const isPointer = isArraySubscript || this.isSmartPointerAccess(node.expression);
    
    return cpp.member(obj, prop, isPointer);
  }
  
  private mapType(typeNode: ts.TypeNode | undefined): ast.CppType {
    // Handle undefined type (use auto)
    if (!typeNode) {
      return new ast.CppType('auto');
    }
    
    // Handle union types (T | null → std::optional<T>)
    if (ts.isUnionTypeNode(typeNode)) {
      // Check if it's a nullable type (T | null | undefined)
      const nonNullableTypes = typeNode.types.filter(t => {
        // Check for null keyword
        if (t.kind === ts.SyntaxKind.NullKeyword) return false;
        // Check for undefined keyword
        if (t.kind === ts.SyntaxKind.UndefinedKeyword) return false;
        // Check for literal null type
        if (ts.isLiteralTypeNode(t) && t.literal.kind === ts.SyntaxKind.NullKeyword) return false;
        return true;
      });
      
      if (nonNullableTypes.length === 1) {
        // T | null → std::optional<T>
        const innerType = this.mapType(nonNullableTypes[0]);
        return new ast.CppType('std::optional', [innerType]);
      }
      
      // Multiple non-null types - not supported, use auto
      return new ast.CppType('auto');
    }
    
    // Array types: number[] → gs::Array<double>
    if (ts.isArrayTypeNode(typeNode)) {
      const elementType = this.mapType(typeNode.elementType);
      return new ast.CppType(`gs::Array<${elementType.toString()}>`);
    }
    
    // Generic types: Map<K, V> → gs::Map<K, V>
    // Also handle ownership types: own<T>, share<T>, use<T>
    if (ts.isTypeReferenceNode(typeNode) && typeNode.typeArguments) {
      const baseName = typeNode.typeName.getText();
      const typeArgs = typeNode.typeArguments.map(arg => this.mapType(arg).toString());
      
      // Ownership types map to smart pointers
      if (baseName === 'own') {
        return new ast.CppType(`std::unique_ptr<${typeArgs[0]}>`);
      }
      if (baseName === 'share') {
        return new ast.CppType(`std::shared_ptr<${typeArgs[0]}>`);
      }
      if (baseName === 'use') {
        return new ast.CppType(`std::weak_ptr<${typeArgs[0]}>`);
      }
      
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
    
    if (text === 'void') {
      return new ast.CppType('void');
    }
    
    // TypeScript's 'never' type - represents impossible values
    // For array types, use gs::String as a safe placeholder (empty array will work with any type)
    if (text === 'never') {
      return new ast.CppType('gs::String');  // Safe placeholder for empty arrays
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
    // C++ keywords and common macros that conflict
    const keywords = new Set(['class', 'namespace', 'template', 'EOF', 'delete']);
    let result = keywords.has(name) ? name + '_' : name;
    
    // Sanitize Unicode characters to hex codes for portability
    // Convert non-ASCII characters to _uXXXX_ format
    result = result.replace(/[^\x00-\x7F]/g, (char) => {
      const code = char.charCodeAt(0);
      return `_u${code.toString(16)}_`;
    });
    
    return result;
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
    
    // Arrays are mutable - not constable
    if (name.startsWith('gs::Array<')) {
      return false;
    }
    
    // Maps and Sets are mutable - not constable
    if (name.startsWith('gs::Map<') || name.startsWith('gs::Set<')) {
      return false;
    }
    
    // If initialized with 'new', it's a mutable object - not constable
    if (initializer && ts.isNewExpression(initializer)) {
      return false;
    }
    
    // Other cases: default to constable
    return true;
  }
  
  /**
   * Check if a property access should use -> (for smart pointers) instead of .
   */
  private isSmartPointerAccess(expr: ts.Expression): boolean {
    // Check if it's an identifier and look up its type
    if (ts.isIdentifier(expr)) {
      const varName = this.escapeName(expr.text);
      const varType = this.variableTypes.get(varName);
      if (varType) {
        return this.isSmartPointerType(varType);
      }
    }
    
    // Check if it's 'this.property' access (class field)
    if (ts.isPropertyAccessExpression(expr)) {
      if (expr.expression.kind === ts.SyntaxKind.ThisKeyword) {
        const fieldName = `this.${expr.name.text}`;
        const fieldType = this.variableTypes.get(fieldName);
        if (fieldType) {
          return this.isSmartPointerType(fieldType);
        }
      }
    }
    
    return false;
  }
  
  /**
   * Check if a C++ type is a smart pointer (std::unique_ptr, std::shared_ptr, std::weak_ptr)
   */
  private isSmartPointerType(type: ast.CppType): boolean {
    const name = type.name;
    return name.startsWith('std::unique_ptr<') || 
           name.startsWith('std::shared_ptr<') || 
           name.startsWith('std::weak_ptr<');
  }
  
  /**
   * Determine if a method should be marked as const.
   * Methods that don't modify member variables should be const.
   */
  private shouldMethodBeConst(method: ts.MethodDeclaration): boolean {
    // Check if method body has any mutations to 'this' or its properties
    if (!method.body) {
      return true; // Abstract methods can be const
    }
    
    let hasMutation = false;
    const visit = (node: ts.Node): void => {
      // Check for direct assignments to this.field
      if (ts.isBinaryExpression(node) && 
          node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        if (ts.isPropertyAccessExpression(node.left) &&
            node.left.expression.kind === ts.SyntaxKind.ThisKeyword) {
          hasMutation = true;
        }
      }
      
      // Check for method calls on this.field that mutate state
      // e.g., this.map.set(), this.array.push()
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const methodName = node.expression.name.text;
        const mutatingMethods = ['set', 'push', 'pop', 'shift', 'unshift', 'splice', 'delete_', 'clear'];
        
        if (mutatingMethods.includes(methodName)) {
          // Check if this is called on a this.field
          const obj = node.expression.expression;
          if (ts.isPropertyAccessExpression(obj) && 
              obj.expression.kind === ts.SyntaxKind.ThisKeyword) {
            hasMutation = true;
          }
        }
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(method.body);
    
    return !hasMutation;
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
    
    // Look for super() call and this.field = expr assignments
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
      
      // Check if this is a this.field = expr assignment
      if (ts.isExpressionStatement(stmt) && ts.isBinaryExpression(stmt.expression)) {
        const binExpr = stmt.expression;
        if (binExpr.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
          // Check if left side is this.field
          if (ts.isPropertyAccessExpression(binExpr.left) &&
              binExpr.left.expression.kind === ts.SyntaxKind.ThisKeyword) {
            const fieldName = binExpr.left.name.getText();
            
            // Special handling for new Map(), new Array(), new Set() with no args
            // and for empty array literals []
            // Use {} for default initialization to avoid template parameter issues
            let value: ast.Expression;
            if (ts.isNewExpression(binExpr.right)) {
              const className = binExpr.right.expression.getText();
              const hasArgs = binExpr.right.arguments && binExpr.right.arguments.length > 0;
              
              if (!hasArgs && (className === 'Map' || className === 'Set' || className === 'Array')) {
                // Use {} for default initialization
                value = cpp.initList([]);
              } else {
                value = this.visitExpression(binExpr.right);
              }
            } else if (ts.isArrayLiteralExpression(binExpr.right) && binExpr.right.elements.length === 0) {
              // Empty array literal [] → {}
              value = cpp.initList([]);
            } else {
              value = this.visitExpression(binExpr.right);
            }
            
            // Add to initializer list
            initList.push(new ast.MemberInitializer(fieldName, value));
            
            // Skip this statement (don't add to body)
            continue;
          }
        }
      }
      
      // Not a special statement, add to remaining statements
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
