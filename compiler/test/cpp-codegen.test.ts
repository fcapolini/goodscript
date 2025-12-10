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

    expect(header).toContain('void log(gs::String msg);');
    expect(source).toContain('void log(gs::String msg)');
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

    expect(header).toContain('Person(gs::String name);');
    expect(source).toContain('Person::Person(gs::String name)');
    expect(source).toContain(': name_(name)'); // Constructor uses initializer list
  });

  it('should generate readonly fields with const qualifier', () => {
    const cls: IRClassDecl = {
      kind: 'class',
      name: 'Config',
      fields: [
        { 
          name: 'version', 
          type: types.string(), 
          isReadonly: true,
          initializer: exprs.literal('1.0.0', types.string()),
        },
        { 
          name: 'port', 
          type: types.integer(), 
          isReadonly: true,
          initializer: exprs.literal(8080, types.integer()),
        },
        { 
          name: 'debug', 
          type: types.boolean(), 
          isReadonly: false,
        },
      ],
      methods: [],
      constructor: {
        params: [],
        body: createBlock(0, [], { kind: 'return' }),
      },
    };

    const module: IRModule = {
      path: 'config.gs',
      declarations: [cls],
      imports: [],
    };

    const output = codegen.generate(createProgram(module), 'gc');
    const header = output.get('config.hpp');
    const source = output.get('config.cpp');

    expect(header).toBeDefined();
    expect(source).toBeDefined();

    // Check header has const for readonly fields
    expect(header).toContain('const gs::String version_;');
    expect(header).toContain('const int32_t port_;');
    expect(header).toContain('bool debug_;');
    expect(header).not.toContain('const bool debug_;');

    // Check source has initializer list for readonly fields
    expect(source).toContain('Config::Config()');
    // Readonly fields with initializers are set via member initializer list
    expect(source).toContain(': version_(gs::String("1.0.0"))');
    expect(source).toContain(', port_(8080)');
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

    expect(header).toContain('gs::shared_ptr<Data> getShared();');
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

    expect(header).toContain('void borrow(gs::weak_ptr<Node> ptr);');
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

    expect(header).toContain('gs::Array<double> getNumbers();');
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

    expect(header).toContain('gs::Map<gs::String, double> getMap();');
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

    expect(header).toContain('std::optional<gs::String> find();');
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
    const header = output.get('vector.hpp');  // Now uses basename

    // Namespace should be based on filename only, not full path
    expect(header).toContain('namespace goodscript {');
    expect(header).toContain('namespace vector_ {');  // Sanitized: 'vector' is stdlib name
    // Should NOT contain path-based namespaces
    expect(header).not.toContain('namespace src {');
    expect(header).not.toContain('namespace math {');
  });
});

