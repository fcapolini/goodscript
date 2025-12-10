import { describe, it, expect } from 'vitest';
import { FunctionHoister } from '../src/optimizer/function-hoister.js';
import type { IRProgram, IRModule, IRFunctionDecl } from '../src/ir/types.js';
import { types } from '../src/ir/builder.js';

describe('Function Hoisting', () => {
  const hoister = new FunctionHoister();

  function createTestModule(declarations: any[]): IRModule {
    return {
      path: 'test.ts',
      declarations,
      imports: [],
    };
  }

  function createTestProgram(module: IRModule): IRProgram {
    return {
      modules: [module],
    };
  }

  describe('Hoisting Criteria', () => {
    it('should hoist recursive function with no closure dependencies', () => {
      const func: IRFunctionDecl = {
        kind: 'function',
        name: 'outer',
        params: [],
        returnType: types.number(),
        body: {
          statements: [
            {
              kind: 'functionDecl',
              name: 'fib',
              params: [{ name: 'n', type: types.integer() }],
              returnType: types.integer(),
              body: {
                statements: [
                  {
                    kind: 'if',
                    condition: {
                      kind: 'binary',
                      op: '<=',
                      left: { kind: 'identifier', name: 'n', type: types.integer() },
                      right: { kind: 'literal', value: 1, type: types.integer() },
                      type: types.boolean(),
                    },
                    thenBranch: [
                      {
                        kind: 'return',
                        value: { kind: 'identifier', name: 'n', type: types.integer() },
                      },
                    ],
                  },
                  {
                    kind: 'return',
                    value: {
                      kind: 'binary',
                      op: '+',
                      left: {
                        kind: 'call',
                        callee: { kind: 'identifier', name: 'fib', type: types.function([], types.integer()) },
                        args: [{
                          kind: 'binary',
                          op: '-',
                          left: { kind: 'identifier', name: 'n', type: types.integer() },
                          right: { kind: 'literal', value: 1, type: types.integer() },
                          type: types.integer(),
                        }],
                        type: types.integer(),
                      },
                      right: {
                        kind: 'call',
                        callee: { kind: 'identifier', name: 'fib', type: types.function([], types.integer()) },
                        args: [{
                          kind: 'binary',
                          op: '-',
                          left: { kind: 'identifier', name: 'n', type: types.integer() },
                          right: { kind: 'literal', value: 2, type: types.integer() },
                          type: types.integer(),
                        }],
                        type: types.integer(),
                      },
                      type: types.integer(),
                    },
                  },
                ],
              },
            },
            {
              kind: 'return',
              value: {
                kind: 'call',
                callee: { kind: 'identifier', name: 'fib', type: types.function([], types.integer()) },
                args: [{ kind: 'literal', value: 10, type: types.integer() }],
                type: types.integer(),
              },
            },
          ],
        },
      };

      const module = createTestModule([func]);
      const program = createTestProgram(module);
      const result = hoister.hoist(program);

      // Should have 2 functions: hoisted 'fib' and original 'outer'
      expect(result.modules[0].declarations.length).toBe(2);
      expect(result.modules[0].declarations[0].kind).toBe('function');
      expect((result.modules[0].declarations[0] as IRFunctionDecl).name).toBe('fib');
      expect(result.modules[0].declarations[1].kind).toBe('function');
      expect((result.modules[0].declarations[1] as IRFunctionDecl).name).toBe('outer');

      // Original 'outer' should not contain nested 'fib' anymore
      const outerFunc = result.modules[0].declarations[1] as IRFunctionDecl;
      const outerBody = outerFunc.body as { statements: any[] };
      expect(outerBody.statements.length).toBe(1); // Only return statement
      expect(outerBody.statements[0].kind).toBe('return');
    });

    it('should NOT hoist non-recursive function', () => {
      const func: IRFunctionDecl = {
        kind: 'function',
        name: 'outer',
        params: [],
        returnType: types.number(),
        body: {
          statements: [
            {
              kind: 'functionDecl',
              name: 'helper',
              params: [{ name: 'x', type: types.number() }],
              returnType: types.number(),
              body: {
                statements: [
                  {
                    kind: 'return',
                    value: {
                      kind: 'binary',
                      op: '*',
                      left: { kind: 'identifier', name: 'x', type: types.number() },
                      right: { kind: 'literal', value: 2, type: types.number() },
                      type: types.number(),
                    },
                  },
                ],
              },
            },
            {
              kind: 'return',
              value: {
                kind: 'call',
                callee: { kind: 'identifier', name: 'helper', type: types.function([], types.number()) },
                args: [{ kind: 'literal', value: 5, type: types.number() }],
                type: types.number(),
              },
            },
          ],
        },
      };

      const module = createTestModule([func]);
      const program = createTestProgram(module);
      const result = hoister.hoist(program);

      // Should still have 1 function with nested helper
      expect(result.modules[0].declarations.length).toBe(1);
      expect(result.modules[0].declarations[0].kind).toBe('function');
      expect((result.modules[0].declarations[0] as IRFunctionDecl).name).toBe('outer');

      const outerFunc = result.modules[0].declarations[0] as IRFunctionDecl;
      const outerBody = outerFunc.body as { statements: any[] };
      expect(outerBody.statements.length).toBe(2); // functionDecl + return
      expect(outerBody.statements[0].kind).toBe('functionDecl');
    });

    it('should NOT hoist function with closure dependency on parameter', () => {
      const func: IRFunctionDecl = {
        kind: 'function',
        name: 'outer',
        params: [{ name: 'multiplier', type: types.number() }],
        returnType: types.number(),
        body: {
          statements: [
            {
              kind: 'functionDecl',
              name: 'scale',
              params: [{ name: 'n', type: types.integer() }],
              returnType: types.number(),
              body: {
                statements: [
                  {
                    kind: 'if',
                    condition: {
                      kind: 'binary',
                      op: '===',
                      left: { kind: 'identifier', name: 'n', type: types.integer() },
                      right: { kind: 'literal', value: 0, type: types.integer() },
                      type: types.boolean(),
                    },
                    thenBranch: [
                      {
                        kind: 'return',
                        value: { kind: 'literal', value: 0, type: types.number() },
                      },
                    ],
                  },
                  {
                    kind: 'return',
                    value: {
                      kind: 'binary',
                      op: '*',
                      left: {
                        kind: 'call',
                        callee: { kind: 'identifier', name: 'scale', type: types.function([], types.number()) },
                        args: [{
                          kind: 'binary',
                          op: '-',
                          left: { kind: 'identifier', name: 'n', type: types.integer() },
                          right: { kind: 'literal', value: 1, type: types.integer() },
                          type: types.integer(),
                        }],
                        type: types.number(),
                      },
                      right: { kind: 'identifier', name: 'multiplier', type: types.number() }, // Closure!
                      type: types.number(),
                    },
                  },
                ],
              },
            },
            {
              kind: 'return',
              value: {
                kind: 'call',
                callee: { kind: 'identifier', name: 'scale', type: types.function([], types.number()) },
                args: [{ kind: 'literal', value: 10, type: types.number() }],
                type: types.number(),
              },
            },
          ],
        },
      };

      const module = createTestModule([func]);
      const program = createTestProgram(module);
      const result = hoister.hoist(program);

      // Should NOT hoist - still 1 function with nested scale
      expect(result.modules[0].declarations.length).toBe(1);
      const outerFunc = result.modules[0].declarations[0] as IRFunctionDecl;
      const outerBody = outerFunc.body as { statements: any[] };
      expect(outerBody.statements[0].kind).toBe('functionDecl');
    });

    it('should NOT hoist function with closure dependency on local variable', () => {
      const func: IRFunctionDecl = {
        kind: 'function',
        name: 'outer',
        params: [],
        returnType: types.number(),
        body: {
          statements: [
            {
              kind: 'variableDeclaration',
              name: 'base',
              variableType: types.number(),
              initializer: { kind: 'literal', value: 10, type: types.number() },
            },
            {
              kind: 'functionDecl',
              name: 'recur',
              params: [{ name: 'n', type: types.integer() }],
              returnType: types.number(),
              body: {
                statements: [
                  {
                    kind: 'if',
                    condition: {
                      kind: 'binary',
                      op: '===',
                      left: { kind: 'identifier', name: 'n', type: types.integer() },
                      right: { kind: 'literal', value: 0, type: types.integer() },
                      type: types.boolean(),
                    },
                    thenBranch: [
                      {
                        kind: 'return',
                        value: { kind: 'identifier', name: 'base', type: types.number() }, // Closure!
                      },
                    ],
                  },
                  {
                    kind: 'return',
                    value: {
                      kind: 'binary',
                      op: '+',
                      left: {
                        kind: 'call',
                        callee: { kind: 'identifier', name: 'recur', type: types.function([], types.number()) },
                        args: [{
                          kind: 'binary',
                          op: '-',
                          left: { kind: 'identifier', name: 'n', type: types.integer() },
                          right: { kind: 'literal', value: 1, type: types.integer() },
                          type: types.integer(),
                        }],
                        type: types.number(),
                      },
                      right: { kind: 'identifier', name: 'base', type: types.number() }, // Closure!
                      type: types.number(),
                    },
                  },
                ],
              },
            },
            {
              kind: 'return',
              value: {
                kind: 'call',
                callee: { kind: 'identifier', name: 'recur', type: types.function([], types.number()) },
                args: [{ kind: 'literal', value: 5, type: types.number() }],
                type: types.number(),
              },
            },
          ],
        },
      };

      const module = createTestModule([func]);
      const program = createTestProgram(module);
      const result = hoister.hoist(program);

      // Should NOT hoist - still 1 function with nested recur
      expect(result.modules[0].declarations.length).toBe(1);
      const outerFunc = result.modules[0].declarations[0] as IRFunctionDecl;
      const outerBody = outerFunc.body as { statements: any[] };
      expect(outerBody.statements[1].kind).toBe('functionDecl');
    });
  });

  describe('Multiple Nested Functions', () => {
    it('should hoist multiple recursive functions without closures', () => {
      const func: IRFunctionDecl = {
        kind: 'function',
        name: 'outer',
        params: [],
        returnType: types.number(),
        body: {
          statements: [
            {
              kind: 'functionDecl',
              name: 'factorial',
              params: [{ name: 'n', type: types.integer() }],
              returnType: types.integer(),
              body: {
                statements: [
                  {
                    kind: 'if',
                    condition: {
                      kind: 'binary',
                      op: '<=',
                      left: { kind: 'identifier', name: 'n', type: types.integer() },
                      right: { kind: 'literal', value: 1, type: types.integer() },
                      type: types.boolean(),
                    },
                    thenBranch: [
                      { kind: 'return', value: { kind: 'literal', value: 1, type: types.integer() } },
                    ],
                  },
                  {
                    kind: 'return',
                    value: {
                      kind: 'binary',
                      op: '*',
                      left: { kind: 'identifier', name: 'n', type: types.integer() },
                      right: {
                        kind: 'call',
                        callee: { kind: 'identifier', name: 'factorial', type: types.function([], types.integer()) },
                        args: [{
                          kind: 'binary',
                          op: '-',
                          left: { kind: 'identifier', name: 'n', type: types.integer() },
                          right: { kind: 'literal', value: 1, type: types.integer() },
                          type: types.integer(),
                        }],
                        type: types.integer(),
                      },
                      type: types.integer(),
                    },
                  },
                ],
              },
            },
            {
              kind: 'functionDecl',
              name: 'gcd',
              params: [
                { name: 'a', type: types.integer() },
                { name: 'b', type: types.integer() },
              ],
              returnType: types.integer(),
              body: {
                statements: [
                  {
                    kind: 'if',
                    condition: {
                      kind: 'binary',
                      op: '===',
                      left: { kind: 'identifier', name: 'b', type: types.integer() },
                      right: { kind: 'literal', value: 0, type: types.integer() },
                      type: types.boolean(),
                    },
                    thenBranch: [
                      { kind: 'return', value: { kind: 'identifier', name: 'a', type: types.integer() } },
                    ],
                  },
                  {
                    kind: 'return',
                    value: {
                      kind: 'call',
                      callee: { kind: 'identifier', name: 'gcd', type: types.function([], types.integer()) },
                      args: [
                        { kind: 'identifier', name: 'b', type: types.integer() },
                        {
                          kind: 'binary',
                          op: '%',
                          left: { kind: 'identifier', name: 'a', type: types.integer() },
                          right: { kind: 'identifier', name: 'b', type: types.integer() },
                          type: types.integer(),
                        },
                      ],
                      type: types.integer(),
                    },
                  },
                ],
              },
            },
            {
              kind: 'return',
              value: { kind: 'literal', value: 0, type: types.number() },
            },
          ],
        },
      };

      const module = createTestModule([func]);
      const program = createTestProgram(module);
      const result = hoister.hoist(program);

      // Should hoist both factorial and gcd
      expect(result.modules[0].declarations.length).toBe(3); // factorial, gcd, outer
      expect((result.modules[0].declarations[0] as IRFunctionDecl).name).toBe('factorial');
      expect((result.modules[0].declarations[1] as IRFunctionDecl).name).toBe('gcd');
      expect((result.modules[0].declarations[2] as IRFunctionDecl).name).toBe('outer');

      // Outer should only have return statement
      const outerFunc = result.modules[0].declarations[2] as IRFunctionDecl;
      const outerBody = outerFunc.body as { statements: any[] };
      expect(outerBody.statements.length).toBe(1);
      expect(outerBody.statements[0].kind).toBe('return');
    });

    it('should hoist selectively based on criteria', () => {
      const func: IRFunctionDecl = {
        kind: 'function',
        name: 'outer',
        params: [{ name: 'x', type: types.number() }],
        returnType: types.number(),
        body: {
          statements: [
            // Recursive, no closure -> HOIST
            {
              kind: 'functionDecl',
              name: 'factorial',
              params: [{ name: 'n', type: types.integer() }],
              returnType: types.integer(),
              body: {
                statements: [
                  {
                    kind: 'if',
                    condition: {
                      kind: 'binary',
                      op: '<=',
                      left: { kind: 'identifier', name: 'n', type: types.integer() },
                      right: { kind: 'literal', value: 1, type: types.integer() },
                      type: types.boolean(),
                    },
                    thenBranch: [
                      { kind: 'return', value: { kind: 'literal', value: 1, type: types.integer() } },
                    ],
                  },
                  {
                    kind: 'return',
                    value: {
                      kind: 'binary',
                      op: '*',
                      left: { kind: 'identifier', name: 'n', type: types.integer() },
                      right: {
                        kind: 'call',
                        callee: { kind: 'identifier', name: 'factorial', type: types.function([], types.integer()) },
                        args: [{
                          kind: 'binary',
                          op: '-',
                          left: { kind: 'identifier', name: 'n', type: types.integer() },
                          right: { kind: 'literal', value: 1, type: types.integer() },
                          type: types.integer(),
                        }],
                        type: types.integer(),
                      },
                      type: types.integer(),
                    },
                  },
                ],
              },
            },
            // Not recursive -> DON'T HOIST
            {
              kind: 'functionDecl',
              name: 'helper',
              params: [{ name: 'y', type: types.number() }],
              returnType: types.number(),
              body: {
                statements: [
                  {
                    kind: 'return',
                    value: {
                      kind: 'binary',
                      op: '*',
                      left: { kind: 'identifier', name: 'y', type: types.number() },
                      right: { kind: 'literal', value: 2, type: types.number() },
                      type: types.number(),
                    },
                  },
                ],
              },
            },
            // Recursive but has closure -> DON'T HOIST
            {
              kind: 'functionDecl',
              name: 'scale',
              params: [{ name: 'n', type: types.integer() }],
              returnType: types.number(),
              body: {
                statements: [
                  {
                    kind: 'if',
                    condition: {
                      kind: 'binary',
                      op: '===',
                      left: { kind: 'identifier', name: 'n', type: types.integer() },
                      right: { kind: 'literal', value: 0, type: types.integer() },
                      type: types.boolean(),
                    },
                    thenBranch: [
                      { kind: 'return', value: { kind: 'literal', value: 0, type: types.number() } },
                    ],
                  },
                  {
                    kind: 'return',
                    value: {
                      kind: 'binary',
                      op: '*',
                      left: {
                        kind: 'call',
                        callee: { kind: 'identifier', name: 'scale', type: types.function([], types.number()) },
                        args: [{
                          kind: 'binary',
                          op: '-',
                          left: { kind: 'identifier', name: 'n', type: types.integer() },
                          right: { kind: 'literal', value: 1, type: types.integer() },
                          type: types.integer(),
                        }],
                        type: types.number(),
                      },
                      right: { kind: 'identifier', name: 'x', type: types.number() }, // Closure!
                      type: types.number(),
                    },
                  },
                ],
              },
            },
            {
              kind: 'return',
              value: { kind: 'literal', value: 0, type: types.number() },
            },
          ],
        },
      };

      const module = createTestModule([func]);
      const program = createTestProgram(module);
      const result = hoister.hoist(program);

      // Should hoist only factorial
      expect(result.modules[0].declarations.length).toBe(2); // factorial, outer
      expect((result.modules[0].declarations[0] as IRFunctionDecl).name).toBe('factorial');
      expect((result.modules[0].declarations[1] as IRFunctionDecl).name).toBe('outer');

      // Outer should still have helper and scale
      const outerFunc = result.modules[0].declarations[1] as IRFunctionDecl;
      const outerBody = outerFunc.body as { statements: any[] };
      expect(outerBody.statements.length).toBe(3); // helper, scale, return
      expect(outerBody.statements[0].kind).toBe('functionDecl');
      expect((outerBody.statements[0] as any).name).toBe('helper');
      expect(outerBody.statements[1].kind).toBe('functionDecl');
      expect((outerBody.statements[1] as any).name).toBe('scale');
    });
  });

  describe('Complex Cases', () => {
    it('should handle recursive function with local variables that shadow parent scope', () => {
      const func: IRFunctionDecl = {
        kind: 'function',
        name: 'outer',
        params: [{ name: 'x', type: types.number() }],
        returnType: types.number(),
        body: {
          statements: [
            {
              kind: 'functionDecl',
              name: 'process',
              params: [{ name: 'n', type: types.integer() }],
              returnType: types.integer(),
              body: {
                statements: [
                  // Local variable shadows parent's 'x'
                  {
                    kind: 'variableDeclaration',
                    name: 'x',
                    variableType: types.integer(),
                    initializer: { kind: 'literal', value: 10, type: types.integer() },
                  },
                  {
                    kind: 'if',
                    condition: {
                      kind: 'binary',
                      op: '===',
                      left: { kind: 'identifier', name: 'n', type: types.integer() },
                      right: { kind: 'literal', value: 0, type: types.integer() },
                      type: types.boolean(),
                    },
                    thenBranch: [
                      {
                        kind: 'return',
                        value: { kind: 'identifier', name: 'x', type: types.integer() }, // Local x, not parent x
                      },
                    ],
                  },
                  {
                    kind: 'return',
                    value: {
                      kind: 'call',
                      callee: { kind: 'identifier', name: 'process', type: types.function([], types.integer()) },
                      args: [{
                        kind: 'binary',
                        op: '-',
                        left: { kind: 'identifier', name: 'n', type: types.integer() },
                        right: { kind: 'literal', value: 1, type: types.integer() },
                        type: types.integer(),
                      }],
                      type: types.integer(),
                    },
                  },
                ],
              },
            },
            {
              kind: 'return',
              value: { kind: 'literal', value: 0, type: types.number() },
            },
          ],
        },
      };

      const module = createTestModule([func]);
      const program = createTestProgram(module);
      const result = hoister.hoist(program);

      // Should hoist 'process' because local 'x' shadows parent 'x'
      expect(result.modules[0].declarations.length).toBe(2); // process, outer
      expect((result.modules[0].declarations[0] as IRFunctionDecl).name).toBe('process');
    });
  });
});
