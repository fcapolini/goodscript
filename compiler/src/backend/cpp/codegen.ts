/**
 * C++ Code Generator
 * 
 * IR → C++ code generation
 */

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
} from '../../ir/types.js';
import { Ownership } from '../../ir/types.js';
import { types } from '../../ir/builder.js';

type MemoryMode = 'ownership' | 'gc';

// C++ reserved keywords that need to be sanitized
const CPP_RESERVED_KEYWORDS = new Set([
  // C++ keywords
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
  // Common standard library names to avoid
  'std', 'string', 'vector', 'map', 'set', 'list', 'array', 'pair', 'tuple',
  'unique_ptr', 'shared_ptr', 'weak_ptr', 'function', 'optional', 'variant',
]);

export class CppCodegen {
  private mode: MemoryMode = 'gc';
  private sourceMap = false;
  private indent = 0;
  private output: string[] = [];
  private currentNamespace: string[] = [];

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
      // Generate header file
      this.output = [];
      this.indent = 0;
      this.generateHeader(module);
      const headerPath = this.getHeaderPath(module.path);
      files.set(headerPath, this.output.join('\n'));

      // Generate source file
      this.output = [];
      this.indent = 0;
      this.generateSource(module, headerPath);
      const sourcePath = this.getSourcePath(module.path);
      files.set(sourcePath, this.output.join('\n'));
    }

    return files;
  }

  private getHeaderPath(modulePath: string): string {
    return modulePath.replace(/-gs\.(tsx?)|\.(gs|js|tsx?)$/, '.hpp');
  }

  private getSourcePath(modulePath: string): string {
    return modulePath.replace(/-gs\.(tsx?)|\.(gs|js|tsx?)$/, '.cpp');
  }

  private getNamespaceName(modulePath: string): string[] {
    // Convert src/math/vector-gs.ts -> ['goodscript', 'src', 'math', 'vector']
    // Replace dashes with underscores for valid C++ identifiers
    const parts = modulePath
      .replace(/-gs\.(tsx?)|\.(gs|js|tsx?)$/, '')
      .split('/')
      .map(part => part.replace(/-/g, '_'));
    return ['goodscript', ...parts];
  }

  // ========================================================================
  // Header File Generation
  // ========================================================================

  private generateHeader(module: IRModule): void {
    const guard = this.getIncludeGuard(module.path);
    this.emit(`#pragma once`);
    this.emit(`#ifndef ${guard}`);
    this.emit(`#define ${guard}`);
    this.emit('');

    // GoodScript runtime
    if (this.mode === 'gc') {
      this.emit('#include "runtime/cpp/ownership/gs_gc_runtime.hpp"');
    } else {
      this.emit('#include "runtime/cpp/ownership/gs_runtime.hpp"');
    }
    
    this.emit('');

    // Module imports -> #includes
    for (const imp of module.imports) {
      const headerPath = this.getHeaderPath(imp.from.replace(/^\.\//, ''));
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

    // Declarations
    for (const decl of module.declarations) {
      this.generateHeaderDeclaration(decl);
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
    // src/math/vector-gs.ts -> GOODSCRIPT_SRC_MATH_VECTOR_HPP_
    return 'GOODSCRIPT_' + modulePath
      .replace(/-gs\.(tsx?)|\.gs$/, '')
      .replace(/[\/\.\-]/g, '_')  // Replace slashes, dots, and dashes with underscores
      .toUpperCase() + '_HPP_';
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
        this.generateHeaderConst(decl);
        break;
    }
  }

  private generateHeaderFunction(func: IRFunctionDecl): void {
    const returnType = this.generateCppType(func.returnType);
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

    if (cls.fields.length > 0) {
      this.emit('');
      this.emit('private:');
    }

    // Fields
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
    this.emit(`extern const ${this.generateCppType(constDecl.type)} ${this.sanitizeIdentifier(constDecl.name)};`);
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
  }

  private generateSourceDeclaration(decl: IRDeclaration): void {
    switch (decl.kind) {
      case 'function':
        this.generateSourceFunction(decl);
        break;
      case 'class':
        this.generateSourceClass(decl);
        break;
      case 'const':
        this.generateSourceConst(decl);
        break;
    }
  }

  private generateSourceFunction(func: IRFunctionDecl): void {
    const returnType = this.generateCppType(func.returnType);
    const params = func.params.map(p => this.generateCppParam(p)).join(', ');
    
    // Emit source location for function declaration
    this.emitSourceLocation(func.source);
    
    this.emit(`${returnType} ${func.name}(${params}) {`);
    this.indent++;
    this.generateBlockStatements(func.body);
    this.indent--;
    this.emit('}');
  }

  private generateSourceClass(cls: IRClassDecl): void {
    // Constructor implementation
    if (cls.constructor) {
      const params = cls.constructor.params.map(p => this.generateCppParam(p)).join(', ');
      
      // Generate initializer list for readonly fields
      const readonlyFields = cls.fields.filter(f => f.isReadonly && f.initializer);
      if (readonlyFields.length > 0) {
        this.emit(`${cls.name}::${cls.name}(${params})`);
        this.indent++;
        for (let i = 0; i < readonlyFields.length; i++) {
          const field = readonlyFields[i];
          const prefix = i === 0 ? ': ' : ', ';
          this.emit(`${prefix}${field.name}_(${this.generateExpr(field.initializer!)})`);
        }
        this.indent--;
        this.emit('{');
      } else {
        this.emit(`${cls.name}::${cls.name}(${params}) {`);
      }
      
      this.indent++;
      this.generateBlockStatements(cls.constructor.body);
      this.indent--;
      this.emit('}');
      this.emit('');
    }

    // Method implementations
    for (const method of cls.methods) {
      const staticMod = method.isStatic ? '' : `${cls.name}::`;
      const returnType = this.generateCppType(method.returnType);
      const params = method.params.map(p => this.generateCppParam(p)).join(', ');
      
      this.emit(`${returnType} ${staticMod}${method.name}(${params}) {`);
      this.indent++;
      this.generateBlockStatements(method.body);
      this.indent--;
      this.emit('}');
      
      if (method !== cls.methods[cls.methods.length - 1]) {
        this.emit('');
      }
    }
  }

  private generateSourceConst(constDecl: any): void {
    this.emit(`const ${this.generateCppType(constDecl.type)} ${this.sanitizeIdentifier(constDecl.name)} = ${this.generateExpr(constDecl.value)};`);
  }

  private generateBlockStatements(block: IRBlock): void {
    // Generate instructions
    for (const inst of block.instructions) {
      this.generateInstruction(inst);
    }

    // Generate terminator
    this.generateTerminator(block.terminator);
  }

  private generateInstruction(inst: IRInstruction): void {
    // Skip source location for now - type narrowing is complex
    // TODO: Add proper source location emission
    
    switch (inst.kind) {
      case 'assign':
        this.emit(`auto ${this.sanitizeIdentifier(inst.target.name)} = ${this.generateExpr(inst.value)};`);
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
      case 'expr':
        this.emit(`${this.generateExpr(inst.value)};`);
        break;
    }
  }

  private generateTerminator(term: IRTerminator): void {
    switch (term.kind) {
      case 'return':
        if (term.value) {
          this.emit(`return ${this.generateExpr(term.value)};`);
        } else {
          this.emit(`return;`);
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
      case 'binary':
        return `(${this.generateExpr(expr.left)} ${expr.op} ${this.generateExpr(expr.right)})`;
      case 'unary':
        return `${expr.op}${this.generateExpr(expr.operand)}`;
      case 'member': {
        const obj = this.generateExpr(expr.object);
        // Special case: console.log/error/warn -> gs::console::
        if (obj === 'console') {
          return `gs::console::${expr.member}`;
        }
        return `${obj}.${expr.member}`;
      }
      case 'index':
        return `${this.generateExpr(expr.object)}[${this.generateExpr(expr.index)}]`;
      case 'callExpr':
        return `${this.generateExpr(expr.callee)}(${expr.args.map(a => this.generateExpr(a)).join(', ')})`;
      case 'new':
        return this.generateNew(expr.className, expr.args);
      case 'array': {
        // Extract element type from array type
        const elementType = expr.type.kind === 'array' ? expr.type.element : types.void();
        return `gs::Array<${this.generateCppType(elementType)}>{ ${expr.elements.map(e => this.generateExpr(e)).join(', ')} }`;
      }
      case 'object':
        // Objects are not directly supported in C++ - would need struct definition
        return `/* object literal */`;
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

  private generateNew(className: string, args: IRExpr[]): string {
    const argsList = args.map(a => this.generateExpr(a)).join(', ');
    
    if (this.mode === 'gc') {
      // GC mode: use GC_malloc or new with GC allocator
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
    
    // For now, capture everything by value (simple approach)
    // TODO: Proper capture analysis for optimization
    const capture = lambda.captures.length > 0 ? '=' : '';
    
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
      case 'array':
        return `gs::Array<${this.generateCppType(type.element)}>`;
      case 'map':
        return `gs::Map<${this.generateCppType(type.key)}, ${this.generateCppType(type.value)}>`;
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
}
