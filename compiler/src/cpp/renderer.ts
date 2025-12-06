/**
 * C++ AST Renderer
 * 
 * Converts C++ AST nodes to formatted C++ source code strings.
 * Uses the Visitor pattern to traverse the AST.
 */

import * as AST from './ast';

/**
 * Options for rendering C++ code
 */
export interface RenderOptions {
  indentSize?: number;
  indentChar?: string;
  lineWidth?: number;
}

/**
 * Renders C++ AST to source code string
 */
export class CppRenderer implements AST.CppVisitor<string> {
  private indentLevel = 0;
  private readonly indentSize: number;
  private readonly indentChar: string;
  private readonly lineWidth: number;

  constructor(options: RenderOptions = {}) {
    this.indentSize = options.indentSize || 2;
    this.indentChar = options.indentChar || ' ';
    this.lineWidth = options.lineWidth || 100;
  }

  /**
   * Render a C++ AST node to string
   */
  render(node: AST.CppNode): string {
    return node.accept(this);
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private indent(): string {
    return this.indentChar.repeat(this.indentLevel * this.indentSize);
  }

  private increaseIndent(): void {
    this.indentLevel++;
  }

  private decreaseIndent(): void {
    if (this.indentLevel > 0) {
      this.indentLevel--;
    }
  }

  private line(content: string): string {
    return this.indent() + content;
  }

  private lines(...contents: string[]): string {
    return contents.map(c => this.line(c)).join('\n');
  }

  private escapeCppString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t')
      .replace(/\r/g, '\\r');
  }

  // ============================================================================
  // Visitor implementation
  // ============================================================================

  visitTranslationUnit(node: AST.TranslationUnit): string {
    const parts: string[] = [];

    // Includes
    for (const include of node.includes) {
      parts.push(include.accept(this));
    }

    if (node.includes.length > 0) {
      parts.push('');
    }

    // Declarations
    for (const decl of node.declarations) {
      parts.push(decl.accept(this));
      parts.push('');
    }

    // Main function (outside namespace)
    if (node.mainFunction) {
      parts.push(node.mainFunction.accept(this));
    }

    return parts.join('\n');
  }

  visitInclude(node: AST.Include): string {
    const brackets = node.isSystemHeader ? ['<', '>'] : ['"', '"'];
    return `#include ${brackets[0]}${node.path}${brackets[1]}`;
  }

  visitNamespace(node: AST.Namespace): string {
    const parts: string[] = [];
    
    parts.push(`namespace ${node.name} {`);
    parts.push('');

    this.increaseIndent();
    for (const decl of node.declarations) {
      parts.push(decl.accept(this));
      parts.push('');
    }
    this.decreaseIndent();

    parts.push(`} // namespace ${node.name}`);

    return parts.join('\n');
  }

