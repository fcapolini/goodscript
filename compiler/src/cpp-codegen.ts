/**
 * C++ Code Generator
 * 
 * Transforms GoodScript AST to C++ source code, mapping ownership semantics
 * to C++'s smart pointers.
 * 
 * Ownership mappings:
 * - Unique<T> -> std::unique_ptr<T>
 * - Shared<T> -> gs::shared_ptr<T> (non-atomic for single-threaded performance)
 * - Weak<T> -> gs::weak_ptr<T> (non-atomic for single-threaded performance)
 * - T | null | undefined -> std::optional<T>
 * 
 * All generated code is wrapped in the 'gs' namespace to avoid keyword conflicts.
 */

import * as ts from 'typescript';
import { Parser } from './parser';

/**
 * C++ reserved keywords that must be avoided even in gs:: namespace
 */
const CPP_KEYWORDS = new Set([
  'alignas', 'alignof', 'and', 'and_eq', 'asm', 'auto', 'bitand', 'bitor',
  'bool', 'break', 'case', 'catch', 'char', 'char8_t', 'char16_t', 'char32_t',
  'class', 'compl', 'concept', 'const', 'consteval', 'constexpr', 'constinit',
  'const_cast', 'continue', 'co_await', 'co_return', 'co_yield', 'decltype',
  'default', 'delete', 'do', 'double', 'dynamic_cast', 'else', 'enum',
  'explicit', 'export', 'extern', 'false', 'float', 'for', 'friend', 'goto',
  'if', 'inline', 'int', 'long', 'mutable', 'namespace', 'new', 'noexcept',
  'not', 'not_eq', 'nullptr', 'operator', 'or', 'or_eq', 'private', 'protected',
  'public', 'register', 'reinterpret_cast', 'requires', 'return', 'short',
  'signed', 'sizeof', 'static', 'static_assert', 'static_cast', 'struct',
  'switch', 'template', 'this', 'thread_local', 'throw', 'true', 'try',
  'typedef', 'typeid', 'typename', 'union', 'unsigned', 'using', 'virtual',
  'void', 'volatile', 'wchar_t', 'while', 'xor', 'xor_eq'
]);

/**
 * Common C++ macros that should be avoided
 */
const CPP_MACROS = new Set([
  'EOF', 'NULL', 'TRUE', 'FALSE', 'MIN', 'MAX', 'assert'
]);

export class CppCodegen {
  private indentLevel = 0;
  private readonly INDENT = '  '; // 2 spaces
  private output: string[] = [];
  private includes = new Set<string>();
  private checker?: ts.TypeChecker;
  
  // Track variables that are already wrapped in smart pointers
  private uniquePtrVars = new Set<string>();
  
  // Track variables that are std::optional<T> and have been null-checked
  // After null check, we can use .value() to unwrap
  private unwrappedOptionals = new Set<string>();
  
  // Track current method return type for smart pointer wrapping
  private currentMethodReturnType?: string;
  
  // Track Map/Array element types by variable name (for smart pointer wrapping)
  private containerElementTypes = new Map<string, { elementType: string, isShared: boolean }>();
  
  constructor(checker?: ts.TypeChecker) {
    this.checker = checker;
  }
  
  /**
   * Escape identifier if it collides with C++ keywords or contains unsupported Unicode.
   * 
   * Note: Emoji are not valid JavaScript identifiers (per ECMAScript spec),
   * but we handle them defensively in case of programmatic AST construction.
   * Unicode letter-based identifiers (Chinese, Japanese, etc.) ARE valid in
   * JavaScript but may not work in C++20, so we convert them to hex codes.
   */
  private escapeIdentifier(name: string): string {
    // Special keywords that should never be escaped
    if (name === 'this') {
      return 'this';
    }
    
    // Sanitize Unicode characters that aren't portable in C++ identifiers
    // While C++20 supports some Unicode identifiers (letters), emoji and many symbols are not allowed
    // For maximum portability, we'll transliterate/replace non-ASCII characters
    let sanitized = name;
    
    // Check if contains any non-ASCII characters
    if (/[^\x00-\x7F]/.test(name)) {
      // Replace with descriptive names for common emoji/symbols
      const emojiMap: Record<string, string> = {
        '🚀': 'rocket',
        '🎉': 'party',
        '💡': 'lightbulb',
        '⚡': 'lightning',
        '🔥': 'fire',
        '✨': 'sparkles',
        '🌟': 'star',
        '❤️': 'heart',
        '👍': 'thumbsup',
        '✅': 'check',
        '❌': 'cross',
        '⚠️': 'warning',
      };
      
      // Try to replace known emoji first (before char-by-char conversion)
      for (const [emoji, replacement] of Object.entries(emojiMap)) {
        if (sanitized.includes(emoji)) {
          sanitized = sanitized.replace(new RegExp(emoji, 'g'), replacement);
        }
      }
      
      // For remaining non-ASCII characters, convert to hex code points
      // This handles Chinese, Japanese, Arabic, etc., and any emoji not in the map
      sanitized = sanitized.replace(/[^\x00-\x7F]/gu, (char) => {
        // Use codePointAt to get the actual code point (handles surrogate pairs)
        const codePoint = char.codePointAt(0);
        return `_u${codePoint?.toString(16)}_`;
      });
    }
    
    if (CPP_KEYWORDS.has(sanitized) || CPP_MACROS.has(sanitized)) {
      return `${sanitized}_`;  // Append underscore to avoid collision
    }
    return sanitized;
  }
  
  /**
   * Add a line of code at current indent level
   */
  private emit(line: string): void {
    if (line === '') {
      this.output.push('');
    } else {
      this.output.push(this.INDENT.repeat(this.indentLevel) + line);
    }
  }
  
  /**
   * Increase indent level
   */
  private indent(): void {
    this.indentLevel++;
  }
  
  /**
   * Decrease indent level
   */
  private dedent(): void {
    if (this.indentLevel > 0) {
      this.indentLevel--;
    }
  }
  
  /**
   * Add a required include
   */
  private addInclude(include: string): void {
    this.includes.add(include);
  }
  
  /**
   * Reset generator state
   */
  private reset(): void {
    this.indentLevel = 0;
    this.output = [];
    this.includes = new Set();
    this.uniquePtrVars = new Set();
    this.containerElementTypes = new Map();
  }
  
  /**
   * Add helper functions for GoodScript runtime
   */
  private addHelperFunctions(lines: string[]): void {
    lines.push('// GoodScript-specific helpers (runtime library provides standard APIs)');
    lines.push('namespace gs {');
    lines.push('');
    lines.push('// Note: String methods (indexOf, startsWith, etc.) are now in gs::String');
    lines.push('// Note: Array methods (push, map, filter, etc.) are now in gs::Array<T>');
    lines.push('// Note: Smart pointers (shared_ptr, weak_ptr) are in gs_runtime.hpp');
    lines.push('');
    lines.push('// Number helper: format integer without decimal point');
    lines.push('inline gs::String to_string_int(double value) {');
    lines.push('  if (value == static_cast<int>(value)) {');
    lines.push('    return gs::String(std::to_string(static_cast<int>(value)));');
    lines.push('  }');
    lines.push('  return gs::String(std::to_string(value));');
    lines.push('}');
    lines.push('');
    lines.push('} // namespace gs');
    lines.push('');
    lines.push('// JSON namespace for JSON.stringify compatibility');
    lines.push('namespace JSON {');
    lines.push('  template<typename T>');
    lines.push('  std::string stringify(const T& value) {');
    lines.push('    return gs::json_stringify(value);');
    lines.push('  }');
    lines.push('}');
    lines.push('');
  }
  
  /**
   * Build final output with includes and namespace wrapper
   */
  private buildOutput(): string {
    const lines: string[] = [];
    
    // Add GoodScript runtime (provides all standard types)
    lines.push('#include "gs_runtime.hpp"');
    
    // Add custom includes (skip ones provided by gs_runtime.hpp)
    if (this.includes.size > 0) {
      for (const include of Array.from(this.includes).sort()) {
        // Skip includes now provided by gs_runtime.hpp
        if (include === '<memory>' || 
            include === '<string>' || 
            include === '<vector>' ||
            include === '<unordered_map>' ||
            include === '<unordered_set>' ||
            include === '<optional>' ||
            include === '<iostream>' ||
            include === '<sstream>') {
          continue;
        }
        lines.push(`#include ${include}`);
      }
    }
    
    lines.push('');
    
    // Add helper functions
    this.addHelperFunctions(lines);
    
    // Wrap everything in gs namespace
    lines.push('namespace gs {');
    lines.push('');
    
    // Add generated code (but exclude main function if present)
    const outputWithoutMain: string[] = [];
    let inMainFunction = false;
    let braceCount = 0;
    
    for (const line of this.output) {
      if (line.includes('int main() {')) {
        inMainFunction = true;
        braceCount = 1;
        continue;
      }
      
      if (inMainFunction) {
        // Track braces to know when main() ends
        for (const char of line) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
        }
        
        if (braceCount === 0) {
          inMainFunction = false;
        }
        continue;
      }
      
      outputWithoutMain.push(line);
    }
    
    lines.push(...outputWithoutMain);
    
    lines.push('');
    lines.push('} // namespace gs');
    
    // Add main() function OUTSIDE the namespace if there was one
    if (this.output.some(line => line.includes('int main() {'))) {
      lines.push('');
      lines.push('int main() {');
      
      // Extract and add main body
      inMainFunction = false;
      braceCount = 0;
      
      for (const line of this.output) {
        if (line.includes('int main() {')) {
          inMainFunction = true;
          braceCount = 1;
          continue;
        }
        
        if (inMainFunction) {
          // Track braces
          for (const char of line) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
          }
          
          if (braceCount === 0) {
            break;
          }
          
          lines.push(line);
        }
      }
      
