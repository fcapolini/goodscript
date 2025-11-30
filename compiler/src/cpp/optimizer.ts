/**
 * C++ AST Optimizer
 * 
 * Performs optimization passes on the C++ AST before code generation.
 * This includes:
 * - Dead code elimination
 * - Constant folding
 * - Smart pointer optimization (avoiding unnecessary copies)
 * - Inlining small functions
 * - Loop optimization
 */

import * as ast from './ast';

export interface OptimizationOptions {
  /** Enable constant folding (e.g., 2 + 3 -> 5) */
  constantFolding?: boolean;
  
  /** Enable dead code elimination */
  deadCodeElimination?: boolean;
  
  /** Enable smart pointer optimizations (std::move insertion) */
  smartPointerOptimization?: boolean;
  
  /** Enable small function inlining */
  inlining?: boolean;
  
  /** Optimization level (0 = none, 1 = basic, 2 = aggressive) */
  level?: 0 | 1 | 2;
}

const DEFAULT_OPTIONS: OptimizationOptions = {
  constantFolding: true,
  deadCodeElimination: true,
  smartPointerOptimization: true,
  inlining: false, // Not implemented yet
  level: 1,
};

/**
 * Optimize a C++ translation unit
 */
export function optimize(tu: ast.TranslationUnit, options: OptimizationOptions = {}): ast.TranslationUnit {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Skip optimization if level is 0
  if (opts.level === 0) {
    return tu;
  }
  
  const optimizer = new AstOptimizer(opts);
  return optimizer.optimizeTranslationUnit(tu);
}

/**
 * AST optimizer implementation
 */
class AstOptimizer implements ast.CppVisitor<ast.CppNode> {
  constructor(private options: OptimizationOptions) {}
  
  optimizeTranslationUnit(tu: ast.TranslationUnit): ast.TranslationUnit {
    const declarations = tu.declarations.map((decl: ast.Declaration) => {
      if (decl instanceof ast.Namespace) {
        return this.visitNamespace(decl) as ast.Namespace;
      } else if (decl instanceof ast.Class) {
        return this.visitClass(decl) as ast.Class;
      } else if (decl instanceof ast.Function) {
        return this.visitFunction(decl) as ast.Function;
      } else if (decl instanceof ast.Enum) {
        return this.visitEnum(decl) as ast.Enum;
      } else if (decl instanceof ast.VariableDecl) {
        return this.visitVariableDecl(decl) as ast.VariableDecl;
      }
      return decl;
    });
    
    const mainFunction = tu.mainFunction ? this.visitFunction(tu.mainFunction) as ast.Function : undefined;
    
    return new ast.TranslationUnit(tu.includes, declarations, mainFunction);
  }
  
  // ============================================================================
  // Visitor implementation
  // ============================================================================
  
  visitTranslationUnit(node: ast.TranslationUnit): ast.CppNode {
    return this.optimizeTranslationUnit(node);
  }
  
  visitInclude(node: ast.Include): ast.CppNode {
    return node; // Includes don't need optimization
  }
  
  visitNamespace(node: ast.Namespace): ast.CppNode {
    const declarations = node.declarations.map(decl => {
      if (decl instanceof ast.Class) {
        return this.visitClass(decl) as ast.Class;
      } else if (decl instanceof ast.Function) {
        return this.visitFunction(decl) as ast.Function;
      } else if (decl instanceof ast.Enum) {
        return this.visitEnum(decl) as ast.Enum;
      } else if (decl instanceof ast.VariableDecl) {
        return this.visitVariableDecl(decl) as ast.VariableDecl;
      }
      return decl;
    });
    
    return new ast.Namespace(node.name, declarations);
  }
  
  visitClass(node: ast.Class): ast.CppNode {
    // Optimize methods
    const methods = node.methods.map(m => this.visitMethod(m) as ast.Method);
    const constructors = node.constructors.map(c => this.visitConstructor(c) as ast.Constructor);
    
    return new ast.Class(
      node.name,
      node.fields,
      constructors,
      methods,
      node.baseClass,
      node.templateParams,
      node.isStruct,
      node.baseClasses
    );
  }
  
