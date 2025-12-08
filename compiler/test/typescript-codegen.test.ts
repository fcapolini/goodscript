/**
 * TypeScript Code Generator Tests
 */

import { describe, it, expect } from 'vitest';
import { TypeScriptCodegen } from '../src/backend/typescript.js';
import { types, exprs } from '../src/ir/builder.js';
import { Ownership } from '../src/ir/types.js';
import type {
  IRProgram,
  IRModule,
  IRFunctionDecl,
  IRClassDecl,
  IRInterfaceDecl,
  IRBlock,
} from '../src/ir/types.js';

function createProgram(module: IRModule): IRProgram {
  return { modules: [module] };
}

function createBlock(id: number, instructions: any[], terminator: any): IRBlock {
  return { id, instructions, terminator };
}

describe('TypeScript Codegen - Functions', () => {
  const codegen = new TypeScriptCodegen();

  it('should generate simple function', () => {
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'add',
      params: [
        { name: 'a', type: types.number() },
        { name: 'b', type: types.number() },
      ],
      returnType: types.number(),
      body: createBlock(
        0,
        [],
        {
          kind: 'return',
          value: {
            kind: 'binary',
            op: '+',
            left: { kind: 'variable', name: 'a', version: 0, type: types.number() },
            right: { kind: 'variable', name: 'b', version: 0, type: types.number() },
            type: types.number(),
          },
        }
      ),
    };

    const module: IRModule = {
      path: 'math.gs',
      declarations: [func],
      imports: [],
    };

    const output = codegen.generate(createProgram(module));
    const code = output.get('math.ts');

    expect(code).toBeDefined();
    expect(code).toContain('export function add(a: number, b: number): number');
    expect(code).toContain('return (a + b);');
  });

  it('should generate function with multiple statements', () => {
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'test',
      params: [],
      returnType: types.number(),
      body: createBlock(
        0,
        [
          {
            kind: 'assign',
            target: { kind: 'variable', name: 'x', version: 0, type: types.number() },
            value: exprs.literal(5, types.number()),
            type: types.number(),
          },
          {
            kind: 'assign',
            target: { kind: 'variable', name: 'y', version: 0, type: types.number() },
            value: exprs.literal(10, types.number()),
            type: types.number(),
          },
        ],
        {
          kind: 'return',
          value: {
            kind: 'binary',
            op: '+',
            left: { kind: 'variable', name: 'x', version: 0, type: types.number() },
            right: { kind: 'variable', name: 'y', version: 0, type: types.number() },
            type: types.number(),
          },
        }
      ),
    };

    const module: IRModule = {
      path: 'test.gs',
      declarations: [func],
      imports: [],
    };

    const output = codegen.generate(createProgram(module));
    const code = output.get('test.ts');

    expect(code).toBeDefined();
    expect(code).toContain('const x = 5;');
    expect(code).toContain('const y = 10;');
    expect(code).toContain('return (x + y);');
  });

  it('should generate void function', () => {
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'log',
      params: [{ name: 'msg', type: types.string() }],
      returnType: types.void(),
      body: createBlock(
        0,
        [
          {
            kind: 'call',
            callee: {
              kind: 'member',
              object: { kind: 'variable', name: 'console', version: 0, type: types.primitive('void') },
              member: 'log',
              type: types.function([types.string()], types.void()),
            },
            args: [{ kind: 'variable', name: 'msg', version: 0, type: types.string() }],
            type: types.void(),
          },
        ],
        { kind: 'return' }
      ),
    };

    const module: IRModule = {
      path: 'logger.gs',
      declarations: [func],
      imports: [],
    };

    const output = codegen.generate(createProgram(module));
    const code = output.get('logger.ts');

    expect(code).toBeDefined();
    expect(code).toContain('export function log(msg: string): void');
    expect(code).toContain('console.log(msg);');
  });
});

