/**
 * Lowering: TypeScript AST → IR
 * 
 * Converts TypeScript AST to our IR representation
 */

import ts from 'typescript';
import type { IRModule, IRProgram, IRDeclaration, IRExpr, IRType, IRBlock, IRInstruction, IRTerminator, IRStatement, IRFunctionBody, IRExpression } from '../ir/types.js';
import { BinaryOp, UnaryOp, Ownership, PrimitiveType } from '../ir/types.js';
import { IRBuilder, types, expr, stmts } from '../ir/builder.js';

export class IRLowering {
  private builder = new IRBuilder();
  private typeChecker!: ts.TypeChecker;
  private declaredVariables = new Set<string>();
  private currentFunctionIsAsync = false;

  lower(program: ts.Program): IRProgram {
    this.typeChecker = program.getTypeChecker();
    const modules: IRModule[] = [];

    for (const sourceFile of program.getSourceFiles()) {
      if (!sourceFile.isDeclarationFile) {
        modules.push(this.lowerModule(sourceFile));
      }
    }

    return { modules };
  }

  private lowerModule(sourceFile: ts.SourceFile): IRModule {
    this.builder.resetVersions();
    this.declaredVariables.clear();
    const declarations: IRDeclaration[] = [];
    const initStatements: IRStatement[] = [];
    
    ts.forEachChild(sourceFile, (node) => {
      const decl = this.lowerDeclaration(node, sourceFile);
      if (decl) {
        declarations.push(decl);
      } else if (ts.isStatement(node)) {
        // Handle all top-level statements (not just expression statements)
        const stmt = this.lowerStatementAST(node, sourceFile);
        if (stmt) {
          initStatements.push(stmt);
        }
      }
    });

    return {
      path: sourceFile.fileName,
      declarations,
      imports: [],
      initStatements: initStatements.length > 0 ? initStatements : undefined,
    };
  }

  private lowerDeclaration(node: ts.Node, sourceFile: ts.SourceFile): IRDeclaration | null {
    if (ts.isVariableStatement(node)) {
      const decl = node.declarationList.declarations[0];
      if (!decl) return null;

      const name = decl.name.getText(sourceFile);
      const init = decl.initializer ? this.lowerExpr(decl.initializer, sourceFile) : null;

      if (!init) return null;

      // Prefer explicit type annotation, fall back to initializer's type
      const type = decl.type ? this.lowerTypeNode(decl.type, sourceFile) : init.type;

      return {
        kind: 'const',
        name,
        type,
        value: init,
      };
    }

    if (ts.isFunctionDeclaration(node)) {
      return this.lowerFunction(node, sourceFile);
    }

    if (ts.isClassDeclaration(node)) {
      return this.lowerClass(node, sourceFile);
    }

    return null;
  }

  private lowerFunction(node: ts.FunctionDeclaration, sourceFile: ts.SourceFile): IRDeclaration | null {
    const name = node.name?.getText(sourceFile);
    if (!name) return null;

    const params = node.parameters.map(p => ({
      name: p.name.getText(sourceFile),
      type: this.lowerTypeNode(p.type, sourceFile),
    }));

    const returnType = this.lowerTypeNode(node.type, sourceFile);
    const async = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
    
    // Set async context before lowering body
    const previousAsync = this.currentFunctionIsAsync;
    this.currentFunctionIsAsync = async;
    const body = node.body ? this.lowerFunctionBody(node.body, sourceFile) : this.builder.functionBody([]);
    this.currentFunctionIsAsync = previousAsync;

    return {
      kind: 'function',
      name,
      params,
      returnType,
      body,
      async,
    };
  }

  private lowerClass(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): IRDeclaration | null {
    const name = node.name?.getText(sourceFile);
    if (!name) return null;

    const fields: Array<{ name: string; type: IRType; isReadonly: boolean }> = [];
    const methods: Array<{ name: string; params: { name: string; type: IRType }[]; returnType: IRType; body: IRFunctionBody; isStatic: boolean }> = [];

    for (const member of node.members) {
      if (ts.isPropertyDeclaration(member)) {
        const fieldName = member.name.getText(sourceFile);
        const fieldType = this.lowerTypeNode(member.type, sourceFile);
        const isReadonly = member.modifiers?.some(m => m.kind === ts.SyntaxKind.ReadonlyKeyword) ?? false;
        fields.push({ name: fieldName, type: fieldType, isReadonly });
      } else if (ts.isMethodDeclaration(member)) {
        const method = this.lowerMethod(member, sourceFile);
        if (method) methods.push(method);
      }
    }

    return {
      kind: 'class',
      name,
      fields,
      methods,
      constructor: undefined,
    };
  }

  private lowerMethod(node: ts.MethodDeclaration, sourceFile: ts.SourceFile): { name: string; params: { name: string; type: IRType }[]; returnType: IRType; body: IRFunctionBody; async?: boolean; isStatic: boolean } | null {
    const name = node.name.getText(sourceFile);
    
    const params = node.parameters.map(p => ({
      name: p.name.getText(sourceFile),
      type: this.lowerTypeNode(p.type, sourceFile),
    }));

    const returnType = this.lowerTypeNode(node.type, sourceFile);
    const body = node.body ? this.lowerFunctionBody(node.body, sourceFile) : this.builder.functionBody([]);
    const isStatic = node.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword) ?? false;
    const async = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;

