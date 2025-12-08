/**
 * TypeScript Backend
 * 
 * IR → TypeScript code generation
 */

import type {
  IRProgram,
  IRModule,
  IRDeclaration,
  IRFunctionDecl,
  IRClassDecl,
  IRInterfaceDecl,
  IRTypeAliasDecl,
  IRConstDecl,
  IRBlock,
  IRInstruction,
  IRTerminator,
  IRExpr,
  IRType,
  IRParam,
  IRField,
  IRMethod,
  Ownership,
} from '../ir/types.js';

export class TypeScriptCodegen {
  private indent = 0;
  private output: string[] = [];

  generate(program: IRProgram): Map<string, string> {
    const files = new Map<string, string>();

    for (const module of program.modules) {
      this.output = [];
      this.indent = 0;
      this.generateModule(module);
      
      // Convert .gs path to .ts
      const outputPath = module.path.replace(/\.gs$/, '.ts');
      files.set(outputPath, this.output.join('\n'));
    }

    return files;
  }

  private generateModule(module: IRModule): void {
    // Generate imports
    for (const imp of module.imports) {
      this.emit(`import { ${imp.names.map(n => n.alias ? `${n.name} as ${n.alias}` : n.name).join(', ')} } from '${imp.from}';`);
    }

    if (module.imports.length > 0) {
      this.emit('');
    }

    // Generate declarations
    for (let i = 0; i < module.declarations.length; i++) {
      this.generateDeclaration(module.declarations[i]);
      if (i < module.declarations.length - 1) {
        this.emit('');
      }
    }
  }

  private generateDeclaration(decl: IRDeclaration): void {
    switch (decl.kind) {
      case 'function':
        this.generateFunction(decl);
        break;
      case 'class':
        this.generateClass(decl);
        break;
      case 'interface':
        this.generateInterface(decl);
        break;
      case 'typeAlias':
        this.generateTypeAlias(decl);
        break;
      case 'const':
        this.generateConst(decl);
        break;
    }
  }

  private generateFunction(func: IRFunctionDecl): void {
    const typeParams = func.typeParams && func.typeParams.length > 0
      ? `<${func.typeParams.map(tp => this.generateTypeParam(tp)).join(', ')}>`
      : '';
    
    const params = func.params.map(p => this.generateParam(p)).join(', ');
    const returnType = this.generateType(func.returnType);

    this.emit(`export function ${func.name}${typeParams}(${params}): ${returnType} {`);
    this.indent++;
    this.generateBlockStatements(func.body);
    this.indent--;
    this.emit('}');
  }

  private generateClass(cls: IRClassDecl): void {
    const typeParams = cls.typeParams && cls.typeParams.length > 0
      ? `<${cls.typeParams.map(tp => this.generateTypeParam(tp)).join(', ')}>`
      : '';
    
    const extendsClause = cls.extends ? ` extends ${cls.extends}` : '';
    const implementsClause = cls.implements && cls.implements.length > 0
      ? ` implements ${cls.implements.join(', ')}`
      : '';

    this.emit(`export class ${cls.name}${typeParams}${extendsClause}${implementsClause} {`);
    this.indent++;

    // Fields
    for (const field of cls.fields) {
      this.generateField(field);
    }

    if (cls.fields.length > 0 && (cls.constructor || cls.methods.length > 0)) {
      this.emit('');
    }

    // Constructor
    if (cls.constructor) {
      const params = cls.constructor.params.map(p => this.generateParam(p)).join(', ');
      this.emit(`constructor(${params}) {`);
      this.indent++;
      this.generateBlockStatements(cls.constructor.body);
      this.indent--;
      this.emit('}');
      
      if (cls.methods.length > 0) {
        this.emit('');
      }
    }

    // Methods
    for (let i = 0; i < cls.methods.length; i++) {
      this.generateMethod(cls.methods[i]);
      if (i < cls.methods.length - 1) {
        this.emit('');
      }
    }

    this.indent--;
    this.emit('}');
  }

  private generateInterface(iface: IRInterfaceDecl): void {
    const typeParams = iface.typeParams && iface.typeParams.length > 0
      ? `<${iface.typeParams.map(tp => this.generateTypeParam(tp)).join(', ')}>`
      : '';
    
    const extendsClause = iface.extends && iface.extends.length > 0
      ? ` extends ${iface.extends.join(', ')}`
      : '';

    this.emit(`export interface ${iface.name}${typeParams}${extendsClause} {`);
    this.indent++;

    // Properties
    for (const prop of iface.properties) {
      this.emit(`${prop.name}: ${this.generateType(prop.type)};`);
    }

    // Methods
    for (const method of iface.methods) {
      const params = method.params.map(p => this.generateParam(p)).join(', ');
      const returnType = this.generateType(method.returnType);
      this.emit(`${method.name}(${params}): ${returnType};`);
    }

    this.indent--;
    this.emit('}');
  }

  private generateTypeAlias(alias: IRTypeAliasDecl): void {
    const typeParams = alias.typeParams && alias.typeParams.length > 0
      ? `<${alias.typeParams.map(tp => this.generateTypeParam(tp)).join(', ')}>`
      : '';
    
    this.emit(`export type ${alias.name}${typeParams} = ${this.generateType(alias.type)};`);
  }

  private generateConst(constDecl: IRConstDecl): void {
    this.emit(`export const ${constDecl.name}: ${this.generateType(constDecl.type)} = ${this.generateExpr(constDecl.value)};`);
  }

  private generateField(field: IRField): void {
    const readonly = field.isReadonly ? 'readonly ' : '';
    const initializer = field.initializer ? ` = ${this.generateExpr(field.initializer)}` : '';
    this.emit(`${readonly}${field.name}: ${this.generateType(field.type)}${initializer};`);
  }

