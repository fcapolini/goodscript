/**
 * C++ Code Generator
 * 
 * IR → C++ code generation
 */

import * as path from 'path';
import type {
  IRProgram,
  IRModule,
  IRDeclaration,
  IRFunctionDecl,
  IRClassDecl,
  IRInterfaceDecl,
  IRBlock,
  IRInstruction,
  IRTerminator,
  IRExpr,
  IRType,
  IRParam,
  SourceLocation,
  IRFunctionBody,
  IRStatement,
  IRExpression,
} from '../../ir/types.js';
import { Ownership, PrimitiveType, BinaryOp } from '../../ir/types.js';
import { types } from '../../ir/builder.js';

type MemoryMode = 'ownership' | 'gc';

// C++ reserved keywords that need to be sanitized
// C++ language keywords (not safe as identifiers in any context)
const CPP_KEYWORDS = new Set([
  'alignas', 'alignof', 'and', 'and_eq', 'asm', 'auto', 'bitand', 'bitor',
  'bool', 'break', 'case', 'catch', 'char', 'char8_t', 'char16_t', 'char32_t',
  'class', 'compl', 'concept', 'const', 'consteval', 'constexpr', 'constinit',
  'const_cast', 'continue', 'co_await', 'co_return', 'co_yield', 'decltype',
  'default', 'delete', 'do', 'double', 'dynamic_cast', 'else', 'enum', 'explicit',
  'export', 'extern', 'false', 'float', 'for', 'friend', 'goto', 'if', 'inline',
  'int', 'long', 'mutable', 'namespace', 'new', 'noexcept', 'not', 'not_eq',
  'nullptr', 'operator', 'or', 'or_eq', 'private', 'protected', 'public',
  'register', 'reinterpret_cast', 'requires', 'return', 'short', 'signed',
  'sizeof', 'static', 'static_assert', 'static_cast', 'struct', 'switch',
  'template', 'this', 'thread_local', 'throw', 'true', 'try', 'typedef',
  'typeid', 'typename', 'union', 'unsigned', 'using', 'virtual', 'void',
  'volatile', 'wchar_t', 'while', 'xor', 'xor_eq',
]);

// Standard library names to avoid for top-level identifiers
const CPP_STDLIB_NAMES = new Set([
  'std', 'string', 'vector', 'map', 'set', 'list', 'array', 'pair', 'tuple',
  'unique_ptr', 'shared_ptr', 'weak_ptr', 'function', 'optional', 'variant',
]);

const CPP_RESERVED_KEYWORDS = new Set([...CPP_KEYWORDS, ...CPP_STDLIB_NAMES]);

export class CppCodegen {
  private mode: MemoryMode;
  private sourceMap = false;
  private indent = 0;
  private output: string[] = [];
  private currentNamespace: string[] = [];
  private structRegistry = new Map<string, { name: string; fields: Array<{ name: string; type: IRType }> }>();
  private structCounter = 0;
  private isAsyncContext = false;  // Track if we're in an async function (for co_return vs return)

  constructor(mode: MemoryMode = 'gc') {
    this.mode = mode;
  }

  /**
   * Sanitize identifier to avoid C++ reserved keywords
   */
  private sanitizeIdentifier(name: string): string {
    if (CPP_RESERVED_KEYWORDS.has(name)) {
      return `${name}_`;
    }
    return name;
  }

  generate(program: IRProgram, mode: MemoryMode, sourceMap = false): Map<string, string> {
    this.mode = mode;
    this.sourceMap = sourceMap;
    const files = new Map<string, string>();

    for (const module of program.modules) {
      // Get relative or base filenames for output
      const baseName = path.basename(module.path);
      const relativeHeaderPath = baseName.replace(/-gs\.(tsx?)|\.(gs|js|tsx?)$/, '.hpp');
      const relativeSourcePath = baseName.replace(/-gs\.(tsx?)|\.(gs|js|tsx?)$/, '.cpp');
      
      // Generate header file
      this.output = [];
      this.indent = 0;
      this.generateHeader(module);
      files.set(relativeHeaderPath, this.output.join('\n'));

      // Generate source file (use relative path in #include)
      this.output = [];
      this.indent = 0;
      this.generateSource(module, relativeHeaderPath);
      files.set(relativeSourcePath, this.output.join('\n'));
    }

    return files;
  }

  private getNamespaceName(modulePath: string): string[] {
    // Extract just the filename without directory path or extension
    // /Users/bilbo/.../main-gs.ts -> main
    // src/math/vector-gs.ts -> vector
    const basename = path.basename(modulePath)
      .replace(/-gs\.(tsx?)$/, '')  // Remove -gs.ts, -gs.tsx
      .replace(/\.(gs|js|tsx?)$/, '');  // Remove .ts, .js, .tsx, .jsx
    
    let name = basename.replace(/-/g, '_');  // Replace dashes with underscores
    
    // Prefix with underscore if starts with digit
    if (/^\d/.test(name)) {
      name = '_' + name;
    }
    
    // Sanitize to avoid C++ reserved keywords
    name = this.sanitizeIdentifier(name);
    
    return ['goodscript', name];
  }

  // ========================================================================
  // Header File Generation
  // ========================================================================