  visitEnum(node: ast.Enum): ast.CppNode {
    return node; // Enums don't need optimization
  }
  
  visitFunction(node: ast.Function): ast.CppNode {
    const body = this.visitBlock(node.body) as ast.Block;
    return new ast.Function(
      node.name,
      node.returnType,
      node.params,
      body,
      node.templateParams
    );
  }
  
  visitMethod(node: ast.Method): ast.CppNode {
    const body = this.visitBlock(node.body) as ast.Block;
    return new ast.Method(
      node.name,
      node.returnType,
      node.params,
      body,
      node.access,
      node.isConst,
      node.isStatic,
      node.isVirtual,
      node.isPureVirtual,
      node.isOverride,
      node.isDefault
    );
  }
  
  visitConstructor(node: ast.Constructor): ast.CppNode {
    const body = this.visitBlock(node.body) as ast.Block;
    return new ast.Constructor(node.params, node.initializerList, body);
  }
  
  visitField(node: ast.Field): ast.CppNode {
    return node;
  }
  
  visitParameter(node: ast.Parameter): ast.CppNode {
    return node;
  }
  
  visitVariableDecl(node: ast.VariableDecl): ast.CppNode {
    const init = node.initializer ? this.visitExpression(node.initializer) : undefined;
    return new ast.VariableDecl(node.name, node.type, init, node.isConst);
  }
  
  visitExpressionStmt(node: ast.ExpressionStmt): ast.CppNode {
    const expr = this.visitExpression(node.expression);
    return new ast.ExpressionStmt(expr);
  }
  
  visitReturnStmt(node: ast.ReturnStmt): ast.CppNode {
    const value = node.value ? this.visitExpression(node.value) : undefined;
    return new ast.ReturnStmt(value);
  }
  
  visitIfStmt(node: ast.IfStmt): ast.CppNode {
    const condition = this.visitExpression(node.condition);
    const thenBranch = this.visitStatement(node.thenBranch);
    const elseBranch = node.elseBranch ? this.visitStatement(node.elseBranch) : undefined;
    
    // Dead code elimination: if (true) -> keep then block only
    if (this.options.deadCodeElimination) {
      if (condition instanceof ast.Identifier && condition.name === 'true') {
        return thenBranch;
      }
      if (condition instanceof ast.Identifier && condition.name === 'false') {
        return elseBranch || new ast.Block([]);
      }
    }
    
    return new ast.IfStmt(condition, thenBranch, elseBranch);
  }
  
  visitWhileStmt(node: ast.WhileStmt): ast.CppNode {
    const condition = this.visitExpression(node.condition);
    const body = this.visitStatement(node.body);
    
    // Dead code elimination: while (false) -> remove
    if (this.options.deadCodeElimination) {
      if (condition instanceof ast.Identifier && condition.name === 'false') {
        return new ast.Block([]);
      }
    }
    
    return new ast.WhileStmt(condition, body);
  }
  
  visitForStmt(node: ast.ForStmt): ast.CppNode {
    const init = node.init ? this.visitStatement(node.init) : undefined;
    const condition = node.condition ? this.visitExpression(node.condition) : undefined;
    const increment = node.increment ? this.visitExpression(node.increment) : undefined;
    const body = this.visitStatement(node.body);
    
    return new ast.ForStmt(init, condition, increment, body);
  }
  
  visitRangeForStmt(node: ast.RangeForStmt): ast.CppNode {
    const iterable = this.visitExpression(node.iterable);
    const body = this.visitStatement(node.body);
    
    return new ast.RangeForStmt(node.variable, node.isConst, iterable, body);
  }
  
