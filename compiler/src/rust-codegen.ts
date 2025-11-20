import * as ts from 'typescript';

/**
 * Rust Code Generator
 * 
 * Transforms GoodScript AST to Rust source code, mapping ownership semantics
 * to Rust's native ownership system.
 * 
 * Ownership mappings:
 * - Unique<T> -> Box<T>
 * - Shared<T> -> Rc<T>
 * - Weak<T> -> Weak<T>
 * - T | null | undefined -> Option<T>
 */
export class RustCodegen {
  private indentLevel = 0;
  private readonly INDENT = '    '; // 4 spaces
  private output: string[] = [];
  private imports = new Set<string>();
  
  /**
   * Generate Rust code from a GoodScript AST
   */
  generate(sourceFile: ts.SourceFile): string {
    this.reset();
    this.generateSourceFile(sourceFile);
    return this.buildOutput();
  }
  
  /**
   * Reset generator state
   */
  private reset(): void {
    this.indentLevel = 0;
    this.output = [];
    this.imports = new Set();
  }
  
  /**
   * Build final output with imports
   */
  private buildOutput(): string {
    const lines: string[] = [];
    
    // Add imports at the top
    if (this.imports.size > 0) {
      const sortedImports = Array.from(this.imports).sort();
      for (const imp of sortedImports) {
        lines.push(imp);
      }
      lines.push(''); // Blank line after imports
    }
    
    // Add generated code
    lines.push(...this.output);
    
    return lines.join('\n');
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
   * Add an import statement
   */
  private addImport(importStatement: string): void {
    this.imports.add(importStatement);
  }
  
  /**
   * Generate code for the entire source file
   */
  private generateSourceFile(sourceFile: ts.SourceFile): void {
    // Separate declarations from classes/interfaces/types
    const topLevelDecls: ts.Statement[] = [];
    const typeDecls: ts.Statement[] = [];
    
    for (const statement of sourceFile.statements) {
      if (ts.isVariableStatement(statement)) {
        topLevelDecls.push(statement);
      } else {
        typeDecls.push(statement);
      }
    }
    
    // First emit type declarations (classes, interfaces, type aliases)
    for (const statement of typeDecls) {
      this.generateStatement(statement);
    }
    
    // Then wrap top-level variable declarations in a main function
    if (topLevelDecls.length > 0) {
      this.emit('pub fn main() {');
      this.indent();
      for (const statement of topLevelDecls) {
        this.generateStatement(statement);
      }
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
    } else if (ts.isInterfaceDeclaration(statement)) {
      this.generateInterfaceDeclaration(statement);
    } else if (ts.isTypeAliasDeclaration(statement)) {
      this.generateTypeAliasDeclaration(statement);
    } else if (ts.isEnumDeclaration(statement)) {
      this.generateEnumDeclaration(statement);
    } else if (ts.isExpressionStatement(statement)) {
      this.generateExpressionStatement(statement);
    } else if (ts.isReturnStatement(statement)) {
      this.generateReturnStatement(statement);
    } else if (ts.isIfStatement(statement)) {
      this.generateIfStatement(statement);
    } else if (ts.isForOfStatement(statement)) {
      this.generateForOfStatement(statement);
    } else if (ts.isSwitchStatement(statement)) {
      this.generateSwitchStatement(statement);
    } else if (ts.isBlock(statement)) {
      this.generateBlock(statement);
    } else {
      // Unknown statement type - emit a comment
      this.emit(`// TODO: Implement code generation for ${ts.SyntaxKind[statement.kind]}`);
    }
  }
  
  /**
   * Generate variable declaration
   */
  private generateVariableStatement(statement: ts.VariableStatement): void {
    const declarations = statement.declarationList.declarations;
    const isConst = (statement.declarationList.flags & ts.NodeFlags.Const) !== 0;
    
    for (const decl of declarations) {
      const name = decl.name.getText();
      const mutability = isConst ? '' : 'mut ';
      const typeAnnotation = decl.type ? `: ${this.generateType(decl.type)}` : '';
      
      if (decl.initializer) {
        let value = this.generateExpression(decl.initializer);
        
        // Wrap value in ownership constructor if needed (but not for arrow functions)
        if (decl.type && !ts.isArrowFunction(decl.initializer)) {
          value = this.wrapInOwnershipConstructor(value, decl.type);
        }
        
        this.emit(`let ${mutability}${name}${typeAnnotation} = ${value};`);
      } else {
        this.emit(`let ${mutability}${name}${typeAnnotation};`);
      }
    }
  }
  
  /**
   * Wrap a value in an ownership constructor if the type requires it
   */
  private wrapInOwnershipConstructor(value: string, type: ts.TypeNode): string {
    if (ts.isTypeReferenceNode(type)) {
      const typeName = type.typeName.getText();
      
      if (typeName === 'Unique') {
        return `Box::new(${value})`;
      } else if (typeName === 'Shared') {
        return `Rc::new(${value})`;
      } else if (typeName === 'Weak') {
        // Weak references are typically created from Rc via downgrade()
        // For now, we'll create an Rc and immediately downgrade it
        // We need to import Rc as well for this to work
        this.addImport('use std::rc::Rc;');
        return `Rc::downgrade(&Rc::new(${value}))`;
      }
    }
    
    return value;
  }
  
  /**
   * Generate function declaration (legacy, should be arrow functions in GoodScript)
   */
  private generateFunctionDeclaration(func: ts.FunctionDeclaration): void {
    const name = func.name?.getText() || 'anonymous';
    const params = this.generateParameters(func.parameters);
    const returnType = func.type ? this.generateType(func.type) : '()';
    
    this.emit(`fn ${name}(${params}) -> ${returnType} {`);
    this.indent();
    
    if (func.body) {
      this.generateBlock(func.body);
    }
    
    this.dedent();
    this.emit('}');
    this.emit('');
  }
  
  /**
   * Generate class declaration
   */
  private generateClassDeclaration(classDecl: ts.ClassDeclaration): void {
    const name = classDecl.name?.getText() || 'AnonymousClass';
    
    // Generate struct for fields
    this.emit(`struct ${name} {`);
    this.indent();
    
    const fields = classDecl.members.filter(ts.isPropertyDeclaration);
    for (const field of fields) {
      const fieldName = field.name.getText();
      const fieldType = field.type ? this.generateType(field.type) : 'unknown';
      this.emit(`${fieldName}: ${fieldType},`);
    }
    
    this.dedent();
    this.emit('}');
    this.emit('');
    
    // Generate impl block for methods
    const methods = classDecl.members.filter(ts.isMethodDeclaration);
    if (methods.length > 0) {
      this.emit(`impl ${name} {`);
      this.indent();
      
      for (const method of methods) {
        this.generateMethodDeclaration(method);
      }
      
      this.dedent();
      this.emit('}');
      this.emit('');
    }
  }
  
  /**
   * Generate method declaration
   */
  private generateMethodDeclaration(method: ts.MethodDeclaration): void {
    const name = method.name.getText();
    
    // Determine if method modifies self (simple heuristic: check for assignments to this.*)
    let modifiesSelf = false;
    if (method.body) {
      const bodyText = method.body.getText();
      modifiesSelf = /this\.\w+\s*=/.test(bodyText);
    }
    
    const params = this.generateParameters(method.parameters, true, modifiesSelf);
    const returnType = method.type ? this.generateType(method.type) : '()';
    
    this.emit(`fn ${name}(${params}) -> ${returnType} {`);
    this.indent();
    
    if (method.body) {
      this.generateBlock(method.body);
    }
    
    this.dedent();
    this.emit('}');
    this.emit('');
  }
  
  /**
   * Generate interface declaration (converts to struct)
   */
  private generateInterfaceDeclaration(iface: ts.InterfaceDeclaration): void {
    const name = iface.name.getText();
    
    this.emit(`struct ${name} {`);
    this.indent();
    
    for (const member of iface.members) {
      if (ts.isPropertySignature(member)) {
        const fieldName = member.name?.getText() || 'unknown';
        const fieldType = member.type ? this.generateType(member.type) : 'unknown';
        this.emit(`${fieldName}: ${fieldType},`);
      }
    }
    
    this.dedent();
    this.emit('}');
    this.emit('');
  }
  
  /**
   * Generate type alias declaration
   */
  private generateTypeAliasDeclaration(typeAlias: ts.TypeAliasDeclaration): void {
    const name = typeAlias.name.getText();
    
    // Check if this is a discriminated union type
    if (ts.isUnionTypeNode(typeAlias.type)) {
      const isDiscriminatedUnion = typeAlias.type.types.every(t => 
        ts.isTypeLiteralNode(t) && 
        t.members.some(m => 
          ts.isPropertySignature(m) && 
          m.name?.getText() === 'type' &&
          m.type && ts.isLiteralTypeNode(m.type)
        )
      );
      
      if (isDiscriminatedUnion) {
        // Generate as Rust enum
        this.emit(`enum ${name} {`);
        this.indent();
        
        for (const variant of typeAlias.type.types) {
          if (ts.isTypeLiteralNode(variant)) {
            // Extract variant name from 'type' field
            const typeField = variant.members.find(m => 
              ts.isPropertySignature(m) && m.name?.getText() === 'type'
            );
            if (typeField && ts.isPropertySignature(typeField) && 
                typeField.type && ts.isLiteralTypeNode(typeField.type)) {
              const variantName = typeField.type.literal.getText().replace(/["\']/g, '');
              const capitalizedName = variantName.charAt(0).toUpperCase() + variantName.slice(1);
              
              // Collect other fields
              const fields = variant.members
                .filter(m => ts.isPropertySignature(m) && m.name?.getText() !== 'type')
                .map(m => {
                  const fieldName = (m as ts.PropertySignature).name?.getText() || 'unknown';
                  const fieldType = (m as ts.PropertySignature).type ? 
                    this.generateType((m as ts.PropertySignature).type!) : 'unknown';
                  return `${fieldName}: ${fieldType}`;
                });
              
              if (fields.length > 0) {
                this.emit(`${capitalizedName} { ${fields.join(', ')} },`);
              } else {
                this.emit(`${capitalizedName},`);
              }
            }
          }
        }
        
        this.dedent();
        this.emit('}');
        this.emit('');
        return;
      }
    }
    
    // Regular type alias
    const type = this.generateType(typeAlias.type);
    this.emit(`type ${name} = ${type};`);
    this.emit('');
  }
  
  /**
   * Generate enum declaration
   */
  private generateEnumDeclaration(enumDecl: ts.EnumDeclaration): void {
    const name = enumDecl.name.getText();
    
    // Check if it's a numeric or string enum
    const hasStringValues = enumDecl.members.some(m => 
      m.initializer && ts.isStringLiteral(m.initializer)
    );
    
    if (hasStringValues) {
      // String enum - generate as regular enum
      this.emit(`enum ${name} {`);
      this.indent();
      
      for (const member of enumDecl.members) {
        const memberName = member.name.getText();
        this.emit(`${memberName},`);
      }
      
      this.dedent();
      this.emit('}');
      this.emit('');
    } else {
      // Numeric enum - generate with discriminant values
      this.emit(`enum ${name} {`);
      this.indent();
      
      let currentValue = 0;
      for (const member of enumDecl.members) {
        const memberName = member.name.getText();
        if (member.initializer) {
          const value = member.initializer.getText();
          this.emit(`${memberName} = ${value},`);
          currentValue = parseInt(value) + 1;
        } else {
          this.emit(`${memberName} = ${currentValue},`);
          currentValue++;
        }
      }
      
      this.dedent();
      this.emit('}');
      this.emit('');
    }
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
    this.emit(`if ${condition} {`);
    this.indent();
    
    if (ts.isBlock(statement.thenStatement)) {
      this.generateBlock(statement.thenStatement);
    } else {
      this.generateStatement(statement.thenStatement);
    }
    
    this.dedent();
    
    if (statement.elseStatement) {
      this.emit('} else {');
      this.indent();
      
      if (ts.isBlock(statement.elseStatement)) {
        this.generateBlock(statement.elseStatement);
      } else {
        this.generateStatement(statement.elseStatement);
      }
      
      this.dedent();
      this.emit('}');
    } else {
      this.emit('}');
    }
  }
  
  /**
   * Generate for-of statement
   */
  private generateForOfStatement(statement: ts.ForOfStatement): void {
    // Extract variable name from initializer (handles 'const x' or 'let x')
    let variable = '';
    if (ts.isVariableDeclarationList(statement.initializer)) {
      const decl = statement.initializer.declarations[0];
      variable = decl.name.getText();
    } else {
      variable = statement.initializer.getText();
    }
    
    const iterable = this.generateExpression(statement.expression);
    
    // Determine if we need a reference
    // If iterating over a property access (e.g., self.values), use reference
    const needsRef = ts.isPropertyAccessExpression(statement.expression);
    const iterableWithRef = needsRef ? `&${iterable}` : iterable;
    
    this.emit(`for ${variable} in ${iterableWithRef} {`);
    this.indent();
    this.generateStatement(statement.statement);
    this.dedent();
    this.emit('}');
  }
  
  /**
   * Generate switch statement as Rust match expression
   */
  private generateSwitchStatement(statement: ts.SwitchStatement): void {
    const expr = this.generateExpression(statement.expression);
    
    this.emit(`match ${expr} {`);
    this.indent();
    
    for (const clause of statement.caseBlock.clauses) {
      if (ts.isCaseClause(clause)) {
        const pattern = this.generateExpression(clause.expression);
        this.emit(`${pattern} => {`);
        this.indent();
        for (const stmt of clause.statements) {
          this.generateStatement(stmt);
        }
        this.dedent();
        this.emit('},');
      } else if (ts.isDefaultClause(clause)) {
        this.emit('_ => {');
        this.indent();
        for (const stmt of clause.statements) {
          this.generateStatement(stmt);
        }
        this.dedent();
        this.emit('},');
      }
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
   * Generate function parameters
   */
  private generateParameters(parameters: ts.NodeArray<ts.ParameterDeclaration>, isMethod: boolean = false, mutableSelf: boolean = false): string {
    const params: string[] = [];
    
    // Add self parameter for methods
    if (isMethod) {
      params.push(mutableSelf ? '&mut self' : '&self');
    }
    
    for (const param of parameters) {
      const name = param.name.getText();
      const type = param.type ? this.generateType(param.type) : 'unknown';
      params.push(`${name}: ${type}`);
    }
    
    return params.join(', ');
  }
  
  /**
   * Generate type annotation
   */
  private generateType(type: ts.TypeNode): string {
    if (ts.isTypeReferenceNode(type)) {
      return this.generateTypeReference(type);
    } else if (ts.isArrayTypeNode(type)) {
      const elementType = this.generateType(type.elementType);
      return `Vec<${elementType}>`;
    } else if (ts.isUnionTypeNode(type)) {
      // Check if this is a nullable type (T | null | undefined)
      const types = type.types.map(t => t.getText());
      const hasNull = types.some(t => t === 'null' || t === 'undefined');
      
      if (hasNull && types.length <= 3) {
        // This is a nullable type
        const nonNullTypes = types.filter(t => t !== 'null' && t !== 'undefined');
        if (nonNullTypes.length === 1) {
          const innerType = type.types.find(t => {
            const text = t.getText();
            return text !== 'null' && text !== 'undefined';
          });
          if (innerType) {
            return `Option<${this.generateType(innerType)}>`;
          }
        }
      }
      
      // Other union types -> use enum or generic handling
      return types.join(' | ');
    } else if (type.kind === ts.SyntaxKind.NumberKeyword) {
      return 'f64';
    } else if (type.kind === ts.SyntaxKind.StringKeyword) {
      return 'String';
    } else if (type.kind === ts.SyntaxKind.BooleanKeyword) {
      return 'bool';
    } else if (type.kind === ts.SyntaxKind.VoidKeyword) {
      return '()';
    } else {
      return type.getText();
    }
  }
  
  /**
   * Generate type reference (handles ownership types)
   */
  private generateTypeReference(type: ts.TypeReferenceNode): string {
    const typeName = type.typeName.getText();
    
    // Handle ownership types
    if (typeName === 'Unique' && type.typeArguments && type.typeArguments.length > 0) {
      this.addImport('use std::boxed::Box;');
      const innerType = this.generateType(type.typeArguments[0]);
      return `Box<${innerType}>`;
    } else if (typeName === 'Shared' && type.typeArguments && type.typeArguments.length > 0) {
      this.addImport('use std::rc::Rc;');
      const innerType = this.generateType(type.typeArguments[0]);
      return `Rc<${innerType}>`;
    } else if (typeName === 'Weak' && type.typeArguments && type.typeArguments.length > 0) {
      this.addImport('use std::rc::Weak;');
      const innerType = this.generateType(type.typeArguments[0]);
      return `Weak<${innerType}>`;
    }
    
    // Handle standard generic types
    if (type.typeArguments && type.typeArguments.length > 0) {
      const args = type.typeArguments.map(arg => this.generateType(arg)).join(', ');
      return `${typeName}<${args}>`;
    }
    
    return typeName;
  }
  
  /**
   * Generate expression
   */
  private generateExpression(expr: ts.Expression): string {
    if (ts.isNumericLiteral(expr)) {
      const text = expr.getText();
      // Add .0 if it's an integer literal (for f64 compatibility)
      if (!text.includes('.') && !text.includes('e') && !text.includes('E')) {
        return text + '.0';
      }
      return text;
    } else if (ts.isStringLiteral(expr)) {
      // Convert to Rust string literal
      return `String::from(${expr.getText()})`;
    } else if (expr.kind === ts.SyntaxKind.TrueKeyword) {
      return 'true';
    } else if (expr.kind === ts.SyntaxKind.FalseKeyword) {
      return 'false';
    } else if (expr.kind === ts.SyntaxKind.ThisKeyword) {
      return 'self';
    } else if (expr.kind === ts.SyntaxKind.NullKeyword || expr.kind === ts.SyntaxKind.UndefinedKeyword) {
      return 'None';
    } else if (ts.isIdentifier(expr)) {
      const text = expr.getText();
      // Handle undefined as identifier (it can appear as both keyword and identifier)
      if (text === 'undefined' || text === 'null') {
        return 'None';
      }
      // Handle this keyword
      if (text === 'this') {
        return 'self';
      }
      return text;
    } else if (ts.isArrowFunction(expr)) {
      return this.generateArrowFunction(expr);
    } else if (ts.isBinaryExpression(expr)) {
      return this.generateBinaryExpression(expr);
    } else if (ts.isCallExpression(expr)) {
      return this.generateCallExpression(expr);
    } else if (ts.isPropertyAccessExpression(expr)) {
      return this.generatePropertyAccess(expr);
    } else if (ts.isObjectLiteralExpression(expr)) {
      return this.generateObjectLiteral(expr);
    } else if (ts.isArrayLiteralExpression(expr)) {
      return this.generateArrayLiteral(expr);
    } else if (ts.isNewExpression(expr)) {
      return this.generateNewExpression(expr);
    } else if (ts.isPrefixUnaryExpression(expr)) {
      return this.generatePrefixUnaryExpression(expr);
    } else if (ts.isPostfixUnaryExpression(expr)) {
      return this.generatePostfixUnaryExpression(expr);
    } else if (ts.isConditionalExpression(expr)) {
      return this.generateConditionalExpression(expr);
    } else if (ts.isTemplateExpression(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
      return this.generateTemplateLiteral(expr);
    } else if (ts.isParenthesizedExpression(expr)) {
      return `(${this.generateExpression(expr.expression)})`;
    } else {
      return `/* TODO: ${ts.SyntaxKind[expr.kind]} */`;
    }
  }
  
  /**
   * Generate arrow function
   */
  private generateArrowFunction(func: ts.ArrowFunction): string {
    const params = this.generateParameters(func.parameters);
    const returnType = func.type ? this.generateType(func.type) : '';
    const returnAnnotation = returnType ? ` -> ${returnType}` : '';
    
    if (ts.isBlock(func.body)) {
      // Multi-line function - we need to capture the body statements separately
      // Save current output state
      const savedOutput = this.output;
      this.output = [];
      
      this.indent();
      for (const statement of func.body.statements) {
        this.generateStatement(statement);
      }
      this.dedent();
      
      // Get the generated body
      const bodyLines = this.output;
      this.output = savedOutput;
      
      // Build the closure with proper formatting
      if (bodyLines.length === 0) {
        return `|${params}|${returnAnnotation} {}`;
      } else {
        const bodyCode = bodyLines.join('\n');
        return `|${params}|${returnAnnotation} {\n${bodyCode}\n${this.INDENT.repeat(this.indentLevel)}}`;
      }
    } else {
      // Single expression
      const body = this.generateExpression(func.body);
      // In Rust, closures with explicit return types need braces
      if (returnAnnotation) {
        return `|${params}|${returnAnnotation} { ${body} }`;
      }
      return `|${params}|${returnAnnotation} ${body}`;
    }
  }
  
  /**
   * Generate binary expression
   */
  private generateBinaryExpression(expr: ts.BinaryExpression): string {
    const left = this.generateExpression(expr.left);
    const right = this.generateExpression(expr.right);
    let operator = expr.operatorToken.getText();
    
    // Translate JavaScript operators to Rust
    if (operator === '===') {
      operator = '==';
    } else if (operator === '!==') {
      operator = '!=';
    }
    // Note: &&, ||, and other logical operators are the same in Rust
    
    return `${left} ${operator} ${right}`;
  }
  
  /**
   * Generate call expression
   */
  private generateCallExpression(expr: ts.CallExpression): string {
    const func = this.generateExpression(expr.expression);
    const args = expr.arguments.map(arg => this.generateExpression(arg)).join(', ');
    
    return `${func}(${args})`;
  }
  
  /**
   * Generate property access
   */
  private generatePropertyAccess(expr: ts.PropertyAccessExpression): string {
    const object = this.generateExpression(expr.expression);
    const property = expr.name.getText();
    
    return `${object}.${property}`;
  }
  
  /**
   * Generate object literal
   */
  private generateObjectLiteral(expr: ts.ObjectLiteralExpression): string {
    // For now, generate a basic struct initialization
    const properties = expr.properties.map(prop => {
      if (ts.isPropertyAssignment(prop)) {
        const name = prop.name.getText();
        const value = this.generateExpression(prop.initializer);
        return `${name}: ${value}`;
      }
      return '';
    }).filter(p => p !== '').join(', ');
    
    return `{ ${properties} }`;
  }
  
  /**
   * Generate array literal
   */
  private generateArrayLiteral(expr: ts.ArrayLiteralExpression): string {
    const elements = expr.elements.map(elem => this.generateExpression(elem)).join(', ');
    return `vec![${elements}]`;
  }
  
  /**
   * Generate new expression
   */
  private generateNewExpression(expr: ts.NewExpression): string {
    const type = this.generateExpression(expr.expression);
    const args = expr.arguments 
      ? expr.arguments.map(arg => this.generateExpression(arg)).join(', ')
      : '';
    
    // Handle common constructors
    if (type === 'Map') {
      this.addImport('use std::collections::HashMap;');
      return 'HashMap::new()';
    } else if (type === 'Set') {
      this.addImport('use std::collections::HashSet;');
      return 'HashSet::new()';
    }
    
    return `${type}::new(${args})`;
  }
  
  /**
   * Generate prefix unary expression (!, -, +, ++, --)
   */
  private generatePrefixUnaryExpression(expr: ts.PrefixUnaryExpression): string {
    const operand = this.generateExpression(expr.operand);
    const operator = ts.tokenToString(expr.operator);
    
    // Translate operators
    if (operator === '++' || operator === '--') {
      // Rust doesn't have ++ or --, use += 1 or -= 1
      const op = operator === '++' ? '+=' : '-=';
      return `${operand} ${op} 1.0`;
    }
    
    return `${operator}${operand}`;
  }
  
  /**
   * Generate postfix unary expression (++, --)
   */
  private generatePostfixUnaryExpression(expr: ts.PostfixUnaryExpression): string {
    const operand = this.generateExpression(expr.operand);
    const operator = ts.tokenToString(expr.operator);
    
    // Rust doesn't have postfix ++ or --, use += 1 or -= 1
    const op = operator === '++' ? '+=' : '-=';
    return `${operand} ${op} 1.0`;
  }
  
  /**
   * Generate conditional (ternary) expression
   */
  private generateConditionalExpression(expr: ts.ConditionalExpression): string {
    const condition = this.generateExpression(expr.condition);
    const whenTrue = this.generateExpression(expr.whenTrue);
    const whenFalse = this.generateExpression(expr.whenFalse);
    
    return `if ${condition} { ${whenTrue} } else { ${whenFalse} }`;
  }
  
  /**
   * Generate template literal
   */
  private generateTemplateLiteral(expr: ts.TemplateExpression | ts.NoSubstitutionTemplateLiteral): string {
    if (ts.isNoSubstitutionTemplateLiteral(expr)) {
      // Simple template literal without substitutions
      const text = expr.getText().slice(1, -1); // Remove backticks
      return `String::from(\"${text}\")`;
    }
    
    // Template literal with substitutions
    const parts: string[] = [];
    
    // Head
    const head = expr.head.getText().slice(1); // Remove opening backtick
    if (head) {
      parts.push(`\"${head}\"`);
    }
    
    // Template spans
    for (const span of expr.templateSpans) {
      const exprText = this.generateExpression(span.expression);
      parts.push(`${exprText}`);
      
      const literal = span.literal.getText();
      const text = literal.slice(0, -1); // Remove closing marker
      if (text) {
        parts.push(`\"${text}\"`);
      }
    }
    
    if (parts.length === 0) {
      return 'String::new()';
    } else {
      // Use format! macro for templates
      return `format!(${parts.map((p, i) => i % 2 === 0 ? p : '{}').join('')}, ${parts.filter((_, i) => i % 2 === 1).join(', ')})`;
    }
  }
}
