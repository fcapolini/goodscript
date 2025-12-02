/**
 * AST-Based C++ Code Generator
 * 
 * Transforms TypeScript AST to C++ code with ownership semantics.
 */

import * as ts from 'typescript';
import * as ast from './ast';
import { render } from './renderer';
import { cpp } from './builder';
import * as tsUtils from './ts-utils';
import * as cppUtils from './cpp-utils';
import { OwnershipAwareTypeChecker } from './ownership-aware-type-checker';
import { optimize, OptimizationOptions } from './optimizer';

export class AstCodegen {
  private enumNames = new Set<string>(); // Track enum names for property access
  private currentFunctionReturnType?: ast.CppType; // Track current function return type for null handling
  private unwrappedOptionals = new Set<string>(); // Track variables known to be non-null in current scope
  private smartPointerNullChecks = new Set<string>(); // Track smart pointer variables checked against nullptr
  private variableTypes = new Map<string, ast.CppType>(); // Track variable types for smart pointer detection
  private optimizationOptions: OptimizationOptions; // Optimization options for C++ code generation
  private pointerVariables = new Set<string>(); // Track variables that are pointers (from Map.get(), etc.)
  private structuredBindingVariables = new Set<string>(); // Track variables from tuple destructuring (for-of with [key, value])
  private templateParameters = new Set<string>(); // Track template parameter names (T, K, V, etc.)
  private interfaceMethods = new Map<string, Set<string>>(); // Map interface name -> set of method names
  private interfaceNames = new Set<string>(); // Track interface/abstract class names
  private hoistedFunctions = new Set<string>(); // Track functions hoisted to namespace scope
  private ownershipChecker: OwnershipAwareTypeChecker;
  
  constructor(private checker?: ts.TypeChecker, optimizationOptions?: OptimizationOptions) {
    this.ownershipChecker = new OwnershipAwareTypeChecker(checker!);
    this.optimizationOptions = optimizationOptions || { level: 1 }; // Default: basic optimization
  }
  
