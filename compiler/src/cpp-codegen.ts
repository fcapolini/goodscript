/**
 * C++ Code Generator
 * 
 * Transforms GoodScript AST to C++ source code, mapping ownership semantics
 * to C++'s smart pointers.
 * 
 * Ownership mappings:
 * - Unique<T> -> std::unique_ptr<T>
 * - Shared<T> -> std::shared_ptr<T>
 * - Weak<T> -> std::weak_ptr<T>
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
  
  constructor(checker?: ts.TypeChecker) {
    this.checker = checker;
  }
  
  /**
   * Escape identifier if it collides with C++ keywords
   */
  private escapeIdentifier(name: string): string {
    // Special keywords that should never be escaped
    if (name === 'this') {
      return 'this';
    }
    
    if (CPP_KEYWORDS.has(name) || CPP_MACROS.has(name)) {
      return `${name}_`;  // Append underscore to avoid collision
    }
    return name;
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
  }
  
  /**
   * Add helper functions for GoodScript runtime
   */
  private addHelperFunctions(lines: string[]): void {
    lines.push('// GoodScript runtime helper functions');
    lines.push('namespace gs {');
    lines.push('');
    lines.push('// String helper: startsWith');
    lines.push('inline bool starts_with(const std::string& str, const std::string& prefix) {');
    lines.push('  return str.size() >= prefix.size() && str.substr(0, prefix.size()) == prefix;');
    lines.push('}');
    lines.push('');
    lines.push('// String helper: indexOf (returns -1 if not found, matching JavaScript)');
    lines.push('inline int index_of(const std::string& str, const std::string& search) {');
    lines.push('  auto pos = str.find(search);');
    lines.push('  return (pos != std::string::npos) ? static_cast<int>(pos) : -1;');
    lines.push('}');
    lines.push('');
    lines.push('// String helper: fromCharCode');
    lines.push('inline std::string from_char_code(int code) {');
    lines.push('  return std::string(1, static_cast<char>(code));');
    lines.push('}');
    lines.push('');
    lines.push('// Number helper: format integer without decimal point');
    lines.push('inline std::string to_string_int(double value) {');
    lines.push('  if (value == static_cast<int>(value)) {');
    lines.push('    return std::to_string(static_cast<int>(value));');
    lines.push('  }');
    lines.push('  return std::to_string(value);');
    lines.push('}');
    lines.push('');
    lines.push('// Map helper: get (returns optional)');
    lines.push('template<typename K, typename V>');
    lines.push('std::optional<V> map_get(const std::unordered_map<K, V>& map, const K& key) {');
    lines.push('  auto it = map.find(key);');
    lines.push('  if (it != map.end()) {');
    lines.push('    return it->second;');
    lines.push('  }');
    lines.push('  return std::nullopt;');
    lines.push('}');
    lines.push('');
    lines.push('} // namespace gs');
    lines.push('');
  }
  
  /**
   * Build final output with includes and namespace wrapper
   */
  private buildOutput(): string {
    const lines: string[] = [];
    
    // Add standard includes
    lines.push('#include <memory>');
    lines.push('#include <string>');
    lines.push('#include <optional>');
    lines.push('#include <iostream>');
    
    // Add custom includes
    if (this.includes.size > 0) {
      for (const include of Array.from(this.includes).sort()) {
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
      const type = decl.type ? this.generateType(decl.type) : 'auto';
      
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
        const value = this.generateExpression(decl.initializer);
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
    
    this.emit(`${returnType} ${name}(${params}) {`);
    this.indent();
    
    if (func.body) {
      this.generateBlock(func.body);
    }
    
    this.dedent();
    this.emit('}');
    this.emit('');
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
        const fieldType = member.type ? this.generateType(member.type) : 'auto';
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
    
    this.emit(`${returnType} ${name}(${params}) {`);
    this.indent();
    
    if (method.body) {
      for (const statement of method.body.statements) {
        this.generateStatement(statement);
      }
    }
    
    this.dedent();
    this.emit('}');
    this.emit('');
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
        const fieldType = member.type ? this.generateType(member.type) : 'auto';
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
      return 'std::string';
    } else if (type.kind === ts.SyntaxKind.BooleanKeyword) {
      return 'bool';
    } else if (type.kind === ts.SyntaxKind.VoidKeyword) {
      return 'void';
    } else if (type.kind === ts.SyntaxKind.NullKeyword) {
      return 'std::nullopt_t';
    } else if (type.kind === ts.SyntaxKind.UndefinedKeyword) {
      return 'std::nullopt_t';
    } else if (ts.isArrayTypeNode(type)) {
      this.addInclude('<vector>');
      const elementType = this.generateType(type.elementType);
      return `std::vector<${elementType}>`;
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
      return `std::shared_ptr<${innerType}>`;
    } else if (typeName === 'use' && type.typeArguments && type.typeArguments.length > 0) {
      const innerType = this.generateType(type.typeArguments[0]);
      return `std::weak_ptr<${innerType}>`;
    } else if (typeName === 'Map' && type.typeArguments && type.typeArguments.length === 2) {
      this.addInclude('<unordered_map>');
      const keyType = this.generateType(type.typeArguments[0]);
      const valueType = this.generateType(type.typeArguments[1]);
      return `std::unordered_map<${keyType}, ${valueType}>`;
    } else if (typeName === 'Set' && type.typeArguments && type.typeArguments.length > 0) {
      this.addInclude('<unordered_set>');
      const elementType = this.generateType(type.typeArguments[0]);
      return `std::unordered_set<${elementType}>`;
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
      const expr = this.generateExpression(statement.expression);
      this.emit(`return ${expr};`);
    } else {
      this.emit('return;');
    }
  }
  
  /**
   * Generate if statement
   */
  private generateIfStatement(statement: ts.IfStatement): void {
    const condition = this.generateExpression(statement.expression);
    this.emit(`if (${condition}) {`);
    this.indent();
    
    if (ts.isBlock(statement.thenStatement)) {
      for (const stmt of statement.thenStatement.statements) {
        this.generateStatement(stmt);
      }
    } else {
      this.generateStatement(statement.thenStatement);
    }
    
    this.dedent();
    
    if (statement.elseStatement) {
      this.emit('} else {');
      this.indent();
      
      if (ts.isBlock(statement.elseStatement)) {
        for (const stmt of statement.elseStatement.statements) {
          this.generateStatement(stmt);
        }
      } else {
        this.generateStatement(statement.elseStatement);
      }
      
      this.dedent();
    }
    
    this.emit('}');
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
    
    if (ts.isVariableDeclarationList(statement.initializer)) {
      const decl = statement.initializer.declarations[0];
      if (ts.isIdentifier(decl.name)) {
        variable = this.escapeIdentifier(decl.name.getText());
      }
    }
    
    const iterable = this.generateExpression(statement.expression);
    
    this.emit(`for (const auto& ${variable} : ${iterable}) {`);
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
      return `"${escaped}"`;
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
      return this.escapeIdentifier(text);
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
    let left = this.generateExpression(expr.left);
    let right = this.generateExpression(expr.right);
    const op = expr.operatorToken.getText();
    
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
      
      // Determine accessor: check if object is a shared_ptr
      let accessor = '.';
      if (object === 'this') {
        accessor = '->';
      } else if (this.checker) {
        // Check if the object expression is a field/variable with share<T> type
        const objExpr = expr.expression.expression;
        if (ts.isPropertyAccessExpression(objExpr)) {
          // e.g., this.input.charAt() - check if 'input' is share<T>
          const symbol = this.checker.getSymbolAtLocation(objExpr.name);
          if (symbol?.valueDeclaration) {
            const typeText = this.getTypeTextFromSymbol(symbol);
            if (typeText?.startsWith('share<') || typeText?.startsWith('std::shared_ptr<')) {
              accessor = '->';
            }
          }
        } else if (ts.isIdentifier(objExpr)) {
          // e.g., input.charAt() - check if 'input' is share<T>
          const symbol = this.checker.getSymbolAtLocation(objExpr);
          if (symbol?.valueDeclaration) {
            const typeText = this.getTypeTextFromSymbol(symbol);
            if (typeText?.startsWith('share<') || typeText?.startsWith('std::shared_ptr<')) {
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
        // map.set(key, value) -> map[key] = value or map.insert({key, value})
        const argArray = expr.arguments.map(arg => this.generateExpression(arg));
        if (argArray.length === 2) {
          return `${object}${accessor}insert({${argArray[0]}, ${argArray[1]}})`;
        }
      }
      
      if (methodName === 'get') {
        // map.get(key) - returns optional in our case
        const argArray = expr.arguments.map(arg => this.generateExpression(arg));
        if (argArray.length === 1) {
          return `gs::map_get(${object}, ${argArray[0]})`;
        }
      }
      
      if (methodName === 'has') {
        // map.has(key) -> map.find(key) != map.end()
        return `(${object}${accessor}find(${args}) != ${object}${accessor}end())`;
      }
      
      // Array methods
      if (methodName === 'push') {
        return `${object}${accessor}push_back(${args})`;
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
    
    // Special handling for 'this' - it's a pointer in C++
    if (object === 'this') {
      accessor = '->';
    }
    // Check if the object is a shared_ptr by looking at the source type
    else if (this.checker && ts.isPropertyAccessExpression(expr.expression)) {
      // For member access like this.input.size(), check if 'input' is share<T>
      const objExpr = expr.expression;
      if (ts.isPropertyAccessExpression(objExpr)) {
        const objSymbol = this.checker.getSymbolAtLocation(objExpr.name);
        if (objSymbol?.valueDeclaration) {
          const typeText = this.getTypeTextFromSymbol(objSymbol);
          if (typeText?.startsWith('share<') || typeText?.startsWith('std::shared_ptr<')) {
            accessor = '->';
          }
        }
      }
    }
    // Check if it's a direct identifier that's a shared_ptr
    else if (this.checker && ts.isIdentifier(expr.expression)) {
      const symbol = this.checker.getSymbolAtLocation(expr.expression);
      if (symbol?.valueDeclaration) {
        const typeText = this.getTypeTextFromSymbol(symbol);
        if (typeText?.startsWith('share<') || typeText?.startsWith('std::shared_ptr<')) {
          accessor = '->';
        }
      }
    }
    
    // Map TypeScript/JavaScript property names to C++ equivalents
    if (propertyName === 'length') {
      // array.length -> array.size()
      return `${object}${accessor}size()`;
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
    const args = expr.arguments?.map(arg => this.generateExpression(arg)).join(', ') || '';
    
    // Handle special constructors
    if (ts.isIdentifier(expr.expression)) {
      const className = expr.expression.getText();
      
      // Map constructor
      if (className === 'Map') {
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
      // Explicitly create a vector of strings
      return `std::vector<std::string>{${elements}}`;
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
   */
  private generateElementAccess(expr: ts.ElementAccessExpression): string {
    const object = this.generateExpression(expr.expression);
    const index = this.generateExpression(expr.argumentExpression);
    const accessor = (object === 'this') ? '->' : '.';
    
    // For now, use [] operator directly
    // Could be array access or map access
    if (object === 'this') {
      // this->member[index] needs to be this->member.at(index) for safety
      // But for simplicity, use []
      return `${object}->${index}`;
    }
    
    return `${object}[${index}]`;
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
      return `"${expr.text}"`;
    }
    
    // Build concatenation expression
    const parts: string[] = [];
    
    // Head
    if (expr.head.text) {
      parts.push(`"${expr.head.text}"`);
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
          // If we're in a narrowed context (typeStr is 'string'), use .value(), otherwise .value_or("")
          if (typeStr === 'string' && checkTypeStr !== 'string') {
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
          if (typeStr === 'number' && checkTypeStr !== 'number') {
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
        parts.push(`"${span.literal.text}"`);
      }
    }
    
    // Concatenate all parts
    return parts.join(' + ');
  }
}

