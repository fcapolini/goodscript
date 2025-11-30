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
import * as tsUtils from './ts-utils';
import * as cppUtils from './cpp-utils';
import { OwnershipAwareTypeChecker } from './ownership-aware-type-checker';

export class AstCodegen {
  private enumNames = new Set<string>(); // Track enum names for property access
  private currentFunctionReturnType?: ast.CppType; // Track current function return type for null handling
  private unwrappedOptionals = new Set<string>(); // Track variables known to be non-null in current scope
  private smartPointerNullChecks = new Set<string>(); // Track smart pointer variables checked against nullptr
  private variableTypes = new Map<string, ast.CppType>(); // Track variable types for smart pointer detection
  private pointerVariables = new Set<string>(); // Track variables that are pointers (from Map.get(), etc.)
  private templateParameters = new Set<string>(); // Track template parameter names (T, K, V, etc.)
  private ownershipChecker: OwnershipAwareTypeChecker;
  
  constructor(private checker?: ts.TypeChecker) {
    this.ownershipChecker = new OwnershipAwareTypeChecker(checker!);
  }
  
  generate(sourceFile: ts.SourceFile): string {
    this.enumNames.clear(); // Reset for each file
    this.unwrappedOptionals.clear(); // Reset for each file
    this.variableTypes.clear(); // Reset for each file
    this.pointerVariables.clear(); // Reset for each file
    this.templateParameters.clear(); // Reset for each file
    const includes = [new ast.Include('gs_runtime.hpp', false)];
    const declarations: ast.Declaration[] = [];
    const mainStatements: ast.Statement[] = [];
    
    // Separate declarations from top-level statements
    for (const stmt of sourceFile.statements) {
      if (ts.isVariableStatement(stmt)) {
        // Check if this is a generic arrow function (needs to be at namespace scope)
        if (stmt.declarationList.declarations.length === 1) {
          const decl = stmt.declarationList.declarations[0];
          if (decl.initializer && ts.isArrowFunction(decl.initializer) && 
              decl.initializer.typeParameters && decl.initializer.typeParameters.length > 0) {
            // Generic arrow function - add to namespace declarations
            const name = cppUtils.escapeName(decl.name.getText());
            const func = this.visitGenericArrowFunction(name, decl.initializer);
            declarations.push(func);
            continue; // Skip adding to mainStatements
          }
        }
        
        // Regular variables go into main()
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
      const name = cppUtils.escapeName(decl.name.getText());
      
      // Register with ownership checker
      if (ts.isVariableDeclaration(decl)) {
        this.ownershipChecker.registerVariable(name, decl);
      }
      
      // Get C++ type from explicit annotation if present
      let cppType: ast.CppType;
      if (decl.type) {
        cppType = this.mapType(decl.type);
      } else if (decl.initializer && ts.isNewExpression(decl.initializer)) {
        // Infer type from new expression - all class instances are smart pointers
        // Use the same logic as visitNewExpression to get className with template parameters
        let className = cppUtils.escapeName(decl.initializer.expression.getText());
        
        // Try to extract generic type arguments
        if (this.checker) {
          const type = this.checker.getTypeAtLocation(decl.initializer);
          
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
        }
        
        // Check if it's a built-in value type (Map, Array, Set, etc.)
        // These are NOT wrapped in smart pointers
        const builtInValueTypes = ['Map', 'Array', 'Set', 'String', 'RegExp', 'Date', 'Promise'];
        const baseClassName = className.split('<')[0];
        
        if (builtInValueTypes.includes(baseClassName)) {
          // Value types: direct type
          cppType = new ast.CppType(`gs::${className}`);
        } else {
          // User-defined classes: smart pointers
          const ownershipType = this.getOwnershipTypeForNew(decl.initializer);
          if (ownershipType === 'unique') {
            cppType = new ast.CppType(`std::unique_ptr<gs::${className}>`);
          } else {
            cppType = new ast.CppType(`std::shared_ptr<gs::${className}>`);
          }
        }
      } else if (decl.initializer && ts.isElementAccessExpression(decl.initializer) && this.checker) {
        // Infer type from array subscript: arr[i] where arr is Array<T>
        // Since array subscript returns T*, and we dereference it, variable holds T
        const arrayExpr = decl.initializer.expression;
        const arrayType = this.checker.getTypeAtLocation(arrayExpr);
        const arrayTypeStr = this.checker.typeToString(arrayType);
        
        // Extract element type from Array<T> or T[]
        const arrayMatch = arrayTypeStr.match(/(?:Array<)?(.+?)(?:\[\]|>)$/);
        if (arrayMatch) {
          const elementTypeStr = arrayMatch[1].trim();
          // Map TypeScript element type to C++
          const cppElementType = this.mapTypeScriptTypeToCpp(elementTypeStr);
          cppType = new ast.CppType(cppElementType);
        } else {
          cppType = new ast.CppType('auto');
        }
      } else {
        // Use auto for other inferred types - let C++ compiler figure it out
        cppType = new ast.CppType('auto');
      }
      
      // Special handling for function types (arrow functions)
      // If initializer is an arrow function and we don't have an explicit type,
      // use std::function to allow recursion
      // Note: Generic arrow functions are handled at top level, not here
      if (decl.initializer && ts.isArrowFunction(decl.initializer) && 
          !(decl.initializer.typeParameters && decl.initializer.typeParameters.length > 0)) {
        const arrowFunc = decl.initializer;
        
        let returnType: ast.CppType;
        if (arrowFunc.type) {
          returnType = this.mapType(arrowFunc.type);
        } else {
          // Infer return type: check if function body has return statements with values
          const hasReturnValue = tsUtils.arrowFunctionHasReturnValue(arrowFunc);
          returnType = hasReturnValue ? new ast.CppType('double') : new ast.CppType('void');
        }
        const paramTypes = arrowFunc.parameters.map(p => 
          p.type ? this.mapType(p.type) : new ast.CppType('double')
        );
        
        // Build std::function<ReturnType(ParamType1, ParamType2, ...)>
        const paramTypeStr = paramTypes.map(t => t.toString()).join(', ');
        cppType = new ast.CppType(`std::function<${returnType}(${paramTypeStr})>`);
      }
      
      // Check if initializer is Map.get() which returns a pointer, not optional
      if (decl.initializer && tsUtils.isMapGetCall(decl.initializer)) {
        // For smart pointer values, Map.get() should return the smart pointer directly (not a pointer to it)
        // For other types, it returns V*
        const typeStr = cppType.toString();
        
        if (typeStr.startsWith('std::optional<') && typeStr.endsWith('>')) {
          const innerType = typeStr.slice('std::optional<'.length, -1);
          
          // If inner type is a smart pointer, don't use optional at all
          if (innerType.includes('std::shared_ptr') || 
              innerType.includes('std::unique_ptr') ||
              innerType.includes('std::weak_ptr')) {
            // Map.get() returns the smart pointer directly (can be null)
            cppType = new ast.CppType(innerType);
          } else {
            // Regular type - Map.get() returns V*
            cppType = new ast.CppType(`${innerType}*`);
            this.pointerVariables.add(name);
          }
        } else if (typeStr === 'auto' && this.checker && ts.isCallExpression(decl.initializer)) {
          // For auto types from Map.get(), determine the actual type
          const callExpr = decl.initializer;
          if (ts.isPropertyAccessExpression(callExpr.expression) && 
              callExpr.expression.name.text === 'get') {
            const mapExpr = callExpr.expression.expression;
            const mapType = this.checker.getTypeAtLocation(mapExpr);
            const mapTypeStr = this.checker.typeToString(mapType);
            
            // Extract value type from Map<K,V>
            const mapMatch = mapTypeStr.match(/Map<[^,]+,\s*(.+)>/);
            if (mapMatch) {
              const valueTypeStr = mapMatch[1].trim();
              
              // Check if value type is share<T> - return shared_ptr directly
              const shareMatch = valueTypeStr.match(/share<(.+)>/);
              if (shareMatch) {
                const innerType = shareMatch[1].trim();
                const cppInnerType = this.mapTypeScriptTypeToCpp(innerType);
                // Return shared_ptr directly - it can be null
                cppType = new ast.CppType(`std::shared_ptr<${cppInnerType}>`);
              } else {
                // Regular type - Map.get() returns V*
                const cppValueType = this.mapTypeScriptTypeToCpp(valueTypeStr);
                cppType = new ast.CppType(`${cppValueType}*`);
                this.pointerVariables.add(name);
              }
            }
          }
        } else if (typeStr.includes('std::shared_ptr') || 
                   typeStr.includes('std::unique_ptr') ||
                   typeStr.includes('std::weak_ptr')) {
          // Smart pointer type - Map.get() returns it directly
          // Don't add to pointerVariables - it's not a raw pointer
        } else {
          // Regular type - Map.get() returns V*
          this.pointerVariables.add(name);
        }
      }
      
      let init: ast.Expression | undefined;
      
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
          
          // Check if we need to wrap the initializer in a smart pointer
          // Case: const shared: share<T> = plainValue;
          // But NOT: const shared: share<T> = new T(); (already creates smart ptr)
          if (decl.type && !ts.isNewExpression(decl.initializer)) {
            const varTypeText = decl.type.getText();
            
            // Parse the variable type to get ownership
            const varTypeMatch = varTypeText.match(/^(own|share|use)<(.+)>$/);
            if (varTypeMatch) {
              const ownership = varTypeMatch[1] as 'own' | 'share' | 'use';
              const innerType = varTypeMatch[2];
              
              // Check if initializer already has ownership
              const initOwnership = this.ownershipChecker.getTypeOfExpression(decl.initializer);
              
              // If variable is share<T> but initializer is plain T, wrap it
              if (ownership === 'share' && !initOwnership?.ownership) {
                const cppInnerType = this.mapTypeScriptTypeToCpp(innerType);
                init = cpp.call(cpp.id(`std::make_shared<${cppInnerType}>`), [init]);
              }
              // If variable is own<T> but initializer is plain T, wrap it
              else if (ownership === 'own' && !initOwnership?.ownership) {
                const cppInnerType = this.mapTypeScriptTypeToCpp(innerType);
                init = cpp.call(cpp.id(`std::make_unique<${cppInnerType}>`), [init]);
              }
            }
          }
        }
        
        // ALL class instances are now created as smart pointers by visitNewExpression
        // So NO wrapping needed except for Map.get() which returns V* that needs deref
        const typeStr = cppType.toString();
        const isMapGet = decl.initializer && tsUtils.isMapGetCall(decl.initializer);
        
        if (isMapGet && typeStr.includes('std::shared_ptr')) {
          // Map.get() returns shared_ptr<T>* - safely dereference it
          const tempExpr = init;
          init = cpp.ternary(
            cpp.binary(tempExpr, '!=', cpp.id('nullptr')),
            cpp.unary('*', tempExpr),
            cpp.id('nullptr')
          );
        }
        
        // If initializing optional type with null, use std::nullopt instead of nullptr
        if (init instanceof ast.Identifier && init.name === 'nullptr' && 
            typeStr.startsWith('std::optional')) {
          init = cpp.id('std::nullopt');
        }
      }
      
      // IMPORTANT: Infer actual C++ type for auto variables
      // For array methods like filter(), map(), the return type is the same array type
      if (cppType.toString() === 'auto' && decl.initializer) {
        if (ts.isCallExpression(decl.initializer) && 
            ts.isPropertyAccessExpression(decl.initializer.expression)) {
          const methodName = decl.initializer.expression.name.text;
          const objExpr = decl.initializer.expression.expression;
          
          // Array methods that return the same array type
          if (['filter', 'map', 'sort', 'reverse'].includes(methodName)) {
            if (ts.isIdentifier(objExpr)) {
              const objName = cppUtils.escapeName(objExpr.text);
              const objType = this.variableTypes.get(objName);
              if (objType) {
                // Use the object's array type
                cppType = objType;
              }
            }
          }
        }
      }
      
      // Track variable type for smart pointer detection (AFTER potentially updating cppType)
      this.variableTypes.set(name, cppType);
      
      // In C++, 'const' on objects makes them immutable, but in TypeScript,
      // 'const' just means the binding can't be reassigned.
      // - Primitives (number, bool) and strings: can be const
      // - Class instances: should NOT be const (objects are mutable)
      const useConst = isConst && cppUtils.isConstableType(cppType, decl.initializer);
      
      // VariableDecl constructor: (name, type, initializer, isConst)
      result.push(new ast.VariableDecl(name, cppType, init, useConst));
    }
    
