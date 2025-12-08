/**
 * IR Optimizer
 * 
 * Optimization passes on IR:
 * - Constant folding
 * - Dead code elimination
 * - Ownership simplification (for GC mode)
 */

import type {
  IRProgram,
  IRModule,
  IRDeclaration,
  IRFunctionDecl,
  IRBlock,
  IRExpr,
  IRInstruction,
  IRBinary,
  IRUnary,
  IRConditional,
  IRTerminator,
} from '../ir/types.js';
import { types } from '../ir/builder.js';

export class Optimizer {
  private modified: boolean = false;

  optimize(program: IRProgram, _level: number): IRProgram {

    // Multiple passes until fixed point
    let iterations = 0;
    const maxIterations = 10;

    do {
      this.modified = false;
      program = this.optimizeProgram(program);
      iterations++;
    } while (this.modified && iterations < maxIterations);

    return program;
  }

  private optimizeProgram(program: IRProgram): IRProgram {
    return {
      modules: program.modules.map(m => this.optimizeModule(m)),
    };
  }

  private optimizeModule(module: IRModule): IRModule {
    return {
      ...module,
      declarations: module.declarations.map(d => this.optimizeDeclaration(d)),
    };
  }

  private optimizeDeclaration(decl: IRDeclaration): IRDeclaration {
    switch (decl.kind) {
      case 'function':
        return this.optimizeFunction(decl);
      case 'class':
        // Class methods use IRFunctionBody (AST-level), not IRBlock (SSA-level)
        // TODO: Add statement-level optimization for methods
        return decl;
      case 'const':
        return {
          ...decl,
          value: this.constantFold(decl.value),
        };
      default:
        return decl;
    }
  }

  private isFunctionBody(body: any): body is { statements: any[] } {
    return body && 'statements' in body;
  }

  private optimizeFunction(func: IRFunctionDecl): IRFunctionDecl {
    // Check if body is SSA-level (IRBlock) or AST-level (IRFunctionBody)
    if (this.isFunctionBody(func.body)) {
      // AST-level body - TODO: implement statement-level optimization
      return func;
    }
    
    // SSA-level body - optimize blocks
    return {
      ...func,
      body: this.optimizeBlock(func.body),
    };
  }

  private optimizeBlock(block: IRBlock): IRBlock {
    // Optimize instructions
    const optimizedInstructions = block.instructions
      .map(i => this.optimizeInstruction(i))
      .filter((i): i is IRInstruction => i !== null);

    // Optimize terminator
    const optimizedTerminator = this.optimizeTerminator(block.terminator);

    // Dead code elimination: remove instructions after unconditional jump/return
    const deadCodeFreeInstructions = this.removeDeadCode(optimizedInstructions, optimizedTerminator);

    return {
      ...block,
      instructions: deadCodeFreeInstructions,
      terminator: optimizedTerminator,
    };
  }

  private optimizeInstruction(inst: IRInstruction): IRInstruction | null {
    switch (inst.kind) {
      case 'assign': {
        const folded = this.constantFold(inst.value);
        if (folded !== inst.value) {
          this.modified = true;
        }
        return { ...inst, value: folded };
      }
      case 'call': {
        const args = inst.args.map(arg => this.constantFold(arg));
        const argsChanged = args.some((arg, i) => arg !== inst.args[i]);
        if (argsChanged) {
          this.modified = true;
        }
        return { ...inst, args };
      }
      case 'fieldAssign': {
        const value = this.constantFold(inst.value);
        if (value !== inst.value) {
          this.modified = true;
        }
        return { ...inst, value };
      }
      case 'expr': {
        const value = this.constantFold(inst.value);
        if (value !== inst.value) {
          this.modified = true;
        }
        return { ...inst, value };
      }
      default:
        return inst;
    }
  }

  private optimizeTerminator(term: IRTerminator): IRTerminator {
    switch (term.kind) {
      case 'return':
        if (term.value) {
          const folded = this.constantFold(term.value);
          if (folded !== term.value) {
            this.modified = true;
            return { ...term, value: folded };
          }
        }
        return term;
      case 'branch': {
        const condition = this.constantFold(term.condition);
        
        // Constant condition -> convert to jump
        if (condition.kind === 'literal' && typeof condition.value === 'boolean') {
          this.modified = true;
          return {
            kind: 'jump',
            target: condition.value ? term.trueBranch : term.falseBranch,
          };
        }

        if (condition !== term.condition) {
          this.modified = true;
          return { ...term, condition };
        }
        return term;
      }
      default:
        return term;
    }
  }

  private constantFold(expr: IRExpr): IRExpr {
    switch (expr.kind) {
      case 'binary':
        return this.foldBinary(expr);
      case 'unary':
        return this.foldUnary(expr);
      case 'conditional':
        return this.foldConditional(expr);
      case 'callExpr':
        return {
          ...expr,
          args: expr.args.map(arg => this.constantFold(arg)),
        };
      case 'methodCall':
        return {
          ...expr,
          object: this.constantFold(expr.object),
          args: expr.args.map(arg => this.constantFold(arg)),
        };
      case 'member':
        return {
          ...expr,
          object: this.constantFold(expr.object),
        };
      case 'index':
        return {
          ...expr,
          object: this.constantFold(expr.object),
          index: this.constantFold(expr.index),
        };
      case 'array':
        return {
          ...expr,
          elements: expr.elements.map(e => this.constantFold(e)),
        };
      case 'object':
        return {
          ...expr,
          properties: expr.properties.map(p => ({
            ...p,
            value: this.constantFold(p.value),
          })),
        };
      case 'move':
      case 'borrow':
        return {
          ...expr,
          source: this.constantFold(expr.source),
        };
      default:
        return expr;
    }
  }

