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
   * Check if a node or its descendants contain return statements
   */
  private containsReturnStatement(node: ts.Node): boolean {
    if (ts.isReturnStatement(node)) {
      return true;
    }
    
    let found = false;
    ts.forEachChild(node, child => {
      if (this.containsReturnStatement(child)) {
        found = true;
      }
    });
    
    return found;
  }
  
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
    // Separate executable code from type/function declarations
    const topLevelDecls: ts.Statement[] = [];
    const typeDecls: ts.Statement[] = [];
    
    for (const statement of sourceFile.statements) {
      // Executable statements go in main()
      if (ts.isVariableStatement(statement) || 
          ts.isExpressionStatement(statement) ||
          ts.isIfStatement(statement) ||
          ts.isForOfStatement(statement) ||
          ts.isForInStatement(statement) ||
          ts.isForStatement(statement) ||
          ts.isWhileStatement(statement) ||
          ts.isDoStatement(statement) ||
          ts.isSwitchStatement(statement) ||
          ts.isTryStatement(statement) ||
          ts.isReturnStatement(statement) ||
          ts.isBreakStatement(statement) ||
          ts.isContinueStatement(statement) ||
          ts.isThrowStatement(statement) ||
          ts.isBlock(statement)) {
        topLevelDecls.push(statement);
      } else {
        // Type declarations, function declarations, classes, interfaces, etc.
        typeDecls.push(statement);
      }
    }
    
    // First emit type declarations (classes, interfaces, type aliases)
    for (const statement of typeDecls) {
      this.generateStatement(statement);
    }
    
    // Then wrap top-level variable declarations in a main function with root error handler
    if (topLevelDecls.length > 0) {
      this.emit('pub fn main() {');
      this.indent();
      
      // Wrap all code in a Result-returning closure for root error handling
      this.emit('let result = (|| -> Result<(), String> {');
      this.indent();
      
      for (const statement of topLevelDecls) {
        this.generateStatement(statement);
      }
      
      this.emit('Ok(())');
      this.dedent();
      this.emit('})();');
      this.emit('');
      
      // Root error handler - catches all unhandled exceptions
      this.emit('match result {');
      this.indent();
      this.emit('Ok(_) => {},');
      this.emit('Err(e) => {');
      this.indent();
      this.emit('eprintln!("Uncaught exception: {}", e);');
      this.emit('std::process::exit(1);');
      this.dedent();
      this.emit('}');
      this.dedent();
      this.emit('}');
      
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
    } else if (ts.isForStatement(statement)) {
      this.generateForStatement(statement);
    } else if (ts.isForOfStatement(statement)) {
      this.generateForOfStatement(statement);
    } else if (ts.isSwitchStatement(statement)) {
      this.generateSwitchStatement(statement);
    } else if (ts.isTryStatement(statement)) {
      this.generateTryStatement(statement);
    } else if (ts.isThrowStatement(statement)) {
      this.generateThrowStatement(statement);
    } else if (ts.isWhileStatement(statement)) {
      this.generateWhileStatement(statement);
    } else if (ts.isDoStatement(statement)) {
      this.generateDoStatement(statement);
    } else if (ts.isBreakStatement(statement)) {
      this.generateBreakStatement(statement);
    } else if (ts.isContinueStatement(statement)) {
      this.generateContinueStatement(statement);
    } else if (ts.isLabeledStatement(statement)) {
      this.generateLabeledStatement(statement);
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
   * All functions return Result<T, E> for error propagation
   */
  private generateFunctionDeclaration(func: ts.FunctionDeclaration): void {
    const name = func.name?.getText() || 'anonymous';
    const params = this.generateParameters(func.parameters);
    const returnType = func.type ? this.generateType(func.type) : '()';
    // Wrap return type in Result<T, String>
    const resultType = `Result<${returnType}, String>`;
    
    this.emit(`fn ${name}(${params}) -> ${resultType} {`);
    this.indent();
    
    if (func.body) {
      this.generateBlock(func.body);
      
      // Auto-add Ok(()) if function doesn't have any return statements
      const hasReturnStatement = this.containsReturnStatement(func.body);
      if (!hasReturnStatement) {
        this.emit('Ok(())');
      }
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
   * All methods return Result<T, E> for error propagation
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
    // Wrap return type in Result<T, String>
    const resultType = `Result<${returnType}, String>`;
    
    this.emit(`fn ${name}(${params}) -> ${resultType} {`);
    this.indent();
    
    if (method.body) {
      this.generateBlock(method.body);
      
      // Auto-add Ok(()) if method doesn't have any return statements
      const hasReturnStatement = this.containsReturnStatement(method.body);
      if (!hasReturnStatement) {
        this.emit('Ok(())');
      }
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
    // Function calls already have ? added, so we just emit with semicolon
    this.emit(`${expr};`);
  }
  
  /**
   * Generate return statement
   * All returns are wrapped in Ok() for Result<T, E> pattern
   */
  private generateReturnStatement(statement: ts.ReturnStatement): void {
    if (statement.expression) {
      const expr = this.generateExpression(statement.expression);
      this.emit(`return Ok(${expr});`);
    } else {
      this.emit('return Ok(());');
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
   * Generate regular for statement (for init; condition; increment)
   * Translates to Rust range-based iteration when possible
   */
  private generateForStatement(statement: ts.ForStatement): void {
    // Try to detect simple counting loops and convert to Rust ranges
    const pattern = this.tryConvertToRange(statement);
    
    if (pattern) {
      // Simple range-based loop: for (let i = start; i < end; i++)
      const { variable, start, end, step, descending, inclusive } = pattern;
      
      // For Rust ranges, we need integers, not f64
      // Strip .0 suffix from numeric literals
      const startInt = this.convertToIntegerLiteral(start);
      const endInt = this.convertToIntegerLiteral(end);
      const stepInt = step ? this.convertToIntegerLiteral(step) : '1';
      
      let range: string;
      if (descending) {
        // Descending: for (let i = 5; i > 0; i--)
        // Rust: for i in (0..=5).rev() or (1..6).rev()
        if (inclusive) {
          range = `(${endInt}..=${startInt}).rev()`;
        } else {
          range = `(${endInt}..${startInt}).rev()`;
        }
      } else {
        // Ascending: for (let i = 0; i < 5; i++)
        // Rust: for i in 0..5
        if (inclusive) {
          range = `${startInt}..=${endInt}`;
        } else {
          range = `${startInt}..${endInt}`;
        }
      }
      
      // Add step if not 1
      if (stepInt && stepInt !== '1') {
        range = `(${range}).step_by(${stepInt})`;
      }
      
      this.emit(`for ${variable} in ${range} {`);
      this.indent();
      this.generateStatement(statement.statement);
      this.dedent();
      this.emit('}');
    } else {
      // Complex loop - use traditional loop construct
      this.emit('{');
      this.indent();
      
      // Generate initializer
      if (statement.initializer) {
        if (ts.isVariableDeclarationList(statement.initializer)) {
          for (const decl of statement.initializer.declarations) {
            const name = decl.name.getText();
            const value = decl.initializer ? this.generateExpression(decl.initializer) : '0';
            this.emit(`let mut ${name} = ${value};`);
          }
        } else {
          this.emit(this.generateExpression(statement.initializer) + ';');
        }
      }
      
      // Generate loop
      if (statement.condition) {
        const condition = this.generateExpression(statement.condition);
        this.emit(`while ${condition} {`);
      } else {
        this.emit('loop {');
      }
      
      this.indent();
      this.generateStatement(statement.statement);
      
      // Generate incrementor at the end of the loop
      if (statement.incrementor) {
        this.emit(this.generateExpression(statement.incrementor) + ';');
      }
      
      this.dedent();
      this.emit('}');
      this.dedent();
      this.emit('}');
    }
  }
  
  /**
   * Convert a numeric expression to an integer literal (strips .0 suffix)
   */
  private convertToIntegerLiteral(value: string): string {
    // If it ends with .0, remove it
    if (value.endsWith('.0')) {
      return value.slice(0, -2);
    }
    return value;
  }
  
  /**
   * Try to convert a for loop to a simple range pattern
   * Returns pattern info if successful, null otherwise
   */
  private tryConvertToRange(statement: ts.ForStatement): {
    variable: string;
    start: string;
    end: string;
    step?: string;
    descending: boolean;
    inclusive: boolean;
  } | null {
    // Check for simple initializer: let i = 0
    if (!statement.initializer || !ts.isVariableDeclarationList(statement.initializer)) {
      return null;
    }
    
    const decls = statement.initializer.declarations;
    if (decls.length !== 1 || !decls[0].initializer) {
      return null;
    }
    
    const variable = decls[0].name.getText();
    const start = this.generateExpression(decls[0].initializer);
    
    // Check for simple condition: i < 5 or i <= 5 or i > 0 or i >= 0
    if (!statement.condition || !ts.isBinaryExpression(statement.condition)) {
      return null;
    }
    
    const condition = statement.condition;
    const left = condition.left.getText();
    const right = this.generateExpression(condition.right);
    
    if (left !== variable) {
      return null;
    }
    
    let descending = false;
    let inclusive = false;
    
    switch (condition.operatorToken.kind) {
      case ts.SyntaxKind.LessThanToken: // i < 5
        descending = false;
        inclusive = false;
        break;
      case ts.SyntaxKind.LessThanEqualsToken: // i <= 5
        descending = false;
        inclusive = true;
        break;
      case ts.SyntaxKind.GreaterThanToken: // i > 0
        descending = true;
        inclusive = false;
        break;
      case ts.SyntaxKind.GreaterThanEqualsToken: // i >= 0
        descending = true;
        inclusive = true;
        break;
      default:
        return null;
    }
    
    // Check for simple incrementor: i++ or i-- or i += n or i -= n
    if (!statement.incrementor) {
      return null;
    }
    
    let step: string | undefined;
    
    if (ts.isPostfixUnaryExpression(statement.incrementor) ||
        ts.isPrefixUnaryExpression(statement.incrementor)) {
      const incExpr = statement.incrementor;
      const operand = incExpr.operand.getText();
      
      if (operand !== variable) {
        return null;
      }
      
      const isIncrement = incExpr.operator === ts.SyntaxKind.PlusPlusToken;
      const isDecrement = incExpr.operator === ts.SyntaxKind.MinusMinusToken;
      
      if (isIncrement && descending) return null;
      if (isDecrement && !descending) return null;
      
      step = '1';
    } else if (ts.isBinaryExpression(statement.incrementor)) {
      const incExpr = statement.incrementor;
      const incLeft = incExpr.left.getText();
      
      if (incLeft !== variable) {
        return null;
      }
      
      // i += 2 or i -= 2
      if (incExpr.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken ||
          incExpr.operatorToken.kind === ts.SyntaxKind.MinusEqualsToken) {
        const isAdd = incExpr.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken;
        
        if (isAdd && descending) return null;
        if (!isAdd && !descending) return null;
        
        step = this.generateExpression(incExpr.right);
      } else {
        return null;
      }
    } else {
      return null;
    }
    
    return {
      variable,
      start,
      end: right,
      step,
      descending,
      inclusive,
    };
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
    
    // In Rust, we should iterate over references to avoid consuming the collection
    // This is especially important for:
    // 1. Property access (e.g., self.values) - we don't want to move out of self
    // 2. Local variables (e.g., vec) - they might be used later or in nested loops
    // 3. Any collection that implements IntoIterator but not Copy
    // Only skip the & if iterating over an array literal or function call result
    const needsRef = !ts.isArrayLiteralExpression(statement.expression) &&
                     !ts.isCallExpression(statement.expression);
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
    } else if (ts.isElementAccessExpression(expr)) {
      return this.generateElementAccess(expr);
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
   * All functions return Result<T, E> for error propagation
   */
  private generateArrowFunction(func: ts.ArrowFunction): string {
    const params = this.generateParameters(func.parameters);
    const returnType = func.type ? this.generateType(func.type) : '()';
    // Wrap return type in Result<T, String>
    const resultType = `Result<${returnType}, String>`;
    
    if (ts.isBlock(func.body)) {
      // Multi-line function - we need to capture the body statements separately
      // Save current output state
      const savedOutput = this.output;
      this.output = [];
      
      this.indent();
      for (const statement of func.body.statements) {
        this.generateStatement(statement);
      }
      
      // Auto-add Ok(()) if function doesn't have any return statements
      // Check recursively through the entire block
      const hasReturnStatement = this.containsReturnStatement(func.body);
      if (!hasReturnStatement) {
        this.emit('Ok(())');
      }
      
      this.dedent();
      
      // Get the generated body
      const bodyLines = this.output;
      this.output = savedOutput;
      
      // Build the closure with proper formatting
      if (bodyLines.length === 0) {
        return `|${params}| -> ${resultType} { Ok(()) }`;
      } else {
        const bodyCode = bodyLines.join('\n');
        return `|${params}| -> ${resultType} {\n${bodyCode}\n${this.INDENT.repeat(this.indentLevel)}}`;
      }
    } else {
      // Single expression - wrap in Ok()
      const body = this.generateExpression(func.body);
      return `|${params}| -> ${resultType} { Ok(${body}) }`;
    }
  }
  
  /**
   * Generate binary expression
   */
  private generateBinaryExpression(expr: ts.BinaryExpression): string {
    let operator = expr.operatorToken.getText();
    
    // Handle string concatenation specially
    if (operator === '+') {
      // Check if either operand looks like a string
      const leftIsString = this.expressionLooksLikeString(expr.left);
      const rightIsString = this.expressionLooksLikeString(expr.right);
      
      if (leftIsString || rightIsString) {
        return this.generateStringConcat(expr);
      }
    }
    
    const left = this.generateExpression(expr.left);
    const right = this.generateExpression(expr.right);
    
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
   * Check if an expression looks like a string (heuristic-based)
   */
  private expressionLooksLikeString(expr: ts.Expression): boolean {
    // String literals
    if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr) || ts.isTemplateExpression(expr)) {
      return true;
    }
    
    // Binary expression with + that contains strings
    if (ts.isBinaryExpression(expr) && expr.operatorToken.getText() === '+') {
      return this.expressionLooksLikeString(expr.left) || this.expressionLooksLikeString(expr.right);
    }
    
    // Check type annotation if available
    const parent = expr.parent;
    if (ts.isVariableDeclaration(parent) && parent.type) {
      const typeText = parent.type.getText();
      if (typeText === 'string' || typeText === 'String') {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Generate string concatenation using format! or + with proper borrowing
   */
  private generateStringConcat(expr: ts.BinaryExpression): string {
    // Collect all parts of a chain of string concatenations
    const parts: string[] = [];
    const collectParts = (e: ts.Expression): void => {
      if (ts.isBinaryExpression(e) && e.operatorToken.getText() === '+') {
        collectParts(e.left);
        collectParts(e.right);
      } else {
        parts.push(this.generateExpression(e));
      }
    };
    collectParts(expr);
    
    // Use format! for multiple concatenations
    if (parts.length > 2) {
      const formatStr = parts.map(() => '{}').join('');
      return `format!("${formatStr}", ${parts.join(', ')})`;
    } else {
      // Simple a + b case - use + with proper borrowing
      // First part is consumed, rest need to be borrowed string slices
      const [first, ...rest] = parts;
      let result = first;
      for (const part of rest) {
        // Check if part is a string literal - if so, use the string slice directly
        if (part.startsWith('String::from(')) {
          // Extract the literal and use it as &str
          const literal = part.slice('String::from('.length, -1);
          result = `${result} + ${literal}`;
        } else {
          result = `${result} + &${part}`;
        }
      }
      return result;
    }
  }
  
  /**
   * Generate call expression
   * All function calls use ? operator for error propagation (except macros like println!)
   */
  private generateCallExpression(expr: ts.CallExpression): string {
    // Special handling for method calls on objects
    if (ts.isPropertyAccessExpression(expr.expression)) {
      const objectExpr = expr.expression.expression;
      const object = this.generateExpression(objectExpr);
      const property = expr.expression.name.getText();
      
      // console.log -> println! macro
      if (object === 'console' && property === 'log') {
        const args = expr.arguments.map(arg => this.generateExpression(arg));
        // Use println! macro for console.log
        // Macros don't need the ? operator
        if (args.length === 0) {
          return 'println!()';
        } else if (args.length === 1) {
          return `println!("{}", ${args[0]})`;
        } else {
          // Multiple arguments - join with spaces
          const formatStr = args.map(() => '{}').join(' ');
          return `println!("${formatStr}", ${args.join(', ')})`;
        }
      }
      
      // Array methods: map, filter, forEach, etc.
      if (property === 'map') {
        return this.generateArrayMap(objectExpr, expr.arguments);
      } else if (property === 'filter') {
        return this.generateArrayFilter(objectExpr, expr.arguments);
      } else if (property === 'forEach') {
        return this.generateArrayForEach(objectExpr, expr.arguments);
      } else if (property === 'reduce') {
        return this.generateArrayReduce(objectExpr, expr.arguments);
      }
    }
    
    const func = this.generateExpression(expr.expression);
    const args = expr.arguments.map(arg => this.generateExpression(arg)).join(', ');
    
    return `${func}(${args})?`;
  }
  
  /**
   * Generate array.map() -> iter().map().collect()
   */
  private generateArrayMap(array: ts.Expression, args: readonly ts.Expression[]): string {
    if (args.length === 0) {
      return this.generateExpression(array);
    }
    
    const arrayCode = this.generateExpression(array);
    const callback = args[0];
    
    // Check if callback uses index parameter (2nd param)
    let hasIndex = false;
    if (ts.isArrowFunction(callback)) {
      hasIndex = callback.parameters.length >= 2;
    }
    
    if (hasIndex) {
      // Use enumerate() for indexed map
      const lambda = this.generateArrayMethodCallback(callback, true);
      return `${arrayCode}.iter().enumerate().map(${lambda}).collect::<Vec<_>>()`;
    } else {
      const lambda = this.generateArrayMethodCallback(callback, false);
      return `${arrayCode}.iter().map(${lambda}).collect::<Vec<_>>()`;
    }
  }
  
  /**
   * Generate array.filter() -> iter().filter().collect()
   */
  private generateArrayFilter(array: ts.Expression, args: readonly ts.Expression[]): string {
    if (args.length === 0) {
      return this.generateExpression(array);
    }
    
    const arrayCode = this.generateExpression(array);
    const callback = args[0];
    const lambda = this.generateArrayMethodCallback(callback, false);
    
    // filter returns references, we need to clone or copy them
    return `${arrayCode}.iter().filter(${lambda}).cloned().collect::<Vec<_>>()`;
  }
  
  /**
   * Generate array.forEach() -> iter().for_each()
   */
  private generateArrayForEach(array: ts.Expression, args: readonly ts.Expression[]): string {
    if (args.length === 0) {
      return this.generateExpression(array);
    }
    
    const arrayCode = this.generateExpression(array);
    const callback = args[0];
    const lambda = this.generateArrayMethodCallback(callback, false);
    
    return `${arrayCode}.iter().for_each(${lambda})`;
  }
  
  /**
   * Generate array.reduce() -> iter().fold()
   */
  private generateArrayReduce(array: ts.Expression, args: readonly ts.Expression[]): string {
    if (args.length < 2) {
      // reduce needs at least callback and initial value
      return this.generateExpression(array);
    }
    
    const arrayCode = this.generateExpression(array);
    const callback = args[0];
    const initial = this.generateExpression(args[1]);
    
    // reduce callback has (acc, item) parameters
    let lambda = '';
    if (ts.isArrowFunction(callback)) {
      const params = callback.parameters.map(p => p.name.getText());
      const body = ts.isBlock(callback.body) 
        ? `{ ${callback.body.statements.map(s => this.generateStatementInline(s)).join('; ')} }`
        : this.generateExpression(callback.body);
      lambda = `|${params.join(', ')}| ${body}`;
    }
    
    return `${arrayCode}.iter().fold(${initial}, ${lambda})`;
  }
  
  /**
   * Generate callback function for array methods
   */
  private generateArrayMethodCallback(callback: ts.Expression, withIndex: boolean): string {
    if (!ts.isArrowFunction(callback)) {
      return this.generateExpression(callback);
    }
    
    const params = callback.parameters;
    let paramList: string;
    
    if (withIndex) {
      // enumerate() gives (index, &item)
      const indexParam = params[1]?.name.getText() || '_i';
      const itemParam = params[0]?.name.getText() || 'x';
      paramList = `(${indexParam}, &${itemParam})`;
    } else {
      // Regular iterator gives &item
      const itemParam = params[0]?.name.getText() || 'x';
      paramList = `&${itemParam}`;
    }
    
    // Generate body
    let body: string;
    if (ts.isBlock(callback.body)) {
      // Multi-line callback
      const statements = callback.body.statements.map(s => this.generateStatementInline(s)).join('; ');
      body = `{ ${statements} }`;
    } else {
      // Single expression
      body = this.generateExpression(callback.body);
    }
    
    return `|${paramList}| ${body}`;
  }
  
  /**
   * Generate a statement inline (for use in lambda bodies)
   */
  private generateStatementInline(statement: ts.Statement): string {
    if (ts.isReturnStatement(statement)) {
      if (statement.expression) {
        return this.generateExpression(statement.expression);
      }
      return '';
    } else if (ts.isExpressionStatement(statement)) {
      return this.generateExpression(statement.expression);
    } else {
      // For other statements, generate normally but strip newlines
      const saved = this.output;
      this.output = [];
      this.generateStatement(statement);
      const result = this.output.join(' ');
      this.output = saved;
      return result;
    }
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
  
  /**
   * Generate try/catch statement as Result pattern matching
   */
  private generateTryStatement(statement: ts.TryStatement): void {
    // In Rust, we'll convert try/catch to a closure that returns Result
    // and then match on it
    this.emit('let result = (|| -> Result<(), String> {');
    this.indent();
    
    // Generate try block
    if (statement.tryBlock) {
      for (const stmt of statement.tryBlock.statements) {
        this.generateStatement(stmt);
      }
    }
    
    this.emit('Ok(())');
    this.dedent();
    this.emit('})();');
    this.emit('');
    
    // Generate catch block if present
    if (statement.catchClause) {
      this.emit('match result {');
      this.indent();
      this.emit('Ok(_) => {},');
      
      const errorVar = statement.catchClause.variableDeclaration?.name.getText() || 'e';
      this.emit(`Err(${errorVar}) => {`);
      this.indent();
      
      if (statement.catchClause.block) {
        for (const stmt of statement.catchClause.block.statements) {
          this.generateStatement(stmt);
        }
      }
      
      this.dedent();
      this.emit('}');
      this.dedent();
      this.emit('}');
    }
    
    // Generate finally block if present
    if (statement.finallyBlock) {
      this.emit('// Finally block');
      for (const stmt of statement.finallyBlock.statements) {
        this.generateStatement(stmt);
      }
    }
  }
  
  /**
   * Generate throw statement as Result::Err return
   */
  private generateThrowStatement(statement: ts.ThrowStatement): void {
    if (statement.expression) {
      const expr = this.generateExpression(statement.expression);
      this.emit(`return Err(${expr}.to_string());`);
    } else {
      this.emit('return Err(String::from("Error"));');
    }
  }
  
  /**
   * Generate while loop
   */
  private generateWhileStatement(statement: ts.WhileStatement): void {
    const condition = this.generateExpression(statement.expression);
    this.emit(`while ${condition} {`);
    this.indent();
    this.generateStatement(statement.statement);
    this.dedent();
    this.emit('}');
  }
  
  /**
   * Generate do-while loop
   */
  private generateDoStatement(statement: ts.DoStatement): void {
    // Rust doesn't have do-while, so we use loop with a break
    this.emit('loop {');
    this.indent();
    this.generateStatement(statement.statement);
    const condition = this.generateExpression(statement.expression);
    this.emit(`if !(${condition}) {`);
    this.indent();
    this.emit('break;');
    this.dedent();
    this.emit('}');
    this.dedent();
    this.emit('}');
  }
  
  /**
   * Generate break statement
   */
  private generateBreakStatement(statement: ts.BreakStatement): void {
    if (statement.label) {
      const label = statement.label.getText();
      this.emit(`break '${label};`);
    } else {
      this.emit('break;');
    }
  }
  
  /**
   * Generate continue statement
   */
  private generateContinueStatement(statement: ts.ContinueStatement): void {
    if (statement.label) {
      const label = statement.label.getText();
      this.emit(`continue '${label};`);
    } else {
      this.emit('continue;');
    }
  }
  
  /**
   * Generate labeled statement
   */
  private generateLabeledStatement(statement: ts.LabeledStatement): void {
    const label = statement.label.getText();
    this.emit(`'${label}: loop {`);
    this.indent();
    this.generateStatement(statement.statement);
    this.dedent();
    this.emit('}');
  }
  
  /**
   * Generate element access expression (array/object indexing)
   */
  private generateElementAccess(expr: ts.ElementAccessExpression): string {
    const object = this.generateExpression(expr.expression);
    const index = this.generateExpression(expr.argumentExpression);
    
    // For arrays, use indexing; for maps, use get()
    // We'll use a simple heuristic: if index is a number, use [], otherwise assume it's a map
    if (ts.isNumericLiteral(expr.argumentExpression)) {
      return `${object}[${index} as usize]`;
    } else {
      // Could be a map access
      return `${object}[&${index}]`;
    }
  }
}