  visitClass(node: AST.Class): string {
    const parts: string[] = [];

    // Template declaration
    if (node.templateParams.length > 0) {
      parts.push(this.line(`template<${node.templateParams.map(p => `typename ${p}`).join(', ')}>`));
    }

    // Class/struct declaration
    const keyword = node.isStruct ? 'struct' : 'class';
    let classDecl = `${keyword} ${node.name}`;
    
    // Handle base classes (backwards compatible with single baseClass)
    const bases: string[] = [];
    if (node.baseClass) {
      bases.push(`public ${node.baseClass}`);
    }
    if (node.baseClasses && node.baseClasses.length > 0) {
      bases.push(...node.baseClasses.map(bc => `public ${bc}`));
    }
    if (bases.length > 0) {
      classDecl += ` : ${bases.join(', ')}`;
    }
    
    parts.push(this.line(`${classDecl} {`));

    this.increaseIndent();

    // Group members by access specifier
    const publicMembers: string[] = [];
    const privateMembers: string[] = [];
    const protectedMembers: string[] = [];

    // Add fields
    for (const field of node.fields) {
      const rendered = field.accept(this);
      switch (field.access) {
        case AST.AccessSpecifier.Public:
          publicMembers.push(rendered);
          break;
        case AST.AccessSpecifier.Private:
          privateMembers.push(rendered);
          break;
        case AST.AccessSpecifier.Protected:
          protectedMembers.push(rendered);
          break;
      }
    }

    // Add constructors (with class name)
    for (const ctor of node.constructors) {
      const rendered = this.renderConstructor(node.name, ctor);
      switch (ctor.access) {
        case AST.AccessSpecifier.Public:
          publicMembers.push(rendered);
          break;
        case AST.AccessSpecifier.Private:
          privateMembers.push(rendered);
          break;
        case AST.AccessSpecifier.Protected:
          protectedMembers.push(rendered);
          break;
      }
    }

    // Add methods
    for (const method of node.methods) {
      const rendered = method.accept(this);
      switch (method.access) {
        case AST.AccessSpecifier.Public:
          publicMembers.push(rendered);
          break;
        case AST.AccessSpecifier.Private:
          privateMembers.push(rendered);
          break;
        case AST.AccessSpecifier.Protected:
          protectedMembers.push(rendered);
          break;
      }
    }

    // Emit in standard order: public, protected, private
    if (publicMembers.length > 0) {
      parts.push(this.line('public:'));
      this.increaseIndent();
      for (const member of publicMembers) {
        parts.push(member);
      }
      this.decreaseIndent();
      parts.push('');
    }

    if (protectedMembers.length > 0) {
      parts.push(this.line('protected:'));
      this.increaseIndent();
      for (const member of protectedMembers) {
        parts.push(member);
      }
      this.decreaseIndent();
      parts.push('');
    }

    if (privateMembers.length > 0) {
      parts.push(this.line('private:'));
      this.increaseIndent();
      for (const member of privateMembers) {
        parts.push(member);
      }
      this.decreaseIndent();
      parts.push('');
    }

    this.decreaseIndent();
    parts.push(this.line('};'));

    return parts.join('\n');
  }

  visitEnum(node: AST.Enum): string {
    const parts: string[] = [];
    
    parts.push(this.line(`enum class ${node.name} {`));
    
    this.increaseIndent();
    const members: string[] = [];
    for (let i = 0; i < node.members.length; i++) {
      const member = node.members[i];
      let memberStr = member.name;
      if (member.value !== undefined) {
        memberStr += ` = ${member.value}`;
      }
      // Add comma except for last member
      if (i < node.members.length - 1) {
        memberStr += ',';
      }
      members.push(this.line(memberStr));
    }
    parts.push(...members);
    this.decreaseIndent();
    
    parts.push(this.line('};'));
    
    return parts.join('\n');
  }

  /**
   * Render constructor with class name (called from visitClass)
   */
  private renderConstructor(className: string, node: AST.Constructor): string {
    const parts: string[] = [];
    
    const params = node.params.map(p => p.accept(this)).join(', ');
    let signature = `${className}(${params})`;

    // Initializer list
    if (node.initializerList.length > 0) {
      const inits = node.initializerList.map(init => {
        if (Array.isArray(init.value)) {
          // Multiple arguments for base class constructor
          const args = init.value.map(v => v.accept(this)).join(', ');
          return `${init.memberName}(${args})`;
        } else {
          // Single expression
          return `${init.memberName}(${init.value.accept(this)})`;
        }
      });
      signature += ` : ${inits.join(', ')}`;
    }

    parts.push(this.line(`${signature} {`));

    // Body
    this.increaseIndent();
    for (const stmt of node.body.statements) {
      parts.push(stmt.accept(this));
    }
    this.decreaseIndent();

    parts.push(this.line('}'));

    return parts.join('\n');
  }

  visitField(node: AST.Field): string {
    let result = this.line(`${node.type.toString()} ${node.name}`);
    if (node.initializer) {
      result += ` = ${node.initializer.accept(this)}`;
    }
    result += ';';
    return result;
  }

  visitConstructor(node: AST.Constructor): string {
    // Note: Constructors should be rendered via renderConstructor in visitClass
    // This is a fallback for standalone rendering (mainly for testing)
    const parts: string[] = [];
    
    const params = node.params.map(p => p.accept(this)).join(', ');
    let signature = `(${params})`;

    // Initializer list
    if (node.initializerList.length > 0) {
      const inits = node.initializerList.map(init => {
        if (Array.isArray(init.value)) {
          const args = init.value.map(v => v.accept(this)).join(', ');
          return `${init.memberName}(${args})`;
        } else {
          return `${init.memberName}(${init.value.accept(this)})`;
        }
      });
      signature += `\n${this.indent()}  : ${inits.join(', ')}`;
    }

    parts.push(this.line(`${signature} {`));

    // Body
    this.increaseIndent();
    for (const stmt of node.body.statements) {
      parts.push(stmt.accept(this));
    }
    this.decreaseIndent();

    parts.push(this.line('}'));

    return parts.join('\n');
  }

