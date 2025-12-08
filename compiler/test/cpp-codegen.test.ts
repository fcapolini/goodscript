/**
 * C++ Code Generator Tests
 */

import { describe, it, expect } from 'vitest';
import { CppCodegen } from '../src/backend/cpp/codegen.js';
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

describe('C++ Codegen - GC Mode - Functions', () => {
  const codegen = new CppCodegen();

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

    const output = codegen.generate(createProgram(module), 'gc');
    
    const header = output.get('math.hpp');
    const source = output.get('math.cpp');

    expect(header).toBeDefined();
    expect(source).toBeDefined();

    // Check header
    expect(header).toContain('#pragma once');
    expect(header).toContain('namespace goodscript');
    expect(header).toContain('double add(double a, double b);');

    // Check source
    expect(source).toContain('#include "math.hpp"');
    expect(source).toContain('double add(double a, double b)');
    expect(source).toContain('return (a + b);');
  });

  it('should generate function with integer types', () => {
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'square',
      params: [{ name: 'x', type: types.integer() }],
      returnType: types.integer(),
      body: createBlock(
        0,
        [],
        {
          kind: 'return',
          value: {
            kind: 'binary',
            op: '*',
            left: { kind: 'variable', name: 'x', version: 0, type: types.integer() },
            right: { kind: 'variable', name: 'x', version: 0, type: types.integer() },
            type: types.integer(),
          },
        }
      ),
    };

    const module: IRModule = {
      path: 'math.gs',
      declarations: [func],
      imports: [],
    };

    const output = codegen.generate(createProgram(module), 'gc');
    const header = output.get('math.hpp');

    expect(header).toContain('int32_t square(int32_t x);');
  });

  it('should generate void function', () => {
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'log',
      params: [{ name: 'msg', type: types.string() }],
      returnType: types.void(),
      body: createBlock(
        0,
        [],
        { kind: 'return' }
      ),
    };

    const module: IRModule = {
      path: 'logger.gs',
      declarations: [func],
      imports: [],
    };

    const output = codegen.generate(createProgram(module), 'gc');
    const header = output.get('logger.hpp');
    const source = output.get('logger.cpp');

    expect(header).toContain('void log(std::string msg);');
    expect(source).toContain('void log(std::string msg)');
  });
});