describe('TypeScript Codegen - Classes', () => {
  const codegen = new TypeScriptCodegen();

  it('should generate simple class', () => {
    const cls: IRClassDecl = {
      kind: 'class',
      name: 'Point',
      fields: [
        { name: 'x', type: types.number(), isReadonly: false },
        { name: 'y', type: types.number(), isReadonly: false },
      ],
      constructor: undefined,
      methods: [
        {
          name: 'distance',
          params: [],
          returnType: types.number(),
          isStatic: false,
          body: createBlock(
            0,
            [],
            {
              kind: 'return',
              value: {
                kind: 'callExpr',
                callee: {
                  kind: 'member',
                  object: { kind: 'variable', name: 'Math', version: 0, type: types.primitive('void') },
                  member: 'sqrt',
                  type: types.function([types.number()], types.number()),
                },
                args: [
                  {
                    kind: 'binary',
                    op: '+',
                    left: {
                      kind: 'binary',
                      op: '*',
                      left: {
                        kind: 'member',
                        object: { kind: 'variable', name: 'this', version: 0, type: types.primitive('void') },
                        member: 'x',
                        type: types.number(),
                      },
                      right: {
                        kind: 'member',
                        object: { kind: 'variable', name: 'this', version: 0, type: types.primitive('void') },
                        member: 'x',
                        type: types.number(),
                      },
                      type: types.number(),
                    },
                    right: {
                      kind: 'binary',
                      op: '*',
                      left: {
                        kind: 'member',
                        object: { kind: 'variable', name: 'this', version: 0, type: types.primitive('void') },
                        member: 'y',
                        type: types.number(),
                      },
                      right: {
                        kind: 'member',
                        object: { kind: 'variable', name: 'this', version: 0, type: types.primitive('void') },
                        member: 'y',
                        type: types.number(),
                      },
                      type: types.number(),
                    },
                    type: types.number(),
                  },
                ],
                type: types.number(),
              },
            }
          ),
        },
      ],
    };

    const module: IRModule = {
      path: 'point.gs',
      declarations: [cls],
      imports: [],
    };

    const output = codegen.generate(createProgram(module));
    const code = output.get('point.ts');

    expect(code).toBeDefined();
    expect(code).toContain('export class Point');
    expect(code).toContain('x: number;');
    expect(code).toContain('y: number;');
    expect(code).toContain('distance(): number');
  });

  it('should generate class with constructor', () => {
    const cls: IRClassDecl = {
      kind: 'class',
      name: 'Person',
      fields: [
        { name: 'name', type: types.string(), isReadonly: true },
        { name: 'age', type: types.number(), isReadonly: false },
      ],
      methods: [],
      constructor: {
        params: [
          { name: 'name', type: types.string() },
          { name: 'age', type: types.number() },
        ],
        body: createBlock(
          0,
          [
            {
              kind: 'fieldAssign',
              object: { kind: 'variable', name: 'this', version: 0, type: types.primitive('void') },
              field: 'name',
              value: { kind: 'variable', name: 'name', version: 0, type: types.string() },
            },
            {
              kind: 'fieldAssign',
              object: { kind: 'variable', name: 'this', version: 0, type: types.primitive('void') },
              field: 'age',
              value: { kind: 'variable', name: 'age', version: 0, type: types.number() },
            },
          ],
          { kind: 'return' }
        ),
      },
    };

    const module: IRModule = {
      path: 'person.gs',
      declarations: [cls],
      imports: [],
    };

    const output = codegen.generate(createProgram(module));
    const code = output.get('person.ts');

    expect(code).toBeDefined();
    expect(code).toContain('export class Person');
    expect(code).toContain('readonly name: string;');
    expect(code).toContain('age: number;');
    expect(code).toContain('constructor(name: string, age: number)');
    expect(code).toContain('this.name = name;');
    expect(code).toContain('this.age = age;');
  });

  it('should generate class with static method', () => {
    const cls: IRClassDecl = {
      kind: 'class',
      name: 'Math',
      fields: [],
      constructor: undefined,
      methods: [
        {
          name: 'square',
          params: [{ name: 'x', type: types.number() }],
          returnType: types.number(),
          isStatic: true,
          body: createBlock(
            0,
            [],
            {
              kind: 'return',
              value: {
                kind: 'binary',
                op: '*',
                left: { kind: 'variable', name: 'x', version: 0, type: types.number() },
                right: { kind: 'variable', name: 'x', version: 0, type: types.number() },
                type: types.number(),
              },
            }
          ),
        },
      ],
    };

    const module: IRModule = {
      path: 'math.gs',
      declarations: [cls],
      imports: [],
    };

    const output = codegen.generate(createProgram(module));
    const code = output.get('math.ts');

    expect(code).toBeDefined();
    expect(code).toContain('static square(x: number): number');
  });
});

describe('TypeScript Codegen - Interfaces', () => {
  const codegen = new TypeScriptCodegen();

  it('should generate interface', () => {
    const iface: IRInterfaceDecl = {
      kind: 'interface',
      name: 'Drawable',
      properties: [
        { name: 'x', type: types.number() },
        { name: 'y', type: types.number() },
      ],
      methods: [
        {
          name: 'draw',
          params: [],
          returnType: types.void(),
        },
      ],
    };

    const module: IRModule = {
      path: 'drawable.gs',
      declarations: [iface],
      imports: [],
    };

    const output = codegen.generate(createProgram(module));
    const code = output.get('drawable.ts');

    expect(code).toBeDefined();
    expect(code).toContain('export interface Drawable');
    expect(code).toContain('x: number;');
    expect(code).toContain('y: number;');
    expect(code).toContain('draw(): void;');
  });
});