  visitMethod(node: AST.Method): string {
    const parts: string[] = [];

    // Template declaration for generic methods
    if (node.templateParams.length > 0) {
      parts.push(this.line(`template<${node.templateParams.map(p => `typename ${p}`).join(', ')}>`));
    }

    // Method signature
    let signature = '';
    if (node.isStatic) signature += 'static ';
    if (node.isVirtual) signature += 'virtual ';
    signature += `${node.returnType.toString()} ${node.name}(`;
    signature += node.params.map(p => p.accept(this)).join(', ');
    signature += ')';
    if (node.isConst) signature += ' const';
    if (node.isOverride) signature += ' override';
    
    // Handle special cases (pure virtual and default)
    if (node.isPureVirtual) {
      // Pure virtual method - no body
      parts.push(this.line(`${signature} = 0;`));
      return parts.join('\n');
    }
    if (node.isDefault) {
      // Default implementation (for destructors)
      parts.push(this.line(`${signature} = default;`));
      return parts.join('\n');
    }

    parts.push(this.line(`${signature} {`));

    // Body
    this.increaseIndent();
    for (const stmt of node.body.statements) {
      parts.push(stmt.accept(this));
    }
    this.decreaseIndent();

    parts.push(this.line('}'));

    return parts.join('\n');
  }

  visitFunction(node: AST.Function): string {
    const parts: string[] = [];

    // Template declaration
    if (node.templateParams.length > 0) {
      parts.push(this.line(`template<${node.templateParams.map(p => `typename ${p}`).join(', ')}>`));
    }

    // Function signature
    const params = node.params.map(p => p.accept(this)).join(', ');
    parts.push(this.line(`${node.returnType.toString()} ${node.name}(${params}) {`));

    // Body
    this.increaseIndent();
    for (const stmt of node.body.statements) {
      parts.push(stmt.accept(this));
    }
    this.decreaseIndent();

    parts.push(this.line('}'));

    return parts.join('\n');
  }

  visitParameter(node: AST.Parameter): string {
    let result = '';
    if (node.passByMutableRef) {
      result = `${node.type.toString()}& ${node.name}`;
    } else if (node.passByConstRef) {
      result = `const ${node.type.toString()}& ${node.name}`;
    } else {
      result = `${node.type.toString()} ${node.name}`;
    }
    if (node.defaultValue) {
      result += ` = ${node.defaultValue.accept(this)}`;
    }
    return result;
  }

  visitVariableDecl(node: AST.VariableDecl): string {
    const constModifier = node.isConst ? 'const ' : '';
    let result = this.line(`${constModifier}${node.type.toString()} ${node.name}`);
    if (node.initializer) {
      result += ` = ${node.initializer.accept(this)}`;
    }
    result += ';';
    return result;
  }

  visitExpressionStmt(node: AST.ExpressionStmt): string {
    return this.line(`${node.expression.accept(this)};`);
  }

  visitReturnStmt(node: AST.ReturnStmt): string {
    if (node.value) {
      return this.line(`return ${node.value.accept(this)};`);
    }
    return this.line('return;');
  }

  visitCoReturnStmt(node: AST.CoReturnStmt): string {
    if (node.value) {
      return this.line(`co_return ${node.value.accept(this)};`);
    }
    return this.line('co_return;');
  }

  visitIfStmt(node: AST.IfStmt): string {
    const parts: string[] = [];
    
    parts.push(this.line(`if (${node.condition.accept(this)}) {`));
    
    this.increaseIndent();
    if (node.thenBranch instanceof AST.Block) {
      for (const stmt of node.thenBranch.statements) {
        parts.push(stmt.accept(this));
      }
    } else {
      parts.push(node.thenBranch.accept(this));
    }
    this.decreaseIndent();

    if (node.elseBranch) {
      parts.push(this.line('} else {'));
      this.increaseIndent();
      if (node.elseBranch instanceof AST.Block) {
        for (const stmt of node.elseBranch.statements) {
          parts.push(stmt.accept(this));
        }
      } else {
        parts.push(node.elseBranch.accept(this));
      }
      this.decreaseIndent();
      parts.push(this.line('}'));
    } else {
      parts.push(this.line('}'));
    }

    return parts.join('\n');
  }