    return result;
  }
  
  private visitFunction(node: ts.FunctionDeclaration): ast.Function | undefined {
    if (!node.name) return undefined;
    
    const name = cppUtils.escapeName(node.name.text);
    const returnType = node.type ? this.mapType(node.type) : new ast.CppType('void');
    
    // Track return type for null handling in return statements
    const previousReturnType = this.currentFunctionReturnType;
    this.currentFunctionReturnType = returnType;
    
    const params: ast.Parameter[] = [];
    for (const param of node.parameters) {
      const paramName = cppUtils.escapeName(param.name.getText());
      const paramType = param.type ? this.mapType(param.type) : new ast.CppType('auto');
      
      // Register parameter with ownership checker
      this.ownershipChecker.registerVariable(paramName, param);
      
      const passByConstRef = tsUtils.shouldPassByConstRef(param.type);
      const passByMutableRef = tsUtils.shouldPassByMutableRef(param.type);
      params.push(new ast.Parameter(paramName, paramType, undefined, passByConstRef, passByMutableRef));
    }
    
    const body = node.body ? this.visitBlock(node.body) : new ast.Block([]);
    
    // Restore previous return type
    this.currentFunctionReturnType = previousReturnType;
    
    return new ast.Function(name, returnType, params, body);
  }
  
  private visitClass(node: ts.ClassDeclaration): ast.Class | undefined {
    if (!node.name) return undefined;
    
    const name = cppUtils.escapeName(node.name.text);
    const fields: ast.Field[] = [];
    const constructors: ast.Constructor[] = [];
    const methods: ast.Method[] = [];
    
    // Handle type parameters for generic classes
    const templateParams: string[] = [];
    if (node.typeParameters) {
      for (const typeParam of node.typeParameters) {
        const paramName = typeParam.name.text;
        templateParams.push(paramName);
        this.templateParameters.add(paramName); // Track as template parameter
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
            baseClass = cppUtils.escapeName(clause.types[0].getText());
          }
        } else if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
          // implements - multiple interfaces (treated as base classes in C++)
          for (const type of clause.types) {
            baseClasses.push(cppUtils.escapeName(type.getText()));
          }
        }
      }
    }
    
    // Collect fields
    for (const member of node.members) {
      if (ts.isPropertyDeclaration(member)) {
        const fieldName = cppUtils.escapeName(member.name.getText());
        const fieldType = member.type ? this.mapType(member.type) : new ast.CppType('auto');
        fields.push(new ast.Field(fieldName, fieldType));
        
        // Register property with ownership checker
        this.ownershipChecker.registerProperty(name, fieldName, member);
        
        // Track field types (prefixed with this. for class members)
        this.variableTypes.set(`this.${fieldName}`, fieldType);
      }
    }
    
    // Collect constructors
    for (const member of node.members) {
      if (ts.isConstructorDeclaration(member)) {
        const params: ast.Parameter[] = [];
        for (const param of member.parameters) {
          const paramName = cppUtils.escapeName(param.name.getText());
          const paramType = param.type ? this.mapType(param.type) : new ast.CppType('auto');
          // In constructors, arrays should be passed by const ref (they're just assigned to fields)
          const passByConstRef = param.type && ts.isArrayTypeNode(param.type) ? true : tsUtils.shouldPassByConstRef(param.type);
          const passByMutableRef = param.type && ts.isArrayTypeNode(param.type) ? false : tsUtils.shouldPassByMutableRef(param.type);
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
        const methodName = cppUtils.escapeName(member.name.getText());
        const returnType = member.type ? this.mapType(member.type) : new ast.CppType('void');
        
        // Track return type for null handling in return statements
        const previousReturnType = this.currentFunctionReturnType;
        this.currentFunctionReturnType = returnType;
        
        const params: ast.Parameter[] = [];
        for (const param of member.parameters) {
          const paramName = cppUtils.escapeName(param.name.getText());
          const paramType = param.type ? this.mapType(param.type) : new ast.CppType('auto');
          const passByConstRef = tsUtils.shouldPassByConstRef(param.type);
          const passByMutableRef = tsUtils.shouldPassByMutableRef(param.type);
          params.push(new ast.Parameter(paramName, paramType, undefined, passByConstRef, passByMutableRef));
        }
        
        const body = member.body ? this.visitBlock(member.body) : new ast.Block([]);
        
        // Restore previous return type
        this.currentFunctionReturnType = previousReturnType;
        
        // Check if method should be const (doesn't modify 'this') and if it's static
        // Static methods cannot be const in C++
        const isStatic = member.modifiers?.some(mod => mod.kind === ts.SyntaxKind.StaticKeyword) ?? false;
        const isConst = !isStatic && tsUtils.shouldMethodBeConst(member);
        
        methods.push(new ast.Method(methodName, returnType, params, body, ast.AccessSpecifier.Public, isConst, isStatic));
      }
    }
    
    // If this is an error class (name ends with "Error"), make it inherit from std::exception
    if (name.endsWith('Error') && !baseClass) {
      baseClass = 'std::exception';
    }
    
    return new ast.Class(name, fields, constructors, methods, baseClass, templateParams, false, baseClasses);
  }
  
  private visitInterface(node: ts.InterfaceDeclaration): ast.Class | undefined {
    const name = cppUtils.escapeName(node.name.text);
    const fields: ast.Field[] = [];
    
    // Convert interface properties to fields
    for (const member of node.members) {
      if (ts.isPropertySignature(member) && member.name) {
        const fieldName = cppUtils.escapeName(member.name.getText());
        const fieldType = member.type ? this.mapType(member.type) : new ast.CppType('auto');
        fields.push(new ast.Field(fieldName, fieldType));
      }
    }
    
    // Interfaces become structs (public by default)
    return new ast.Class(name, fields, [], [], undefined, [], true);
  }
  
  private visitEnum(node: ts.EnumDeclaration): ast.Enum | undefined {
    const name = cppUtils.escapeName(node.name.text);
    this.enumNames.add(name); // Track enum name
    const members: ast.EnumMember[] = [];
    
    let nextValue = 0;
    for (const member of node.members) {
      const memberName = cppUtils.escapeName(member.name.getText());
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
      // Check if returning a new expression with own<T> return type BEFORE visiting
      if (node.expression && ts.isNewExpression(node.expression) &&
          this.currentFunctionReturnType?.toString().startsWith('std::unique_ptr<')) {
        // Extract the type from std::unique_ptr<T>
        const returnTypeStr = this.currentFunctionReturnType.toString();
        const match = returnTypeStr.match(/std::unique_ptr<(.+)>/);
        if (match) {
          const innerType = match[1];
          // Visit arguments
          const args = node.expression.arguments 
            ? Array.from(node.expression.arguments).map(arg => this.visitExpression(arg))
            : [];
          // Create make_unique call
          const expr = cpp.call(cpp.id(`std::make_unique<${innerType}>`), args);
          return new ast.ReturnStmt(expr);
        }
      }
      
      let expr = node.expression ? this.visitExpression(node.expression) : undefined;
      
      // If returning a ternary with pointer branches and function returns optional, convert
      if (expr instanceof ast.ConditionalExpr && 
          this.currentFunctionReturnType?.toString().startsWith('std::optional') &&
          node.expression && ts.isConditionalExpression(node.expression)) {
        // Check if this is a pattern like: result !== undefined ? result : null
        // where result is from Map.get() (pointer)
        const isPointerTernary = tsUtils.isMapGetCall(node.expression.whenTrue) ||
                                 (ts.isIdentifier(node.expression.whenTrue) && 
                                  this.pointerVariables.has(cppUtils.escapeName(node.expression.whenTrue.text)));
        
        if (isPointerTernary) {
          // Extract the inner type from std::optional<T>
          const optType = this.currentFunctionReturnType.toString();
          const match = optType.match(/std::optional<(.+)>/);
          if (match) {
            const innerType = match[1];
            // Convert: (result != nullptr ? result : nullptr) 
            // To:      (result != nullptr ? std::make_optional(*result) : std::nullopt)
            const condition = expr.condition;
            const whenTrue = cpp.call(cpp.id('std::make_optional'), [cpp.unary('*', expr.whenTrue)]);
            const whenFalse = cpp.id('std::nullopt');
            expr = cpp.ternary(condition, whenTrue, whenFalse);
          }
        }
      }
      
      // If returning a pointer variable, dereference it
      if (expr instanceof ast.Identifier && ts.isIdentifier(node.expression!) && 
          this.pointerVariables.has(cppUtils.escapeName(node.expression.text))) {
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
    const unwrappedVar = tsUtils.extractNullCheck(node.expression, (name) => cppUtils.escapeName(name));
    
    // Visit condition WITHOUT unwrapping (condition contains the null check itself)
    const condition = this.visitExpression(node.expression);
    
    // Process then block WITH unwrapped variable in scope
    if (unwrappedVar) {
      this.unwrappedOptionals.add(unwrappedVar);
      
      // Check if this is a smart pointer null check (comparing with nullptr, not std::nullopt)
      // This happens when the variable type is a user-defined class or share<T>
      // BUT only if it's actually a smart pointer type, not a raw pointer
      const varType = this.variableTypes.get(unwrappedVar);
      const isActuallySmartPointer = varType && cppUtils.isSmartPointerType(varType);
      
      // Also check TypeScript type for nullable class patterns (T | null, not T | undefined)
      // This handles auto variables from methods returning nullable classes
      let isNullableClass = false;
      if (!isActuallySmartPointer && varType && varType.toString() === 'auto' && this.checker) {
        const varNode = tsUtils.findIdentifierInExpression(node.expression, unwrappedVar);
        if (varNode) {
          const tsType = this.checker.getTypeAtLocation(varNode);
          if (tsType.isUnion && tsType.isUnion()) {
            const types = tsType.types;
            const hasNull = types.some(t => (t.flags & ts.TypeFlags.Null) !== 0);
            const hasUndefined = types.some(t => (t.flags & ts.TypeFlags.Undefined) !== 0);
            const classType = types.find(t => 
              (t.flags & ts.TypeFlags.Object) !== 0 &&
              (t as any).symbol &&
              !(t as any).symbol.getName().match(/Array|Map|Set|String|RegExp|Date|Promise/)
            );
            // T | null (without undefined) indicates a nullable reference, not optional
            if (hasNull && !hasUndefined && classType) {
              isNullableClass = true;
            }
          }
        }
      }
      
      if ((isActuallySmartPointer || isNullableClass) &&
          condition instanceof ast.BinaryExpr && 
          (condition.right instanceof ast.Identifier && condition.right.name === 'nullptr' ||
           condition.left instanceof ast.Identifier && condition.left.name === 'nullptr')) {
        this.smartPointerNullChecks.add(unwrappedVar);
      }
    }
    
    const thenBlock = ts.isBlock(node.thenStatement) 
      ? this.visitBlock(node.thenStatement)
      : new ast.Block([this.visitStatement(node.thenStatement)!]);
    
    // Remove from unwrapped set after then block
    if (unwrappedVar) {
      this.unwrappedOptionals.delete(unwrappedVar);
      this.smartPointerNullChecks.delete(unwrappedVar);
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
          const name = cppUtils.escapeName(decl.name.getText());
          
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
      varName = cppUtils.escapeName(decl.name.getText());
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
        catchVar = cppUtils.escapeName(node.catchClause.variableDeclaration.name.getText());
        // Try to determine the exception type from the catch clause type annotation
        if (node.catchClause.variableDeclaration.type) {
          const typeText = node.catchClause.variableDeclaration.type.getText();
          // User-defined exception types are thrown as shared_ptr, so catch as shared_ptr
          const cppType = `std::shared_ptr<gs::${typeText}>`;
          catchType = new ast.CppType(cppType);
          // Track this as a smart pointer variable so we use -> for member access
          this.variableTypes.set(catchVar, new ast.CppType(cppType));
        } else {
          // If no type annotation, scan catch block for instanceof checks
          const instanceofType = tsUtils.findInstanceofTypeInCatch(node.catchClause.block, catchVar);
          if (instanceofType) {
            // User-defined exception types are thrown as shared_ptr, so catch as shared_ptr
            const cppType = `std::shared_ptr<gs::${instanceofType}>`;
            catchType = new ast.CppType(cppType);
            // Track this as a smart pointer variable so we use -> for member access
            this.variableTypes.set(catchVar, new ast.CppType(cppType));
          }
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
      const escaped = cppUtils.escapeString(node.text);
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
      
      // Handle global constants
      if (varName === 'NaN') {
        return cpp.id('gs::Number::NaN');
      }
      if (varName === 'Infinity') {
        return cpp.id('gs::Number::Infinity');
      }
      
      // Handle global types/objects
      if (varName === 'String') {
        return cpp.id('gs::String');
      }
      
      const escapedName = cppUtils.escapeName(varName);
      
      // If this identifier is tracked as unwrapped
      if (this.unwrappedOptionals.has(escapedName)) {
        // Check if it's a smart pointer null check (compared with nullptr)
        // Smart pointers don't need unwrapping - they're already usable
        if (this.smartPointerNullChecks.has(escapedName)) {
          return cpp.id(escapedName);
        }
        
        // Check if it's a smart pointer type (shared_ptr, unique_ptr, weak_ptr)
        const varType = this.variableTypes.get(escapedName);
        if (varType && cppUtils.isSmartPointerType(varType)) {
          // Smart pointers don't need unwrapping - they're already usable
          // Just return the identifier (nullptr check passed, so it's safe to use)
          return cpp.id(escapedName);
        }
        
        // For raw pointers (from Map.get() on non-smart-pointer values)
        if (this.pointerVariables.has(escapedName)) {
          // Dereference the pointer
          return cpp.unary('*', cpp.id(escapedName));
        }
        
        // For std::optional types
        return cpp.id(`${escapedName}.value()`);
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
      let obj = this.visitExpression(node.expression);
      let index = this.visitExpression(node.argumentExpression!);
      
      // Check if the object is a smart pointer to an array
      // e.g., shared_ptr<Array<T>> or unique_ptr<Array<T>>
      // NOTE: Check actual C++ type, not just TypeScript ownership annotation
      // because Array types are no longer wrapped in smart pointers by default
      let isSmartPtrToArray = false;
      if (ts.isIdentifier(node.expression)) {
        const varName = cppUtils.escapeName(node.expression.text);
        const varType = this.variableTypes.get(varName);
        if (varType) {
          const typeStr = varType.toString();
          isSmartPtrToArray = (typeStr.startsWith('std::shared_ptr<gs::Array<') || 
                              typeStr.startsWith('std::unique_ptr<gs::Array<'));
        }
      }
      
      // If obj is a smart pointer to an array, we need to dereference it first
      // board[i] where board is shared_ptr<Array<T>> becomes (*board)[i]
      if (isSmartPtrToArray) {
        obj = cpp.paren(cpp.unary('*', obj));
      }
      
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
      
      // Check if array element type is shared_ptr using ownership-aware type checker
      // This preserves share<T> annotations that TypeChecker erases
      const hasSmartPtrElements = this.ownershipChecker.hasSmartPointerElements(node.expression);
      
      // For shared_ptr elements, always dereference once to get the shared_ptr
      // operator[] returns shared_ptr<T>*, we want shared_ptr<T>
      // Then property access will use -> on the shared_ptr to access T's members
      if (hasSmartPtrElements) {
        return cpp.unary('*', subscript);
      }
      
      if (isPartOfPropertyAccess) {
        // Don't dereference - parent will use -> to access the pointer
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
        
        // NEW: If elements are new expressions creating class instances,
        // the element type should be the smart pointer type (unique_ptr or shared_ptr)
        if (elements.length > 0 && node.elements[0] && ts.isNewExpression(node.elements[0])) {
          const firstNew = node.elements[0];
          const className = firstNew.expression.getText();
          const ownershipType = this.getOwnershipTypeForNew(firstNew);
          if (ownershipType === 'unique') {
            elementType = `std::unique_ptr<gs::${className}>`;
          } else {
            elementType = `std::shared_ptr<gs::${className}>`;
          }
        }
      }
      
      // Generate gs::Array<T>({...}) with explicit template parameter if we know the type
      // This prevents type inference issues with int vs double literals
      const arrayType = elementType ? `gs::Array<${elementType}>` : 'gs::Array';
      return cpp.call(cpp.id(arrayType), [cpp.initList(elements)]);
    }
    
    if (ts.isParenthesizedExpression(node)) {
      // Preserve parentheses to maintain operator precedence
      const inner = this.visitExpression(node.expression);
      return new ast.ParenExpr(inner);
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
  
  private visitBinaryExpression(node: ts.BinaryExpression): ast.Expression {
    // Special case: array.length = n → array.resize(n)
    if (node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isPropertyAccessExpression(node.left) &&
        node.left.name.text === 'length') {
      // This is an assignment to .length property - use resize() for arrays
      const obj = this.visitExpression(node.left.expression);
      const newSize = this.visitExpression(node.right);
      return cpp.call(cpp.member(obj, 'resize'), [newSize]);
    }
    
    // Handle instanceof specially
    if (node.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword) {
      const obj = this.visitExpression(node.left);
      const typeName = node.right.getText();
      
      // For exception objects caught as shared_ptr, use dynamic_pointer_cast
      // e instanceof Type → std::dynamic_pointer_cast<gs::Type>(e) != nullptr
      return cpp.binary(
        cpp.call(
          cpp.id('std::dynamic_pointer_cast'),
          [obj],
          [new ast.CppType(`gs::${typeName}`)] // Type without pointer decoration
        ),
        '!=',
        cpp.id('nullptr')
      );
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
    const isLeftMapGet = tsUtils.isMapGetCall(node.left);
    const isRightMapGet = tsUtils.isMapGetCall(node.right);
    
    // Check if either side is an identifier that holds a pointer value
    const isLeftPointer = ts.isIdentifier(node.left) && this.pointerVariables.has(cppUtils.escapeName(node.left.text));
    const isRightPointer = ts.isIdentifier(node.right) && this.pointerVariables.has(cppUtils.escapeName(node.right.text));
    
    // Check if either side is a shared_ptr type (share<T>)
    // NOTE: Check the actual C++ type, not just TypeScript ownership
    // For example, Array.find() returns optional<T>, not T directly
    let isLeftSharedPtr = false;
    let isRightSharedPtr = false;
    if (this.checker) {
      // Check if left side has a C++ smart pointer type
      if (!isLeftNull && !isLeftUndefined && ts.isIdentifier(node.left)) {
        const varName = cppUtils.escapeName(node.left.text);
        const varType = this.variableTypes.get(varName);
        if (varType) {
          const typeStr = varType.toString();
          // Check if the DIRECT type is a smart pointer (not optional<smart_ptr>)
          isLeftSharedPtr = typeStr.startsWith('std::shared_ptr<') || 
                           typeStr.startsWith('std::unique_ptr<') ||
                           typeStr.startsWith('std::weak_ptr<');
        }
        
        // Also check TypeScript type for nullable class patterns (T | null, not T | undefined)
        // This handles auto variables from methods returning nullable classes
        if (!isLeftSharedPtr && varType && varType.toString() === 'auto') {
          const tsType = this.checker.getTypeAtLocation(node.left);
          if (tsType.isUnion && tsType.isUnion()) {
            const types = tsType.types;
            const hasNull = types.some(t => (t.flags & ts.TypeFlags.Null) !== 0);
            const hasUndefined = types.some(t => (t.flags & ts.TypeFlags.Undefined) !== 0);
            const classType = types.find(t => 
              (t.flags & ts.TypeFlags.Object) !== 0 &&
              (t as any).symbol &&
              !(t as any).symbol.getName().match(/Array|Map|Set|String|RegExp|Date|Promise/)
            );
            // T | null (without undefined) indicates a nullable reference, not optional
            if (hasNull && !hasUndefined && classType) {
              isLeftSharedPtr = true;
            }
          }
        }
      }
      
      // Check if right side has a C++ smart pointer type
      if (!isRightNull && !isRightUndefined && ts.isIdentifier(node.right)) {
        const varName = cppUtils.escapeName(node.right.text);
        const varType = this.variableTypes.get(varName);
        if (varType) {
          const typeStr = varType.toString();
          isRightSharedPtr = typeStr.startsWith('std::shared_ptr<') || 
                            typeStr.startsWith('std::unique_ptr<') ||
                            typeStr.startsWith('std::weak_ptr<');
        }
        
        // Also check TypeScript type for nullable class patterns (T | null, not T | undefined)
        if (!isRightSharedPtr && varType && varType.toString() === 'auto') {
          const tsType = this.checker.getTypeAtLocation(node.right);
          if (tsType.isUnion && tsType.isUnion()) {
            const types = tsType.types;
            const hasNull = types.some(t => (t.flags & ts.TypeFlags.Null) !== 0);
            const hasUndefined = types.some(t => (t.flags & ts.TypeFlags.Undefined) !== 0);
            const classType = types.find(t => 
              (t.flags & ts.TypeFlags.Object) !== 0 &&
              (t as any).symbol &&
              !(t as any).symbol.getName().match(/Array|Map|Set|String|RegExp|Date|Promise/)
            );
            // T | null (without undefined) indicates a nullable reference, not optional
            if (hasNull && !hasUndefined && classType) {
              isRightSharedPtr = true;
            }
          }
        }
      }
    }
    
    // Now visit the expressions
    let left = this.visitExpression(node.left);
    let right = this.visitExpression(node.right);
    
    // If comparing a pointer/shared_ptr with undefined/null, replace with nullptr
    if ((isLeftMapGet || isLeftPointer || isLeftSharedPtr) && (isRightNull || isRightUndefined)) {
      right = cpp.id('nullptr');
    } else if ((isRightMapGet || isRightPointer || isRightSharedPtr) && (isLeftNull || isLeftUndefined)) {
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
  
  private visitNewExpression(node: ts.NewExpression): ast.Expression {
    // Get the class name
    let className = cppUtils.escapeName(node.expression.getText());
    
    // Get constructor arguments
    let args = node.arguments ? node.arguments.map(arg => this.visitExpression(arg)) : [];
    
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
      
      // Check if constructor parameters need smart pointer wrapping
      // For user-defined classes, constructor may expect share<T> for value type args
      if (node.arguments && node.arguments.length > 0) {
        const signature = this.checker.getResolvedSignature(node);
        if (signature && signature.parameters.length > 0) {
          args = args.map((arg, index) => {
            if (index >= signature.parameters.length) return arg;
            
            const param = signature.parameters[index];
            const paramDecl = param.valueDeclaration;
            if (paramDecl && ts.isParameter(paramDecl) && paramDecl.type) {
              const paramTypeText = paramDecl.type.getText();
              
              // If parameter is share<string>, check if argument needs wrapping
              if (paramTypeText === 'share<string>') {
                // Case 1: Direct gs::String constructor call
                if (arg instanceof ast.CallExpr && 
                    arg.callee instanceof ast.Identifier && 
                    arg.callee.name === 'gs::String') {
                  // Wrap in std::make_shared<gs::String>
                  return cpp.call(cpp.id('std::make_shared<gs::String>'), arg.args);
                }
                
                // Case 2: Identifier referring to a gs::String or auto (inferred String) variable
                if (arg instanceof ast.Identifier && node.arguments![index]) {
                  const argNode = node.arguments![index];
                  if (ts.isIdentifier(argNode)) {
                    const varName = cppUtils.escapeName(argNode.text);
                    const varType = this.variableTypes.get(varName);
                    // If variable type is gs::String or auto (string inference), wrap it
                    if (varType && (varType.toString() === 'gs::String' || varType.toString() === 'auto')) {
                      // Wrap the identifier in std::make_shared<gs::String>
                      return cpp.call(cpp.id('std::make_shared<gs::String>'), [arg]);
                    }
                  }
                }
              }
            }
            
            return arg;
          });
        }
      }
    }
    
    // Built-in value types (Map, Array, Set, etc.) are NOT heap-allocated
    // Only user-defined classes and explicit ownership types need smart pointers
    const builtInValueTypes = ['Map', 'Array', 'Set', 'String', 'RegExp', 'Date', 'Promise'];
    const baseClassName = className.split('<')[0]; // Remove template args for check
    
    if (builtInValueTypes.includes(baseClassName)) {
      // Value types: direct construction (no smart pointer)
      return cpp.call(cpp.id(`gs::${className}`), args);
    }
    
    // User-defined class instances are heap-allocated via smart pointers
    // Determine ownership type from parent context
    const ownershipType = this.getOwnershipTypeForNew(node);
    
    if (ownershipType === 'unique') {
      // Explicit unique ownership (own<T>)
      return cpp.call(cpp.id(`std::make_unique<gs::${className}>`), args);
    } else {
      // Default to shared ownership (matches JavaScript reference semantics)
      return cpp.call(cpp.id(`std::make_shared<gs::${className}>`), args);
    }
  }
  
  /**
   * Determine if a new expression should create shared_ptr or unique_ptr
   * based on the target variable type or context
   */
  private getOwnershipTypeForNew(node: ts.NewExpression): 'unique' | 'shared' {
    if (!this.checker) return 'shared';  // Default to shared (matches JS semantics)
    
    // Check parent context
    const parent = node.parent;
    
    // Variable declaration: const x: own<T> = new T() - explicit unique ownership
    if (ts.isVariableDeclaration(parent) && parent.type) {
      const typeText = parent.type.getText();
      if (typeText.startsWith('own<')) return 'unique';
      if (typeText.startsWith('share<')) return 'shared';
    }
    
    // Return statement: return new T() where function returns own<T>
    if (ts.isReturnStatement(parent) && this.currentFunctionReturnType) {
      const returnTypeStr = this.currentFunctionReturnType.toString();
      if (returnTypeStr.includes('std::unique_ptr')) return 'unique';
      if (returnTypeStr.includes('std::shared_ptr')) return 'shared';
    }
    
    // Assignment: x = new T() where x is own<T>
    if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const leftType = this.checker.getTypeAtLocation(parent.left);
      const leftTypeStr = this.checker.typeToString(leftType);
      if (leftTypeStr.startsWith('own<')) return 'unique';
      if (leftTypeStr.startsWith('share<')) return 'shared';
    }
    
    // Default to shared ownership (matches JavaScript reference semantics)
    return 'shared';
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
        // Check if it's a template parameter (don't add gs:: prefix)
        if (this.templateParameters.has(tsType)) {
          return tsType;
        }
        
        // Handle ownership types: own<T>, share<T>, use<T>
        const ownMatch = tsType.match(/^own<(.+)>$/);
        if (ownMatch) {
          const innerType = this.mapTypeScriptTypeToCpp(ownMatch[1]);
          return `std::unique_ptr<${innerType}>`;
        }
        const shareMatch = tsType.match(/^share<(.+)>$/);
        if (shareMatch) {
          const innerType = this.mapTypeScriptTypeToCpp(shareMatch[1]);
          return `std::shared_ptr<${innerType}>`;
        }
        const useMatch = tsType.match(/^use<(.+)>$/);
        if (useMatch) {
          const innerType = this.mapTypeScriptTypeToCpp(useMatch[1]);
          return `std::weak_ptr<${innerType}>`;
        }
        
        // For custom types, prefix with gs:: namespace
        return tsType.startsWith('gs::') ? tsType : `gs::${tsType}`;
    }
  }
  
  private visitArrowFunction(node: ts.ArrowFunction): ast.Expression {
    // Arrow functions in TypeScript: (x) => x * 2
    // In C++, use lambdas: [](auto x) { return x * 2; }
    
    const params: ast.Parameter[] = [];
    for (const param of node.parameters) {
      const paramName = cppUtils.escapeName(param.name.getText());
      // For lambdas, use auto for parameter types unless explicitly typed
      const paramType = param.type ? this.mapType(param.type) : new ast.CppType('auto');
      params.push(new ast.Parameter(paramName, paramType));
      
      // Track parameter type for smart pointer detection
      this.variableTypes.set(paramName, paramType);
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
  
  /**
   * Visit a generic arrow function (e.g., const reverseArray = <T>(arr: T[]): T[] => {...})
   * Generates a template function instead of a std::function variable
   */
  private visitGenericArrowFunction(name: string, node: ts.ArrowFunction): ast.Function {
    // Extract template parameters
    const templateParams: string[] = [];
    if (node.typeParameters) {
      for (const typeParam of node.typeParameters) {
        const paramName = typeParam.name.text;
        templateParams.push(paramName);
        this.templateParameters.add(paramName); // Track for type mapping
      }
    }
    
    // Extract function parameters
    const params: ast.Parameter[] = [];
    for (const param of node.parameters) {
      const paramName = cppUtils.escapeName(param.name.getText());
      const paramType = param.type ? this.mapType(param.type) : new ast.CppType('auto');
      params.push(new ast.Parameter(paramName, paramType));
    }
    
    // Get return type
    const returnType = node.type ? this.mapType(node.type) : new ast.CppType('auto');
    
    // Extract function body
    let body: ast.Block;
    if (ts.isBlock(node.body)) {
      body = this.visitBlock(node.body);
    } else {
      // Expression body: (x) => x * 2
      const expr = this.visitExpression(node.body);
      body = new ast.Block([new ast.ReturnStmt(expr)]);
    }
    
    // Clear template parameters after processing function
    if (node.typeParameters) {
      for (const typeParam of node.typeParameters) {
        this.templateParameters.delete(typeParam.name.text);
      }
    }
    
    // Create template function
    return new ast.Function(name, returnType, params, body, templateParams);
  }
  
  private visitTemplateLiteral(node: ts.TemplateExpression | ts.NoSubstitutionTemplateLiteral): ast.Expression {
    // Template literal: `Hello ${name}, you are ${age} years old`
    // Convert to: gs::String("Hello ") + gs::String(name) + gs::String(", you are ") + gs::String(std::to_string(age)) + gs::String(" years old")
    
    if (ts.isNoSubstitutionTemplateLiteral(node)) {
      // Simple template with no substitutions: `hello`
      const text = node.text;
      const escaped = cppUtils.escapeString(text);
      return cpp.call(cpp.id('gs::String'), [cpp.id(`"${escaped}"`)]);
    }
    
    // Template with substitutions
    const parts: ast.Expression[] = [];
    
    // Add head text
    if (node.head.text) {
      const escaped = cppUtils.escapeString(node.head.text);
      parts.push(cpp.call(cpp.id('gs::String'), [cpp.id(`"${escaped}"`)]));
    }
    
    // Add template spans (expression + text)
    for (const span of node.templateSpans) {
      const expr = this.visitExpression(span.expression);
      
      // Wrap expression in gs::String::from() to handle any type (String, numbers, etc.)
      const wrappedExpr = cpp.call(cpp.id('gs::String::from'), [expr]);
      parts.push(wrappedExpr);
      
      if (span.literal.text) {
        const escaped = cppUtils.escapeString(span.literal.text);
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
      methodName = cppUtils.escapeName(node.expression.name.text);
      objNode = node.expression.expression;
    }
    
    // Visit arguments and apply special handling
    const args = node.arguments.map((arg, index) => {
      let argExpr = this.visitExpression(arg);
      
      // Special handling for .push() on Array<share<T>>
      // If pushing to an array of shared_ptrs, wrap the argument
      if (methodName === 'push' && index === 0 && objNode && this.checker) {
        // Use OwnershipAwareTypeChecker to check if array has smart pointer elements
        const arrayHasSharedElements = this.ownershipChecker.hasSmartPointerElements(objNode);
        
        if (arrayHasSharedElements) {
          // Get the element type from the array type
          const arrayType = this.ownershipChecker.getTypeOfExpression(objNode);
          const elementType = arrayType?.elementType?.baseType;
          
          if (elementType) {
            // Check if the argument is already a smart pointer using OwnershipAwareTypeChecker
            const argOwnership = this.ownershipChecker.getTypeOfExpression(arg);
            const isAlreadyShared = argOwnership?.ownership === 'share';
            
            // Wrap in std::make_shared unless it's already a share<T>
            if (!isAlreadyShared) {
              argExpr = cpp.call(cpp.id(`std::make_shared<gs::${elementType}>`), [argExpr]);
            }
          }
        }
      }
      
      return argExpr;
    });
    
    // Handle property access: obj.method(args)
    if (ts.isPropertyAccessExpression(node.expression) && objNode && methodName) {
      // Special case: console.log, Math.max, JSON.stringify, String.fromCharCode, etc.
      if (ts.isIdentifier(objNode)) {
        const objName = objNode.text;
        if (objName === 'console' || objName === 'Math' || objName === 'Number' || objName === 'JSON' || objName === 'Date' || objName === 'String') {
          return cpp.call(cpp.id(`gs::${objName}::${methodName}`), args);
        }
        
        // Check if this is a static method call on a user-defined class
        // e.g., JsonValue.fromString(value)
        if (this.checker) {
          const symbol = this.checker.getSymbolAtLocation(objNode);
          if (symbol && symbol.flags & ts.SymbolFlags.Class) {
            // This is a class, so it's a static method call
            return cpp.call(cpp.id(`gs::${objName}::${methodName}`), args);
          }
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
      
      // If objExpr is a unary expression (like *arr[i]) and we're using ->, wrap in parens
      // Because *a->b is parsed as *(a->b), but we want (*a)->b
      let memberObj: ast.Expression = objExpr;
      if (objExpr instanceof ast.UnaryExpr && isPointer) {
        memberObj = cpp.paren(objExpr);
      }
      
      return cpp.call(cpp.member(memberObj, methodName, isPointer), args);
    }
    
    // Regular function call
    const func = this.visitExpression(node.expression);
    return cpp.call(func, args);
  }
  
  private visitPropertyAccess(node: ts.PropertyAccessExpression): ast.Expression {
    const prop = node.name.text;
    
    // Handle console, Math, Number, String as namespaces
    if (ts.isIdentifier(node.expression)) {
      const objName = node.expression.text;
      
      // Check if it's an enum access
      if (this.enumNames.has(objName)) {
        return cpp.id(`gs::${objName}::${cppUtils.escapeName(prop)}`);
      }
      
      if (objName === 'console' || objName === 'Math' || objName === 'Number' || objName === 'JSON' || objName === 'Date' || objName === 'String') {
        return cpp.id(`gs::${objName}::${prop}`);
      }
    }
    
    // Handle 'this' - use this->property in C++
    if (node.expression.kind === ts.SyntaxKind.ThisKeyword) {
      // Check if the field is a smart pointer type
      const fieldName = `this.${prop}`;
      const fieldType = this.variableTypes.get(fieldName);
      const isPointer = fieldType ? cppUtils.isSmartPointerType(fieldType) : false;
      
      // For consistency, wrap isPointer fields in another layer
      // this.input where input is share<String> → this->input (which is a shared_ptr)
      // So accessing properties on it needs another ->
      return cpp.member(cpp.id('this'), prop, true); // Always use -> for this
    }
    
    let obj = this.visitExpression(node.expression);
    
    // Special case: array.length and map.size should be method calls
    if (this.checker) {
      if (prop === 'length') {
        const objType = this.checker.getTypeAtLocation(node.expression);
        const objTypeStr = this.checker.typeToString(objType);
        // Check if this is an array type or string
        if (objTypeStr.endsWith('[]') || objTypeStr.startsWith('Array<') || 
            objTypeStr === 'string' || objTypeStr === 'String') {
          return cpp.call(cpp.member(obj, 'length'), []);
        }
        // Check if accessing .length on a this.field where field is a String smart pointer
        if (ts.isPropertyAccessExpression(node.expression) && 
            node.expression.expression.kind === ts.SyntaxKind.ThisKeyword) {
          const fieldName = `this.${node.expression.name.text}`;
          const fieldType = this.variableTypes.get(fieldName);
          if (fieldType && fieldType.toString().includes('gs::String')) {
            // Field is shared_ptr<gs::String>, use -> for member access
            return cpp.call(cpp.member(obj, 'length', true), []);
          }
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
    // BUT: if it's a share<T>[] array, we dereferenced to get the shared_ptr, so use ->
    // for smart pointer access, not raw pointer access
    const isArraySubscript = ts.isElementAccessExpression(node.expression);
    
    // Check if the object is a smart pointer type (needs -> instead of .)
    const isPointer = this.isSmartPointerAccess(node.expression) || 
                      (isArraySubscript && !this.isSmartPointerAccess(node.expression));
    
    // If object is a unary expression (like *arr[i]) and we're using ->, wrap in parens
    // Because *a->b is parsed as *(a->b), but we want (*a)->b
    if (obj instanceof ast.UnaryExpr && isPointer) {
      obj = cpp.paren(obj);
    }
    
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
        // BUT: If T is a smart pointer (shared_ptr, unique_ptr, weak_ptr), don't wrap in optional
        // because smart pointers can already be null
        // ALSO: If T is a user-defined class, it will be mapped to shared_ptr, so don't wrap
        const innerType = this.mapType(nonNullableTypes[0]);
        const innerTypeStr = innerType.toString();
        
        // Skip optional wrapping for smart pointers - they're already nullable
        // Check if the type STARTS with a smart pointer (not just contains one as a type argument)
        if (innerTypeStr.startsWith('std::shared_ptr<') || 
            innerTypeStr.startsWith('std::unique_ptr<') ||
            innerTypeStr.startsWith('std::weak_ptr<')) {
          return innerType;
        }
        
        // Also skip optional wrapping for user-defined classes
        // They're automatically wrapped in shared_ptr (see lines 1772-1779)
        if (this.checker && ts.isTypeReferenceNode(nonNullableTypes[0])) {
          const type = this.checker.getTypeAtLocation(nonNullableTypes[0]);
          const symbol = type.getSymbol();
          if (symbol && (symbol.flags & ts.SymbolFlags.Class)) {
            // It's a class, so mapType will return std::shared_ptr<gs::T>
            // Return it unwrapped (already nullable)
            return innerType;
          }
        }
        
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
    
    // User-defined types need gs:: prefix (unless they are template parameters)
    if (ts.isTypeReferenceNode(typeNode)) {
      // Don't add gs:: prefix to template parameters like T, K, V
      if (this.templateParameters.has(text)) {
        return new ast.CppType(text);
      }
      
      // If the type reference has NO type arguments (plain class name),
      // and it's a class, wrap in shared_ptr (default ownership)
      // BUT: don't do this if we're being called recursively from ownership type processing
      // We can detect this by checking if the parent is own<T>/share<T>/use<T>
      // ALSO: Don't wrap built-in value types (Array, Map, Set, String, etc.)
      const builtInValueTypes = ['Array', 'Map', 'Set', 'String', 'RegExp', 'Date', 'Promise'];
      const parent = typeNode.parent;
      const shouldAutoWrap = !typeNode.typeArguments && 
                             !builtInValueTypes.includes(text) &&  // Don't wrap value types
                             !(parent && ts.isTypeReferenceNode(parent) && 
                               ['own', 'share', 'use'].includes(parent.typeName.getText()));
      
      if (shouldAutoWrap && this.checker) {
        const type = this.checker.getTypeAtLocation(typeNode);
        const symbol = type.getSymbol();
        // Check if it's a class (not a primitive or built-in type)
        if (symbol && (symbol.flags & ts.SymbolFlags.Class)) {
          return new ast.CppType(`std::shared_ptr<gs::${text}>`);
        }
      }
      
      return new ast.CppType(`gs::${text}`);
    }
    
    return new ast.CppType(text);
  }
  
  /**
    return str
      .replace(/\\/g, '\\\\')  // Backslash must be first
      .replace(/"/g, '\\"')     // Double quotes
      .replace(/\n/g, '\\n')    // Newline
      .replace(/\r/g, '\\r')    // Carriage return
      .replace(/\t/g, '\\t');   // Tab
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
      const varName = cppUtils.escapeName(expr.text);
      const varType = this.variableTypes.get(varName);
      
      // If we have the type tracked, use it
      if (varType) {
        // Check if it's a direct smart pointer
        if (cppUtils.isSmartPointerType(varType)) {
          return true;
        }
        
        // Check if it's an unwrapped optional<smart_ptr<T>>
        if (this.unwrappedOptionals.has(varName)) {
          const typeStr = varType.toString();
          // Check if the optional contains a smart pointer
          if (typeStr.startsWith('std::optional<') && 
              (typeStr.includes('std::shared_ptr') || typeStr.includes('std::unique_ptr'))) {
            return true;
          }
        }
      }
      
      // For variables with auto type, check if the TypeScript type is a user-defined class
      // which becomes a smart pointer in C++
      if (this.checker && varType && varType.toString() === 'auto') {
        const tsType = this.checker.getTypeAtLocation(expr);
        const symbol = tsType.getSymbol();
        // Handle union types (e.g., JsonValue | null)
        if (!symbol && tsType.isUnion()) {
          const nonNullTypes = tsType.types.filter(t => {
            const flags = t.flags;
            return !(flags & ts.TypeFlags.Null) && !(flags & ts.TypeFlags.Undefined);
          });
          if (nonNullTypes.length > 0) {
            const nonNullSymbol = nonNullTypes[0].getSymbol();
            if (nonNullSymbol && (nonNullSymbol.flags & ts.SymbolFlags.Class)) {
              return true;
            }
          }
        } else if (symbol && (symbol.flags & ts.SymbolFlags.Class)) {
          return true;
        }
      }
      
      // Fallback: use ownership checker to infer type from AST
      if (this.unwrappedOptionals.has(varName)) {
        const ownershipType = this.ownershipChecker.getTypeOfExpression(expr);
        if (ownershipType?.isNullable && ownershipType.ownership) {
          return true;
        }
      }
    }
    
    // Check if it's 'this.property' access (class field)
    if (ts.isPropertyAccessExpression(expr)) {
      if (expr.expression.kind === ts.SyntaxKind.ThisKeyword) {
        const fieldName = `this.${expr.name.text}`;
        const fieldType = this.variableTypes.get(fieldName);
        if (fieldType) {
          return cppUtils.isSmartPointerType(fieldType);
        }
      }
    }
    
    // Check if it's an array subscript with share<T> elements
    // arr[i] where arr is Array<share<Person>> returns shared_ptr<Person>
    if (ts.isElementAccessExpression(expr)) {
      return this.ownershipChecker.hasSmartPointerElements(expr.expression);
    }
    
    // Check if it's a call expression that returns a smart pointer
    // e.g., bob.value() where bob is optional<shared_ptr<Person>>
    if (ts.isCallExpression(expr)) {
      return this.ownershipChecker.isSmartPointer(expr);
    }
    
    return false;
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
            
            // Check if field type is optional and value is nullptr - use std::nullopt
            const fieldTypeKey = `this.${fieldName}`;
            const fieldType = this.variableTypes.get(fieldTypeKey);
            if (fieldType && value instanceof ast.Identifier && value.name === 'nullptr') {
              const fieldTypeStr = fieldType.toString();
              if (fieldTypeStr.startsWith('std::optional<')) {
                value = cpp.id('std::nullopt');
              }
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