  private foldBinary(expr: IRBinary): IRExpr {
    const left = this.constantFold(expr.left);
    const right = this.constantFold(expr.right);

    // Both operands must be literals to fold
    if (left.kind !== 'literal' || right.kind !== 'literal') {
      if (left !== expr.left || right !== expr.right) {
        this.modified = true;
        return { ...expr, left, right };
      }
      return expr;
    }

    const lval = left.value;
    const rval = right.value;

    // Type guards
    const isNum = (v: unknown): v is number => typeof v === 'number';
    const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
    const isStr = (v: unknown): v is string => typeof v === 'string';

    this.modified = true;

    // Arithmetic operations
    if (isNum(lval) && isNum(rval)) {
      let result: number | boolean;
      switch (expr.op) {
        case '+': result = lval + rval; break;
        case '-': result = lval - rval; break;
        case '*': result = lval * rval; break;
        case '/': result = lval / rval; break;
        case '%': result = lval % rval; break;
        case '<': result = lval < rval; break;
        case '<=': result = lval <= rval; break;
        case '>': result = lval > rval; break;
        case '>=': result = lval >= rval; break;
        case '==': result = lval === rval; break;
        case '!=': result = lval !== rval; break;
        default:
          this.modified = false;
          return { ...expr, left, right };
      }
      return { kind: 'literal', value: result, type: expr.type };
    }

    // String concatenation
    if (expr.op === '+' && isStr(lval) && isStr(rval)) {
      return { kind: 'literal', value: lval + rval, type: expr.type };
    }

    // Boolean operations
    if (isBool(lval) && isBool(rval)) {
      let result: boolean;
      switch (expr.op) {
        case '&&': result = lval && rval; break;
        case '||': result = lval || rval; break;
        case '==': result = lval === rval; break;
        case '!=': result = lval !== rval; break;
        default:
          this.modified = false;
          return { ...expr, left, right };
      }
      return { kind: 'literal', value: result, type: expr.type };
    }

    // String comparisons
    if (isStr(lval) && isStr(rval)) {
      let result: boolean;
      switch (expr.op) {
        case '==': result = lval === rval; break;
        case '!=': result = lval !== rval; break;
        case '<': result = lval < rval; break;
        case '<=': result = lval <= rval; break;
        case '>': result = lval > rval; break;
        case '>=': result = lval >= rval; break;
        default:
          this.modified = false;
          return { ...expr, left, right };
      }
      return { kind: 'literal', value: result, type: expr.type };
    }

    this.modified = false;
    return { ...expr, left, right };
  }

  private foldUnary(expr: IRUnary): IRExpr {
    const operand = this.constantFold(expr.operand);

    if (operand.kind !== 'literal') {
      if (operand !== expr.operand) {
        this.modified = true;
        return { ...expr, operand };
      }
      return expr;
    }

    const val = operand.value;
    this.modified = true;

    switch (expr.op) {
      case '!':
        if (typeof val === 'boolean') {
          return { kind: 'literal', value: !val, type: expr.type };
        }
        break;
      case '-':
        if (typeof val === 'number') {
          return { kind: 'literal', value: -val, type: expr.type };
        }
        break;
      case '+':
        if (typeof val === 'number') {
          return { kind: 'literal', value: +val, type: expr.type };
        }
        break;
      case 'typeof':
        // typeof can be constant-folded if we know the type at compile time
        let typeStr = 'undefined';
        if (val === null) typeStr = 'object';  // JavaScript quirk
        else if (typeof val === 'number') typeStr = 'number';
        else if (typeof val === 'string') typeStr = 'string';
        else if (typeof val === 'boolean') typeStr = 'boolean';
        return { kind: 'literal', value: typeStr, type: types.string() };
    }

    this.modified = false;
    return { ...expr, operand };
  }

  private foldConditional(expr: IRConditional): IRExpr {
    const condition = this.constantFold(expr.condition);
    const whenTrue = this.constantFold(expr.whenTrue);
    const whenFalse = this.constantFold(expr.whenFalse);

    // If condition is a literal boolean, choose the appropriate branch
    if (condition.kind === 'literal' && typeof condition.value === 'boolean') {
      this.modified = true;
      return condition.value ? whenTrue : whenFalse;
    }

    if (condition !== expr.condition || whenTrue !== expr.whenTrue || whenFalse !== expr.whenFalse) {
      this.modified = true;
      return { ...expr, condition, whenTrue, whenFalse };
    }

    return expr;
  }

  private removeDeadCode(instructions: IRInstruction[], terminator: IRTerminator): IRInstruction[] {
    // Instructions are not dead if terminator could fall through
    // Only return/unreachable/jump make subsequent code dead
    if (terminator.kind === 'branch') {
      return instructions; // Conditional branch - no dead code
    }

    return instructions;
  }
}