  visitWhileStmt(node: AST.WhileStmt): string {
    const parts: string[] = [];
    
    parts.push(this.line(`while (${node.condition.accept(this)}) {`));
    
    this.increaseIndent();
    if (node.body instanceof AST.Block) {
      for (const stmt of node.body.statements) {
        parts.push(stmt.accept(this));
      }
    } else {
      parts.push(node.body.accept(this));
    }
    this.decreaseIndent();

    parts.push(this.line('}'));

    return parts.join('\n');
  }

  visitForStmt(node: AST.ForStmt): string {
    const parts: string[] = [];

    let header = 'for (';
    
    // Init
    if (node.init) {
      const initStr = node.init.accept(this).trim();
      // Remove semicolon and leading indent from init statement
      header += initStr.replace(/;$/, '').replace(/^\s+/, '');
    }
    header += '; ';

    // Condition
    if (node.condition) {
      header += node.condition.accept(this);
    }
    header += '; ';

    // Increment
    if (node.increment) {
      header += node.increment.accept(this);
    }
    header += ') {';

    parts.push(this.line(header));

    // Body
    this.increaseIndent();
    if (node.body instanceof AST.Block) {
      for (const stmt of node.body.statements) {
        parts.push(stmt.accept(this));
      }
    } else {
      parts.push(node.body.accept(this));
    }
    this.decreaseIndent();

    parts.push(this.line('}'));

    return parts.join('\n');
  }
  
  visitRangeForStmt(node: AST.RangeForStmt): string {
    const parts: string[] = [];
    
    // for (const auto& varName : iterable) {
    const constPrefix = node.isConst ? 'const ' : '';
    const header = `for (${constPrefix}auto& ${node.variable} : ${node.iterable.accept(this)}) {`;
    
    parts.push(this.line(header));
    
    // Body
    this.increaseIndent();
    if (node.body instanceof AST.Block) {
      for (const stmt of node.body.statements) {
        parts.push(stmt.accept(this));
      }
    } else {
      parts.push(node.body.accept(this));
    }
    this.decreaseIndent();

    parts.push(this.line('}'));
    return parts.join('\n');
  }

  visitBlock(node: AST.Block): string {
    const parts: string[] = [];
    
    parts.push(this.line('{'));
    
    this.increaseIndent();
    for (const stmt of node.statements) {
      parts.push(stmt.accept(this));
    }
    this.decreaseIndent();

    parts.push(this.line('}'));

    return parts.join('\n');
  }

  visitThrowStmt(node: AST.ThrowStmt): string {
    return this.line(`throw ${node.expression.accept(this)};`);
  }

  visitTryCatch(node: AST.TryCatch): string {
    const parts: string[] = [];

    parts.push(this.line('try {'));
    
    this.increaseIndent();
    for (const stmt of node.tryBlock.statements) {
      parts.push(stmt.accept(this));
    }
    this.decreaseIndent();

    parts.push(this.line(`} catch (${node.catchType.toString()} ${node.catchVar}) {`));

    this.increaseIndent();
    for (const stmt of node.catchBlock.statements) {
      parts.push(stmt.accept(this));
    }
    this.decreaseIndent();

    parts.push(this.line('}'));

    return parts.join('\n');
  }

  visitBreakStmt(node: AST.BreakStmt): string {
    return this.line('break;');
  }

  visitContinueStmt(node: AST.ContinueStmt): string {
    return this.line('continue;');
  }

  visitBinaryExpr(node: AST.BinaryExpr): string {
    return `${node.left.accept(this)} ${node.operator} ${node.right.accept(this)}`;
  }

  visitUnaryExpr(node: AST.UnaryExpr): string {
    if (node.isPrefix) {
      return `${node.operator}${node.operand.accept(this)}`;
    } else {
      return `${node.operand.accept(this)}${node.operator}`;
    }
  }

  visitCallExpr(node: AST.CallExpr): string {
    let result = node.callee.accept(this);
    
    // Template arguments
    if (node.templateArgs.length > 0) {
      result += `<${node.templateArgs.map(t => t.toString()).join(', ')}>`;
    }

    // Arguments
    result += `(${node.args.map(a => a.accept(this)).join(', ')})`;

    return result;
  }