describe('C++ Codegen - GC Mode - Classes', () => {
  const codegen = new CppCodegen();

  it('should generate simple class', () => {
    const cls: IRClassDecl = {
      kind: 'class',
      name: 'Point',
      fields: [
        { name: 'x', type: types.number(), isReadonly: false },
        { name: 'y', type: types.number(), isReadonly: false },
      ],
      methods: [
        {
          name: 'distance',
          params: [],
          returnType: types.number(),
          isStatic: false,
          body: createBlock(
            0,
            [],
            { kind: 'return', value: exprs.literal(0, types.number()) }
          ),
        },
      ],
      constructor: undefined,
    };

    const module: IRModule = {
      path: 'point.gs',
      declarations: [cls],
      imports: [],
    };

    const output = codegen.generate(createProgram(module), 'gc');
    const header = output.get('point.hpp');
    const source = output.get('point.cpp');

    expect(header).toBeDefined();
    expect(source).toBeDefined();

    // Check header
    expect(header).toContain('class Point {');
    expect(header).toContain('double distance();');
    expect(header).toContain('double x_;');
    expect(header).toContain('double y_;');

    // Check source
    expect(source).toContain('double Point::distance()');
  });

  it('should generate class with constructor', () => {
    const cls: IRClassDecl = {
      kind: 'class',
      name: 'Person',
      fields: [
        { name: 'name', type: types.string(), isReadonly: true },
      ],
      methods: [],
      constructor: {
        params: [{ name: 'name', type: types.string() }],
        body: createBlock(
          0,
          [
            {
              kind: 'fieldAssign',
              object: { kind: 'variable', name: 'this', version: 0, type: types.primitive('void') },
              field: 'name_',
              value: { kind: 'variable', name: 'name', version: 0, type: types.string() },
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

    const output = codegen.generate(createProgram(module), 'gc');
    const header = output.get('person.hpp');
    const source = output.get('person.cpp');

    expect(header).toContain('Person(std::string name);');
    expect(source).toContain('Person::Person(std::string name)');
    expect(source).toContain('this.name_ = name;');
  });
});

describe('C++ Codegen - GC Mode - Interfaces', () => {
  const codegen = new CppCodegen();

  it('should generate interface as struct', () => {
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

    const output = codegen.generate(createProgram(module), 'gc');
    const header = output.get('drawable.hpp');

    expect(header).toBeDefined();
    expect(header).toContain('struct Drawable {');
    expect(header).toContain('double x;');
    expect(header).toContain('double y;');
    expect(header).toContain('virtual void draw() = 0;');
    expect(header).toContain('virtual ~Drawable() = default;');
  });
});

describe('C++ Codegen - Ownership Mode', () => {
  const codegen = new CppCodegen();

  it('should generate unique_ptr for own<T>', () => {
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'create',
      params: [],
      returnType: types.class('Point', Ownership.Own),
      body: createBlock(
        0,
        [],
        {
          kind: 'return',
          value: {
            kind: 'new',
            className: 'Point',
            args: [],
            type: types.class('Point', Ownership.Own),
          },
        }
      ),
    };

    const module: IRModule = {
      path: 'factory.gs',
      declarations: [func],
      imports: [],
    };

    const output = codegen.generate(createProgram(module), 'ownership');
    const header = output.get('factory.hpp');
    const source = output.get('factory.cpp');

    expect(header).toContain('std::unique_ptr<Point> create();');
    expect(source).toContain('std::make_unique<Point>()');
  });

  it('should generate shared_ptr for share<T>', () => {
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'getShared',
      params: [],
      returnType: types.class('Data', Ownership.Share),
      body: createBlock(
        0,
        [],
        { kind: 'return', value: exprs.literal(null, types.class('Data', Ownership.Share)) }
      ),
    };

    const module: IRModule = {
      path: 'data.gs',
      declarations: [func],
      imports: [],
    };

    const output = codegen.generate(createProgram(module), 'ownership');
    const header = output.get('data.hpp');

    expect(header).toContain('std::shared_ptr<Data> getShared();');
  });

  it('should generate raw pointer for use<T>', () => {
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'borrow',
      params: [{ name: 'ptr', type: types.class('Node', Ownership.Use) }],
      returnType: types.void(),
      body: createBlock(
        0,
        [],
        { kind: 'return' }
      ),
    };

    const module: IRModule = {
      path: 'node.gs',
      declarations: [func],
      imports: [],
    };

    const output = codegen.generate(createProgram(module), 'ownership');
    const header = output.get('node.hpp');

    expect(header).toContain('void borrow(Node* ptr);');
  });
});

describe('C++ Codegen - Types', () => {
  const codegen = new CppCodegen();

  it('should generate std::vector for arrays', () => {
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'getNumbers',
      params: [],
      returnType: types.array(types.number()),
      body: createBlock(
        0,
        [],
        {
          kind: 'return',
          value: {
            kind: 'array',
            elements: [],
            type: types.array(types.number()),
          },
        }
      ),
    };

    const module: IRModule = {
      path: 'test.gs',
      declarations: [func],
      imports: [],
    };

    const output = codegen.generate(createProgram(module), 'gc');
    const header = output.get('test.hpp');

    expect(header).toContain('std::vector<double> getNumbers();');
  });

  it('should generate std::map for maps', () => {
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'getMap',
      params: [],
      returnType: types.map(types.string(), types.number()),
      body: createBlock(
        0,
        [],
        { kind: 'return', value: exprs.literal(null, types.map(types.string(), types.number())) }
      ),
    };

    const module: IRModule = {
      path: 'test.gs',
      declarations: [func],
      imports: [],
    };

    const output = codegen.generate(createProgram(module), 'gc');
    const header = output.get('test.hpp');

    expect(header).toContain('std::map<std::string, double> getMap();');
  });

  it('should generate std::optional for nullable', () => {
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'find',
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

    const output = codegen.generate(createProgram(module), 'gc');
    const header = output.get('test.hpp');

    expect(header).toContain('std::optional<std::string> find();');
  });
});

