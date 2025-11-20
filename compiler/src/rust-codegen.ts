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
  private optionVariables = new Set<string>();  // Track variables with Option<T> type
  private integerVariables = new Set<string>();  // Track variables with integer type (from for loops)
  private inSwitchCaseClosure = false;  // Track if we're inside a switch case closure (for break handling)
  private currentLabel?: string;  // Track current label for labeled loops
  private hasAsync = false;  // Track if we need tokio imports
  private destructuringParams: Array<{tempName: string, pattern: ts.BindingName, isConst: boolean}> = [];  // Track destructuring parameters
  private defaultExportedNames = new Set<string>();  // Track names that are default-exported
  private checker?: ts.TypeChecker;  // Optional type checker for type inference
  
  constructor(checker?: ts.TypeChecker) {
    this.checker = checker;
  }
  
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
   * Reset generator state
   */
  private reset(): void {
    this.indentLevel = 0;
    this.output = [];
    this.imports = new Set();
    this.optionVariables = new Set();
    this.integerVariables = new Set();
    this.inSwitchCaseClosure = false;
    this.hasAsync = false;
  }
  
  /**
   * Build final output with imports
   */
  private buildOutput(): string {
    const lines: string[] = [];
    
    // Add tokio imports if async is used
    if (this.hasAsync) {
      this.addImport('use tokio;');
    }
    
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
   * Check if a statement has an export modifier
   */
  private isExported(statement: ts.Statement): boolean {
    // Check if the statement has modifiers property
    if ('modifiers' in statement) {
      const modifiers = (statement as any).modifiers;
      if (Array.isArray(modifiers)) {
        return modifiers.some((m: ts.Modifier) => m.kind === ts.SyntaxKind.ExportKeyword);
      }
    }
    return false;
  }

  /**
   * Generate code for the entire source file
   */
  private generateSourceFile(sourceFile: ts.SourceFile): void {
    // First pass: find default exports
    for (const statement of sourceFile.statements) {
      if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
        // export default identifier
        if (ts.isIdentifier(statement.expression)) {
          this.defaultExportedNames.add(statement.expression.text);
        }
      }
    }
    
    // Separate executable code from type/function declarations
    const topLevelDecls: ts.Statement[] = [];
    const typeDecls: ts.Statement[] = [];
    const exportedDecls: ts.Statement[] = [];
    const defaultExportedFunctions: Array<{name: string, func: ts.ArrowFunction, typeParams?: ts.NodeArray<ts.TypeParameterDeclaration>}> = [];
    const genericFunctions: Array<{name: string, func: ts.ArrowFunction, typeParams: ts.NodeArray<ts.TypeParameterDeclaration>}> = [];
    
    for (const statement of sourceFile.statements) {
      // Check if this is a variable statement with an arrow function (generic or default-exported)
      if (ts.isVariableStatement(statement)) {
        const decl = statement.declarationList.declarations[0];
        if (decl && ts.isIdentifier(decl.name)) {
          const name = decl.name.text;
          
          // Check for default-exported arrow function
          if (this.defaultExportedNames.has(name) && decl.initializer && ts.isArrowFunction(decl.initializer)) {
            // Extract this to generate as a pub fn
            const func = decl.initializer;
            defaultExportedFunctions.push({ name, func, typeParams: func.typeParameters });
            continue; // Skip adding to topLevelDecls
          }
          
          // Check for generic arrow function (has type parameters)
          if (decl.initializer && ts.isArrowFunction(decl.initializer) && decl.initializer.typeParameters) {
            // Extract generic functions to top level
            genericFunctions.push({ name, func: decl.initializer, typeParams: decl.initializer.typeParameters });
            continue; // Skip adding to topLevelDecls
          }
        }
      }
      
      // Handle export declarations specially
      if (this.isExported(statement)) {
        exportedDecls.push(statement);
      }
      // Executable statements go in main()
      else if (ts.isVariableStatement(statement) || 
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
          ts.isLabeledStatement(statement) ||
          ts.isBlock(statement)) {
        topLevelDecls.push(statement);
      } else {
        // Type declarations, function declarations, classes, interfaces, etc.
        typeDecls.push(statement);
      }
    }
    
    // First emit exported declarations with pub visibility
    for (const statement of exportedDecls) {
      this.generateExportedStatement(statement);
    }
    
    // Then emit default-exported functions
    for (const { name, func, typeParams } of defaultExportedFunctions) {
      this.generateExportedArrowFunction(name, func, typeParams);
    }
    
    // Then emit generic functions (non-exported)
    for (const { name, func, typeParams } of genericFunctions) {
      this.generateGenericFunction(name, func, typeParams);
    }
    
    // Then emit type declarations (classes, interfaces, type aliases)
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
    } else if (ts.isExportAssignment(statement)) {
      // Export default - skip in Rust (the actual item is already defined)
      // In TypeScript: export default foo; just assigns exports.default = foo
      // In Rust: we don't have a direct equivalent, the item is already public if exported
      this.emit(`// export default (skipped in Rust)`);
    } else {
      // Unknown statement type - emit a comment
      this.emit(`// TODO: Implement code generation for ${ts.SyntaxKind[statement.kind]}`);
    }
  }

  /**
   * Generate code for an exported statement (with pub visibility)
   */
  private generateExportedStatement(statement: ts.Statement): void {
    if (ts.isVariableStatement(statement)) {
      // For exported variables, we need to move them out of functions
      // For now, treat them as exported constants
      const declarations = statement.declarationList.declarations;
      const isConst = (statement.declarationList.flags & ts.NodeFlags.Const) !== 0;
      
      for (const decl of declarations) {
        if (ts.isIdentifier(decl.name)) {
          const name = decl.name.getText();
          const typeAnnotation = decl.type ? `: ${this.generateType(decl.type)}` : '';
          
          if (decl.initializer) {
            let value = this.generateExpression(decl.initializer);
            
            // For arrow functions, convert to pub fn
            if (ts.isArrowFunction(decl.initializer)) {
              this.generateExportedArrowFunction(name, decl.initializer);
            } else {
              // For constants, use pub const
              this.emit(`pub const ${name}${typeAnnotation} = ${value};`);
            }
          }
        }
      }
    } else if (ts.isFunctionDeclaration(statement)) {
      this.generateFunctionDeclaration(statement, true);
    } else if (ts.isClassDeclaration(statement)) {
      this.generateClassDeclaration(statement, true);
    } else if (ts.isInterfaceDeclaration(statement)) {
      this.generateInterfaceDeclaration(statement, true);
    } else if (ts.isTypeAliasDeclaration(statement)) {
      this.generateTypeAliasDeclaration(statement, true);
    } else if (ts.isEnumDeclaration(statement)) {
      this.generateEnumDeclaration(statement, true);
    } else {
      // For other exported statements, emit a comment
      this.emit(`// TODO: Implement export for ${ts.SyntaxKind[statement.kind]}`);
    }
  }

  /**
   * Generate exported arrow function as a pub fn
   */
  private generateExportedArrowFunction(name: string, func: ts.ArrowFunction, typeParams?: ts.NodeArray<ts.TypeParameterDeclaration>): void {
    const genericParams = this.generateTypeParameters(typeParams);
    const params = this.generateParameters(func.parameters);
    const returnType = func.type ? this.generateType(func.type) : '()';
    const resultType = `Result<${returnType}, String>`;
    
    // Check if arrow function is async
    const isAsync = func.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword);
    if (isAsync) {
      this.hasAsync = true;
    }
    const asyncModifier = isAsync ? 'async ' : '';
    
    this.emit(`pub ${asyncModifier}fn ${name}${genericParams}(${params}) -> ${resultType} {`);
    this.indent();
    
    if (ts.isBlock(func.body)) {
      for (const statement of func.body.statements) {
        this.generateStatement(statement);
      }
      
      const hasReturnStatement = this.containsReturnStatement(func.body);
      if (!hasReturnStatement) {
        this.emit('Ok(())');
      }
    } else {
      const body = this.generateExpression(func.body);
      this.emit(`Ok(${body})`);
    }
    
    this.dedent();
    this.emit('}');
    this.emit('');
  }

  /**
   * Generate generic function (non-exported)
   */
  private generateGenericFunction(name: string, func: ts.ArrowFunction, typeParams: ts.NodeArray<ts.TypeParameterDeclaration>): void {
    const genericParams = this.generateTypeParameters(typeParams);
    const params = this.generateParameters(func.parameters);
    const returnType = func.type ? this.generateType(func.type) : '()';
    const resultType = `Result<${returnType}, String>`;
    
    // Check if arrow function is async
    const isAsync = func.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword);
    if (isAsync) {
      this.hasAsync = true;
    }
    const asyncModifier = isAsync ? 'async ' : '';
    
    this.emit(`${asyncModifier}fn ${name}${genericParams}(${params}) -> ${resultType} {`);
    this.indent();
    
    if (ts.isBlock(func.body)) {
      for (const statement of func.body.statements) {
        this.generateStatement(statement);
      }
      
      const hasReturnStatement = this.containsReturnStatement(func.body);
      if (!hasReturnStatement) {
        this.emit('Ok(())');
      }
    } else {
      const body = this.generateExpression(func.body);
      this.emit(`Ok(${body})`);
    }
    
    this.dedent();
    this.emit('}');
    this.emit('');
  }
  
  /**
   * Generate variable declaration
   */
  private generateVariableStatement(statement: ts.VariableStatement): void {
    const declarations = statement.declarationList.declarations;
    const isConst = (statement.declarationList.flags & ts.NodeFlags.Const) !== 0;
    
    for (const decl of declarations) {
      // Check if this is a destructuring pattern
      if (ts.isArrayBindingPattern(decl.name) || ts.isObjectBindingPattern(decl.name)) {
        this.generateDestructuringDeclaration(decl, isConst);
      } else {
        // Regular identifier binding
        const name = decl.name.getText();
        // Make variables mutable if they're not const, OR if they're initialized with a class instance
        const needsMutable = !isConst || (decl.initializer && ts.isNewExpression(decl.initializer));
        const mutability = needsMutable ? 'mut ' : '';
        const typeAnnotation = decl.type ? `: ${this.generateType(decl.type)}` : '';
        
        if (decl.initializer) {
          let value: string;
          
          // For object literals with type annotation, pass the type to the generator
          if (ts.isObjectLiteralExpression(decl.initializer) && decl.type && ts.isTypeReferenceNode(decl.type)) {
            const structName = decl.type.typeName.getText();
            value = this.generateObjectLiteralWithType(decl.initializer, structName);
          } else {
            value = this.generateExpression(decl.initializer);
          }
          
          // Check if we need to wrap in Some() for Option types
          if (decl.type) {
            const rustType = this.generateType(decl.type);
            // If it's an Option type and the value isn't None, wrap in Some()
            if (rustType.startsWith('Option<')) {
              // Track this variable as an Option type
              this.optionVariables.add(name);
              if (value !== 'None') {
                value = `Some(${value})`;
              }
            }
          }
          
          // Wrap value in ownership constructor if needed (but not for arrow functions)
          if (decl.type && !ts.isArrowFunction(decl.initializer) && !ts.isObjectLiteralExpression(decl.initializer)) {
            value = this.wrapInOwnershipConstructor(value, decl.type);
          }
          
          this.emit(`let ${mutability}${name}${typeAnnotation} = ${value};`);
        } else {
          this.emit(`let ${mutability}${name}${typeAnnotation};`);
        }
      }
    }
  }

  /**
   * Generate code for destructuring declarations
   */
  private generateDestructuringDeclaration(decl: ts.VariableDeclaration, isConst: boolean): void {
    if (!decl.initializer) {
      this.emit('// TODO: Destructuring without initializer');
      return;
    }

    const source = this.generateExpression(decl.initializer);

    if (ts.isArrayBindingPattern(decl.name)) {
      // Array destructuring: const [a, b, c] = arr;
      // In Rust: let [a, b, c] = [arr[0].clone(), arr[1].clone(), arr[2].clone()];
      // Or better: assign individually
      const elements = decl.name.elements;
      
      // First, store the source in a temp variable
      const tempVar = `_tmp_${Math.random().toString(36).substring(7)}`;
      this.emit(`let ${tempVar} = ${source};`);
      
      let index = 0;
      for (const elem of elements) {
        if (ts.isOmittedExpression(elem)) {
          // Skip this element
          index++;
          continue;
        }
        
        if (ts.isBindingElement(elem)) {
          const mutability = isConst ? '' : 'mut ';
          
          if (elem.dotDotDotToken) {
            // Rest element: ...rest
            const elemName = elem.name.getText();
            // In Rust: let rest = tmp[index..].to_vec();
            this.emit(`let ${mutability}${elemName} = ${tempVar}[${index}..].to_vec();`);
            break; // Rest must be last
          } else if (ts.isArrayBindingPattern(elem.name)) {
            // Nested array destructuring
            const nestedTempVar = `_tmp_${Math.random().toString(36).substring(7)}`;
            this.emit(`let ${nestedTempVar} = ${tempVar}[${index}].clone();`);
            
            // Recursively destructure the nested pattern
            const nestedElements = elem.name.elements;
            let nestedIndex = 0;
            for (const nestedElem of nestedElements) {
              if (ts.isOmittedExpression(nestedElem)) {
                nestedIndex++;
                continue;
              }
              if (ts.isBindingElement(nestedElem)) {
                const nestedName = nestedElem.name.getText();
                this.emit(`let ${mutability}${nestedName} = ${nestedTempVar}[${nestedIndex}].clone();`);
                nestedIndex++;
              }
            }
            index++;
          } else if (ts.isObjectBindingPattern(elem.name)) {
            // Nested object destructuring
            const nestedTempVar = `_tmp_${Math.random().toString(36).substring(7)}`;
            this.emit(`let ${nestedTempVar} = ${tempVar}[${index}].clone();`);
            
            // Recursively destructure the nested pattern
            const nestedElements = elem.name.elements;
            for (const nestedElem of nestedElements) {
              const propName = nestedElem.propertyName ? nestedElem.propertyName.getText() : nestedElem.name.getText();
              const bindingName = nestedElem.name.getText();
              this.emit(`let ${mutability}${bindingName} = ${nestedTempVar}.${propName}.clone();`);
            }
            index++;
          } else {
            // Regular element
            const elemName = elem.name.getText();
            this.emit(`let ${mutability}${elemName} = ${tempVar}[${index}].clone();`);
            index++;
          }
        }
      }
    } else if (ts.isObjectBindingPattern(decl.name)) {
      // Object destructuring: const { x, y } = point;
      // In Rust: let x = point.x.clone(); let y = point.y.clone();
      const elements = decl.name.elements;
      
      // First, store the source in a temp variable
      const tempVar = `_tmp_${Math.random().toString(36).substring(7)}`;
      this.emit(`let ${tempVar} = ${source};`);
      
      for (const elem of elements) {
        const mutability = isConst ? '' : 'mut ';
        
        if (elem.dotDotDotToken) {
          // Rest in object destructuring - not commonly supported in Rust
          this.emit('// TODO: Object rest pattern not supported in Rust');
          continue;
        }
        
        // Get the property name being destructured
        const propName = elem.propertyName ? elem.propertyName.getText() : elem.name.getText();
        
        if (ts.isArrayBindingPattern(elem.name)) {
          // Nested array destructuring from object property
          const nestedTempVar = `_tmp_${Math.random().toString(36).substring(7)}`;
          this.emit(`let ${nestedTempVar} = ${tempVar}.${propName}.clone();`);
          
          // Recursively destructure the nested array
          const nestedElements = elem.name.elements;
          let nestedIndex = 0;
          for (const nestedElem of nestedElements) {
            if (ts.isOmittedExpression(nestedElem)) {
              nestedIndex++;
              continue;
            }
            if (ts.isBindingElement(nestedElem)) {
              const nestedName = nestedElem.name.getText();
              this.emit(`let ${mutability}${nestedName} = ${nestedTempVar}[${nestedIndex}].clone();`);
              nestedIndex++;
            }
          }
        } else if (ts.isObjectBindingPattern(elem.name)) {
          // Nested object destructuring
          const nestedTempVar = `_tmp_${Math.random().toString(36).substring(7)}`;
          this.emit(`let ${nestedTempVar} = ${tempVar}.${propName}.clone();`);
          
          // Recursively destructure the nested object
          const nestedElements = elem.name.elements;
          for (const nestedElem of nestedElements) {
            const nestedPropName = nestedElem.propertyName ? nestedElem.propertyName.getText() : nestedElem.name.getText();
            const nestedBindingName = nestedElem.name.getText();
            this.emit(`let ${mutability}${nestedBindingName} = ${nestedTempVar}.${nestedPropName}.clone();`);
          }
        } else {
          // Regular property
          const bindingName = elem.name.getText();
          let value = `${tempVar}.${propName}`;
          
          // Check if there's an initializer (default value)
          if (elem.initializer) {
            const defaultValue = this.generateExpression(elem.initializer);
            // In Rust, we'd need Option types for this to work properly
            // For now, just use the direct value
            value = `${tempVar}.${propName}`;
          }
          
          // Add .clone() since we're extracting from a struct
          this.emit(`let ${mutability}${bindingName} = ${value}.clone();`);
        }
      }
    }
  }

  /**
   * Generate destructuring from a binding pattern and source variable name
   * This is used for function parameter destructuring where the source is a simple string
   */
  private generateDestructuringFromPattern(pattern: ts.BindingName, sourceVar: string, isConst: boolean): void {
    if (ts.isArrayBindingPattern(pattern)) {
      // Array destructuring
      const elements = pattern.elements;
      let index = 0;
      
      for (const elem of elements) {
        if (ts.isOmittedExpression(elem)) {
          index++;
          continue;
        }
        
        if (ts.isBindingElement(elem)) {
          const mutability = isConst ? '' : 'mut ';
          const elemName = elem.name.getText();
          
          if (elem.dotDotDotToken) {
            // Rest element
            this.emit(`let ${mutability}${elemName} = ${sourceVar}[${index}..].to_vec();`);
            break;
          } else {
            this.emit(`let ${mutability}${elemName} = ${sourceVar}[${index}].clone();`);
            index++;
          }
        }
      }
    } else if (ts.isObjectBindingPattern(pattern)) {
      // Object destructuring
      const elements = pattern.elements;
      
      for (const elem of elements) {
        const mutability = isConst ? '' : 'mut ';
        const propName = elem.propertyName ? elem.propertyName.getText() : elem.name.getText();
        const bindingName = elem.name.getText();
        
        this.emit(`let ${mutability}${bindingName} = ${sourceVar}.${propName}.clone();`);
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
  private generateFunctionDeclaration(func: ts.FunctionDeclaration, isExported: boolean = false): void {
    const name = func.name?.getText() || 'anonymous';
    const params = this.generateParameters(func.parameters);
    const returnType = func.type ? this.generateType(func.type) : '()';
    // Wrap return type in Result<T, String>
    const resultType = `Result<${returnType}, String>`;
    
    // Check if function is async
    const isAsync = func.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword);
    if (isAsync) {
      this.hasAsync = true;
    }
    const asyncModifier = isAsync ? 'async ' : '';
    const pubModifier = isExported ? 'pub ' : '';
    
    this.emit(`${pubModifier}${asyncModifier}fn ${name}(${params}) -> ${resultType} {`);
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
  private generateClassDeclaration(classDecl: ts.ClassDeclaration, isExported: boolean = false): void {
    const name = classDecl.name?.getText() || 'AnonymousClass';
    const pubModifier = isExported ? 'pub ' : '';
    const typeParams = this.generateTypeParameters(classDecl.typeParameters);
    
    // Generate struct for fields
    this.emit(`#[derive(Clone)]`);
    this.emit(`${pubModifier}struct ${name}${typeParams} {`);
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
    
    // Generate impl block for constructor and methods
    const methods = classDecl.members.filter(ts.isMethodDeclaration);
    if (typeParams) {
      this.emit(`impl${typeParams} ${name}${typeParams} {`);
    } else {
      this.emit(`impl ${name} {`);
    }
    this.indent();
    
    // Generate constructor (new method)
    this.emit(`fn new() -> Self {`);
    this.indent();
    this.emit(`${name} {`);
    this.indent();
    
    // Initialize fields with their default values
    for (const field of fields) {
      const fieldName = field.name.getText();
      if (field.initializer) {
        const initValue = this.generateExpression(field.initializer);
        this.emit(`${fieldName}: ${initValue},`);
      } else {
        // Use default values
        const fieldType = field.type ? this.generateType(field.type) : 'unknown';
        this.emit(`${fieldName}: ${this.getDefaultValue(fieldType)},`);
      }
    }
    
    this.dedent();
    this.emit('}');
    this.dedent();
    this.emit('}');
    this.emit('');
    
    // Generate methods
    for (const method of methods) {
      this.generateMethodDeclaration(method);
    }
    
    this.dedent();
    this.emit('}');
    this.emit('');
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
    
    // Check if method is async
    const isAsync = method.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword);
    if (isAsync) {
      this.hasAsync = true;
    }
    const asyncModifier = isAsync ? 'async ' : '';
    
    this.emit(`${asyncModifier}fn ${name}(${params}) -> ${resultType} {`);
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
  private generateInterfaceDeclaration(iface: ts.InterfaceDeclaration, isExported: boolean = false): void {
    const name = iface.name.getText();
    const pubModifier = isExported ? 'pub ' : '';
    const typeParams = this.generateTypeParameters(iface.typeParameters);
    
    this.emit(`#[derive(Clone)]`);
    this.emit(`${pubModifier}struct ${name}${typeParams} {`);
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
  private generateTypeAliasDeclaration(typeAlias: ts.TypeAliasDeclaration, isExported: boolean = false): void {
    const name = typeAlias.name.getText();
    const pubModifier = isExported ? 'pub ' : '';
    
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
        this.emit(`${pubModifier}enum ${name} {`);
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
  private generateEnumDeclaration(enumDecl: ts.EnumDeclaration, isExported: boolean = false): void {
    const name = enumDecl.name.getText();
    const pubModifier = isExported ? 'pub ' : '';
    
    // Check if it's a numeric or string enum
    const hasStringValues = enumDecl.members.some(m => 
      m.initializer && ts.isStringLiteral(m.initializer)
    );
    
    if (hasStringValues) {
      // String enum - generate as regular enum
      this.emit(`${pubModifier}enum ${name} {`);
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
      this.emit(`${pubModifier}enum ${name} {`);
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
      
      // Track this variable as an integer type
      this.integerVariables.add(variable);
      
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
      
      // Remove from integer tracking after the loop scope ends
      this.integerVariables.delete(variable);
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
    
    // Use .iter().copied() for all iterations over Vec<T> where T: Copy
    // This gives us owned values instead of references, avoiding &T vs T issues
    // when passing loop variables to functions
    // Note: This assumes we're iterating over Copy types (primitives)
    // For non-Copy types (String, complex objects), this would need .iter().cloned()
    // or iteration by reference with manual dereferencing
    const label = this.currentLabel ? `'${this.currentLabel}: ` : '';
    const savedLabel = this.currentLabel;
    this.currentLabel = undefined;  // Clear label after using it
    this.emit(`${label}for ${variable} in ${iterable}.iter().copied() {`);
    this.indent();
    this.generateStatement(statement.statement);
    this.dedent();
    this.emit('}');
    this.currentLabel = savedLabel;
  }
  
  /**
   * Generate switch statement as Rust match expression
   */
  /**
   * Check if a node contains break statements (recursively)
   */
  private containsBreakStatement(node: ts.Node): boolean {
    if (ts.isBreakStatement(node)) {
      return true;
    }
    
    let hasBreak = false;
    ts.forEachChild(node, child => {
      // Don't recurse into nested loops or switches - their breaks don't affect us
      if (ts.isForStatement(child) || ts.isWhileStatement(child) || 
          ts.isDoStatement(child) || ts.isSwitchStatement(child)) {
        return;
      }
      if (this.containsBreakStatement(child)) {
        hasBreak = true;
      }
    });
    
    return hasBreak;
  }

  private generateSwitchStatement(statement: ts.SwitchStatement): void {
    const expr = this.generateExpression(statement.expression);
    
    this.emit(`match ${expr} {`);
    this.indent();
    
    for (const clause of statement.caseBlock.clauses) {
      const hasConditionalBreak = clause.statements.some(stmt => 
        !ts.isBreakStatement(stmt) && this.containsBreakStatement(stmt)
      );
      
      if (ts.isCaseClause(clause)) {
        const pattern = this.generateExpression(clause.expression);
        this.emit(`${pattern} => {`);
        this.indent();
        
        if (hasConditionalBreak) {
          // Wrap in closure to support early return for conditional breaks
          this.emit('(|| {');
          this.indent();
          this.inSwitchCaseClosure = true;
        }
        
        for (const stmt of clause.statements) {
          if (ts.isBreakStatement(stmt)) {
            if (hasConditionalBreak) {
              // This should never happen at top level when hasConditionalBreak is true
              // but keep for safety
              this.emit('return;');
            }
            // Otherwise skip - match arms don't need trailing breaks
          } else {
            this.generateStatement(stmt);
          }
        }
        
        if (hasConditionalBreak) {
          this.inSwitchCaseClosure = false;
          this.dedent();
          this.emit('})();');
        }
        
        this.dedent();
        this.emit('},');
      } else if (ts.isDefaultClause(clause)) {
        this.emit('_ => {');
        this.indent();
        
        if (hasConditionalBreak) {
          // Wrap in closure to support early return for conditional breaks
          this.emit('(|| {');
          this.indent();
          this.inSwitchCaseClosure = true;
        }
        
        for (const stmt of clause.statements) {
          if (ts.isBreakStatement(stmt)) {
            if (hasConditionalBreak) {
              this.emit('return;');
            }
            // Otherwise skip - match arms don't need trailing breaks
          } else {
            this.generateStatement(stmt);
          }
        }
        
        if (hasConditionalBreak) {
          this.inSwitchCaseClosure = false;
          this.dedent();
          this.emit('})();');
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
    
    // Clear destructuring params for new function
    this.destructuringParams = [];
    
    // Add self parameter for methods
    if (isMethod) {
      params.push(mutableSelf ? '&mut self' : '&self');
    }
    
    for (const param of parameters) {
      // Check if parameter is destructuring
      if (ts.isArrayBindingPattern(param.name) || ts.isObjectBindingPattern(param.name)) {
        // For destructuring parameters, create a temp parameter and destructure in function body
        const tempName = `_param_${Math.random().toString(36).substring(7)}`;
        const type = param.type ? this.generateType(param.type) : 'unknown';
        params.push(`${tempName}: ${type}`);
        // Store for destructuring at start of function body
        this.destructuringParams.push({
          tempName,
          pattern: param.name,
          isConst: true,  // Parameters are immutable by default
        });
      } else {
        const name = param.name.getText();
        const type = param.type ? this.generateType(param.type) : 'unknown';
        params.push(`${name}: ${type}`);
      }
    }
    
    return params.join(', ');
  }
  
  /**
   * Generate type parameters for generic functions/classes
   */
  private generateTypeParameters(typeParameters?: ts.NodeArray<ts.TypeParameterDeclaration>): string {
    if (!typeParameters || typeParameters.length === 0) {
      return '';
    }
    
    const params = typeParameters.map(tp => {
      const name = tp.name.getText();
      // Handle constraints (e.g., T extends Named)
      if (tp.constraint) {
        const constraint = tp.constraint.getText();
        // In Rust, trait bounds are specified differently
        // For now, just use the type parameter name
        // TODO: Properly translate trait bounds
        return name;
      }
      return name;
    });
    
    return `<${params.join(', ')}>`;
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
    } else if (typeName === 'Promise' && type.typeArguments && type.typeArguments.length > 0) {
      // Promise<T> becomes the inner type T in async context
      // The async keyword on the function handles the future wrapper
      this.hasAsync = true;
      return this.generateType(type.typeArguments[0]);
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
  private generateExpression(expr: ts.Expression, useIntegerLiterals = false): string {
    if (ts.isNumericLiteral(expr)) {
      const text = expr.getText();
      // Add .0 if it's an integer literal (for f64 compatibility)
      // Unless we're in an integer context (comparing with integer loop variables)
      if (!text.includes('.') && !text.includes('e') && !text.includes('E')) {
        return useIntegerLiterals ? text : text + '.0';
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
    } else if (ts.isAwaitExpression(expr)) {
      return this.generateAwaitExpression(expr);
    } else {
      return `/* TODO: ${ts.SyntaxKind[expr.kind]} */`;
    }
  }
  
  /**
   * Generate await expression
   */
  private generateAwaitExpression(expr: ts.AwaitExpression): string {
    this.hasAsync = true;
    const inner = this.generateExpression(expr.expression);
    return `${inner}.await`;
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
    
    // Check if arrow function is async
    const isAsync = func.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword);
    if (isAsync) {
      this.hasAsync = true;
    }
    const asyncModifier = isAsync ? 'async ' : '';
    
    if (ts.isBlock(func.body)) {
      // Multi-line function - we need to capture the body statements separately
      // Save current output state
      const savedOutput = this.output;
      this.output = [];
      
      this.indent();
      
      // Generate destructuring for destructuring parameters
      for (const destructParam of this.destructuringParams) {
        this.generateDestructuringFromPattern(
          destructParam.pattern,
          destructParam.tempName,
          destructParam.isConst
        );
      }
      
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
        return `${asyncModifier}|${params}| -> ${resultType} { Ok(()) }`;
      } else {
        const bodyCode = bodyLines.join('\n');
        return `${asyncModifier}|${params}| -> ${resultType} {\n${bodyCode}\n${this.INDENT.repeat(this.indentLevel)}}`;
      }
    } else {
      // Single expression - wrap in Ok()
      const body = this.generateExpression(func.body);
      return `${asyncModifier}|${params}| -> ${resultType} { Ok(${body}) }`;
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
    
    // Check if we're comparing with an integer variable
    const useIntegerLiterals = this.shouldUseIntegerLiterals(expr);
    
    const left = this.generateExpression(expr.left, useIntegerLiterals);
    const right = this.generateExpression(expr.right, useIntegerLiterals);
    
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
   * Check if a binary expression should use integer literals
   */
  private shouldUseIntegerLiterals(expr: ts.BinaryExpression): boolean {
    // Check if either operand is an integer variable
    if (ts.isIdentifier(expr.left) && this.integerVariables.has(expr.left.getText())) {
      return true;
    }
    if (ts.isIdentifier(expr.right) && this.integerVariables.has(expr.right.getText())) {
      return true;
    }
    return false;
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
        const args = expr.arguments.map(arg => {
          let argExpr = this.generateExpression(arg);
          // If the argument is an identifier that we know is an Option type,
          // unwrap it (assumes it's been null-checked beforehand)
          if (ts.isIdentifier(arg)) {
            const varName = arg.getText();
            if (this.optionVariables.has(varName)) {
              argExpr = `${argExpr}.unwrap()`;
            }
          }
          return argExpr;
        });
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
      } else if (property === 'join') {
        return this.generateArrayJoin(objectExpr, expr.arguments);
      }
    }
    
    const func = this.generateExpression(expr.expression);
    
    // Handle function arguments, including spread
    const args = expr.arguments.map(arg => {
      if (ts.isSpreadElement(arg)) {
        // Spread in function call: sum(...args) -> sum(args)
        // In Rust, we just pass the Vec directly
        return this.generateExpression(arg.expression);
      } else {
        return this.generateExpression(arg);
      }
    }).join(', ');
    
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
   * Generate array.join() -> iter().map(ToString).collect::<Vec<_>>().join()
   * JavaScript: arr.join(',') becomes
   * Rust: arr.iter().map(|x| x.to_string()).collect::<Vec<_>>().join(",")
   */
  private generateArrayJoin(array: ts.Expression, args: readonly ts.Expression[]): string {
    const arrayCode = this.generateExpression(array);
    
    // Default separator is comma
    let separator = '","';
    if (args.length > 0) {
      // For string literals, extract the inner value
      if (ts.isStringLiteral(args[0])) {
        const text = args[0].text;
        separator = `"${text}"`;
      } else {
        // For expressions, use as-is but convert String::from(...) to &str
        const sepExpr = this.generateExpression(args[0]);
        separator = sepExpr.replace(/^String::from\("(.*)"\)$/, '"$1"');
      }
    }
    
    return `${arrayCode}.iter().map(|x| x.to_string()).collect::<Vec<_>>().join(${separator})`;
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
    
    // Map JavaScript property names to Rust equivalents
    if (property === 'length') {
      // array.length -> vec.len() as f64 (for comparison with f64 loop variables)
      return `${object}.len() as f64`;
    }
    
    return `${object}.${property}`;
  }
  
  /**
   * Get the type of a property in an object literal from the contextual type
   */
  private getPropertyType(expr: ts.ObjectLiteralExpression, propertyName: string): ts.Type | undefined {
    if (!this.checker) {
      return undefined;
    }
    
    const contextualType = this.checker.getContextualType(expr);
    if (!contextualType) {
      return undefined;
    }
    
    const property = contextualType.getProperty(propertyName);
    if (!property) {
      return undefined;
    }
    
    return this.checker.getTypeOfSymbolAtLocation(property, expr);
  }
  
  /**
   * Generate expression with a type hint for nested object literals
   */
  private generateExpressionWithTypeHint(expr: ts.Expression, expectedType: ts.Type | undefined): string {
    // If the expression is an object literal and we have a type hint, use it
    if (ts.isObjectLiteralExpression(expr) && expectedType && expectedType.symbol) {
      const structName = expectedType.symbol.name;
      return this.generateObjectLiteralWithType(expr, structName);
    }
    
    // Otherwise, generate normally
    return this.generateExpression(expr);
  }
  
  /**
   * Generate object literal
   */
  private generateObjectLiteral(expr: ts.ObjectLiteralExpression): string {
    // Try to infer the expected type from context using the type checker
    let structName: string | undefined;
    
    if (this.checker) {
      const contextualType = this.checker.getContextualType(expr);
      if (contextualType && contextualType.symbol) {
        structName = contextualType.symbol.name;
      }
    }
    
    // If we have a struct name, use the typed version
    if (structName) {
      return this.generateObjectLiteralWithType(expr, structName);
    }
    
    // Otherwise, generate anonymous struct
    // Check for spread assignments
    const hasSpread = expr.properties.some(prop => ts.isSpreadAssignment(prop));
    
    if (hasSpread) {
      // For spread, we need to create a new object and merge properties
      // In Rust, use struct update syntax: MyStruct { field: value, ..other }
      // NOTE: ..spread MUST come last in Rust
      const normalProps: string[] = [];
      const spreadProps: string[] = [];
      
      for (const prop of expr.properties) {
        if (ts.isSpreadAssignment(prop)) {
          const spreadExpr = this.generateExpression(prop.expression);
          spreadProps.push(`..${spreadExpr}`);
        } else if (ts.isPropertyAssignment(prop)) {
          const name = prop.name.getText();
          const value = this.generateExpressionWithTypeHint(prop.initializer, this.getPropertyType(expr, name));
          normalProps.push(`${name}: ${value}`);
        } else if (ts.isShorthandPropertyAssignment(prop)) {
          const name = prop.name.getText();
          normalProps.push(`${name}: ${name}`);
        }
      }
      
      const allParts = [...normalProps, ...spreadProps];
      return `{ ${allParts.join(', ')} }`;
    } else {
      const properties = expr.properties.map(prop => {
        if (ts.isPropertyAssignment(prop)) {
          const name = prop.name.getText();
          const value = this.generateExpressionWithTypeHint(prop.initializer, this.getPropertyType(expr, name));
          return `${name}: ${value}`;
        } else if (ts.isShorthandPropertyAssignment(prop)) {
          const name = prop.name.getText();
          return `${name}: ${name}`;
        }
        return '';
      }).filter(p => p !== '').join(', ');
      
      return `{ ${properties} }`;
    }
  }

  /**
   * Generate object literal with explicit struct type name
   */
  private generateObjectLiteralWithType(expr: ts.ObjectLiteralExpression, structName: string): string {
    // Check for spread assignments
    const hasSpread = expr.properties.some(prop => ts.isSpreadAssignment(prop));
    
    if (hasSpread) {
      // NOTE: ..spread MUST come last in Rust
      const normalProps: string[] = [];
      const spreadProps: string[] = [];
      
      for (const prop of expr.properties) {
        if (ts.isSpreadAssignment(prop)) {
          const spreadExpr = this.generateExpression(prop.expression);
          spreadProps.push(`..${spreadExpr}`);
        } else if (ts.isPropertyAssignment(prop)) {
          const name = prop.name.getText();
          const value = this.generateExpression(prop.initializer);
          normalProps.push(`${name}: ${value}`);
        } else if (ts.isShorthandPropertyAssignment(prop)) {
          const name = prop.name.getText();
          normalProps.push(`${name}: ${name}`);
        }
      }
      
      const allParts = [...normalProps, ...spreadProps];
      return `${structName} { ${allParts.join(', ')} }`;
    } else {
      const properties = expr.properties.map(prop => {
        if (ts.isPropertyAssignment(prop)) {
          const name = prop.name.getText();
          const value = this.generateExpression(prop.initializer);
          return `${name}: ${value}`;
        } else if (ts.isShorthandPropertyAssignment(prop)) {
          const name = prop.name.getText();
          return `${name}: ${name}`;
        }
        return '';
      }).filter(p => p !== '').join(', ');
      
      return `${structName} { ${properties} }`;
    }
  }
  
  /**
   * Generate array literal
   */
  private generateArrayLiteral(expr: ts.ArrayLiteralExpression): string {
    // Check if any elements are spread expressions
    const hasSpread = expr.elements.some(elem => ts.isSpreadElement(elem));
    
    if (hasSpread) {
      // Use iterator chaining for spread elements
      const parts: string[] = [];
      
      for (const elem of expr.elements) {
        if (ts.isSpreadElement(elem)) {
          const spread = this.generateExpression(elem.expression);
          parts.push(`${spread}.iter().copied()`);
        } else {
          const val = this.generateExpression(elem);
          parts.push(`std::iter::once(${val})`);
        }
      }
      
      if (parts.length === 1) {
        return `${parts[0]}.collect::<Vec<_>>()`;
      } else {
        // Chain iterators: iter1.chain(iter2).chain(iter3).collect()
        return `${parts[0]}${parts.slice(1).map(p => `.chain(${p})`).join('')}.collect::<Vec<_>>()`;
      }
    } else {
      const elements = expr.elements.map(elem => this.generateExpression(elem)).join(', ');
      return `vec![${elements}]`;
    }
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
      const text = expr.text;
      return `String::from("${text}")`;
    }
    
    // Template literal with substitutions: `head${expr1}mid${expr2}tail`
    // Build format string and collect expressions
    let formatStr = expr.head.text;
    const expressions: string[] = [];
    
    for (const span of expr.templateSpans) {
      // Add placeholder for this expression
      formatStr += '{}';
      expressions.push(this.generateExpression(span.expression));
      
      // Add the literal text after the expression
      formatStr += span.literal.text;
    }
    
    if (expressions.length === 0) {
      return `String::from("${formatStr}")`;
    } else {
      return `format!("${formatStr}", ${expressions.join(', ')})`;
    }
  }
  
  /**
   * Generate try/catch statement as Result pattern matching
   */
  private generateTryStatement(statement: ts.TryStatement): void {
    // In Rust, we'll convert try/catch to a closure that returns Result
    // and then match on it
    // Use a unique variable name to avoid shadowing
    const tryResultVar = `try_result_${Math.random().toString(36).substr(2, 9)}`;
    this.emit(`let ${tryResultVar} = (|| -> Result<(), String> {`);
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
    
    // Generate catch block with finally support
    if (statement.catchClause) {
      this.emit(`match ${tryResultVar} {`);
      this.indent();
      
      // Ok branch
      this.emit('Ok(_) => {');
      this.indent();
      if (statement.finallyBlock) {
        for (const stmt of statement.finallyBlock.statements) {
          this.generateStatement(stmt);
        }
      }
      this.dedent();
      this.emit('},');
      
      // Error branch
      const errorVar = statement.catchClause.variableDeclaration?.name.getText() || 'e';
      this.emit(`Err(${errorVar}) => {`);
      this.indent();
      
      if (statement.catchClause.block) {
        for (const stmt of statement.catchClause.block.statements) {
          this.generateStatement(stmt);
        }
      }
      
      if (statement.finallyBlock) {
        for (const stmt of statement.finallyBlock.statements) {
          this.generateStatement(stmt);
        }
      }
      
      this.dedent();
      this.emit('}');
      this.dedent();
      this.emit('}');
    } else if (statement.finallyBlock) {
      // No catch block, just finally - execute it after the try
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
    // If we're inside a switch case closure, use return instead
    if (this.inSwitchCaseClosure) {
      this.emit('return;');
      return;
    }
    
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
    
    // If the labeled statement is a loop (for, while, do-while), label it directly
    if (ts.isForStatement(statement.statement) ||
        ts.isForOfStatement(statement.statement) ||
        ts.isWhileStatement(statement.statement) ||
        ts.isDoStatement(statement.statement)) {
      // Save and set the label for this loop
      const savedLabel = this.currentLabel;
      this.currentLabel = label;
      this.generateStatement(statement.statement);
      this.currentLabel = savedLabel;
    } else {
      // For other statements, wrap in a labeled loop
      this.emit(`'${label}: loop {`);
      this.indent();
      this.generateStatement(statement.statement);
      this.emit('break;');  // Exit the loop after one iteration unless broken earlier
      this.dedent();
      this.emit('}');
    }
  }
  
  /**
   * Generate element access expression (array/object indexing)
   */
  private generateElementAccess(expr: ts.ElementAccessExpression): string {
    const object = this.generateExpression(expr.expression);
    
    // Check if index is a string (for HashMap/map access)
    if (ts.isStringLiteral(expr.argumentExpression)) {
      const index = this.generateExpression(expr.argumentExpression);
      return `${object}[&${index}]`;
    }
    
    // For string identifiers (like 'key' parameter), use reference
    // This is a heuristic - ideally we'd use type checking
    if (ts.isIdentifier(expr.argumentExpression)) {
      const varName = expr.argumentExpression.getText();
      // Check if this looks like a string variable (simple heuristic)
      // In the future, use actual type information
      const index = this.generateExpression(expr.argumentExpression);
      
      // If it's clearly numeric context (in integerVariables), use usize
      if (this.integerVariables.has(varName)) {
        return `${object}[${index}]`;
      }
      
      // Default: assume it might be f64, cast to usize for array indexing
      // Note: This won't work for HashMap, but we don't support those yet
      return `${object}[${index} as usize]`;
    }
    
    // Numeric literal - use as integer
    if (ts.isNumericLiteral(expr.argumentExpression)) {
      const index = this.generateExpression(expr.argumentExpression, true);
      return `${object}[${index}]`;
    }
    
    // Complex expression - cast to usize
    const index = this.generateExpression(expr.argumentExpression);
    return `${object}[${index} as usize]`;
  }

  /**
   * Get default value for a Rust type
   */
  private getDefaultValue(rustType: string): string {
    switch (rustType) {
      case 'f64':
      case 'i32':
      case 'i64':
      case 'u32':
      case 'u64':
        return '0.0';
      case 'bool':
        return 'false';
      case 'String':
        return 'String::new()';
      case '()':
        return '()';
      default:
        // For complex types like Vec, Box, Rc, Option
        if (rustType.startsWith('Vec<')) {
          return 'vec![]';
        } else if (rustType.startsWith('Box<')) {
          const inner = rustType.slice(4, -1);
          return `Box::new(${this.getDefaultValue(inner)})`;
        } else if (rustType.startsWith('Rc<')) {
          const inner = rustType.slice(3, -1);
          return `Rc::new(${this.getDefaultValue(inner)})`;
        } else if (rustType.startsWith('Option<')) {
          return 'None';
        } else if (rustType.startsWith('Weak<')) {
          return 'Weak::new()';
        }
        // Default to a comment indicating manual initialization needed
        return `/* TODO: initialize ${rustType} */`;
    }
  }
}