  visitMemberExpr(node: AST.MemberExpr): string {
    const op = node.isPointer ? '->' : '.';
    return `${node.object.accept(this)}${op}${node.member}`;
  }

  visitSubscriptExpr(node: AST.SubscriptExpr): string {
    return `${node.object.accept(this)}[${node.index.accept(this)}]`;
  }

  visitIdentifier(node: AST.Identifier): string {
    return node.name;
  }

  visitLiteral(node: AST.Literal): string {
    switch (node.type) {
      case 'string':
        return `"${this.escapeCppString(node.value as string)}"`;
      case 'number':
        const num = node.value as number;
        // For floating point, ensure decimal point; for integers, don't add .0
        // This matches C++'s literal rules: 42 is int, 42.0 is double
        return num.toString();
      case 'boolean':
        return node.value ? 'true' : 'false';
      case 'null':
        return 'nullptr';
      default:
        return String(node.value);
    }
  }

  visitCast(node: AST.Cast): string {
    const castFn = `${node.castType}_cast`;
    return `${castFn}<${node.type.toString()}>(${node.expression.accept(this)})`;
  }

  visitNew(node: AST.New): string {
    if (node.smartPtrType === 'unique') {
      return `std::make_unique<${node.type.toString()}>(${node.args.map(a => a.accept(this)).join(', ')})`;
    } else if (node.smartPtrType === 'shared') {
      return `gs::make_shared<${node.type.toString()}>(${node.args.map(a => a.accept(this)).join(', ')})`;
    } else {
      return `new ${node.type.toString()}(${node.args.map(a => a.accept(this)).join(', ')})`;
    }
  }

  visitLambda(node: AST.Lambda): string {
    const params = node.params.map(p => p.accept(this)).join(', ');
    const returnType = node.returnType ? ` -> ${node.returnType.toString()}` : '';

    if (node.body instanceof AST.Block) {
      const parts: string[] = [];
      parts.push(`${node.capture}(${params})${returnType} {`);
      
      this.increaseIndent();
      for (const stmt of node.body.statements) {
        parts.push(stmt.accept(this));
      }
      this.decreaseIndent();

      parts.push(this.indent() + '}');
      return parts.join('\n');
    } else {
      // Expression body
      return `${node.capture}(${params})${returnType} { return ${node.body.accept(this)}; }`;
    }
  }

  visitArrayInit(node: AST.ArrayInit): string {
    if (node.elements.length === 0) {
      if (node.elementType) {
        return `std::vector<${node.elementType.toString()}>{}`;
      }
      return '{}';
    }
    const elements = node.elements.map(e => e.accept(this)).join(', ');
    return `{${elements}}`;
  }

  visitMapInit(node: AST.MapInit): string {
    if (node.entries.length === 0) {
      if (node.keyType && node.valueType) {
        return `std::unordered_map<${node.keyType.toString()}, ${node.valueType.toString()}>{}`;
      }
      return '{}';
    }
    const entries = node.entries.map(([k, v]) => 
      `{${k.accept(this)}, ${v.accept(this)}}`
    ).join(', ');
    return `{${entries}}`;
  }

  visitParenExpr(node: AST.ParenExpr): string {
    return `(${node.expression.accept(this)})`;
  }

  visitConditionalExpr(node: AST.ConditionalExpr): string {
    const cond = node.condition.accept(this);
    const whenTrue = node.whenTrue.accept(this);
    const whenFalse = node.whenFalse.accept(this);
    return `(${cond} ? ${whenTrue} : ${whenFalse})`;
  }

  visitInitializerList(node: AST.InitializerList): string {
    if (node.elements.length === 0) {
      return '{}';
    }
    const elements = node.elements.map(e => e.accept(this)).join(', ');
    return `{${elements}}`;
  }

  visitAwaitExpr(node: AST.AwaitExpr): string {
    return `co_await ${node.expression.accept(this)}`;
  }

  visitRawStatement(node: AST.RawStatement): string {
    return this.line(node.code + ';');
  }

  visitRawDeclaration(node: AST.RawDeclaration): string {
    return this.line(node.code);
  }

  visitRawExpression(node: AST.RawExpression): string {
    return node.code;
  }
}

/**
 * Convenience function to render a C++ AST node
 */
export function render(node: AST.CppNode, options?: RenderOptions): string {
  const renderer = new CppRenderer(options);
  return renderer.render(node);
}
