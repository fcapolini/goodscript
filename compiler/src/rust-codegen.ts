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

/**
 * Rust reserved keywords that need to be escaped when used as identifiers
 * Source: https://doc.rust-lang.org/reference/keywords.html
 */
const RUST_KEYWORDS = new Set([
  // Strict keywords (cannot be used as identifiers)
  'as', 'break', 'const', 'continue', 'crate', 'else', 'enum', 'extern',
  'false', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop', 'match', 'mod',
  'move', 'mut', 'pub', 'ref', 'return', 'self', 'Self', 'static', 'struct',
  'super', 'trait', 'true', 'type', 'unsafe', 'use', 'where', 'while',
  // Keywords reserved for future use
  'abstract', 'become', 'box', 'do', 'final', 'macro', 'override', 'priv',
  'typeof', 'unsized', 'virtual', 'yield',
  // Keywords reserved in certain contexts (2018+ edition)
  'async', 'await', 'dyn', 'try',
]);

export class RustCodegen {
  private indentLevel = 0;
  private readonly INDENT = '    '; // 4 spaces
  private output: string[] = [];
  private imports = new Set<string>();
  private optionVariables = new Set<string>();  // Track variables with Option<T> type
  private unwrappedOptions = new Set<string>();  // Track Option variables that are unwrapped in current scope (after is_some check)
  private integerVariables = new Set<string>();  // Track variables with integer type (from for loops)
  private inSwitchCaseClosure = false;  // Track if we're inside a switch case closure (for break handling)
  private currentLabel?: string;  // Track current label for labeled loops
  private hasAsync = false;  // Track if we need tokio imports
  private destructuringParams: Array<{tempName: string, pattern: ts.BindingName, isConst: boolean}> = [];  // Track destructuring parameters
  private defaultExportedNames = new Set<string>();  // Track names that are default-exported
  private checker?: ts.TypeChecker;  // Optional type checker for type inference
  private inGenericFunction = false;  // Track if we're inside a generic function with trait bounds
  private genericParameterNames = new Set<string>();  // Track generic parameter names in current scope
  private recursiveFunctions = new Set<string>();  // Track which functions are recursive (direct or indirect)
  private currentRecursiveFunctionName?: string;  // Track current recursive function we're generating body for
  private refCellVariables = new Set<string>();  // Track variables wrapped in Rc<RefCell<>> for shared mutability
  private structMethods = new Set<string>();  // Track method names when generating struct-based functions
  private structFields = new Set<string>();  // Track field names when generating struct-based methods
  private inStructWrapper = false;  // Track if we're inside the wrapper function of a struct
  private inStructMethod = false;  // Track if we're inside a struct method
  private currentFunctionReturnType?: string;  // Track current function's return type for Option wrapping
  private inConstructorBody = false;  // Track if we're generating constructor body statements
  // Track interface traits and their required fields for automatic trait implementation
  private interfaceTraits = new Map<string, Array<{name: string, type: string}>>();  // Maps TraitName -> [{fieldName, fieldType}]
  private syntheticTypeCounter = 0;  // Counter for generating unique synthetic type names
  
  // Synthetic nominal types for structural typing
  private syntheticTypes = new Map<string, {
    name: string;
    fields: Array<{ name: string; type: string }>;
    traits: Set<string>;  // Traits this type should implement
  }>();
  private syntheticTypeDeclarations: string[] = [];  // Generated struct + impl code
  
  // Class inheritance tracking
  private classes = new Map<string, {
    fields: Array<{ name: string; type: string; initializer?: string }>;
    methods: Array<{ name: string; method: ts.MethodDeclaration }>;
    staticMethods: Array<{ name: string; method: ts.MethodDeclaration }>;
    constructor?: ts.ConstructorDeclaration;
    baseClass?: string;
  }>();
  
  constructor(checker?: ts.TypeChecker) {
    this.checker = checker;
  }
  
  /**
   * Escape identifier if it collides with a Rust keyword
   * Uses raw identifier syntax (r#keyword) for reserved words
   */
  private escapeIdentifier(name: string): string {
    // Special case: 'self' and 'Self' are handled separately in context
    if (name === 'self' || name === 'Self') {
      return name;
    }
    
    // If it's a Rust keyword, use raw identifier syntax
    if (RUST_KEYWORDS.has(name)) {
      return `r#${name}`;
    }
    
    return name;
  }
  