describe('TypeScript Codegen - Expressions', () => {
  const codegen = new TypeScriptCodegen();

  it('should generate binary expressions', () => {
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'calc',
      params: [],
      returnType: types.number(),
      body: createBlock(
        0,
        [],
        {
          kind: 'return',
          value: {
            kind: 'binary',
            op: '*',
            left: {
              kind: 'binary',
              op: '+',
              left: exprs.literal(2, types.number()),
              right: exprs.literal(3, types.number()),
              type: types.number(),
            },
            right: exprs.literal(4, types.number()),
            type: types.number(),
          },
        }
      ),
    };

    const module: IRModule = {
      path: 'test.gs',
      declarations: [func],
      imports: [],
    };

    const output = codegen.generate(createProgram(module));
    const code = output.get('test.ts');

    expect(code).toBeDefined();
    expect(code).toContain('return ((2 + 3) * 4);');
  });

  it('should generate array literals', () => {
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'getArray',
      params: [],
      returnType: types.array(types.number(), Ownership.Own),
      body: createBlock(
        0,
        [],
        {
          kind: 'return',
          value: {
            kind: 'array',
            elements: [
              exprs.literal(1, types.number()),
              exprs.literal(2, types.number()),
              exprs.literal(3, types.number()),
            ],
            type: types.array(types.number(), Ownership.Own),
          },
        }
      ),
    };

    const module: IRModule = {
      path: 'test.gs',
      declarations: [func],
      imports: [],
    };

    const output = codegen.generate(createProgram(module));
    const code = output.get('test.ts');

    expect(code).toBeDefined();
    expect(code).toContain('return [1, 2, 3];');
  });

  it('should generate object literals', () => {
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'getPoint',
      params: [],
      returnType: types.primitive('void'),
      body: createBlock(
        0,
        [],
        {
          kind: 'return',
          value: {
            kind: 'object',
            properties: [
              { key: 'x', value: exprs.literal(10, types.number()) },
              { key: 'y', value: exprs.literal(20, types.number()) },
            ],
            type: types.primitive('void'),
          },
        }
      ),
    };

    const module: IRModule = {
      path: 'test.gs',
      declarations: [func],
      imports: [],
    };

    const output = codegen.generate(createProgram(module));
    const code = output.get('test.ts');

    expect(code).toBeDefined();
    expect(code).toContain('return { x: 10, y: 20 };');
  });

  it('should generate string literals with escapes', () => {
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'getMessage',
      params: [],
      returnType: types.string(),
      body: createBlock(
        0,
        [],
        {
          kind: 'return',
          value: exprs.literal('Hello "World"\n', types.string()),
        }
      ),
    };

    const module: IRModule = {
      path: 'test.gs',
      declarations: [func],
      imports: [],
    };

    const output = codegen.generate(createProgram(module));
    const code = output.get('test.ts');

    expect(code).toBeDefined();
    expect(code).toContain('return "Hello \\"World\\"\\n";');
  });
});

describe('TypeScript Codegen - Imports', () => {
  const codegen = new TypeScriptCodegen();

  it('should generate imports', () => {
    const module: IRModule = {
      path: 'main.gs',
      declarations: [],
      imports: [
        {
          from: './math.js',
          names: [{ name: 'add' }, { name: 'sub' }],
        },
        {
          from: './utils.js',
          names: [{ name: 'helper', alias: 'h' }],
        },
      ],
    };

    const output = codegen.generate(createProgram(module));
    const code = output.get('main.ts');

    expect(code).toBeDefined();
    expect(code).toContain("import { add, sub } from './math.js';");
    expect(code).toContain("import { helper as h } from './utils.js';");
  });
});

describe('TypeScript Codegen - Type Annotations', () => {
  const codegen = new TypeScriptCodegen();

  it('should generate union types', () => {
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'getValue',
      params: [],
      returnType: types.union([types.number(), types.string()]),
      body: createBlock(
        0,
        [],
        { kind: 'return', value: exprs.literal(42, types.number()) }
      ),
    };

    const module: IRModule = {
      path: 'test.gs',
      declarations: [func],
      imports: [],
    };

    const output = codegen.generate(createProgram(module));
    const code = output.get('test.ts');

    expect(code).toBeDefined();
    expect(code).toContain('): number | string');
  });

  it('should generate nullable types', () => {
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'findUser',
      params: [],
      returnType: types.nullable(types.string()),
      body: createBlock(
        0,
        [],
        { kind: 'return', value: exprs.literal(null, types.nullable(types.string())) }
      ),
    };

    const module: IRModule = {
      path: 'test.gs',
      declarations: [func],
      imports: [],
    };

    const output = codegen.generate(createProgram(module));
    const code = output.get('test.ts');

    expect(code).toBeDefined();
    expect(code).toContain('): string | null');
  });
});
