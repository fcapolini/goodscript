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
import { TransformContext } from './transform-context';
import { CppTypeMapper } from './type-mapper';
import { TypeInferenceService } from './type-inference';
import { MainFunctionBuilder } from './main-builder';
import { ExpressionAnalyzer } from './expression-analyzer';
import { LambdaAnalyzer } from './lambda-analyzer';

export class AstCodegen {
  protected readonly ctx = new TransformContext();
  private optimizationOptions: OptimizationOptions;
  private ownershipChecker: OwnershipAwareTypeChecker;
  private typeMapper: CppTypeMapper;
  private typeInference: TypeInferenceService;
  private mainBuilder: MainFunctionBuilder;
  
  constructor(private checker?: ts.TypeChecker, optimizationOptions?: OptimizationOptions) {
    this.ownershipChecker = new OwnershipAwareTypeChecker(checker!);
    this.optimizationOptions = optimizationOptions || { level: 1 }; // Default: basic optimization
    this.typeMapper = new CppTypeMapper(checker, this.ctx.interfaceNames, this.ctx.templateParameters);
    this.typeInference = new TypeInferenceService({
      checker,
      ownershipChecker: this.ownershipChecker,
      typeMapper: this.typeMapper,
      interfaceNames: this.ctx.interfaceNames
    });
    this.mainBuilder = new MainFunctionBuilder();
  }
  
  generate(sourceFile: ts.SourceFile): string {
    this.ctx.reset(); // Reset context for each file
    
    // FIRST PASS: Collect all top-level declarations (classes, functions, etc.)
    // This allows forward references to work correctly
    for (const stmt of sourceFile.statements) {
      if (ts.isClassDeclaration(stmt) && stmt.name) {
        this.ctx.hoistedClasses.add(cppUtils.escapeName(stmt.name.text));
      }
      if (ts.isFunctionDeclaration(stmt) && stmt.name) {
        this.ctx.hoistedFunctions.add(cppUtils.escapeName(stmt.name.text));
      }
      // Collect module-level const variables (only true compile-time constants, not object instances)
      if (ts.isVariableStatement(stmt)) {
        const declList = stmt.declarationList;
        if (declList.flags & ts.NodeFlags.Const) {
          for (const decl of declList.declarations) {
            if (ts.isIdentifier(decl.name) && decl.initializer) {
              // Only hoist primitive literals and simple string literals
              // Do NOT hoist new expressions, array literals, object literals, etc.
              // These should stay in main() because they might reference types that aren't declared yet
              const isHoistable = (
                ts.isNumericLiteral(decl.initializer) ||
                ts.isStringLiteral(decl.initializer) ||
                decl.initializer.kind === ts.SyntaxKind.TrueKeyword ||
                decl.initializer.kind === ts.SyntaxKind.FalseKeyword ||
                decl.initializer.kind === ts.SyntaxKind.NullKeyword
              );
              
              if (!isHoistable) {
                continue; // Don't hoist this constant
              }
              
              const name = cppUtils.escapeName(decl.name.text);
              const type = decl.type ? this.mapType(decl.type) : new ast.CppType('auto');
              const value = this.visitExpression(decl.initializer);
              
              // Extract simple constant values (for now, just use render to get string representation)
              const valueStr = render(value);
              this.ctx.hoistedConstants.set(name, { type, value: valueStr });
            }
          }
        }
      }
    }
    
    // Check if we need cppcoro for async/await
    const hasAsync = this.sourceFileHasAsync(sourceFile);
    const includes = [new ast.Include('gs_runtime.hpp', false)];
    if (hasAsync) {
      includes.push(new ast.Include('cppcoro/task.hpp', true));
      includes.push(new ast.Include('cppcoro/sync_wait.hpp', true));
    }
    
    const declarations: ast.Declaration[] = [];
    const mainStatements: ast.Statement[] = [];
    let gsMainIsAsync = false;
    
    // Add module-level constants as namespace-scope variables
    // Note: We use 'const' for primitives/strings, but NOT for mutable types like Array/Map/Set
    // because in C++, const makes the object itself immutable (unlike TypeScript where it just
    // prevents rebinding)
    for (const [name, {type, value}] of this.ctx.hoistedConstants) {
      // Determine if this type should be const in C++
      // Arrays, Maps, Sets are mutable in TypeScript even when declared with const
      const typeStr = type.toString();
      const isConstable = !typeStr.startsWith('gs::Array<') && 
                         !typeStr.startsWith('gs::Map<') && 
                         !typeStr.startsWith('gs::Set<') &&
                         !typeStr.startsWith('std::unique_ptr<') &&
                         !typeStr.startsWith('std::shared_ptr<');
      
      const constQualifier = isConstable ? 'const ' : '';
      const constDecl = `${constQualifier}${type.toString()} ${name} = ${value};`;
      declarations.push(new ast.RawDeclaration(constDecl));
    }
    
    // Add forward declarations for all classes (to handle forward references)
    for (const className of this.ctx.hoistedClasses) {
      // Check if this class has template parameters by finding its declaration
      const classDecl = sourceFile.statements.find(
        stmt => ts.isClassDeclaration(stmt) && stmt.name && 
                cppUtils.escapeName(stmt.name.text) === className
      ) as ts.ClassDeclaration | undefined;
      
      if (classDecl && classDecl.typeParameters) {
        // Template class forward declaration
        const templateParams = classDecl.typeParameters.map(tp => tp.name.text);
        const forwardDecl = `template<${templateParams.map(tp => `typename ${tp}`).join(', ')}>\n  class ${className};`;
        // Add as a raw declaration
        declarations.push(new ast.RawDeclaration(forwardDecl));
      } else {
        // Non-template class forward declaration
        declarations.push(new ast.RawDeclaration(`class ${className};`));
      }
    }
    
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
              this.ctx.hoistedFunctions.add(name);
              continue; // Skip adding to mainStatements
            }
            