  private generateHeader(module: IRModule): void {
    // Reset struct registry for each module
    this.structRegistry.clear();
    this.structCounter = 0;
    
    const guard = this.getIncludeGuard(module.path);
    this.emit(`#pragma once`);
    this.emit(`#ifndef ${guard}`);
    this.emit(`#define ${guard}`);
    this.emit('');

    // GoodScript runtime
    if (this.mode === 'gc') {
      this.emit('#include "runtime/cpp/gc/gs_gc_runtime.hpp"');
    } else {
      this.emit('#include "runtime/cpp/ownership/gs_runtime.hpp"');
    }
    
    // cppcoro for async/await support (if module contains async functions)
    if (this.moduleUsesAsync(module)) {
      this.emit('#include <cppcoro/task.hpp>');
    }
    
    this.emit('');

    // Module imports -> #includes
    for (const imp of module.imports) {
      // Use basename for imports too
      const baseName = path.basename(imp.from.replace(/^\.\//, ''));
      const headerPath = baseName.replace(/-gs\.(tsx?)|\.(gs|js|tsx?)$/, '.hpp');
      this.emit(`#include "${headerPath}"`);
    }

    if (module.imports.length > 0) {
      this.emit('');
    }

    // Namespace
    this.currentNamespace = this.getNamespaceName(module.path);
    for (const ns of this.currentNamespace) {
      this.emit(`namespace ${ns} {`);
    }
    this.emit('');

    // Forward declarations for classes
    for (const decl of module.declarations) {
      if (decl.kind === 'class') {
        this.emit(`class ${decl.name};`);
      }
    }
    if (module.declarations.some(d => d.kind === 'class')) {
      this.emit('');
    }

    // Type aliases and interfaces (as struct forward decls)
    for (const decl of module.declarations) {
      if (decl.kind === 'interface') {
        this.emit(`struct ${decl.name};`);
      }
    }

    // Anonymous struct definitions (from object literals)
    // Pre-scan declarations and init statements to populate the struct registry
    this.preScanDeclarations(module.declarations);
    if (module.initStatements) {
      for (const stmt of module.initStatements) {
        this.preScanStatement(stmt);
      }
    }
    if (this.structRegistry.size > 0) {
      this.generateStructDefinitions();
    }

    // Declarations
    for (const decl of module.declarations) {
      this.generateHeaderDeclaration(decl);
      this.emit('');
    }

    // Lambda literal definitions (inline in header since they can't be forward-declared)
    // Only emit lambda literals, not function calls that return lambdas
    for (const decl of module.declarations) {
      if (decl.kind === 'const' && decl.type.kind === 'function' && decl.value.kind === 'lambda') {
        this.emit(`inline auto ${this.sanitizeIdentifier(decl.name)} = ${this.generateExpr(decl.value)};`);
      }
    }
    if (module.declarations.some(d => d.kind === 'const' && d.type.kind === 'function' && d.value.kind === 'lambda')) {
      this.emit('');
    }

    // Close namespace
    for (let i = this.currentNamespace.length - 1; i >= 0; i--) {
      this.emit(`}  // namespace ${this.currentNamespace[i]}`);
    }
    this.emit('');
    this.emit(`#endif  // ${guard}`);
  }

  private getIncludeGuard(modulePath: string): string {
    // Extract just the filename: /path/to/vector-gs.ts -> GOODSCRIPT_VECTOR_HPP_
    const basename = path.basename(modulePath)
      .replace(/-gs\.(tsx?)$/, '')
      .replace(/\.(gs|js|tsx?)$/, '');
    
    return 'GOODSCRIPT_' + basename
      .replace(/[\/\.\-]/g, '_')  // Replace slashes, dots, and dashes with underscores
      .toUpperCase() + '_HPP_';
  }

  private moduleUsesAsync(module: IRModule): boolean {
    // Check if any function or method is async
    for (const decl of module.declarations) {
      if (decl.kind === 'function' && decl.async) {
        return true;
      }
      if (decl.kind === 'class') {
        for (const method of decl.methods) {
          if (method.async) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private generateHeaderDeclaration(decl: IRDeclaration): void {
    switch (decl.kind) {
      case 'function':
        this.generateHeaderFunction(decl);
        break;
      case 'class':
        this.generateHeaderClass(decl);
        break;
      case 'interface':
        this.generateHeaderInterface(decl);
        break;
      case 'const':
        // Emit header declarations for non-lambda function constants
        // Lambda literals are emitted inline later, so skip them here
        if (decl.type.kind === 'function' && decl.value.kind !== 'lambda') {
          // Function-type const that's not a lambda literal (e.g., result of function call)
          // Use std::function wrapper for extern declaration
          const funcType = this.generateCppType(decl.type);
          this.emit(`extern ${funcType} ${this.sanitizeIdentifier(decl.name)};`);
        } else if (decl.type.kind !== 'function') {
          // Regular (non-function) constants
          this.generateHeaderConst(decl);
        }
        // Lambda literals are emitted inline after declarations
        break;
    }
  }

  private generateHeaderFunction(func: IRFunctionDecl): void {
    // For functions returning lambdas, use auto to avoid std::function overhead
    const returnType = func.returnType.kind === 'function' ? 'auto' : this.generateCppType(func.returnType);
    const params = func.params.map(p => this.generateParam(p)).join(', ');
    this.emit(`${returnType} ${this.sanitizeIdentifier(func.name)}(${params});`);
  }

  private generateHeaderClass(cls: IRClassDecl): void {
    const inheritance = cls.extends ? ` : public ${cls.extends}` : '';
    const className = this.sanitizeIdentifier(cls.name);
    this.emit(`class ${className}${inheritance} {`);
    this.emit('public:');
    this.indent++;

    // Constructor
    if (cls.constructor) {
      const params = cls.constructor.params.map(p => this.generateCppParam(p)).join(', ');
      this.emit(`${className}(${params});`);
      this.emit('');
    }

    // Methods
    for (const method of cls.methods) {
      const staticMod = method.isStatic ? 'static ' : '';
      const returnType = this.generateCppType(method.returnType);
      const params = method.params.map(p => this.generateParam(p)).join(', ');
      this.emit(`${staticMod}${returnType} ${this.sanitizeIdentifier(method.name)}(${params});`);
    }

    // Fields (public by default to match TypeScript/JavaScript semantics)
    if (cls.fields.length > 0) {
      this.emit('');
    }
    for (const field of cls.fields) {
      const constMod = field.isReadonly ? 'const ' : '';
      this.emit(`${constMod}${this.generateCppType(field.type)} ${this.sanitizeIdentifier(field.name)}_;`);
    }

    this.indent--;
    this.emit('};');
  }

  private generateHeaderInterface(iface: IRInterfaceDecl): void {
    const ifaceName = this.sanitizeIdentifier(iface.name);
    this.emit(`struct ${ifaceName} {`);
    this.indent++;

    // Properties (public fields)
    for (const prop of iface.properties) {
      this.emit(`${this.generateCppType(prop.type)} ${this.sanitizeIdentifier(prop.name)};`);
    }

    // Methods (pure virtual)
    for (const method of iface.methods) {
      const returnType = this.generateCppType(method.returnType);
      const params = method.params.map(p => this.generateCppParam(p)).join(', ');
      this.emit(`virtual ${returnType} ${this.sanitizeIdentifier(method.name)}(${params}) = 0;`);
    }

    this.emit('');
    this.emit('virtual ~' + ifaceName + '() = default;');

    this.indent--;
    this.emit('};');
  }

  private generateHeaderConst(constDecl: any): void {
    // For function types (lambdas), use auto since lambda types can't be expressed explicitly
    if (constDecl.type.kind === 'function') {
      this.emit(`extern auto ${this.sanitizeIdentifier(constDecl.name)};`);
      return;
    }
    
    // For mutable types (Map, Array, objects), don't use const in C++
    // TypeScript const means the binding is const, not the value
    const needsConst = constDecl.type.kind === 'primitive' || 
                       (constDecl.type.kind === 'own' && constDecl.type.inner.kind === 'primitive') ||
                       (constDecl.type.kind === 'share' && constDecl.type.inner.kind === 'primitive');
    
    const typeStr = needsConst 
      ? `const ${this.generateCppType(constDecl.type)}`
      : this.generateCppType(constDecl.type);
    this.emit(`extern ${typeStr} ${this.sanitizeIdentifier(constDecl.name)};`);
  }

  // ========================================================================
  // Source File Generation
  // ========================================================================

  private generateSource(module: IRModule, headerPath: string): void {
    // Include own header
    this.emit(`#include "${headerPath}"`);
    this.emit('');

    // Additional includes for implementation
    this.emit('#include <iostream>');
    this.emit('#include <stdexcept>');
    this.emit('');

    // Namespace
    this.currentNamespace = this.getNamespaceName(module.path);
    for (const ns of this.currentNamespace) {
      this.emit(`namespace ${ns} {`);
    }
    this.emit('');

    // Implementations
    for (const decl of module.declarations) {
      this.generateSourceDeclaration(decl);
      this.emit('');
    }

    // Close namespace
    for (let i = this.currentNamespace.length - 1; i >= 0; i--) {
      this.emit(`}  // namespace ${this.currentNamespace[i]}`);
    }

    // Generate main() if there are top-level statements
    if (module.initStatements && module.initStatements.length > 0) {
      this.emit('');
      this.emit('int main(int argc, char* argv[]) {');
      this.indent++;
      this.emit('// Initialize process.argv');
      this.emit('gs::process::init(argc, argv);');
      this.emit('');
      // Add using namespace directive to access module-level constants
      if (this.currentNamespace.length > 0) {
        this.emit(`// Import module namespace`);
        this.emit(`using namespace ${this.currentNamespace.join('::')}; `);
        this.emit('');
      }
      this.emit('// Execute top-level statements');
      for (const stmt of module.initStatements) {
        this.generateStatement(stmt);
      }
      this.emit('');
      this.emit('return 0;');
      this.indent--;
      this.emit('}');
    }
  }

  private generateSourceDeclaration(decl: IRDeclaration): void {
    switch (decl.kind) {
      case 'function':
        this.generateSourceFunction(decl);
        break;
      case 'class':
        this.generateSourceClass(decl);
        break;
      case 'interface':
        // Interfaces are header-only (no source file implementation needed)
        break;
      case 'const':
        // Emit lambda literals in header (inline), but function-type const variables
        // that are initialized with function calls need to be in the source file
        if (decl.type.kind === 'function' && decl.value.kind === 'lambda') {
          // Skip - already emitted inline in header
        } else {
          this.generateSourceConst(decl);
        }
        break;
    }
  }

  private generateSourceFunction(func: IRFunctionDecl): void {
    // For functions returning lambdas, use auto to avoid std::function overhead
    const returnType = func.returnType.kind === 'function' ? 'auto' : this.generateCppType(func.returnType);
    const params = func.params.map(p => this.generateCppParam(p)).join(', ');
    
    // Emit source location for function declaration
    this.emitSourceLocation(func.source);
    
    this.emit(`${returnType} ${this.sanitizeIdentifier(func.name)}(${params}) {`);
    this.indent++;
    this.generateFunctionBody(func.body, func.async);
    this.indent--;
    this.emit('}');
  }

  private generateSourceClass(cls: IRClassDecl): void {
    // Constructor implementation
    if (cls.constructor) {
      const className = this.sanitizeIdentifier(cls.name);
      const params = cls.constructor.params.map(p => this.generateCppParam(p)).join(', ');
      
      // Generate initializer list from:
      // 1. Constructor parameters that match field names
      // 2. Field initializers (for fields with default values)
      const fieldInits: string[] = [];
      for (const field of cls.fields) {
        const param = cls.constructor.params.find(p => p.name === field.name);
        if (param) {
          // Field is initialized from constructor parameter
          fieldInits.push(`${this.sanitizeIdentifier(field.name)}_(${this.sanitizeIdentifier(param.name)})`);
        } else if (field.initializer) {
          // Field has a default initializer
          const initValue = this.generateExpression(field.initializer);
          fieldInits.push(`${this.sanitizeIdentifier(field.name)}_(${initValue})`);
        }
      }
      
      if (fieldInits.length > 0) {
        this.emit(`${className}::${className}(${params})`);
        this.indent++;
        for (let i = 0; i < fieldInits.length; i++) {
          const prefix = i === 0 ? ': ' : ', ';
          this.emit(`${prefix}${fieldInits[i]}`);
        }
        this.indent--;
        this.emit('{');
      } else {
        this.emit(`${className}::${className}(${params}) {`);
      }
      
      this.indent++;
      // Constructor body: skip if all fields were initialized via member initializer list
      // This handles the common pattern: constructor(a, b, c) { this.a = a; this.b = b; this.c = c; }
      // TODO: Properly filter out field assignments or transform constructor body
      if (fieldInits.length !== cls.fields.length) {
        this.generateFunctionBody(cls.constructor.body);
      }
      this.indent--;
      this.emit('}');
      this.emit('');
    }

    // Method implementations
    for (const method of cls.methods) {
      const staticMod = method.isStatic ? '' : `${this.sanitizeIdentifier(cls.name)}::`;
      const returnType = this.generateCppType(method.returnType);
      const params = method.params.map(p => this.generateCppParam(p)).join(', ');
      
      this.emit(`${returnType} ${staticMod}${this.sanitizeIdentifier(method.name)}(${params}) {`);
      this.indent++;
      this.generateFunctionBody(method.body, method.async);
      this.indent--;
      this.emit('}');
      
      if (method !== cls.methods[cls.methods.length - 1]) {
        this.emit('');
      }
    }
  }

  private generateSourceConst(constDecl: any): void {
    // For function types that aren't lambda literals, use std::function to match header
    // Lambda literals use auto and are emitted inline in header
    if (constDecl.type.kind === 'function') {
      const typeStr = constDecl.value.kind !== 'lambda'
        ? this.generateCppType(constDecl.type)
        : 'auto';
      this.emit(`${typeStr} ${this.sanitizeIdentifier(constDecl.name)} = ${this.generateExpr(constDecl.value)};`);
      return;
    }
    
    // For mutable types (Map, Array, objects), don't use const in C++
    const needsConst = constDecl.type.kind === 'primitive' || 
                       (constDecl.type.kind === 'own' && constDecl.type.inner.kind === 'primitive') ||
                       (constDecl.type.kind === 'share' && constDecl.type.inner.kind === 'primitive');
    
    const typeStr = needsConst 
      ? `const ${this.generateCppType(constDecl.type)}`
      : this.generateCppType(constDecl.type);
    this.emit(`${typeStr} ${this.sanitizeIdentifier(constDecl.name)} = ${this.generateExpr(constDecl.value)};`);
  }

  /**
   * Generate C++ code from AST-level function body
   */
  private generateFunctionBody(body: IRFunctionBody | IRBlock, isAsync?: boolean): void {
    // Track if we're in an async function for co_return vs return
    const wasAsync = this.isAsyncContext;
    this.isAsyncContext = isAsync ?? false;
    
    // Support both old IRBlock format (from tests) and new IRFunctionBody format
    if ('statements' in body) {
      // New AST-level format
      for (const stmt of body.statements) {
        this.generateStatement(stmt);
      }
    } else {
      // Old SSA-level format (IRBlock)
      for (const inst of body.instructions) {
        this.generateInstruction(inst);
      }
      this.generateTerminator(body.terminator);
    }
    
    this.isAsyncContext = wasAsync;
  }

  /**
   * Generate C++ code from AST-level statement
   */
  private generateStatement(stmt: IRStatement): void {
    switch (stmt.kind) {
      case 'variableDeclaration': {
        // For integer53 types, we need explicit type annotation since auto with literal 0
        // will infer int instead of int64_t
        const needsExplicitType = stmt.variableType.kind === 'primitive' && 
                                  stmt.variableType.type === PrimitiveType.Integer53;
        
        // Use const for immutable variables (const in source), omit for mutable (let in source)
        const constQualifier = stmt.mutable === false ? 'const ' : '';
        
        if (needsExplicitType) {
          const cppType = this.generateCppType(stmt.variableType);
          this.emit(`${constQualifier}${cppType} ${this.sanitizeIdentifier(stmt.name)} = ${stmt.initializer ? this.generateExpression(stmt.initializer) : '0'};`);
        } else {
          this.emit(`${constQualifier}auto ${this.sanitizeIdentifier(stmt.name)} = ${stmt.initializer ? this.generateExpression(stmt.initializer) : 'nullptr'};`);
        }
        break;
      }
      
      case 'assignment':
        this.emit(`${this.sanitizeIdentifier(stmt.target)} = ${this.generateExpression(stmt.value)};`);
        break;
      
      case 'expressionStatement':
        // Skip void expressions (like console.log) which generate nullptr
        const exprCode = this.generateExpression(stmt.expression);
        if (exprCode !== 'nullptr') {
          // Check if this is a call to an async function (returns Promise/task)
          // If so, we need to use cppcoro::sync_wait to execute it
          const isAsyncCall = stmt.expression.kind === 'call' && 
                             stmt.expression.type.kind === 'promise';
          
          if (isAsyncCall) {
            // Async function call at statement level needs sync_wait
            this.emit(`cppcoro::sync_wait(${exprCode});`);
          } else {
            this.emit(`${exprCode};`);
          }
        }
        break;
      
      case 'return':
        if (stmt.value) {
          const returnKeyword = this.isAsyncContext ? 'co_return' : 'return';
          const valueCode = this.generateExpression(stmt.value);
          // For void async functions, don't emit nullptr/undefined
          if (this.isAsyncContext && (valueCode === 'nullptr' || valueCode === 'undefined')) {
            this.emit(`${returnKeyword};`);
          } else {
            this.emit(`${returnKeyword} ${valueCode};`);
          }
        } else {
          const returnKeyword = this.isAsyncContext ? 'co_return' : 'return';
          this.emit(`${returnKeyword};`);
        }
        break;
      
      case 'throw':
        this.emit(`throw ${this.generateExpression(stmt.expression)};`);
        break;
      
      case 'try': {
        this.emit('try {');
        this.indent++;
        for (const tryStmt of stmt.tryBlock) {
          this.generateStatement(tryStmt);
        }
        this.indent--;
        this.emit('}');
        
        if (stmt.catchClause) {
          const catchVar = this.sanitizeIdentifier(stmt.catchClause.variable);
          // In C++, catch exceptions by const reference, not by value or unique_ptr
          // Always catch gs::Error& for GoodScript exceptions
          this.emit(`catch (const gs::Error& ${catchVar}) {`);
          this.indent++;
          for (const catchStmt of stmt.catchClause.body) {
            this.generateStatement(catchStmt);
          }
          this.indent--;
          this.emit('}');
        }
        
        if (stmt.finallyBlock) {
          // C++ doesn't have finally, but we can use RAII or scope guards
          // For now, just emit the code after the try-catch
          // TODO: Implement proper finally semantics with scope guard
          this.emit('// finally block (executed after try-catch)');
          this.emit('{');
          this.indent++;
          for (const finallyStmt of stmt.finallyBlock) {
            this.generateStatement(finallyStmt);
          }
          this.indent--;
          this.emit('}');
        }
        break;
      }
      
      case 'if':
        this.emit(`if (${this.generateExpression(stmt.condition)}) {`);
        this.indent++;
        for (const thenStmt of stmt.thenBranch) {
          this.generateStatement(thenStmt);
        }
        this.indent--;
        if (stmt.elseBranch) {
          this.emit('} else {');
          this.indent++;
          for (const elseStmt of stmt.elseBranch) {
            this.generateStatement(elseStmt);
          }
          this.indent--;
        }
        this.emit('}');
        break;
      
      case 'while':
        this.emit(`while (${this.generateExpression(stmt.condition)}) {`);
        this.indent++;
        for (const bodyStmt of stmt.body) {
          this.generateStatement(bodyStmt);
        }
        this.indent--;
        this.emit('}');
        break;
      
      case 'for': {
        // Traditional for loop: for (init; condition; increment) { body }
        const initCode = stmt.init ? this.generateStatementInline(stmt.init) : '';
        const condCode = stmt.condition ? this.generateExpression(stmt.condition) : '';
        const incrCode = stmt.increment ? this.generateExpression(stmt.increment) : '';
        
        // Check for StringBuilder optimization opportunity
        const sbOpportunity = this.mode === 'gc' ? this.detectStringBuilderOpportunity(stmt.body) : null;
        
        // Check for array reserve optimization opportunity (works in both GC and ownership modes)
        const arrayReserve = this.detectArrayReserveOpportunity(stmt.body, stmt.condition);
        
        if (arrayReserve) {
          // Emit reserve() before loop for better performance
          this.emit(`${this.sanitizeIdentifier(arrayReserve.arrayName)}.reserve(${arrayReserve.reserveSize});`);
        }
        
        if (sbOpportunity) {
          // Use StringBuilder for efficient string concatenation
          const { varName, stmtIndex, appendExpr } = sbOpportunity;
          const sbName = `${varName}_sb`;
          
          // Declare StringBuilder before loop
          this.emit(`gs::StringBuilder ${sbName};`);
          
          // Generate loop with append instead of concatenation
          this.emit(`for (${initCode}; ${condCode}; ${incrCode}) {`);
          this.indent++;
          
          for (let i = 0; i < stmt.body.length; i++) {
            if (i === stmtIndex) {
              // Replace concatenation with append
              this.emit(`${sbName}.append(${this.generateExpression(appendExpr)});`);
            } else {
              this.generateStatement(stmt.body[i]);
            }
          }
          
          this.indent--;
          this.emit('}');
          
          // Convert StringBuilder to String after loop
          this.emit(`${this.sanitizeIdentifier(varName)} = ${sbName}.toString();`);
        } else {
          // Normal for loop without StringBuilder optimization
          this.emit(`for (${initCode}; ${condCode}; ${incrCode}) {`);
          this.indent++;
          for (const bodyStmt of stmt.body) {
            this.generateStatement(bodyStmt);
          }
          this.indent--;
          this.emit('}');
        }
        break;
      }
      
      case 'for-of': {
        // Range-based for loop in C++
        const varName = this.sanitizeIdentifier(stmt.variable);
        const iterableCode = this.generateExpression(stmt.iterable);
        
        // Check for StringBuilder optimization opportunity
        const sbOpportunity = this.mode === 'gc' ? this.detectStringBuilderOpportunity(stmt.body) : null;
        
        if (sbOpportunity) {
          // Use StringBuilder for efficient string concatenation
          const { varName: concatVarName, stmtIndex, appendExpr } = sbOpportunity;
          const sbName = `${concatVarName}_sb`;
          
          // Declare StringBuilder before loop
          this.emit(`gs::StringBuilder ${sbName};`);
          
          // Generate loop with append instead of concatenation
          this.emit(`for (auto ${varName} : ${iterableCode}) {`);
          this.indent++;
          
          for (let i = 0; i < stmt.body.length; i++) {
            if (i === stmtIndex) {
              // Replace concatenation with append
              this.emit(`${sbName}.append(${this.generateExpression(appendExpr)});`);
            } else {
              this.generateStatement(stmt.body[i]);
            }
          }
          
          this.indent--;
          this.emit('}');
          
          // Convert StringBuilder to String after loop
          this.emit(`${this.sanitizeIdentifier(concatVarName)} = ${sbName}.toString();`);
        } else {
          // Normal for-of loop without StringBuilder optimization
          this.emit(`for (auto ${varName} : ${iterableCode}) {`);
          this.indent++;
          for (const bodyStmt of stmt.body) {
            this.generateStatement(bodyStmt);
          }
          this.indent--;
          this.emit('}');
        }
        break;
      }
      
      case 'break':
        this.emit('break;');
        break;
      
      case 'continue':
        this.emit('continue;');
        break;
      
      case 'block':
        this.emit('{');
        this.indent++;
        for (const blockStmt of stmt.statements) {
          this.generateStatement(blockStmt);
        }
        this.indent--;
        this.emit('}');
        break;
      
      case 'functionDecl': {
        // Nested function declaration
        // Check if function is recursive (calls itself in body)
        const funcName = this.sanitizeIdentifier(stmt.name);
        const isRecursive = this.isRecursiveFunction(stmt.name, stmt.body);
        
        const params = stmt.params.map(p => 
          `${this.generateCppType(p.type)} ${this.sanitizeIdentifier(p.name)}`
        ).join(', ');
        const returnType = this.generateCppType(stmt.returnType);
        
        if (isRecursive) {
          // Recursive function: use std::function so it can reference itself
          // Capture all by reference [&] to include parent scope variables
          this.emit(`std::function<${returnType}(${stmt.params.map(p => this.generateCppType(p.type)).join(', ')})> ${funcName};`);
          this.emit(`${funcName} = [&](${params}) -> ${returnType} {`);
        } else {
          // Non-recursive: simple lambda
          this.emit(`auto ${funcName} = [](${params}) -> ${returnType} {`);
        }
        
        this.indent++;
        
        // Generate function body statements
        for (const bodyStmt of stmt.body.statements) {
          this.generateStatement(bodyStmt);
        }
        
        this.indent--;
        this.emit('};');
        break;
      }
    }
  }

  /**
   * Collect all parts of a string concatenation chain (AST-level IRExpression)
   */
  private collectStringConcatPartsAST(expr: IRExpression): IRExpression[] {
    if (expr.kind !== 'binary' || expr.operator !== BinaryOp.Add) {
      return [expr];
    }
    
    const leftType = expr.left.type;
    const rightType = expr.right.type;
    const leftIsString = leftType.kind === 'primitive' && leftType.type === 'string';
    const rightIsString = rightType.kind === 'primitive' && rightType.type === 'string';
    
    // Only process string concatenations
    if (!leftIsString && !rightIsString) {
      return [expr];
    }
    
    // Recursively collect parts from left and right
    const leftParts = this.collectStringConcatPartsAST(expr.left);
    const rightParts = this.collectStringConcatPartsAST(expr.right);
    
    return [...leftParts, ...rightParts];
  }

  /**
   * Collect all parts of a string concatenation chain
   * Example: "a" + "b" + "c" -> ["a", "b", "c"]
   */
  private collectStringConcatParts(expr: IRExpr): IRExpr[] {
    if (expr.kind !== 'binary' || expr.op !== BinaryOp.Add) {
      return [expr];
    }
    
    const leftType = expr.left.type;
    const rightType = expr.right.type;
    const leftIsString = leftType.kind === 'primitive' && leftType.type === 'string';
    const rightIsString = rightType.kind === 'primitive' && rightType.type === 'string';
    
    // Only process string concatenations
    if (!leftIsString && !rightIsString) {
      return [expr];
    }
    
    // Recursively collect parts from left and right
    const leftParts = this.collectStringConcatParts(expr.left);
    const rightParts = this.collectStringConcatParts(expr.right);
    
    return [...leftParts, ...rightParts];
  }

  /**
   * Check if a statement is a string concatenation assignment: result = result + str
   */
  private isStringConcatAssignment(stmt: IRStatement): { varName: string; appendExpr: IRExpression } | null {
    // Check for direct assignment statement
    if (stmt.kind === 'assignment') {
      if (stmt.value.kind !== 'binary') return null;
      
      const binary = stmt.value;
      if (binary.operator !== BinaryOp.Add) return null;
      if (binary.type.kind !== 'primitive' || binary.type.type !== 'string') return null;
      
      const targetName = stmt.target;
      
      // Check: result = result + str
      if (binary.left.kind === 'identifier' && binary.left.name === targetName) {
        return { varName: targetName, appendExpr: binary.right };
      }
      
      return null;
    }
    
    // Check for expression statement with assignment expression
    if (stmt.kind !== 'expressionStatement') return null;
    if (stmt.expression.kind !== 'assignment') return null;
    
    const assignment = stmt.expression;
    // Assignment expressions use 'left' and 'right', not 'target' and 'value'
    if (assignment.left.kind !== 'identifier') return null;
    if (assignment.right.kind !== 'binary') return null;
    
    const binary = assignment.right;
    if (binary.operator !== BinaryOp.Add) return null;
    if (binary.type.kind !== 'primitive' || binary.type.type !== 'string') return null;
    
    const targetName = assignment.left.name;
    
    // Check: result = result + str
    if (binary.left.kind === 'identifier' && binary.left.name === targetName) {
      return { varName: targetName, appendExpr: binary.right };
    }
    
    // Check: result = str + result (append at beginning)
    if (binary.right.kind === 'identifier' && binary.right.name === targetName) {
      // For now, skip this case (prepend is less common)
      return null;
    }
    
    return null;
  }

  /**
   * Detect if a loop body has string concatenation pattern that can use StringBuilder
   */
  private detectStringBuilderOpportunity(body: IRStatement[]): { varName: string; stmtIndex: number; appendExpr: IRExpression } | null {
    for (let i = 0; i < body.length; i++) {
      const pattern = this.isStringConcatAssignment(body[i]);
      if (pattern) {
        return { ...pattern, stmtIndex: i };
      }
    }
    return null;
  }

  /**
   * Detect if a loop body has array.push() pattern that can benefit from reserve()
   * Pattern: for (let i = 0; i < size; i++) { arr.push(x); }
   * Returns: { arrayName, reserveSize } for reserve() optimization
   */
  private detectArrayReserveOpportunity(body: IRStatement[], condition?: IRExpression): { arrayName: string; reserveSize: string } | null {
    // Look for arr.push(x) in loop body
    for (const stmt of body) {
      // Check for expression statement containing a method call
      if (stmt.kind !== 'expressionStatement') continue;
      const expr = stmt.expression;
      
      // Check for method call expression
      if (expr.kind !== 'call') continue;
      const call = expr as any;  // Call expression structure varies
      if (!call.callee || call.callee.kind !== 'memberAccess') continue;
      
      const member = call.callee;
      if (member.member !== 'push') continue;
      if (member.object.kind !== 'identifier') continue;
      
      const arrayName = member.object.name;
      
      // Try to extract loop bound from condition: i < size
      if (condition && condition.kind === 'binary') {
        const binary = condition as any;
        if (binary.operator !== '<' && binary.operator !== '<=') return null;
        
        const rightSide = binary.right;
        if (rightSide.kind === 'identifier') {
          return { arrayName, reserveSize: rightSide.name };
        } else if (rightSide.kind === 'literal') {
          return { arrayName, reserveSize: String(rightSide.value) };
        }
      }
    }
    return null;
  }

  /**
   * Generate inline C++ code from a statement (for use in for loop init, etc.)
   * Returns code without trailing semicolon
   */
  private generateStatementInline(stmt: IRStatement): string {
    switch (stmt.kind) {
      case 'variableDeclaration':
        return `auto ${this.sanitizeIdentifier(stmt.name)} = ${stmt.initializer ? this.generateExpression(stmt.initializer) : 'nullptr'}`;
      
      case 'assignment':
        return `${this.sanitizeIdentifier(stmt.target)} = ${this.generateExpression(stmt.value)}`;
      
      case 'expressionStatement':
        return this.generateExpression(stmt.expression);
      
      default:
        return '';
    }
  }

  /**
   * Generate C++ code from AST-level expression
   */
  private generateExpression(expr: IRExpression): string {
    switch (expr.kind) {
      case 'literal':
        if (expr.value === null) {
          return 'nullptr';
        } else if (typeof expr.value === 'string') {
          // Escape string literals properly for C++
          const escaped = expr.value
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
          return `gs::String("${escaped}")`;
        } else if (typeof expr.value === 'boolean') {
          return expr.value ? 'true' : 'false';
        } else {
          return String(expr.value);
        }
      
      case 'identifier':
        return this.sanitizeIdentifier(expr.name);
      
      case 'binary': {
        const left = this.generateExpression(expr.left);
        const right = this.generateExpression(expr.right);
        
        // Special handling for + operator with strings (string concatenation)
        if (expr.operator === BinaryOp.Add) {
          const leftType = expr.left.type;
          const rightType = expr.right.type;
          const leftIsString = leftType.kind === 'primitive' && leftType.type === 'string';
          const rightIsString = rightType.kind === 'primitive' && rightType.type === 'string';
          
          // If either operand is a string, convert both to strings and concatenate
          if (leftIsString || rightIsString) {
            // Check if this is a string concatenation chain (e.g., "a" + "b" + "c")
            // Use StringBuilder for chains of 3+ concatenations (avoid lambda overhead for simple cases)
            const parts = this.collectStringConcatPartsAST(expr);
            if (parts.length >= 3) {
              // Generate StringBuilder code
              const builderParts = parts.map(part => {
                const partType = part.type;
                const partIsString = partType.kind === 'primitive' && partType.type === 'string';
                const partExpr = this.generateExpression(part);
                return partIsString ? partExpr : `gs::String::from(${partExpr})`;
              });
              
              // Generate: ([&]() { auto sb = gs::StringBuilder(); sb.append(part1); ... return sb.toString(); })()
              return `([&]() { auto sb = gs::StringBuilder(); ${builderParts.map(p => `sb.append(${p});`).join(' ')} return sb.toString(); })()`;
            }
            
            // For short chains, use simple concatenation
            const leftStr = leftIsString ? left : `gs::String::from(${left})`;
            const rightStr = rightIsString ? right : `gs::String::from(${right})`;
            return `(${leftStr} + ${rightStr})`;
          }
        }
        
        // Special handling for modulo operator on floating-point types
        if (expr.operator === BinaryOp.Mod) {
          // Check if we're dealing with floating-point types (number in TypeScript)
          const leftType = expr.left.type;
          const rightType = expr.right.type;
          const isFloatingPoint = 
            (leftType.kind === 'primitive' && leftType.type === 'number') ||
            (rightType.kind === 'primitive' && rightType.type === 'number');
          
          if (isFloatingPoint) {
            return `std::fmod(${left}, ${right})`;
          }
        }
        
        return `(${left} ${expr.operator} ${right})`;
      }
      
      case 'unary': {
        const operand = this.generateExpression(expr.operand);
        if (expr.operator === 'typeof') {
          // typeof in GoodScript returns a string
          return `gs::typeOf(${operand})`;
        }
        return `(${expr.operator}${operand})`;
      }
      
      case 'await': {
        const expression = this.generateExpression(expr.expression);
        return `co_await ${expression}`;
      }
      
      case 'call': {
        // Special handling for console methods
        if (expr.callee.kind === 'memberAccess' && 
            expr.callee.object.kind === 'identifier' && 
            expr.callee.object.name === 'console') {
          const method = expr.callee.member;
          const args = expr.arguments.map((arg: IRExpression) => this.generateExpression(arg)).join(', ');
          return `gs::console::${method}(${args})`;
        }
        
        // Special handling for Math static methods
        if (expr.callee.kind === 'memberAccess' && 
            expr.callee.object.kind === 'identifier' && 
            expr.callee.object.name === 'Math') {
          const method = expr.callee.member;
          const args = expr.arguments.map((arg: IRExpression) => this.generateExpression(arg)).join(', ');
          return `gs::Math::${method}(${args})`;
        }
        
        // Special handling for Date static methods
        if (expr.callee.kind === 'memberAccess' && 
            expr.callee.object.kind === 'identifier' && 
            expr.callee.object.name === 'Date') {
          const method = expr.callee.member;
          const args = expr.arguments.map((arg: IRExpression) => this.generateExpression(arg)).join(', ');
          return `gs::Date::${method}(${args})`;
        }
        
        // Special handling for JSON static methods
        if (expr.callee.kind === 'memberAccess' && 
            expr.callee.object.kind === 'identifier' && 
            expr.callee.object.name === 'JSON') {
          const method = expr.callee.member;
          const args = expr.arguments.map((arg: IRExpression) => this.generateExpression(arg)).join(', ');
          return `gs::JSON::${method}(${args})`;
        }
        
        // Special handling for Promise static methods
        if (expr.callee.kind === 'memberAccess' && 
            expr.callee.object.kind === 'identifier' && 
            expr.callee.object.name === 'Promise') {
          const method = expr.callee.member;
          const args = expr.arguments.map((arg: IRExpression) => this.generateExpression(arg)).join(', ');
          return `gs::Promise::${method}(${args})`;
        }
        
        // Special handling for FileSystem static methods
        if (expr.callee.kind === 'memberAccess' && 
            expr.callee.object.kind === 'identifier' && 
            expr.callee.object.name === 'FileSystem') {
          const method = expr.callee.member;
          const args = expr.arguments.map((arg: IRExpression) => this.generateExpression(arg)).join(', ');
          return `gs::FileSystem::${method}(${args})`;
        }
        
        // Special handling for FileSystemAsync static methods
        if (expr.callee.kind === 'memberAccess' && 
            expr.callee.object.kind === 'identifier' && 
            expr.callee.object.name === 'FileSystemAsync') {
          const method = expr.callee.member;
          const args = expr.arguments.map((arg: IRExpression) => this.generateExpression(arg)).join(', ');
          return `gs::FileSystemAsync::${method}(${args})`;
        }
        
        // Special handling for String static methods (e.g., String::from() for template literals)
        if (expr.callee.kind === 'memberAccess' && 
            expr.callee.object.kind === 'identifier' && 
            expr.callee.object.name === 'String') {
          const method = expr.callee.member;
          const args = expr.arguments.map((arg: IRExpression) => this.generateExpression(arg)).join(', ');
          return `gs::String::${method}(${args})`;
        }
        
        // Special handling for FileSystem static methods
        if (expr.callee.kind === 'memberAccess' && 
            expr.callee.object.kind === 'identifier' && 
            (expr.callee.object.name === 'FileSystem' || expr.callee.object.name === 'FileSystemAsync')) {
          const className = expr.callee.object.name;
          const method = expr.callee.member;
          const args = expr.arguments.map((arg: IRExpression) => this.generateExpression(arg)).join(', ');
          return `gs::${className}::${method}(${args})`;
        }
        
        // Special handling for HTTP static methods
        if (expr.callee.kind === 'memberAccess' && 
            expr.callee.object.kind === 'identifier' && 
            (expr.callee.object.name === 'HTTP' || expr.callee.object.name === 'HTTPAsync')) {
          const className = expr.callee.object.name;
          const method = expr.callee.member;
          const args = expr.arguments.map((arg: IRExpression) => this.generateExpression(arg)).join(', ');
          return `gs::http::${className}::${method}(${args})`;
        }
        
        // Special handling for number instance methods (e.g., num.toFixed(2))
        // Convert to static method calls: gs::Number::toFixed(num, 2)
        if (expr.callee.kind === 'memberAccess') {
          const objectType = expr.callee.object.type;
          const isNumber = objectType.kind === 'primitive' && objectType.type === 'number';
          
          // Check if this is a Number method
          const numberMethods = new Set(['toFixed', 'toExponential', 'toPrecision', 'toString']);
          if (isNumber && numberMethods.has(expr.callee.member)) {
            const obj = this.generateExpression(expr.callee.object);
            const method = expr.callee.member;
            const args = expr.arguments.map((arg: IRExpression) => this.generateExpression(arg));
            const allArgs = [obj, ...args].join(', ');
            return `gs::Number::${method}(${allArgs})`;
          }
        }
        
        const callee = this.generateExpression(expr.callee);
        const args = expr.arguments.map((arg: IRExpression) => this.generateExpression(arg)).join(', ');
        
        // Special case: Map.get() in ownership mode returns a pointer, needs dereferencing
        if (this.mode === 'ownership' && 
            expr.callee.kind === 'memberAccess' && 
            expr.callee.member === 'get' && 
            expr.callee.object.type.kind === 'map') {
          return `(*${callee}(${args}))`;
        }
        
        return `${callee}(${args})`;
      }
      
      case 'memberAccess': {
        const obj = this.generateExpression(expr.object);
        // Only sanitize actual C++ keywords (like delete), not stdlib names (like set)
        // Method names don't conflict with stdlib types
        const member = CPP_KEYWORDS.has(expr.member) ? `${expr.member}_` : expr.member;
        
        // Special handling for Math static methods
        if (expr.object.kind === 'identifier' && expr.object.name === 'Math') {
          return `gs::Math::${member}`;
        }
        
        // Special handling for Date static methods
        if (expr.object.kind === 'identifier' && expr.object.name === 'Date') {
          return `gs::Date::${member}`;
        }
        
        // Special handling for JSON static methods
        if (expr.object.kind === 'identifier' && expr.object.name === 'JSON') {
          return `gs::JSON::${member}`;
        }
        
        // Special handling for Promise static methods
        if (expr.object.kind === 'identifier' && expr.object.name === 'Promise') {
          return `gs::Promise::${member}`;
        }
        
        // Special handling for FileSystem static methods
        if (expr.object.kind === 'identifier' && expr.object.name === 'FileSystem') {
          return `gs::FileSystem::${member}`;
        }
        
        // Special handling for FileSystemAsync static methods
        if (expr.object.kind === 'identifier' && expr.object.name === 'FileSystemAsync') {
          return `gs::FileSystemAsync::${member}`;
        }

        // Special handling for String static methods
        if (expr.object.kind === 'identifier' && expr.object.name === 'String') {
          return `gs::String::${member}`;
        }
        
        // Special handling for FileSystem and FileSystemAsync static methods
        if (expr.object.kind === 'identifier' && 
            (expr.object.name === 'FileSystem' || expr.object.name === 'FileSystemAsync')) {
          return `gs::${expr.object.name}::${member}`;
        }
        
        // Special handling for HTTP and HTTPAsync static methods
        if (expr.object.kind === 'identifier' && 
            (expr.object.name === 'HTTP' || expr.object.name === 'HTTPAsync')) {
          return `gs::http::${expr.object.name}::${member}`;
        }
        
        // Special handling for console static methods
        if (expr.object.kind === 'identifier' && expr.object.name === 'console') {
          return `gs::console::${member}`;
        }
        
        // In C++, Map.size and Array.length are methods that need ()
        // String.length is also a method in our C++ String class
        // Check the type to determine if this is a Map/Array/String or a struct field
        const objectType = expr.object.type;
        let accessExpr = member;
        if (member === 'size' || member === 'length') {
          // Check if the object type is a Map or Array
          const isMapOrArray = objectType.kind === 'map' || objectType.kind === 'array';
          // Also check for String.length - be more permissive to catch all string types
          const isString = member === 'length' && (
            (objectType.kind === 'primitive' && objectType.type === 'string') ||
            (objectType.kind === 'primitive' && objectType.type === PrimitiveType.String)
          );
          const isMethodProperty = isMapOrArray || isString;
          accessExpr = isMethodProperty ? `${member}()` : member;
        }
        
        // For class fields, add underscore suffix (C++ convention to avoid keyword conflicts)
        if (objectType.kind === 'class' && accessExpr === member) {
          accessExpr = `${member}_`;
        }
        
        // Optional chaining: obj?.field becomes (obj != nullptr ? obj->field : nullptr)
        // For now, we'll use a simpler approach: obj != nullptr && obj.field
        // This requires the type to be nullable (T | null)
        if (expr.optional) {
          // Generate ternary expression: (obj != nullptr ? obj->field : defaultValue)
          // For pointers, use -> operator; for nullable types, need std::optional
          // Simplified: assume non-pointer types for now
          return `(${obj} != nullptr ? ${obj}->${accessExpr} : nullptr)`;
        }
        
        // For class types in GC mode, use -> since they're pointers
        // In ownership mode with smart pointers, also use ->
        const accessor = (objectType.kind === 'class') ? '->' : '.';
        return `${obj}${accessor}${accessExpr}`;
      }
      
      case 'indexAccess': {
        const obj = this.generateExpression(expr.object);
        const index = this.generateExpression(expr.index);
        return `${obj}[static_cast<int>(${index})]`;
      }
      
      case 'assignment': {
        const left = this.generateExpression(expr.left);
        const right = this.generateExpression(expr.right);
        return `(${left} = ${right})`;
      }
      
      case 'arrayLiteral': {
        const elements = expr.elements.map((el: IRExpression) => this.generateExpression(el)).join(', ');
        // Infer element type from the array type
        const arrayType = expr.type;
        if (arrayType.kind === 'array') {
          const elementType = this.generateCppType(arrayType.element);
          return `gs::Array<${elementType}>{ ${elements} }`;
        }
        return `gs::Array<double>{ ${elements} }`;
      }
      
      case 'objectLiteral': {
        // Generate struct type and initialization
        if (expr.type.kind === 'struct') {
          const structType = this.generateCppType(expr.type);
          const initializers = expr.properties.map((p: { key: string; value: IRExpression }) => 
            `.${this.sanitizeIdentifier(p.key)} = ${this.generateExpression(p.value)}`
          ).join(', ');
          return `${structType}{ ${initializers} }`;
        }
        return `/* object literal (non-struct type) */`;
      }
      
      case 'newExpression': {
        const className = this.sanitizeIdentifier(expr.className);
        const args = expr.arguments.map((arg: IRExpression) => this.generateExpression(arg)).join(', ');
        
        // For built-in generic classes like Map, use the type to generate template params
        if (className === 'Map') {
          if (expr.type.kind === 'map') {
            const keyType = this.generateCppType(expr.type.key);
            const valueType = this.generateCppType(expr.type.value);
            return `gs::Map<${keyType}, ${valueType}>(${args})`;
          }
          // Fallback: Map without type info (shouldn't happen but let's handle it)
          return `gs::Map<gs::String, double>(${args})`;
        }
        
        // For Array, use direct construction
        if (className === 'Array' && expr.type.kind === 'array') {
          const elementType = this.generateCppType(expr.type.element);
          return `gs::Array<${elementType}>(${args})`;
        }
        
        // For Error and other built-in classes that are value types, use direct construction
        if (className === 'Error' || className === 'TypeError' || className === 'RangeError') {
          return `gs::${className}(${args})`;
        }
        
        // For user-defined classes in GC mode, use new to allocate on heap
        if (this.mode === 'gc') {
          return `new ${className}(${args})`;
        } else {
          // In ownership mode, use std::make_unique
          return `std::make_unique<${className}>(${args})`;
        }
      }
      
      case 'conditional': {
        const cond = this.generateExpression(expr.condition);
        const thenExpr = this.generateExpression(expr.thenExpr);
        const elseExpr = this.generateExpression(expr.elseExpr);
        return `(${cond} ? ${thenExpr} : ${elseExpr})`;
      }
      
      case 'lambda': {
        // Generate C++ lambda with auto return type (C++ will infer it)
        const params = expr.params.map(p => `${this.generateCppType(p.type)} ${this.sanitizeIdentifier(p.name)}`).join(', ');
        
        // Generate capture list
        const captureList = expr.captures.map(c => this.sanitizeIdentifier(c.name)).join(', ');
        
        // Generate lambda body (IRBlock format)
        const savedOutput = this.output;
        const savedIndent = this.indent;
        this.output = [];
        this.indent = 0;
        
        for (const inst of expr.body.instructions) {
          this.generateInstruction(inst);
        }
        this.generateTerminator(expr.body.terminator);
        
        const bodyCode = this.output.join('\n');
        this.output = savedOutput;
        this.indent = savedIndent;
        
        return `[${captureList}](${params}) {\n${bodyCode}\n}`;
      }

      default:
        return '/* unknown expression */';
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  /**
   * Generate block statements (SSA-level IR)
   */
  // @ts-expect-error - Temporarily unused during AST-level IR transition
  private generateBlockStatements(_block: IRBlock): void {
    // Generate instructions
    for (const inst of _block.instructions) {
      this.generateInstruction(inst);
    }

    // Generate terminator
    this.generateTerminator(_block.terminator);
  }

  private generateInstruction(inst: IRInstruction): void {
    // Skip source location for now - type narrowing is complex
    // TODO: Add proper source location emission
    
    switch (inst.kind) {
      case 'assign':
        // If isDeclaration is not set (undefined), treat as declaration for backwards compatibility
        if (inst.isDeclaration !== false) {
          this.emit(`auto ${this.sanitizeIdentifier(inst.target.name)} = ${this.generateExpr(inst.value)};`);
        } else {
          this.emit(`${this.sanitizeIdentifier(inst.target.name)} = ${this.generateExpr(inst.value)};`);
        }
        break;
      case 'call':
        if (inst.target) {
          this.emit(`auto ${this.sanitizeIdentifier(inst.target.name)} = ${this.generateExpr(inst.callee)}(${inst.args.map(a => this.generateExpr(a)).join(', ')});`);
        } else {
          this.emit(`${this.generateExpr(inst.callee)}(${inst.args.map(a => this.generateExpr(a)).join(', ')});`);
        }
        break;
      case 'fieldAssign':
        this.emit(`${this.generateExpr(inst.object)}.${inst.field} = ${this.generateExpr(inst.value)};`);
        break;
      case 'indexAssign': {
        // Array index assignment: arr[index] = value
        // Use .set() method for bounds checking and auto-resize (JavaScript semantics)
        const obj = this.generateExpr(inst.object);
        const index = this.generateExpr(inst.index);
        const value = this.generateExpr(inst.value);
        this.emit(`${obj}.set(static_cast<int>(${index}), ${value});`);
        break;
      }
      case 'memberAssign': {
        // Property assignment: obj.prop = value
        // Special handling for arr.length which needs setLength() method
        const objType = inst.object.type;
        if (objType.kind === 'array' && inst.member === 'length') {
          this.emit(`${this.generateExpr(inst.object)}.setLength(static_cast<int>(${this.generateExpr(inst.value)}));`);
        } else {
          this.emit(`${this.generateExpr(inst.object)}.${this.sanitizeIdentifier(inst.member)} = ${this.generateExpr(inst.value)};`);
        }
        break;
      }
      case 'expr':
        this.emit(`${this.generateExpr(inst.value)};`);
        break;
    }
  }

  private generateTerminator(term: IRTerminator): void {
    switch (term.kind) {
      case 'return':
        const returnKeyword = this.isAsyncContext ? 'co_return' : 'return';
        if (term.value) {
          this.emit(`${returnKeyword} ${this.generateExpr(term.value)};`);
        } else {
          this.emit(`${returnKeyword};`);
        }
        break;
      case 'branch':
        this.emit(`// TODO: Branch terminator not yet supported in C++ backend`);
        break;
      case 'jump':
        this.emit(`// TODO: Jump terminator not yet supported in C++ backend`);
        break;
      case 'unreachable':
        this.emit(`throw std::runtime_error("Unreachable code");`);
        break;
    }
  }

  private generateExpr(expr: IRExpr): string {
    switch (expr.kind) {
      case 'literal':
        return this.generateLiteral(expr.value);
      case 'variable':
        return this.sanitizeIdentifier(expr.name);
      case 'binary': {
        const left = this.generateExpr(expr.left);
        const right = this.generateExpr(expr.right);
        
        // Special handling for modulo operator on floating-point types
        if (expr.op === BinaryOp.Mod) {
          const leftType = expr.left.type;
          const rightType = expr.right.type;
          const isFloatingPoint = 
            (leftType.kind === 'primitive' && leftType.type === PrimitiveType.Number) ||
            (rightType.kind === 'primitive' && rightType.type === PrimitiveType.Number);
          
          if (isFloatingPoint) {
            return `std::fmod(${left}, ${right})`;
          }
        }
        
        // Special handling for + operator with string concatenation
        if (expr.op === BinaryOp.Add) {
          const leftType = expr.left.type;
          const rightType = expr.right.type;
          const leftIsString = leftType.kind === 'primitive' && leftType.type === 'string';
          const rightIsString = rightType.kind === 'primitive' && rightType.type === 'string';
          
          if (leftIsString || rightIsString) {
            // Check if this is a string concatenation chain (e.g., "a" + "b" + "c")
            // Use StringBuilder for chains of 3+ concatenations (avoid lambda overhead for simple cases)
            const parts = this.collectStringConcatParts(expr);
            if (parts.length >= 3) {
              // Generate StringBuilder code
              const builderParts = parts.map(part => {
                const partType = part.type;
                const partIsString = partType.kind === 'primitive' && partType.type === 'string';
                const partExpr = this.generateExpr(part);
                return partIsString ? partExpr : `gs::String::from(${partExpr})`;
              });
              
              // Generate: ([&]() { auto sb = gs::StringBuilder(); sb.append(part1); ... return sb.toString(); })()
              return `([&]() { auto sb = gs::StringBuilder(); ${builderParts.map(p => `sb.append(${p});`).join(' ')} return sb.toString(); })()`;
            }
            
            // For short chains (< 3 parts), use simple concatenation
            const leftStr = leftIsString ? left : `gs::String::from(${left})`;
            const rightStr = rightIsString ? right : `gs::String::from(${right})`;
            return `(${leftStr} + ${rightStr})`;
          }
        }
        
        return `(${left} ${expr.op} ${right})`;
      }
      case 'unary':
        if (expr.op === 'typeof') {
          return this.generateTypeof(expr.operand);
        }
        return `${expr.op}${this.generateExpr(expr.operand)}`;
      case 'conditional':
        return `(${this.generateExpr(expr.condition)} ? ${this.generateExpr(expr.whenTrue)} : ${this.generateExpr(expr.whenFalse)})`;
      case 'member': {
        const obj = this.generateExpr(expr.object);
        // Special case: console.log/error/warn -> gs::console::
        if (obj === 'console') {
          return `gs::console::${expr.member}`;
        }
        // Special case: Math static methods
        if (obj === 'Math') {
          return `gs::Math::${expr.member}`;
        }
        // Special case: JSON static methods
        if (obj === 'JSON') {
          return `gs::JSON::${expr.member}`;
        }
        // Special case: Promise static methods
        if (obj === 'Promise') {
          return `gs::Promise::${expr.member}`;
        }
        // Special case: FileSystem static methods
        if (obj === 'FileSystem') {
          return `gs::FileSystem::${expr.member}`;
        }
        // Special case: FileSystemAsync static methods
        if (obj === 'FileSystemAsync') {
          return `gs::FileSystemAsync::${expr.member}`;
        }
        // Special case: String static methods (e.g., String.from)
        if (obj === 'String') {
          return `gs::String::${expr.member}`;
        }
        // Special case: FileSystem and FileSystemAsync static methods
        if (obj === 'FileSystem' || obj === 'FileSystemAsync') {
          return `gs::${obj}::${expr.member}`;
        }
        // Special case: HTTP and HTTPAsync static methods
        if (obj === 'HTTP' || obj === 'HTTPAsync') {
          return `gs::http::${obj}::${expr.member}`;
        }
        // Special case: Map.size and Array.length are methods in C++
        // Only apply this for actual Map/Array types, not for struct fields
        const objType = expr.object.type;
        if (expr.member === 'size' && objType.kind === 'map') {
          return `${obj}.size()`;
        }
        if (expr.member === 'length') {
          if (objType.kind === 'array' || (objType.kind === 'primitive' && objType.type === PrimitiveType.String)) {
            return `${obj}.length()`;
          }
        }
        
        // For class types in GC mode, use -> since they're pointers
        // In ownership mode with smart pointers, also use ->
        const accessor = (objType.kind === 'class') ? '->' : '.';
        return `${obj}${accessor}${expr.member}`;
      }
      case 'index': {
        const obj = this.generateExpr(expr.object);
        const indexExpr = this.generateExpr(expr.index);
        // If index is a number (double), cast to int to avoid ambiguous overload
        const indexType = expr.index.type;
        const finalIndex = (indexType.kind === 'primitive' && indexType.type === PrimitiveType.Number) 
          ? `static_cast<int>(${indexExpr})`
          : indexExpr;
        
        // Use safe get_or_default() method instead of operator[] to match JavaScript semantics
        // This returns the default value for out-of-bounds access instead of crashing
        // JavaScript: arr[100] returns undefined (we use default-initialized value)
        return `${obj}.get_or_default(${finalIndex})`;
      }
      case 'callExpr':
        return `${this.generateExpr(expr.callee)}(${expr.args.map(a => this.generateExpr(a)).join(', ')})`;
      case 'methodCall': {
        const obj = this.generateExpr(expr.object);
        const args = expr.args.map(a => this.generateExpr(a)).join(', ');
        // Special case: console.log/error/warn -> gs::console::
        if (obj === 'console') {
          return `gs::console::${expr.method}(${args})`;
        }
        // Special case: FileSystem and FileSystemAsync static methods
        if (obj === 'FileSystem' || obj === 'FileSystemAsync') {
          return `gs::${obj}::${expr.method}(${args})`;
        }
        // Special case: HTTP and HTTPAsync static methods
        if (obj === 'HTTP' || obj === 'HTTPAsync') {
          return `gs::http::${obj}::${expr.method}(${args})`;
        }
        // Special case: Map.get() in ownership mode returns a pointer, needs dereferencing
        if (this.mode === 'ownership' && expr.method === 'get' && expr.object.type.kind === 'map') {
          return `(*${obj}.${expr.method}(${args}))`;
        }
        return `${obj}.${expr.method}(${args})`;
      }
      case 'new':
        return this.generateNew(expr.className, expr.args, expr.type);
      case 'array': {
        // Extract element type from array type
        const elementType = expr.type.kind === 'array' ? expr.type.element : types.void();
        return `gs::Array<${this.generateCppType(elementType)}>{ ${expr.elements.map(e => this.generateExpr(e)).join(', ')} }`;
      }
      case 'object': {
        // Generate struct type and initialization
        if (expr.type.kind === 'struct') {
          const structType = this.generateCppType(expr.type);
          const initializers = expr.properties.map(p => 
            `.${this.sanitizeIdentifier(p.key)} = ${this.generateExpr(p.value)}`
          ).join(', ');
          return `${structType}{ ${initializers} }`;
        }
        return `/* object literal (non-struct type) */`;
      }
      case 'lambda':
        return this.generateLambda(expr);
      case 'move':
        return this.mode === 'ownership'
          ? `std::move(${this.generateExpr(expr.source)})`
          : this.generateExpr(expr.source);
      case 'borrow':
        // In C++, borrow is typically a reference or raw pointer
        return this.generateExpr(expr.source);
    }
  }

  private generateNew(className: string, args: IRExpr[], type?: IRType): string {
    const argsList = args.map(a => this.generateExpr(a)).join(', ');
    
    // Special handling for Map - use direct construction with template params
    if (className === 'Map' && type && type.kind === 'map') {
      const keyType = this.generateCppType(type.key);
      const valueType = this.generateCppType(type.value);
      return `gs::Map<${keyType}, ${valueType}>(${argsList})`;
    }
    
    // Special handling for Array - use direct construction
    if (className === 'Array' && type && type.kind === 'array') {
      const elementType = this.generateCppType(type.element);
      return `gs::Array<${elementType}>(${argsList})`;
    }
    
    if (this.mode === 'gc') {
      // GC mode: For Error and other heap-allocated classes, use new
      // For built-in value types, use direct construction with gs:: namespace
      if (className === 'Error' || className === 'TypeError' || className === 'RangeError') {
        return `gs::${className}(${argsList})`;
      }
      return `new ${className}(${argsList})`;
    } else {
      // Ownership mode: use std::make_unique
      return `std::make_unique<${className}>(${argsList})`;
    }
  }

  private generateLambda(lambda: IRExpr): string {
    if (lambda.kind !== 'lambda') {
      return 'nullptr';
    }

    // Generate C++ lambda: [captures](params) -> returnType { body }
    const params = lambda.params.map(p => `${this.generateCppType(p.type)} ${this.sanitizeIdentifier(p.name)}`).join(', ');
    
    // Generate explicit capture list
    // Capture by value for primitives and stack values, by reference for heap types
    const captureList = lambda.captures.map(c => {
      const name = this.sanitizeIdentifier(c.name);
      // Capture by value (copy) - C++ will handle copying correctly
      return name;
    }).join(', ');
    const capture = captureList || '';
    
    // Check for simple expression body (no instructions, just return)
    if (lambda.body.instructions.length === 0 && lambda.body.terminator.kind === 'return' && lambda.body.terminator.value) {
      // Simple expression lambda: (x) => x * 2
      const returnExpr = this.generateExpr(lambda.body.terminator.value);
      return `[${capture}](${params}) { return ${returnExpr}; }`;
    }
    
    // Multi-statement lambda
    const savedIndent = this.indent;
    const savedOutput = this.output;
    this.output = [];
    this.indent = 0;
    
    // Generate statements from block
    for (const inst of lambda.body.instructions) {
      this.generateInstruction(inst);
    }
    this.generateTerminator(lambda.body.terminator);
    
    const bodyLines = this.output;
    this.output = savedOutput;
    this.indent = savedIndent;
    
    const body = bodyLines.map(line => '  ' + line).join('\n');
    return `[${capture}](${params}) {\n${body}\n}`;
  }

  private generateTypeof(operand: IRExpr): string {
    // Generate runtime type checking based on static type information
    const typeStr = this.getTypeString(operand.type);
    return `gs::String("${typeStr}")`;
  }

  private getTypeString(type: IRType): string {
    if (type.kind === 'primitive') {
      switch (type.type) {
        case PrimitiveType.Number:
        case PrimitiveType.Integer:
        case PrimitiveType.Integer53:
          return 'number';
        case PrimitiveType.String:
          return 'string';
        case PrimitiveType.Boolean:
          return 'boolean';
        case PrimitiveType.Void:
          return 'undefined';
        default:
          return 'object';
      }
    }
    return 'object';
  }

  private generateLiteral(value: number | string | boolean | null): string {
    if (value === null) {
      return 'nullptr';
    }
    if (typeof value === 'string') {
      // GoodScript string literal
      return `gs::String(${JSON.stringify(value)})`;
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    return String(value);
  }

  private generateCppType(type: IRType): string {
    switch (type.kind) {
      case 'primitive':
        return this.generatePrimitiveType(type.type);
      case 'class':
      case 'interface':
        return this.generatePointerType(type.name, type.ownership);
      case 'struct':
        return this.getOrCreateStructType(type.fields);
      case 'array':
        return `gs::Array<${this.generateCppType(type.element)}>`;
      case 'map':
        return `gs::Map<${this.generateCppType(type.key)}, ${this.generateCppType(type.value)}>`;
      case 'promise':
        // Promise<T> → cppcoro::task<T>
        return `cppcoro::task<${this.generateCppType(type.resultType)}>`;
      case 'function': {
        const params = type.params.map(p => this.generateCppType(p)).join(', ');
        return `std::function<${this.generateCppType(type.returnType)}(${params})>`;
      }
      case 'union':
        // C++ unions require std::variant
        return `std::variant<${type.types.map(t => this.generateCppType(t)).join(', ')}>`;
      case 'nullable':
        // Nullable in C++ is std::optional or raw pointer
        return `std::optional<${this.generateCppType(type.inner)}>`;
      case 'intersection':
      case 'typeAlias':
        // These should be resolved during type checking, but provide fallback
        throw new Error(`Unexpected unresolved type: ${type.kind}`);
    }
  }

  private generatePrimitiveType(type: string): string {
    switch (type) {
      case 'number':
        return 'double';
      case 'integer':
        return 'int32_t';
      case 'integer53':
        return 'int64_t';
      case 'string':
        return 'gs::String';
      case 'boolean':
        return 'bool';
      case 'void':
        return 'void';
      case 'never':
        return 'void';  // C++ doesn't have never, use void
      default:
        return 'void';
    }
  }

  private generatePointerType(typeName: string, ownership?: Ownership): string {
    if (this.mode === 'gc') {
      // GC mode: all pointers are raw pointers (GC-managed)
      return `${typeName}*`;
    } else {
      // Ownership mode: use smart pointers
      switch (ownership) {
        case Ownership.Own:
          return `std::unique_ptr<${typeName}>`;
        case Ownership.Share:
          return `gs::shared_ptr<${typeName}>`;
        case Ownership.Use:
          return `gs::weak_ptr<${typeName}>`;
        default:
          return `${typeName}`;  // Value type
      }
    }
  }

  private generateParam(param: IRParam): string {
    return `${this.generateCppType(param.type)} ${this.sanitizeIdentifier(param.name)}`;
  }

  // Alias for consistency
  private generateCppParam(param: IRParam): string {
    return this.generateParam(param);
  }

  private emit(line: string): void {
    const indentation = '  '.repeat(this.indent);
    this.output.push(indentation + line);
  }

  private emitSourceLocation(location?: SourceLocation): void {
    if (this.sourceMap && location) {
      // Emit #line directive for source mapping
      // Format: #line <line> "<filename>"
      this.output.push(`#line ${location.line} "${location.file}"`);
    }
  }

  /**
   * Pre-scan declarations to discover all struct types that need to be generated.
   * This populates the struct registry before we generate the actual code.
   */
  private preScanDeclarations(declarations: IRDeclaration[]): void {
    for (const decl of declarations) {
      this.preScanDeclaration(decl);
    }
  }

  private preScanDeclaration(decl: IRDeclaration): void {
    switch (decl.kind) {
      case 'function':
        // Pre-scan function body (AST-level statements)
        if (decl.body && 'statements' in decl.body) {
          for (const stmt of decl.body.statements) {
            this.preScanStatement(stmt);
          }
        }
        break;
      case 'class':
        // Pre-scan class methods (AST-level)
        for (const method of decl.methods || []) {
          if (method.body && 'statements' in method.body) {
            for (const stmt of method.body.statements) {
              this.preScanStatement(stmt);
            }
          }
        }
        break;
      case 'const':
        this.preScanExpr(decl.value);
        break;
    }
  }

  private preScanBlock(block: IRBlock): void {
    for (const inst of block.instructions) {
      if (inst.kind === 'assign') {
        this.preScanExpr(inst.value);
      } else if (inst.kind === 'call' && inst.target) {
        this.preScanExpr(inst.callee);
        for (const arg of inst.args) {
          this.preScanExpr(arg);
        }
      } else if (inst.kind === 'fieldAssign') {
        this.preScanExpr(inst.object);
        this.preScanExpr(inst.value);
      } else if (inst.kind === 'indexAssign') {
        this.preScanExpr(inst.object);
        this.preScanExpr(inst.index);
        this.preScanExpr(inst.value);
      } else if (inst.kind === 'memberAssign') {
        this.preScanExpr(inst.object);
        this.preScanExpr(inst.value);
      }
    }
    
    const term = block.terminator;
    if (term.kind === 'return' && term.value) {
      this.preScanExpr(term.value);
    } else if (term.kind === 'branch') {
      this.preScanExpr(term.condition);
    }
  }

  private preScanExpr(expr: IRExpr): void {
    switch (expr.kind) {
      case 'binary':
        this.preScanExpr(expr.left);
        this.preScanExpr(expr.right);
        break;
      case 'unary':
        this.preScanExpr(expr.operand);
        break;
      case 'conditional':
        this.preScanExpr(expr.condition);
        this.preScanExpr(expr.whenTrue);
        this.preScanExpr(expr.whenFalse);
        break;
      case 'member':
      case 'index':
        this.preScanExpr(expr.object);
        if (expr.kind === 'index') {
          this.preScanExpr(expr.index);
        }
        break;
      case 'callExpr':
        this.preScanExpr(expr.callee);
        for (const arg of expr.args) {
          this.preScanExpr(arg);
        }
        break;
      case 'methodCall':
        this.preScanExpr(expr.object);
        for (const arg of expr.args) {
          this.preScanExpr(arg);
        }
        break;
      case 'array':
        for (const elem of expr.elements) {
          this.preScanExpr(elem);
        }
        break;
      case 'object':
        // Register the struct type
        if (expr.type.kind === 'struct') {
          this.getOrCreateStructType(expr.type.fields);
        }
        for (const prop of expr.properties) {
          this.preScanExpr(prop.value);
        }
        break;
      case 'lambda':
        this.preScanBlock(expr.body);
        break;
      case 'move':
      case 'borrow':
        this.preScanExpr(expr.source);
        break;
    }
  }

  /**
   * Pre-scan AST-level statements to find struct types
   */
  private preScanStatement(stmt: IRStatement): void {
    switch (stmt.kind) {
      case 'return':
        if (stmt.value) {
          this.preScanExpression(stmt.value);
        }
        break;
      case 'variableDeclaration':
        if (stmt.initializer) {
          this.preScanExpression(stmt.initializer);
        }
        break;
      case 'expressionStatement':
        this.preScanExpression(stmt.expression);
        break;
      case 'if':
        this.preScanExpression(stmt.condition);
        for (const s of stmt.thenBranch || []) {
          this.preScanStatement(s);
        }
        for (const s of stmt.elseBranch || []) {
          this.preScanStatement(s);
        }
        break;
      case 'while':
      case 'for-of':
        if (stmt.kind === 'while' && stmt.condition) {
          this.preScanExpression(stmt.condition);
        }
        if (stmt.kind === 'for-of' && stmt.iterable) {
          this.preScanExpression(stmt.iterable);
        }
        for (const s of stmt.body || []) {
          this.preScanStatement(s);
        }
        break;
      case 'for':
        if (stmt.init) {
          if ('kind' in stmt.init) {
            this.preScanStatement(stmt.init);
          } else {
            this.preScanExpression(stmt.init as IRExpression);
          }
        }
        if (stmt.condition) {
          this.preScanExpression(stmt.condition);
        }
        if (stmt.increment) {
          this.preScanExpression(stmt.increment);
        }
        for (const s of stmt.body || []) {
          this.preScanStatement(s);
        }
        break;
      case 'try':
        for (const s of stmt.tryBlock || []) {
          this.preScanStatement(s);
        }
        if (stmt.catchClause) {
          for (const s of stmt.catchClause.body || []) {
            this.preScanStatement(s);
          }
        }
        for (const s of stmt.finallyBlock || []) {
          this.preScanStatement(s);
        }
        break;
    }
  }

  /**
   * Pre-scan AST-level expressions to find struct types
   */
  private preScanExpression(expr: IRExpression): void {
    switch (expr.kind) {
      case 'binary':
        this.preScanExpression(expr.left);
        this.preScanExpression(expr.right);
        break;
      case 'unary':
        this.preScanExpression(expr.operand);
        break;
      case 'conditional':
        this.preScanExpression(expr.condition);
        this.preScanExpression(expr.thenExpr);
        this.preScanExpression(expr.elseExpr);
        break;
      case 'memberAccess':
      case 'indexAccess':
        this.preScanExpression(expr.object);
        if (expr.kind === 'indexAccess') {
          this.preScanExpression(expr.index);
        }
        break;
      case 'assignment':
        this.preScanExpression(expr.left);
        this.preScanExpression(expr.right);
        break;
      case 'call':
        this.preScanExpression(expr.callee);
        for (const arg of expr.arguments || []) {
          this.preScanExpression(arg);
        }
        break;
      case 'arrayLiteral':
        for (const elem of expr.elements || []) {
          this.preScanExpression(elem);
        }
        break;
      case 'objectLiteral':
        // Register the struct type
        if (expr.type.kind === 'struct') {
          this.getOrCreateStructType(expr.type.fields);
        }
        for (const prop of expr.properties || []) {
          this.preScanExpression(prop.value);
        }
        break;
      case 'newExpression':
        for (const arg of expr.arguments || []) {
          this.preScanExpression(arg);
        }
        break;
      case 'lambda':
        // Lambda body is IRBlock (SSA-level), skip for now
        break;
      case 'await':
        this.preScanExpression(expr.expression);
        break;
    }
  }

  /**
   * Get or create a struct type name for a set of fields.
   * Returns the C++ type name.
   */
  private getOrCreateStructType(fields: Array<{ name: string; type: IRType }>): string {
    // Create a canonical key from sorted field names and types
    const key = fields
      .map(f => `${f.name}:${this.generateCppType(f.type)}`)
      .sort()
      .join(';');
    
    // Check if we already have this struct
    let structInfo = this.structRegistry.get(key);
    if (!structInfo) {
      // Generate new struct name
      const structName = `AnonymousStruct${this.structCounter++}`;
      structInfo = { name: structName, fields };
      this.structRegistry.set(key, structInfo);
    }
    
    return structInfo.name;
  }

  /**
   * Check if a function is recursive (calls itself)
   */
  private isRecursiveFunction(funcName: string, body: { statements: any[] }): boolean {
    for (const stmt of body.statements) {
      if (this.statementCallsFunction(stmt, funcName)) {
        return true;
      }
    }
    return false;
  }

  private statementCallsFunction(stmt: any, funcName: string): boolean {
    if (!stmt) return false;
    
    switch (stmt.kind) {
      case 'expressionStatement':
        return this.expressionCallsFunction(stmt.expression, funcName);
      case 'return':
        return stmt.value ? this.expressionCallsFunction(stmt.value, funcName) : false;
      case 'if':
        return this.expressionCallsFunction(stmt.condition, funcName) ||
               (stmt.thenBranch?.some((s: any) => this.statementCallsFunction(s, funcName)) ?? false) ||
               (stmt.elseBranch?.some((s: any) => this.statementCallsFunction(s, funcName)) ?? false);
      case 'while':
      case 'for-of':
        return this.expressionCallsFunction(stmt.condition || stmt.iterable, funcName) ||
               (stmt.body?.some((s: any) => this.statementCallsFunction(s, funcName)) ?? false);
      case 'for':
        return (stmt.init ? this.statementCallsFunction(stmt.init, funcName) : false) ||
               (stmt.condition ? this.expressionCallsFunction(stmt.condition, funcName) : false) ||
               (stmt.increment ? this.expressionCallsFunction(stmt.increment, funcName) : false) ||
               (stmt.body?.some((s: any) => this.statementCallsFunction(s, funcName)) ?? false);
      case 'variableDeclaration':
        return stmt.initializer ? this.expressionCallsFunction(stmt.initializer, funcName) : false;
      case 'assignment':
        return this.expressionCallsFunction(stmt.value, funcName);
      case 'try':
        return (stmt.tryBlock?.some((s: any) => this.statementCallsFunction(s, funcName)) ?? false) ||
               (stmt.catchClause?.body?.some((s: any) => this.statementCallsFunction(s, funcName)) ?? false) ||
               (stmt.finallyBlock?.some((s: any) => this.statementCallsFunction(s, funcName)) ?? false);
      case 'throw':
        return this.expressionCallsFunction(stmt.expression, funcName);
      case 'block':
        return stmt.statements?.some((s: any) => this.statementCallsFunction(s, funcName)) ?? false;
      default:
        return false;
    }
  }

  private expressionCallsFunction(expr: any, funcName: string): boolean {
    if (!expr) return false;
    
    switch (expr.kind) {
      case 'call':
        if (expr.callee?.kind === 'identifier' && expr.callee.name === funcName) {
          return true;
        }
        return this.expressionCallsFunction(expr.callee, funcName) ||
               (expr.arguments?.some((arg: any) => this.expressionCallsFunction(arg, funcName)) ?? false);
      case 'binary':
        return this.expressionCallsFunction(expr.left, funcName) ||
               this.expressionCallsFunction(expr.right, funcName);
      case 'unary':
        return this.expressionCallsFunction(expr.operand, funcName);
      case 'conditional':
        return this.expressionCallsFunction(expr.condition, funcName) ||
               this.expressionCallsFunction(expr.thenExpr, funcName) ||
               this.expressionCallsFunction(expr.elseExpr, funcName);
      case 'memberAccess':
        return this.expressionCallsFunction(expr.object, funcName);
      case 'indexAccess':
        return this.expressionCallsFunction(expr.object, funcName) ||
               this.expressionCallsFunction(expr.index, funcName);
      case 'arrayLiteral':
        return expr.elements?.some((e: any) => this.expressionCallsFunction(e, funcName)) ?? false;
      case 'objectLiteral':
        return expr.properties?.some((p: any) => this.expressionCallsFunction(p.value, funcName)) ?? false;
      default:
        return false;
    }
  }

  /**
   * Generate struct definitions in header
   */
  private generateStructDefinitions(): void {
    for (const [_, structInfo] of this.structRegistry) {
      this.emit(`struct ${structInfo.name} {`);
      this.indent++;
      for (const field of structInfo.fields) {
        this.emit(`${this.generateCppType(field.type)} ${this.sanitizeIdentifier(field.name)};`);
      }
      this.indent--;
      this.emit(`};`);
      this.emit('');
    }
  }
}