  generate(sourceFile: ts.SourceFile): string {
    this.enumNames.clear(); // Reset for each file
    this.unwrappedOptionals.clear(); // Reset for each file
    this.variableTypes.clear(); // Reset for each file
    this.pointerVariables.clear(); // Reset for each file
    this.templateParameters.clear(); // Reset for each file
    this.interfaceMethods.clear(); // Reset for each file
    this.interfaceNames.clear(); // Reset for each file
    this.hoistedFunctions.clear(); // Reset for each file
    const includes = [new ast.Include('gs_runtime.hpp', false)];
    const declarations: ast.Declaration[] = [];
    const mainStatements: ast.Statement[] = [];
    
    // Separate declarations from top-level statements
    for (const stmt of sourceFile.statements) {
      if (ts.isVariableStatement(stmt)) {
        // Check if this is a generic arrow function (needs to be at namespace scope)
        if (stmt.declarationList.declarations.length === 1) {
          const decl = stmt.declarationList.declarations[0];
          if (decl.initializer && ts.isArrowFunction(decl.initializer)) {
            const arrowFunc = decl.initializer;
            
            // Hoist generic arrow functions
            if (arrowFunc.typeParameters && arrowFunc.typeParameters.length > 0) {
              const name = cppUtils.escapeName(decl.name.getText());
              const func = this.visitGenericArrowFunction(name, arrowFunc);
              declarations.push(func);
              this.hoistedFunctions.add(name);
              continue; // Skip adding to mainStatements
            }
            
            // Hoist non-closure arrow functions (don't capture external variables)
            if (!this.arrowFunctionUsesClosure(arrowFunc, sourceFile, decl.name.getText())) {
              const name = cppUtils.escapeName(decl.name.getText());
              const func = this.visitNonClosureArrowFunction(name, arrowFunc);
              declarations.push(func);
              this.hoistedFunctions.add(name);
              continue; // Skip adding to mainStatements
            }
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
    
    let tu = new ast.TranslationUnit(includes, [ns], mainFunction);
    
    // Apply optimizations before rendering
    tu = optimize(tu, this.optimizationOptions);
    
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
          let cppElementType = this.mapTypeScriptTypeToCpp(elementTypeStr);
          
          // If element type is an interface, we wrap it in shared_ptr
          // So the variable type should be the shared_ptr, not auto
          if (this.interfaceNames.has(elementTypeStr)) {
            cppType = new ast.CppType(`std::shared_ptr<gs::${elementTypeStr}>`);
          } else {
            cppType = new ast.CppType(cppElementType);
          }
        } else {
          cppType = new ast.CppType('auto');
        }
      } else if (decl.initializer && ts.isCallExpression(decl.initializer) && this.checker) {
        // Infer type from function call return type
        
        // Special case: map.keys(), map.values(), and set.values() return Array types
        if (ts.isPropertyAccessExpression(decl.initializer.expression)) {
          const methodName = decl.initializer.expression.name.text;
          if (methodName === 'keys' || methodName === 'values') {
            const objExpr = decl.initializer.expression.expression;
            const objType = this.checker.getTypeAtLocation(objExpr);
            const objTypeStr = this.checker.typeToString(objType);
            
            // Match Map<K, V> type
            const mapMatch = objTypeStr.match(/Map<([^,]+),\s*(.+)>/);
            if (mapMatch) {
              const keyType = mapMatch[1].trim();
              const valueType = mapMatch[2].trim();
              const elementType = methodName === 'keys' ? keyType : valueType;
              const cppElementType = this.mapTypeScriptTypeToCpp(elementType);
              cppType = new ast.CppType(`gs::Array<${cppElementType}>`);
            } else {
              // Match Set<T> type
              const setMatch = objTypeStr.match(/Set<(.+)>/);
              if (setMatch && methodName === 'values') {
                const valueType = setMatch[1].trim();
                const cppElementType = this.mapTypeScriptTypeToCpp(valueType);
                cppType = new ast.CppType(`gs::Array<${cppElementType}>`);
              } else {
                cppType = new ast.CppType('auto');
              }
            }
          } else {
            // Check if the call returns a nullable interface (Interface | null)
            const returnType = this.checker.getTypeAtLocation(decl.initializer);
            const returnTypeStr = this.checker.typeToString(returnType);
            
            // Check for union type with null
            if (returnTypeStr.includes(' | null')) {
              // Extract the non-null type
              const baseType = returnTypeStr.replace(' | null', '').trim();
              // Check if it's an interface
              if (this.interfaceNames.has(baseType)) {
                // Map to shared_ptr<Interface> (which can be null)
                cppType = new ast.CppType(`std::shared_ptr<gs::${baseType}>`);
              } else {
                cppType = new ast.CppType('auto');
              }
            } else {
              cppType = new ast.CppType('auto');
            }
          }
        } else {
          // Check if the call returns a nullable interface (Interface | null)
          const returnType = this.checker.getTypeAtLocation(decl.initializer);
          const returnTypeStr = this.checker.typeToString(returnType);
          
          // Check for union type with null
          if (returnTypeStr.includes(' | null')) {
            // Extract the non-null type
            const baseType = returnTypeStr.replace(' | null', '').trim();
            // Check if it's an interface
            if (this.interfaceNames.has(baseType)) {
              // Map to shared_ptr<Interface> (which can be null)
              cppType = new ast.CppType(`std::shared_ptr<gs::${baseType}>`);
            } else {
              cppType = new ast.CppType('auto');
            }
          } else {
            cppType = new ast.CppType('auto');
          }
        }
      } else if (decl.initializer && ts.isObjectLiteralExpression(decl.initializer)) {
        // Object literal expression → gs::LiteralObject
        cppType = new ast.CppType('gs::LiteralObject');
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
        // Check if any parameter types are interfaces or arrays and add appropriate references
        const paramTypeStrs = paramTypes.map((t, idx) => {
          const param = arrowFunc.parameters[idx];
          const paramName = param.name.getText();
          const isInterface = param.type && ts.isTypeReferenceNode(param.type) && 
                              this.interfaceNames.has(cppUtils.escapeName(param.type.typeName.getText()));
          const isArray = param.type && ts.isArrayTypeNode(param.type);
          
          if (isInterface || (isArray && !this.doesLambdaModifyParameter(arrowFunc, paramName))) {
            // Pass by const reference (read-only)
            return `const ${t.toString()}&`;
          } else if (isArray) {
            // Pass by mutable reference (modified in lambda)
            return `${t.toString()}&`;
          } else {
            // Pass by value
            return t.toString();
          }
        });
        const paramTypeStr = paramTypeStrs.join(', ');
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
        // This handles both empty arrays and arrays with explicit interface types
        if (ts.isArrayLiteralExpression(decl.initializer) && decl.type) {
          const varTypeStr = decl.type.getText();
          // Extract element type from "number[]" or "Array<number>"
          let elementType: string | undefined;
          let tsElementType: string | undefined;
          
          if (varTypeStr.endsWith('[]')) {
            tsElementType = varTypeStr.slice(0, -2);
            elementType = this.mapTypeScriptTypeToCpp(tsElementType);
          } else {
            const match = varTypeStr.match(/Array<(.+)>/);
            if (match) {
              tsElementType = match[1];
              elementType = this.mapTypeScriptTypeToCpp(tsElementType);
            }
          }
          
          // If element type is an interface, wrap elements in shared_ptr
          if (tsElementType && this.interfaceNames.has(tsElementType)) {
            // Process array elements - wrap new expressions in shared_ptr
            const elements = decl.initializer.elements.map(el => {
              let expr = this.visitExpression(el);
              // If element is a new expression, it already creates a shared_ptr
              // Otherwise, wrap it
              if (!ts.isNewExpression(el)) {
                expr = cpp.call(cpp.id(`std::make_shared<gs::${tsElementType}>`), [expr]);
              }
              return expr;
            });
            
            const arrayElementType = `std::shared_ptr<gs::${tsElementType}>`;
            init = cpp.call(cpp.id(`gs::Array<${arrayElementType}>`), [cpp.initList(elements)]);
          } else if (elementType) {
            // Non-interface type with explicit annotation
            if (decl.initializer.elements.length === 0) {
              init = cpp.call(cpp.id(`gs::Array<${elementType}>`), [cpp.initList([])]);
            } else {
              init = this.visitExpression(decl.initializer);
            }
          } else {
            init = this.visitExpression(decl.initializer);
          }
        } else {
          init = this.visitExpression(decl.initializer);
          
          // Fix: If using auto and initializer is numeric literal 0, make it 0.0
          // This prevents auto from inferring int when we need double
          if (cppType.toString() === 'auto' && 
              ts.isNumericLiteral(decl.initializer) && 
              decl.initializer.text === '0') {
            init = cpp.id('0.0');
          }
          
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
        // RegExp literal
        if (decl.initializer.kind === ts.SyntaxKind.RegularExpressionLiteral) {
          cppType = new ast.CppType('gs::RegExp');
        }
        // Array methods that return the same array type
        else if (ts.isCallExpression(decl.initializer) && 
            ts.isPropertyAccessExpression(decl.initializer.expression)) {
          const methodName = decl.initializer.expression.name.text;
          const objExpr = decl.initializer.expression.expression;
          
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
            // Map type arguments (e.g., Container<string> → Container<gs::String>)
            baseClass = this.mapHeritageType(clause.types[0]);
          }
        } else if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
          // implements - multiple interfaces (treated as base classes in C++)
          for (const type of clause.types) {
            baseClasses.push(this.mapHeritageType(type));
          }
        }
      }
    }
    
    // Collect fields
    for (const member of node.members) {
      if (ts.isPropertyDeclaration(member)) {
        const fieldName = cppUtils.escapeName(member.name.getText());
        let fieldType = member.type ? this.mapType(member.type) : new ast.CppType('auto');
        
        // Check if field is optional (has questionToken: field?: Type)
        const isOptional = member.questionToken !== undefined;
        if (isOptional) {
          // Wrap type in std::optional<T>
          const innerType = fieldType.toString();
          fieldType = new ast.CppType(`std::optional<${innerType}>`);
        }
        
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
          // Track parameter types for length() detection
          this.variableTypes.set(paramName, paramType);
        }
        
        const body = member.body ? this.visitBlock(member.body) : new ast.Block([]);
        
        // Clear parameter types after processing method body
        for (const param of member.parameters) {
          const paramName = cppUtils.escapeName(param.name.getText());
          this.variableTypes.delete(paramName);
        }
        
        // Restore previous return type
        this.currentFunctionReturnType = previousReturnType;
        
        // Check if method should be const (doesn't modify 'this') and if it's static
        // Static methods cannot be const in C++
        const isStatic = member.modifiers?.some(mod => mod.kind === ts.SyntaxKind.StaticKeyword) ?? false;
        
        // Check if method overrides an interface method
        // Only mark as virtual/override if method actually exists in one of the implemented interfaces
        const interfaceMethodNames = this.getInterfaceMethodNames(baseClasses);
        const isVirtual = interfaceMethodNames.has(methodName);
        const isOverride = interfaceMethodNames.has(methodName);
        
        // If overriding an interface method, use const=true to match interface signature
        // Otherwise, check if method mutates this
        const isConst = isOverride ? true : (!isStatic && tsUtils.shouldMethodBeConst(member));
        
        methods.push(new ast.Method(methodName, returnType, params, body, ast.AccessSpecifier.Public, isConst, isStatic, isVirtual, false, isOverride, false));
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
    const methods: ast.Method[] = [];
    const methodNames = new Set<string>(); // Track method names for this interface
    
    // Convert interface properties to fields (rare, but possible)
    for (const member of node.members) {
      if (ts.isPropertySignature(member) && member.name) {
        const fieldName = cppUtils.escapeName(member.name.getText());
        const fieldType = member.type ? this.mapType(member.type) : new ast.CppType('auto');
        fields.push(new ast.Field(fieldName, fieldType));
      }
    }
    
    // Convert interface method signatures to pure virtual methods
    for (const member of node.members) {
      if (ts.isMethodSignature(member) && member.name) {
        const methodName = cppUtils.escapeName(member.name.getText());
        methodNames.add(methodName); // Cache method name
        const returnType = member.type ? this.mapType(member.type) : new ast.CppType('void');
        
        const params: ast.Parameter[] = [];
        if (member.parameters) {
          for (const param of member.parameters) {
            const paramName = cppUtils.escapeName(param.name.getText());
            const paramType = param.type ? this.mapType(param.type) : new ast.CppType('auto');
            const passByConstRef = tsUtils.shouldPassByConstRef(param.type);
            const passByMutableRef = tsUtils.shouldPassByMutableRef(param.type);
            params.push(new ast.Parameter(paramName, paramType, undefined, passByConstRef, passByMutableRef));
          }
        }
        
        // Pure virtual method - no body, marked as virtual and pure virtual
        // Interface methods are const by default (they're typically accessors/getters)
        const emptyBody = new ast.Block([]);
        methods.push(new ast.Method(
          methodName, 
          returnType, 
          params, 
          emptyBody, 
          ast.AccessSpecifier.Public, 
          true,  // isConst - interface methods are const by default
          false, // isStatic
          true,  // isVirtual
          true,  // isPureVirtual
          false, // isOverride
          false  // isDefault
        ));
      }
    }
    
    // Cache interface method names for later use by implementing classes
    this.interfaceMethods.set(name, methodNames);
    
    // Track this as an interface name
    this.interfaceNames.add(name);
    
    // Add virtual destructor
    const destructorBody = new ast.Block([]);
    methods.push(new ast.Method(
      `~${name}`,
      new ast.CppType(''),
      [],
      destructorBody,
      ast.AccessSpecifier.Public,
      false, // isConst
      false, // isStatic
      true,  // isVirtual
      false, // isPureVirtual (= default, not = 0)
      false, // isOverride
      true   // isDefault (generates = default)
    ));
    
    // Interfaces become abstract base classes (not structs)
    return new ast.Class(name, fields, [], methods, undefined, [], false);
  }
  
  private getInterfaceMethodNames(interfaceNames: string[]): Set<string> {
    const methodNames = new Set<string>();
    
    // Lookup cached method names for each interface
    for (const interfaceName of interfaceNames) {
      const methods = this.interfaceMethods.get(interfaceName);
      if (methods) {
        methods.forEach(m => methodNames.add(m));
      }
    }
    
    return methodNames;
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
    
    if (ts.isEmptyStatement(node)) {
      // Empty statement (;) - emit nothing, just return empty block
      return new ast.Block([]);
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
    // for (const [key, value] of map) → for (const auto& [key, value] : map)
    
    let varName = 'item';
    let isConst = false;
    
    if (ts.isVariableDeclarationList(node.initializer)) {
      const decl = node.initializer.declarations[0];
      isConst = (node.initializer.flags & ts.NodeFlags.Const) !== 0;
      
      // Check for array binding pattern (destructuring)
      if (ts.isArrayBindingPattern(decl.name)) {
        // for (const [key, value] of map)
        // Extract element names
        const elements = decl.name.elements
          .filter(e => !ts.isOmittedExpression(e))
          .map(e => {
            if (ts.isBindingElement(e) && ts.isIdentifier(e.name)) {
              const name = cppUtils.escapeName(e.name.text);
              // Track structured binding variables - they are references, not pointers
              this.structuredBindingVariables.add(name);
              return name;
            }
            return 'item';
          });
        
        // Create structured binding: [key, value]
        varName = `[${elements.join(', ')}]`;
      } else {
        varName = cppUtils.escapeName(decl.name.getText());
      }
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
      
      // If this is a hoisted function, qualify with gs::
      if (this.hoistedFunctions.has(escapedName)) {
        return cpp.id(`gs::${escapedName}`);
      }
      
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
      
      // Check if object expression type is a tuple and index is numeric
      if (this.checker && ts.isNumericLiteral(node.argumentExpression!)) {
        const objType = this.checker.getTypeAtLocation(node.expression);
        const objTypeStr = this.checker.typeToString(objType);
        
        // Detect tuple type: [string, number] or [T, U, V, ...]
        if (objTypeStr.startsWith('[') && objTypeStr.endsWith(']') && !objTypeStr.endsWith('[]')) {
          const indexValue = parseInt(node.argumentExpression!.getText(), 10);
          
          // Check if obj is an array subscript result (which returns a pointer)
          // The array subscript handler already dereferenced it (*arr[i])
          // So we just need to parenthesize it, not add another dereference
          const isArraySubscript = ts.isElementAccessExpression(node.expression);
          if (isArraySubscript) {
            // obj is already (*arr[i]), just parenthesize for member access
            obj = cpp.paren(obj);
          }
          
          // For 2-element tuples (std::pair), use .first and .second
          if (objTypeStr.split(',').length === 2) {
            if (indexValue === 0) {
              return cpp.member(obj, 'first');
            } else if (indexValue === 1) {
              return cpp.member(obj, 'second');
            }
          } else {
            // For 3+ element tuples, use std::get<N>()
            return cpp.call(cpp.id(`std::get<${indexValue}>`), [obj]);
          }
        }
      }
      
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
      // Also checks if element type is an interface (which we wrap in shared_ptr)
      const hasSmartPtrElements = this.ownershipChecker.hasSmartPointerElements(node.expression, this.interfaceNames);
      
      // For shared_ptr elements, always dereference once to get the shared_ptr
      // operator[] returns shared_ptr<T>*, we want shared_ptr<T>
      // Then property access will use -> on the shared_ptr to access T's members
      if (hasSmartPtrElements) {
        return cpp.unary('*', subscript);
      }
      
      // For non-smart-pointer arrays, gs::Array<T>::operator[] returns T*
      // Check if this subscript is part of a property/method access chain
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
    
    if (ts.isObjectLiteralExpression(node)) {
      // Object literal: { key: value, ... } → gs::LiteralObject
      const properties: [ast.Expression, ast.Expression][] = [];
      
      for (const prop of node.properties) {
        if (ts.isPropertyAssignment(prop)) {
          // Regular property: key: value
          const keyStr = prop.name.getText();
          const key = cpp.literal(keyStr);
          const value = this.visitExpression(prop.initializer);
          // Wrap value in gs::Property
          const propertyValue = cpp.call(cpp.id('gs::Property'), [value]);
          properties.push([key, propertyValue]);
        } else if (ts.isShorthandPropertyAssignment(prop)) {
          // Shorthand property: { x } → { "x": x }
          const keyStr = prop.name.getText();
          const key = cpp.literal(keyStr);
          const value = this.visitExpression(prop.name);
          // Wrap value in gs::Property
          const propertyValue = cpp.call(cpp.id('gs::Property'), [value]);
          properties.push([key, propertyValue]);
        }
        // Note: Method declarations, getters, setters not supported yet
      }
      
      // Generate gs::LiteralObject{ {"key1", Property(val1)}, {"key2", Property(val2)}, ... }
      if (properties.length === 0) {
        // Empty object literal → gs::LiteralObject{}
        return cpp.id('gs::LiteralObject{}');
      }
      
      // Create nested initializer list for each property
      const propInits = properties.map(([key, value]) => 
        cpp.initList([key, value])
      );
      
      return cpp.call(cpp.id('gs::LiteralObject'), [cpp.initList(propInits)]);
    }
    
    if (ts.isArrayLiteralExpression(node)) {
      const elements = node.elements.map(el => this.visitExpression(el));
      
      // Check if this is a tuple literal based on context
      if (this.checker) {
        const type = this.checker.getTypeAtLocation(node);
        const typeStr = this.checker.typeToString(type);
        
        // Detect tuple type: [string, number] or [T, U, V, ...]
        // TypeChecker represents tuples as "[string, number]" in typeToString
        if (typeStr.startsWith('[') && typeStr.endsWith(']') && !typeStr.endsWith('[]')) {
          // It's a tuple!
          if (elements.length === 2) {
            // Use std::make_pair for 2-element tuples
            return cpp.call(cpp.id('std::make_pair'), elements);
          } else {
            // Use std::make_tuple for other sizes
            return cpp.call(cpp.id('std::make_tuple'), elements);
          }
        }
      }
      
      // Not a tuple - handle as regular array
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
    // Special case: arr[idx] = value → IIFE with resize for out-of-bounds writes
    if (node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isElementAccessExpression(node.left)) {
      const arrayExpr = node.left.expression;
      const indexExpr = node.left.argumentExpression;
      const valueExpr = node.right;
      
      if (indexExpr) {
        // Generate IIFE: [&]() { auto __arr = &arr; auto __idx = idx; if (__idx >= __arr->size()) __arr->resize(__idx + 1); return (*__arr)[__idx] = value; }()
        const arr = this.visitExpression(arrayExpr);
        const idx = this.visitExpression(indexExpr);
        const value = this.visitExpression(valueExpr);
        
        // Create lambda body statements
        const statements: ast.Statement[] = [
          // auto __arr = &arr;
          new ast.VariableDecl(
            '__arr',
            new ast.CppType('auto'),
            cpp.unary('&', arr)
          ),
          // auto __idx = static_cast<size_t>(idx);
          new ast.VariableDecl(
            '__idx',
            new ast.CppType('auto'),
            cpp.cast(new ast.CppType('size_t'), idx)
          ),
          // if (__idx >= __arr->size()) __arr->resize(__idx + 1);
          new ast.IfStmt(
            cpp.binary(
              cpp.id('__idx'),
              '>=',
              cpp.call(cpp.member(cpp.id('__arr'), 'size', true), [])
            ),
            new ast.Block([
              new ast.ExpressionStmt(
                cpp.call(
                  cpp.member(cpp.id('__arr'), 'resize', true),
                  [cpp.binary(cpp.id('__idx'), '+', cpp.literal(1))]
                )
              )
            ])
          ),
          // return *(*__arr)[__idx] = value;
          new ast.ReturnStmt(
            cpp.binary(
              cpp.unary('*', cpp.subscript(cpp.paren(cpp.unary('*', cpp.id('__arr'))), cpp.id('__idx'))),
              '=',
              value
            )
          )
        ];
        
        // Create lambda and immediately invoke it
        const lambda = new ast.Lambda(
          [], // no params
          new ast.Block(statements),
          undefined, // no explicit return type
          '[&]' // capture by reference
        );
        
        return cpp.call(lambda, []);
      }
    }
    
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
    
    // Dereference pointer variables when used in arithmetic/comparison (except null checks)
    // This handles Map.get() results: `current + 1` → `*current + 1`
    // BUT: Don't dereference structured binding variables (they're already references)
    // AND: Don't dereference if already unwrapped (unwrappedOptionals logic already dereferenced)
    const isArithmeticOp = ['+', '-', '*', '/', '%', '<', '>', '<=', '>='].includes(op);
    if (isArithmeticOp) {
      // Dereference left if it's a pointer variable (but not already dereferenced or structured binding)
      if (ts.isIdentifier(node.left)) {
        const varName = cppUtils.escapeName(node.left.text);
        const alreadyDereferenced = this.unwrappedOptionals.has(varName) && this.pointerVariables.has(varName);
        if (this.pointerVariables.has(varName) && 
            !this.structuredBindingVariables.has(varName) &&
            !alreadyDereferenced) {
          left = cpp.unary('*', left);
        }
      }
      // Dereference right if it's a pointer variable (but not already dereferenced or structured binding)
      if (ts.isIdentifier(node.right)) {
        const varName = cppUtils.escapeName(node.right.text);
        const alreadyDereferenced = this.unwrappedOptionals.has(varName) && this.pointerVariables.has(varName);
        if (this.pointerVariables.has(varName) && 
            !this.structuredBindingVariables.has(varName) &&
            !alreadyDereferenced) {
          right = cpp.unary('*', right);
        }
      }
    }
    
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
        
        // Handle tuple types: [string, number] → std::pair<gs::String, double>
        // TypeChecker represents tuples as "[T, U, V, ...]" in typeToString
        if (tsType.startsWith('[') && tsType.endsWith(']') && !tsType.endsWith('[]')) {
          const inner = tsType.slice(1, -1).trim();
          const types = inner.split(',').map(t => this.mapTypeScriptTypeToCpp(t.trim()));
          
          if (types.length === 2) {
            return `std::pair<${types[0]}, ${types[1]}>`;
          } else {
            return `std::tuple<${types.join(', ')}>`;
          }
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
      
      // Check if parameter type is an interface - interfaces must be passed by const reference
      const isInterface = param.type && ts.isTypeReferenceNode(param.type) && 
                          this.interfaceNames.has(cppUtils.escapeName(param.type.typeName.getText()));
      
      // For arrays in lambdas: pass by const reference if not modified, mutable reference if modified
      const isArray = param.type && ts.isArrayTypeNode(param.type);
      let passByConstRef = isInterface || tsUtils.shouldPassByConstRef(param.type);
      let passByMutableRef = false;
      
      if (isArray && !this.doesLambdaModifyParameter(node, paramName)) {
        // Array is not modified - pass by const reference to avoid expensive copy
        passByConstRef = true;
      } else if (isArray) {
        // Array is modified - pass by mutable reference
        passByMutableRef = true;
      }
      
      params.push(new ast.Parameter(paramName, paramType, undefined, passByConstRef, passByMutableRef));
      
      // Track parameter type for smart pointer detection
      this.variableTypes.set(paramName, paramType);
      
      // Register parameter with ownership checker for type lookups
      this.ownershipChecker.registerVariable(paramName, param);
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
        const arrayHasSharedElements = this.ownershipChecker.hasSmartPointerElements(objNode, this.interfaceNames);
        
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
      
      // Special handling for .reduce() initial value
      // If the initial value is a numeric literal (like 0) but the lambda expects double,
      // ensure we emit 0.0 not 0 for correct C++ template deduction
      if (methodName === 'reduce' && index === 1 && ts.isNumericLiteral(arg) && this.checker) {
        // Check if the first argument (lambda) has a number (double) accumulator
        const lambdaArg = node.arguments[0];
        if (ts.isArrowFunction(lambdaArg) || ts.isFunctionExpression(lambdaArg)) {
          const params = lambdaArg.parameters;
          if (params.length > 0) {
            const accParam = params[0];
            if (accParam.type) {
              const accTypeStr = accParam.type.getText();
              // If accumulator is 'number' (which maps to double in C++), ensure .0 suffix
              if (accTypeStr === 'number') {
                const numText = arg.text;
                // If it's an integer literal (no decimal point), add .0
                if (!numText.includes('.')) {
                  argExpr = cpp.id(numText + '.0');
                }
              }
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
        if (objName === 'console' || objName === 'Math' || objName === 'Number' || objName === 'JSON' || objName === 'Date' || objName === 'String' || objName === 'Array') {
          // Special case: Array.from(iterable) → just use the iterable directly
          // In GoodScript, map.keys() and map.values() return arrays directly
          // but in JavaScript they return iterators, so we need Array.from()
          // In C++, we just use the value directly since it's already an array
          if (objName === 'Array' && methodName === 'from') {
            return args[0];
          }
          
          // For console.log specifically, dereference pointers from Map.get() calls
          const processedArgs = (objName === 'console' && methodName === 'log') ? 
            args.map((arg, index) => {
              const argNode = node.arguments[index];
              // If argument is map.get() which returns V*, dereference it
              if (tsUtils.isMapGetCall(argNode)) {
                return cpp.unary('*', arg);
              }
              return arg;
            }) : args;
          
          return cpp.call(cpp.id(`gs::${objName}::${methodName}`), processedArgs);
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
    
    // For interface parameters, automatically dereference smart pointers
    // If function expects const InterfaceName& and we're passing shared_ptr<ConcreteClass>,
    // we need to dereference: func(*arg) instead of func(arg)
    const processedArgs = args.map((arg, index) => {
      const argNode = node.arguments[index];
      
      // Check if argument is an identifier (variable)
      if (ts.isIdentifier(argNode)) {
        const varName = cppUtils.escapeName(argNode.text);
        const varType = this.variableTypes.get(varName);
        
        // Check if it's a shared_ptr to a class that might implement an interface
        if (varType && varType.toString().startsWith('std::shared_ptr<gs::')) {
          // Extract the class name from std::shared_ptr<gs::ClassName>
          const match = varType.toString().match(/std::shared_ptr<gs::(.+)>/);
          if (match) {
            // Dereference the smart pointer to get the object reference
            return cpp.unary('*', arg);
          }
        }
      }
      
      // Check if argument is an element access (arr[i]) that returns a smart pointer
      if (ts.isElementAccessExpression(argNode)) {
        // Check if the array has smart pointer elements (interface or ownership types)
        if (this.ownershipChecker.hasSmartPointerElements(argNode.expression, this.interfaceNames)) {
          // visitExpression already dereferenced once to get the shared_ptr
          // Now we need to dereference again to pass the object reference
          return cpp.unary('*', arg);
        }
      }
      
      return arg;
    });
    
    return cpp.call(func, processedArgs);
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
      
      // Check if this is property access on a LiteralObject
      const varType = this.variableTypes.get(objName);
      if (varType && varType.toString().includes('gs::LiteralObject')) {
        // person.name → person.get(gs::String("name"))->value()
        // get() returns Property*, ->value() extracts the variant value
        const obj = cpp.id(objName);
        const getCall = cpp.call(
          cpp.member(obj, 'get'),
          [cpp.call(cpp.id('gs::String'), [cpp.literal(prop)])]
        );
        // Call ->value() on the Property* to get variant value
        return cpp.call(cpp.member(getCall, 'value', true), []);
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
    if (prop === 'length') {
      // Check if accessing .length on a this.field or parameter
      if (ts.isPropertyAccessExpression(node.expression) && 
          node.expression.expression.kind === ts.SyntaxKind.ThisKeyword) {
        const fieldName = `this.${node.expression.name.text}`;
        const fieldType = this.variableTypes.get(fieldName);
        if (fieldType) {
          const typeStr = fieldType.toString();
          // Check for array types - arrays themselves are values, use .
          if (typeStr.includes('gs::Array<') || typeStr.includes('std::vector<')) {
            return cpp.call(cpp.member(obj, 'length', false), []);
          }
          // Check for string types - could be value or smart pointer
          if (typeStr.includes('gs::String')) {
            const isSmartPtrToString = typeStr.includes('std::shared_ptr<gs::String>') || 
                                     typeStr.includes('std::unique_ptr<gs::String>') ||
                                     typeStr.includes('std::weak_ptr<gs::String>');
            return cpp.call(cpp.member(obj, 'length', isSmartPtrToString), []);
          }
        }
      }
      // Check for identifier (local variable or parameter)
      if (ts.isIdentifier(node.expression)) {
        const varName = node.expression.text;
        const varType = this.variableTypes.get(varName);
        if (varType) {
          const typeStr = varType.toString();
          if (typeStr.includes('gs::Array<') || typeStr.includes('std::vector<')) {
            return cpp.call(cpp.member(obj, 'length'), []);
          }
          if (typeStr.includes('gs::String')) {
            return cpp.call(cpp.member(obj, 'length'), []);
          }
        }
      }
      // Fall back to type checker
      if (this.checker) {
        const objType = this.checker.getTypeAtLocation(node.expression);
        const objTypeStr = this.checker.typeToString(objType);
        // Check if this is an array type or string
        if (objTypeStr.endsWith('[]') || objTypeStr.startsWith('Array<') || 
            objTypeStr === 'string' || objTypeStr === 'String') {
          return cpp.call(cpp.member(obj, 'length'), []);
        }
      }
    }
    if (prop === 'size') {
      if (this.checker) {
        const objType = this.checker.getTypeAtLocation(node.expression);
        const objTypeStr = this.checker.typeToString(objType);
        // Check if this is a Map or Set type
        if (objTypeStr.startsWith('Map<') || objTypeStr.startsWith('Set<')) {
          return cpp.call(cpp.member(obj, 'size'), []);
        }
      }
    }
    
    // Special case: RegExp properties (global, ignoreCase, multiline) are methods in C++
    if (prop === 'global' || prop === 'ignoreCase' || prop === 'multiline') {
      // Check if it's a RegExp type
      if (ts.isIdentifier(node.expression)) {
        const varName = node.expression.text;
        const varType = this.variableTypes.get(varName);
        if (varType && varType.toString().includes('gs::RegExp')) {
          return cpp.call(cpp.member(obj, prop), []);
        }
      }
      // Check with type checker as fallback
      if (this.checker) {
        const objType = this.checker.getTypeAtLocation(node.expression);
        const objTypeStr = this.checker.typeToString(objType);
        if (objTypeStr === 'RegExp' || objTypeStr.includes('RegExp')) {
          return cpp.call(cpp.member(obj, prop), []);
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
  
  /**
   * Map a heritage clause expression to C++ type, handling template arguments.
   * Example: Container<string> → Container<gs::String>
   */
  private mapHeritageType(expr: ts.ExpressionWithTypeArguments): string {
    const baseName = cppUtils.escapeName(expr.expression.getText());
    
    if (expr.typeArguments && expr.typeArguments.length > 0) {
      // Has template arguments - map each one
      const mappedArgs = expr.typeArguments.map(arg => this.mapType(arg).toString());
      return `${baseName}<${mappedArgs.join(', ')}>`;
    }
    
    // No template arguments
    return baseName;
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
        
        // Also skip optional wrapping for user-defined classes and interfaces
        // They're automatically wrapped in shared_ptr (see lines 1772-1779)
        // Interfaces also need shared_ptr wrapping for polymorphism
        if (this.checker && ts.isTypeReferenceNode(nonNullableTypes[0])) {
          const typeName = cppUtils.escapeName(nonNullableTypes[0].typeName.getText());
          
          // Check if it's an interface
          if (this.interfaceNames.has(typeName)) {
            // Interface: return std::shared_ptr<gs::InterfaceName> (already nullable)
            return new ast.CppType(`std::shared_ptr<gs::${typeName}>`);
          }
          
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
    
    // Tuple types: [string, number] → std::pair<gs::String, double>
    // Or [T, U, V] → std::tuple<T, U, V> for 3+ elements
    if (ts.isTupleTypeNode(typeNode)) {
      const elementTypes = typeNode.elements.map(el => {
        // Named tuple elements have type member
        const elemType = (el as any).type || el;
        return this.mapType(elemType).toString();
      });
      
      if (elementTypes.length === 2) {
        // Use std::pair for 2-element tuples
        return new ast.CppType(`std::pair<${elementTypes[0]}, ${elementTypes[1]}>`);
      } else {
        // Use std::tuple for other sizes
        return new ast.CppType(`std::tuple<${elementTypes.join(', ')}>`);
      }
    }
    
    // Array types: number[] → gs::Array<double>
    // If element type is an interface, wrap in shared_ptr
    if (ts.isArrayTypeNode(typeNode)) {
      const elementType = this.mapType(typeNode.elementType);
      const elementTypeStr = elementType.toString();
      
      // Check if element type is an interface (need to use shared_ptr for polymorphism)
      const isInterface = ts.isTypeReferenceNode(typeNode.elementType) && 
                          this.interfaceNames.has(cppUtils.escapeName(typeNode.elementType.typeName.getText()));
      
      if (isInterface) {
        return new ast.CppType(`gs::Array<std::shared_ptr<${elementTypeStr}>>`);
      }
      
      return new ast.CppType(`gs::Array<${elementTypeStr}>`);
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
    // ALSO: arr[i] where arr is Shape[] (interface array) returns shared_ptr<Shape>
    if (ts.isElementAccessExpression(expr)) {
      if (this.ownershipChecker.hasSmartPointerElements(expr.expression, this.interfaceNames)) {
        return true;
      }
      
      // Check if array element type is an interface (which we wrap in shared_ptr)
      if (this.checker && ts.isIdentifier(expr.expression)) {
        const varType = this.variableTypes.get(cppUtils.escapeName(expr.expression.text));
        if (varType) {
          const varTypeStr = varType.toString();
          // Check if it's Array<shared_ptr<InterfaceName>>
          if (varTypeStr.startsWith('gs::Array<std::shared_ptr<')) {
            return true;
          }
        }
      }
      
      return false;
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
  
  /**
   * Check if a lambda function modifies a parameter (e.g., assigns to array elements)
   */
  private doesLambdaModifyParameter(node: ts.ArrowFunction, paramName: string): boolean {
    const checkNode = (n: ts.Node): boolean => {
      // Check for assignments to array elements: arr[i] = value
      if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        const left = n.left;
        // Check if left side is an element access on the parameter
        if (ts.isElementAccessExpression(left)) {
          const objName = left.expression.getText();
          if (objName === paramName) {
            return true; // Found assignment to parameter array element
          }
        }
      }
      
      // Recursively check children
      return ts.forEachChild(n, checkNode) || false;
    };
    
    return checkNode(node.body);
  }
  
  /**
   * Check if an arrow function uses any variables from the enclosing scope (closure)
   * Returns true if the function captures external variables, false otherwise
   */
  private arrowFunctionUsesClosure(node: ts.ArrowFunction, sourceFile: ts.SourceFile, functionName?: string): boolean {
    // Collect parameter names to exclude from closure check
    const paramNames = new Set<string>();
    for (const param of node.parameters) {
      paramNames.add(param.name.getText());
    }
    
    // Collect all top-level declarations in the source file
    const topLevelNames = new Set<string>();
    for (const stmt of sourceFile.statements) {
      if (ts.isFunctionDeclaration(stmt) && stmt.name) {
        topLevelNames.add(stmt.name.text);
      } else if (ts.isVariableStatement(stmt)) {
        for (const decl of stmt.declarationList.declarations) {
          topLevelNames.add(decl.name.getText());
        }
      } else if (ts.isClassDeclaration(stmt) && stmt.name) {
        topLevelNames.add(stmt.name.text);
      } else if (ts.isInterfaceDeclaration(stmt)) {
        topLevelNames.add(stmt.name.text);
      } else if (ts.isEnumDeclaration(stmt)) {
        topLevelNames.add(stmt.name.text);
      }
    }
    
    // Check if function body references any external variables
    const checkNode = (n: ts.Node): boolean => {
      // Skip parameter declarations
      if (node.parameters.some(p => p === n)) {
        return false;
      }
      
      // Check for identifier references
      if (ts.isIdentifier(n)) {
        const name = n.text;
        
        // Skip if it's a parameter
        if (paramNames.has(name)) {
          return false;
        }
        
        // Skip if it's a self-reference (recursive call)
        if (functionName && name === functionName) {
          return false;
        }
        
        // Skip built-in types and globals
        const builtIns = ['console', 'Date', 'Array', 'Map', 'Set', 'String', 'Number', 
                          'Math', 'JSON', 'Promise', 'undefined', 'null', 'true', 'false'];
        if (builtIns.includes(name)) {
          return false;
        }
        
        // If it references a top-level name, it's using closure
        // But only if it's a variable, not a class/interface/enum (those are types)
        const parent = n.parent;
        if (topLevelNames.has(name) && !ts.isTypeReferenceNode(parent)) {
          return true; // References another top-level variable - closure detected
        }
      }
      
      // Recursively check children
      return ts.forEachChild(n, checkNode) || false;
    };
    
    return checkNode(node.body);
  }
  
  /**
   * Visit a non-closure arrow function and convert to a regular function declaration
   * This avoids the overhead of std::function wrapper for functions that don't capture variables
   */
  private visitNonClosureArrowFunction(name: string, node: ts.ArrowFunction): ast.Function {
    // Extract function parameters
    const params: ast.Parameter[] = [];
    for (const param of node.parameters) {
      const paramName = cppUtils.escapeName(param.name.getText());
      const paramType = param.type ? this.mapType(param.type) : new ast.CppType('double');
      
      // Check if parameter should be passed by reference
      const isInterface = param.type && ts.isTypeReferenceNode(param.type) && 
                          this.interfaceNames.has(cppUtils.escapeName(param.type.typeName.getText()));
      const isArray = param.type && ts.isArrayTypeNode(param.type);
      let passByConstRef = isInterface || tsUtils.shouldPassByConstRef(param.type);
      let passByMutableRef = false;
      
      if (isArray && !this.doesLambdaModifyParameter(node, paramName)) {
        passByConstRef = true;
      } else if (isArray) {
        passByMutableRef = true;
      }
      
      params.push(new ast.Parameter(paramName, paramType, undefined, passByConstRef, passByMutableRef));
      
      // Track parameter type
      this.variableTypes.set(paramName, paramType);
      this.ownershipChecker.registerVariable(paramName, param);
    }
    
    // Get return type
    const returnType = node.type ? this.mapType(node.type) : 
                       (tsUtils.arrowFunctionHasReturnValue(node) ? new ast.CppType('double') : new ast.CppType('void'));
    
    // Convert body
    let body: ast.Block;
    if (ts.isBlock(node.body)) {
      body = this.visitBlock(node.body);
    } else {
      // Expression body: convert to return statement
      const expr = this.visitExpression(node.body);
      body = new ast.Block([new ast.ReturnStmt(expr)]);
    }
    
    return new ast.Function(name, returnType, params, body);
  }
}

// Export as CppCodegen for backward compatibility
export { AstCodegen as CppCodegen };