            // Hoist non-closure arrow functions (don't capture external variables)
            if (!this.arrowFunctionUsesClosure(arrowFunc, sourceFile, decl.name.getText())) {
              const name = cppUtils.escapeName(decl.name.getText());
              const func = this.visitNonClosureArrowFunction(name, arrowFunc);
              declarations.push(func);
              this.ctx.hoistedFunctions.add(name);
              continue; // Skip adding to mainStatements
            }
          }
        }
        
        // Regular variables go into main()
        const decls = this.visitVariableStatement(stmt);
        mainStatements.push(...decls.map(d => d as any)); // VariableDecl can act as Statement
      } else if (ts.isFunctionDeclaration(stmt)) {
        const func = this.visitFunction(stmt);
        if (func) {
          declarations.push(func);
          // Track function name for gs:: qualification in calls
          if (stmt.name) {
            this.ctx.hoistedFunctions.add(cppUtils.escapeName(stmt.name.text));
          }
          // Check if this is the main function and if it's async
          if (stmt.name?.text === 'main') {
            gsMainIsAsync = stmt.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
          }
        }
      } else if (ts.isClassDeclaration(stmt)) {
        const cls = this.visitClass(stmt);
        if (cls) {
          declarations.push(cls);
          // Track class name for gs:: qualification in references
          if (stmt.name) {
            this.ctx.hoistedClasses.add(cppUtils.escapeName(stmt.name.text));
          }
        }
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
    
    // Create main function using builder
    const mainFunction = this.mainBuilder.buildMainFunction(mainStatements, gsMainIsAsync);
    
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
      
      // Get C++ type from explicit annotation or infer from initializer
      let cppType: ast.CppType;
      if (decl.type) {
        cppType = this.typeMapper.mapTsNodeType(decl.type);
      } else {
        // Use type inference service
        const inferredType = this.typeInference.inferType(decl.initializer);
        cppType = inferredType || new ast.CppType('auto');
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
            this.ctx.pointerVariables.add(name);
          }
        } else if (typeStr === 'auto' && ts.isCallExpression(decl.initializer)) {
          // For auto types from Map.get(), just use auto - let C++ infer the pointer type
          // This works because Map<K,V>::get() returns V* in C++
          // For Map<K, share<V>>, get() returns shared_ptr<V>*
          // For Map<K, V>, get() returns V*
          const callExpr = decl.initializer;
          if (ts.isPropertyAccessExpression(callExpr.expression) && 
              callExpr.expression.name.text === 'get') {
            // Keep using auto - it will correctly infer the pointer type
            cppType = new ast.CppType('auto');
            // Mark as pointer variable for proper dereferencing later
            this.ctx.pointerVariables.add(name);
          }
        } else if (typeStr.includes('std::shared_ptr') || 
                   typeStr.includes('std::unique_ptr') ||
                   typeStr.includes('std::weak_ptr')) {
          // Smart pointer type - Map.get() returns it directly
          // Don't add to pointerVariables - it's not a raw pointer
        } else {
          // Regular type - Map.get() returns V*
          this.ctx.pointerVariables.add(name);
        }
      }
      
      let init: ast.Expression | undefined;
      
      if (decl.initializer) {
        // Special case: array literal with explicitly-typed variable
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
          if (tsElementType && this.ctx.interfaceNames.has(tsElementType)) {
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
            // Always use the explicit element type for type-safe initialization
            const elements = decl.initializer.elements.map(el => this.visitExpression(el));
            init = cpp.call(cpp.id(`gs::Array<${elementType}>`), [cpp.initList(elements)]);
          } else {
            // Fallback: no element type extracted, let visitExpression handle it
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
              const objType = this.ctx.variableTypes.get(objName);
              if (objType) {
                // Use the object's array type
                cppType = objType;
              }
            }
          }
        }
      }
      
      // Track variable type for smart pointer detection (AFTER potentially updating cppType)
      this.ctx.variableTypes.set(name, cppType);
      
      // Register with OwnershipChecker for comprehensive type tracking
      this.ownershipChecker.registerVariable(name, decl);
      
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
    const isAsync = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
    
    // Handle type parameters for generic functions
    const templateParams: string[] = [];
    if (node.typeParameters) {
      for (const typeParam of node.typeParameters) {
        const paramName = typeParam.name.text;
        templateParams.push(paramName);
        this.ctx.registerTemplateParameter(paramName);
      }
    }
    
    // Determine return type: use explicit type annotation if present, otherwise infer from body
    let returnType: ast.CppType;
    if (node.type) {
      // Check if the type annotation is Promise<T> (for async functions)
      const typeText = node.type.getText();
      if (typeText.startsWith('Promise<')) {
        // Promise<T> will be mapped to cppcoro::task<T> by mapType, don't wrap again
        returnType = this.mapType(node.type);
      } else {
        const baseType = this.mapType(node.type);
        // If async but no Promise annotation, wrap return type in cppcoro::task<T>
        returnType = isAsync ? cpp.task(baseType) : baseType;
      }
    } else if (this.checker) {
      // Use TypeChecker to infer return type when not explicitly annotated
      const signature = this.checker.getSignatureFromDeclaration(node);
      if (signature) {
        const tsReturnType = signature.getReturnType();
        const returnTypeStr = this.checker.typeToString(tsReturnType);
        
        let baseType: ast.CppType;
        // For async functions, unwrap Promise<T> to get T
        if (isAsync && returnTypeStr.startsWith('Promise<')) {
          const innerMatch = returnTypeStr.match(/Promise<(.+)>/);
          if (innerMatch) {
            const innerTypeStr = innerMatch[1];
            // Use typeMapper to handle all type mappings consistently
            baseType = new ast.CppType(this.typeMapper.mapTypeScriptTypeToCpp(innerTypeStr));
          } else {
            baseType = new ast.CppType('void');
          }
        } else {
          // Use typeMapper to handle all type mappings consistently
          baseType = new ast.CppType(this.typeMapper.mapTypeScriptTypeToCpp(returnTypeStr));
        }
        returnType = isAsync ? cpp.task(baseType) : baseType;
      } else {
        returnType = isAsync ? cpp.task(new ast.CppType('void')) : new ast.CppType('void');
      }
    } else {
      returnType = isAsync ? cpp.task(new ast.CppType('void')) : new ast.CppType('void');
    }
    
    // Enter function scope (tracks return type and clears function-local state)
    this.ctx.enterFunction(returnType, isAsync);
    
    const params: ast.Parameter[] = [];
    for (const param of node.parameters) {
      const paramName = cppUtils.escapeName(param.name.getText());
      let paramType = param.type ? this.mapType(param.type) : new ast.CppType('auto');
      
      // Check if parameter is optional (has questionToken: param?: Type)
      const isOptional = param.questionToken !== undefined;
      if (isOptional) {
        // Wrap type in std::optional<T>
        const innerType = paramType.toString();
        paramType = new ast.CppType(`std::optional<${innerType}>`);
      }
      
      // Register parameter with ownership checker
      this.ownershipChecker.registerVariable(paramName, param);
      
      const passByConstRef = tsUtils.shouldPassByConstRef(param.type);
      const passByMutableRef = tsUtils.shouldPassByMutableRef(param.type);
      params.push(new ast.Parameter(paramName, paramType, undefined, passByConstRef, passByMutableRef));
    }
    
    const body = node.body ? this.visitBlock(node.body) : new ast.Block([]);
    
    // Exit function scope (restores previous state)
    this.ctx.exitFunction();
    
    // Clean up template parameters after processing function
    if (node.typeParameters) {
      for (const typeParam of node.typeParameters) {
        this.ctx.unregisterTemplateParameter(typeParam.name.text);
      }
    }
    
    return new ast.Function(name, returnType, params, body, templateParams, isAsync);
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
        this.ctx.registerTemplateParameter(paramName);
      }
    }
    
    // Enter class scope (tracks class name and template params)
    this.ctx.enterClass(name, templateParams);
    
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
        
        // Check if property is static
        const isStatic = member.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword) ?? false;
        
        // For static properties with numeric initializers, use static constexpr
        if (isStatic && member.initializer) {
          // Check if initializer is a numeric literal
          if (ts.isNumericLiteral(member.initializer)) {
            const value = member.initializer.text;
            // For numeric constants, use static constexpr with inline initialization
            // In C++, static constexpr members can be initialized inline
            const initValue = cpp.literal(parseFloat(value));
            fieldType = new ast.CppType('static constexpr double');
            fields.push(new ast.Field(fieldName, fieldType, ast.AccessSpecifier.Public, initValue));
            continue;
          }
        }
        
        // Skip static properties that aren't numeric constants (not supported yet)
        if (isStatic) {
          continue;
        }
        
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
        this.ctx.variableTypes.set(`this.${fieldName}`, fieldType);
      }
    }
    
    // Collect constructors
    for (const member of node.members) {
      if (ts.isConstructorDeclaration(member)) {
        const params: ast.Parameter[] = [];
        for (const param of member.parameters) {
          const paramName = cppUtils.escapeName(param.name.getText());
          let paramType = param.type ? this.mapType(param.type) : new ast.CppType('auto');
          
          // Check if parameter is optional (has questionToken: param?: Type)
          const isOptional = param.questionToken !== undefined;
          if (isOptional) {
            // Wrap type in std::optional<T>
            const innerType = paramType.toString();
            paramType = new ast.CppType(`std::optional<${innerType}>`);
          }
          
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
        const isAsync = member.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
        
        // Get return type: use explicit annotation if present, otherwise infer from TypeChecker
        let returnType: ast.CppType;
        if (member.type) {
          // Check if the type annotation is Promise<T> (for async methods)
          const typeText = member.type.getText();
          if (typeText.startsWith('Promise<')) {
            // Promise<T> will be mapped to cppcoro::task<T> by mapType, don't wrap again
            returnType = this.mapType(member.type);
          } else {
            const baseType = this.mapType(member.type);
            // If async but no Promise annotation, wrap return type in cppcoro::task<T>
            returnType = isAsync ? cpp.task(baseType) : baseType;
          }
        } else if (this.checker) {
          // Use TypeChecker to infer return type
          const signature = this.checker.getSignatureFromDeclaration(member);
          if (signature) {
            const tsReturnType = signature.getReturnType();
            const returnTypeStr = this.checker.typeToString(tsReturnType);
            
            let baseType: ast.CppType;
            // For async methods, unwrap Promise<T> to get T
            if (isAsync && returnTypeStr.startsWith('Promise<')) {
              const innerMatch = returnTypeStr.match(/Promise<(.+)>/);
              if (innerMatch) {
                const innerTypeStr = innerMatch[1];
                // Map the inner type
                if (innerTypeStr === 'number') {
                  baseType = new ast.CppType('double');
                } else if (innerTypeStr === 'string') {
                  baseType = new ast.CppType('gs::String');
                } else if (innerTypeStr === 'boolean') {
                  baseType = new ast.CppType('bool');
                } else if (innerTypeStr === 'void') {
                  baseType = new ast.CppType('void');
                } else {
                  // For complex types, use auto for now
                  baseType = new ast.CppType('auto');
                }
              } else {
                baseType = new ast.CppType('void');
              }
            } else {
              // Map TypeScript type string to C++ type
              if (returnTypeStr === 'number') {
                baseType = new ast.CppType('double');
              } else if (returnTypeStr === 'string') {
                baseType = new ast.CppType('gs::String');
              } else if (returnTypeStr === 'boolean') {
                baseType = new ast.CppType('bool');
              } else if (returnTypeStr === 'void') {
                baseType = new ast.CppType('void');
              } else {
                // For complex types, use auto for now
                baseType = new ast.CppType('auto');
              }
            }
            returnType = isAsync ? cpp.task(baseType) : baseType;
          } else {
            returnType = isAsync ? cpp.task(new ast.CppType('void')) : new ast.CppType('void');
          }
        } else {
          returnType = isAsync ? cpp.task(new ast.CppType('void')) : new ast.CppType('void');
        }
        
        // Track return type for null handling in return statements
        const previousReturnType = this.ctx.currentFunctionReturnType;
        const previousIsAsync = this.ctx.currentFunctionIsAsync;
        this.ctx.currentFunctionReturnType = returnType;
        this.ctx.currentFunctionIsAsync = isAsync;
        
        const params: ast.Parameter[] = [];
        for (const param of member.parameters) {
          const paramName = cppUtils.escapeName(param.name.getText());
          let paramType = param.type ? this.mapType(param.type) : new ast.CppType('auto');
          
          // Check if parameter is optional (has questionToken: param?: Type)
          const isOptional = param.questionToken !== undefined;
          if (isOptional) {
            // Wrap type in std::optional<T>
            const innerType = paramType.toString();
            paramType = new ast.CppType(`std::optional<${innerType}>`);
          }
          
          const passByConstRef = tsUtils.shouldPassByConstRef(param.type);
          const passByMutableRef = tsUtils.shouldPassByMutableRef(param.type);
          params.push(new ast.Parameter(paramName, paramType, undefined, passByConstRef, passByMutableRef));
          // Track parameter types for length() detection
          this.ctx.variableTypes.set(paramName, paramType);
          // Register with OwnershipChecker
          this.ownershipChecker.registerVariable(paramName, param);
        }
        
        const body = member.body ? this.visitBlock(member.body) : new ast.Block([]);
        
        // Clear parameter types after processing method body
        for (const param of member.parameters) {
          const paramName = cppUtils.escapeName(param.name.getText());
          this.ctx.variableTypes.delete(paramName);
        }
        
        // Restore previous return type
        this.ctx.currentFunctionReturnType = previousReturnType;
        this.ctx.currentFunctionIsAsync = previousIsAsync;
        
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
        
        methods.push(new ast.Method(methodName, returnType, params, body, ast.AccessSpecifier.Public, isConst, isStatic, isVirtual, false, isOverride, false, isAsync));
      }
    }
    
    // If this is an error class (name ends with "Error"), make it inherit from std::exception
    if (name.endsWith('Error') && !baseClass) {
      baseClass = 'std::exception';
    }
    
    // Exit class scope
    this.ctx.exitClass();
    
    // Clean up template parameters
    if (node.typeParameters) {
      for (const typeParam of node.typeParameters) {
        this.ctx.unregisterTemplateParameter(typeParam.name.text);
      }
    }
    
    return new ast.Class(name, fields, constructors, methods, baseClass, templateParams, false, baseClasses);
  }
  
  private visitInterface(node: ts.InterfaceDeclaration): ast.Class | undefined {
    const name = cppUtils.escapeName(node.name.text);
    const fields: ast.Field[] = [];
    const methods: ast.Method[] = [];
    const methodNames = new Set<string>(); // Track method names for this interface
    
    // Handle type parameters for generic interfaces
    const templateParams: string[] = [];
    if (node.typeParameters) {
      for (const typeParam of node.typeParameters) {
        const paramName = typeParam.name.text;
        templateParams.push(paramName);
        this.ctx.registerTemplateParameter(paramName);
      }
    }
    
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
            let paramType = param.type ? this.mapType(param.type) : new ast.CppType('auto');
            
            // Check if parameter is optional (has questionToken: param?: Type)
            const isOptional = param.questionToken !== undefined;
            if (isOptional) {
              // Wrap type in std::optional<T>
              const innerType = paramType.toString();
              paramType = new ast.CppType(`std::optional<${innerType}>`);
            }
            
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
    this.ctx.interfaceMethods.set(name, methodNames);
    
    // Track this as an interface name
    this.ctx.interfaceNames.add(name);
    
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
    
    // Clean up template parameters after processing interface
    if (node.typeParameters) {
      for (const typeParam of node.typeParameters) {
        this.ctx.unregisterTemplateParameter(typeParam.name.text);
      }
    }
    
    // Interfaces become abstract base classes (not structs)
    return new ast.Class(name, fields, [], methods, undefined, templateParams, false);
  }
  
  private getInterfaceMethodNames(interfaceNames: string[]): Set<string> {
    const methodNames = new Set<string>();
    
    // Lookup cached method names for each interface
    for (const interfaceName of interfaceNames) {
      const methods = this.ctx.interfaceMethods.get(interfaceName);
      if (methods) {
        methods.forEach(m => methodNames.add(m));
      }
    }
    
    return methodNames;
  }
  
  private getCurrentClassName(): string | undefined {
    return this.ctx.currentClassName;
  }
  
  private visitEnum(node: ts.EnumDeclaration): ast.Enum | undefined {
    const name = cppUtils.escapeName(node.name.text);
    this.ctx.enumNames.add(name); // Track enum name
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
    // Save current scope state for block scoping
    const savedScope = this.ctx.saveScope();
    
    const statements: ast.Statement[] = [];
    
    for (const stmt of node.statements) {
      const cppStmt = this.visitStatement(stmt);
      if (cppStmt) statements.push(cppStmt);
    }
    
    // Restore scope state when block exits
    this.ctx.restoreScope(savedScope);
    
    return new ast.Block(statements);
  }
  
  private visitStatement(node: ts.Statement): ast.Statement | undefined {
    if (ts.isReturnStatement(node)) {
      // Check if returning a new expression with own<T> return type BEFORE visiting
      if (node.expression && ts.isNewExpression(node.expression) &&
          this.ctx.currentFunctionReturnType?.toString().startsWith('std::unique_ptr<')) {
        // Extract the type from std::unique_ptr<T>
        const returnTypeStr = this.ctx.currentFunctionReturnType.toString();
        const match = returnTypeStr.match(/std::unique_ptr<(.+)>/);
        if (match) {
          const innerType = match[1];
          // Visit arguments
          const args = node.expression.arguments 
            ? Array.from(node.expression.arguments).map(arg => this.visitExpression(arg))
            : [];
          // Create make_unique call
          const expr = cpp.call(cpp.id(`std::make_unique<${innerType}>`), args);
          // Use co_return for async functions
          return this.ctx.currentFunctionIsAsync ? cpp.coReturn(expr) : new ast.ReturnStmt(expr);
        }
      }
      
      let expr = node.expression ? this.visitExpression(node.expression) : undefined;
      
      // If returning a ternary with pointer branches and function returns optional, convert
      if (expr instanceof ast.ConditionalExpr && 
          this.ctx.currentFunctionReturnType?.toString().startsWith('std::optional') &&
          node.expression && ts.isConditionalExpression(node.expression)) {
        // Check if this is a pattern like: result !== undefined ? result : null
        // where result is from Map.get() (pointer)
        const isPointerTernary = tsUtils.isMapGetCall(node.expression.whenTrue) ||
                                 (ts.isIdentifier(node.expression.whenTrue) && 
                                  this.ctx.pointerVariables.has(cppUtils.escapeName(node.expression.whenTrue.text)));
        
        if (isPointerTernary) {
          // Extract the inner type from std::optional<T>
          const optType = this.ctx.currentFunctionReturnType.toString();
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
          this.ctx.pointerVariables.has(cppUtils.escapeName(node.expression.text))) {
        expr = cpp.unary('*', expr);
      }
      
      // If returning null and function returns optional, use std::nullopt
      if (expr instanceof ast.Identifier && expr.name === 'nullptr' && 
          this.ctx.currentFunctionReturnType?.toString().startsWith('std::optional')) {
        expr = cpp.id('std::nullopt');
      }
      
      // Use co_return for async functions, return for sync functions
      return this.ctx.currentFunctionIsAsync ? cpp.coReturn(expr) : new ast.ReturnStmt(expr);
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
    
    // Visit condition
    let condition = this.visitExpression(node.expression);
    
    // In JavaScript, functions/lambdas are truthy. C++ lambdas don't convert to bool.
    // Wrap function expressions with true (they're always truthy in JS)
    if (ts.isArrowFunction(node.expression) || ts.isFunctionExpression(node.expression)) {
      // Lambda is always truthy in JavaScript - use (lambda, true) to evaluate and discard
      condition = cpp.binary(condition, ',', cpp.id('true'));
    }
    
    // Process then block WITH unwrapped variable in scope
    if (unwrappedVar) {
      this.ctx.unwrappedOptionals.add(unwrappedVar);
      
      // Check if this is a smart pointer null check (comparing with nullptr, not std::nullopt)
      // This happens when the variable type is a user-defined class or share<T>
      // BUT only if it's actually a smart pointer type, not a raw pointer
      const varType = this.ctx.variableTypes.get(unwrappedVar);
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
        this.ctx.smartPointerNullChecks.add(unwrappedVar);
      }
    }
    
    const thenBlock = ts.isBlock(node.thenStatement) 
      ? this.visitBlock(node.thenStatement)
      : new ast.Block([this.visitStatement(node.thenStatement)!]);
    
    // Remove from unwrapped set after then block
    if (unwrappedVar) {
      this.ctx.unwrappedOptionals.delete(unwrappedVar);
      this.ctx.smartPointerNullChecks.delete(unwrappedVar);
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
              this.ctx.structuredBindingVariables.add(name);
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
          this.ctx.variableTypes.set(catchVar, new ast.CppType(cppType));
        } else {
          // If no type annotation, scan catch block for instanceof checks
          const instanceofType = tsUtils.findInstanceofTypeInCatch(node.catchClause.block, catchVar);
          if (instanceofType) {
            // User-defined exception types are thrown as shared_ptr, so catch as shared_ptr
            const cppType = `std::shared_ptr<gs::${instanceofType}>`;
            catchType = new ast.CppType(cppType);
            // Track this as a smart pointer variable so we use -> for member access
            this.ctx.variableTypes.set(catchVar, new ast.CppType(cppType));
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
      if (this.ctx.hoistedFunctions.has(escapedName)) {
        return cpp.id(`gs::${escapedName}`);
      }
      
      // If this identifier is tracked as unwrapped
      if (this.ctx.unwrappedOptionals.has(escapedName)) {
        // Check if it's a smart pointer null check (compared with nullptr)
        // Smart pointers don't need unwrapping - they're already usable
        if (this.ctx.smartPointerNullChecks.has(escapedName)) {
          return cpp.id(escapedName);
        }
        
        // Check if it's a smart pointer type (shared_ptr, unique_ptr, weak_ptr)
        const varType = this.ctx.variableTypes.get(escapedName);
        if (varType && cppUtils.isSmartPointerType(varType)) {
          // Smart pointers don't need unwrapping - they're already usable
          // Just return the identifier (nullptr check passed, so it's safe to use)
          return cpp.id(escapedName);
        }
        
        // For raw pointers (from Map.get() on non-smart-pointer values)
        if (this.ctx.pointerVariables.has(escapedName)) {
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
        const varType = this.ctx.variableTypes.get(varName);
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
      
      // Check if array element type is shared_ptr using ownership-aware type checker
      // This preserves share<T> annotations that TypeChecker erases
      // Also checks if element type is an interface (which we wrap in shared_ptr)
      const hasSmartPtrElements = this.ownershipChecker.hasSmartPointerElements(node.expression, this.ctx.interfaceNames);
      
      // Always use at_ref() for array element access - it returns a reference to the element
      // For Array<T>, at_ref() returns T&
      // For Array<shared_ptr<T>>, at_ref() returns shared_ptr<T>&
      // This is more consistent and safer than operator[] which returns T*
      const isSimpleRead = !isPartOfPropertyAccess && 
                          !this.isArrayAccessUsedAsLValue(node);
      
      if (isSimpleRead) {
        // Use at_ref() for direct access: arr.at_ref(i)
        return cpp.call(cpp.member(obj, 'at_ref', false), [index]);
      }
      
      // For property access chains (arr[i].prop or arr[i]->method()), 
      // still use at_ref() but wrap in dereference for smart pointers
      if (isPartOfPropertyAccess && hasSmartPtrElements) {
        // arr[i]->method() becomes arr.at_ref(i)->method()
        return cpp.call(cpp.member(obj, 'at_ref', false), [index]);
      }
      
      // Fallback for other cases
      return cpp.call(cpp.member(obj, 'at_ref', false), [index]);
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
      // Object literal: { key: value, ... }
      // Try to infer the target type from context (e.g., Entry<K, V>)
      let targetTypeName: string | undefined;
      let isStructInit = false;
      
      if (this.checker) {
        const contextualType = this.checker.getContextualType(node);
        if (contextualType) {
          const typeStr = this.checker.typeToString(contextualType);
          // Check if it's a user-defined interface/struct (not an anonymous type)
          // Anonymous types look like "{ key: K; value: V; }"
          // Named types look like "Entry<K, V>"
          if (!typeStr.startsWith('{') && !typeStr.includes(';')) {
            // It's a named type - use it for struct initialization
            targetTypeName = this.typeMapper.mapTypeScriptTypeToCpp(typeStr);
            isStructInit = true;
          }
        }
      }
      
      // Collect property values in order
      const propertyValues: ast.Expression[] = [];
      
      for (const prop of node.properties) {
        if (ts.isPropertyAssignment(prop)) {
          // Regular property: key: value
          const value = this.visitExpression(prop.initializer);
          propertyValues.push(value);
        } else if (ts.isShorthandPropertyAssignment(prop)) {
          // Shorthand property: { x } → use x's value
          const value = this.visitExpression(prop.name);
          propertyValues.push(value);
        }
        // Note: Method declarations, getters, setters not supported yet
      }
      
      if (isStructInit && targetTypeName) {
        // Generate structured initialization: gs::Entry<K, V>{value1, value2, ...}
        if (propertyValues.length === 0) {
          return cpp.id(`${targetTypeName}{}`);
        }
        return cpp.call(cpp.id(targetTypeName), [cpp.initList(propertyValues)]);
      }
      
      // Fallback: Use gs::LiteralObject (for untyped object literals)
      // This is legacy and may not have runtime support
      const properties: [ast.Expression, ast.Expression][] = [];
      for (const prop of node.properties) {
        if (ts.isPropertyAssignment(prop)) {
          const keyStr = prop.name.getText();
          const key = cpp.literal(keyStr);
          const value = this.visitExpression(prop.initializer);
          const propertyValue = cpp.call(cpp.id('gs::Property'), [value]);
          properties.push([key, propertyValue]);
        } else if (ts.isShorthandPropertyAssignment(prop)) {
          const keyStr = prop.name.getText();
          const key = cpp.literal(keyStr);
          const value = this.visitExpression(prop.name);
          const propertyValue = cpp.call(cpp.id('gs::Property'), [value]);
          properties.push([key, propertyValue]);
        }
      }
      
      if (properties.length === 0) {
        return cpp.id('gs::LiteralObject{}');
      }
      
      const propInits = properties.map(([key, value]) => cpp.initList([key, value]));
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
          // Check if the base type is an anonymous object type { ... }
          if (baseType.startsWith('{') && baseType.includes(';')) {
            // Try to get the contextual type which might have the named interface
            const contextualType = this.checker.getContextualType(node);
            if (contextualType && (contextualType as any).target) {
              const typeRef = contextualType as ts.TypeReference;
              const typeArgs = this.checker.getTypeArguments(typeRef);
              if (typeArgs && typeArgs.length > 0) {
                const argStr = this.checker.typeToString(typeArgs[0]);
                // Check if argStr is a named type (not anonymous)
                if (!argStr.startsWith('{') && !argStr.includes(';')) {
                  elementType = this.typeMapper.mapTypeScriptTypeToCpp(argStr);
                }
              }
            }
            // If we couldn't find a named type, try to infer from first element
            if (!elementType && elements.length > 0 && node.elements[0] && ts.isObjectLiteralExpression(node.elements[0])) {
              const firstElem = node.elements[0];
              const elemContextualType = this.checker.getContextualType(firstElem);
              if (elemContextualType) {
                const elemTypeStr = this.checker.typeToString(elemContextualType);
                if (!elemTypeStr.startsWith('{') && !elemTypeStr.includes(';')) {
                  elementType = this.typeMapper.mapTypeScriptTypeToCpp(elemTypeStr);
                }
              }
            }
          } else {
            // Regular type like "number"
            elementType = this.typeMapper.mapTypeScriptTypeToCpp(baseType);
          }
        } else if (typeStr.startsWith('Array<')) {
          const match = typeStr.match(/^Array<(.+)>$/);
          if (match) {
            elementType = this.typeMapper.mapTypeScriptTypeToCpp(match[1]);
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
      
      // Special case: if element type is 'auto' (from TypeScript 'any'), and we're in a generic class,
      // use the template parameter with std::optional (common pattern for nullable element arrays)
      if (elementType === 'auto' && this.ctx.templateParameters.size > 0) {
        // Get the first template parameter (usually 'E' or 'T')
        const firstParam = Array.from(this.ctx.templateParameters)[0];
        elementType = `std::optional<${firstParam}>`;
      }
      
      // Generate gs::Array<T>({...}) with explicit template parameter if we know the type
      // This prevents type inference issues with int vs double literals
      // Note: if elementType is still 'auto', omit it (can't use auto as template arg)
      const arrayType = (elementType && elementType !== 'auto') ? `gs::Array<${elementType}>` : 'gs::Array';
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
    
    if (ts.isFunctionExpression(node)) {
      // Function expressions work just like arrow functions in C++
      // Convert to lambda with the same logic
      return this.visitArrowFunction(node as any as ts.ArrowFunction);
    }
    
    if (ts.isAwaitExpression(node)) {
      // await expression -> co_await in C++
      const expr = this.visitExpression(node.expression);
      return cpp.await(expr);
    }
    
    if (ts.isTemplateExpression(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      return this.visitTemplateLiteral(node);
    }
    
    if (ts.isTypeOfExpression(node)) {
      // typeof expression: In GoodScript, this is used for runtime type checking
      // For generic code, we use a helper function gs::type_name<T>()
      // For template parameters, we use compile-time type traits
      const expr = this.visitExpression(node.expression);
      
      // Generate gs::type_name(expr) which returns a string like "number", "string", etc.
      return cpp.call(cpp.id('gs::type_name'), [expr]);
    }
    
    if (ts.isConditionalExpression(node)) {
      // Ternary operator: condition ? whenTrue : whenFalse
      const condition = this.visitExpression(node.condition);
      let whenTrue = this.visitExpression(node.whenTrue);
      let whenFalse = this.visitExpression(node.whenFalse);
      
      // Get parent context to check if we're in a return statement
      const parent = node.parent;
      const isReturnStatement = parent && ts.isReturnStatement(parent);
      
      // Special case: For optional parameters, unwrap with .value() when used
      // Pattern: param !== null && param !== undefined ? param : default
      // Should be: param.has_value() ? param.value() : default
      // UNLESS we're returning an optional type, then keep it wrapped
      if (ts.isIdentifier(node.whenTrue) && !isReturnStatement) {
        const varName = cppUtils.escapeName(node.whenTrue.text);
        const varType = this.ctx.variableTypes.get(varName);
        if (varType && varType.toString().startsWith('std::optional<')) {
          // Unwrap optional with .value()
          whenTrue = cpp.call(cpp.member(whenTrue, 'value'), []);
        }
      }
      if (ts.isIdentifier(node.whenFalse) && !isReturnStatement) {
        const varName = cppUtils.escapeName(node.whenFalse.text);
        const varType = this.ctx.variableTypes.get(varName);
        if (varType && varType.toString().startsWith('std::optional<')) {
          // Unwrap optional with .value()
          whenFalse = cpp.call(cpp.member(whenFalse, 'value'), []);
        }
      }
      
      // Special case: if one branch is null and the other is an identifier/optional,
      // convert nullptr to std::nullopt for std::optional compatibility
      const trueIsNull = node.whenTrue.kind === ts.SyntaxKind.NullKeyword;
      const falseIsNull = node.whenFalse.kind === ts.SyntaxKind.NullKeyword;
      
      if (trueIsNull || falseIsNull) {
        // Check if the non-null branch might be an optional type
        // This happens when: element === undefined ? null : element
        // where element is typed as std::optional<T>
        const nonNullBranch = trueIsNull ? node.whenFalse : node.whenTrue;
        
        // If the non-null branch is an identifier, it might be std::optional
        // To be safe, use std::nullopt instead of nullptr in ternary expressions
        // std::nullopt works with std::optional, nullptr works with pointers
        // Since we map T | null to std::optional<T>, use std::nullopt
        if (trueIsNull) {
          whenTrue = cpp.id('std::nullopt');
        }
        if (falseIsNull) {
          whenFalse = cpp.id('std::nullopt');
        }
      }
      
      // C++ has the same ternary syntax
      return cpp.ternary(condition, whenTrue, whenFalse);
    }
    
    if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
      // Type assertion: expr as Type or <Type>expr
      // In C++, we typically just ignore the type assertion and use the expression
      // The type system will handle correctness at compile time
      const expr = ts.isAsExpression(node) ? node.expression : (node as ts.TypeAssertion).expression;
      return this.visitExpression(expr);
    }
    
    return cpp.id('/* UNSUPPORTED */');
  }
  
  private visitBinaryExpression(node: ts.BinaryExpression): ast.Expression {
    // Special case: arr[idx] = value → optimize based on context
    if (node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isElementAccessExpression(node.left)) {
      
      // Check if we're in a tight loop with known bounds (optimization opportunity)
      // Pattern: for (let i = 0; i < arr.length; i++) { arr[i] = value; }
      const isInSafeBoundsContext = this.isArrayAccessInSafeBounds(node.left);
      
      if (isInSafeBoundsContext) {
        // Use optimized set_unchecked - no resize checks needed
        const arrExpr = this.visitExpression(node.left.expression);
        const indexExpr = this.visitExpression(node.left.argumentExpression!);
        const valueExpr = this.visitExpression(node.right);
        
        // Cast index to int if needed
        let finalIndex = indexExpr;
        if (this.checker) {
          const indexType = this.checker.getTypeAtLocation(node.left.argumentExpression!);
          const indexTypeStr = this.checker.typeToString(indexType);
          if (indexTypeStr === 'number') {
            finalIndex = cpp.cast(new ast.CppType('int'), indexExpr);
          }
        }
        
        return cpp.call(cpp.member(arrExpr, 'set_unchecked', false), [finalIndex, valueExpr]);
      }
    }
    
    // Regular array assignment with resize check
    if (node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isElementAccessExpression(node.left)) {
      const arrayExpr = node.left.expression;
      const indexExpr = node.left.argumentExpression;
      const valueExpr = node.right;
      
      if (indexExpr) {
        // Use inline bounds-checking set() method instead of IIFE
        // arr.set(idx, value) - much more efficient than lambda
        const arr = this.visitExpression(arrayExpr);
        const idx = this.visitExpression(indexExpr);
        const value = this.visitExpression(valueExpr);
        
        // Cast index to int if needed
        let finalIndex = idx;
        if (this.checker) {
          const indexType = this.checker.getTypeAtLocation(indexExpr);
          const indexTypeStr = this.checker.typeToString(indexType);
          if (indexTypeStr === 'number') {
            finalIndex = cpp.cast(new ast.CppType('int'), idx);
          }
        }
        
        return cpp.call(cpp.member(arr, 'set', false), [finalIndex, value]);
      }
    }
    
    // Special case: array.length = n → array.resize(n)
    if (node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isPropertyAccessExpression(node.left) &&
        node.left.name.text === 'length') {
      // This is an assignment to .length property - use resize() for arrays
      const obj = this.visitExpression(node.left.expression);
      const newSize = this.visitExpression(node.right);
      // Check if object is 'this' (a pointer in C++)
      const isThisPointer = node.left.expression.kind === ts.SyntaxKind.ThisKeyword;
      return cpp.call(cpp.member(obj, 'resize', isThisPointer), [newSize]);
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
    
    // Check for bitwise operators that require integer operands in C++
    const isBitwiseOp = ['&', '|', '^', '<<', '>>', '>>>'].includes(op);
    
    // Check if we're comparing with null/undefined BEFORE visiting expressions
    const isLeftNull = node.left.kind === ts.SyntaxKind.NullKeyword;
    const isRightNull = node.right.kind === ts.SyntaxKind.NullKeyword;
    const isLeftUndefined = ts.isIdentifier(node.left) && node.left.text === 'undefined';
    const isRightUndefined = ts.isIdentifier(node.right) && node.right.text === 'undefined';
    
    // Check if either side is a Map.get() call which returns a pointer
    const isLeftMapGet = tsUtils.isMapGetCall(node.left);
    const isRightMapGet = tsUtils.isMapGetCall(node.right);
    
    // Check if either side is an identifier that holds a pointer value
    const isLeftPointer = ts.isIdentifier(node.left) && this.ctx.pointerVariables.has(cppUtils.escapeName(node.left.text));
    const isRightPointer = ts.isIdentifier(node.right) && this.ctx.pointerVariables.has(cppUtils.escapeName(node.right.text));
    
    // Check if either side is a shared_ptr type (share<T>)
    // NOTE: Check the actual C++ type, not just TypeScript ownership
    // For example, Array.find() returns optional<T>, not T directly
    let isLeftSharedPtr = false;
    let isRightSharedPtr = false;
    if (this.checker) {
      // Check if left side has a C++ smart pointer type
      if (!isLeftNull && !isLeftUndefined && ts.isIdentifier(node.left)) {
        const varName = cppUtils.escapeName(node.left.text);
        const varType = this.ctx.variableTypes.get(varName);
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
        const varType = this.ctx.variableTypes.get(varName);
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
    
    // Handle bitwise operators: Cast double operands to int
    // TypeScript allows bitwise ops on 'number', which implicitly converts to int32
    // In C++, we need explicit casting: static_cast<int>(number) & ...
    if (isBitwiseOp && this.checker) {
      const leftType = this.checker.getTypeAtLocation(node.left);
      const rightType = this.checker.getTypeAtLocation(node.right);
      const leftTypeStr = this.checker.typeToString(leftType);
      const rightTypeStr = this.checker.typeToString(rightType);
      
      // Cast left operand if it's a number (double)
      if (leftTypeStr === 'number') {
        left = cpp.cast(new ast.CppType('int'), left);
      }
      // Cast right operand if it's a number (double)
      if (rightTypeStr === 'number') {
        right = cpp.cast(new ast.CppType('int'), right);
      }
    }
    
    // Handle arithmetic/comparison with std::optional<T>
    // If operand is std::optional, unwrap with .value()
    const isArithmeticOrComparisonOp = ['+', '-', '*', '/', '%', '<', '>', '<=', '>='].includes(op);
    if (isArithmeticOrComparisonOp && this.checker) {
      // Check left operand
      if (ts.isIdentifier(node.left)) {
        const varName = cppUtils.escapeName(node.left.text);
        const varType = this.ctx.variableTypes.get(varName);
        if (varType && varType.toString().startsWith('std::optional<')) {
          left = cpp.call(cpp.member(left, 'value'), []);
        }
      }
      // Check right operand
      if (ts.isIdentifier(node.right)) {
        const varName = cppUtils.escapeName(node.right.text);
        const varType = this.ctx.variableTypes.get(varName);
        if (varType && varType.toString().startsWith('std::optional<')) {
          right = cpp.call(cpp.member(right, 'value'), []);
        }
      }
    }
    
    // Special case: For optional<T> parameters, x !== null && x !== undefined → x.has_value()
    // This pattern appears when checking optional parameters: param !== null && param !== undefined ? param : default
    if ((op === '==' || op === '!=') && (isLeftNull || isLeftUndefined || isRightNull || isRightUndefined)) {
      const isNullCheck = isLeftNull || isLeftUndefined || isRightNull || isRightUndefined;
      const valueExpr = isLeftNull || isLeftUndefined ? node.right : node.left;
      
      // Check if the value expression is an identifier with std::optional<T> type
      if (ts.isIdentifier(valueExpr)) {
        const varName = cppUtils.escapeName(valueExpr.text);
        const varType = this.ctx.variableTypes.get(varName);
        
        if (varType && varType.toString().startsWith('std::optional<')) {
          // Use .has_value() instead of null comparison
          const valueIdent = isLeftNull || isLeftUndefined ? right : left;
          const hasValueCall = cpp.call(cpp.member(valueIdent, 'has_value'), []);
          
          // If operator is !== (not equal to null/undefined), keep has_value()
          // If operator is === (equal to null/undefined), negate it
          return op === '!=' ? hasValueCall : cpp.unary('!', hasValueCall);
        }
      }
    }
    
    // Dereference pointer variables when used in arithmetic/comparison (except null checks)
    // This handles Map.get() results: `current + 1` → `*current + 1`
    // BUT: Don't dereference structured binding variables (they're already references)
    // AND: Don't dereference if already unwrapped (unwrappedOptionals logic already dereferenced)
    const isArithmeticOp = ['+', '-', '*', '/', '%', '<', '>', '<=', '>='].includes(op);
    if (isArithmeticOp) {
      // Dereference left if it's a pointer variable (but not already dereferenced or structured binding)
      if (ts.isIdentifier(node.left)) {
        const varName = cppUtils.escapeName(node.left.text);
        const alreadyDereferenced = this.ctx.unwrappedOptionals.has(varName) && this.ctx.pointerVariables.has(varName);
        if (this.ctx.pointerVariables.has(varName) && 
            !this.ctx.structuredBindingVariables.has(varName) &&
            !alreadyDereferenced) {
          left = cpp.unary('*', left);
        }
      }
      // Dereference right if it's a pointer variable (but not already dereferenced or structured binding)
      if (ts.isIdentifier(node.right)) {
        const varName = cppUtils.escapeName(node.right.text);
        const alreadyDereferenced = this.ctx.unwrappedOptionals.has(varName) && this.ctx.pointerVariables.has(varName);
        if (this.ctx.pointerVariables.has(varName) && 
            !this.ctx.structuredBindingVariables.has(varName) &&
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
    
    // Extract base class name (without template parameters) for hoisted class check
    const baseClassName = className.split('<')[0];
    const needsGsPrefix = this.ctx.hoistedClasses.has(baseClassName);
    
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
            const mapped = this.mapTypeScriptTypeToCpp(argStr);
            
            // Special case: if we got 'auto' (from 'any') and we're in a generic class,
            // use the template parameter with std::optional
            if (mapped === 'auto' && this.ctx.templateParameters.size > 0) {
              const firstParam = Array.from(this.ctx.templateParameters)[0];
              return `std::optional<${firstParam}>`;
            }
            
            return mapped;
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
            const cppTemplateArgs = templateArgs.split(',').map(t => {
              const mapped = this.mapTypeScriptTypeToCpp(t.trim());
              // Special case: if we got 'auto' (from 'any') and we're in a generic class,
              // use the template parameter with std::optional
              if (mapped === 'auto' && this.ctx.templateParameters.size > 0) {
                const firstParam = Array.from(this.ctx.templateParameters)[0];
                return `std::optional<${firstParam}>`;
              }
              return mapped;
            }).join(', ');
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
                    const varType = this.ctx.variableTypes.get(varName);
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
    
    if (builtInValueTypes.includes(baseClassName)) {
      // Value types: direct construction (no smart pointer)
      return cpp.call(cpp.id(`gs::${className}`), args);
    }
    
    // User-defined class instances are heap-allocated via smart pointers
    // Determine ownership type from parent context
    const ownershipType = this.getOwnershipTypeForNew(node);
    
    // Add gs:: prefix for hoisted classes
    const qualifiedClassName = needsGsPrefix ? `gs::${className}` : className;
    
    if (ownershipType === 'unique') {
      // Explicit unique ownership (own<T>)
      return cpp.call(cpp.id(`std::make_unique<${qualifiedClassName}>`), args);
    } else {
      // Default to shared ownership (matches JavaScript reference semantics)
      return cpp.call(cpp.id(`std::make_shared<${qualifiedClassName}>`), args);
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
    if (ts.isReturnStatement(parent) && this.ctx.currentFunctionReturnType) {
      const returnTypeStr = this.ctx.currentFunctionReturnType.toString();
      if (returnTypeStr.includes('std::unique_ptr')) return 'unique';
      if (returnTypeStr.includes('std::shared_ptr')) return 'shared';
    }
    
    // Assignment: x = new T() where x is own<T>
    if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      // Special case: this.fieldName = new T() in constructor
      if (ts.isPropertyAccessExpression(parent.left) &&
          parent.left.expression.kind === ts.SyntaxKind.ThisKeyword) {
        const fieldName = parent.left.name.getText();
        // Look up field type from variableTypes (which preserves AST-based ownership)
        const fieldType = this.ctx.variableTypes.get(`this.${fieldName}`);
        if (fieldType) {
          const fieldTypeStr = fieldType.toString();
          if (fieldTypeStr.includes('std::unique_ptr')) return 'unique';
          if (fieldTypeStr.includes('std::shared_ptr')) return 'shared';
        }
      }
      
      const leftType = this.checker.getTypeAtLocation(parent.left);
      const leftTypeStr = this.checker.typeToString(leftType);
      if (leftTypeStr.startsWith('own<')) return 'unique';
      if (leftTypeStr.startsWith('share<')) return 'shared';
    }
    
    // Default to shared ownership (matches JavaScript reference semantics)
    return 'shared';
  }
  
  /**
   * Delegate type mapping to CppTypeMapper service
   */
  private mapTypeScriptTypeToCpp(tsType: string): string {
    return this.typeMapper.mapTypeScriptTypeToCpp(tsType);
  }

  private visitArrowFunction(node: ts.ArrowFunction): ast.Expression {
    // Arrow functions in TypeScript: (x) => x * 2
    // In C++, use lambdas: [](auto x) { return x * 2; }
    
    const params: ast.Parameter[] = [];
    const destructuringStatements: ast.Statement[] = [];
    
    for (const param of node.parameters) {
      // Check if this parameter uses array destructuring: ([k, v]) => ...
      if (ts.isArrayBindingPattern(param.name)) {
        // Generate a temporary parameter name
        const tempParamName = `__param${params.length}`;
        const paramType = param.type ? this.mapType(param.type) : new ast.CppType('auto');
        
        // Add the temporary parameter (passed by const reference)
        params.push(new ast.Parameter(tempParamName, paramType, undefined, true, false));
        
        // Generate destructuring statements: const auto& [k, v] = __param0;
        const elements = param.name.elements;
        const bindingNames: string[] = [];
        
        for (const element of elements) {
          if (ts.isBindingElement(element) && ts.isIdentifier(element.name)) {
            const bindingName = cppUtils.escapeName(element.name.text);
            bindingNames.push(bindingName);
            // Track these variables for type inference
            this.ctx.variableTypes.set(bindingName, new ast.CppType('auto'));
          }
        }
        
        // Create structured binding: const auto& [k, v] = tempParam;
        const destructuringCode = `const auto& [${bindingNames.join(', ')}] = ${tempParamName};`;
        destructuringStatements.push(new ast.RawStatement(destructuringCode));
        
        continue;
      }
      
      const paramName = cppUtils.escapeName(param.name.getText());
      // For lambdas, use auto for parameter types unless explicitly typed
      const paramType = param.type ? this.mapType(param.type) : new ast.CppType('auto');
      
      // Check if parameter type is an interface - interfaces must be passed by const reference
      const isInterface = param.type && ts.isTypeReferenceNode(param.type) && 
                          this.ctx.interfaceNames.has(cppUtils.escapeName(param.type.typeName.getText()));
      
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
      this.ctx.variableTypes.set(paramName, paramType);
      
      // Register parameter with ownership checker for type lookups
      this.ownershipChecker.registerVariable(paramName, param);
    }
    
    // Get return type if specified, otherwise undefined (C++ will infer)
    const returnType = node.type ? this.mapType(node.type) : undefined;
    
    // Arrow function body can be an expression or a block
    let body: ast.Block | ast.Expression;
    if (ts.isBlock(node.body)) {
      const blockBody = this.visitBlock(node.body);
      // Prepend destructuring statements if any
      if (destructuringStatements.length > 0) {
        body = new ast.Block([...destructuringStatements, ...blockBody.statements]);
      } else {
        body = blockBody;
      }
    } else {
      // Expression body: (x) => x * 2
      // Convert to: [](auto x) { return x * 2; }
      const expr = this.visitExpression(node.body);
      // Prepend destructuring statements if any
      const bodyStatements = destructuringStatements.length > 0 
        ? [...destructuringStatements, new ast.ReturnStmt(expr)]
        : [new ast.ReturnStmt(expr)];
      body = new ast.Block(bodyStatements);
    }
    
    // Create a lambda expression
    // Use [] (no capture) for lambdas since most are pure functions passed to array methods
    // If we need to capture variables, we would need to analyze which ones are referenced
    return new ast.Lambda(params, body, returnType, '[]');
  }
  
  /**
   * Visit a generic arrow function (e.g., const reverseArray = <T>(arr: T[]): T[] => {...})
   * Generates a template function instead of a std::function variable
   */
  private visitGenericArrowFunction(name: string, node: ts.ArrowFunction): ast.Function {
    const isAsync = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
    
    // Extract template parameters
    const templateParams: string[] = [];
    if (node.typeParameters) {
      for (const typeParam of node.typeParameters) {
        const paramName = typeParam.name.text;
        templateParams.push(paramName);
        this.ctx.registerTemplateParameter(paramName);
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
    let returnType: ast.CppType;
    if (node.type) {
      const typeText = node.type.getText();
      if (typeText.startsWith('Promise<')) {
        returnType = this.mapType(node.type);
      } else {
        const baseType = this.mapType(node.type);
        returnType = isAsync ? cpp.task(baseType) : baseType;
      }
    } else {
      returnType = isAsync ? cpp.task(new ast.CppType('auto')) : new ast.CppType('auto');
    }
    
    // Track async state for return statement handling
    const previousIsAsync = this.ctx.currentFunctionIsAsync;
    this.ctx.currentFunctionIsAsync = isAsync;
    
    // Extract function body
    let body: ast.Block;
    if (ts.isBlock(node.body)) {
      body = this.visitBlock(node.body);
    } else {
      // Expression body: (x) => x * 2
      const expr = this.visitExpression(node.body);
      body = new ast.Block([isAsync ? cpp.coReturn(expr) : new ast.ReturnStmt(expr)]);
    }
    
    // Restore async state
    this.ctx.currentFunctionIsAsync = previousIsAsync;
    
    // Clear template parameters after processing function
    if (node.typeParameters) {
      for (const typeParam of node.typeParameters) {
        this.ctx.unregisterTemplateParameter(typeParam.name.text);
      }
    }
    
    // Create template function
    return new ast.Function(name, returnType, params, body, templateParams, isAsync);
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
      
      // Special handling for .push() on Array<share<T>> and Array<use<T>>
      // If pushing to an array of shared_ptrs, wrap the argument
      // If pushing to an array of weak_ptrs, don't wrap (shared_ptr implicitly converts to weak_ptr)
      if (methodName === 'push' && index === 0 && objNode && this.checker) {
        // Use OwnershipAwareTypeChecker to check if array has smart pointer elements
        const arrayHasSharedElements = this.ownershipChecker.hasSmartPointerElements(objNode, this.ctx.interfaceNames);
        
        if (arrayHasSharedElements) {
          // Get the element type from the array type
          const arrayType = this.ownershipChecker.getTypeOfExpression(objNode);
          const elementType = arrayType?.elementType?.baseType;
          const elementOwnership = arrayType?.elementType?.ownership;
          
          if (elementType && elementOwnership) {
            // Check if the argument is already a smart pointer using OwnershipAwareTypeChecker
            const argOwnership = this.ownershipChecker.getTypeOfExpression(arg);
            const isAlreadyShared = argOwnership?.ownership === 'share';
            
            // If array element is use<T> (weak_ptr), don't wrap - shared_ptr converts to weak_ptr
            // If array element is share<T> and arg is not already shared, wrap it
            if (elementOwnership === 'share' && !isAlreadyShared) {
              argExpr = cpp.call(cpp.id(`std::make_shared<gs::${elementType}>`), [argExpr]);
            }
            // For use<T> arrays, don't wrap - shared_ptr implicitly converts to weak_ptr
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
            // Check if we're inside this class (use template params) or outside (explicit instantiation)
            const currentClass = this.getCurrentClassName();
            if (currentClass === objName && this.ctx.currentTemplateParams.length > 0) {
              // Inside the template class, use template params: ClassName<T>::method
              const templateArgs = this.ctx.currentTemplateParams.join(', ');
              return cpp.call(cpp.id(`gs::${objName}<${templateArgs}>::${methodName}`), args);
            } else {
              // Outside or non-template class: ClassName::method
              return cpp.call(cpp.id(`gs::${objName}::${methodName}`), args);
            }
          }
        }
      }
      
      // Special case: number instance methods (toFixed, toExponential, toPrecision, toString)
      // value.toFixed(2) → gs::Number::toFixed(value, 2)
      // value.toString() → gs::Number::toString(value)
      // arr[i].toString() → gs::Number::toString(arr.at_ref(i))
      if (this.checker && (methodName === 'toFixed' || methodName === 'toExponential' || methodName === 'toPrecision' || methodName === 'toString')) {
        const objType = this.checker.getTypeAtLocation(objNode);
        const objTypeStr = this.checker.typeToString(objType);
        if (objTypeStr === 'number') {
          const objExpr = this.visitExpression(objNode);
          // Note: at_ref() returns T& (reference), so no dereferencing needed
          
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
      // For array subscripts: at_ref() returns T& where T is the element type
      //   - If elements are smart pointers (Array<share<T>>), at_ref() returns shared_ptr<T>& → use ->
      //   - If elements are values (Array<string>), at_ref() returns gs::String& → use .
      const isArraySubscript = ts.isElementAccessExpression(objNode);
      let isPointer = false;
      
      if (isArraySubscript) {
        // Check if array has smart pointer elements
        const arrayExpr = (objNode as ts.ElementAccessExpression).expression;
        const hasSmartPtrElements = this.ownershipChecker.hasSmartPointerElements(
          arrayExpr,
          this.ctx.interfaceNames
        );
        isPointer = hasSmartPtrElements;
      } else {
        // For non-array access, check if it's a smart pointer type
        isPointer = this.isSmartPointerAccess(objNode);
      }
      
      // If objExpr is a unary expression (like *arr[i]) and we're using ->, wrap in parens
      // Because *a->b is parsed as *(a->b), but we want (*a)->b
      let memberObj: ast.Expression = objExpr;
      if (objExpr instanceof ast.UnaryExpr && isPointer) {
        memberObj = cpp.paren(objExpr);
      }
      
      // Optimization: str.charAt(i) when used in comparisons → charCodeAt(i) for performance
      // Pattern: str.charAt(i) === 'x' → str.charCodeAt(i) == 'x'.charCodeAt(0)
      // This avoids allocating a new String object per character
      if (methodName === 'charAt' && this.checker) {
        const objType = this.checker.getTypeAtLocation(objNode);
        const objTypeStr = this.checker.typeToString(objType);
        if (objTypeStr === 'string') {
          // Check if parent is a comparison (===, !==, ==, !=)
          const parent = node.parent;
          if (parent && ts.isBinaryExpression(parent) &&
              (parent.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken ||
               parent.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
               parent.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken ||
               parent.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsToken)) {
            // Use charCodeAt instead for integer comparison (faster)
            return cpp.call(cpp.member(memberObj, 'charCodeAt', isPointer), args);
          }
        }
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
        const varType = this.ctx.variableTypes.get(varName);
        
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
        if (this.ownershipChecker.hasSmartPointerElements(argNode.expression, this.ctx.interfaceNames)) {
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
      if (this.ctx.enumNames.has(objName)) {
        return cpp.id(`gs::${objName}::${cppUtils.escapeName(prop)}`);
      }
      
      // Check if it's a static class member access
      // For generic classes, we need ClassName<T>::member syntax
      if (this.checker) {
        const symbol = this.checker.getSymbolAtLocation(node.expression);
        if (symbol && (symbol.flags & ts.SymbolFlags.Class)) {
          // Get the current class context to determine template parameters
          const currentClass = this.getCurrentClassName();
          // If accessing a static member from within the same class, include template params
          if (currentClass === objName && this.ctx.currentTemplateParams.length > 0) {
            const templateArgs = this.ctx.currentTemplateParams.join(', ');
            return cpp.id(`${objName}<${templateArgs}>::${cppUtils.escapeName(prop)}`);
          }
          // For access from outside, we'd need to infer the template arguments
          // For now, just use the class name without template params for non-matching context
          return cpp.id(`${objName}::${cppUtils.escapeName(prop)}`);
        }
      }
      
      if (objName === 'console' || objName === 'Math' || objName === 'Number' || objName === 'JSON' || objName === 'Date' || objName === 'String') {
        return cpp.id(`gs::${objName}::${prop}`);
      }
      
      // Check if this is property access on a LiteralObject
      const varType = this.ctx.variableTypes.get(objName);
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
      const fieldType = this.ctx.variableTypes.get(fieldName);
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
        const fieldType = this.ctx.variableTypes.get(fieldName);
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
        const varType = this.ctx.variableTypes.get(varName);
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
        const varType = this.ctx.variableTypes.get(varName);
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
    
    // Check if object is an array subscript (arr[i])
    // at_ref() returns T& where T is the element type
    // - For Array<gs::String>, returns gs::String& → use .
    // - For Array<shared_ptr<T>>, returns shared_ptr<T>& → use ->
    const isArraySubscript = ts.isElementAccessExpression(node.expression);
    
    let isPointer = false;
    if (isArraySubscript) {
      // Check if the array has smart pointer elements
      const arrayExpr = node.expression.expression;
      const hasSmartPtrElements = this.ownershipChecker.hasSmartPointerElements(
        arrayExpr,
        this.ctx.interfaceNames
      );
      isPointer = hasSmartPtrElements;
    } else {
      // For non-array access, check if it's a smart pointer type
      isPointer = this.isSmartPointerAccess(node.expression);
    }
    
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
    return this.typeMapper.mapTypeNode(typeNode);
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
    return ExpressionAnalyzer.isPrimitiveType(type);
  }
  
  /**
   * Check if a variable can be const in C++.
   * - Primitives (number, bool): yes
   * - Strings: yes (immutable in TypeScript)
   * - Objects created with new: no (mutable)
   * - Other types: yes if not a new expression
   */
  private isConstableType(type: ast.CppType, initializer?: ts.Expression): boolean {
    return ExpressionAnalyzer.isConstableType(type, initializer);
  }
  
  /**
   * Check if a property access should use -> (for smart pointers) instead of .
   */
  private isSmartPointerAccess(expr: ts.Expression): boolean {
    // FIRST: Try OwnershipChecker (most reliable - preserves ownership semantics)
    if (this.ownershipChecker.requiresPointerAccess(expr)) {
      return true;
    }
    
    // SECOND: Check if it's an identifier and look up its type in variableTypes map
    if (ts.isIdentifier(expr)) {
      const varName = cppUtils.escapeName(expr.text);
      const varType = this.ctx.variableTypes.get(varName);
      
      // If we have the type tracked, use it
      if (varType) {
        // Check if it's a direct smart pointer
        if (cppUtils.isSmartPointerType(varType)) {
          return true;
        }
        
        // Check if it's an unwrapped optional<smart_ptr<T>>
        if (this.ctx.unwrappedOptionals.has(varName)) {
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
      
      // Fallback: use ownership checker to infer type from AST (for unwrapped optionals)
      if (this.ctx.unwrappedOptionals.has(varName)) {
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
        const fieldType = this.ctx.variableTypes.get(fieldName);
        if (fieldType) {
          return cppUtils.isSmartPointerType(fieldType);
        }
      }
    }
    
    // Check if it's an array subscript with share<T> elements
    // arr[i] where arr is Array<share<Person>> returns shared_ptr<Person>
    // ALSO: arr[i] where arr is Shape[] (interface array) returns shared_ptr<Shape>
    if (ts.isElementAccessExpression(expr)) {
      if (this.ownershipChecker.hasSmartPointerElements(expr.expression, this.ctx.interfaceNames)) {
        return true;
      }
      
      // Check if array element type is an interface (which we wrap in shared_ptr)
      if (this.checker && ts.isIdentifier(expr.expression)) {
        const varType = this.ctx.variableTypes.get(cppUtils.escapeName(expr.expression.text));
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
   * Check if array access is within provably safe bounds.
   * Detects patterns like: for (let i = 0; i < arr.length; i++) { arr[i] = ... }
   * where the index is guaranteed to be in bounds.
   * 
   * SAFETY: Only optimizes when we can PROVE bounds are safe:
   * - Loop variable matches array index
   * - Loop limit is arr.length or arr.length - N (same array)
   * - Index offset (if any) is accounted for in loop limit
   */
  private isArrayAccessInSafeBounds(arrayAccess: ts.ElementAccessExpression): boolean {
    return ExpressionAnalyzer.isArrayAccessInSafeBounds(arrayAccess);
  }
  /**
   * Check if array access is used as an lvalue (left side of assignment).
   * We should not use at_ref() for lvalues because they need to return a reference that can be assigned to.
   */
  private isArrayAccessUsedAsLValue(arrayAccess: ts.ElementAccessExpression): boolean {
    return ExpressionAnalyzer.isArrayAccessUsedAsLValue(arrayAccess);
  }
  
  /**
   * Check if the array index is simple enough for at_ref() optimization.
   * Simple indices are: identifiers, numeric literals, or simple arithmetic (i+1, i-1).
   */
  private isSimpleArrayIndex(indexExpr: ts.Expression): boolean {
    return ExpressionAnalyzer.isSimpleArrayIndex(indexExpr);
  }
  
  /**
   * Inline local variable references in an expression with their initializers.
   * This is used in constructor member initializers to avoid using variables
   * that are defined in the constructor body (which comes after the init list in C++).
   */
  private inlineLocalVars(expr: ts.Expression, localVars: Map<string, ts.Expression>): ts.Expression {
    const transformer = <T extends ts.Node>(context: ts.TransformationContext) => {
      const visit = (node: ts.Node): ts.Node => {
        // If this is an identifier that references a local variable, replace it
        if (ts.isIdentifier(node)) {
          const varName = node.text;
          const initializer = localVars.get(varName);
          if (initializer) {
            // Recursively inline in case the initializer also references other locals
            return this.inlineLocalVars(initializer, localVars);
          }
        }
        
        // Recursively visit children
        return ts.visitEachChild(node, visit, context);
      };
      
      return (node: T) => ts.visitNode(node, visit) as T;
    };
    
    const result = ts.transform(expr, [transformer]);
    const transformed = result.transformed[0];
    result.dispose();
    return transformed as ts.Expression;
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
    
    // Track local variables defined in constructor that might be used in member initializers
    const localVars = new Map<string, ts.Expression>();
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      
      // Track const variable declarations for potential inlining in member initializers
      if (ts.isVariableStatement(stmt)) {
        for (const decl of stmt.declarationList.declarations) {
          if (ts.isIdentifier(decl.name) && decl.initializer) {
            const varName = decl.name.text;
            localVars.set(varName, decl.initializer);
          }
        }
      }
      
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
              // Check if the right side references a local variable that should be inlined
              // For example: this.table = new Array(capacity) where capacity was just defined
              const exprWithInlining = this.inlineLocalVars(binExpr.right, localVars);
              value = this.visitExpression(exprWithInlining);
            }
            
            // Check if field type is optional and value is nullptr - use std::nullopt
            const fieldTypeKey = `this.${fieldName}`;
            const fieldType = this.ctx.variableTypes.get(fieldTypeKey);
            if (fieldType && value instanceof ast.Identifier && value.name === 'nullptr') {
              const fieldTypeStr = fieldType.toString();
              if (fieldTypeStr.startsWith('std::optional<')) {
                value = cpp.id('std::nullopt');
              }
            }
            
            // Fix up array type if it was inferred as gs::any
            // When we have: this.field = new Array(n).fill(null)
            // And field type is gs::Array<T>, use that T instead of inferred 'any'
            if (fieldType && value instanceof ast.CallExpr) {
              const valueStr = value.toString();
              if (valueStr.includes('gs::Array<gs::any>') && fieldType.toString().startsWith('gs::Array<')) {
                // Extract correct element type from field type
                const fieldTypeStr = fieldType.toString();
                const match = fieldTypeStr.match(/gs::Array<(.+)>/);
                if (match) {
                  const correctType = match[1];
                  // Reconstruct the call expression with correct type
                  // This is a bit hacky, but works for Array constructor calls
                  const fixedStr = valueStr.replace(/gs::Array<gs::any>/g, `gs::Array<${correctType}>`);
                  value = new ast.RawExpression(fixedStr);
                }
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
    return LambdaAnalyzer.doesLambdaModifyParameter(node, paramName);
  }
  
  /**
   * Check if source file contains async functions/methods/arrow functions
   * Returns true if cppcoro support is needed
   */
  private sourceFileHasAsync(sourceFile: ts.SourceFile): boolean {
    return LambdaAnalyzer.sourceFileHasAsync(sourceFile);
  }
  
  /**
   * Check if an arrow function uses any variables from the enclosing scope (closure)
   * Returns true if the function captures external variables, false otherwise
   */
  private arrowFunctionUsesClosure(node: ts.ArrowFunction, sourceFile: ts.SourceFile, functionName?: string): boolean {
    return LambdaAnalyzer.arrowFunctionUsesClosure(node, sourceFile, functionName);
  }

  /**
   * Visit a non-closure arrow function and convert to a regular function declaration
   * This avoids the overhead of std::function wrapper for functions that don't capture variables
   */
  private visitNonClosureArrowFunction(name: string, node: ts.ArrowFunction): ast.Function {
    const isAsync = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
    
    // Extract function parameters
    const params: ast.Parameter[] = [];
    for (const param of node.parameters) {
      const paramName = cppUtils.escapeName(param.name.getText());
      const paramType = param.type ? this.mapType(param.type) : new ast.CppType('double');
      
      // Check if parameter should be passed by reference
      const isInterface = param.type && ts.isTypeReferenceNode(param.type) && 
                          this.ctx.interfaceNames.has(cppUtils.escapeName(param.type.typeName.getText()));
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
      this.ctx.variableTypes.set(paramName, paramType);
      this.ownershipChecker.registerVariable(paramName, param);
    }
    
    // Get return type
    let returnType: ast.CppType;
    if (node.type) {
      const typeText = node.type.getText();
      if (typeText.startsWith('Promise<')) {
        returnType = this.mapType(node.type);
      } else {
        const baseType = this.mapType(node.type);
        returnType = isAsync ? cpp.task(baseType) : baseType;
      }
    } else {
      const baseType = tsUtils.arrowFunctionHasReturnValue(node) ? new ast.CppType('double') : new ast.CppType('void');
      returnType = isAsync ? cpp.task(baseType) : baseType;
    }
    
    // Track async state for return statement handling
    const previousIsAsync = this.ctx.currentFunctionIsAsync;
    this.ctx.currentFunctionIsAsync = isAsync;
    
    // Convert body
    let body: ast.Block;
    if (ts.isBlock(node.body)) {
      body = this.visitBlock(node.body);
    } else {
      // Expression body: convert to return statement
      const expr = this.visitExpression(node.body);
      body = new ast.Block([isAsync ? cpp.coReturn(expr) : new ast.ReturnStmt(expr)]);
    }
    
    // Restore async state
    this.ctx.currentFunctionIsAsync = previousIsAsync;
    
    return new ast.Function(name, returnType, params, body, [], isAsync);
  }
}

// Export as CppCodegen for backward compatibility
export { AstCodegen as CppCodegen };