describe('C++ Codegen - Expressions', () => {
  const codegen = new CppCodegen();

  it('should generate std::move for move expressions in ownership mode', () => {
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'transfer',
      params: [{ name: 'data', type: types.class('Data', Ownership.Own) }],
      returnType: types.class('Data', Ownership.Own),
      body: createBlock(
        0,
        [],
        {
          kind: 'return',
          value: {
            kind: 'move',
            source: { kind: 'variable', name: 'data', version: 0, type: types.class('Data', Ownership.Own) },
            type: types.class('Data', Ownership.Own),
          },
        }
      ),
    };

    const module: IRModule = {
      path: 'test.gs',
      declarations: [func],
      imports: [],
    };

    const output = codegen.generate(createProgram(module), 'ownership');
    const source = output.get('test.cpp');

    expect(source).toContain('std::move(data)');
  });

  it('should not generate std::move in GC mode', () => {
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'transfer',
      params: [{ name: 'data', type: types.class('Data', Ownership.Own) }],
      returnType: types.class('Data', Ownership.Own),
      body: createBlock(
        0,
        [],
        {
          kind: 'return',
          value: {
            kind: 'move',
            source: { kind: 'variable', name: 'data', version: 0, type: types.class('Data', Ownership.Own) },
            type: types.class('Data', Ownership.Own),
          },
        }
      ),
    };

    const module: IRModule = {
      path: 'test.gs',
      declarations: [func],
      imports: [],
    };

    const output = codegen.generate(createProgram(module), 'gc');
    const source = output.get('test.cpp');

    expect(source).not.toContain('std::move');
    expect(source).toContain('return data;');
  });
});

describe('C++ Codegen - Namespaces', () => {
  const codegen = new CppCodegen();

  it('should generate namespaces from module path', () => {
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'test',
      params: [],
      returnType: types.void(),
      body: createBlock(0, [], { kind: 'return' }),
    };

    const module: IRModule = {
      path: 'src/math/vector.gs',
      declarations: [func],
      imports: [],
    };

    const output = codegen.generate(createProgram(module), 'gc');
    const header = output.get('src/math/vector.hpp');

    expect(header).toContain('namespace goodscript {');
    expect(header).toContain('namespace src {');
    expect(header).toContain('namespace math {');
    expect(header).toContain('namespace vector {');
  });
});

describe('C++ Codegen - Source Maps', () => {
  const codegen = new CppCodegen();

  it('should emit #line directives when sourceMap is enabled', () => {
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'add',
      params: [
        { name: 'a', type: types.number() },
        { name: 'b', type: types.number() },
      ],
      returnType: types.number(),
      source: {
        file: '/Users/test/math-gs.ts',
        line: 1,
        column: 1,
      },
      body: createBlock(
        0,
        [
          {
            kind: 'assign',
            target: { kind: 'variable', name: 'result', version: 0, type: types.number() },
            value: {
              kind: 'binary',
              op: '+',
              left: { kind: 'variable', name: 'a', version: 0, type: types.number() },
              right: { kind: 'variable', name: 'b', version: 0, type: types.number() },
              type: types.number(),
            },
            source: {
              file: '/Users/test/math-gs.ts',
              line: 2,
              column: 9,
            },
          },
        ],
        {
          kind: 'return',
          value: { kind: 'variable', name: 'result', version: 0, type: types.number() },
        }
      ),
    };

    const module: IRModule = {
      path: 'math-gs.ts',
      declarations: [func],
      imports: [],
    };

    const output = codegen.generate(createProgram(module), 'gc', true);
    const source = output.get('math.cpp');

    expect(source).toBeDefined();
    expect(source).toContain('#line 1 "/Users/test/math-gs.ts"');
    expect(source).toContain('#line 2 "/Users/test/math-gs.ts"');
    expect(source).toContain('double add(double a, double b)');
    expect(source).toContain('auto result = (a + b);');
  });

  it('should not emit #line directives when sourceMap is disabled', () => {
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'add',
      params: [
        { name: 'a', type: types.number() },
        { name: 'b', type: types.number() },
      ],
      returnType: types.number(),
      source: {
        file: '/Users/test/math-gs.ts',
        line: 1,
        column: 1,
      },
      body: createBlock(
        0,
        [
          {
            kind: 'assign',
            target: { kind: 'variable', name: 'result', version: 0, type: types.number() },
            value: {
              kind: 'binary',
              op: '+',
              left: { kind: 'variable', name: 'a', version: 0, type: types.number() },
              right: { kind: 'variable', name: 'b', version: 0, type: types.number() },
              type: types.number(),
            },
            source: {
              file: '/Users/test/math-gs.ts',
              line: 2,
              column: 9,
            },
          },
        ],
        {
          kind: 'return',
          value: { kind: 'variable', name: 'result', version: 0, type: types.number() },
        }
      ),
    };

    const module: IRModule = {
      path: 'math-gs.ts',
      declarations: [func],
      imports: [],
    };

    const output = codegen.generate(createProgram(module), 'gc', false);
    const source = output.get('math.cpp');

    expect(source).toBeDefined();
    expect(source).not.toContain('#line');
    expect(source).toContain('double add(double a, double b)');
    expect(source).toContain('auto result = (a + b);');
  });
});