describe('C++ Codegen - Identifier Sanitization', () => {
  const codegen = new CppCodegen();

  it('should sanitize C++ keywords in function names', () => {
    const testCases = [
      { name: 'double', expected: 'double_' },
      { name: 'class', expected: 'class_' },
      { name: 'private', expected: 'private_' },
      { name: 'public', expected: 'public_' },
      { name: 'return', expected: 'return_' },
      { name: 'namespace', expected: 'namespace_' },
    ];

    for (const { name, expected } of testCases) {
      const func: IRFunctionDecl = {
        kind: 'function',
        name,
        params: [],
        returnType: types.void(),
        body: createBlock(0, [], { kind: 'return' }),
      };

      const module: IRModule = {
        path: 'test.gs',
        declarations: [func],
        imports: [],
      };

      const output = codegen.generate(createProgram(module), 'gc');
      const header = output.get('test.hpp');
      const source = output.get('test.cpp');

      expect(header).toContain(`void ${expected}();`);
      expect(source).toContain(`void ${expected}()`);
    }
  });

  it('should sanitize C++ keywords in parameter names', () => {
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'test',
      params: [
        { name: 'int', type: types.number() },
        { name: 'float', type: types.number() },
        { name: 'long', type: types.number() },
      ],
      returnType: types.void(),
      body: createBlock(0, [], { kind: 'return' }),
    };

    const module: IRModule = {
      path: 'test.gs',
      declarations: [func],
      imports: [],
    };

    const output = codegen.generate(createProgram(module), 'gc');
    const header = output.get('test.hpp');

    expect(header).toContain('void test(double int_, double float_, double long_);');
  });

  it('should sanitize C++ keywords in class names', () => {
    const cls: IRClassDecl = {
      kind: 'class',
      name: 'template',
      fields: [{ name: 'value', type: types.number() }],
      methods: [],
      constructor: {
        params: [],
        body: createBlock(0, [], { kind: 'return' }),
      },
    };

    const module: IRModule = {
      path: 'test.gs',
      declarations: [cls],
      imports: [],
    };

    const output = codegen.generate(createProgram(module), 'gc');
    const header = output.get('test.hpp');

    expect(header).toContain('class template_');
    expect(header).toContain('double value_;');
  });

  it('should sanitize C++ keywords in method names', () => {
    const cls: IRClassDecl = {
      kind: 'class',
      name: 'MyClass',
      fields: [],
      methods: [{
        name: 'delete',
        params: [],
        returnType: types.void(),
        body: createBlock(0, [], { kind: 'return' }),
      }],
      constructor: {
        params: [],
        body: createBlock(0, [], { kind: 'return' }),
      },
    };

    const module: IRModule = {
      path: 'test.gs',
      declarations: [cls],
      imports: [],
    };

    const output = codegen.generate(createProgram(module), 'gc');
    const header = output.get('test.hpp');
    const source = output.get('test.cpp');

    expect(header).toContain('void delete_();');
    expect(source).toContain('void MyClass::delete_()');
  });

  it('should sanitize C++ keywords in variable names', () => {
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
            target: { kind: 'variable', name: 'const', version: 0, type: types.number() },
            value: { kind: 'literal', value: 42, type: types.number() },
          },
        ],
        {
          kind: 'return',
          value: { kind: 'variable', name: 'const', version: 0, type: types.number() },
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

    expect(source).toContain('auto const_ = 42;');
    expect(source).toContain('return const_;');
  });

  it('should sanitize this keyword', () => {
    const cls: IRClassDecl = {
      kind: 'class',
      name: 'Person',
      fields: [{ name: 'name_', type: types.string() }],
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
      path: 'test.gs',
      declarations: [cls],
      imports: [],
    };

    const output = codegen.generate(createProgram(module), 'gc');
    const source = output.get('test.cpp');

    expect(source).toContain('this_.name_ = name;');
  });

  it('should not sanitize non-keywords', () => {
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'calculate',
      params: [
        { name: 'value', type: types.number() },
        { name: 'count', type: types.number() },
      ],
      returnType: types.number(),
      body: createBlock(
        0,
        [],
        {
          kind: 'return',
          value: {
            kind: 'binary',
            op: '*' as BinaryOp,
            left: { kind: 'variable', name: 'value', version: 0, type: types.number() },
            right: { kind: 'variable', name: 'count', version: 0, type: types.number() },
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

    const output = codegen.generate(createProgram(module), 'gc');
    const header = output.get('test.hpp');

    expect(header).toContain('double calculate(double value, double count);');
    expect(header).not.toContain('value_');
    expect(header).not.toContain('count_');
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

  it('should generate method calls correctly', () => {
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'double',
      params: [{ name: 'arr', type: types.array(types.number()) }],
      returnType: types.array(types.number()),
      body: createBlock(
        0,
        [],
        {
          kind: 'return',
          value: {
            kind: 'methodCall',
            object: { kind: 'variable', name: 'arr', version: 0, type: types.array(types.number()) },
            method: 'map',
            args: [
              {
                kind: 'lambda',
                params: [{ name: 'x', type: types.number() }],
                body: createBlock(
                  0,
                  [],
                  {
                    kind: 'return',
                    value: {
                      kind: 'binary',
                      op: '*' as BinaryOp,
                      left: { kind: 'variable', name: 'x', version: 0, type: types.number() },
                      right: { kind: 'literal', value: 2, type: types.number() },
                      type: types.number(),
                    },
                  }
                ),
                captures: [],
                type: types.function([types.number()], types.number()),
              },
            ],
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
    const source = output.get('test.cpp');

    expect(source).toBeDefined();
    expect(source).toContain('gs::Array<double> double_(gs::Array<double> arr)');
    expect(source).toContain('arr.map([](double x) { return (x * 2); })');
  });

  it('should generate console.log calls correctly', () => {
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'greet',
      params: [{ name: 'name', type: types.string() }],
      returnType: types.void(),
      body: createBlock(
        0,
        [],
        {
          kind: 'return',
          value: {
            kind: 'methodCall',
            object: { kind: 'variable', name: 'console', version: 0, type: types.void() },
            method: 'log',
            args: [
              { kind: 'literal', value: 'Hello, ', type: types.string() },
              { kind: 'variable', name: 'name', version: 0, type: types.string() },
            ],
            type: types.void(),
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

    expect(source).toBeDefined();
    expect(source).toContain('void greet(gs::String name)');
    expect(source).toContain('gs::console::log(gs::String("Hello, "), name)');
    expect(source).not.toContain('console.log'); // Should not generate plain console.log
  });

  it('should generate array.length as method call', () => {
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'getLength',
      params: [{ name: 'arr', type: types.array(types.number()) }],
      returnType: types.number(),
      body: createBlock(
        0,
        [],
        {
          kind: 'return',
          value: {
            kind: 'member',
            object: { kind: 'variable', name: 'arr', version: 0, type: types.array(types.number()) },
            member: 'length',
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

    const output = codegen.generate(createProgram(module), 'gc');
    const source = output.get('test.cpp');

    expect(source).toBeDefined();
    expect(source).toContain('double getLength(gs::Array<double> arr)');
    expect(source).toContain('arr.length()'); // Should be a method call
    expect(source).not.toContain('arr.length;'); // Should not be property access
  });
});