      lines.push('  return 0;');
      lines.push('}');
    }
    
    return lines.join('\n');
  }
  
  /**
   * Generate C++ code from a GoodScript AST
   */
  generate(sourceFile: ts.SourceFile, checker?: ts.TypeChecker): string {
    // Use passed checker if provided, otherwise fall back to instance checker
    if (checker) {
      this.checker = checker;
    }
    
    this.reset();
    this.generateSourceFile(sourceFile);
    return this.buildOutput();
  }
  
  /**
   * Generate code for the entire source file
   */
  private generateSourceFile(sourceFile: ts.SourceFile): void {
    // Separate top-level statements into declarations and executable statements
    const declarations: ts.Statement[] = [];
    const executableStatements: ts.Statement[] = [];
    
    for (const statement of sourceFile.statements) {
      // Skip type declarations (they're erased in runtime)
      if (ts.isTypeAliasDeclaration(statement)) {
        continue;
      }
      
      if (ts.isFunctionDeclaration(statement) || 
          ts.isClassDeclaration(statement) || 
          ts.isInterfaceDeclaration(statement) ||
          ts.isEnumDeclaration(statement)) {
        declarations.push(statement);
      } else {
        executableStatements.push(statement);
      }
    }
    
    // Generate declarations first
    for (const statement of declarations) {
      this.generateStatement(statement);
    }
    
    // If there are executable statements, wrap them in main()
    if (executableStatements.length > 0) {
      this.emit('');
      this.emit('int main() {');
      this.indent();
      
      for (const statement of executableStatements) {
        this.generateStatement(statement);
      }
      
      this.emit('return 0;');
      this.dedent();
      this.emit('}');
    }
  }
  
  /**
   * Generate code for a statement
   */
  private generateStatement(statement: ts.Statement): void {
    if (ts.isVariableStatement(statement)) {
      this.generateVariableStatement(statement);
    } else if (ts.isFunctionDeclaration(statement)) {
      this.generateFunctionDeclaration(statement);
    } else if (ts.isClassDeclaration(statement)) {
      this.generateClassDeclaration(statement);
    } else if (ts.isEnumDeclaration(statement)) {
      this.generateEnumDeclaration(statement);
    } else if (ts.isInterfaceDeclaration(statement)) {
      // Interfaces become structs in C++
      this.generateInterfaceDeclaration(statement);
    } else if (ts.isExpressionStatement(statement)) {
      this.generateExpressionStatement(statement);
    } else if (ts.isReturnStatement(statement)) {
      this.generateReturnStatement(statement);
    } else if (ts.isIfStatement(statement)) {
      this.generateIfStatement(statement);
    } else if (ts.isForStatement(statement)) {
      this.generateForStatement(statement);
    } else if (ts.isForOfStatement(statement)) {
      this.generateForOfStatement(statement);
    } else if (ts.isWhileStatement(statement)) {
      this.generateWhileStatement(statement);
    } else if (ts.isBlock(statement)) {
      this.generateBlock(statement);
    } else if (ts.isBreakStatement(statement)) {
      this.emit('break;');
    } else if (ts.isContinueStatement(statement)) {
      this.emit('continue;');
    } else {
      // Unsupported statement - add comment
      this.emit(`// TODO: Unsupported statement: ${ts.SyntaxKind[statement.kind]}`);
    }
  }
  
  /**
   * Check if an arrow function is recursive (calls itself)
   */
  private isRecursiveFunction(func: ts.ArrowFunction, varName: string): boolean {
    let isRecursive = false;
    
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        if (ts.isIdentifier(node.expression) && node.expression.getText() === varName) {
          isRecursive = true;
        }
      }
      ts.forEachChild(node, visit);
    };
    
    visit(func);
    return isRecursive;
  }
  
  /**
   * Infer array element type from usage patterns (assignments)
   */
  private inferArrayTypeFromUsage(arrayName: string, decl: ts.VariableDeclaration): string | null {
    // Find the containing source file or block
    let current: ts.Node = decl;
    let statementsContainer: ts.SourceFile | ts.Block | null = null;
    
    while (current) {
      if (ts.isSourceFile(current) || ts.isBlock(current)) {
        statementsContainer = current;
        break;
      }
      current = current.parent!;
    }
    
    if (!statementsContainer) return null;
    
    // Look for array element assignments: arrayName[index] = value
    let inferredType: string | null = null;
    
    const visit = (node: ts.Node): void => {
      if (ts.isExpressionStatement(node) && ts.isBinaryExpression(node.expression)) {
        const binary = node.expression;
        if (binary.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
            ts.isElementAccessExpression(binary.left)) {
          const elemAccess = binary.left;
          if (ts.isIdentifier(elemAccess.expression) && 
              elemAccess.expression.getText() === arrayName) {
            // Found an assignment to our array
            const value = binary.right;
            
            // Infer type from the value
            if (ts.isNumericLiteral(value)) {
              inferredType = 'std::vector<double>';
            } else if (ts.isStringLiteral(value)) {
              inferredType = 'std::vector<std::string>';
            } else if (value.kind === ts.SyntaxKind.TrueKeyword || 
                       value.kind === ts.SyntaxKind.FalseKeyword) {
              inferredType = 'std::vector<bool>';
            }
          }
        }
      }
      
      // Don't recurse into nested blocks/functions
      if (!ts.isBlock(node) && !ts.isFunctionDeclaration(node) && !ts.isArrowFunction(node)) {
        ts.forEachChild(node, visit);
      }
    };
    
    // Visit all statements in the container
    if (ts.isSourceFile(statementsContainer)) {
      statementsContainer.statements.forEach(visit);
    } else if (ts.isBlock(statementsContainer)) {
      statementsContainer.statements.forEach(visit);
    }
    
    if (inferredType) {
      this.addInclude('<vector>');
    }
    
    return inferredType;
  }
  
  /**
   * Generate variable declaration
   */
  private generateVariableStatement(statement: ts.VariableStatement): void {
    const declarations = statement.declarationList.declarations;
    const isConst = (statement.declarationList.flags & ts.NodeFlags.Const) !== 0;
    
    for (const decl of declarations) {
      if (!ts.isIdentifier(decl.name)) {
        this.emit('// TODO: Destructuring not yet supported');
        continue;
      }
      
      const name = this.escapeIdentifier(decl.name.getText());
      let type = decl.type ? this.generateType(decl.type) : 'auto';
      
      // If type is auto and initializer is empty array, try to infer element type from usage
      if (type === 'auto' && decl.initializer && ts.isArrayLiteralExpression(decl.initializer) && 
          decl.initializer.elements.length === 0) {
        // Look for assignments to this array in the same scope
        const inferredType = this.inferArrayTypeFromUsage(name, decl);
        if (inferredType) {
          type = inferredType;
        } else {
          // Default to double if we can't infer
          type = 'std::vector<double>';
          this.addInclude('<vector>');
        }
      }
      
      // If type is auto and initializer is a string literal, use std::string
      if (type === 'auto' && decl.initializer && ts.isStringLiteral(decl.initializer)) {
        type = 'std::string';
      }
      
      // Check if this is a recursive arrow function
      if (decl.initializer && ts.isArrowFunction(decl.initializer)) {
        const func = decl.initializer;
        if (this.isRecursiveFunction(func, decl.name.getText())) {
          // Generate as std::function with forward declaration
          const params = this.generateParameters(func.parameters);
          const returnType = func.type ? this.generateType(func.type) : 'auto';
          
          // Build function signature
          const paramTypes = func.parameters.map(p => {
            return p.type ? this.generateType(p.type) : 'auto';
          }).join(', ');
          
          this.addInclude('<functional>');
          
          // Forward declare as std::function
          this.emit(`std::function<${returnType}(${paramTypes})> ${name};`);
          
          // Generate the lambda and assign it
          const value = this.generateArrowFunction(func);
          this.emit(`${name} = ${value};`);
          continue;
        }
      }
      
      // In C++, skip const for object types to avoid issues with lambdas and object mutation
      // For primitives (double, bool, std::string literals), keep const
      const isPrimitive = type === 'double' || type === 'bool' || 
                         (decl.initializer && (ts.isNumericLiteral(decl.initializer) || 
                          ts.isStringLiteral(decl.initializer) ||
                          decl.initializer.kind === ts.SyntaxKind.TrueKeyword ||
                          decl.initializer.kind === ts.SyntaxKind.FalseKeyword));
      const qualifier = (isConst && isPrimitive) ? 'const ' : '';
      
      if (decl.initializer) {
        let value = this.generateExpression(decl.initializer);
        
        // Special handling: if variable type is shared_ptr and initializer is new T(), wrap with make_shared
        if (type.startsWith('gs::shared_ptr<') && ts.isNewExpression(decl.initializer) && 
            ts.isIdentifier(decl.initializer.expression)) {
          const className = decl.initializer.expression.getText();
          // Check if value is gs::ClassName(...)
          const match = value.match(/gs::([^(]+)\((.*)\)/);
          if (match && match[1] === className) {
            const args = match[2];
            this.addInclude('<memory>');
            value = `gs::make_shared<${className}>(${args})`;
          }
        }
        
        // Special handling: if variable type is unique_ptr and initializer is new T(), wrap with make_unique
        else if (type.startsWith('std::unique_ptr<') && ts.isNewExpression(decl.initializer) &&
            ts.isIdentifier(decl.initializer.expression)) {
          const className = decl.initializer.expression.getText();
          const match = value.match(/gs::([^(]+)\((.*)\)/);
          if (match && match[1] === className) {
            const args = match[2];
            this.addInclude('<memory>');
            value = `std::make_unique<${className}>(${args})`;
          }
        }
        
        this.emit(`${qualifier}${type} ${name} = ${value};`);
      } else {
        this.emit(`${type} ${name};`);
      }
    }
  }
  
  /**
   * Generate function declaration
   */
  private generateFunctionDeclaration(func: ts.FunctionDeclaration): void {
    const name = this.escapeIdentifier(func.name?.getText() || 'anonymous');
    const params = this.generateParameters(func.parameters);
    const returnType = func.type ? this.generateType(func.type) : 'void';
    
    // Track return type for smart pointer wrapping
    const previousReturnType = this.currentMethodReturnType;
    this.currentMethodReturnType = returnType;
    
    this.emit(`${returnType} ${name}(${params}) {`);
    this.indent();
    
    if (func.body) {
      this.generateBlock(func.body);
    }
    
    this.dedent();
    this.emit('}');
    this.emit('');
    
    // Restore previous return type
    this.currentMethodReturnType = previousReturnType;
  }
  
  /**
   * Generate function parameters
   */
  private generateParameters(parameters: ts.NodeArray<ts.ParameterDeclaration>): string {
    return parameters.map(p => {
      const name = this.escapeIdentifier(p.name.getText());
      const type = p.type ? this.generateType(p.type) : 'auto';
      return `${type} ${name}`;
    }).join(', ');
  }
  
  /**
   * Generate class declaration
   */
  private generateClassDeclaration(classDecl: ts.ClassDeclaration): void {
    const name = this.escapeIdentifier(classDecl.name?.getText() || 'AnonymousClass');
    
    this.emit(`class ${name} {`);
    this.emit('public:');
    this.indent();
    
    // Generate fields
    for (const member of classDecl.members) {
      if (ts.isPropertyDeclaration(member)) {
        const fieldName = this.escapeIdentifier(member.name.getText());
        let fieldType = member.type ? this.generateType(member.type) : 'auto';
        
        // Handle optional fields (name?: type)
        if (member.questionToken) {
          fieldType = `std::optional<${fieldType}>`;
        }
        
        this.emit(`${fieldType} ${fieldName};`);
      }
    }
    
    // Generate constructor
    const constructor = classDecl.members.find(ts.isConstructorDeclaration);
    if (constructor) {
      this.generateConstructor(name, constructor);
    }
    
    // Generate methods
    for (const member of classDecl.members) {
      if (ts.isMethodDeclaration(member)) {
        this.generateMethodDeclaration(member);
      }
    }
    
    this.dedent();
    this.emit('};');
    this.emit('');
  }
  
  /**
   * Generate constructor
   */
  private generateConstructor(className: string, constructor: ts.ConstructorDeclaration): void {
    const params = this.generateParameters(constructor.parameters);
    
    this.emit(`${className}(${params}) {`);
    this.indent();
    
    if (constructor.body) {
      for (const statement of constructor.body.statements) {
        this.generateStatement(statement);
      }
    }
    
    this.dedent();
    this.emit('}');
    this.emit('');
  }
  
  /**
   * Generate method declaration
   */
  private generateMethodDeclaration(method: ts.MethodDeclaration): void {
    const name = this.escapeIdentifier(method.name.getText());
    const params = this.generateParameters(method.parameters);
    const returnType = method.type ? this.generateType(method.type) : 'void';
    
    // Check if method is static
    const isStatic = method.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword) || false;
    const staticKeyword = isStatic ? 'static ' : '';
    
    // Track return type for smart pointer wrapping
    const previousReturnType = this.currentMethodReturnType;
    this.currentMethodReturnType = returnType;
    
    // Clear unwrapped optionals for new method scope
    this.unwrappedOptionals.clear();
    
    this.emit(`${staticKeyword}${returnType} ${name}(${params}) {`);
    this.indent();
    
    if (method.body) {
      for (const statement of method.body.statements) {
        this.generateStatement(statement);
      }
    }
    
    this.dedent();
    this.emit('}');
    this.emit('');
    
    // Restore previous return type
    this.currentMethodReturnType = previousReturnType;
  }
  
  /**
   * Generate interface declaration (becomes a struct in C++)
   */
  private generateInterfaceDeclaration(iface: ts.InterfaceDeclaration): void {
    const name = this.escapeIdentifier(iface.name.getText());
    
    this.emit(`struct ${name} {`);
    this.indent();
    
    for (const member of iface.members) {
      if (ts.isPropertySignature(member) && member.name) {
        const fieldName = this.escapeIdentifier(member.name.getText());
        let fieldType = member.type ? this.generateType(member.type) : 'auto';
        
        // Handle optional fields (name?: type)
        if (member.questionToken) {
          fieldType = `std::optional<${fieldType}>`;
        }
        
        this.emit(`${fieldType} ${fieldName};`);
      }
    }
    
    this.dedent();
    this.emit('};');
    this.emit('');
  }
  
  /**
   * Generate enum declaration
   */
  private generateEnumDeclaration(enumDecl: ts.EnumDeclaration): void {
    const name = this.escapeIdentifier(enumDecl.name.getText());
    this.emit(`enum class ${name} {`);
    this.indent();
    
    const members = enumDecl.members;
    members.forEach((member, index) => {
      const memberName = this.escapeIdentifier(member.name.getText());
      const isLast = index === members.length - 1;
      this.emit(`${memberName}${isLast ? '' : ','}`);
    });
    
    this.dedent();
    this.emit('};');
    this.emit('');
  }
  
  /**
   * Generate type annotation
   */
  private generateType(type: ts.TypeNode): string {
    if (ts.isTypeReferenceNode(type)) {
      return this.generateTypeReference(type);
    } else if (type.kind === ts.SyntaxKind.NumberKeyword) {
      return 'double';  // Default to double for numbers
    } else if (type.kind === ts.SyntaxKind.StringKeyword) {
      return 'gs::String';
    } else if (type.kind === ts.SyntaxKind.BooleanKeyword) {
      return 'bool';
    } else if (type.kind === ts.SyntaxKind.VoidKeyword) {
      return 'void';
    } else if (type.kind === ts.SyntaxKind.NullKeyword) {
      return 'std::nullopt_t';
    } else if (type.kind === ts.SyntaxKind.UndefinedKeyword) {
      return 'std::nullopt_t';
    } else if (ts.isArrayTypeNode(type)) {
      // No need to add include - gs_runtime.hpp provides it
      const elementType = this.generateType(type.elementType);
      return `gs::Array<${elementType}>`;
    } else if (ts.isTupleTypeNode(type)) {
      // Handle tuple types: [T, U] -> std::pair<T, U> (for 2 elements)
      // or std::tuple<T, U, V, ...> (for more elements)
      if (type.elements.length === 2) {
        this.addInclude('<utility>'); // for std::pair
        const first = this.generateType(type.elements[0]);
        const second = this.generateType(type.elements[1]);
        return `std::pair<${first}, ${second}>`;
      } else if (type.elements.length > 2) {
        this.addInclude('<tuple>');
        const elementTypes = type.elements.map(el => this.generateType(el)).join(', ');
        return `std::tuple<${elementTypes}>`;
      } else {
        // Single-element tuple or empty tuple - rare but possible
        this.addInclude('<tuple>');
        const elementTypes = type.elements.map(el => this.generateType(el)).join(', ');
        return `std::tuple<${elementTypes}>`;
      }
    } else if (ts.isUnionTypeNode(type)) {
      // Check if it's a nullable type (T | null | undefined)
      const hasNull = type.types.some(t => 
        t.kind === ts.SyntaxKind.NullKeyword || 
        t.kind === ts.SyntaxKind.UndefinedKeyword ||
        (ts.isLiteralTypeNode(t) && t.literal.kind === ts.SyntaxKind.NullKeyword)
      );
      
      if (hasNull) {
        // Find the non-null type
        const nonNullType = type.types.find(t => 
          t.kind !== ts.SyntaxKind.NullKeyword && 
          t.kind !== ts.SyntaxKind.UndefinedKeyword &&
          !(ts.isLiteralTypeNode(t) && t.literal.kind === ts.SyntaxKind.NullKeyword)
        );
        
        if (nonNullType) {
          const innerType = this.generateType(nonNullType);
          return `std::optional<${innerType}>`;
        }
      }
      
      // For non-nullable unions (shouldn't happen after validation, but fallback)
      // Don't generate std::variant - this should be caught in validation
      const types = type.types.map(t => this.generateType(t)).join(', ');
      return `/* TODO: Non-nullable union not supported: ${types} */`;
    }
    
    return 'auto';
  }
  
  /**
   * Generate type reference (handles ownership qualifiers)
   */
  private generateTypeReference(type: ts.TypeReferenceNode): string {
    const typeName = type.typeName.getText();
    
    // Handle ownership qualifiers
    if (typeName === 'own' && type.typeArguments && type.typeArguments.length > 0) {
      const innerType = this.generateType(type.typeArguments[0]);
      return `std::unique_ptr<${innerType}>`;
    } else if (typeName === 'share' && type.typeArguments && type.typeArguments.length > 0) {
      const innerType = this.generateType(type.typeArguments[0]);
      return `gs::shared_ptr<${innerType}>`;
    } else if (typeName === 'use' && type.typeArguments && type.typeArguments.length > 0) {
      const innerType = this.generateType(type.typeArguments[0]);
      return `gs::weak_ptr<${innerType}>`;
    } else if (typeName === 'Map' && type.typeArguments && type.typeArguments.length === 2) {
      // No need to add include - gs_runtime.hpp provides it
      const keyType = this.generateType(type.typeArguments[0]);
      const valueType = this.generateType(type.typeArguments[1]);
      return `gs::Map<${keyType}, ${valueType}>`;
    } else if (typeName === 'Set' && type.typeArguments && type.typeArguments.length > 0) {
      // No need to add include - gs_runtime.hpp provides it
      const elementType = this.generateType(type.typeArguments[0]);
      return `gs::Set<${elementType}>`;
    } else if (typeName === 'Promise' && type.typeArguments && type.typeArguments.length > 0) {
      // For now, map Promise<T> to the underlying type
      // TODO: Implement proper async/await with C++20 coroutines
      const innerType = this.generateType(type.typeArguments[0]);
      return innerType;
    }
    
    // Regular type reference
    return this.escapeIdentifier(typeName);
  }
  
  /**
   * Generate expression statement
   */
  private generateExpressionStatement(statement: ts.ExpressionStatement): void {
    const expr = this.generateExpression(statement.expression);
    this.emit(`${expr};`);
  }
  
  /**
   * Generate return statement
   */
  private generateReturnStatement(statement: ts.ReturnStatement): void {
    if (statement.expression) {
      let expr = this.generateExpression(statement.expression);
      
      // If returning own<T> and expression is a constructor call, wrap with make_unique
      if (this.currentMethodReturnType?.startsWith('std::unique_ptr<')) {
        if (ts.isNewExpression(statement.expression)) {
          // Extract the type from std::unique_ptr<Type>
          const match = this.currentMethodReturnType.match(/std::unique_ptr<(.+)>/);
          if (match) {
            const innerType = match[1];
            // expr is "gs::Token(args)", we need "std::make_unique<Token>(args)"
            // Extract just the args from gs::ClassName(args)
            const classMatch = expr.match(/gs::([^(]+)\((.*)\)/);
            if (classMatch) {
              const className = classMatch[1];
              const args = classMatch[2];
              this.addInclude('<memory>');
              expr = `std::make_unique<${className}>(${args})`;
            }
          }
        }
      }
      
      this.emit(`return ${expr};`);
    } else {
      this.emit('return;');
    }
  }
  
  /**
   * Generate if statement
   */
  private generateIfStatement(statement: ts.IfStatement): void {
    // Check if this is a null check on an optional variable
    // Pattern: if (varName === undefined) or if (varName !== undefined)
    const nullCheckVar = this.detectNullCheck(statement.expression);
    
    const condition = this.generateExpression(statement.expression);
    this.emit(`if (${condition}) {`);
    this.indent();
    
    // If this is "if (var !== undefined)", variable is safe to unwrap in then-block
    if (nullCheckVar && nullCheckVar.isNotNull) {
      const savedUnwrapped = new Set(this.unwrappedOptionals);
      this.unwrappedOptionals.add(nullCheckVar.varName);
      
      if (ts.isBlock(statement.thenStatement)) {
        for (const stmt of statement.thenStatement.statements) {
          this.generateStatement(stmt);
        }
      } else {
        this.generateStatement(statement.thenStatement);
      }
      
      this.unwrappedOptionals = savedUnwrapped;
    } else {
      // Check if the then-block has an early return (makes the else-path guaranteed)
      const hasEarlyReturn = this.hasEarlyReturn(statement.thenStatement);
      
      if (ts.isBlock(statement.thenStatement)) {
        for (const stmt of statement.thenStatement.statements) {
          this.generateStatement(stmt);
        }
      } else {
        this.generateStatement(statement.thenStatement);
      }
      
      // If there's an early return in "if (var === null)", then after the if,
      // the variable is guaranteed to be non-null
      if (nullCheckVar && !nullCheckVar.isNotNull && hasEarlyReturn && !statement.elseStatement) {
        this.unwrappedOptionals.add(nullCheckVar.varName);
      }
    }
    
    this.dedent();
    
    if (statement.elseStatement) {
      this.emit('} else {');
      this.indent();
      
      // If this is "if (var === undefined)", variable is safe to unwrap in else-block
      if (nullCheckVar && !nullCheckVar.isNotNull) {
        const savedUnwrapped = new Set(this.unwrappedOptionals);
        this.unwrappedOptionals.add(nullCheckVar.varName);
        
        if (ts.isBlock(statement.elseStatement)) {
          for (const stmt of statement.elseStatement.statements) {
            this.generateStatement(stmt);
          }
        } else {
          this.generateStatement(statement.elseStatement);
        }
        
        this.unwrappedOptionals = savedUnwrapped;
      } else {
        if (ts.isBlock(statement.elseStatement)) {
          for (const stmt of statement.elseStatement.statements) {
            this.generateStatement(stmt);
          }
        } else {
          this.generateStatement(statement.elseStatement);
        }
      }
      
      this.dedent();
    }
    
    this.emit('}');
  }
  
  /**
   * Check if a statement contains an early return
   */
  private hasEarlyReturn(stmt: ts.Statement): boolean {
    if (ts.isReturnStatement(stmt)) {
      return true;
    }
    if (ts.isBlock(stmt)) {
      return stmt.statements.some(s => ts.isReturnStatement(s));
    }
    return false;
  }
  
  /**
   * Detect if an expression is a null check on a variable
   * Returns {varName, isNotNull} if it's a check, null otherwise
   */
  private detectNullCheck(expr: ts.Expression): {varName: string, isNotNull: boolean} | null {
    if (!ts.isBinaryExpression(expr)) {
      return null;
    }
    
    const op = expr.operatorToken.kind;
    const isEquality = op === ts.SyntaxKind.EqualsEqualsEqualsToken;
    const isInequality = op === ts.SyntaxKind.ExclamationEqualsEqualsToken;
    
    if (!isEquality && !isInequality) {
      return null;
    }
    
    // Check if one side is a variable and the other is undefined/null/nullopt
    let varName: string | null = null;
    let isNull = false;
    
    if (ts.isIdentifier(expr.left)) {
      varName = expr.left.getText();
      isNull = this.isNullLiteral(expr.right);
    } else if (ts.isIdentifier(expr.right)) {
      varName = expr.right.getText();
      isNull = this.isNullLiteral(expr.left);
    }
    
    if (!varName || !isNull) {
      return null;
    }
    
    // if (var === null/undefined) -> then block has null, else block has value
    // if (var !== null/undefined) -> then block has value, else block has null
    return {
      varName: this.escapeIdentifier(varName),
      isNotNull: isInequality
    };
  }
  
  /**
   * Check if an expression is a null/undefined literal
   */
  private isNullLiteral(expr: ts.Expression): boolean {
    if (expr.kind === ts.SyntaxKind.NullKeyword) {
      return true;
    }
    if (ts.isIdentifier(expr) && expr.getText() === 'undefined') {
      return true;
    }
    return false;
  }
  
  /**
   * Check if a for loop is a simple array initialization pattern:
   * for (let i = 0; i < limit; i++) array[i] = value;
   * Returns {arrayName, limit, value} if it matches, null otherwise
   */
  private detectArrayInitPattern(statement: ts.ForStatement): {arrayName: string, limit: string, value: string} | null {
    // Check initializer: let i = 0
    if (!statement.initializer || !ts.isVariableDeclarationList(statement.initializer)) {
      return null;
    }
    
    const decl = statement.initializer.declarations[0];
    if (!ts.isIdentifier(decl.name) || !decl.initializer || !ts.isNumericLiteral(decl.initializer)) {
      return null;
    }
    
    const loopVar = decl.name.getText();
    const initValue = decl.initializer.getText();
    
    if (initValue !== '0') {
      return null;
    }
    
    // Check condition: i < limit
    if (!statement.condition || !ts.isBinaryExpression(statement.condition)) {
      return null;
    }
    
    if (!ts.isIdentifier(statement.condition.left) || statement.condition.left.getText() !== loopVar) {
      return null;
    }
    
    if (statement.condition.operatorToken.kind !== ts.SyntaxKind.LessThanToken) {
      return null;
    }
    
    const limit = this.generateExpression(statement.condition.right);
    
    // Check increment: i++
    if (!statement.incrementor || !ts.isPostfixUnaryExpression(statement.incrementor)) {
      return null;
    }
    
    if (!ts.isIdentifier(statement.incrementor.operand) || statement.incrementor.operand.getText() !== loopVar) {
      return null;
    }
    
    // Check body: single statement array[i] = value
    let bodyStmt: ts.Statement | undefined;
    
    if (ts.isBlock(statement.statement)) {
      if (statement.statement.statements.length !== 1) {
        return null;
      }
      bodyStmt = statement.statement.statements[0];
    } else {
      bodyStmt = statement.statement;
    }
    
    if (!ts.isExpressionStatement(bodyStmt)) {
      return null;
    }
    
    const expr = bodyStmt.expression;
    if (!ts.isBinaryExpression(expr) || expr.operatorToken.kind !== ts.SyntaxKind.EqualsToken) {
      return null;
    }
    
    // Check left side: array[i]
    if (!ts.isElementAccessExpression(expr.left)) {
      return null;
    }
    
    const arrayName = this.generateExpression(expr.left.expression);
    const indexExpr = expr.left.argumentExpression;
    
    if (!ts.isIdentifier(indexExpr) || indexExpr.getText() !== loopVar) {
      return null;
    }
    
    // Get the value being assigned
    const value = this.generateExpression(expr.right);
    
    return { arrayName, limit, value };
  }
  
  /**
   * Generate for statement
   */
  private generateForStatement(statement: ts.ForStatement): void {
    // Check if this is an array initialization pattern
    const initPattern = this.detectArrayInitPattern(statement);
    if (initPattern) {
      // Generate as array.resize(limit, value) or array.assign(limit, value)
      this.emit(`${initPattern.arrayName}.assign(${initPattern.limit}, ${initPattern.value});`);
      return;
    }
    
    let init = '';
    let condition = '';
    let increment = '';
    
    if (statement.initializer) {
      if (ts.isVariableDeclarationList(statement.initializer)) {
        const decl = statement.initializer.declarations[0];
        if (ts.isIdentifier(decl.name)) {
          const name = this.escapeIdentifier(decl.name.getText());
          const value = decl.initializer ? this.generateExpression(decl.initializer) : '0';
          init = `int ${name} = ${value}`;
        }
      } else {
        init = this.generateExpression(statement.initializer);
      }
    }
    
    if (statement.condition) {
      condition = this.generateExpression(statement.condition);
    }
    
    if (statement.incrementor) {
      increment = this.generateExpression(statement.incrementor);
    }
    
    this.emit(`for (${init}; ${condition}; ${increment}) {`);
    this.indent();
    
    if (ts.isBlock(statement.statement)) {
      for (const stmt of statement.statement.statements) {
        this.generateStatement(stmt);
      }
    } else {
      this.generateStatement(statement.statement);
    }
    
    this.dedent();
    this.emit('}');
  }
  
  /**
   * Generate for-of statement
   */
  private generateForOfStatement(statement: ts.ForOfStatement): void {
    let variable = '';
    let isArrayBinding = false;
    let bindingElements: string[] = [];
    
    if (ts.isVariableDeclarationList(statement.initializer)) {
      const decl = statement.initializer.declarations[0];
      
      // Check if it's array destructuring: for (const [key, value] of map)
      if (ts.isArrayBindingPattern(decl.name)) {
        isArrayBinding = true;
        bindingElements = decl.name.elements.map(el => {
          if (ts.isBindingElement(el) && ts.isIdentifier(el.name)) {
            return this.escapeIdentifier(el.name.getText());
          }
          return '';
        }).filter(name => name !== '');
      } else if (ts.isIdentifier(decl.name)) {
        variable = this.escapeIdentifier(decl.name.getText());
      }
    }
    
    const iterable = this.generateExpression(statement.expression);
    
    // For Map iteration with destructuring, generate: for (const auto& [key, value] : map)
    if (isArrayBinding && bindingElements.length > 0) {
      const binding = `[${bindingElements.join(', ')}]`;
      this.emit(`for (const auto& ${binding} : ${iterable}) {`);
    } else {
      this.emit(`for (const auto& ${variable} : ${iterable}) {`);
    }
    
    this.indent();
    
    if (ts.isBlock(statement.statement)) {
      for (const stmt of statement.statement.statements) {
        this.generateStatement(stmt);
      }
    } else {
      this.generateStatement(statement.statement);
    }
    
    this.dedent();
    this.emit('}');
  }
  
  /**
   * Generate while statement
   */
  private generateWhileStatement(statement: ts.WhileStatement): void {
    const condition = this.generateExpression(statement.expression);
    
    this.emit(`while (${condition}) {`);
    this.indent();
    
    if (ts.isBlock(statement.statement)) {
      for (const stmt of statement.statement.statements) {
        this.generateStatement(stmt);
      }
    } else {
      this.generateStatement(statement.statement);
    }
    
    this.dedent();
    this.emit('}');
  }
  
  /**
   * Generate block statement
   */
  private generateBlock(block: ts.Block): void {
    for (const statement of block.statements) {
      this.generateStatement(statement);
    }
  }
  
  /**
   * Helper to check if an expression has smart pointer type (own<T>, share<T>, or use<T>)
   */
  private isSmartPointerType(expr: ts.Expression): boolean {
    if (!this.checker) return false;
    
    // Check if it's a property access or identifier
    if (ts.isIdentifier(expr) || ts.isPropertyAccessExpression(expr)) {
      const symbol = this.checker.getSymbolAtLocation(
        ts.isIdentifier(expr) ? expr : expr.name
      );
      
      if (symbol?.valueDeclaration) {
        const typeText = this.getTypeTextFromSymbol(symbol);
        if (typeText) {
          // Exclude arrays - own<T>[], share<T>[], etc. are NOT smart pointers themselves
          if (typeText.endsWith('[]') || typeText.includes('[]>') || typeText.endsWith(']')) {
            return false;
          }
          
          // Check for ownership types or std smart pointers
          if (typeText.startsWith('own<') || 
              typeText.startsWith('share<') || 
              typeText.startsWith('use<') ||
              typeText.startsWith('std::unique_ptr<') ||
              typeText.startsWith('gs::shared_ptr<') ||
              typeText.startsWith('gs::weak_ptr<')) {
            return true;
          }
        }
        
        // If no explicit type annotation (e.g., using 'auto'), check initializer
        if (ts.isVariableDeclaration(symbol.valueDeclaration) && 
            symbol.valueDeclaration.initializer) {
          const init = symbol.valueDeclaration.initializer;
          
          // If initialized from element access of smart pointer array
          if (ts.isElementAccessExpression(init)) {
            return this.isSmartPointerType(init);
          }
          
          // If initialized from a call returning smart pointer
          if (ts.isCallExpression(init)) {
            const returnType = this.getMethodReturnTypeFromSource(init);
            if (returnType) {
              return returnType.startsWith('own<') || 
                     returnType.startsWith('share<') || 
                     returnType.startsWith('use<');
            }
          }
        }
      }
    }
    
    // Check if it's an element access (e.g., array[0] might be smart pointer)
    if (ts.isElementAccessExpression(expr) && this.checker) {
      const arrayExpr = expr.expression;
      const symbol = this.checker.getSymbolAtLocation(
        ts.isIdentifier(arrayExpr) ? arrayExpr : 
        ts.isPropertyAccessExpression(arrayExpr) ? arrayExpr.name : arrayExpr
      );
      
      if (symbol?.valueDeclaration) {
        const typeText = this.getTypeTextFromSymbol(symbol);
        if (typeText) {
          // Check for arrays of smart pointers: own<T>[], share<T>[], etc.
          return typeText.match(/(own|share|use)<[^>]+>\[\]/) !== null ||
                 typeText.includes('std::vector<std::unique_ptr<') ||
                 typeText.includes('std::vector<gs::shared_ptr<') ||
                 typeText.includes('std::vector<gs::weak_ptr<');
        }
      }
    }
    
    return false;
  }
  
  /**
   * Generate expression with null context awareness
   * If otherOperand is a smart pointer and this expr is null/undefined, use nullptr instead of std::nullopt
   */
  private generateExpressionWithNullContext(expr: ts.Expression, otherOperand?: ts.Expression): string {
    // Check if this is null/undefined and the other operand is a smart pointer
    const isNull = expr.kind === ts.SyntaxKind.NullKeyword;
    const isUndefined = expr.kind === ts.SyntaxKind.UndefinedKeyword || 
                        (ts.isIdentifier(expr) && expr.getText() === 'undefined');
    
    if ((isNull || isUndefined) && otherOperand && this.isSmartPointerType(otherOperand)) {
      return 'nullptr';
    }
    
    // Otherwise use normal generation
    return this.generateExpression(expr);
  }
  
  /**
   * Generate expression
   */
  private generateExpression(expr: ts.Expression): string {
    if (ts.isNumericLiteral(expr)) {
      return expr.text;
    } else if (ts.isStringLiteral(expr)) {
      // Escape backslashes and quotes for C++
      const escaped = expr.text
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      // Wrap in gs::String constructor
      return `gs::String("${escaped}")`;
    } else if (ts.isTemplateExpression(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
      return this.generateTemplateLiteral(expr);
    } else if (expr.kind === ts.SyntaxKind.TrueKeyword) {
      return 'true';
    } else if (expr.kind === ts.SyntaxKind.FalseKeyword) {
      return 'false';
    } else if (expr.kind === ts.SyntaxKind.NullKeyword) {
      return 'std::nullopt';
    } else if (expr.kind === ts.SyntaxKind.UndefinedKeyword) {
      return 'std::nullopt';
    } else if (expr.kind === ts.SyntaxKind.ThisKeyword) {
      return 'this';
    } else if (ts.isIdentifier(expr)) {
      const text = expr.getText();
      // Map JavaScript 'undefined' identifier to std::nullopt
      if (text === 'undefined') {
        return 'std::nullopt';
      }
      const escaped = this.escapeIdentifier(text);
      
      // If this variable is an unwrapped optional, add .value() to access it
      if (this.unwrappedOptionals.has(escaped)) {
        return `${escaped}.value()`;
      }
      
      return escaped;
    } else if (ts.isBinaryExpression(expr)) {
      return this.generateBinaryExpression(expr);
    } else if (ts.isCallExpression(expr)) {
      return this.generateCallExpression(expr);
    } else if (ts.isPropertyAccessExpression(expr)) {
      return this.generatePropertyAccess(expr);
    } else if (ts.isElementAccessExpression(expr)) {
      return this.generateElementAccess(expr);
    } else if (ts.isNewExpression(expr)) {
      return this.generateNewExpression(expr);
    } else if (ts.isArrayLiteralExpression(expr)) {
      return this.generateArrayLiteral(expr);
    } else if (ts.isPrefixUnaryExpression(expr)) {
      return this.generatePrefixUnaryExpression(expr);
    } else if (ts.isPostfixUnaryExpression(expr)) {
      return this.generatePostfixUnaryExpression(expr);
    } else if (ts.isConditionalExpression(expr)) {
      return this.generateConditionalExpression(expr);
    } else if (ts.isArrowFunction(expr)) {
      return this.generateArrowFunction(expr);
    } else if (ts.isParenthesizedExpression(expr)) {
      return `(${this.generateExpression(expr.expression)})`;
    }
    
    return '/* unsupported expression */';
  }
  
  /**
   * Generate binary expression
   */
  private generateBinaryExpression(expr: ts.BinaryExpression): string {
    const op = expr.operatorToken.getText();
    
    // Check if we're comparing against null/undefined with a smart pointer
    // This needs to happen before we call generateExpression on the operands
    let left = this.generateExpressionWithNullContext(expr.left, expr.right);
    let right = this.generateExpressionWithNullContext(expr.right, expr.left);
    
    // For assignment to array element, use helper that auto-resizes like JS
    if (op === '=' && ts.isElementAccessExpression(expr.left)) {
      const arrayExpr = this.generateExpression(expr.left.expression);
      const indexExpr = this.generateExpression(expr.left.argumentExpression);
      this.addInclude('<algorithm>');
      // Use a helper that resizes if needed: if (index >= arr.size()) arr.resize(index + 1);
      return `([&]() { auto& __arr = ${arrayExpr}; auto __idx = ${indexExpr}; if (__idx >= __arr.size()) __arr.resize(__idx + 1); return __arr[__idx] = ${right}; }())`;
    }
    
    // For assignment to smart pointer fields, wrap new expressions
    if (op === '=' && this.checker && ts.isPropertyAccessExpression(expr.left)) {
      if (ts.isNewExpression(expr.right)) {
        // Check if left side is a unique_ptr or shared_ptr field
        const propName = expr.left.name;
        const symbol = this.checker.getSymbolAtLocation(propName);
        if (symbol?.valueDeclaration) {
          const typeText = this.getTypeTextFromSymbol(symbol);
          
          // If assigning to unique_ptr field, wrap with make_unique
          if (typeText?.startsWith('own<') || typeText?.startsWith('std::unique_ptr<')) {
            const match = typeText.match(/(own|std::unique_ptr)<(.+)>/);
            if (match) {
              const innerType = match[2];
              // right is "gs::ClassName(args)", extract args
              const classMatch = right.match(/gs::([^(]+)\((.*)\)/);
              if (classMatch) {
                const className = classMatch[1];
                const args = classMatch[2];
                this.addInclude('<memory>');
                right = `std::make_unique<${className}>(${args})`;
              }
            }
          }
          
          // If assigning to shared_ptr field, wrap with make_shared
          else if (typeText?.startsWith('share<') || typeText?.startsWith('gs::shared_ptr<')) {
            const match = typeText.match(/(share|gs::shared_ptr)<(.+)>/);
            if (match) {
              const innerType = match[2];
              const classMatch = right.match(/gs::([^(]+)\((.*)\)/);
              if (classMatch) {
                const className = classMatch[1];
                const args = classMatch[2];
                this.addInclude('<memory>');
                right = `gs::make_shared<${className}>(${args})`;
              }
            }
          }
        }
      }
    }
    
    // For string concatenation with +, check if operands might be optional
    if (op === '+' && this.checker) {
      // Helper to check if an expression should be wrapped for optional extraction
      const shouldWrapOptional = (operand: ts.Expression): boolean => {
        // Check if it's a call expression that returns optional
        if (ts.isCallExpression(operand)) {
          const returnType = this.getMethodReturnTypeFromSource(operand);
          // Check for use<string>, string | null, string | undefined patterns
          if (returnType && (
            returnType.startsWith('use<string>') || 
            returnType.startsWith('use<String>') ||
            (returnType.includes('string') && (returnType.includes('null') || returnType.includes('undefined')))
          )) {
            return true;
          }
        }
        
        // Check if it's an identifier with optional type
        if (ts.isIdentifier(operand)) {
          const symbol = this.checker!.getSymbolAtLocation(operand);
          if (!symbol?.valueDeclaration) return false;
          
          // Check the type annotation
          const typeText = this.getTypeTextFromSymbol(symbol);
          if (typeText && (
            typeText.includes('null') || 
            typeText.includes('undefined') ||
            typeText.startsWith('use<')
          )) {
            return true;
          }
          
          // If no explicit type, check if it's initialized from a call that returns optional
          if (ts.isVariableDeclaration(symbol.valueDeclaration) && symbol.valueDeclaration.initializer) {
            if (ts.isCallExpression(symbol.valueDeclaration.initializer)) {
              const initReturnType = this.getMethodReturnTypeFromSource(symbol.valueDeclaration.initializer);
              if (initReturnType && (
                initReturnType.startsWith('use<string>') || 
                initReturnType.startsWith('use<String>') ||
                (initReturnType.includes('string') && (initReturnType.includes('null') || initReturnType.includes('undefined')))
              )) {
                return true;
              }
            }
          }
        }
        
        return false;
      };
      
      if (shouldWrapOptional(expr.right)) {
        right = `${right}.value_or("")`;
      }
      
      if (shouldWrapOptional(expr.left)) {
        left = `${left}.value_or("")`;
      }
    }
    
    // Map === to ==, !== to !=
    if (op === '===') {
      return `${left} == ${right}`;
    } else if (op === '!==') {
      return `${left} != ${right}`;
    }
    
    return `${left} ${op} ${right}`;
  }
  
  /**
   * Generate call expression
   */
  private generateCallExpression(expr: ts.CallExpression): string {
    const args = expr.arguments.map(arg => this.generateExpression(arg)).join(', ');
    
    // Handle JSON.stringify specially
    if (ts.isPropertyAccessExpression(expr.expression)) {
      const obj = expr.expression.expression.getText();
      const method = expr.expression.name.getText();
      if (obj === 'JSON' && method === 'stringify') {
        return `JSON::stringify(${args})`;
      }
    }
    
    // Handle String.fromCharCode early (before general property access handling)
    if (ts.isPropertyAccessExpression(expr.expression)) {
      const obj = expr.expression.expression.getText();
      const method = expr.expression.name.getText();
      if (obj === 'String' && method === 'fromCharCode') {
        return `gs::from_char_code(${args})`;
      }
    }
    
    // Handle method calls on objects
    if (ts.isPropertyAccessExpression(expr.expression)) {
      const object = this.generateExpression(expr.expression.expression);
      const methodName = expr.expression.name.getText();
      
      // Check if this is a static method call
      if (this.checker) {
        const symbol = this.checker.getSymbolAtLocation(expr.expression.name);
        if (symbol && symbol.flags & ts.SymbolFlags.Method) {
          const declarations = symbol.getDeclarations();
          if (declarations && declarations.length > 0) {
            const decl = declarations[0];
            if (ts.isMethodDeclaration(decl) && 
                decl.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword)) {
              // Static method call: ClassName.method() -> ClassName::method()
              return `${object}::${methodName}(${args})`;
            }
          }
        }
      }
      
      // Determine accessor: check if object is a shared_ptr or unique_ptr
      let accessor = '.';
      if (object === 'this') {
        accessor = '->';
      } else if (this.checker) {
        // Check if the object expression is a field/variable with share<T> or own<T> type
        const objExpr = expr.expression.expression;
        if (ts.isPropertyAccessExpression(objExpr)) {
          // e.g., this.input.charAt() - check if 'input' is share<T> or own<T>
          const symbol = this.checker.getSymbolAtLocation(objExpr.name);
          if (symbol?.valueDeclaration) {
            const typeText = this.getTypeTextFromSymbol(symbol);
            // Check if it's a smart pointer but NOT an array (arrays use .)
            if (typeText && !typeText.includes('[]') &&
                (typeText.startsWith('share<') || typeText.startsWith('gs::shared_ptr<') ||
                 typeText.startsWith('own<') || typeText.startsWith('std::unique_ptr<'))) {
              accessor = '->';
            }
          }
        } else if (ts.isIdentifier(objExpr)) {
          // e.g., input.charAt() - check if 'input' is share<T> or own<T>
          const symbol = this.checker.getSymbolAtLocation(objExpr);
          if (symbol?.valueDeclaration) {
            const typeText = this.getTypeTextFromSymbol(symbol);
            // Check if it's a smart pointer but NOT an array (arrays use .)
            if (typeText && !typeText.includes('[]') &&
                (typeText.startsWith('share<') || typeText.startsWith('gs::shared_ptr<') ||
                 typeText.startsWith('own<') || typeText.startsWith('std::unique_ptr<'))) {
              accessor = '->';
            }
          }
        }
      }
      
      // Special handling for console.log
      if (object === 'console' && methodName === 'log') {
        return `std::cout << std::boolalpha << ${args} << std::endl`;
      }
      
      // Map method
      if (methodName === 'set') {
        // map.set(key, value) -> map.insert() or map.emplace() depending on value type
        const argArray = expr.arguments.map(arg => this.generateExpression(arg));
        if (argArray.length === 2) {
          // Check if the map has smart pointer values
          const objExpr = expr.expression.expression;
          let hasSmartPtrValue = false;
          let valueElementType = '';
          let isShared = false;
          
          if (this.checker) {
            // Get type from AST to preserve ownership annotations (TypeChecker erases type aliases)
            const symbol = this.checker.getSymbolAtLocation(objExpr);
            if (symbol?.valueDeclaration && 'type' in symbol.valueDeclaration) {
              const typeNode = (symbol.valueDeclaration as any).type as ts.TypeNode | undefined;
              if (typeNode) {
                const typeText = typeNode.getText();
                // Check for Map<K, share<V>> or Map<K, own<V>> patterns in AST text
                const shareMatch = typeText.match(/Map<[^,]+,\s*share<([^>]+)>>/);
                const ownMatch = typeText.match(/Map<[^,]+,\s*own<([^>]+)>>/);
                
                if (shareMatch) {
                  hasSmartPtrValue = true;
                  valueElementType = shareMatch[1];
                  isShared = true;
                } else if (ownMatch) {
                  hasSmartPtrValue = true;
                  valueElementType = ownMatch[1];
                  isShared = false;
                }
              }
            }
          }
          
          if (hasSmartPtrValue && valueElementType) {
            // For smart pointer values, use emplace with make_unique/make_shared
            let valueArg = argArray[1];
            
            // Check if value is already a smart pointer
            let alreadySmartPtr = false;
            if (expr.arguments.length >= 2) {
              const valueArgExpr = expr.arguments[1];
              if (ts.isIdentifier(valueArgExpr) && this.checker) {
                const symbol = this.checker.getSymbolAtLocation(valueArgExpr);
                if (symbol?.valueDeclaration && ts.isVariableDeclaration(symbol.valueDeclaration)) {
                  const typeText = this.getTypeTextFromSymbol(symbol);
                  if (typeText && (typeText.startsWith('share<') || typeText.startsWith('own<') || 
                      typeText.startsWith('gs::shared_ptr<') || typeText.startsWith('std::unique_ptr<'))) {
                    alreadySmartPtr = true;
                  }
                }
              }
            }
            
            // Check if value is already wrapped or is already a smart pointer variable
            if (alreadySmartPtr || valueArg.includes('std::make_unique') || valueArg.includes('gs::make_shared') || valueArg.includes('std::move')) {
              // Already a smart pointer, just use it as-is
              return `${object}${accessor}emplace(${argArray[0]}, ${valueArg})`;
            }
            
            // Value needs to be wrapped
            const wrapperFn = isShared ? 'gs::make_shared' : 'std::make_unique';
            
            // Check if the argument is from a method returning optional
            // If so, we need to unwrap it first with *value or value.value()
            let needsUnwrap = false;
            
            if (expr.arguments.length >= 2) {
              const valueArgExpr = expr.arguments[1];
              
              // Direct call expression
              if (ts.isCallExpression(valueArgExpr)) {
                const returnType = this.getMethodReturnTypeFromSource(valueArgExpr);
                if (returnType && (returnType.includes('| null') || returnType.includes('| undefined'))) {
                  needsUnwrap = true;
                }
              }
              // Identifier that was initialized from a call returning optional
              else if (ts.isIdentifier(valueArgExpr) && this.checker) {
                const symbol = this.checker.getSymbolAtLocation(valueArgExpr);
                if (symbol?.valueDeclaration && ts.isVariableDeclaration(symbol.valueDeclaration)) {
                  const init = symbol.valueDeclaration.initializer;
                  if (init && ts.isCallExpression(init)) {
                    const returnType = this.getMethodReturnTypeFromSource(init);
                    if (returnType && (returnType.includes('| null') || returnType.includes('| undefined'))) {
                      needsUnwrap = true;
                    }
                  }
                }
              }
            }
            
            if (needsUnwrap) {
              valueArg = `*${valueArg}`;
            }
            
            valueArg = `${wrapperFn}<${valueElementType}>(${valueArg})`;
            
            return `${object}${accessor}emplace(${argArray[0]}, ${valueArg})`;
          } else {
            // For other types, use insert
            return `${object}${accessor}insert({${argArray[0]}, ${argArray[1]}})`;
          }
        }
      }
      
      if (methodName === 'get') {
        // Only apply special handling if this is a Map
        const objExpr = expr.expression.expression;
        let isMap = false;
        
        if (this.checker) {
          const symbol = this.checker.getSymbolAtLocation(objExpr);
          if (symbol?.valueDeclaration && 'type' in symbol.valueDeclaration) {
            const typeNode = (symbol.valueDeclaration as any).type as ts.TypeNode | undefined;
            if (typeNode) {
              const typeText = typeNode.getText();
              isMap = typeText.startsWith('Map<');
            }
          }
        }
        
        if (isMap) {
          // map.get(key) - returns optional in our case
          const argArray = expr.arguments.map(arg => this.generateExpression(arg));
          if (argArray.length === 1) {
            return `gs::map_get(${object}, ${argArray[0]})`;
          }
        }
        // Otherwise, fall through to regular method call
      }
      
      if (methodName === 'has') {
        // Only apply special handling if this is a Map
        const objExpr = expr.expression.expression;
        let isMap = false;
        
        if (this.checker) {
          const symbol = this.checker.getSymbolAtLocation(objExpr);
          if (symbol?.valueDeclaration && 'type' in symbol.valueDeclaration) {
            const typeNode = (symbol.valueDeclaration as any).type as ts.TypeNode | undefined;
            if (typeNode) {
              const typeText = typeNode.getText();
              isMap = typeText.startsWith('Map<');
            }
          }
        }
        
        if (isMap) {
          // map.has(key) -> map.find(key) != map.end()
          return `(${object}${accessor}find(${args}) != ${object}${accessor}end())`;
        }
        // Otherwise, fall through to regular method call
      }
      
      if (methodName === 'delete') {
        // map.delete(key) -> map.erase(key)
        return `${object}${accessor}erase(${args})`;
      }
      
      // Array methods
      if (methodName === 'push') {
        // Check if array has smart pointer elements
        const objExpr = expr.expression.expression;
        let hasSmartPtrElement = false;
        let elementType = '';
        let isShared = false;
        
        if (this.checker) {
          let symbol: ts.Symbol | undefined;
          
          // Handle both identifier (myArray.push) and property access (this.nodes.push)
          if (ts.isIdentifier(objExpr)) {
            symbol = this.checker.getSymbolAtLocation(objExpr);
          } else if (ts.isPropertyAccessExpression(objExpr)) {
            symbol = this.checker.getSymbolAtLocation(objExpr.name);
          }
          
          if (symbol?.valueDeclaration && 'type' in symbol.valueDeclaration) {
            const typeNode = (symbol.valueDeclaration as any).type as ts.TypeNode | undefined;
            if (typeNode) {
              const typeText = typeNode.getText();
              // Check for own<T>[] or share<T>[] patterns
              const ownMatch = typeText.match(/own<([^>]+)>\[\]/);
              const shareMatch = typeText.match(/share<([^>]+)>\[\]/);
              
              if (ownMatch) {
                hasSmartPtrElement = true;
                elementType = ownMatch[1];
                isShared = false;
              } else if (shareMatch) {
                hasSmartPtrElement = true;
                elementType = shareMatch[1];
                isShared = true;
              }
            }
          }
        }
        
        if (hasSmartPtrElement && elementType) {
          // Use wrap_for_push helper to automatically wrap if needed
          const argExpr = expr.arguments[0];
          let valueArg = this.generateExpression(argExpr);
          
          // Simplified: just call wrap_for_push which handles all the logic
          return `${object}${accessor}push_back(gs::wrap_for_push<${isShared ? 'gs::shared_ptr' : 'std::unique_ptr'}<${elementType}>>(${valueArg}))`;
        } else {
          return `${object}${accessor}push_back(${args})`;
        }
      }
      
      if (methodName === 'slice') {
        // array.slice(start, end)
        const argArray = expr.arguments.map(arg => this.generateExpression(arg));
        if (argArray.length === 2) {
          this.addInclude('<algorithm>');
          const start = argArray[0];
          const end = argArray[1];
          // Create a new vector from the slice
          return `std::vector<decltype(${object})::value_type>(${object}.begin() + ${start}, ${object}.begin() + ${end})`;
        }
      }
      
      if (methodName === 'map') {
        // array.map(lambda)
        const lambda = expr.arguments[0];
        const lambdaStr = this.generateExpression(lambda);
        this.addInclude('<algorithm>');
        
        // Check if object is a simple identifier or a complex expression
        // If complex (like a method call), we need to store it in a variable first
        const objectExpr = expr.expression.expression;
        const isComplexObject = !ts.isIdentifier(objectExpr) || object.includes('(');
        
        if (isComplexObject) {
          // Store the source in a variable to avoid creating it multiple times
          return `[&]() { auto __src = ${object}; std::vector<std::string> __result; std::transform(__src.begin(), __src.end(), std::back_inserter(__result), ${lambdaStr}); return __result; }()`;
        } else {
          // Simple case - object is an identifier
          return `[&]() { std::vector<std::string> __result; std::transform(${object}.begin(), ${object}.end(), std::back_inserter(__result), ${lambdaStr}); return __result; }()`;
        }
      }
      
      if (methodName === 'join') {
        // array.join(separator)
        const separator = expr.arguments.length > 0 ? this.generateExpression(expr.arguments[0]) : '\" \"';
        this.addInclude('<algorithm>');
        
        // Similar fix for join - store complex objects first
        const objectExpr = expr.expression.expression;
        const isComplexObject = !ts.isIdentifier(objectExpr) || object.includes('(');
        
        if (isComplexObject) {
          return `[&]() { auto __src = ${object}; std::string __result; for (size_t __i = 0; __i < __src.size(); __i++) { if (__i > 0) __result += ${separator}; __result += __src[__i]; } return __result; }()`;
        } else {
          return `[&]() { std::string __result; for (size_t __i = 0; __i < ${object}.size(); __i++) { if (__i > 0) __result += ${separator}; __result += ${object}[__i]; } return __result; }()`;
        }
      }
      
      // String methods
      if (methodName === 'startsWith') {
        return `gs::starts_with(${object}, ${args})`;
      }
      
      if (methodName === 'substring') {
        const argArray = expr.arguments.map(arg => this.generateExpression(arg));
        if (argArray.length === 1) {
          return `${object}${accessor}substr(${argArray[0]})`;
        } else if (argArray.length === 2) {
          return `${object}${accessor}substr(${argArray[0]}, ${argArray[1]} - ${argArray[0]})`;
        }
      }
      
      if (methodName === 'indexOf') {
        return `gs::index_of(${object}, ${args})`;
      }
      
      if (methodName === 'charAt') {
        // string.charAt(index) -> string.substr(index, 1) or string[index]
        return `${object}${accessor}substr(${args}, 1)`;
      }
      
      if (methodName === 'charCodeAt') {
        // string.charCodeAt(index) -> static_cast<int>(string[index])
        return `static_cast<int>(${object}[${args}])`;
      }
      
      return `${object}${accessor}${methodName}(${args})`;
    }
    
    const callee = this.generateExpression(expr.expression);
    return `${callee}(${args})`;
  }
  
  /**
   * Generate property access
   */
  private generatePropertyAccess(expr: ts.PropertyAccessExpression): string {
    const object = this.generateExpression(expr.expression);
    const propertyName = expr.name.getText();
    const property = this.escapeIdentifier(propertyName);
    
    // Check if this is enum member access
    if (this.checker) {
      const symbol = this.checker.getSymbolAtLocation(expr.expression);
      if (symbol) {
        const type = this.checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!);
        // Check if it's an enum type
        if (type.symbol && type.symbol.flags & ts.SymbolFlags.Enum) {
          // Enum member access: EnumName.Member -> EnumName::Member
          return `${object}::${property}`;
        }
      }
    }
    
    // Determine the accessor (. or ->)
    let accessor = '.';
    let needsOptionalUnwrap = false;
    
    // Special handling for 'this' - it's a pointer in C++
    if (object === 'this') {
      accessor = '->';
    }
    // Check if the expression is a smart pointer using our helper
    else if (this.isSmartPointerType(expr.expression)) {
      accessor = '->';
    }
    // Check if it's a variable that might need optional unwrapping
    else if (this.checker && ts.isIdentifier(expr.expression)) {
      const symbol = this.checker.getSymbolAtLocation(expr.expression);
      if (symbol?.valueDeclaration && ts.isVariableDeclaration(symbol.valueDeclaration)) {
        const init = symbol.valueDeclaration.initializer;
        if (init && ts.isCallExpression(init)) {
          // For Map.get() and similar built-in methods, we need to look at the Map's AST type
          // not the TypeChecker type (which erases ownership qualifiers)
          if (ts.isPropertyAccessExpression(init.expression) && 
              init.expression.name.getText() === 'get') {
            // Get the symbol for the map object
            if (ts.isPropertyAccessExpression(init.expression.expression)) {
              // this.cache.get() - get symbol for 'cache'
              const mapSymbol = this.checker.getSymbolAtLocation(init.expression.expression.name);
              if (mapSymbol) {
                const mapTypeText = this.getTypeTextFromSymbol(mapSymbol);
                
                // Check if it's Map<K, share<V>>
                const match = mapTypeText?.match(/Map<[^,]+,\s*share<([^>]+)>>/);
                if (match) {
                  // Map<K, share<V>>.get() returns share<V> | undefined -> optional<shared_ptr<V>>
                  needsOptionalUnwrap = true;
                  accessor = '->';
                }
              }
            }
          }
          
          // Also try to get return type from method signature
          const returnType = this.getMethodReturnTypeFromSource(init);
          if (returnType) {
            // Check if it returns share<T> | undefined or share<T> | null
            const isOptionalShare = 
              returnType.match(/^share<[^>]+>\s*\|\s*(undefined|null)/) ||
              returnType.match(/^(undefined|null)\s*\|\s*share<[^>]+>/);
            
            if (isOptionalShare) {
              // This is optional<shared_ptr<T>>, need both unwrap and ->
              needsOptionalUnwrap = true;
              accessor = '->';
            }
            // Check for other optional types
            else if (returnType.includes('| null') || returnType.includes('| undefined')) {
              accessor = '->';
            }
          }
        }
        // Also check declared type if no initializer
        else {
          const typeText = this.getTypeTextFromSymbol(symbol);
          if (typeText && (typeText.includes('| null') || typeText.includes('| undefined'))) {
            accessor = '->';
          }
        }
      }
    }
    
    // Map TypeScript/JavaScript property names to C++ equivalents
    if (propertyName === 'length') {
      // array.length -> array.size()
      const sizeCall = `${object}${accessor}size()`;
      return needsOptionalUnwrap ? `(*${object})->size()` : sizeCall;
    }
    
    // If we need to unwrap optional<shared_ptr<T>>, generate (*obj)->property
    if (needsOptionalUnwrap) {
      return `(*${object})->${property}`;
    }
    
    return `${object}${accessor}${property}`;
  }
  
  /**
   * Helper to get type text from a symbol's value declaration
   */
  private getTypeTextFromSymbol(symbol: ts.Symbol): string | undefined {
    if (symbol.valueDeclaration && 'type' in symbol.valueDeclaration) {
      const typeNode = (symbol.valueDeclaration as any).type as ts.TypeNode | undefined;
      return typeNode?.getText();
    }
    return undefined;
  }
  
  /**
   * Get the return type from a method call by examining the source AST
   */
  private getMethodReturnTypeFromSource(callExpr: ts.CallExpression): string | undefined {
    if (!this.checker) return undefined;
    
    const signature = this.checker.getResolvedSignature(callExpr);
    if (!signature || !signature.declaration) return undefined;
    
    if (ts.isMethodDeclaration(signature.declaration)) {
      const returnTypeNode = signature.declaration.type;
      return returnTypeNode?.getText();
    }
    
    return undefined;
  }
  
  /**
   * Generate new expression
   */
  private generateNewExpression(expr: ts.NewExpression): string {
    const rawArgs = expr.arguments?.map(arg => this.generateExpression(arg)) || [];
    let args = rawArgs.join(', ');
    
    // Handle special constructors
    if (ts.isIdentifier(expr.expression)) {
      const className = expr.expression.getText();
      
      // Map constructor
      if (className === 'Map') {
        // Check if we have type arguments to generate the full type
        if (expr.typeArguments && expr.typeArguments.length === 2) {
          const keyType = this.generateType(expr.typeArguments[0]);
          const valueType = this.generateType(expr.typeArguments[1]);
          return `std::unordered_map<${keyType}, ${valueType}>{}`;
        }
        // new Map() -> {} (default initialization)
        return '{}';
      }
      
      // Set constructor
      if (className === 'Set') {
        return '{}';
      }
      
      // Array constructor - check for type arguments
      if (className === 'Array') {
        let elementType = 'double';  // default
        
        // Check if new Array<T>() has type arguments
        if (expr.typeArguments && expr.typeArguments.length > 0) {
          elementType = this.generateType(expr.typeArguments[0]);
        }
        
        // If args are provided, use them for size
        if (args) {
          return `std::vector<${elementType}>(${args})`;
        }
        
        // Empty array - NOTE: In JS, empty arrays auto-expand on index assignment
        // In C++, we need explicit sizing. For now, return empty vector.
        // The user will need to call resize() or use push_back()
        return `std::vector<${elementType}>()`;
      }
      
      // For user-defined classes, check if constructor parameters need smart pointer wrapping
      if (this.checker && expr.arguments) {
        const symbol = this.checker.getSymbolAtLocation(expr.expression);
        if (symbol) {
          const declarations = symbol.getDeclarations();
          if (declarations && declarations.length > 0) {
            const classDecl = declarations.find(ts.isClassDeclaration);
            if (classDecl) {
              const constructor = classDecl.members.find(ts.isConstructorDeclaration);
              if (constructor && constructor.parameters) {
                // Wrap arguments that need smart pointers
                const wrappedArgs = expr.arguments.map((arg, i) => {
                  if (i >= constructor.parameters.length) return rawArgs[i];
                  
                  const param = constructor.parameters[i];
                  if (param.type && ts.isTypeReferenceNode(param.type)) {
                    const paramTypeText = param.type.getText();
                    
                    // If parameter expects share<string>
                    if (paramTypeText === 'share<string>') {
                      // Check if argument is already share<string> (don't double-wrap)
                      if (ts.isIdentifier(arg) && this.checker) {
                        const argSymbol = this.checker.getSymbolAtLocation(arg);
                        if (argSymbol?.valueDeclaration && 'type' in argSymbol.valueDeclaration) {
                          const argTypeNode = (argSymbol.valueDeclaration as any).type;
                          if (argTypeNode && argTypeNode.getText() === 'share<string>') {
                            // Already share<string>, no need to wrap
                            return rawArgs[i];
                          }
                        }
                      }
                      
                      // Otherwise wrap literals/values in make_shared
                      if (ts.isStringLiteral(arg) || ts.isIdentifier(arg)) {
                        this.addInclude('<memory>');
                        return `gs::make_shared<std::string>(${rawArgs[i]})`;
                      }
                    }
                  }
                  
                  return rawArgs[i];
                });
                args = wrappedArgs.join(', ');
              }
            }
          }
        }
      }
      
      const escapedName = this.escapeIdentifier(className);
      // Classes defined in the code need gs:: prefix when used in main()
      return `gs::${escapedName}(${args})`;
    }
    
    const className = this.generateExpression(expr.expression);
    return `${className}(${args})`;
  }
  
  /**
   * Generate array literal
   */
  private generateArrayLiteral(expr: ts.ArrayLiteralExpression): string {
    const elements = expr.elements.map(el => this.generateExpression(el)).join(', ');
    
    // Check if all elements are strings to determine type
    const allStrings = expr.elements.every(el => ts.isStringLiteral(el));
    
    if (allStrings && expr.elements.length > 0) {
      // Explicitly create a gs::Array of gs::Strings
      return `gs::Array<gs::String>{${elements}}`;
    }
    
    return `{${elements}}`;
  }
  
  /**
   * Generate prefix unary expression
   */
  private generatePrefixUnaryExpression(expr: ts.PrefixUnaryExpression): string {
    const operand = this.generateExpression(expr.operand);
    const op = ts.tokenToString(expr.operator);
    return `${op}${operand}`;
  }
  
  /**
   * Generate postfix unary expression
   */
  private generatePostfixUnaryExpression(expr: ts.PostfixUnaryExpression): string {
    const operand = this.generateExpression(expr.operand);
    const op = ts.tokenToString(expr.operator);
    return `${operand}${op}`;
  }
  
  /**
   * Generate conditional (ternary) expression
   */
  private generateConditionalExpression(expr: ts.ConditionalExpression): string {
    const condition = this.generateExpression(expr.condition);
    const whenTrue = this.generateExpression(expr.whenTrue);
    const whenFalse = this.generateExpression(expr.whenFalse);
    return `(${condition} ? ${whenTrue} : ${whenFalse})`;
  }
  
  /**
   * Generate element access (array/map indexing)
   * 
   * For arrays, we need bounds checking to match JavaScript semantics.
   * JavaScript returns undefined for out-of-bounds reads; we return default value (0, false, etc.)
   * to avoid exceptions while maintaining safety.
   */
  private generateElementAccess(expr: ts.ElementAccessExpression): string {
    const object = this.generateExpression(expr.expression);
    const index = this.generateExpression(expr.argumentExpression);
    const accessor = (object === 'this') ? '->' : '.';
    
    // For maps, use [] operator (creates entry if not exists, matching JS behavior)
    // For arrays, use safe accessor that returns default value for out-of-bounds
    
    // Check if this is array access vs map access
    if (this.checker) {
      const type = this.checker.getTypeAtLocation(expr.expression);
      const typeString = this.checker.typeToString(type);
      
      // If it's clearly a Map/unordered_map, use [] operator
      if (typeString.includes('Map') || typeString.includes('unordered_map')) {
        if (object === 'this') {
          return `${object}->${index}`;
        }
        return `${object}[${index}]`;
      }
      
      // Check if this is a tuple/pair access with numeric literal
      // TypeScript represents tuples as [T, U] which we map to std::pair or std::tuple
      // When accessing with numeric literal like entries[j][1], need std::get<N>()
      if (ts.isNumericLiteral(expr.argumentExpression)) {
        const indexValue = expr.argumentExpression.text;
        // Check if the object type is a tuple/pair
        // If object is array_get(entries, j) where entries is [T,U][], result is std::pair
        // Or if object directly has tuple type
        const objectType = this.checker.getTypeAtLocation(expr.expression);
        const objectTypeString = this.checker.typeToString(objectType);
        
        // If type string contains 'pair' or 'tuple', use std::get
        if (objectTypeString.includes('pair<') || objectTypeString.includes('tuple<')) {
          return `std::get<${indexValue}>(${object})`;
        }
        
        // Also check if this is accessing result of another element access on tuple array
        // e.g., entries[j][1] where entries is [T,U][]
        if (ts.isElementAccessExpression(expr.expression)) {
          const outerType = this.checker.getTypeAtLocation(expr.expression.expression);
          const outerTypeStr = this.checker.typeToString(outerType);
          // Check if it's an array of tuples
          if (outerTypeStr.match(/\[.*,.*\]\[\]/) || outerTypeStr.includes('pair') || outerTypeStr.includes('tuple')) {
            return `std::get<${indexValue}>(${object})`;
          }
        }
      }
    }
    
    // For arrays (std::vector), use safe accessor
    // JavaScript returns undefined for out-of-bounds, we return default value (0, false, empty string, etc.)
    // This matches JS semantics better than throwing exception
    if (object === 'this') {
      return `gs::array_get(${object}${accessor}vec, ${index})`;
    }
    
    return `gs::array_get(${object}, ${index})`;
  }
  
  /**
   * Generate arrow function
   */
  private generateArrowFunction(func: ts.ArrowFunction): string {
    // For now, generate as a lambda expression
    const params = this.generateParameters(func.parameters);
    const returnType = func.type ? this.generateType(func.type) : 'auto';
    
    // Generate lambda - check if it's simple enough for single-line
    if (!ts.isBlock(func.body)) {
      // Expression body - single line is fine
      const expr = this.generateExpression(func.body);
      return `[&](${params}) -> ${returnType} { return ${expr}; }`;
    }
    
    // Block body - check if it's simple (1-2 statements)
    const stmtCount = func.body.statements.length;
    const isSimple = stmtCount <= 1;
    
    if (isSimple) {
      // Generate inline for simple lambdas
      const statements: string[] = [];
      for (const stmt of func.body.statements) {
        const oldOutput = this.output;
        this.output = [];
        this.generateStatement(stmt);
        statements.push(...this.output);
        this.output = oldOutput;
      }
      const body = statements.map(s => s.trim()).join(' ');
      return `[&](${params}) -> ${returnType} { ${body} }`;
    }
    
    // Complex lambda - generate multiline with IIFE pattern
    // Use immediately-invoked lambda to properly format
    const lines: string[] = [];
    lines.push(`[&](${params}) -> ${returnType} {`);
    
    // Temporarily increase indent and generate body
    const oldOutput = this.output;
    const oldIndent = this.indentLevel;
    this.output = [];
    this.indentLevel = 0;
    
    for (const stmt of func.body.statements) {
      this.generateStatement(stmt);
    }
    
    // Capture generated statements and restore state
    const bodyLines = this.output;
    this.output = oldOutput;
    this.indentLevel = oldIndent;
    
    // Add indented body
    for (const line of bodyLines) {
      lines.push('  ' + line);
    }
    
    lines.push('}');
    
    // Join with newlines and return as inline block
    // For now, keep it inline with spaces since we're in expression context
    return lines.join('\n');
  }
  
  /**
   * Generate template literal (string interpolation)
   */
  private generateTemplateLiteral(expr: ts.TemplateExpression | ts.NoSubstitutionTemplateLiteral): string {
    if (ts.isNoSubstitutionTemplateLiteral(expr)) {
      // Escape quotes in string literal
      const escaped = expr.text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
      return `"${escaped}"`;
    }
    
    // Build concatenation expression
    const parts: string[] = [];
    
    // Head
    if (expr.head.text) {
      // Escape quotes and special characters in string literal
      const escaped = expr.head.text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
      parts.push(`"${escaped}"`);
    }
    
    // Template spans
    for (const span of expr.templateSpans) {
      // Expression - handle different types appropriately
      const exprStr = this.generateExpression(span.expression);
      
      // Determine the type of the expression to decide how to convert to string
      let convertedExpr = exprStr;
      
      if (this.checker) {
        const type = this.checker.getTypeAtLocation(span.expression);
        const typeStr = this.checker.typeToString(type);
        
        // For identifiers, also check their declared type (not narrowed type)
        let declaredTypeStr = typeStr;
        if (ts.isIdentifier(span.expression)) {
          const symbol = this.checker.getSymbolAtLocation(span.expression);
          if (symbol && symbol.valueDeclaration) {
            const declaredType = this.checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);
            declaredTypeStr = this.checker.typeToString(declaredType);
          }
        }
        
        // Debug: log what type we're seeing
        // console.log(`[Template Literal] Expression: ${exprStr}, Type: ${typeStr}, Declared: ${declaredTypeStr}`);
        
        // Use declared type for checking if it's optional
        const checkTypeStr = declaredTypeStr;
        
        // Check if it's a string type (or optional string)
        if (checkTypeStr === 'string') {
          // Plain string - no conversion needed
          convertedExpr = exprStr;
        } else if (checkTypeStr.includes('string') && (checkTypeStr.includes('null') || checkTypeStr.includes('undefined'))) {
          // Optional string - extract value
          // Check if already unwrapped (identifier in unwrappedOptionals)
          const isAlreadyUnwrapped = ts.isIdentifier(span.expression) && 
                                    this.unwrappedOptionals.has(span.expression.text);
          
          if (isAlreadyUnwrapped) {
            // Already unwrapped by generateExpression, don't add .value() again
            convertedExpr = exprStr;
          } else if (typeStr === 'string' && checkTypeStr !== 'string') {
            // Narrowed to non-null, can use .value()
            convertedExpr = `${exprStr}.value()`;
          } else {
            convertedExpr = `${exprStr}.value_or("")`;
          }
        } else if (checkTypeStr === 'number') {
          // Number - convert to string (use to_string_int to avoid .000000 for integers)
          convertedExpr = `gs::to_string_int(${exprStr})`;
        } else if (checkTypeStr.includes('number') && (checkTypeStr.includes('null') || checkTypeStr.includes('undefined'))) {
          // Optional number - extract value then convert
          // Check if already unwrapped (identifier in unwrappedOptionals)
          const isAlreadyUnwrapped = ts.isIdentifier(span.expression) && 
                                    this.unwrappedOptionals.has(span.expression.text);
          
          if (isAlreadyUnwrapped) {
            // Already unwrapped by generateExpression, just convert to string
            convertedExpr = `gs::to_string_int(${exprStr})`;
          } else if (typeStr === 'number' && checkTypeStr !== 'number') {
            // Narrowed to non-null, can use .value()
            convertedExpr = `gs::to_string_int(${exprStr}.value())`;
          } else {
            convertedExpr = `gs::to_string_int(${exprStr}.value_or(0))`;
          }
        } else if (checkTypeStr === 'boolean') {
          // Boolean - convert to string via stream
          convertedExpr = `(${exprStr} ? "true" : "false")`;
        } else {
          // Default: use to_string_int
          convertedExpr = `gs::to_string_int(${exprStr})`;
        }
      } else {
        // No type checker available - use to_string_int as fallback
        convertedExpr = `gs::to_string_int(${exprStr})`;
      }
      
      parts.push(convertedExpr);
      
      // Literal
      if (span.literal.text) {
        // Escape quotes and special characters in string literal
        const escaped = span.literal.text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
        parts.push(`"${escaped}"`);
      }
    }
    
    // Concatenate all parts
    return parts.join(' + ');
  }
}

