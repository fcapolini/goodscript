/**
 * IR Visitor Pattern
 * 
 * Base class for IR transformations and analysis
 */

import type {
  IRProgram,
  IRModule,
  IRDeclaration,
  IRFunctionDecl,
  IRClassDecl,
  IRBlock,
  IRInstruction,
  IRExpr,
} from './types.js';

/**
 * Generic visitor for IR traversal
 */
export abstract class IRVisitor<T = void> {
  visitProgram(program: IRProgram): T {
    for (const module of program.modules.values()) {
      this.visitModule(module);
    }
    return undefined as T;
  }

  visitModule(module: IRModule): T {
    for (const decl of module.declarations) {
      this.visitDeclaration(decl);
    }
    return undefined as T;
  }

  visitDeclaration(decl: IRDeclaration): T {
    switch (decl.kind) {
      case 'function':
        return this.visitFunction(decl);
      case 'class':
        return this.visitClass(decl);
      case 'const':
        return this.visitExpr(decl.value);
      case 'interface':
      case 'typeAlias':
        return undefined as T;
    }
  }

  visitFunction(_func: IRFunctionDecl): T {
    // TODO: Add proper AST-level statement visiting
    // For now, skip AST-level function bodies
    return undefined as T;
  }

  visitClass(_cls: IRClassDecl): T {
    // TODO: Add proper AST-level statement visiting
    // For now, skip AST-level method bodies
    return undefined as T;
  }

  visitBlock(block: IRBlock): T {
    for (const instruction of block.instructions) {
      this.visitInstruction(instruction);
    }
    return undefined as T;
  }

  visitInstruction(instruction: IRInstruction): T {
    switch (instruction.kind) {
      case 'assign':
        return this.visitExpr(instruction.value);
      case 'call':
        instruction.args.forEach(arg => this.visitExpr(arg));
        return this.visitExpr(instruction.callee);
      case 'fieldAssign':
        this.visitExpr(instruction.object);
        return this.visitExpr(instruction.value);
      case 'indexAssign':
        this.visitExpr(instruction.object);
        this.visitExpr(instruction.index);
        return this.visitExpr(instruction.value);
      case 'memberAssign':
        this.visitExpr(instruction.object);
        return this.visitExpr(instruction.value);
      case 'expr':
        return this.visitExpr(instruction.value);
    }
  }

  visitExpr(expr: IRExpr): T {
    switch (expr.kind) {
      case 'literal':
      case 'variable':
        return undefined as T;
      case 'binary':
        this.visitExpr(expr.left);
        return this.visitExpr(expr.right);
      case 'unary':
        return this.visitExpr(expr.operand);
      case 'conditional':
        this.visitExpr(expr.condition);
        this.visitExpr(expr.whenTrue);
        return this.visitExpr(expr.whenFalse);
      case 'member':
        return this.visitExpr(expr.object);
      case 'index':
        this.visitExpr(expr.object);
        return this.visitExpr(expr.index);
      case 'callExpr':
        this.visitExpr(expr.callee);
        expr.args.forEach(arg => this.visitExpr(arg));
        return undefined as T;
      case 'methodCall':
        this.visitExpr(expr.object);
        expr.args.forEach(arg => this.visitExpr(arg));
        return undefined as T;
      case 'new':
        expr.args.forEach(arg => this.visitExpr(arg));
        return undefined as T;
      case 'array':
        expr.elements.forEach(el => this.visitExpr(el));
        return undefined as T;
      case 'object':
        expr.properties.forEach(prop => this.visitExpr(prop.value));
        return undefined as T;
      case 'lambda':
        // Visit lambda body block (instructions only, terminator is implicit)
        expr.body.instructions.forEach(inst => this.visitInstruction(inst));
        if (expr.body.terminator.kind === 'return' && expr.body.terminator.value) {
          this.visitExpr(expr.body.terminator.value);
        }
        return undefined as T;
      case 'move':
      case 'borrow':
        return this.visitExpr(expr.source);
    }
  }
}