  /**
   * Escape a string for use in Rust string literals
   */
  private escapeRustString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')   // Backslash must be first
      .replace(/"/g, '\\"')      // Double quotes
      .replace(/\n/g, '\\n')     // Newline
      .replace(/\r/g, '\\r')     // Carriage return
      .replace(/\t/g, '\\t')     // Tab
      .replace(/\0/g, '\\0');    // Null character
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
   * Check if a node contains the ? operator (error propagation in Rust)
   * This is used to determine if a constructor needs to return Result<Self, String>
   */
  private containsQuestionMark(node: ts.Node): boolean {
    // In our generated Rust code, ? operator comes from:
    // 1. Call expressions that might fail
    // 2. Awaits
    // 3. Other Result-returning operations
    // We detect this by checking if there are any call expressions
    // (since all functions return Result in our codegen)
    
    let found = false;
    
    const visit = (node: ts.Node) => {
      if (found) return;
      
      // Call expressions generate code with ? operator
      if (ts.isCallExpression(node)) {
        // Skip console.log and toString() which don't use ?
        if (ts.isPropertyAccessExpression(node.expression)) {
          const obj = node.expression.expression;
          const method = node.expression.name.getText();
          
          if ((ts.isIdentifier(obj) && obj.text === 'console' && method === 'log') ||
              method === 'toString' || method === 'push' || method === 'set') {
            // These don't use ?, continue searching
          } else {
            found = true;
            return;
          }
        } else {
          // Regular function call - uses ?
          found = true;
          return;
        }
      }
      
      // Await expressions use ?
      if (ts.isAwaitExpression(node)) {
        found = true;
        return;
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(node);
    return found;
  }
  
  /**
   * Check if all code paths in a block definitely return
   * This is more precise than containsReturnStatement
   */
  private allPathsReturn(block: ts.Block): boolean {
    if (block.statements.length === 0) {
      return false;
    }
    
    const lastStatement = block.statements[block.statements.length - 1];
    
    // If last statement is a return, we definitely return
    if (ts.isReturnStatement(lastStatement)) {
      return true;
    }
    
    // If last statement is if/else, check if both branches return
    if (ts.isIfStatement(lastStatement) && lastStatement.elseStatement) {
      const thenReturns = ts.isBlock(lastStatement.thenStatement)
        ? this.allPathsReturn(lastStatement.thenStatement)
        : ts.isReturnStatement(lastStatement.thenStatement);
      
      // For else branch, need to handle both block and if-else chains
      let elseReturns = false;
      if (ts.isBlock(lastStatement.elseStatement)) {
        elseReturns = this.allPathsReturn(lastStatement.elseStatement);
      } else if (ts.isReturnStatement(lastStatement.elseStatement)) {
        elseReturns = true;
      } else if (ts.isIfStatement(lastStatement.elseStatement)) {
        // Recursively check nested if statement
        const syntheticBlock: ts.Block = {
          kind: ts.SyntaxKind.Block,
          statements: ts.factory.createNodeArray([lastStatement.elseStatement]),
        } as any;
        elseReturns = this.allPathsReturn(syntheticBlock);
      }
      
      return thenReturns && elseReturns;
    }
    
    // Otherwise, we don't definitely return
    return false;
  }
  
  /**
   * Check if a function calls itself (is recursive)
   * @param func The function to check
   * @param functionName The name of the function variable
   */
  private isRecursiveFunction(func: ts.ArrowFunction | ts.FunctionDeclaration, functionName: string): boolean {
    let hasRecursiveCall = false;
    
    const visit = (node: ts.Node): void => {
      // Check if this is a call to the function itself
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        if (node.expression.text === functionName) {
          hasRecursiveCall = true;
        }
      }
      
      // Don't recurse into nested function declarations/expressions
      if (node !== func && (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node))) {
        return;
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(func);
    return hasRecursiveCall;
  }
  
  /**
   * Build a call graph for all arrow functions in a block to detect mutual recursion
   * Returns a map of function names to the set of functions they call
   */
  private buildCallGraph(statements: readonly ts.Statement[]): Map<string, Set<string>> {
    const callGraph = new Map<string, Set<string>>();
    const arrowFunctions = new Map<string, ts.ArrowFunction>();
    
    // First pass: collect all arrow function declarations
    for (const statement of statements) {
      if (ts.isVariableStatement(statement)) {
        for (const decl of statement.declarationList.declarations) {
          if (ts.isIdentifier(decl.name) && decl.initializer && ts.isArrowFunction(decl.initializer)) {
            const name = decl.name.text;
            arrowFunctions.set(name, decl.initializer);
            callGraph.set(name, new Set());
          }
        }
      }
    }
    
    // Second pass: analyze calls in each function
    for (const [funcName, func] of arrowFunctions) {
      const calls = callGraph.get(funcName)!;
      
      const visit = (node: ts.Node): void => {
        // Check if this is a call to another function in our scope
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
          const calledName = node.expression.text;
          if (arrowFunctions.has(calledName)) {
            calls.add(calledName);
          }
        }
        
        // Don't recurse into nested function declarations
        if (node !== func && (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node))) {
          return;
        }
        
        ts.forEachChild(node, visit);
      };
      
      visit(func);
    }
    
    return callGraph;
  }
  
  /**
   * Find all functions involved in recursive cycles (direct or indirect)
   * Uses depth-first search to detect cycles in the call graph
   */
  private findRecursiveFunctions(callGraph: Map<string, Set<string>>): Set<string> {
    const recursive = new Set<string>();
    const visiting = new Set<string>();
    const visited = new Set<string>();
    
    const dfs = (funcName: string): boolean => {
      if (visited.has(funcName)) {
        return false;
      }
      
      if (visiting.has(funcName)) {
        // Found a cycle - all functions in the current path are recursive
        return true;
      }
      
      visiting.add(funcName);
      
      const calls = callGraph.get(funcName);
      if (calls) {
        for (const calledFunc of calls) {
          if (dfs(calledFunc)) {
            // Mark this function as recursive
            recursive.add(funcName);
            recursive.add(calledFunc);
          }
        }
      }
      
      visiting.delete(funcName);
      visited.add(funcName);
      
      return recursive.has(funcName);
    };
    
    // Check each function
    for (const funcName of callGraph.keys()) {
      dfs(funcName);
    }
    
    return recursive;
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
    this.syntheticTypes = new Map();
    this.syntheticTypeDeclarations = [];
    this.interfaceTraits = new Map();
    this.syntheticTypeCounter = 0;
    this.classes = new Map();
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
    
    // Add synthetic type declarations
    if (this.syntheticTypeDeclarations.length > 0) {
      lines.push(...this.syntheticTypeDeclarations);
      lines.push(''); // Blank line after synthetic types
    }
    
    // Add generated code
    lines.push(...this.output);
    
    // Post-process to fix Option unwrapping in if blocks
    const result = lines.join('\n');
    return this.postProcessOptionUnwrapping(result);
  }
  
  /**
   * Post-process generated Rust code to add .unwrap() where needed
   * 
   * Pattern: After "if value.is_some() {", any use of "value" as an argument
   * should be "value.unwrap()"
   */
  private postProcessOptionUnwrapping(code: string): string {
    const codeLines = code.split('\n');
    const result: string[] = [];
    
    for (let i = 0; i < codeLines.length; i++) {
      let line = codeLines[i];
      
      // Check if this line has an is_some() check
      const isSomeMatch = line.match(/if\s+(\w+)\.is_some\(\)/);
      if (isSomeMatch) {
        const varName = isSomeMatch[1];
        
        // Add current line
        result.push(line);
        i++;
        
        // Process lines until we hit the closing brace
        let braceDepth = 1;
        while (i < codeLines.length && braceDepth > 0) {
          line = codeLines[i];
          
          // Count braces to track nesting  
          for (const char of line) {
            if (char === '{') braceDepth++;
            if (char === '}') braceDepth--;
          }
          
          // Exit early if we've closed all braces
          if (braceDepth <= 0) {
            result.push(line);
            i++;
            break;
          }
          
          // Replace uses of the variable as an argument with .unwrap()
          // Match varName when it's NOT followed by a dot (which would be a method call)
          // and IS followed by ) or , or ;
          const regex = new RegExp(`\\b(${varName})(?!\\.)([,;\\)])`, 'g');
          line = line.replace(regex, `${varName}.unwrap()$2`);
          
          result.push(line);
          i++;
        }
        i--; // Back up one since the for loop will increment
      } else {
        result.push(line);
      }
    }
    
    return result.join('\n');
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
   * Detect if a statement or expression contains async code
   */
  private detectAsync(node: ts.Node): void {
    // Check for async modifier on functions/arrow functions
    if ('modifiers' in node) {
      const modifiers = (node as any).modifiers;
      if (Array.isArray(modifiers)) {
        if (modifiers.some((m: ts.Modifier) => m.kind === ts.SyntaxKind.AsyncKeyword)) {
          this.hasAsync = true;
          return;
        }
      }
    }
    
    // Check for await expressions
    if (ts.isAwaitExpression(node)) {
      this.hasAsync = true;
      return;
    }
    
    // Check for .then() calls (Promise chains)
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      if (node.expression.name.getText() === 'then') {
        this.hasAsync = true;
        return;
      }
    }
    
    // Recursively check children
    node.forEachChild(child => {
      if (!this.hasAsync) {  // Short-circuit once we know we have async
        this.detectAsync(child);
      }
    });
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
    const importDecls: ts.Statement[] = [];
    const defaultExportedFunctions: Array<{name: string, func: ts.ArrowFunction, typeParams?: ts.NodeArray<ts.TypeParameterDeclaration>}> = [];
    const genericFunctions: Array<{name: string, func: ts.ArrowFunction, typeParams: ts.NodeArray<ts.TypeParameterDeclaration>}> = [];
    
    for (const statement of sourceFile.statements) {
      // Handle import declarations separately
      if (ts.isImportDeclaration(statement)) {
        importDecls.push(statement);
        continue;
      }
      
      // Handle re-export declarations (export from)
      if (ts.isExportDeclaration(statement) && statement.moduleSpecifier) {
        importDecls.push(statement);  // Treat export-from similar to imports
        continue;
      }
      
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
    
    // First emit user import declarations (module dependencies)
    for (const statement of importDecls) {
      this.generateStatement(statement);
    }
    if (importDecls.length > 0) {
      this.emit('');  // Blank line after imports
    }
    
    // Then emit exported declarations with pub visibility
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
    
    // Pre-pass: Register all classes for inheritance processing
    for (const statement of typeDecls) {
      if (ts.isClassDeclaration(statement)) {
        this.registerClass(statement);
      }
    }
    for (const statement of exportedDecls) {
      if (ts.isClassDeclaration(statement)) {
        this.registerClass(statement);
      }
    }
    
    // Then emit type declarations (classes, interfaces, type aliases)
    for (const statement of typeDecls) {
      this.generateStatement(statement);
    }
    
    // Then wrap top-level variable declarations in a main function with root error handler
    if (topLevelDecls.length > 0) {
      // Pre-pass: Detect if we have async code
      for (const statement of topLevelDecls) {
        this.detectAsync(statement);
      }
      
      // Add #[tokio::main] attribute if we have async code
      if (this.hasAsync) {
        this.emit('#[tokio::main]');
      }
      
      // Make main async if we have async code
      if (this.hasAsync) {
        this.emit('async fn main() {');
      } else {
        this.emit('pub fn main() {');
      }
      this.indent();
      
      // Wrap all code in a Result-returning closure for root error handling
      // Make closure async if we have async code
      if (this.hasAsync) {
        this.emit('let result = (async || -> Result<(), String> {');
      } else {
        this.emit('let result = (|| -> Result<(), String> {');
      }
      this.indent();
      
      for (const statement of topLevelDecls) {
        this.generateStatement(statement);
      }
      
      this.emit('Ok(())');
      this.dedent();
      if (this.hasAsync) {
        this.emit('})().await;');
      } else {
        this.emit('})();');
      }
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
    } else if (ts.isImportDeclaration(statement)) {
      this.generateImportDeclaration(statement);
    } else if (ts.isExportDeclaration(statement)) {
      this.generateExportDeclaration(statement);
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
          const name = this.escapeIdentifier(decl.name.getText());
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
      
      const definitelyReturns = this.allPathsReturn(func.body);
      if (!definitelyReturns) {
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
    
    // Track that we're in a generic function with trait bounds
    const wasInGenericFunction = this.inGenericFunction;
    const hasTraitBounds = typeParams.some(tp => tp.constraint);
    if (hasTraitBounds) {
      this.inGenericFunction = true;
      // Track parameter names so we know which identifiers are generic
      for (const tp of typeParams) {
        this.genericParameterNames.add(tp.name.getText());
      }
    }
    
    this.emit(`${asyncModifier}fn ${name}${genericParams}(${params}) -> ${resultType} {`);
    this.indent();
    
    if (ts.isBlock(func.body)) {
      for (const statement of func.body.statements) {
        this.generateStatement(statement);
      }
      
      const definitelyReturns = this.allPathsReturn(func.body);
      if (!definitelyReturns) {
        this.emit('Ok(())');
      }
    } else {
      const body = this.generateExpression(func.body);
      this.emit(`Ok(${body})`);
    }
    
    this.dedent();
    this.emit('}');
    this.emit('');
    
    // Restore state
    this.inGenericFunction = wasInGenericFunction;
    if (hasTraitBounds) {
      for (const tp of typeParams) {
        this.genericParameterNames.delete(tp.name.getText());
      }
    }
  }
  
  /**
   * Convert TypeScript module path to Rust module path
   * './math' -> 'crate::math'
   * '../utils' -> 'super::utils'
   * '../../lib' -> 'super::super::lib'
   */
  private convertModulePath(modulePath: string): string {
    let rustModulePath = modulePath;
    
    if (rustModulePath.startsWith('./')) {
      // Same directory: './math' -> 'crate::math'
      rustModulePath = 'crate::' + rustModulePath.substring(2).replace(/\//g, '::');
    } else if (rustModulePath.startsWith('../')) {
      // Parent directory: '../utils' -> 'super::utils'
      const parts = rustModulePath.split('/');
      let superCount = 0;
      let pathParts: string[] = [];
      
      for (const part of parts) {
        if (part === '..') {
          superCount++;
        } else if (part !== '.') {
          pathParts.push(part);
        }
      }
      
      const superPrefix = Array(superCount).fill('super').join('::');
      rustModulePath = superPrefix + (pathParts.length > 0 ? '::' + pathParts.join('::') : '');
    } else {
      // External crate or absolute path
      rustModulePath = rustModulePath.replace(/\//g, '::').replace(/@/g, '');
    }
    
    // Remove file extensions
    rustModulePath = rustModulePath.replace(/\.(ts|js|gs)$/, '');
    
    return rustModulePath;
  }
  
  /**
   * Generate import declaration
   * Converts TypeScript/ES6 imports to Rust use statements
   */
  private generateImportDeclaration(statement: ts.ImportDeclaration): void {
    const moduleSpecifier = statement.moduleSpecifier;
    
    // Get the module path (remove quotes)
    if (!ts.isStringLiteral(moduleSpecifier)) {
      this.emit('// TODO: Dynamic import not supported');
      return;
    }
    
    const modulePath = moduleSpecifier.text;
    
    // Convert TypeScript module path to Rust module path
    const rustModulePath = this.convertModulePath(modulePath);
    
    if (!statement.importClause) {
      // Side-effect import: import './module'
      this.emit(`// use ${rustModulePath}; // side-effect import`);
      return;
    }
    
    const importClause = statement.importClause;
    const imports: string[] = [];
    
    // Handle default import: import Foo from './foo'
    if (importClause.name) {
      const defaultName = importClause.name.getText();
      imports.push(defaultName);
    }
    
    // Handle named imports: import { a, b } from './foo'
    if (importClause.namedBindings) {
      if (ts.isNamedImports(importClause.namedBindings)) {
        for (const element of importClause.namedBindings.elements) {
          const name = element.name.getText();
          const propertyName = element.propertyName?.getText();
          
          if (propertyName) {
            // import { foo as bar } -> use module::foo as bar
            imports.push(`${propertyName} as ${name}`);
          } else {
            imports.push(name);
          }
        }
      } else if (ts.isNamespaceImport(importClause.namedBindings)) {
        // import * as Foo from './foo'
        const namespaceName = importClause.namedBindings.name.getText();
        this.emit(`use ${rustModulePath} as ${namespaceName};`);
        return;
      }
    }
    
    if (imports.length > 0) {
      if (imports.length === 1) {
        this.emit(`use ${rustModulePath}::${imports[0]};`);
      } else {
        this.emit(`use ${rustModulePath}::{${imports.join(', ')}};`);
      }
    }
  }
  
  /**
   * Generate export declaration (export from)
   * e.g. export { add, subtract } from './math'
   */
  private generateExportDeclaration(statement: ts.ExportDeclaration): void {
    // If there's no module specifier, this is a re-export of local declarations
    // which we don't need to handle specially in Rust
    if (!statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) {
      return;
    }
    
    const modulePath = statement.moduleSpecifier.text;
    const rustModulePath = this.convertModulePath(modulePath);
    
    // Handle export clause
    if (statement.exportClause) {
      if (ts.isNamedExports(statement.exportClause)) {
        const exports: string[] = [];
        
        for (const element of statement.exportClause.elements) {
          const name = element.name.getText();
          const propertyName = element.propertyName?.getText();
          
          if (propertyName) {
            // export { foo as bar } -> pub use module::foo as bar
            exports.push(`${propertyName} as ${name}`);
          } else {
            exports.push(name);
          }
        }
        
        if (exports.length === 1) {
          this.emit(`pub use ${rustModulePath}::${exports[0]};`);
        } else {
          this.emit(`pub use ${rustModulePath}::{${exports.join(', ')}};`);
        }
      } else if (ts.isNamespaceExport(statement.exportClause)) {
        // export * as Foo from './foo'
        const namespaceName = statement.exportClause.name.getText();
        this.emit(`pub use ${rustModulePath} as ${namespaceName};`);
      }
    } else {
      // export * from './foo'
      this.emit(`pub use ${rustModulePath}::*;`);
    }
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
        const rawName = decl.name.getText();
        const name = this.escapeIdentifier(rawName);
        
        // Check if this arrow function should become a struct with methods
        if (decl.initializer && ts.isArrowFunction(decl.initializer) && 
            this.shouldGenerateAsStruct(decl.initializer)) {
          this.generateStructWithMethods(decl.initializer, name);
          continue;  // Skip normal variable generation
        }
        
        // Check if this is a recursive arrow function - convert to local function
        if (decl.initializer && ts.isArrowFunction(decl.initializer) && this.recursiveFunctions.has(rawName)) {
          // Generate as a local function instead of a closure
          this.generateRecursiveFunction(decl.initializer, name);
          continue;  // Skip normal variable generation
        }
        
        // Detect if variable will be mutated
        const willBeMutated = this.willVariableBeMutated(rawName, statement.parent);
        
        // Make variables mutable if they're not const, OR if they're initialized with a class instance,
        // OR if they will be mutated (e.g., arr.push(), map.set())
        const needsMutable = !isConst || (decl.initializer && ts.isNewExpression(decl.initializer)) || willBeMutated;
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
            // If initializing a Vec (Array), wrap in Rc<RefCell<>> for shared mutability across closures
            // This is needed when multiple closures need to access the same mutable array
            if (ts.isNewExpression(decl.initializer) && 
                decl.initializer.expression.getText() === 'Array') {
              value = `std::rc::Rc::new(std::cell::RefCell::new(${value}))`; 
              this.refCellVariables.add(name);
            }
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
          } else if (decl.initializer && ts.isCallExpression(decl.initializer) && this.checker) {
            // Infer Option type from call expression return type
            const type = this.checker.getTypeAtLocation(decl.initializer);
            const typeStr = this.checker.typeToString(type);
            // Check for T | null | undefined pattern (which becomes Option<T> in Rust)
            // Match with or without spaces around the pipe
            if (typeStr.includes('null') || typeStr.includes('undefined')) {
              this.optionVariables.add(name);
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
      
      // Auto-add Ok(()) if function doesn't return on all paths
      const definitelyReturns = this.allPathsReturn(func.body);
      if (!definitelyReturns) {
        this.emit('Ok(())');
      }
    }
    
    this.dedent();
    this.emit('}');
    this.emit('');
  }
  
  /**
   * Collect all fields from a class and its inheritance chain
   */
  private collectAllFields(className: string): Array<{ name: string; type: string; initializer?: string }> {
    const classInfo = this.classes.get(className);
    if (!classInfo) return [];
    
    let allFields: Array<{ name: string; type: string; initializer?: string }> = [];
    
    // Recursively collect fields from base classes
    if (classInfo.baseClass) {
      allFields = this.collectAllFields(classInfo.baseClass);
    }
    
    // Add this class's own fields
    allFields.push(...classInfo.fields);
    
    return allFields;
  }
  
  /**
   * Collect all methods from a class and its inheritance chain
   */
  private collectAllMethods(className: string): Array<{ name: string; method: ts.MethodDeclaration; fromClass: string }> {
    const classInfo = this.classes.get(className);
    if (!classInfo) return [];
    
    let allMethods: Array<{ name: string; method: ts.MethodDeclaration; fromClass: string }> = [];
    
    // Recursively collect methods from base classes
    if (classInfo.baseClass) {
      allMethods = this.collectAllMethods(classInfo.baseClass);
    }
    
    // Add/override with this class's methods
    for (const methodInfo of classInfo.methods) {
      const existingIndex = allMethods.findIndex(m => m.name === methodInfo.name);
      if (existingIndex >= 0) {
        // Override base class method
        allMethods[existingIndex] = { ...methodInfo, fromClass: className };
      } else {
        // Add new method
        allMethods.push({ ...methodInfo, fromClass: className });
      }
    }
    
    return allMethods;
  }
  
  /**
   * Register class information for inheritance processing
   */
  private registerClass(classDecl: ts.ClassDeclaration): void {
    const name = classDecl.name?.getText() || 'AnonymousClass';
    
    // Collect fields
    const fields = classDecl.members
      .filter(ts.isPropertyDeclaration)
      .map(field => ({
        name: this.escapeIdentifier(field.name.getText()),
        type: field.type ? this.generateType(field.type) : 'String',
        initializer: field.initializer ? this.generateExpression(field.initializer) : undefined,
      }));
    
    // Collect methods (separate static from instance)
    const methods: Array<{ name: string; method: ts.MethodDeclaration }> = [];
    const staticMethods: Array<{ name: string; method: ts.MethodDeclaration }> = [];
    
    for (const member of classDecl.members) {
      if (ts.isMethodDeclaration(member)) {
        const isStatic = member.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword) || false;
        const methodInfo = {
          name: this.escapeIdentifier(member.name.getText()),
          method: member,
        };
        if (isStatic) {
          staticMethods.push(methodInfo);
        } else {
          methods.push(methodInfo);
        }
      }
    }
    
    // Collect constructor
    const constructor = classDecl.members
      .filter(ts.isConstructorDeclaration)[0];
    
    // Get base class if it exists
    let baseClass: string | undefined;
    if (classDecl.heritageClauses) {
      for (const clause of classDecl.heritageClauses) {
        if (clause.token === ts.SyntaxKind.ExtendsKeyword && clause.types.length > 0) {
          baseClass = clause.types[0].expression.getText();
          break;
        }
      }
    }
    
    this.classes.set(name, { fields, methods, staticMethods, constructor, baseClass });
  }

  /**
   * Generate class declaration
   */
  private generateClassDeclaration(classDecl: ts.ClassDeclaration, isExported: boolean = false): void {
    const name = classDecl.name?.getText() || 'AnonymousClass';
    const pubModifier = isExported ? 'pub ' : '';
    const typeParams = this.generateTypeParameters(classDecl.typeParameters);
    
    // Get all fields (including inherited)
    const allFields = this.collectAllFields(name);
    
    // Get class info for base class
    const classInfo = this.classes.get(name);
    const baseClass = classInfo?.baseClass;
    
    // Generate struct for fields
    this.emit(`#[derive(Clone)]`);
    this.emit(`${pubModifier}struct ${name}${typeParams} {`);
    this.indent();
    
    for (const field of allFields) {
      this.emit(`${field.name}: ${field.type},`);
    }
    
    this.dedent();
    this.emit('}');
    this.emit('');
    
    // If this class has methods, generate a trait for polymorphism
    const ownMethods = classInfo?.methods || [];
    if (ownMethods.length > 0) {
      // Generate trait for this class
      this.generateClassTrait(name);
      
      // Also implement the trait for this class
      this.emit(`impl ${name}Trait for ${name} {`);
      this.indent();
      
      for (const methodInfo of ownMethods) {
        const method = methodInfo.method;
        const methodName = this.escapeIdentifier(method.name.getText());
        
        const modifiesSelf = this.methodModifiesSelf(method);
        
        const params = this.generateParameters(method.parameters, true, modifiesSelf);
        const returnType = method.type ? this.generateType(method.type) : '()';
        const resultType = `Result<${returnType}, String>`;
        
        this.emit(`fn ${methodName}(${params}) -> ${resultType} {`);
        this.indent();
        
        // Track the return type for this function
        const previousReturnType = this.currentFunctionReturnType;
        this.currentFunctionReturnType = returnType;
        
        if (method.body) {
          this.generateBlock(method.body);
          
          const definitelyReturns = this.allPathsReturn(method.body);
          if (!definitelyReturns) {
            this.emit('Ok(())');
          }
        }
        
        // Restore previous return type
        this.currentFunctionReturnType = previousReturnType;
        
        this.dedent();
        this.emit('}');
        this.emit('');
      }
      
      this.dedent();
      this.emit('}');
      this.emit('');
    }
    
    // Generate impl block for constructor and methods
    const allMethods = this.collectAllMethods(name);
    const constructor = classInfo?.constructor;
    
    if (typeParams) {
      this.emit(`impl${typeParams} ${name}${typeParams} {`);
    } else {
      this.emit(`impl ${name} {`);
    }
    this.indent();
    
    // Generate constructor (new method)
    if (constructor && constructor.parameters.length > 0) {
      // Constructor has parameters
      const params = this.generateParameters(constructor.parameters, false, false);
      
      // Always return Result for consistency - constructors may call other functions
      const returnType = 'Result<Self, String>';
      
      this.emit(`fn new(${params}) -> ${returnType} {`);
      this.indent();
      
      // If constructor has a body with statements, generate them
      if (constructor.body && constructor.body.statements.length > 0) {
        // Track which fields are assigned in the constructor body
        const assignedFields = new Set<string>();
        
        // Set flag to indicate we're in constructor body
        this.inConstructorBody = true;
        
        // Generate constructor body statements
        for (const statement of constructor.body.statements) {
          // Track field assignments (this.field = value)
          if (ts.isExpressionStatement(statement) &&
              ts.isBinaryExpression(statement.expression) &&
              statement.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
              ts.isPropertyAccessExpression(statement.expression.left) &&
              statement.expression.left.expression.kind === ts.SyntaxKind.ThisKeyword) {
            const fieldName = this.escapeIdentifier(statement.expression.left.name.getText());
            assignedFields.add(fieldName);
          }
          this.generateStatement(statement);
        }
        
        // Reset flag
        this.inConstructorBody = false;
        
        // Return struct with all fields (assigned ones use their assigned values)
        const structLiteral = `${name} {`;
        this.emit(`Ok(${structLiteral}`);
        this.indent();
        for (const field of allFields) {
          if (assignedFields.has(field.name)) {
            // Field was assigned in constructor body, use local variable
            this.emit(`${field.name},`);
          } else {
            // Check if there's a parameter with the same name
            const rawFieldName = field.name.startsWith('r#') ? field.name.slice(2) : field.name;
            const param = constructor.parameters.find(p => {
              if (!ts.isIdentifier(p.name)) return false;
              const paramName = p.name.getText();
              return paramName === rawFieldName || this.escapeIdentifier(paramName) === field.name;
            });
            if (param) {
              const paramName = ts.isIdentifier(param.name) ? this.escapeIdentifier(param.name.getText()) : field.name;
              this.emit(`${field.name}: ${paramName},`);
            } else if (field.initializer) {
              this.emit(`${field.name}: ${field.initializer},`);
            } else {
              this.emit(`${field.name}: ${this.getDefaultValue(field.type)},`);
            }
          }
        }
        this.dedent();
        this.emit('})');
      } else {
        // No constructor body - just initialize the struct
        this.emit(`Ok(${name} {`);
        this.indent();
        
        for (const field of allFields) {
          // Check if there's a parameter with the same name as the field
          // Note: both field.name and parameter names are already escaped, so we need to compare raw names
          const rawFieldName = field.name.startsWith('r#') ? field.name.slice(2) : field.name;
          const param = constructor.parameters.find(p => {
            if (!ts.isIdentifier(p.name)) return false;
            const paramName = p.name.getText();
            return paramName === rawFieldName || this.escapeIdentifier(paramName) === field.name;
          });
          if (param) {
            // Use the parameter value (which is also escaped)
            const paramName = ts.isIdentifier(param.name) ? this.escapeIdentifier(param.name.getText()) : field.name;
            this.emit(`${field.name}: ${paramName},`);
          } else if (field.initializer) {
            this.emit(`${field.name}: ${field.initializer},`);
          } else {
            this.emit(`${field.name}: ${this.getDefaultValue(field.type)},`);
          }
        }
        
        this.dedent();
        this.emit('})');
      }
    } else {
      // No constructor or no parameters - generate default (also returns Result for consistency)
      this.emit(`fn new() -> Result<Self, String> {`);
      this.indent();
      this.emit(`Ok(${name} {`);
      this.indent();
      
      // Initialize all fields (including inherited) with their default values
      for (const field of allFields) {
        if (field.initializer) {
          this.emit(`${field.name}: ${field.initializer},`);
        } else {
          this.emit(`${field.name}: ${this.getDefaultValue(field.type)},`);
        }
      }
      
      this.dedent();
      this.emit('})');
    }
    this.dedent();
    this.emit('}');
    this.emit('');
    
    // Generate all instance methods (inherited and own)
    for (const methodInfo of allMethods) {
      this.generateMethodDeclaration(methodInfo.method);
    }
    
    // Generate static methods (without self parameter)
    const staticMethods = classInfo?.staticMethods || [];
    for (const methodInfo of staticMethods) {
      this.generateStaticMethodDeclaration(methodInfo.method);
    }
    
    this.dedent();
    this.emit('}');
    this.emit('');
    
    // Implement base class trait if we're extending
    if (baseClass) {
      this.generateClassTraitImpl(name, baseClass);
    }
  }
  
  /**
   * Generate trait for a base class (for polymorphism)
   */
  private generateClassTrait(className: string): void {
    const classInfo = this.classes.get(className);
    if (!classInfo) return;
    
    // Check if we already generated this trait
    const traitName = `${className}Trait`;
    if (this.interfaceTraits.has(traitName)) return;
    
    // Mark as generated
    this.interfaceTraits.set(traitName, []);
    
    // Generate trait
    this.emit(`trait ${traitName} {`);
    this.indent();
    
    for (const methodInfo of classInfo.methods) {
      const method = methodInfo.method;
      const methodName = method.name.getText();
      
      const modifiesSelf = this.methodModifiesSelf(method);
      
      const params = this.generateParameters(method.parameters, true, modifiesSelf);
      const returnType = method.type ? this.generateType(method.type) : '()';
      const resultType = `Result<${returnType}, String>`;
      
      this.emit(`fn ${methodName}(${params}) -> ${resultType};`);
    }
    
    this.dedent();
    this.emit('}');
    this.emit('');
  }
  
  /**
   * Generate trait implementation for a derived class
   */
  private generateClassTraitImpl(className: string, baseClassName: string): void {
    const baseClassInfo = this.classes.get(baseClassName);
    if (!baseClassInfo || baseClassInfo.methods.length === 0) return;
    
    const traitName = `${baseClassName}Trait`;
    const classInfo = this.classes.get(className);
    if (!classInfo) return;
    
    this.emit(`impl ${traitName} for ${className} {`);
    this.indent();
    
    // Implement all base class methods
    for (const baseMethod of baseClassInfo.methods) {
      const methodName = baseMethod.name;
      
      // Check if this class overrides the method
      const overridden = classInfo.methods.find(m => m.name === methodName);
      const method = overridden ? overridden.method : baseMethod.method;
      
      const modifiesSelf = this.methodModifiesSelf(method);
      
      const params = this.generateParameters(method.parameters, true, modifiesSelf);
      const returnType = method.type ? this.generateType(method.type) : '()';
      const resultType = `Result<${returnType}, String>`;
      
      this.emit(`fn ${methodName}(${params}) -> ${resultType} {`);
      this.indent();
      
      // Track the return type for this function
      const previousReturnType = this.currentFunctionReturnType;
      this.currentFunctionReturnType = returnType;
      
      // Generate the method body directly (not delegating)
      if (method.body) {
        this.generateBlock(method.body);
        
        const definitelyReturns = this.allPathsReturn(method.body);
        if (!definitelyReturns) {
          this.emit('Ok(())');
        }
      }
      
      // Restore previous return type
      this.currentFunctionReturnType = previousReturnType;
      
      this.dedent();
      this.emit('}');
      this.emit('');
    }
    
    this.dedent();
    this.emit('}');
    this.emit('');
  }
  
  /**
   * Generate parameter names for method call (without types)
   */
  private generateMethodCallParams(parameters: ts.NodeArray<ts.ParameterDeclaration>): string {
    return parameters.map(p => p.name.getText()).join(', ');
  }
  
  /**
   * Generate method declaration
   * All methods return Result<T, E> for error propagation
   */
  /**
   * Determine if a method modifies self
   * For now, we conservatively assume all methods may need &mut self
   * This is always safe and avoids the complexity of tracking mutation across method calls
   * We can optimize later with more sophisticated analysis if needed
   */
  private methodModifiesSelf(method: ts.MethodDeclaration): boolean {
    // Always use &mut self for all instance methods
    // This is the conservative, safe approach that avoids borrow checker issues
    return true;
  }
  
  private generateMethodDeclaration(method: ts.MethodDeclaration): void {
    const name = method.name.getText();
    
    const modifiesSelf = this.methodModifiesSelf(method);
    
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
    
    // Track the return type for this function
    const previousReturnType = this.currentFunctionReturnType;
    this.currentFunctionReturnType = returnType;
    
    if (method.body) {
      this.generateBlock(method.body);
      
      // Auto-add Ok(()) if method doesn't return on all paths
      const definitelyReturns = this.allPathsReturn(method.body);
      if (!definitelyReturns) {
        this.emit('Ok(())');
      }
    }
    
    // Restore previous return type
    this.currentFunctionReturnType = previousReturnType;
    
    this.dedent();
    this.emit('}');
    this.emit('');
  }
  
  private generateStaticMethodDeclaration(method: ts.MethodDeclaration): void {
    const name = method.name.getText();
    
    // Static methods don't have self parameter
    const params = this.generateParameters(method.parameters, false, false);
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
    
    // Track the return type for this function
    const previousReturnType = this.currentFunctionReturnType;
    this.currentFunctionReturnType = returnType;
    
    if (method.body) {
      this.generateBlock(method.body);
      
      // Auto-add Ok(()) if method doesn't return on all paths
      const definitelyReturns = this.allPathsReturn(method.body);
      if (!definitelyReturns) {
        this.emit('Ok(())');
      }
    }
    
    // Restore previous return type
    this.currentFunctionReturnType = previousReturnType;
    
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
    
    // Track this interface's trait signature for synthetic type generation
    const traitFields: Array<{name: string, type: string}> = [];
    for (const member of iface.members) {
      if (ts.isPropertySignature(member)) {
        const fieldName = member.name?.getText() || 'unknown';
        const fieldType = member.type ? this.generateType(member.type) : 'String';
        traitFields.push({name: fieldName, type: fieldType});
      }
    }
    this.interfaceTraits.set(`${name}Trait`, traitFields);
    
    // Generate as both a trait (for generic constraints) and a struct (for concrete usage)
    
    // 1. Generate the trait
    this.emit(`${pubModifier}trait ${name}Trait${typeParams} {`);
    this.indent();
    
    for (const member of iface.members) {
      if (ts.isPropertySignature(member)) {
        const fieldName = member.name?.getText() || 'unknown';
        const fieldType = member.type ? this.generateType(member.type) : 'String';
        // Trait getter method - same name as field, returns owned value (cloned)
        this.emit(`fn ${fieldName}(&self) -> ${fieldType};`);
      }
    }
    
    this.dedent();
    this.emit('}');
    this.emit('');
    
    // 2. Generate the concrete struct
    this.emit(`#[derive(Clone)]`);
    this.emit(`${pubModifier}struct ${name}${typeParams} {`);
    this.indent();
    
    for (const member of iface.members) {
      if (ts.isPropertySignature(member)) {
        const fieldName = member.name?.getText() || 'unknown';
        const fieldType = member.type ? this.generateType(member.type) : 'String';
        this.emit(`${pubModifier}${fieldName}: ${fieldType},`);
      }
    }
    
    this.dedent();
    this.emit('}');
    this.emit('');
    
    // 2b. Add inherent methods to the struct (so both field access and method calls work)
    this.emit(`impl${typeParams} ${name}${typeParams} {`);
    this.indent();
    
    for (const member of iface.members) {
      if (ts.isPropertySignature(member)) {
        const fieldName = member.name?.getText() || 'unknown';
        const fieldType = member.type ? this.generateType(member.type) : 'String';
        this.emit(`${pubModifier}fn ${fieldName}(&self) -> ${fieldType} {`);
        this.indent();
        this.emit(`self.${fieldName}.clone()`);
        this.dedent();
        this.emit(`}`);
      }
    }
    
    this.dedent();
    this.emit('}');
    this.emit('');
    
    // 3. Implement the trait for the struct
    this.emit(`impl${typeParams} ${name}Trait${typeParams} for ${name}${typeParams} {`);
    this.indent();
    
    for (const member of iface.members) {
      if (ts.isPropertySignature(member)) {
        const fieldName = member.name?.getText() || 'unknown';
        const fieldType = member.type ? this.generateType(member.type) : 'String';
        this.emit(`fn ${fieldName}(&self) -> ${fieldType} {`);
        this.indent();
        this.emit(`self.${fieldName}.clone()`);
        this.dedent();
        this.emit(`}`);
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
      this.emit(`#[derive(Clone, Copy, PartialEq, Debug)]`);
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
      this.emit(`#[derive(Clone, Copy, PartialEq, Debug)]`);
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
    // Special handling for field assignments in constructor body
    if (this.inConstructorBody &&
        ts.isBinaryExpression(statement.expression) &&
        statement.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isPropertyAccessExpression(statement.expression.left) &&
        statement.expression.left.expression.kind === ts.SyntaxKind.ThisKeyword) {
      // this.field = value in constructor -> let field = value
      const fieldName = this.escapeIdentifier(statement.expression.left.name.getText());
      let value = this.generateExpression(statement.expression.right);
      
      // Find the field's type in the class declaration to check if we need to wrap
      // But don't wrap if the value is already a parameter with a matching ownership type
      if (this.checker && !ts.isIdentifier(statement.expression.right)) {
        const symbol = this.checker.getSymbolAtLocation(statement.expression.left);
        if (symbol && symbol.valueDeclaration && ts.isPropertyDeclaration(symbol.valueDeclaration)) {
          const fieldType = symbol.valueDeclaration.type;
          if (fieldType) {
            value = this.wrapInOwnershipConstructor(value, fieldType);
          }
        }
      }
      
      // Check if this variable will be mutated in the constructor
      const parent = statement.parent;  // Should be the constructor body
      const willMutate = parent && this.willVariableBeMutated(fieldName, parent);
      const mutability = willMutate ? 'mut ' : '';
      
      this.emit(`let ${mutability}${fieldName} = ${value};`);
    } else {
      const expr = this.generateExpression(statement.expression);
      // Function calls already have ? added, so we just emit with semicolon
      this.emit(`${expr};`);
    }
  }
  
  /**
   * Generate return statement
   * All returns are wrapped in Ok() for Result<T, E> pattern
   */
  private generateReturnStatement(statement: ts.ReturnStatement): void {
    if (statement.expression) {
      let expr = this.generateExpression(statement.expression);
      
      // If the current function returns Option<T> and we're returning a non-Option value,
      // wrap it in Some()
      if (this.currentFunctionReturnType && this.currentFunctionReturnType.startsWith('Option<')) {
        // Check if the expression is already None or Some() or an if-expression with None branch
        let isAlreadyOption = expr === 'None' || 
                               expr.startsWith('Some(') ||
                               (expr.includes('if ') && expr.includes(' None'));
        
        // If we have a type checker, check if the return expression's type is nullable
        // If it is, then after wrapping in Result and unwrapping with ?, it will be Option<T>
        if (!isAlreadyOption && this.checker && statement.expression) {
          const returnType = this.checker.getTypeAtLocation(statement.expression);
          const typeStr = this.checker.typeToString(returnType);
          // Check if the type includes 'null' or 'undefined' (nullable)
          const isNullable = typeStr.includes('null') || typeStr.includes('undefined');
          if (isNullable) {
            // The expression's type is already nullable, so it will become Option<T> in Rust
            // Don't wrap it again
            isAlreadyOption = true;
          }
        }
        
        if (!isAlreadyOption) {
          expr = `Some(${expr})`;
        }
      }
      
      this.emit(`return Ok(${expr});`);
    } else {
      this.emit('return Ok(()));');
    }
  }
  
  /**
   * Generate if statement
   */
  private generateIfStatement(statement: ts.IfStatement): void {
    // Check if this is a null check for an Option type
    const unwrappedVar = this.extractUnwrappedVariable(statement.expression);
    
    const condition = this.generateExpression(statement.expression);
    this.emit(`if ${condition} {`);
    this.indent();
    
    // Track that this variable is unwrapped in the then block
    const previouslyUnwrapped = new Set(this.unwrappedOptions);
    if (unwrappedVar) {
      this.unwrappedOptions.add(unwrappedVar);
    }
    
    if (ts.isBlock(statement.thenStatement)) {
      this.generateBlock(statement.thenStatement);
    } else {
      this.generateStatement(statement.thenStatement);
    }
    
    // Restore unwrapped set
    this.unwrappedOptions = previouslyUnwrapped;
    
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
   * Extract the variable name from a null check expression
   * Returns the variable name if this is checking an Option variable for Some
   * Patterns: value !== null, value !== undefined, value.is_some()
   */
  private extractUnwrappedVariable(expr: ts.Expression): string | null {
    // Pattern: value !== null or value !== undefined
    if (ts.isBinaryExpression(expr)) {
      if (expr.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken) {
        const left = expr.left;
        const right = expr.right;
        
        if (ts.isIdentifier(left) && 
            (right.kind === ts.SyntaxKind.NullKeyword || 
             (ts.isIdentifier(right) && right.text === 'undefined'))) {
          const varName = left.text;
          if (this.optionVariables.has(varName)) {
            return varName;
          }
        }
      }
    }
    
    // Pattern: value.is_some() (after transformation to Rust)
    // This would be a CallExpression with PropertyAccessExpression
    // But since we're checking before transformation, check for TypeScript pattern
    // In TypeScript: value !== null becomes value.is_some() in Rust
    
    return null;
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
   * For complex expressions (variables, arithmetic), wraps in "as usize" cast
   */
  private convertToIntegerLiteral(value: string): string {
    // If it ends with .0, remove it (simple literal)
    if (value.endsWith('.0')) {
      return value.slice(0, -2);
    }
    
    // If it's a simple integer literal, return as-is
    if (/^\d+$/.test(value)) {
      return value;
    }
    
    // For complex expressions (variables, arithmetic), cast to usize
    // This handles cases like N, N * N, etc.
    return `(${value}) as usize`;
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
    // Analyze the block for recursive functions before generating
    const callGraph = this.buildCallGraph(block.statements);
    const recursiveFuncs = this.findRecursiveFunctions(callGraph);
    
    // Save previous state and update
    const prevRecursiveFunctions = this.recursiveFunctions;
    this.recursiveFunctions = new Set([...prevRecursiveFunctions, ...recursiveFuncs]);
    
    for (const statement of block.statements) {
      this.generateStatement(statement);
    }
    
    // Restore previous state
    this.recursiveFunctions = prevRecursiveFunctions;
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
        const name = this.escapeIdentifier(param.name.getText());
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
        let constraint = this.generateType(tp.constraint);
        // If the constraint is an interface, use the Trait version
        // (interfaces generate both a struct and a trait with "Trait" suffix)
        if (this.checker && ts.isTypeReferenceNode(tp.constraint)) {
          const symbol = this.checker.getSymbolAtLocation(tp.constraint.typeName);
          if (symbol) {
            const declarations = symbol.getDeclarations();
            if (declarations && declarations.some(d => ts.isInterfaceDeclaration(d))) {
              constraint = `${constraint}Trait`;
            }
          }
        }
        // In Rust, trait bounds use : instead of extends
        // T extends Named -> T: NamedTrait
        return `${name}: ${constraint}`;
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
            const rustInnerType = this.generateType(innerType);
            // For struct/class types (not primitives), wrap in Box to avoid infinite size
            // Primitives: f64, String, bool, ()
            // Collections like Vec, HashMap are already on heap
            if (this.isPrimitiveOrHeapType(rustInnerType)) {
              return `Option<${rustInnerType}>`;
            } else {
              // Struct/class type - wrap in Box
              this.addImport('use std::boxed::Box;');
              return `Option<Box<${rustInnerType}>>`;
            }
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
    } else if (typeName === 'Map') {
      // Map<K, V> -> HashMap<K, V>
      this.addImport('use std::collections::HashMap;');
      if (type.typeArguments && type.typeArguments.length >= 2) {
        const keyType = this.generateType(type.typeArguments[0]);
        const valueType = this.generateType(type.typeArguments[1]);
        return `HashMap<${keyType}, ${valueType}>`;
      }
      return 'HashMap<String, String>'; // Default if no type args
    } else if (typeName === 'Set') {
      // Set<T> -> HashSet<T>
      this.addImport('use std::collections::HashSet;');
      if (type.typeArguments && type.typeArguments.length > 0) {
        const innerType = this.generateType(type.typeArguments[0]);
        return `HashSet<${innerType}>`;
      }
      return 'HashSet<String>'; // Default if no type args
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
  private generateExpression(expr: ts.Expression, useIntegerLiterals = false, isLValue = false): string {
    if (ts.isNumericLiteral(expr)) {
      const text = expr.getText();
      // Add .0 if it's an integer literal (for f64 compatibility)
      // Unless we're in an integer context (comparing with integer loop variables)
      if (!text.includes('.') && !text.includes('e') && !text.includes('E')) {
        return useIntegerLiterals ? text : text + '.0';
      }
      return text;
    } else if (ts.isStringLiteral(expr)) {
      // Convert to Rust string literal (with double quotes)
      const text = expr.text; // Gets the string content without quotes
      return `String::from("${this.escapeRustString(text)}")`;  // Always use double quotes for Rust
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
      // If we're in a struct method and this is a field, prefix with self.
      if (this.inStructMethod && this.structFields.has(text)) {
        return `self.${this.escapeIdentifier(text)}`;
      }
      // If we're in a struct wrapper and this is a method, it's handled in generateCallExpression
      return this.escapeIdentifier(text);
    } else if (ts.isArrowFunction(expr)) {
      return this.generateArrowFunction(expr);
    } else if (ts.isBinaryExpression(expr)) {
      return this.generateBinaryExpression(expr);
    } else if (ts.isCallExpression(expr)) {
      return this.generateCallExpression(expr);
    } else if (ts.isPropertyAccessExpression(expr)) {
      return this.generatePropertyAccess(expr, isLValue);
    } else if (ts.isObjectLiteralExpression(expr)) {
      return this.generateObjectLiteral(expr);
    } else if (ts.isArrayLiteralExpression(expr)) {
      return this.generateArrayLiteral(expr);
    } else if (ts.isNewExpression(expr)) {
      return this.generateNewExpression(expr);
    } else if (ts.isElementAccessExpression(expr)) {
      return this.generateElementAccess(expr, isLValue);
    } else if (ts.isPrefixUnaryExpression(expr)) {
      return this.generatePrefixUnaryExpression(expr);
    } else if (ts.isPostfixUnaryExpression(expr)) {
      return this.generatePostfixUnaryExpression(expr);
    } else if (ts.isConditionalExpression(expr)) {
      return this.generateConditionalExpression(expr);
    } else if (ts.isTemplateExpression(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
      return this.generateTemplateLiteral(expr);
    } else if (ts.isParenthesizedExpression(expr)) {
      return `(${this.generateExpression(expr.expression, useIntegerLiterals, isLValue)})`;
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
    let inner = this.generateExpression(expr.expression);
    // Remove trailing ? if present (added by generateCallExpression)
    // We'll add it after .await instead
    if (inner.endsWith('?')) {
      inner = inner.slice(0, -1);
    }
    return `${inner}.await?`;
  }
  
  /**
   * Generate arrow function
   * All functions return Result<T, E> for error propagation
   */
  private generateArrowFunction(func: ts.ArrowFunction): string {
    const params = this.generateParameters(func.parameters);
    
    // Determine return type
    let returnType: string;
    if (func.type) {
      // Explicit return type annotation
      returnType = this.generateType(func.type);
    } else if (this.checker) {
      // Try to infer return type using TypeScript's type checker
      const signature = this.checker.getSignatureFromDeclaration(func);
      if (signature) {
        const inferredReturnType = this.checker.getReturnTypeOfSignature(signature);
        const typeString = this.checker.typeToString(inferredReturnType);
        
        // Map TypeScript types to Rust types
        if (typeString === 'void') {
          returnType = '()';
        } else if (typeString === 'number') {
          returnType = 'f64';
        } else if (typeString === 'string') {
          returnType = 'String';
        } else if (typeString === 'boolean') {
          returnType = 'bool';
        } else {
          // For complex types, try to generate from the inferred type
          // Fall back to () if we can't infer
          returnType = '()';
        }
      } else {
        returnType = '()';
      }
    } else {
      // No type annotation and no type checker - default to ()
      returnType = '()';
    }
    
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
      
      // Analyze for recursive functions before generating
      const callGraph = this.buildCallGraph(func.body.statements);
      const recursiveFuncs = this.findRecursiveFunctions(callGraph);
      
      // Save and update recursive functions set
      const prevRecursiveFunctions = this.recursiveFunctions;
      this.recursiveFunctions = new Set([...prevRecursiveFunctions, ...recursiveFuncs]);
      
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
      
      // Restore recursive functions set
      this.recursiveFunctions = prevRecursiveFunctions;
      
      // Auto-add Ok(()) if function doesn't return on all paths
      // Use allPathsReturn which checks if all code paths definitely return
      const definitelyReturns = this.allPathsReturn(func.body);
      if (!definitelyReturns) {
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
   * Generate a recursive arrow function as an explicit closure structure
   * Instead of trying to use Rust closures (which can't be recursive), we generate
   * a struct that holds captured variables and has a call method
   */
  private generateRecursiveFunction(func: ts.ArrowFunction, name: string): void {
    // Collect the names of the parameters
    const paramNames: string[] = [];
    const paramTypes: string[] = [];
    for (const param of func.parameters) {
      if (ts.isIdentifier(param.name)) {
        paramNames.push(param.name.text);
        const paramType = param.type ? this.generateType(param.type) : 'f64';
        paramTypes.push(paramType);
      }
    }
    
    // Determine return type
    let returnType: string;
    if (func.type) {
      returnType = this.generateType(func.type);
    } else if (this.checker) {
      const signature = this.checker.getSignatureFromDeclaration(func);
      if (signature) {
        const inferredReturnType = this.checker.getReturnTypeOfSignature(signature);
        const typeString = this.checker.typeToString(inferredReturnType);
        
        if (typeString === 'void') {
          returnType = '()';
        } else if (typeString === 'number') {
          returnType = 'f64';
        } else if (typeString === 'string') {
          returnType = 'String';
        } else if (typeString === 'boolean') {
          returnType = 'bool';
        } else {
          returnType = '()';
        }
      } else {
        returnType = '()';
      }
    } else {
      returnType = '()';
    }
    
    const resultType = `Result<${returnType}, String>`;
    const structName = `${this.capitalize(name)}Closure`;
    
    // Emit comment explaining the structure
    this.emit(`// Recursive closure '${name}' implemented as explicit struct`);
    
    // For now, generate as a simple closure struct wrapper
    // We'll use Rc<RefCell<>> for the recursive reference
    // Build the full type for the closure
    const closureType = `Box<dyn Fn(${paramTypes.join(', ')}) -> ${resultType}>`;
    this.emit(`let ${name} = std::rc::Rc::new(std::cell::RefCell::new(None::<${closureType}>));`);
    this.emit(`let ${name}_clone = ${name}.clone();`);
    
    // Build parameter list
    const params = paramNames.map((n, i) => `${n}: ${paramTypes[i]}`).join(', ');
    
    // Generate the closure body
    this.emit(`*${name}.borrow_mut() = Some(Box::new(move |${params}| -> ${resultType} {`);
    this.indent();
    
    // Track that we're inside this recursive function
    const previousRecursiveFunctionName = this.currentRecursiveFunctionName;
    this.currentRecursiveFunctionName = name;
    
    // Generate the function body
    if (ts.isBlock(func.body)) {
      for (const statement of func.body.statements) {
        // Replace recursive calls with calls through the Rc
        this.generateStatement(statement);
      }
      
      const definitelyReturns = this.allPathsReturn(func.body);
      if (!definitelyReturns) {
        this.emit('Ok(())');
      }
    } else {
      const body = this.generateExpression(func.body);
      this.emit(`Ok(${body})`);
    }
    
    // Restore previous recursive function context
    this.currentRecursiveFunctionName = previousRecursiveFunctionName;
    
    this.dedent();
    this.emit('}));');
    this.emit('');
    
    // Create the callable wrapper
    this.emit(`let ${name} = move |${params}| -> ${resultType} {`);
    this.indent();
    this.emit(`${name}_clone.borrow().as_ref().unwrap()(${paramNames.join(', ')})`);
    this.dedent();
    this.emit('};');
    this.emit('');
  }
  
  /**
   * Check if an arrow function should be generated as a struct with methods
   * This is needed when multiple closures share captured mutable state
   */
  private shouldGenerateAsStruct(func: ts.ArrowFunction): boolean {
    if (!ts.isBlock(func.body)) {
      return false;
    }
    
    // Count arrow function declarations in the body
    let arrowFunctionCount = 0;
    let hasSharedVariables = false;
    
    for (const statement of func.body.statements) {
      if (ts.isVariableStatement(statement)) {
        for (const decl of statement.declarationList.declarations) {
          // Check if it's an arrow function
          if (decl.initializer && ts.isArrowFunction(decl.initializer)) {
            arrowFunctionCount++;
          }
          // Check if it's a variable that could be shared (array, object)
          if (decl.initializer && ts.isNewExpression(decl.initializer)) {
            hasSharedVariables = true;
          }
        }
      }
    }
    
    // If we have 3+ arrow functions and shared variables, use struct pattern
    return arrowFunctionCount >= 3 && hasSharedVariables;
  }
  
  /**
   * Generate an arrow function as a struct with methods
   * This converts closure-heavy code to more idiomatic Rust
   */
  private generateStructWithMethods(func: ts.ArrowFunction, name: string): void {
    if (!ts.isBlock(func.body)) {
      return;
    }
    
    const structName = this.capitalize(name);
    
    // Collect parameters of the outer function (these become fields)
    const outerParams: Array<{name: string, type: string}> = [];
    for (const param of func.parameters) {
      if (ts.isIdentifier(param.name)) {
        const paramType = param.type ? this.generateType(param.type) : 'f64';
        outerParams.push({name: param.name.text, type: paramType});
      }
    }
    
    // Analyze the function body to find fields and methods
    const fields: Array<{name: string, type: string, initializer?: string}> = [];
    const methods: Array<{name: string, params: string[], paramTypes: string[], returnType: string, body: ts.Block | ts.Expression, isMutable: boolean, mutableParams?: Set<string>}> = [];
    const otherStatements: ts.Statement[] = [];
    
    for (const statement of func.body.statements) {
      if (ts.isVariableStatement(statement)) {
        for (const decl of statement.declarationList.declarations) {
          const varName = decl.name.getText();
          
          if (decl.initializer && ts.isArrowFunction(decl.initializer)) {
            // This is a method
            const arrowFunc = decl.initializer;
            const params: string[] = [];
            const paramTypes: string[] = [];
            
            for (const param of arrowFunc.parameters) {
              if (ts.isIdentifier(param.name)) {
                params.push(param.name.text);
                paramTypes.push(param.type ? this.generateType(param.type) : 'f64');
              }
            }
            
            let returnType = '()';
            if (arrowFunc.type) {
              returnType = this.generateType(arrowFunc.type);
            } else if (this.checker) {
              const signature = this.checker.getSignatureFromDeclaration(arrowFunc);
              if (signature) {
                const inferredReturnType = this.checker.getReturnTypeOfSignature(signature);
                const typeString = this.checker.typeToString(inferredReturnType);
                if (typeString === 'void') returnType = '()';
                else if (typeString === 'number') returnType = 'f64';
                else if (typeString === 'string') returnType = 'String';
                else if (typeString === 'boolean') returnType = 'bool';
              }
            }
            
            // Detect if method needs &mut self by checking if it mutates captured variables
            const isMutable = this.methodNeedsMutableSelf(arrowFunc);
            
            // Detect which parameters are mutated
            const mutableParams = this.findMutableParams(arrowFunc, params);
            
            methods.push({name: varName, params, paramTypes, returnType, body: arrowFunc.body, isMutable, mutableParams});
          } else {
            // This is a field
            let fieldType = 'f64';
            let initializer: string | undefined;
            
            if (decl.type) {
              fieldType = this.generateType(decl.type);
            } else if (decl.initializer) {
              if (ts.isNewExpression(decl.initializer) && 
                  decl.initializer.expression.getText() === 'Array') {
                fieldType = 'Vec<f64>';
                initializer = 'Vec::new()';
              } else {
                initializer = this.generateExpression(decl.initializer);
              }
            }
            
            fields.push({name: varName, type: fieldType, initializer});
          }
        }
      } else {
        // Keep other statements (like function calls at the end)
        otherStatements.push(statement);
      }
    }
    
    // Generate the struct
    this.emit(`// Struct ${structName} for ${name}`);
    this.emit(`struct ${structName} {`);
    this.indent();
    
    // Add outer parameters as fields
    for (const param of outerParams) {
      this.emit(`${param.name}: ${param.type},`);
    }
    
    // Add other fields
    for (const field of fields) {
      this.emit(`${field.name}: ${field.type},`);
    }
    
    this.dedent();
    this.emit('}');
    this.emit('');
    
    // Generate impl block with methods
    this.emit(`impl ${structName} {`);
    this.indent();
    
    // Analyze Vec field usage to determine initialization size
    const vecSizes = this.analyzeVecFieldUsage(fields, methods, outerParams);
    
    // Generate new() constructor
    this.emit(`fn new(${outerParams.map(p => `${p.name}: ${p.type}`).join(', ')}) -> Self {`);
    this.indent();
    this.emit(`Self {`);
    this.indent();
    for (const param of outerParams) {
      this.emit(`${param.name},`);
    }
    for (const field of fields) {
      if (field.initializer) {
        // Check if we detected a size for this Vec field
        if (field.initializer === 'Vec::new()' && vecSizes.has(field.name)) {
          const sizeExpr = vecSizes.get(field.name)!;
          this.emit(`${field.name}: vec![0.0; ${sizeExpr}],`);
        } else {
          this.emit(`${field.name}: ${field.initializer},`);
        }
      } else {
        this.emit(`${field.name}: Default::default(),`);
      }
    }
    this.dedent();
    this.emit(`}`);
    this.dedent();
    this.emit(`}`);
    this.emit('');
    
    // Generate methods
    for (const method of methods) {
      const selfParam = method.isMutable ? '&mut self' : '&self';
      const params = method.params.length > 0 
        ? `, ${method.params.map((p, i) => {
            const mutPrefix = method.mutableParams?.has(p) ? 'mut ' : '';
            return `${mutPrefix}${p}: ${method.paramTypes[i]}`;
          }).join(', ')}`
        : '';
      const resultType = `Result<${method.returnType}, String>`;
      
      this.emit(`fn ${method.name}(${selfParam}${params}) -> ${resultType} {`);
      this.indent();
      
      // Track that we're inside a struct method with these fields and methods available
      const previousStructFields = this.structFields;
      const previousStructMethods = this.structMethods;
      const previousInStructMethod = this.inStructMethod;
      this.structFields = new Set([...outerParams.map(p => p.name), ...fields.map(f => f.name)]);
      this.structMethods = new Set(methods.map(m => m.name));
      this.inStructMethod = true;
      
      if (ts.isBlock(method.body)) {
        for (const statement of method.body.statements) {
          this.generateStatement(statement);
        }
        
        if (!this.allPathsReturn(method.body)) {
          this.emit('Ok(())');
        }
      } else {
        const body = this.generateExpression(method.body);
        this.emit(`Ok(${body})`);
      }
      
      // Restore previous context
      this.structFields = previousStructFields;
      this.structMethods = previousStructMethods;
      this.inStructMethod = previousInStructMethod;
      
      this.dedent();
      this.emit(`}`);
      this.emit('');
    }
    
    this.dedent();
    this.emit('}');
    this.emit('');
    
    // Generate the wrapper function
    this.emit(`let ${name} = |${outerParams.map(p => `${p.name}: ${p.type}`).join(', ')}| -> Result<(), String> {`);
    this.indent();
    this.emit(`let mut instance = ${structName}::new(${outerParams.map(p => p.name).join(', ')});`);
    
    // Track that we're in a struct wrapper and what methods are available
    const previousStructMethods = this.structMethods;
    const previousInStructWrapper = this.inStructWrapper;
    this.structMethods = new Set(methods.map(m => m.name));
    this.inStructWrapper = true;
    
    // Generate the other statements (calls to the methods)
    for (const statement of otherStatements) {
      // Replace standalone calls with instance.method() calls
      this.generateStatement(statement);
    }
    
    // Restore previous context
    this.structMethods = previousStructMethods;
    this.inStructWrapper = previousInStructWrapper;
    
    this.emit('Ok(())');
    this.dedent();
    this.emit('};');
    this.emit('');
  }
  
  /**
   * Check if a method needs &mut self by analyzing if it assigns to captured variables
   */
  private methodNeedsMutableSelf(func: ts.ArrowFunction): boolean {
    let needsMutable = false;
    
    const visit = (node: ts.Node) => {
      // Check for assignments to identifiers (board[i] = x, etc.)
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        needsMutable = true;
      }
      
      // Check for compound assignments (x++, x--, +=, -=, etc.)
      if (ts.isPostfixUnaryExpression(node) || ts.isPrefixUnaryExpression(node)) {
        if (node.operator === ts.SyntaxKind.PlusPlusToken || 
            node.operator === ts.SyntaxKind.MinusMinusToken) {
          needsMutable = true;
        }
      }
      
      ts.forEachChild(node, visit);
    };
    
    if (ts.isBlock(func.body)) {
      visit(func.body);
    }
    
    return needsMutable;
  }
  
  /**
   * Find which parameters are mutated in a function
   */
  private findMutableParams(func: ts.ArrowFunction, paramNames: string[]): Set<string> {
    const mutableParams = new Set<string>();
    
    const visit = (node: ts.Node) => {
      // Check for assignments to parameters
      if (ts.isBinaryExpression(node) && 
          (node.operatorToken.kind === ts.SyntaxKind.EqualsToken ||
           node.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken ||
           node.operatorToken.kind === ts.SyntaxKind.MinusEqualsToken)) {
        if (ts.isIdentifier(node.left) && paramNames.includes(node.left.getText())) {
          mutableParams.add(node.left.getText());
        }
      }
      
      // Check for ++ and -- on parameters
      if (ts.isPostfixUnaryExpression(node) || ts.isPrefixUnaryExpression(node)) {
        if (node.operator === ts.SyntaxKind.PlusPlusToken || 
            node.operator === ts.SyntaxKind.MinusMinusToken) {
          if (ts.isIdentifier(node.operand) && paramNames.includes(node.operand.getText())) {
            mutableParams.add(node.operand.getText());
          }
        }
      }
      
      ts.forEachChild(node, visit);
    };
    
    if (ts.isBlock(func.body)) {
      visit(func.body);
    }
    
    return mutableParams;
  }
  
  /**
   * Check if a variable will be mutated in the current scope
   * Looks for: assignments, +=, -=, ++, --, .push(), .set(), and any method calls
   */
  private willVariableBeMutated(varName: string, scope: ts.Node): boolean {
    let found = false;
    
    const visit = (node: ts.Node) => {
      if (found) return; // Short circuit
      
      // Check for direct assignments: varName = x, varName += x, etc.
      if (ts.isBinaryExpression(node)) {
        if (node.operatorToken.kind === ts.SyntaxKind.EqualsToken ||
            node.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken ||
            node.operatorToken.kind === ts.SyntaxKind.MinusEqualsToken ||
            node.operatorToken.kind === ts.SyntaxKind.AsteriskEqualsToken ||
            node.operatorToken.kind === ts.SyntaxKind.SlashEqualsToken) {
          if (ts.isIdentifier(node.left) && node.left.getText() === varName) {
            found = true;
            return;
          }
        }
      }
      
      // Check for ++ and --
      if (ts.isPostfixUnaryExpression(node) || ts.isPrefixUnaryExpression(node)) {
        if (node.operator === ts.SyntaxKind.PlusPlusToken || 
            node.operator === ts.SyntaxKind.MinusMinusToken) {
          if (ts.isIdentifier(node.operand) && node.operand.getText() === varName) {
            found = true;
            return;
          }
        }
      }
      
      // Check for any method calls on the variable
      // In Rust, method calls often require &mut self, so we assume all method calls might mutate
      if (ts.isCallExpression(node)) {
        if (ts.isPropertyAccessExpression(node.expression)) {
          const obj = node.expression.expression;
          
          if (ts.isIdentifier(obj) && obj.text === varName) {
            // Any method call on this variable - assume it might need mut
            found = true;
            return;
          }
          
          // Also check for this.varName pattern (in constructor body)
          if (ts.isPropertyAccessExpression(obj) && 
              obj.expression.kind === ts.SyntaxKind.ThisKeyword &&
              obj.name.text === varName) {
            // this.varName.method() - also needs mut
            found = true;
            return;
          }
        }
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(scope);
    return found;
  }

  
  /**
   * Analyze how Vec fields are used to determine appropriate initialization size
   * Looks for patterns like:
   * - for (let i = 0; i < N; i++) array[i] = x  →  vec![default; N]
   * - for (let i = 0; i < N * N; i++) array[i] = x  →  vec![default; N * N]
   */
  private analyzeVecFieldUsage(
    fields: Array<{name: string, type: string, initializer?: string}>,
    methods: Array<{name: string, body: ts.Block | ts.Expression}>,
    outerParams: Array<{name: string, type: string}>
  ): Map<string, string> {
    const sizes = new Map<string, string>();
    
    // Find Vec fields
    const vecFields = fields.filter(f => f.type.startsWith('Vec<'));
    if (vecFields.length === 0) return sizes;
    
    // Look for initialization patterns in methods
    for (const method of methods) {
      if (!ts.isBlock(method.body)) continue;
      
      for (const statement of method.body.statements) {
        // Look for: for (let i = 0; i < SIZE; i++) vecField[i] = value
        if (ts.isForStatement(statement)) {
          const arrayAssignments = this.findArrayAssignmentsInLoop(statement, vecFields.map(f => f.name));
          
          for (const [fieldName, sizeExpr] of arrayAssignments) {
            if (!sizes.has(fieldName)) {
              // Convert size expression to Rust
              const rustSize = this.convertSizeExpression(sizeExpr, outerParams);
              sizes.set(fieldName, rustSize);
            }
          }
        }
      }
    }
    
    return sizes;
  }
  
  /**
   * Find array assignments in a for loop and extract the size from loop condition
   */
  private findArrayAssignmentsInLoop(
    forLoop: ts.ForStatement,
    vecFieldNames: string[]
  ): Map<string, ts.Expression> {
    const assignments = new Map<string, ts.Expression>();
    
    // Check if this is a standard for loop: for (let i = 0; i < SIZE; i++)
    if (!forLoop.condition || !ts.isBinaryExpression(forLoop.condition)) return assignments;
    
    const condition = forLoop.condition;
    // Get the size expression from condition (i < SIZE or i < N * N, etc.)
    if (condition.operatorToken.kind !== ts.SyntaxKind.LessThanToken &&
        condition.operatorToken.kind !== ts.SyntaxKind.LessThanEqualsToken) {
      return assignments;
    }
    
    const sizeExpr = condition.right;
    
    // Check if loop body contains array assignments
    if (forLoop.statement) {
      this.visitNodeForArrayAssignments(forLoop.statement, vecFieldNames, sizeExpr, assignments);
    }
    
    return assignments;
  }
  
  /**
   * Visit AST nodes looking for array element assignments
   */
  private visitNodeForArrayAssignments(
    node: ts.Node,
    vecFieldNames: string[],
    sizeExpr: ts.Expression,
    assignments: Map<string, ts.Expression>
  ): void {
    if (ts.isExpressionStatement(node)) {
      node = node.expression;
    }
    
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      // Check if left side is array[index]
      if (ts.isElementAccessExpression(node.left)) {
        const arrayName = node.left.expression.getText();
        if (vecFieldNames.includes(arrayName) && !assignments.has(arrayName)) {
          assignments.set(arrayName, sizeExpr);
        }
      }
    }
    
    if (ts.isBlock(node)) {
      for (const statement of node.statements) {
        this.visitNodeForArrayAssignments(statement, vecFieldNames, sizeExpr, assignments);
      }
    }
  }
  
  /**
   * Convert a TypeScript size expression to Rust
   */
  private convertSizeExpression(
    expr: ts.Expression,
    outerParams: Array<{name: string, type: string}>
  ): string {
    // For simple identifiers or expressions, generate as-is and cast to usize
    const exprText = this.generateExpression(expr);
    
    // If it's already a simple param name, just cast
    if (outerParams.some(p => exprText.includes(p.name))) {
      return `(${exprText}) as usize`;
    }
    
    return `(${exprText}) as usize`;
  }
  
  /**
   * Capitalize first letter of a string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
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
    
    // Handle mixed usize/f64 arithmetic - cast usize to f64
    const leftIsInteger = ts.isIdentifier(expr.left) && this.integerVariables.has(expr.left.getText());
    const rightIsInteger = ts.isIdentifier(expr.right) && this.integerVariables.has(expr.right.getText());
    
    // Handle comparisons with null/undefined BEFORE translating operators
    // This works for any Option<T>, regardless of whether T implements PartialEq
    const op = expr.operatorToken.getText();
    
    // Check if either side is null or undefined (keyword or identifier)
    const leftIsNull = expr.left.kind === ts.SyntaxKind.NullKeyword || expr.left.kind === ts.SyntaxKind.UndefinedKeyword ||
                       (ts.isIdentifier(expr.left) && (expr.left.getText() === 'null' || expr.left.getText() === 'undefined'));
    const rightIsNull = expr.right.kind === ts.SyntaxKind.NullKeyword || expr.right.kind === ts.SyntaxKind.UndefinedKeyword ||
                        (ts.isIdentifier(expr.right) && (expr.right.getText() === 'null' || expr.right.getText() === 'undefined'));
    
    if ((op === '===' || op === '!==' || op === '==' || op === '!=') && 
        (leftIsNull || rightIsNull)) {
      // Get the non-null side expression (could be identifier or property access)
      const nonNullExpr = leftIsNull ? expr.right : expr.left;
      const optionExpr = this.generateExpression(nonNullExpr, useIntegerLiterals, false);
      
      if (op === '===' || op === '==') {
        // x === null, x == null, null === x, null == x -> x.is_none()
        return `${optionExpr}.is_none()`;
      } else {
        // x !== null, x != null, null !== x, null != x -> x.is_some()
        return `${optionExpr}.is_some()`;
      }
    }
    
    // For assignments, the left-hand side should be an lvalue (no .clone())
    const isAssignment = operator === '=' || operator === '+=' || operator === '-=' || 
                        operator === '*=' || operator === '/=' || operator === '%=';
    let left = this.generateExpression(expr.left, useIntegerLiterals, isAssignment);
    let right = this.generateExpression(expr.right, useIntegerLiterals, false);
    
    // In arithmetic operations with mixed types (one usize, one f64), cast usize to f64
    if ((op === '+' || op === '-' || op === '*' || op === '/' || op === '%') &&
        (leftIsInteger !== rightIsInteger)) {
      // One side is integer, the other is not - cast the integer to f64
      if (leftIsInteger) {
        left = `${left} as f64`;
      } else if (rightIsInteger) {
        right = `${right} as f64`;
      }
    }
    
    // Handle integer literals in arithmetic with f64 expressions
    // If one side is a cast to f64 or contains f64, convert integer literals on the other side
    if ((op === '+' || op === '-' || op === '*' || op === '/' || op === '%')) {
      const leftHasFloat = left.includes('as f64') || left.includes('.0');
      const rightHasFloat = right.includes('as f64') || right.includes('.0');
      const leftIsIntLiteral = ts.isNumericLiteral(expr.left) && !expr.left.getText().includes('.');
      const rightIsIntLiteral = ts.isNumericLiteral(expr.right) && !expr.right.getText().includes('.');
      
      if (leftHasFloat && rightIsIntLiteral) {
        // Right side is int literal, left has float - add .0 to right
        right = right + '.0';
      } else if (rightHasFloat && leftIsIntLiteral) {
        // Left side is int literal, right has float - add .0 to left
        left = left + '.0';
      }
    }
    
    // Translate JavaScript operators to Rust
    if (operator === '===') {
      operator = '==';
    } else if (operator === '!==') {
      operator = '!=';
    }
    // Note: &&, ||, and other logical operators are the same in Rust
    
    // Handle Option<T> comparisons: if one side is an Option variable and the other is a literal,
    // wrap the literal in Some()
    if (operator === '==' || operator === '!=' || operator === '>=' || operator === '<=' || operator === '>' || operator === '<') {
      const leftIsOption = ts.isIdentifier(expr.left) && this.optionVariables.has(expr.left.getText());
      const rightIsOption = ts.isIdentifier(expr.right) && this.optionVariables.has(expr.right.getText());
      const rightIsStringLiteral = ts.isStringLiteral(expr.right);
      const leftIsStringLiteral = ts.isStringLiteral(expr.left);
      
      if (leftIsOption && rightIsStringLiteral) {
        // left is Option, right is literal - wrap right in Some()
        right = `Some(${right})`;
      } else if (rightIsOption && leftIsStringLiteral) {
        // right is Option, left is literal - wrap left in Some()
        left = `Some(${left})`;
      }
    }
    
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
    
    // Use type checker to determine if this is a string type
    if (this.checker && ts.isIdentifier(expr)) {
      const type = this.checker.getTypeAtLocation(expr);
      const typeStr = this.checker.typeToString(type);
      if (typeStr === 'string' || typeStr.startsWith('string ') || typeStr.includes('| string') || typeStr.includes('|string')) {
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
    const parts: ts.Expression[] = [];
    const collectParts = (e: ts.Expression): void => {
      if (ts.isBinaryExpression(e) && e.operatorToken.getText() === '+') {
        collectParts(e.left);
        collectParts(e.right);
      } else {
        parts.push(e);
      }
    };
    collectParts(expr);
    
    // Generate code for each part, unwrapping Options if necessary
    const generatedParts = parts.map(part => {
      let code = this.generateExpression(part);
      
      // Check if this part is an Option variable that needs unwrapping  
      if (ts.isIdentifier(part)) {
        const varName = part.getText();
        if (this.optionVariables.has(varName)) {
          // It's a tracked Option<T>, unwrap it
          code = `${code}.unwrap()`;
        }
      }
      
      return code;
    });
    
    // Use format! for multiple concatenations
    if (generatedParts.length > 2) {
      const formatStr = generatedParts.map(() => '{}').join('');
      return `format!("${formatStr}", ${generatedParts.join(', ')})`;
    } else {
      // Simple a + b case - use + with proper borrowing
      // First part is consumed, rest need to be borrowed string slices
      const [first, ...rest] = generatedParts;
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
      
      // Promise.then() -> .await with callback execution
      if (property === 'then') {
        // promise.then(callback) -> { let result = promise.await?; callback_body }
        if (expr.arguments.length > 0 && ts.isArrowFunction(expr.arguments[0])) {
          const callback = expr.arguments[0] as ts.ArrowFunction;
          
          // Generate the promise expression without the trailing ?
          // We'll add .await? instead
          let promiseExpr = this.generateExpression(objectExpr);
          // Remove trailing ? if present (added by generateCallExpression)
          if (promiseExpr.endsWith('?')) {
            promiseExpr = promiseExpr.slice(0, -1);
          }
          
          // Get the parameter name from the callback
          let paramName = 'result';
          if (callback.parameters.length > 0 && ts.isIdentifier(callback.parameters[0].name)) {
            paramName = callback.parameters[0].name.getText();
          }
          
          // Generate the callback body
          let callbackBody: string;
          if (ts.isBlock(callback.body)) {
            // Block body - we'll just inline it (simplified for now)
            // TODO: Handle block statements properly
            callbackBody = 'Ok(())';
          } else {
            // Expression body
            callbackBody = this.generateExpression(callback.body);
          }
          
          // Return: { let param = promise.await?; callback_body; Ok(()) }
          return `{ let ${paramName} = ${promiseExpr}.await?; ${callbackBody}; Ok::<(), String>(()) }`;
        }
      }
      
      // String.fromCharCode -> char::from_u32().unwrap().to_string()
      if (object === 'String' && property === 'fromCharCode') {
        const args = expr.arguments.map(arg => this.generateExpression(arg));
        if (args.length === 1) {
          // Cast the entire argument expression to u32
          // This handles both simple values and arithmetic like (96.0 + x)
          return `char::from_u32((${args[0]}) as u32).unwrap_or('?').to_string()`;
        }
        // Multiple char codes - convert each to char and collect into string
        const chars = args.map((arg, i) => `char::from_u32((${arg}) as u32).unwrap_or('?')`).join(', ');
        return `vec![${chars}].iter().collect::<String>()`;
      }
      
      // String methods
      if (property === 'charAt') {
        // str.charAt(index) -> str.chars().nth(index as usize).map(|c| c.to_string()).unwrap_or_default()
        const args = expr.arguments.map(arg => this.generateExpression(arg));
        return `${object}.chars().nth((${args[0]}) as usize).map(|c| c.to_string()).unwrap_or_default()`;
      }
      
      if (property === 'startsWith' || property === 'starts_with') {
        // str.startsWith(prefix) -> str.starts_with(prefix.as_str())
        const args = expr.arguments.map(arg => {
          const argCode = this.generateExpression(arg);
          // Convert String::from("...") to "..." for starts_with
          if (argCode.startsWith('String::from(')) {
            return argCode.slice('String::from('.length, -1);
          }
          return `${argCode}.as_str()`;
        });
        return `${object}.starts_with(${args.join(', ')})`;
      }
      
      if (property === 'endsWith' || property === 'ends_with') {
        // str.endsWith(suffix) -> str.ends_with(suffix.as_str())
        const args = expr.arguments.map(arg => {
          const argCode = this.generateExpression(arg);
          // Convert String::from("...") to "..." for ends_with
          if (argCode.startsWith('String::from(')) {
            return argCode.slice('String::from('.length, -1);
          }
          return `${argCode}.as_str()`;
        });
        return `${object}.ends_with(${args.join(', ')})`;
      }
      
      if (property === 'substring') {
        // str.substring(start) -> &str[start as usize..]
        // str.substring(start, end) -> &str[start as usize..end as usize]
        const args = expr.arguments.map(arg => this.generateExpression(arg));
        if (args.length === 1) {
          return `${object}[(${args[0]}) as usize..].to_string()`;
        } else if (args.length >= 2) {
          return `${object}[(${args[0]}) as usize..(${args[1]}) as usize].to_string()`;
        }
        return object;
      }
      
      if (property === 'indexOf') {
        // str.indexOf(search) -> str.find(search).map(|i| i as f64).unwrap_or(-1.0)
        const args = expr.arguments.map(arg => this.generateExpression(arg));
        return `${object}.find(${args[0]}.as_str()).map(|i| i as f64).unwrap_or(-1.0)`;
      }
      
      // Map/HashMap methods
      if (property === 'set') {
        // map.set(key, value) -> map.insert(key, value); (returns Option<V>)
        const args = expr.arguments.map(arg => this.generateExpression(arg));
        // insert returns Option<V>, but we ignore it and return Ok(())
        return `{ ${object}.insert(${args.join(', ')}); Ok::<(), String>(()) }`;
      }
      
      if (property === 'get') {
        // map.get(key) -> map.get(&key).cloned()
        const args = expr.arguments.map(arg => this.generateExpression(arg));
        return `${object}.get(&${args[0]}).cloned()`;
      }
      
      if (property === 'has') {
        // map.has(key) -> map.contains_key(&key)
        const args = expr.arguments.map(arg => this.generateExpression(arg));
        return `${object}.contains_key(&${args[0]})`;
      }
      
      if (property === 'delete') {
        // map.delete(key) -> map.remove(&key)
        const args = expr.arguments.map(arg => this.generateExpression(arg));
        return `${object}.remove(&${args[0]})`;
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
      } else if (property === 'slice') {
        return this.generateArraySlice(objectExpr, expr.arguments);
      }
      
      // .toString() -> .to_string()
      if (property === 'toString') {
        // JavaScript: x.toString() -> Rust: x.to_string()
        // Note: to_string() returns String directly, not Result<String, E>
        return `${object}.to_string()`;
      }
      
      // Vec methods that return (), not Result
      if (property === 'push') {
        const args = expr.arguments.map(arg => this.generateExpression(arg)).join(', ');
        return `${object}.push(${args})`;
      }
    }
    
    // Check if this is a recursive call (calling the current recursive function from inside itself)
    let func = this.generateExpression(expr.expression);
    if (this.currentRecursiveFunctionName && 
        ts.isIdentifier(expr.expression) && 
        expr.expression.getText() === this.currentRecursiveFunctionName) {
      // Replace with the _clone reference
      func = `${this.currentRecursiveFunctionName}_clone.borrow().as_ref().unwrap()`;
    }
    
    // Check if this is a struct method call (when in struct wrapper or struct method)
    if ((this.inStructWrapper || this.inStructMethod) && 
        ts.isIdentifier(expr.expression) && 
        this.structMethods.has(expr.expression.getText())) {
      // Prefix with instance. or self. depending on context
      const prefix = this.inStructMethod ? 'self' : 'instance';
      func = `${prefix}.${expr.expression.getText()}`;
    }
    
    // Handle function arguments, including spread
    const args = expr.arguments.map(arg => {
      if (ts.isSpreadElement(arg)) {
        // Spread in function call: sum(...args) -> sum(args)
        // In Rust, we just pass the Vec directly
        return this.generateExpression(arg.expression);
      } else {
        let argExpr = this.generateExpression(arg);
        
        // If the argument is an identifier that's tracked as an integer variable (usize),
        // cast it to f64 for function calls since GoodScript numbers are f64
        if (ts.isIdentifier(arg) && this.integerVariables.has(arg.getText())) {
          argExpr = `${argExpr} as f64`;
        }
        
        // If this is an unwrapped Option variable, add .unwrap()
        if (ts.isIdentifier(arg)) {
          const varName = arg.getText();
          if (this.optionVariables.has(varName) && this.unwrappedOptions.has(varName)) {
            argExpr = `${argExpr}.unwrap()`;
          }
        }
        
        return argExpr;
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
   * Generate array.slice() -> Vec slice conversion
   * JavaScript: arr.slice(start, end) becomes
   * Rust: arr[start as usize..end as usize].to_vec()
   */
  private generateArraySlice(array: ts.Expression, args: readonly ts.Expression[]): string {
    const arrayCode = this.generateExpression(array);
    
    if (args.length === 0) {
      // slice() with no args clones the array
      return `${arrayCode}.clone()`;
    } else if (args.length === 1) {
      // slice(start) - from start to end
      const start = this.generateExpression(args[0]);
      return `${arrayCode}[(${start}) as usize..].to_vec()`;
    } else {
      // slice(start, end)
      const start = this.generateExpression(args[0]);
      const end = this.generateExpression(args[1]);
      return `${arrayCode}[(${start}) as usize..(${end}) as usize].to_vec()`;
    }
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
  private generatePropertyAccess(expr: ts.PropertyAccessExpression, isLValue = false): string {
    const property = this.escapeIdentifier(expr.name.getText());
    
    // In constructor body, this.field refers to local variables, not self.field
    if (this.inConstructorBody && expr.expression.kind === ts.SyntaxKind.ThisKeyword) {
      // Just use the field name as a local variable
      return property;
    }
    
    let object = this.generateExpression(expr.expression);
    
    // Check if the object itself is a property access that might be an Option
    // For example, node.prev where prev is Option<Box<CacheNode>>
    let needsUnwrap = false;
    
    // If the object is an unwrapped Option variable, add .unwrap()
    if (ts.isIdentifier(expr.expression)) {
      const varName = expr.expression.getText();
      if (this.optionVariables.has(varName) && this.unwrappedOptions.has(varName)) {
        object = `${object}.unwrap()`;
      }
    } else if (ts.isPropertyAccessExpression(expr.expression)) {
      // Check if this property access is on an Option field
      // We need to unwrap it to access nested properties
      // Use as_mut() for lvalues (assignments), as_ref() for rvalues (reads)
      needsUnwrap = true;
    }
    
    // Map JavaScript property names to Rust equivalents
    if (property === 'length') {
      // array.length -> vec.len() as f64 (for comparison with f64 loop variables)
      return `${object}.len() as f64`;
    }
    
    // Check if this is a static method call (ClassName.staticMethod)
    if (this.checker && ts.isIdentifier(expr.expression)) {
      const typeName = expr.expression.getText();
      // Only apply :: for user-defined classes (tracked in this.classes), not built-ins like String
      if (this.classes.has(typeName)) {
        return `${object}::${property}`;
      }
    }
    
    // Check if this is an enum member access (EnumName.Member -> EnumName::Member)
    if (this.checker && ts.isIdentifier(expr.expression)) {
      const symbol = this.checker.getSymbolAtLocation(expr.expression);
      if (symbol) {
        const declarations = symbol.getDeclarations();
        if (declarations && declarations.some(d => ts.isEnumDeclaration(d))) {
          // This is an enum member access - use :: instead of .
          return `${object}::${property}`;
        }
      }
    }
    
    // If we're in a generic function with trait bounds, convert property access to method calls
    // This is because trait-bounded generic types can only access trait methods, not struct fields
    if (this.inGenericFunction) {
      return `${object}.${property}()`;
    }
    
    // If we're accessing a field on self (or nested fields like self.current.value),
    // we need to clone it for non-Copy types like String
    // This is because we can't move out of &self (or &mut self)
    // But not when it's an lvalue (left-hand side of assignment)
    if (!isLValue && (object === 'self' || object.startsWith('self.'))) {
      // Clone String fields - we can detect these by type or by common field names
      let needsClone = false;
      
      if (this.checker) {
        const type = this.checker.getTypeAtLocation(expr);
        const typeStr = this.checker.typeToString(type);
        needsClone = typeStr === 'string';
      } else {
        // Fallback: clone common String field names
        needsClone = property === 'value' || property === 'input' || property === 'text' || property === 'name';
      }
      
      if (needsClone) {
        return `${object}.${property}.clone()`;
      }
    }
    
    // If we're accessing a nested property through an Option, unwrap it
    if (needsUnwrap) {
      // For lvalues, unwrap to get a mutable reference
      // For rvalues, just unwrap
      if (isLValue) {
        return `${object}.as_mut().unwrap().${property}`;
      } else {
        return `${object}.as_ref().unwrap().${property}`;
      }
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
   * Create a synthetic nominal type for a structural type (object literal)
   * Returns the struct name to use
   */
  private createSyntheticType(expr: ts.ObjectLiteralExpression, requiredTraits: Set<string> = new Set()): string {
    // Extract field information from the object literal
    const fields: Array<{ name: string; type: string }> = [];
    
    for (const prop of expr.properties) {
      if (ts.isPropertyAssignment(prop)) {
        const name = prop.name.getText();
        const rustType = this.inferRustType(prop.initializer);
        fields.push({ name, type: rustType });
      } else if (ts.isShorthandPropertyAssignment(prop)) {
        const name = prop.name.getText();
        // For shorthand, try to infer from the identifier
        const rustType = this.inferRustTypeFromIdentifier(prop.name);
        fields.push({ name, type: rustType });
      }
    }
    
    // Create a signature for this structure (sorted field names and types)
    const signature = fields
      .map(f => `${f.name}:${f.type}`)
      .sort()
      .join(',');
    
    // Check if we already have this synthetic type
    if (this.syntheticTypes.has(signature)) {
      const existing = this.syntheticTypes.get(signature)!;
      // Add any new required traits
      requiredTraits.forEach(trait => existing.traits.add(trait));
      return existing.name;
    }
    
    // Generate a unique struct name using sequential numbering
    this.syntheticTypeCounter++;
    const typeName = `AnonymousType${this.syntheticTypeCounter}`;
    
    // Store the synthetic type
    this.syntheticTypes.set(signature, {
      name: typeName,
      fields,
      traits: new Set(requiredTraits)
    });
    
    // Generate the struct definition
    this.generateSyntheticTypeDeclaration(typeName, fields, requiredTraits);
    
    return typeName;
  }
  
  /**
   * Generate the Rust code for a synthetic type
   */
  private generateSyntheticTypeDeclaration(
    typeName: string,
    fields: Array<{ name: string; type: string }>,
    traits: Set<string>
  ): void {
    const lines: string[] = [];
    
    // Generate struct
    lines.push(`#[derive(Clone)]`);
    lines.push(`struct ${typeName} {`);
    for (const field of fields) {
      lines.push(`    ${field.name}: ${field.type},`);
    }
    lines.push(`}`);
    lines.push('');
    
    // Generate inherent impl (for field access via methods)
    lines.push(`impl ${typeName} {`);
    for (const field of fields) {
      lines.push(`    fn ${field.name}(&self) -> ${field.type} {`);
      lines.push(`        self.${field.name}.clone()`);
      lines.push(`    }`);
    }
    lines.push(`}`);
    lines.push('');
    
    // Auto-detect which traits this type can implement based on its fields
    const implementableTraits = this.findImplementableTraits(fields);
    
    // Generate trait implementations for both explicitly requested and auto-detected traits
    const allTraits = new Set([...traits, ...implementableTraits]);
    
    for (const traitName of allTraits) {
      const traitFields = this.interfaceTraits.get(traitName);
      if (!traitFields) {
        continue;  // Skip if we don't know about this trait
      }
      
      // Check if this type has all the required fields for this trait
      const canImplement = traitFields.every(requiredField => 
        fields.some(f => f.name === requiredField.name && f.type === requiredField.type)
      );
      
      if (canImplement) {
        lines.push(`impl ${traitName} for ${typeName} {`);
        for (const requiredField of traitFields) {
          lines.push(`    fn ${requiredField.name}(&self) -> ${requiredField.type} {`);
          lines.push(`        self.${requiredField.name}.clone()`);
          lines.push(`    }`);
        }
        lines.push(`}`);
        lines.push('');
      }
    }
    
    this.syntheticTypeDeclarations.push(...lines);
  }
  
  /**
   * Find which traits a synthetic type can implement based on its fields
   * Returns trait names that match the type's field signature
   */
  private findImplementableTraits(fields: Array<{ name: string; type: string }>): string[] {
    const implementable: string[] = [];
    
    // Check each known trait to see if this type has all required fields
    for (const [traitName, traitFields] of this.interfaceTraits) {
      const hasAllFields = traitFields.every(requiredField =>
        fields.some(f => f.name === requiredField.name && f.type === requiredField.type)
      );
      
      if (hasAllFields) {
        implementable.push(traitName);
      }
    }
    
    return implementable;
  }
  
  /**
   * Infer Rust type from a TypeScript expression
   */
  private inferRustType(expr: ts.Expression): string {
    if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
      return 'String';
    }
    if (ts.isNumericLiteral(expr)) {
      return 'f64';
    }
    if (expr.kind === ts.SyntaxKind.TrueKeyword || expr.kind === ts.SyntaxKind.FalseKeyword) {
      return 'bool';
    }
    if (ts.isArrayLiteralExpression(expr)) {
      // Try to infer element type
      if (expr.elements.length > 0) {
        const elementType = this.inferRustType(expr.elements[0]);
        return `Vec<${elementType}>`;
      }
      return 'Vec<String>'; // Default
    }
    
    // Try using type checker if available
    if (this.checker) {
      const type = this.checker.getTypeAtLocation(expr);
      if (type) {
        return this.mapTypeScriptTypeToRust(type);
      }
    }
    
    return 'String'; // Default fallback
  }
  
  /**
   * Infer Rust type from an identifier (for shorthand properties)
   */
  private inferRustTypeFromIdentifier(identifier: ts.Identifier): string {
    if (this.checker) {
      const symbol = this.checker.getSymbolAtLocation(identifier);
      if (symbol && symbol.valueDeclaration) {
        const type = this.checker.getTypeOfSymbolAtLocation(symbol, identifier);
        return this.mapTypeScriptTypeToRust(type);
      }
    }
    return 'String'; // Default fallback
  }
  
  /**
   * Map TypeScript type to Rust type
   */
  private mapTypeScriptTypeToRust(type: ts.Type): string {
    const typeStr = this.checker?.typeToString(type) || '';
    
    if (typeStr === 'string') return 'String';
    if (typeStr === 'number') return 'f64';
    if (typeStr === 'boolean') return 'bool';
    if (typeStr.startsWith('string[]') || typeStr.includes('Array<string>')) return 'Vec<String>';
    if (typeStr.startsWith('number[]') || typeStr.includes('Array<number>')) return 'Vec<f64>';
    
    return 'String'; // Default
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
        const symbolName = contextualType.symbol.name;
        // Skip TypeScript's internal anonymous object type marker
        if (symbolName !== '__object' && symbolName !== '__type') {
          structName = symbolName;
        }
      }
    }
    
    // If we have a struct name, use the typed version
    if (structName) {
      return this.generateObjectLiteralWithType(expr, structName);
    }
    
    // No contextual type - create a synthetic nominal type for this structural type
    // Determine if this object literal needs to implement any traits
    // (This happens when used as argument to generic functions with trait bounds)
    const requiredTraits = this.inferRequiredTraits(expr);
    
    const syntheticTypeName = this.createSyntheticType(expr, requiredTraits);
    
    // Now generate the object literal using the synthetic type
    return this.generateObjectLiteralWithType(expr, syntheticTypeName);
  }
  
  /**
   * Infer which traits an object literal needs to implement based on its usage context
   */
  private inferRequiredTraits(expr: ts.ObjectLiteralExpression): Set<string> {
    const traits = new Set<string>();
    
    if (!this.checker) {
      return traits;
    }
    
    // Get the parent node to understand usage context
    const parent = expr.parent;
    
    // Check if it's being passed as an argument to a function
    if (ts.isCallExpression(parent)) {
      const callExpr = parent;
      const signature = this.checker.getResolvedSignature(callExpr);
      
      if (signature) {
        const argIndex = callExpr.arguments.indexOf(expr);
        if (argIndex >= 0 && argIndex < signature.parameters.length) {
          const param = signature.parameters[argIndex];
          const paramType = this.checker.getTypeOfSymbolAtLocation(param, param.valueDeclaration!);
          
          // Check if parameter has a constraint (trait bound)
          if (paramType && paramType.symbol && paramType.symbol.declarations) {
            for (const decl of paramType.symbol.declarations) {
              if (ts.isTypeParameterDeclaration(decl) && decl.constraint) {
                if (ts.isTypeReferenceNode(decl.constraint)) {
                  const traitName = decl.constraint.typeName.getText() + 'Trait';
                  traits.add(traitName);
                }
              }
            }
          }
        }
      }
    }
    
    return traits;
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
    
    // Handle common constructors that don't return Result
    if (type === 'Map') {
      this.addImport('use std::collections::HashMap;');
      return 'HashMap::new()';
    } else if (type === 'Set') {
      this.addImport('use std::collections::HashSet;');
      return 'HashSet::new()';
    } else if (type === 'Array') {
      // new Array<T>() -> Vec<T>::new()
      return 'Vec::new()';
    }
    
    // For class constructors, check parameter types and wrap arguments if needed
    let args = '';
    if (expr.arguments && this.checker && ts.isIdentifier(expr.expression)) {
      const className = expr.expression.text;
      const classInfo = this.classes.get(className);
      
      if (classInfo && classInfo.constructor && classInfo.constructor.parameters.length > 0) {
        // Wrap arguments based on parameter types
        const wrappedArgs = expr.arguments.map((arg, index) => {
          let argCode = this.generateExpression(arg);
          
          if (index < classInfo.constructor!.parameters.length) {
            const param = classInfo.constructor!.parameters[index];
            const paramType = param.type;
            
            // If parameter is Unique<T>, wrap the argument in Box::new()
            // But only if the argument isn't already a Unique type itself
            if (paramType && ts.isTypeReferenceNode(paramType) && 
                paramType.typeName.getText() === 'Unique') {
              
              // Check if the argument is a simple identifier that might be a Unique parameter
              // If so, check the enclosing function's parameters
              let argAlreadyUnique = argCode.startsWith('Box::new(');
              
              if (!argAlreadyUnique && ts.isIdentifier(arg) && this.checker) {
                // Check if this identifier refers to a Unique parameter
                const symbol = this.checker.getSymbolAtLocation(arg);
                if (symbol && symbol.valueDeclaration && ts.isParameter(symbol.valueDeclaration)) {
                  const paramType = symbol.valueDeclaration.type;
                  if (paramType && ts.isTypeReferenceNode(paramType) && 
                      paramType.typeName.getText() === 'Unique') {
                    argAlreadyUnique = true;
                  }
                }
              }
              
              // Only wrap if not already Unique
              if (!argAlreadyUnique) {
                argCode = `Box::new(${argCode})`;
              }
            }
          }
          
          return argCode;
        });
        
        args = wrappedArgs.join(', ');
      } else {
        args = expr.arguments.map(arg => this.generateExpression(arg)).join(', ');
      }
    } else if (expr.arguments) {
      args = expr.arguments.map(arg => this.generateExpression(arg)).join(', ');
    }
    
    // All class constructors return Result<Self, String>, so add ?
    return `${type}::new(${args})?`;
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
      return `String::from("${this.escapeRustString(text)}")`;
    }
    
    // Template literal with substitutions: `head${expr1}mid${expr2}tail`
    // Build format string and collect expressions
    let formatStr = expr.head.text;
    const expressions: string[] = [];
    
    for (const span of expr.templateSpans) {
      // Add placeholder for this expression
      formatStr += '{}';
      
      // Generate the expression
      let exprCode = this.generateExpression(span.expression);
      
      // If the expression is a variable that's an Option type, unwrap it
      // This is safe because we're inside a null-check (if opt !== null)
      if (ts.isIdentifier(span.expression)) {
        const varName = span.expression.getText();
        if (this.optionVariables.has(varName)) {
          exprCode = `${exprCode}.unwrap()`;
        }
      }
      
      expressions.push(exprCode);
      
      // Add the literal text after the expression
      formatStr += span.literal.text;
    }
    
    if (expressions.length === 0) {
      return `String::from("${this.escapeRustString(formatStr)}")`;
    } else {
      return `format!("${this.escapeRustString(formatStr)}", ${expressions.join(', ')})`;
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
  private generateElementAccess(expr: ts.ElementAccessExpression, isLValue = false): string {
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
      const index = this.generateExpression(expr.argumentExpression);
      
      // If it's clearly numeric context (in integerVariables), use without cast
      if (this.integerVariables.has(varName)) {
        // Don't add .clone() for lvalues (left-hand side of assignment)
        return isLValue ? `${object}[${index}]` : `${object}[${index}].clone()`;
      }
      
      // Default: assume it might be f64, cast to usize for array indexing
      return isLValue ? `${object}[${index} as usize]` : `${object}[${index} as usize].clone()`;
    }
    
    // Numeric literal - use as integer
    if (ts.isNumericLiteral(expr.argumentExpression)) {
      const index = this.generateExpression(expr.argumentExpression, true);
      return isLValue ? `${object}[${index}]` : `${object}[${index}].clone()`;
    }
    
    // Complex expression (arithmetic, etc.) - generate and wrap entire expression in cast
    const index = this.generateExpression(expr.argumentExpression);
    
    // If the index already contains \"as usize\", don't double-cast
    if (index.includes(' as usize')) {
      return isLValue ? `${object}[${index}]` : `${object}[${index}].clone()`;
    }
    
    // If it's a simple integer, use directly
    if (/^\d+$/.test(index)) {
      return isLValue ? `${object}[${index}]` : `${object}[${index}].clone()`;
    }
    
    // Otherwise wrap the entire expression in usize cast
    return isLValue ? `${object}[(${index}) as usize]` : `${object}[(${index}) as usize].clone()`;
  }

  /**
   * Check if a Rust type is a primitive or already heap-allocated
   * Returns true for types that don't need Box wrapping inside Option
   */
  private isPrimitiveOrHeapType(rustType: string): boolean {
    // Primitive types
    if (['f64', 'i32', 'i64', 'u32', 'u64', 'bool', 'String', '()'].includes(rustType)) {
      return true;
    }
    
    // Heap-allocated types (already have indirection)
    if (rustType.startsWith('Vec<') || 
        rustType.startsWith('HashMap<') || 
        rustType.startsWith('HashSet<') ||
        rustType.startsWith('Box<') ||
        rustType.startsWith('Rc<') ||
        rustType.startsWith('Arc<') ||
        rustType.startsWith('Option<')) {
      return true;
    }
    
    // Everything else (structs, enums, etc.) needs Box wrapping
    return false;
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
        } else if (rustType.startsWith('HashMap<')) {
          return 'HashMap::new()';
        } else if (rustType.startsWith('HashSet<')) {
          return 'HashSet::new()';
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
