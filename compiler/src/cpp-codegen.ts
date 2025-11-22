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
    
    if (CPP_KEYWORDS.has(name)) {
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
    
    // Wrap everything in gs namespace
    lines.push('namespace gs {');
    lines.push('');
    
    // Add generated code
    lines.push(...this.output);
    
    lines.push('');
    lines.push('} // namespace gs');
    
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
    for (const statement of sourceFile.statements) {
      this.generateStatement(statement);
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
    } else {
      // Unsupported statement - add comment
      this.emit(`// TODO: Unsupported statement: ${ts.SyntaxKind[statement.kind]}`);
    }
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
      const qualifier = isConst ? 'const ' : '';
      
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
        t.kind === ts.SyntaxKind.UndefinedKeyword
      );
      
      if (hasNull && type.types.length === 2) {
        // T | null or T | undefined
        const nonNullType = type.types.find(t => 
          t.kind !== ts.SyntaxKind.NullKeyword && 
          t.kind !== ts.SyntaxKind.UndefinedKeyword
        );
        
        if (nonNullType) {
          const innerType = this.generateType(nonNullType);
          return `std::optional<${innerType}>`;
        }
      } else if (hasNull && type.types.length === 3) {
        // T | null | undefined
        const nonNullType = type.types.find(t => 
          t.kind !== ts.SyntaxKind.NullKeyword && 
          t.kind !== ts.SyntaxKind.UndefinedKeyword
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
   * Generate type reference (handles ownership types)
   */
  private generateTypeReference(type: ts.TypeReferenceNode): string {
    const typeName = type.typeName.getText();
    
    // Handle ownership qualifiers
    if (typeName === 'Unique' && type.typeArguments && type.typeArguments.length > 0) {
      const innerType = this.generateType(type.typeArguments[0]);
      return `std::unique_ptr<${innerType}>`;
    } else if (typeName === 'Shared' && type.typeArguments && type.typeArguments.length > 0) {
      const innerType = this.generateType(type.typeArguments[0]);
      return `std::shared_ptr<${innerType}>`;
    } else if (typeName === 'Weak' && type.typeArguments && type.typeArguments.length > 0) {
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
   * Generate for statement
   */
  private generateForStatement(statement: ts.ForStatement): void {
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
      return `"${expr.text}"`;
    } else if (expr.kind === ts.SyntaxKind.TrueKeyword) {
      return 'true';
    } else if (expr.kind === ts.SyntaxKind.FalseKeyword) {
      return 'false';
    } else if (expr.kind === ts.SyntaxKind.NullKeyword) {
      return 'std::nullopt';
    } else if (expr.kind === ts.SyntaxKind.ThisKeyword) {
      return 'this';
    } else if (ts.isIdentifier(expr)) {
      return this.escapeIdentifier(expr.getText());
    } else if (ts.isBinaryExpression(expr)) {
      return this.generateBinaryExpression(expr);
    } else if (ts.isCallExpression(expr)) {
      return this.generateCallExpression(expr);
    } else if (ts.isPropertyAccessExpression(expr)) {
      return this.generatePropertyAccess(expr);
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
    }
    
    return '/* unsupported expression */';
  }
  
  /**
   * Generate binary expression
   */
  private generateBinaryExpression(expr: ts.BinaryExpression): string {
    const left = this.generateExpression(expr.left);
    const right = this.generateExpression(expr.right);
    const op = expr.operatorToken.getText();
    
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
    const callee = this.generateExpression(expr.expression);
    const args = expr.arguments.map(arg => this.generateExpression(arg)).join(', ');
    
    // Special handling for console.log
    if (callee === 'console.log') {
      return `std::cout << ${args} << std::endl`;
    }
    
    return `${callee}(${args})`;
  }
  
  /**
   * Generate property access
   */
  private generatePropertyAccess(expr: ts.PropertyAccessExpression): string {
    const object = this.generateExpression(expr.expression);
    const property = this.escapeIdentifier(expr.name.getText());
    
    // Handle smart pointer dereferencing
    // For now, assume direct access - we'll refine this as we go
    return `${object}.${property}`;
  }
  
  /**
   * Generate new expression
   */
  private generateNewExpression(expr: ts.NewExpression): string {
    const className = this.generateExpression(expr.expression);
    const args = expr.arguments?.map(arg => this.generateExpression(arg)).join(', ') || '';
    
    // Check if this should be wrapped in a smart pointer based on context
    // For now, use regular construction - we'll refine based on ownership types
    return `${className}(${args})`;
  }
  
  /**
   * Generate array literal
   */
  private generateArrayLiteral(expr: ts.ArrayLiteralExpression): string {
    const elements = expr.elements.map(el => this.generateExpression(el)).join(', ');
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
}
