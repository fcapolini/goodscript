/**
 * Tests for Phase 2b: Null Safety Checker
 */

import { describe, it, expect } from 'vitest';
import { analyzeNullSafety } from '../src/analysis/null-checker.js';
import { types, exprs, stmts } from '../src/ir/builder.js';
import type { IRModule, IRClassDecl, IRFunctionDecl, IRInterfaceDecl } from '../src/ir/types.js';
import { Ownership } from '../src/ir/types.js';
import { Ownership } from '../src/ir/types.js';

describe('Null Safety Checker', () => {
  describe('Field Storage (GS401)', () => {
    it('should reject use<T> in class fields', () => {
      const nodeClass: IRClassDecl = {
        kind: 'class',
        name: 'Node',
        fields: [
          {
            name: 'data',
            type: types.number(),
          },
          {
            name: 'parent',
            type: types.class('Node', Ownership.Use'), // use<Node> - FORBIDDEN
          },
        ],
        methods: [],
      };

      const module: IRModule = {
        path: 'test.gs',
        declarations: [nodeClass],
      };

      const diagnostics = analyzeNullSafety(module);
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('GS401');
      expect(diagnostics[0].message).toContain("field 'parent'");
      expect(diagnostics[0].message).toContain("use<T>");
    });

    it('should reject use<T> in interface properties', () => {
      const nodeInterface: IRInterfaceDecl = {
        kind: 'interface',
        name: 'INode',
        properties: [
          {
            name: 'value',
            type: types.number(),
          },
          {
            name: 'parent',
            type: types.class('INode', Ownership.Use'), // use<INode> - FORBIDDEN
          },
        ],
        methods: [],
      };

      const module: IRModule = {
        path: 'test.gs',
        declarations: [nodeInterface],
      };

      const diagnostics = analyzeNullSafety(module);
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('GS401');
      expect(diagnostics[0].message).toContain("property 'parent'");
    });

    it('should allow own<T> and share<T> in fields', () => {
      const nodeClass: IRClassDecl = {
        kind: 'class',
        name: 'Node',
        fields: [
          {
            name: 'child',
            type: types.class('Node', Ownership.Own'), // own<Node> - ALLOWED
          },
          {
            name: 'sibling',
            type: types.class('Node', Ownership.Share'), // share<Node> - ALLOWED
          },
        ],
        methods: [],
      };

      const module: IRModule = {
        path: 'test.gs',
        declarations: [nodeClass],
      };

      const diagnostics = analyzeNullSafety(module);
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe('Return Types (GS402)', () => {
    it('should reject use<T> as return type', () => {
      const func: IRFunctionDecl = {
        kind: 'function',
        name: 'getNode',
        params: [
          { name: 'pool', type: types.class('Pool', Ownership.Share') },
        ],
        returnType: types.class('Node', Ownership.Use'), // use<Node> - FORBIDDEN
        body: { id: 0, instructions: [], terminator: { kind: 'return', value: undefined } },
      };

      const module: IRModule = {
        path: 'test.gs',
        declarations: [func],
      };

      const diagnostics = analyzeNullSafety(module);
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('GS402');
      expect(diagnostics[0].message).toContain("function 'getNode'");
      expect(diagnostics[0].message).toContain("cannot return 'use<T>'");
    });

    it('should allow own<T> and share<T> as return types', () => {
      const func1: IRFunctionDecl = {
        kind: 'function',
        name: 'createNode',
        params: [],
        returnType: types.class('Node', Ownership.Own'), // own<Node> - ALLOWED
        body: { id: 0, instructions: [], terminator: { kind: 'return', value: undefined } },
      };

      const func2: IRFunctionDecl = {
        kind: 'function',
        name: 'shareNode',
        params: [],
        returnType: types.class('Node', Ownership.Share'), // share<Node> - ALLOWED
        body: { id: 0, instructions: [], terminator: { kind: 'return', value: undefined } },
      };

      const module: IRModule = {
        path: 'test.gs',
        declarations: [func1, func2],
      };

      const diagnostics = analyzeNullSafety(module);
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe('Return Values (GS403)', () => {
    it('should reject returning use<T> variable', () => {
      const func: IRFunctionDecl = {
        kind: 'function',
        name: 'processNode',
        params: [
          { name: 'node', type: types.class('Node', Ownership.Use') }, // use<Node> param
        ],
        returnType: types.class('Node', Ownership.Share'),
        body: [
          stmts.return(
            exprs.identifier('node', types.class('Node', Ownership.Use')),
            { line: 2, column: 2 }
          ),
        ],
      };

      const module: IRModule = {
        path: 'test.gs',
        declarations: [func],
      };

      const diagnostics = analyzeNullSafety(module);
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('GS403');
      expect(diagnostics[0].message).toContain("'node'");
      expect(diagnostics[0].message).toContain("use<T>");
    });

    it('should allow returning owned variables', () => {
      const func: IRFunctionDecl = {
        kind: 'function',
        name: 'getNode',
        params: [],
        returnType: types.class('Node', Ownership.Own'),
        body: [
          stmts.variableDeclaration(
            'node',
            types.class('Node', Ownership.Own'),
            exprs.call(
              exprs.identifier('createNode', types.function([], types.class('Node', Ownership.Own'))),
              [],
              types.class('Node', Ownership.Own')
            ),
            { line: 2, column: 4 }
          ),
          stmts.return(
            exprs.identifier('node', types.class('Node', Ownership.Own')),
            { line: 3, column: 2 }
          ),
        ],
      };

      const module: IRModule = {
        path: 'test.gs',
        declarations: [func],
      };

      const diagnostics = analyzeNullSafety(module);
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe('Nested use<T> in Containers', () => {
    it('should reject use<T> in Array fields', () => {
      const nodeClass: IRClassDecl = {
        kind: 'class',
        name: 'Graph',
        fields: [
          {
            name: 'nodes',
            type: types.array(types.class('Node', Ownership.Use')), // Array<use<Node>> - FORBIDDEN
          },
        ],
        methods: [],
      };

      const module: IRModule = {
        path: 'test.gs',
        declarations: [nodeClass],
      };

      const diagnostics = analyzeNullSafety(module);
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('GS401');
    });

    it('should reject use<T> in Map fields', () => {
      const nodeClass: IRClassDecl = {
        kind: 'class',
        name: 'Registry',
        fields: [
          {
            name: 'nodes',
            type: types.map(types.string(), types.class('Node', Ownership.Use')), // Map<string, use<Node>> - FORBIDDEN
          },
        ],
        methods: [],
      };

      const module: IRModule = {
        path: 'test.gs',
        declarations: [nodeClass],
      };

      const diagnostics = analyzeNullSafety(module);
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('GS401');
    });
  });

  describe('Local Variables (Allowed)', () => {
    it('should allow use<T> in local variables', () => {
      const func: IRFunctionDecl = {
        kind: 'function',
        name: 'traverse',
        params: [
          { name: 'root', type: types.class('Node', Ownership.Share') },
        ],
        returnType: types.void(),
        body: [
          stmts.variableDeclaration(
            'current',
            types.class('Node', Ownership.Use'), // use<Node> local var - ALLOWED
            exprs.identifier('root', types.class('Node', Ownership.Share')),
            { line: 2, column: 4 }
          ),
        ],
      };

      const module: IRModule = {
        path: 'test.gs',
        declarations: [func],
      };

      const diagnostics = analyzeNullSafety(module);
      expect(diagnostics).toHaveLength(0); // Local use<T> is allowed
    });

    it('should allow use<T> parameters (but reject returning them)', () => {
      const func: IRFunctionDecl = {
        kind: 'function',
        name: 'process',
        params: [
          { name: 'node', type: types.class('Node', Ownership.Use') }, // use<Node> param - ALLOWED
        ],
        returnType: types.void(),
        body: { id: 0, instructions: [], terminator: { kind: 'return', value: undefined } },
      };

      const module: IRModule = {
        path: 'test.gs',
        declarations: [func],
      };

      const diagnostics = analyzeNullSafety(module);
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiple violations', () => {
      const nodeClass: IRClassDecl = {
        kind: 'class',
        name: 'Node',
        fields: [
          {
            name: 'parent',
            type: types.class('Node', Ownership.Use'), // Violation 1
          },
          {
            name: 'children',
            type: types.array(types.class('Node', Ownership.Use')), // Violation 2
          },
        ],
        methods: [],
      };

      const func: IRFunctionDecl = {
        kind: 'function',
        name: 'getNode',
        params: [],
        returnType: types.class('Node', Ownership.Use'), // Violation 3
        body: { id: 0, instructions: [], terminator: { kind: 'return', value: undefined } },
      };

      const module: IRModule = {
        path: 'test.gs',
        declarations: [nodeClass, func],
      };

      const diagnostics = analyzeNullSafety(module);
      expect(diagnostics).toHaveLength(3);
      expect(diagnostics[0].code).toBe('GS401'); // parent field
      expect(diagnostics[1].code).toBe('GS401'); // children field
      expect(diagnostics[2].code).toBe('GS402'); // return type
    });
  });

  describe('GC Mode', () => {
    it('should skip null safety checks in GC mode', () => {
      const nodeClass: IRClassDecl = {
        kind: 'class',
        name: 'Node',
        fields: [
          {
            name: 'parent',
            type: types.class('Node', Ownership.Use'), // Would be violation in ownership mode
          },
        ],
        methods: [],
      };

      const func: IRFunctionDecl = {
        kind: 'function',
        name: 'getNode',
        params: [],
        returnType: types.class('Node', Ownership.Use'), // Would be violation in ownership mode
        body: { id: 0, instructions: [], terminator: { kind: 'return', value: undefined } },
      };

      const module: IRModule = {
        path: 'test.gs',
        declarations: [nodeClass, func],
      };

      // GC mode: No errors
      const diagnostics = analyzeNullSafety(module, Ownership.gc');
      expect(diagnostics).toHaveLength(0);
    });
  });
});