    return {
      name,
      params,
      returnType,
      body,
      async,
      isStatic,
    };
  }

  /**
   * Lower a function body to AST-level IR statements
   */
  private lowerFunctionBody(node: ts.Block, sourceFile: ts.SourceFile): IRFunctionBody {
    const statements: IRStatement[] = [];
    
    for (const stmt of node.statements) {
      const irStmt = this.lowerStatementAST(stmt, sourceFile);
      if (irStmt) {
        statements.push(irStmt);
      }
    }

    return this.builder.functionBody(statements);
  }

  /**
   * Lower a TypeScript statement to AST-level IR statement
   */
  private lowerStatementAST(node: ts.Statement, sourceFile: ts.SourceFile): IRStatement | null {
    // Variable declaration
    if (ts.isVariableStatement(node)) {
      const decl = node.declarationList.declarations[0];
      if (!decl) return null;

      const name = decl.name.getText(sourceFile);
      const type = this.lowerType(decl, sourceFile);
      const initializer = decl.initializer ? this.lowerExpression(decl.initializer, sourceFile) : undefined;
      
      // Mark this variable as declared
      this.declaredVariables.add(name);

      return stmts.variableDeclaration(name, type, initializer);
    }

    // Return statement
    if (ts.isReturnStatement(node)) {
      let value = node.expression ? this.lowerExpression(node.expression, sourceFile) : undefined;
      
      // In async functions, unwrap Promise.resolve(x) to just x
      // and convert Promise.reject(x) to throw x
      if (this.currentFunctionIsAsync && value && node.expression && ts.isCallExpression(node.expression)) {
        const call = node.expression;
        if (ts.isPropertyAccessExpression(call.expression) &&
            ts.isIdentifier(call.expression.expression) &&
            call.expression.expression.text === 'Promise') {
          const method = call.expression.name.text;
          
          if (method === 'resolve') {
            // Promise.resolve(x) -> return x
            if (call.arguments.length > 0) {
              value = this.lowerExpression(call.arguments[0], sourceFile);
            } else {
              value = undefined; // Promise.resolve() with no args
            }
          } else if (method === 'reject') {
            // Promise.reject(x) -> throw x
            if (call.arguments.length > 0) {
              const error = this.lowerExpression(call.arguments[0], sourceFile);
              return stmts.throw(error);
            }
          }
        }
      }
      
      return stmts.return(value);
    }

    // Throw statement
    if (ts.isThrowStatement(node)) {
      const expression = node.expression 
        ? this.lowerExpression(node.expression, sourceFile) 
        : { kind: 'literal' as const, value: null, type: types.void() };
      return stmts.throw(expression);
    }

    // Try statement
    if (ts.isTryStatement(node)) {
      const tryBlock = node.tryBlock.statements.map(s => this.lowerStatementAST(s, sourceFile)).filter((s): s is IRStatement => s !== null);
      
      let catchClause: { variable: string; variableType: IRType; body: IRStatement[] } | undefined;
      if (node.catchClause) {
        const catchVar = node.catchClause.variableDeclaration?.name.getText(sourceFile) || 'error';
        const catchVarType = types.class('Error', Ownership.Own); // TODO: Get actual type
        const catchBody = node.catchClause.block.statements.map(s => this.lowerStatementAST(s, sourceFile)).filter((s): s is IRStatement => s !== null);
        catchClause = {
          variable: catchVar,
          variableType: catchVarType,
          body: catchBody,
        };
      }

      const finallyBlock = node.finallyBlock 
        ? node.finallyBlock.statements.map(s => this.lowerStatementAST(s, sourceFile)).filter((s): s is IRStatement => s !== null)
        : undefined;

      return stmts.try(tryBlock, catchClause, finallyBlock);
    }

    // Expression statement
    if (ts.isExpressionStatement(node)) {
      // Handle assignments specially (result = "value")
      if (ts.isBinaryExpression(node.expression) && 
          node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        const left = this.lowerExpr(node.expression.left, sourceFile);
        const right = this.lowerExpression(node.expression.right, sourceFile);
        
        if (left.kind === 'variable') {
          // Simple variable assignment
          return {
            kind: 'assignment',
            target: left.name,
            value: right,
          };
        }
        // Fall through for complex assignments (property, index)
      }
      
      const expression = this.lowerExpression(node.expression, sourceFile);
      return stmts.expressionStatement(expression);
    }

    // If statement
    if (ts.isIfStatement(node)) {
      const condition = this.lowerExpression(node.expression, sourceFile);
      const thenBranch = [this.lowerStatementAST(node.thenStatement, sourceFile)].filter((s): s is IRStatement => s !== null);
      const elseBranch = node.elseStatement 
        ? [this.lowerStatementAST(node.elseStatement, sourceFile)].filter((s): s is IRStatement => s !== null)
        : undefined;
      return stmts.if(condition, thenBranch, elseBranch);
    }

    // Block statement
    if (ts.isBlock(node)) {
      const blockStmts = node.statements.map(s => this.lowerStatementAST(s, sourceFile)).filter((s): s is IRStatement => s !== null);
      return stmts.block(blockStmts);
    }

    // For-of statement
    if (ts.isForOfStatement(node)) {
      // Get the loop variable
      const varDecl = node.initializer;
      let varName: string;
      let varType: IRType;
      
      if (ts.isVariableDeclarationList(varDecl)) {
        const decl = varDecl.declarations[0];
        varName = decl.name.getText(sourceFile);
        varType = this.lowerType(decl, sourceFile);
        
        // Mark variable as declared
        this.declaredVariables.add(varName);
      } else {
        // Shouldn't happen for valid for-of
        return null;
      }
      
      // Get the iterable expression
      const iterable = this.lowerExpression(node.expression, sourceFile);
      
      // Get the body
      const body = ts.isBlock(node.statement)
        ? node.statement.statements.map(s => this.lowerStatementAST(s, sourceFile)).filter((s): s is IRStatement => s !== null)
        : [this.lowerStatementAST(node.statement, sourceFile)].filter((s): s is IRStatement => s !== null);
      
      return stmts.forOf(varName, varType, iterable, body);
    }

    // Break statement
    if (ts.isBreakStatement(node)) {
      return stmts.break();
    }

    // Continue statement
    if (ts.isContinueStatement(node)) {
      return stmts.continue();
    }

    return null;
  }

  /**
   * Lower a TypeScript expression to AST-level IR expression
   */
  private lowerExpression(node: ts.Expression, sourceFile: ts.SourceFile): IRExpression {
    // For now, delegate to lowerExpr and convert SSA IRExpr to AST IRExpression
    // This is a temporary bridge - we'll eventually have separate implementations
    const ssaExpr = this.lowerExpr(node, sourceFile);
    return this.convertExprToExpression(ssaExpr);
  }

  /**
   * Convert SSA-level IRExpr to AST-level IRExpression
   * Temporary helper during transition period
   */
  private convertExprToExpression(ssaExpr: IRExpr): IRExpression {
    switch (ssaExpr.kind) {
      case 'literal':
        return {
          kind: 'literal',
          value: ssaExpr.value,
          type: ssaExpr.type,
        };
      
      case 'variable':
        return {
          kind: 'identifier',
          name: ssaExpr.name,
          type: ssaExpr.type,
        };
      
      case 'binary':
        return {
          kind: 'binary',
          operator: ssaExpr.op,
          left: this.convertExprToExpression(ssaExpr.left),
          right: this.convertExprToExpression(ssaExpr.right),
          type: ssaExpr.type,
        };
      
      case 'unary':
        // Check if this is an await expression
        if (ssaExpr.op === UnaryOp.Await) {
          return {
            kind: 'await',
            expression: this.convertExprToExpression(ssaExpr.operand),
            type: ssaExpr.type,
          };
        }
        return {
          kind: 'unary',
          operator: ssaExpr.op,
          operand: this.convertExprToExpression(ssaExpr.operand),
          type: ssaExpr.type,
        };
      
      case 'callExpr':
        return {
          kind: 'call',
          callee: this.convertExprToExpression(ssaExpr.callee),
          arguments: ssaExpr.args.map((arg: IRExpr) => this.convertExprToExpression(arg)),
          type: ssaExpr.type,
        };
      
      case 'member':
        return {
          kind: 'memberAccess',
          object: this.convertExprToExpression(ssaExpr.object),
          member: ssaExpr.member,
          optional: ssaExpr.optional,  // preserve optional chaining flag
          type: ssaExpr.type,
        };
      
      case 'index':
        return {
          kind: 'indexAccess',
          object: this.convertExprToExpression(ssaExpr.object),
          index: this.convertExprToExpression(ssaExpr.index),
          type: ssaExpr.type,
        };
      
      case 'array':
        return {
          kind: 'arrayLiteral',
          elements: ssaExpr.elements.map((el: IRExpr) => this.convertExprToExpression(el)),
          type: ssaExpr.type,
        };
      
      case 'object':
        return {
          kind: 'objectLiteral',
          properties: ssaExpr.properties.map((prop: { key: string; value: IRExpr }) => ({
            key: prop.key,
            value: this.convertExprToExpression(prop.value),
          })),
          type: ssaExpr.type,
        };
      
      case 'new':
        return {
          kind: 'newExpression',
          className: ssaExpr.className,
          arguments: ssaExpr.args.map((arg: IRExpr) => this.convertExprToExpression(arg)),
          type: ssaExpr.type,
        };
      
      case 'conditional':
        return {
          kind: 'conditional',
          condition: this.convertExprToExpression(ssaExpr.condition),
          thenExpr: this.convertExprToExpression(ssaExpr.whenTrue),
          elseExpr: this.convertExprToExpression(ssaExpr.whenFalse),
          type: ssaExpr.type,
        };
      
      case 'lambda':
        // Lambda keeps its IRBlock body (SSA-level) even in AST context
        // This is fine since lambdas are self-contained
        return {
          kind: 'lambda',
          params: ssaExpr.params,
          body: ssaExpr.body,
          captures: ssaExpr.captures,
          type: ssaExpr.type,
        };
      
      case 'methodCall':
        // Convert method call to regular call with memberAccess callee
        return {
          kind: 'call',
          callee: {
            kind: 'memberAccess',
            object: this.convertExprToExpression(ssaExpr.object),
            member: ssaExpr.method,
            type: types.void(), // TODO: proper type for method reference
          },
          arguments: ssaExpr.args.map((arg: IRExpr) => this.convertExprToExpression(arg)),
          type: ssaExpr.type,
        };
      
      default:
        // For other expression types, create a placeholder
        return {
          kind: 'literal',
          value: null,
          type: types.void(),
        };
    }
  }

  /**
   * Lower SSA block (for backward compatibility)
   * TODO: Phase out once we convert AST-level statements to SSA blocks
   */
  private lowerBlock(node: ts.Block, sourceFile: ts.SourceFile): IRBlock {
    const instructions: IRInstruction[] = [];
    let terminator: IRTerminator = { kind: 'return', value: undefined };
    
    for (const stmt of node.statements) {
      // Check if this is a return statement
      if (ts.isReturnStatement(stmt)) {
        const returnValue = stmt.expression ? this.lowerExpr(stmt.expression, sourceFile) : undefined;
        terminator = { kind: 'return', value: returnValue };
        break; // No more statements after return
      }
      
      // Check if this is a throw statement
      if (ts.isThrowStatement(stmt)) {
        // For now, treat throw like return (terminates the block)
        // In the future, this needs proper exception handling IR
        if (stmt.expression) {
          this.lowerExpr(stmt.expression, sourceFile); // Evaluate expression but don't use yet
        }
        // TODO: Add proper throw terminator or instruction
        // For now, just skip the throw statement to prevent empty bodies
        console.warn('Warning: throw statement not yet implemented in IR');
        continue;
      }
      
      // Check if this is a try statement
      if (ts.isTryStatement(stmt)) {
        // For now, lower the try block contents directly
        // In the future, need proper exception handling IR
        console.warn('Warning: try/catch statement not yet fully implemented in IR');
        
        // Lower try block
        for (const tryStmt of stmt.tryBlock.statements) {
          if (ts.isReturnStatement(tryStmt)) {
            const returnValue = tryStmt.expression ? this.lowerExpr(tryStmt.expression, sourceFile) : undefined;
            terminator = { kind: 'return', value: returnValue };
            break;
          }
          const instr = this.lowerStatement(tryStmt, sourceFile);
          if (instr) instructions.push(instr);
        }
        
        // TODO: Handle catch clause and finally block properly
        continue;
      }
      
      const instr = this.lowerStatement(stmt, sourceFile);
      if (instr) instructions.push(instr);
    }

    return this.builder.block(instructions, terminator);
  }

  private lowerStatement(node: ts.Statement, sourceFile: ts.SourceFile): IRInstruction | null {
    if (ts.isVariableStatement(node)) {
      const decl = node.declarationList.declarations[0];
      if (!decl || !decl.initializer) return null;

      const name = decl.name.getText(sourceFile);
      const type = this.lowerType(decl, sourceFile);
      const value = this.lowerExpr(decl.initializer, sourceFile);
      const variable = this.builder.variable(name, type);
      
      // Mark this variable as declared
      this.declaredVariables.add(name);

      return {
        kind: 'assign',
        target: variable,
        value,
        type,
        isDeclaration: true,
      };
    }

    if (ts.isExpressionStatement(node)) {
      // Check for assignment expressions (=, +=, -=, etc.)
      if (ts.isBinaryExpression(node.expression)) {
        const op = node.expression.operatorToken.kind;
        
        // Simple assignment: y = value
        if (op === ts.SyntaxKind.EqualsToken) {
          const target = this.lowerExpr(node.expression.left, sourceFile);
          const value = this.lowerExpr(node.expression.right, sourceFile);
          
          // Handle different assignment targets
          if (target.kind === 'variable') {
            const isReassignment = this.declaredVariables.has(target.name);
            
            return {
              kind: 'assign',
              target,
              value,
              type: value.type,
              isDeclaration: !isReassignment,
            };
          } else if (target.kind === 'index') {
            // Array index assignment: arr[index] = value
            return {
              kind: 'indexAssign',
              object: target.object,
              index: target.index,
              value,
            };
          } else if (target.kind === 'member') {
            // Property assignment: obj.prop = value or arr.length = value
            return {
              kind: 'memberAssign',
              object: target.object,
              member: target.member,
              value,
            };
          } else {
            throw new Error('Assignment target must be a variable, property, or array element');
          }
        }
        
        // Compound assignments: +=, -=, *=, /=, %=
        const compoundOp = this.getCompoundAssignmentOp(op);
        if (compoundOp) {
          const target = this.lowerExpr(node.expression.left, sourceFile);
          const right = this.lowerExpr(node.expression.right, sourceFile);
          
          // Handle different assignment targets
          if (target.kind === 'variable') {
            // Convert y += x to y = y + x
            const value = expr.binary(compoundOp, target, right, target.type);
            
            return {
              kind: 'assign',
              target,
              value,
              type: target.type,
              isDeclaration: false,
            };
          } else if (target.kind === 'index') {
            // Convert arr[i] += x to arr[i] = arr[i] + x
            const value = expr.binary(compoundOp, target, right, target.type);
            return {
              kind: 'indexAssign',
              object: target.object,
              index: target.index,
              value,
            };
          } else if (target.kind === 'member') {
            // Convert obj.prop += x to obj.prop = obj.prop + x
            const value = expr.binary(compoundOp, target, right, target.type);
            return {
              kind: 'memberAssign',
              object: target.object,
              member: target.member,
              value,
            };
          } else {
            throw new Error('Compound assignment target must be a variable, property, or array element');
          }
        }
      }
      
      // Check for postfix increment/decrement: y++, y--
      if (ts.isPostfixUnaryExpression(node.expression)) {
        const target = this.lowerExpr(node.expression.operand, sourceFile);
        
        if (target.kind !== 'variable') {
          throw new Error('Increment/decrement target must be a variable');
        }
        
        const op = node.expression.operator === ts.SyntaxKind.PlusPlusToken 
          ? BinaryOp.Add 
          : BinaryOp.Sub;
        const one = expr.literal(1, types.number());
        const value = expr.binary(op, target, one, target.type);
        
        return {
          kind: 'assign',
          target,
          value,
          type: target.type,
          isDeclaration: false,
        };
      }
      
      // Check for prefix increment/decrement in statement position: ++y, --y
      if (ts.isPrefixUnaryExpression(node.expression)) {
        const op = node.expression.operator;
        if (op === ts.SyntaxKind.PlusPlusToken || op === ts.SyntaxKind.MinusMinusToken) {
          const target = this.lowerExpr(node.expression.operand, sourceFile);
          
          if (target.kind !== 'variable') {
            throw new Error('Increment/decrement target must be a variable');
          }
          
          const binaryOp = op === ts.SyntaxKind.PlusPlusToken ? BinaryOp.Add : BinaryOp.Sub;
          const one = expr.literal(1, types.number());
          const value = expr.binary(binaryOp, target, one, target.type);
          
          return {
            kind: 'assign',
            target,
            value,
            type: target.type,
            isDeclaration: false,
          };
        }
      }
      
      const value = this.lowerExpr(node.expression, sourceFile);
      return {
        kind: 'expr',
        value,
      };
    }

    // If statements are handled at block level, not as instructions
    // They generate multiple blocks with branch terminators
    if (ts.isIfStatement(node)) {
      // TODO: Implement if/else lowering with block generation
      // For now, return null and handle at a higher level
      return null;
    }

    return null;
  }

  private lowerExpr(node: ts.Expression, sourceFile: ts.SourceFile): IRExpr {
    // Literals
    if (ts.isNumericLiteral(node)) {
      return expr.literal(parseFloat(node.text), types.number());
    }

    if (ts.isStringLiteral(node)) {
      return expr.literal(node.text, types.string());
    }

    // Template literals (e.g., `Hello, ${name}!`)
    if (ts.isTemplateExpression(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      return this.lowerTemplateExpression(node, sourceFile);
    }

    if (node.kind === ts.SyntaxKind.TrueKeyword) {
      return expr.literal(true, types.boolean());
    }

    if (node.kind === ts.SyntaxKind.FalseKeyword) {
      return expr.literal(false, types.boolean());
    }

    if (node.kind === ts.SyntaxKind.NullKeyword) {
      return expr.literal(null, types.nullable(types.void()));
    }

    if (node.kind === ts.SyntaxKind.UndefinedKeyword) {
      // In C++, undefined is represented as nullptr (same as null)
      return expr.literal(null, types.void());
    }

    // Binary expressions
    if (ts.isBinaryExpression(node)) {
      return this.lowerBinaryExpr(node, sourceFile);
    }

    // Unary expressions
    if (ts.isPrefixUnaryExpression(node)) {
      return this.lowerUnaryExpr(node, sourceFile);
    }

    // Typeof expression
    if (ts.isTypeOfExpression(node)) {
      const operand = this.lowerExpr(node.expression, sourceFile);
      return expr.unary(UnaryOp.Typeof, operand, types.string());
    }

    // Await expression
    if (ts.isAwaitExpression(node)) {
      const expression = this.lowerExpr(node.expression, sourceFile);
      // Extract the result type from Promise<T>
      let resultType = types.void();
      if (expression.type.kind === 'promise') {
        resultType = expression.type.resultType;
      }
      // For SSA-level, we'll use unary operator for now
      // TODO: Add proper await IR expression kind
      return expr.unary(UnaryOp.Await, expression, resultType);
    }

    // Variable reference
    if (ts.isIdentifier(node)) {
      const name = node.text;
      
      // Handle undefined as a special literal (it's an identifier in TypeScript, not a keyword)
      if (name === 'undefined') {
        return expr.literal(null, types.void());
      }
      
      const type = this.inferType(node);
      return expr.variable(name, 0, type);
    }

    // Call expression
    if (ts.isCallExpression(node)) {
      return this.lowerCallExpr(node, sourceFile);
    }

    // Property access (including optional chaining)
    if (ts.isPropertyAccessExpression(node)) {
      const object = this.lowerExpr(node.expression, sourceFile);
      const property = node.name.text;
      const type = this.inferType(node);
      const optional = !!node.questionDotToken;  // true for optional chaining (obj?.field)
      return expr.fieldAccess(object, property, type, optional);
    }

    // Array literal
    if (ts.isArrayLiteralExpression(node)) {
      const elements = node.elements.map(el => this.lowerExpr(el, sourceFile));
      
      // For arrays, prefer contextual type (from return type, assignment, etc.)
      // This handles empty arrays correctly
      const contextualType = this.typeChecker.getContextualType(node);
      const fullType = contextualType ? this.convertTsTypeToIRType(contextualType) : this.inferType(node);
      const elementType = fullType.kind === 'array' ? fullType.element : types.void();
      
      const arrayType = types.array(elementType);
      return expr.array(elements, arrayType);
    }

    // Element access (array[index])
    if (ts.isElementAccessExpression(node)) {
      const object = this.lowerExpr(node.expression, sourceFile);
      const index = this.lowerExpr(node.argumentExpression, sourceFile);
      const type = this.inferType(node);
      return expr.index(object, index, type);
    }

    // Arrow function (lambda)
    if (ts.isArrowFunction(node)) {
      return this.lowerArrowFunction(node, sourceFile);
    }

    // Conditional expression (ternary: a ? b : c)
    if (ts.isConditionalExpression(node)) {
      const condition = this.lowerExpr(node.condition, sourceFile);
      const whenTrue = this.lowerExpr(node.whenTrue, sourceFile);
      const whenFalse = this.lowerExpr(node.whenFalse, sourceFile);
      const type = this.inferType(node);
      return expr.conditional(condition, whenTrue, whenFalse, type);
    }

    // Parenthesized expression
    if (ts.isParenthesizedExpression(node)) {
      return this.lowerExpr(node.expression, sourceFile);
    }

    // New expression
    if (ts.isNewExpression(node)) {
      const className = node.expression.getText(sourceFile);
      const args = node.arguments ? Array.from(node.arguments).map(arg => this.lowerExpr(arg, sourceFile)) : [];
      const type = this.inferType(node);
      return expr.new(className, args, type);
    }

    // Object literal
    if (ts.isObjectLiteralExpression(node)) {
      const properties: Array<{ key: string; value: IRExpr }> = [];
      for (const prop of node.properties) {
        if (ts.isPropertyAssignment(prop)) {
          const key = prop.name.getText(sourceFile);
          const value = this.lowerExpr(prop.initializer, sourceFile);
          properties.push({ key, value });
        }
      }
      const type = this.inferType(node);
      return expr.object(properties, type);
    }

    return expr.literal(null, types.void());
  }

  /**
   * Analyze lambda body to find variables that need to be captured
   */
  private analyzeLambdaCaptures(
    node: ts.ArrowFunction,
    sourceFile: ts.SourceFile,
    params: Array<{ name: string; type: IRType }>
  ): Array<{ name: string; type: IRType }> {
    const captures: Array<{ name: string; type: IRType }> = [];
    const captureSet = new Set<string>();
    const paramNames = new Set(params.map(p => p.name));
    
    // Built-in globals that should never be captured
    const builtins = new Set([
      'console', 'Math', 'JSON', 'String', 'Number', 'Boolean',
      'Array', 'Map', 'Set', 'Object', 'Error',
      'FileSystem', 'FileSystemAsync', 'HTTP', 'HTTPAsync',
      'Promise', 'undefined', 'null', 'NaN', 'Infinity'
    ]);

    const visit = (node: ts.Node) => {
      if (ts.isIdentifier(node)) {
        const name = node.getText(sourceFile);
        // Capture if:
        // 1. Not a parameter
        // 2. Not already captured
        // 3. Not a built-in global
        // 4. Has a binding in the type checker (is a local variable)
        if (!paramNames.has(name) && !captureSet.has(name) && !builtins.has(name)) {
          const symbol = this.typeChecker.getSymbolAtLocation(node);
          if (symbol) {
            const declarations = symbol.getDeclarations();
            // Only capture if it's a local variable (not a global or built-in)
            if (declarations && declarations.length > 0) {
              const decl = declarations[0];
              // Check if it's a parameter or variable declaration in an outer scope
              if (ts.isParameter(decl) || ts.isVariableDeclaration(decl)) {
                // Get the type and convert to IR type
                const type = this.typeChecker.getTypeAtLocation(node);
                const irType = this.convertTsTypeToIRType(type);
                captures.push({ name, type: irType });
                captureSet.add(name);
              }
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(node.body);
    return captures;
  }

  private lowerArrowFunction(node: ts.ArrowFunction, sourceFile: ts.SourceFile): IRExpr {
    // Extract parameters
    const params = node.parameters.map(p => ({
      name: p.name.getText(sourceFile),
      type: this.lowerTypeNode(p.type, sourceFile),
    }));

    // Check if this is an async arrow function
    const isAsync = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
    
    // Set async context before lowering body
    const previousAsync = this.currentFunctionIsAsync;
    this.currentFunctionIsAsync = isAsync;

    // Analyze captures (free variables in the lambda body)
    const captures = this.analyzeLambdaCaptures(node, sourceFile, params);

    // Lower the body
    let body: IRBlock;
    if (ts.isBlock(node.body)) {
      body = this.lowerBlock(node.body, sourceFile);
    } else {
      // Expression body: x => x * 2
      const returnValue = this.lowerExpr(node.body, sourceFile);
      body = this.builder.block([], { kind: 'return', value: returnValue });
    }
    
    // Restore previous async context
    this.currentFunctionIsAsync = previousAsync;

    // Infer function type
    const paramTypes = params.map(p => p.type);
    const returnType = this.lowerTypeNode(node.type, sourceFile);
    const functionType = types.function(paramTypes, returnType);

    return expr.lambda(params, body, captures, functionType);
  }

  private lowerBinaryExpr(node: ts.BinaryExpression, sourceFile: ts.SourceFile): IRExpr {
    const left = this.lowerExpr(node.left, sourceFile);
    const right = this.lowerExpr(node.right, sourceFile);
    const op = this.getBinaryOp(node.operatorToken.kind);
    const type = this.inferType(node);

    return expr.binary(op, left, right, type);
  }

  private lowerUnaryExpr(node: ts.PrefixUnaryExpression, sourceFile: ts.SourceFile): IRExpr {
    // Handle prefix increment/decrement (++y, --y)
    // Note: These modify the variable and return the new value
    // For now, we'll treat them as expressions that return the incremented value
    // TODO: Properly handle side effects in SSA
    const operand = this.lowerExpr(node.operand, sourceFile);
    const op = this.getUnaryOp(node.operator);
    const type = this.inferType(node);

    return expr.unary(op, operand, type);
  }

  private getCompoundAssignmentOp(kind: ts.SyntaxKind): BinaryOp | null {
    switch (kind) {
      case ts.SyntaxKind.PlusEqualsToken: return BinaryOp.Add;
      case ts.SyntaxKind.MinusEqualsToken: return BinaryOp.Sub;
      case ts.SyntaxKind.AsteriskEqualsToken: return BinaryOp.Mul;
      case ts.SyntaxKind.SlashEqualsToken: return BinaryOp.Div;
      case ts.SyntaxKind.PercentEqualsToken: return BinaryOp.Mod;
      default: return null;
    }
  }

  private lowerCallExpr(node: ts.CallExpression, sourceFile: ts.SourceFile): IRExpr {
    // Check if this is a method call (obj.method(args) or obj?.method(args))
    if (ts.isPropertyAccessExpression(node.expression)) {
      const object = this.lowerExpr(node.expression.expression, sourceFile);
      const method = node.expression.name.text;
      const optional = !!node.expression.questionDotToken;  // preserve optional chaining
      const args = node.arguments.map(arg => this.lowerExpr(arg, sourceFile));
      const type = this.inferType(node);
      
      // Convert to regular call with fieldAccess callee (preserves optional flag)
      const memberType = this.inferType(node.expression);
      const callee = expr.fieldAccess(object, method, memberType, optional);
      return expr.call(callee, args, type);
    }
    
    // Regular function call
    const callee = this.lowerExpr(node.expression, sourceFile);
    const args = node.arguments.map(arg => this.lowerExpr(arg, sourceFile));
    const type = this.inferType(node);

    return expr.call(callee, args, type);
  }

  private getBinaryOp(kind: ts.SyntaxKind): BinaryOp {
    switch (kind) {
      case ts.SyntaxKind.PlusToken: return BinaryOp.Add;
      case ts.SyntaxKind.MinusToken: return BinaryOp.Sub;
      case ts.SyntaxKind.AsteriskToken: return BinaryOp.Mul;
      case ts.SyntaxKind.SlashToken: return BinaryOp.Div;
      case ts.SyntaxKind.PercentToken: return BinaryOp.Mod;
      case ts.SyntaxKind.EqualsEqualsEqualsToken: return BinaryOp.Eq;
      case ts.SyntaxKind.ExclamationEqualsEqualsToken: return BinaryOp.Ne;
      case ts.SyntaxKind.LessThanToken: return BinaryOp.Lt;
      case ts.SyntaxKind.LessThanEqualsToken: return BinaryOp.Le;
      case ts.SyntaxKind.GreaterThanToken: return BinaryOp.Gt;
      case ts.SyntaxKind.GreaterThanEqualsToken: return BinaryOp.Ge;
      case ts.SyntaxKind.AmpersandAmpersandToken: return BinaryOp.And;
      case ts.SyntaxKind.BarBarToken: return BinaryOp.Or;
      default: return BinaryOp.Add;
    }
  }

  private getUnaryOp(kind: ts.SyntaxKind): UnaryOp {
    switch (kind) {
      case ts.SyntaxKind.MinusToken: return UnaryOp.Neg;
      case ts.SyntaxKind.ExclamationToken: return UnaryOp.Not;
      case ts.SyntaxKind.PlusToken: return UnaryOp.Plus;
      case ts.SyntaxKind.TypeOfKeyword: return UnaryOp.Typeof;
      default: return UnaryOp.Not;
    }
  }

  private lowerTypeNode(typeNode: ts.TypeNode | undefined, sourceFile: ts.SourceFile): IRType {
    if (!typeNode) return types.void();

    // Handle keyword types (number, string, boolean, void)
    switch (typeNode.kind) {
      case ts.SyntaxKind.NumberKeyword:
        return types.number();
      case ts.SyntaxKind.StringKeyword:
        return types.string();
      case ts.SyntaxKind.BooleanKeyword:
        return types.boolean();
      case ts.SyntaxKind.VoidKeyword:
        return types.void();
      case ts.SyntaxKind.NullKeyword:
        return types.nullable(types.void());
      case ts.SyntaxKind.UndefinedKeyword:
        return types.void();
    }

    // Handle union types (A | B)
    if (ts.isUnionTypeNode(typeNode)) {
      const types_arr = typeNode.types.map(t => this.lowerTypeNode(t, sourceFile));
      return this.normalizeUnion(types_arr);
    }

    if (ts.isTypeReferenceNode(typeNode)) {
      const name = typeNode.typeName.getText(sourceFile);
      
      if (name === 'number') return types.number();
      if (name === 'integer') return types.integer();
      if (name === 'integer53') return types.integer53();
      if (name === 'string') return types.string();
      if (name === 'boolean') return types.boolean();
      if (name === 'void') return types.void();

      // Ownership wrappers
      if (name === 'own' || name === 'share' || name === 'use') {
        const ownership = name === 'own' ? Ownership.Own :
                         name === 'share' ? Ownership.Share :
                         Ownership.Use;
        
        if (typeNode.typeArguments && typeNode.typeArguments.length > 0) {
          const inner = this.lowerTypeNode(typeNode.typeArguments[0], sourceFile);
          if (inner.kind === 'class') {
            return { ...inner, ownership };
          }
        }
      }

      // Array type
      if (name === 'Array' && typeNode.typeArguments) {
        const element = this.lowerTypeNode(typeNode.typeArguments[0], sourceFile);
        return types.array(element, Ownership.Value);
      }

      // Promise type
      if (name === 'Promise' && typeNode.typeArguments) {
        const resultType = this.lowerTypeNode(typeNode.typeArguments[0], sourceFile);
        return types.promise(resultType);
      }

      return types.class(name, Ownership.Own);
    }

    if (ts.isArrayTypeNode(typeNode)) {
      const element = this.lowerTypeNode(typeNode.elementType, sourceFile);
      return types.array(element, Ownership.Value);
    }

    // Function type: (x: number) => number
    if (ts.isFunctionTypeNode(typeNode)) {
      const params = typeNode.parameters.map(p => this.lowerTypeNode(p.type, sourceFile));
      const returnType = this.lowerTypeNode(typeNode.type, sourceFile);
      return types.function(params, returnType);
    }

    return types.void();
  }

  /**
   * Normalize a union type to simplify common patterns
   */
  private normalizeUnion(unionTypes: IRType[]): IRType {
    // For now, special handling for T | null and T | undefined
    // Full normalization (flattening, deduplication) can come later
    
    // Check if this is a T | null pattern
    const nonNullTypes = unionTypes.filter(t => 
      !(t.kind === 'nullable' && t.inner.kind === 'primitive' && t.inner.type === PrimitiveType.Void)
    );
    
    const hasNull = unionTypes.length > nonNullTypes.length;
    
    // If T | null, just return T (in GC mode, all objects are nullable by default)
    if (hasNull && nonNullTypes.length === 1) {
      return nonNullTypes[0];
    }
    
    // Otherwise return the full union
    return types.union(unionTypes);
  }

  private lowerType(decl: ts.VariableDeclaration, sourceFile: ts.SourceFile): IRType {
    if (decl.type) {
      return this.lowerTypeNode(decl.type, sourceFile);
    }

    // Infer from initializer
    if (decl.initializer) {
      // Direct type inference from literal values
      if (ts.isNumericLiteral(decl.initializer)) {
        return types.number();
      }
      if (ts.isStringLiteral(decl.initializer)) {
        return types.string();
      }
      if (decl.initializer.kind === ts.SyntaxKind.TrueKeyword || 
          decl.initializer.kind === ts.SyntaxKind.FalseKeyword) {
        return types.boolean();
      }
      
      // Use type checker for complex expressions
      return this.inferType(decl.initializer);
    }

    return types.void();
  }

  private inferType(node: ts.Node): IRType {
    const tsType = this.typeChecker.getTypeAtLocation(node);
    // Create a fresh visited set for each top-level type conversion
    return this.convertTsTypeToIRType(tsType, new Set());
  }

  private convertTsTypeToIRType(tsType: ts.Type, visited: Set<ts.Type> = new Set()): IRType {
    // Check primitive types FIRST to avoid adding them to visited
    // TypeScript reuses primitive type objects globally, so adding them to visited causes false cycles
    if (tsType.flags & ts.TypeFlags.Number) {
      return types.number();
    }
    if (tsType.flags & ts.TypeFlags.String) {
      return types.string();
    }
    if (tsType.flags & ts.TypeFlags.Boolean) {
      return types.boolean();
    }
    if (tsType.flags & ts.TypeFlags.Void) {
      return types.void();
    }
    if (tsType.flags & ts.TypeFlags.Undefined) {
      return types.void(); // Treat undefined as void in IR
    }
    if (tsType.flags & ts.TypeFlags.Null) {
      return types.void(); // Treat null as void in IR (will be enhanced with ownership system)
    }
    
    // Cycle detection for STRUCTURAL types only (functions, objects, etc.)
    if (visited.has(tsType)) {
      return types.void(); // Break cycles
    }
    visited.add(tsType);
    
    // Check for function types (call signatures)
    const callSignatures = tsType.getCallSignatures();
    if (callSignatures && callSignatures.length > 0) {
      const signature = callSignatures[0];
      const params = signature.getParameters().map(param => {
        const paramType = this.typeChecker.getTypeOfSymbolAtLocation(param, param.valueDeclaration!);
        return this.convertTsTypeToIRType(paramType, visited);
      });
      const tsReturnType = signature.getReturnType();
      const returnType = this.convertTsTypeToIRType(tsReturnType, visited);
      return types.function(params, returnType);
    }
    
    // Check for Promise types (BEFORE general Object check!)
    // This prevents TypeScript from trying to expand Promise's internal types
    if (tsType.symbol && tsType.symbol.name === 'Promise') {
      const typeArgs = (tsType as ts.TypeReference).typeArguments;
      if (typeArgs && typeArgs.length >= 1) {
        const resultType = this.convertTsTypeToIRType(typeArgs[0], visited);
        return types.promise(resultType);
      }
      return types.promise(types.void());
    }
    
    // Check for array types (BEFORE general Object check!)
    if (this.typeChecker.isArrayType(tsType)) {
      const typeArgs = this.typeChecker.getTypeArguments(tsType as ts.TypeReference);
      if (typeArgs && typeArgs.length > 0) {
        const elementType = this.convertTsTypeToIRType(typeArgs[0], visited);
        return types.array(elementType);
      }
      return types.array(types.void());
    }
    
    // Check for Map types (BEFORE general Object check!)
    if (tsType.symbol && tsType.symbol.name === 'Map') {
      const typeArgs = (tsType as ts.TypeReference).typeArguments;
      if (typeArgs && typeArgs.length >= 2) {
        const keyType = this.convertTsTypeToIRType(typeArgs[0], visited);
        const valueType = this.convertTsTypeToIRType(typeArgs[1], visited);
        return types.map(keyType, valueType);
      }
      return types.map(types.void(), types.void());
    }
    
    // Check for object types (struct) - after arrays and maps!
    if (tsType.flags & ts.TypeFlags.Object) {
      try {
        // getProperties() can cause stack overflow on complex library types
        const properties = tsType.getProperties();
        
        // If there are too many properties, it's likely a complex library type we can't handle
        // Skip it and return void to avoid stack overflow in TypeScript's type checker
        if (properties.length > 50) {
          return types.void();
        }
        
        if (properties.length > 0) {
          const fields = properties.map(prop => {
            const propType = this.typeChecker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration!);
            return {
              name: prop.getName(),
              type: this.convertTsTypeToIRType(propType, visited)
            };
          });
          return types.struct(fields);
        }
      } catch (e) {
        // If we hit a stack overflow or other error during type analysis,
        // just return void rather than crashing
        return types.void();
      }
    }
    
    return types.void();
  }

  private lowerTemplateExpression(node: ts.TemplateExpression | ts.NoSubstitutionTemplateLiteral, sourceFile: ts.SourceFile): IRExpr {
    // No substitution template literal: `plain text`
    if (ts.isNoSubstitutionTemplateLiteral(node)) {
      return expr.literal(node.text, types.string());
    }

    // Template expression with substitutions: `Hello, ${name}!`
    // Build it as a series of string concatenations
    let result: IRExpr = expr.literal(node.head.text, types.string());

    for (const span of node.templateSpans) {
      // Add the expression (convert to string if needed)
      const spanExpr = this.lowerExpr(span.expression, sourceFile);
      const stringExpr = this.convertToString(spanExpr);
      
      // Concatenate: result + expression
      result = expr.binary(BinaryOp.Add, result, stringExpr, types.string());

      // Add the literal text after the expression
      if (span.literal.text) {
        const literalExpr = expr.literal(span.literal.text, types.string());
        result = expr.binary(BinaryOp.Add, result, literalExpr, types.string());
      }
    }

    return result;
  }

  private convertToString(expr: IRExpr): IRExpr {
    // If already a string, return as-is
    if (expr.type.kind === 'primitive' && expr.type.type === PrimitiveType.String) {
      return expr;
    }

    // For other types, use String::from() to convert
    // This generates gs::String::from(expr) in C++ codegen
    return {
      kind: 'callExpr',
      callee: {
        kind: 'member',
        object: {
          kind: 'variable',
          name: 'String',
          version: 0,
          type: types.void(), // Type doesn't matter for static class reference
        },
        member: 'from',
        type: types.function([expr.type], types.string()),
      },
      args: [expr],
      type: types.string(),
    };
  }
}