  private generateMethod(method: IRMethod): void {
    const staticMod = method.isStatic ? 'static ' : '';
    const params = method.params.map(p => this.generateParam(p)).join(', ');
    const returnType = this.generateType(method.returnType);

    this.emit(`${staticMod}${method.name}(${params}): ${returnType} {`);
    this.indent++;
    this.generateBlockStatements(method.body);
    this.indent--;
    this.emit('}');
  }

  private generateBlockStatements(block: IRBlock): void {
    // Generate instructions
    for (const inst of block.instructions) {
      this.generateInstruction(inst);
    }

    // Generate terminator
    this.generateTerminator(block.terminator);
  }

  private generateInstruction(inst: IRInstruction): void {
    switch (inst.kind) {
      case 'assign':
        this.emit(`const ${inst.target.name} = ${this.generateExpr(inst.value)};`);
        break;
      case 'call':
        if (inst.target) {
          this.emit(`const ${inst.target.name} = ${this.generateExpr(inst.callee)}(${inst.args.map(a => this.generateExpr(a)).join(', ')});`);
        } else {
          this.emit(`${this.generateExpr(inst.callee)}(${inst.args.map(a => this.generateExpr(a)).join(', ')});`);
        }
        break;
      case 'fieldAssign':
        this.emit(`${this.generateExpr(inst.object)}.${inst.field} = ${this.generateExpr(inst.value)};`);
        break;
      case 'expr':
        this.emit(`${this.generateExpr(inst.value)};`);
        break;
    }
  }

  private generateTerminator(term: IRTerminator): void {
    switch (term.kind) {
      case 'return':
        if (term.value) {
          this.emit(`return ${this.generateExpr(term.value)};`);
        } else {
          this.emit(`return;`);
        }
        break;
      case 'branch':
        // Branch should have been lowered to if statements
        // For now, generate a comment
        this.emit(`// Branch: if (${this.generateExpr(term.condition)}) goto ${term.trueBranch} else goto ${term.falseBranch}`);
        break;
      case 'jump':
        this.emit(`// Jump to block ${term.target}`);
        break;
      case 'unreachable':
        this.emit(`throw new Error('Unreachable code');`);
        break;
    }
  }

  private generateExpr(expr: IRExpr): string {
    switch (expr.kind) {
      case 'literal':
        return this.generateLiteral(expr.value);
      case 'variable':
        return expr.name;
      case 'binary':
        return `(${this.generateExpr(expr.left)} ${expr.op} ${this.generateExpr(expr.right)})`;
      case 'unary':
        return `${expr.op}${this.generateExpr(expr.operand)}`;
      case 'member':
        return `${this.generateExpr(expr.object)}.${expr.member}`;
      case 'index':
        return `${this.generateExpr(expr.object)}[${this.generateExpr(expr.index)}]`;
      case 'callExpr':
        return `${this.generateExpr(expr.callee)}(${expr.args.map(a => this.generateExpr(a)).join(', ')})`;
      case 'new':
        return `new ${expr.className}(${expr.args.map(a => this.generateExpr(a)).join(', ')})`;
      case 'array':
        return `[${expr.elements.map(e => this.generateExpr(e)).join(', ')}]`;
      case 'object':
        return `{ ${expr.properties.map(p => `${p.key}: ${this.generateExpr(p.value)}`).join(', ')} }`;
      case 'move':
      case 'borrow':
        // In TypeScript, these are no-ops (ownership is not enforced)
        return this.generateExpr(expr.source);
    }
  }

  private generateLiteral(value: number | string | boolean | null): string {
    if (value === null) {
      return 'null';
    }
    if (typeof value === 'string') {
      // Escape string properly
      return JSON.stringify(value);
    }
    return String(value);
  }

  private generateType(type: IRType): string {
    switch (type.kind) {
      case 'primitive':
        return this.generatePrimitiveType(type.type);
      case 'class':
      case 'interface':
        return this.generateNamedType(type.name, type.typeArgs);
      case 'array':
        return `${this.generateType(type.element)}[]`;
      case 'map':
        return `Map<${this.generateType(type.key)}, ${this.generateType(type.value)}>`;
      case 'function': {
        const params = type.params.map((p, i) => `arg${i}: ${this.generateType(p)}`).join(', ');
        return `(${params}) => ${this.generateType(type.returnType)}`;
      }
      case 'union':
        return type.types.map(t => this.generateType(t)).join(' | ');
      case 'nullable':
        return `${this.generateType(type.inner)} | null`;
    }
  }

  private generatePrimitiveType(type: string): string {
    switch (type) {
      case 'number':
      case 'integer':
      case 'integer53':
        return 'number';
      case 'string':
        return 'string';
      case 'boolean':
        return 'boolean';
      case 'void':
        return 'void';
      case 'never':
        return 'never';
      default:
        return 'unknown';
    }
  }

  private generateNamedType(name: string, typeArgs?: IRType[]): string {
    if (typeArgs && typeArgs.length > 0) {
      return `${name}<${typeArgs.map(t => this.generateType(t)).join(', ')}>`;
    }
    return name;
  }

  private generateParam(param: IRParam): string {
    return `${param.name}: ${this.generateType(param.type)}`;
  }

  private generateTypeParam(tp: { name: string; constraint?: IRType }): string {
    if (tp.constraint) {
      return `${tp.name} extends ${this.generateType(tp.constraint)}`;
    }
    return tp.name;
  }

  private emit(line: string): void {
    const indentation = '  '.repeat(this.indent);
    this.output.push(indentation + line);
  }
}