  visitBlock(node: ast.Block): ast.CppNode {
    let statements = node.statements.map(stmt => this.visitStatement(stmt));
    
    // Flatten nested blocks
    statements = statements.flatMap(stmt => {
      if (stmt instanceof ast.Block) {
        return stmt.statements;
      }
      return [stmt];
    });
    
    // Dead code elimination: remove statements after return/break/continue
    if (this.options.deadCodeElimination) {
      const cleanedStatements: ast.Statement[] = [];
      for (const stmt of statements) {
        cleanedStatements.push(stmt);
        if (stmt instanceof ast.ReturnStmt || 
            stmt instanceof ast.BreakStmt || 
            stmt instanceof ast.ContinueStmt) {
          break; // Ignore everything after
        }
      }
      statements = cleanedStatements;
    }
    
    return new ast.Block(statements);
  }
  
  visitBinaryExpr(node: ast.BinaryExpr): ast.CppNode {
    const left = this.visitExpression(node.left);
    const right = this.visitExpression(node.right);
    
    // Constant folding
    if (this.options.constantFolding) {
      const folded = this.foldBinaryExpr(left, node.operator, right);
      if (folded) return folded;
    }
    
    return new ast.BinaryExpr(left, node.operator, right);
  }
  
  visitUnaryExpr(node: ast.UnaryExpr): ast.CppNode {
    const operand = this.visitExpression(node.operand);
    
    // Constant folding
    if (this.options.constantFolding) {
      const folded = this.foldUnaryExpr(node.operator, operand);
      if (folded) return folded;
    }
    
    return new ast.UnaryExpr(node.operator, operand, node.isPrefix);
  }
  
  visitCallExpr(node: ast.CallExpr): ast.CppNode {
    const callee = this.visitExpression(node.callee);
    const args = node.args.map(arg => this.visitExpression(arg));
    
    return new ast.CallExpr(callee, args, node.templateArgs);
  }
  
  visitMemberExpr(node: ast.MemberExpr): ast.CppNode {
    const object = this.visitExpression(node.object);
    return new ast.MemberExpr(object, node.member, node.isPointer);
  }
  
  visitSubscriptExpr(node: ast.SubscriptExpr): ast.CppNode {
    const object = this.visitExpression(node.object);
    const index = this.visitExpression(node.index);
    return new ast.SubscriptExpr(object, index);
  }
  
  visitIdentifier(node: ast.Identifier): ast.CppNode {
    return node;
  }
  
  visitLiteral(node: ast.Literal): ast.CppNode {
    return node;
  }
  
  visitCast(node: ast.Cast): ast.CppNode {
    const expr = this.visitExpression(node.expression);
    return new ast.Cast(node.type, expr);
  }
  
  visitNew(node: ast.New): ast.CppNode {
    const args = node.args.map(arg => this.visitExpression(arg));
    return new ast.New(node.type, args);
  }
  
  visitLambda(node: ast.Lambda): ast.CppNode {
    const body = node.body instanceof ast.Block 
      ? this.visitBlock(node.body) as ast.Block
      : this.visitExpression(node.body);
    
    return new ast.Lambda(node.params, body, node.returnType, node.capture);
  }
  
  visitArrayInit(node: ast.ArrayInit): ast.CppNode {
    const elements = node.elements.map(el => this.visitExpression(el));
    return new ast.ArrayInit(elements, node.elementType);
  }
  
  visitMapInit(node: ast.MapInit): ast.CppNode {
    const entries = node.entries.map(([k, v]: [ast.Expression, ast.Expression]) => 
      [this.visitExpression(k), this.visitExpression(v)] as [ast.Expression, ast.Expression]
    );
    return new ast.MapInit(entries, node.keyType, node.valueType);
  }
  
  visitThrowStmt(node: ast.ThrowStmt): ast.CppNode {
    const expr = this.visitExpression(node.expression);
    return new ast.ThrowStmt(expr);
  }
  
  visitTryCatch(node: ast.TryCatch): ast.CppNode {
    const tryBlock = this.visitBlock(node.tryBlock) as ast.Block;
    const catchBlock = this.visitBlock(node.catchBlock) as ast.Block;
    
    return new ast.TryCatch(tryBlock, node.exceptionVar, node.exceptionType, catchBlock);
  }
  
  visitBreakStmt(node: ast.BreakStmt): ast.CppNode {
    return node;
  }
  
  visitContinueStmt(node: ast.ContinueStmt): ast.CppNode {
    return node;
  }
  
  visitParenExpr(node: ast.ParenExpr): ast.CppNode {
    const expr = this.visitExpression(node.expression);
    
    // Remove unnecessary parentheses around simple expressions
    if (expr instanceof ast.Identifier || expr instanceof ast.Literal) {
      return expr;
    }
    
    return new ast.ParenExpr(expr);
  }
  
  visitConditionalExpr(node: ast.ConditionalExpr): ast.CppNode {
    const condition = this.visitExpression(node.condition);
    const whenTrue = this.visitExpression(node.whenTrue);
    const whenFalse = this.visitExpression(node.whenFalse);
    
    // Constant folding: condition ? a : b
    if (this.options.constantFolding) {
      if (condition instanceof ast.Identifier && condition.name === 'true') {
        return whenTrue;
      }
      if (condition instanceof ast.Identifier && condition.name === 'false') {
        return whenFalse;
      }
    }
    
    return new ast.ConditionalExpr(condition, whenTrue, whenFalse);
  }
  
  visitInitializerList(node: ast.InitializerList): ast.CppNode {
    const elements = node.elements.map(el => this.visitExpression(el));
    return new ast.InitializerList(elements);
  }
  
  // ============================================================================
  // Helper methods
  // ============================================================================
  
  private visitExpression(expr: ast.Expression): ast.Expression {
    return expr.accept(this) as ast.Expression;
  }
  
  private visitStatement(stmt: ast.Statement): ast.Statement {
    return stmt.accept(this) as ast.Statement;
  }
  
  /**
   * Constant fold binary expressions (e.g., 2 + 3 -> 5)
   */
  private foldBinaryExpr(left: ast.Expression, op: string, right: ast.Expression): ast.Expression | null {
    // Only fold numeric literals for now
    if (!(left instanceof ast.Identifier && right instanceof ast.Identifier)) {
      return null;
    }
    
    const leftVal = parseFloat(left.name);
    const rightVal = parseFloat(right.name);
    
    if (isNaN(leftVal) || isNaN(rightVal)) {
      return null;
    }
    
    let result: number | undefined;
    
    switch (op) {
      case '+':
        result = leftVal + rightVal;
        break;
      case '-':
        result = leftVal - rightVal;
        break;
      case '*':
        result = leftVal * rightVal;
        break;
      case '/':
        if (rightVal !== 0) {
          result = leftVal / rightVal;
        }
        break;
      case '%':
        if (rightVal !== 0) {
          result = leftVal % rightVal;
        }
        break;
      case '<':
        return new ast.Identifier(leftVal < rightVal ? 'true' : 'false');
      case '>':
        return new ast.Identifier(leftVal > rightVal ? 'true' : 'false');
      case '<=':
        return new ast.Identifier(leftVal <= rightVal ? 'true' : 'false');
      case '>=':
        return new ast.Identifier(leftVal >= rightVal ? 'true' : 'false');
      case '==':
        return new ast.Identifier(leftVal === rightVal ? 'true' : 'false');
      case '!=':
        return new ast.Identifier(leftVal !== rightVal ? 'true' : 'false');
    }
    
    if (result !== undefined) {
      return new ast.Identifier(result.toString());
    }
    
    return null;
  }
  
  /**
   * Constant fold unary expressions (e.g., -5, !true)
   */
  private foldUnaryExpr(op: string, operand: ast.Expression): ast.Expression | null {
    if (!(operand instanceof ast.Identifier)) {
      return null;
    }
    
    // Boolean negation
    if (op === '!' && (operand.name === 'true' || operand.name === 'false')) {
      return new ast.Identifier(operand.name === 'true' ? 'false' : 'true');
    }
    
    // Numeric negation
    if (op === '-') {
      const val = parseFloat(operand.name);
      if (!isNaN(val)) {
        return new ast.Identifier((-val).toString());
      }
    }
    
    // Numeric plus (no-op)
    if (op === '+') {
      const val = parseFloat(operand.name);
      if (!isNaN(val)) {
        return operand;
      }
    }
    
    return null;
  }
}
