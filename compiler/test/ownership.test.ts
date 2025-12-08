/**
 * Tests for Phase 2a: Ownership Analysis
 */

import { describe, it, expect } from 'vitest';
import { analyzeOwnership } from '../src/analysis/ownership.js';
import { IRModule, IRClassDecl, IRInterfaceDecl, IRTypeAliasDecl, Ownership } from '../src/ir/types.js';
import { types } from '../src/ir/builder.js';

describe('Ownership Analyzer', () => {
  describe('Self-Loop Detection (Rule 1.1)', () => {
    it('should detect self-referencing share<T>', () => {
      const module: IRModule = {
        path: '/test/node.gs',
        declarations: [
          {
            kind: 'class',
            name: 'Node',
            fields: [
              {
                name: 'next',
                type: types.class('Node', Ownership.Share),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('GS301');
      expect(result.errors[0].message).toContain('Self-referencing share<T>');
      expect(result.errors[0].message).toContain('Node');
      expect(result.errors[0].message).toContain('next');
    });

    it('should allow self-referencing share<T> in GC mode (warning only)', () => {
      const module: IRModule = {
        path: '/test/node.gs',
        declarations: [
          {
            kind: 'class',
            name: 'Node',
            fields: [
              {
                name: 'next',
                type: types.class('Node', Ownership.Share),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'gc');

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('GS301');
    });
  });

  describe('Cycle Detection (Rule 1.1)', () => {
    it('should detect simple two-node cycle', () => {
      const module: IRModule = {
        path: '/test/cycle.gs',
        declarations: [
          {
            kind: 'class',
            name: 'A',
            fields: [
              {
                name: 'b',
                type: types.class('B', Ownership.Share),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
          {
            kind: 'class',
            name: 'B',
            fields: [
              {
                name: 'a',
                type: types.class('A', Ownership.Share),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('GS302');
      expect(result.errors[0].message).toContain('Cyclic share<T>');
      expect(result.errors[0].message).toContain('A.b');
      expect(result.errors[0].message).toContain('B.a');
    });

    it('should detect three-node cycle', () => {
      const module: IRModule = {
        path: '/test/cycle3.gs',
        declarations: [
          {
            kind: 'class',
            name: 'A',
            fields: [
              {
                name: 'b',
                type: types.class('B', Ownership.Share),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
          {
            kind: 'class',
            name: 'B',
            fields: [
              {
                name: 'c',
                type: types.class('C', Ownership.Share),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
          {
            kind: 'class',
            name: 'C',
            fields: [
              {
                name: 'a',
                type: types.class('A', Ownership.Share),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('GS302');
      expect(result.sccs).toHaveLength(1);
      expect(result.sccs[0].nodes).toHaveLength(3);
    });
  });

  describe('DAG (Acyclic) Graphs', () => {
    it('should allow acyclic share<T> graph', () => {
      const module: IRModule = {
        path: '/test/dag.gs',
        declarations: [
          {
            kind: 'class',
            name: 'Root',
            fields: [
              {
                name: 'left',
                type: types.class('Node', Ownership.Share),
                isReadonly: false,              },
              {
                name: 'right',
                type: types.class('Node', Ownership.Share),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
          {
            kind: 'class',
            name: 'Node',
            fields: [
              {
                name: 'data',
                type: types.number(),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.sccs).toHaveLength(0);
    });

    it('should allow multiple independent trees', () => {
      const module: IRModule = {
        path: '/test/forest.gs',
        declarations: [
          {
            kind: 'class',
            name: 'TreeA',
            fields: [
              {
                name: 'child',
                type: types.class('NodeA', Ownership.Share),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
          {
            kind: 'class',
            name: 'NodeA',
            fields: [
              {
                name: 'value',
                type: types.number(),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
          {
            kind: 'class',
            name: 'TreeB',
            fields: [
              {
                name: 'child',
                type: types.class('NodeB', Ownership.Share),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
          {
            kind: 'class',
            name: 'NodeB',
            fields: [
              {
                name: 'value',
                type: types.string(),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      expect(result.errors).toHaveLength(0);
      expect(result.sccs).toHaveLength(0);
    });
  });

  describe('Container Types (Rule 1.2)', () => {
    it('should detect cycle through Array<share<T>>', () => {
      const module: IRModule = {
        path: '/test/array-cycle.gs',
        declarations: [
          {
            kind: 'class',
            name: 'Parent',
            fields: [
              {
                name: 'children',
                type: types.array(types.class('Child', Ownership.Share)),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
          {
            kind: 'class',
            name: 'Child',
            fields: [
              {
                name: 'parent',
                type: types.class('Parent', Ownership.Share),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('GS302');
    });

    it('should detect cycle through Map<K, share<T>>', () => {
      const module: IRModule = {
        path: '/test/map-cycle.gs',
        declarations: [
          {
            kind: 'class',
            name: 'Registry',
            fields: [
              {
                name: 'items',
                type: types.map(
                  types.string(),
                  types.class('Item', Ownership.Share)
                ),
                isReadonly: false,
              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
          {
            kind: 'class',
            name: 'Item',
            fields: [
              {
                name: 'registry',
                type: types.class('Registry', Ownership.Share),
                isReadonly: false,
              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('GS302');
    });
  });

  describe('Non-Owning Types (Rules 3.1-3.2)', () => {
    it('should allow use<T> references without creating cycles', () => {
      const module: IRModule = {
        path: '/test/use.gs',
        declarations: [
          {
            kind: 'class',
            name: 'A',
            fields: [
              {
                name: 'b',
                type: types.class('B', Ownership.Use),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
          {
            kind: 'class',
            name: 'B',
            fields: [
              {
                name: 'a',
                type: types.class('A', Ownership.Use),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      expect(result.errors).toHaveLength(0);
      expect(result.sccs).toHaveLength(0);
    });

    it('should allow own<T> references without creating cycles', () => {
      const module: IRModule = {
        path: '/test/own.gs',
        declarations: [
          {
            kind: 'class',
            name: 'A',
            fields: [
              {
                name: 'b',
                type: types.class('B', Ownership.Own),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
          {
            kind: 'class',
            name: 'B',
            fields: [
              {
                name: 'a',
                type: types.class('A', Ownership.Own),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      expect(result.errors).toHaveLength(0);
      expect(result.sccs).toHaveLength(0);
    });
  });

  describe('Pool Pattern (Rule 4.1)', () => {
    it('should detect cycle requiring pool pattern', () => {
      // Pool contains share<Item>, Item contains share<Pool> = cycle
      const module: IRModule = {
        path: '/test/pool.gs',
        declarations: [
          {
            kind: 'class',
            name: 'Pool',
            fields: [
              {
                name: 'items',
                type: types.array(types.class('Item', Ownership.Share)),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
          {
            kind: 'class',
            name: 'Item',
            fields: [
              {
                name: 'pool',
                type: types.class('Pool', Ownership.Share),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('GS302');
      expect(result.errors[0].message).toContain('Pool');
      expect(result.errors[0].message).toContain('Item');
    });

    it('should allow pool pattern with use<T>', () => {
      // Pool contains share<Item>, Item contains use<Pool> = no cycle
      const module: IRModule = {
        path: '/test/pool-fixed.gs',
        declarations: [
          {
            kind: 'class',
            name: 'Pool',
            fields: [
              {
                name: 'items',
                type: types.array(types.class('Item', Ownership.Share)),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
          {
            kind: 'class',
            name: 'Item',
            fields: [
              {
                name: 'pool',
                type: types.class('Pool', Ownership.Use),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      expect(result.errors).toHaveLength(0);
      expect(result.sccs).toHaveLength(0);
    });
  });

  describe('Complex Scenarios', () => {
    it('should detect cycles in interfaces', () => {
      const module: IRModule = {
        path: '/test/interface-cycle.gs',
        declarations: [
          {
            kind: 'interface',
            name: 'NodeA',
            properties: [
              {
                name: 'next',
                type: types.class('NodeB', Ownership.Share),
                },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRInterfaceDecl,
          {
            kind: 'interface',
            name: 'NodeB',
            properties: [
              {
                name: 'prev',
                type: types.class('NodeA', Ownership.Share),
                },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRInterfaceDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('GS302');
      expect(result.errors[0].message).toContain('NodeA');
      expect(result.errors[0].message).toContain('NodeB');
    });

    it('should detect class-to-interface cycles', () => {
      const module: IRModule = {
        path: '/test/class-interface-cycle.gs',
        declarations: [
          {
            kind: 'class',
            name: 'ConcreteNode',
            fields: [
              {
                name: 'iface',
                type: types.class('INode', Ownership.Share), // share<INode>
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
          {
            kind: 'interface',
            name: 'INode',
            properties: [
              {
                name: 'impl',
                type: types.class('ConcreteNode', Ownership.Share), // share<ConcreteNode>
                },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRInterfaceDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('GS302');
      expect(result.errors[0].message).toContain('ConcreteNode');
      expect(result.errors[0].message).toContain('INode');
    });

    it('should detect multiple independent cycles', () => {
      const module: IRModule = {
        path: '/test/multi-cycle.gs',
        declarations: [
          {
            kind: 'class',
            name: 'A1',
            fields: [
              {
                name: 'a2',
                type: types.class('A2', Ownership.Share),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
          {
            kind: 'class',
            name: 'A2',
            fields: [
              {
                name: 'a1',
                type: types.class('A1', Ownership.Share),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
          {
            kind: 'class',
            name: 'B1',
            fields: [
              {
                name: 'b2',
                type: types.class('B2', Ownership.Share),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
          {
            kind: 'class',
            name: 'B2',
            fields: [
              {
                name: 'b1',
                type: types.class('B1', Ownership.Share),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      expect(result.errors).toHaveLength(2);
      expect(result.sccs).toHaveLength(2);
    });

    it('should handle mixed owning and non-owning types', () => {
      const module: IRModule = {
        path: '/test/mixed.gs',
        declarations: [
          {
            kind: 'class',
            name: 'Owner',
            fields: [
              {
                name: 'ownedChild',
                type: types.class('Child', Ownership.Own),
                isReadonly: false,              },
              {
                name: 'sharedData',
                type: types.class('Data', Ownership.Share),
                isReadonly: false,              },
              {
                name: 'borrowedRef',
                type: types.class('External', Ownership.Use),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
          {
            kind: 'class',
            name: 'Child',
            fields: [
              {
                name: 'value',
                type: types.number(),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
          {
            kind: 'class',
            name: 'Data',
            fields: [
              {
                name: 'text',
                type: types.string(),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
          {
            kind: 'class',
            name: 'External',
            fields: [
              {
                name: 'id',
                type: types.number(),
                isReadonly: false,              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      expect(result.errors).toHaveLength(0);
      expect(result.sccs).toHaveLength(0);
    });
  });

  describe('Struct Type Analysis', () => {
    it('should detect cycles in struct types with share<T> fields', () => {
      const module: IRModule = {
        path: '/test/struct-cycle.gs',
        declarations: [
          {
            kind: 'class',
            name: 'Person',
            fields: [
              {
                name: 'data',
                type: types.struct([
                  { name: 'name', type: types.string() },
                  { name: 'bestFriend', type: types.class('Person', Ownership.Share) }
                ], Ownership.Value),
                isReadonly: false,
              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      // Should detect self-loop: Person -> struct -> Person
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('GS301');
      expect(result.errors[0].message).toContain('Person');
    });

    it('should handle struct types with own<T> fields (no cycle)', () => {
      const module: IRModule = {
        path: '/test/struct-own.gs',
        declarations: [
          {
            kind: 'class',
            name: 'Node',
            fields: [
              {
                name: 'data',
                type: types.struct([
                  { name: 'value', type: types.number() },
                  { name: 'child', type: types.class('Node', Ownership.Own) }
                ], Ownership.Value),
                isReadonly: false,
              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      // own<T> doesn't create cycles
      expect(result.errors).toHaveLength(0);
    });

    it('should detect two-node cycle through struct', () => {
      const module: IRModule = {
        path: '/test/struct-two-cycle.gs',
        declarations: [
          {
            kind: 'class',
            name: 'A',
            fields: [
              {
                name: 'info',
                type: types.struct([
                  { name: 'name', type: types.string() },
                  { name: 'link', type: types.class('B', Ownership.Share) }
                ], Ownership.Value),
                isReadonly: false,
              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
          {
            kind: 'class',
            name: 'B',
            fields: [
              {
                name: 'back',
                type: types.class('A', Ownership.Share),
                isReadonly: false,
              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      // Should detect cycle: A -> struct -> B -> A
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('GS302');
      expect(result.sccs).toHaveLength(1);
      expect(result.sccs[0].nodes).toContain('A');
      expect(result.sccs[0].nodes).toContain('B');
    });

    it('should handle nested structs with share<T>', () => {
      const module: IRModule = {
        path: '/test/nested-struct.gs',
        declarations: [
          {
            kind: 'class',
            name: 'Tree',
            fields: [
              {
                name: 'metadata',
                type: types.struct([
                  { name: 'label', type: types.string() },
                  { 
                    name: 'refs',
                    type: types.struct([
                      { name: 'parent', type: types.class('Tree', Ownership.Share) },
                      { name: 'sibling', type: types.class('Tree', Ownership.Share) }
                    ], Ownership.Value)
                  }
                ], Ownership.Value),
                isReadonly: false,
              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      // Should detect self-loop through nested struct
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('GS301');
      expect(result.errors[0].message).toContain('Tree');
    });

    it('should handle arrays of structs with share<T>', () => {
      const module: IRModule = {
        path: '/test/array-struct.gs',
        declarations: [
          {
            kind: 'class',
            name: 'Graph',
            fields: [
              {
                name: 'edges',
                type: types.array(
                  types.struct([
                    { name: 'from', type: types.string() },
                    { name: 'to', type: types.class('Graph', Ownership.Share) }
                  ], Ownership.Value)
                ),
                isReadonly: false,
              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      // Should detect self-loop: Graph -> Array -> struct -> Graph
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('GS301');
      expect(result.errors[0].message).toContain('Graph');
    });

    it('should allow struct with no share<T> fields', () => {
      const module: IRModule = {
        path: '/test/safe-struct.gs',
        declarations: [
          {
            kind: 'class',
            name: 'Safe',
            fields: [
              {
                name: 'config',
                type: types.struct([
                  { name: 'timeout', type: types.number() },
                  { name: 'retries', type: types.number() },
                  { name: 'enabled', type: types.boolean() }
                ], Ownership.Value),
                isReadonly: false,
              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      // No share<T> fields, no cycles
      expect(result.errors).toHaveLength(0);
      expect(result.sccs).toHaveLength(0);
    });

    it('should detect cycles through Map keys (rare case)', () => {
      const module: IRModule = {
        path: '/test/map-key-cycle.gs',
        declarations: [
          {
            kind: 'class',
            name: 'Node',
            fields: [
              {
                name: 'lookup',
                type: types.map(
                  types.class('Node', Ownership.Share),  // share<Node> as key
                  types.string()
                ),
                isReadonly: false,
              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      // Should detect self-loop through map key
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('GS301');
      expect(result.errors[0].message).toContain('Node');
    });

    it('should handle union types with share<T>', () => {
      const module: IRModule = {
        path: '/test/union.gs',
        declarations: [
          {
            kind: 'class',
            name: 'Container',
            fields: [
              {
                name: 'data',
                type: types.union([
                  types.string(),
                  types.class('Container', Ownership.Share)
                ]),
                isReadonly: false,
              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      // Should detect self-loop through union variant
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('GS301');
    });
  });

  describe('Type Alias Resolution', () => {
    it('should resolve type alias to detect self-referencing share<T>', () => {
      const module: IRModule = {
        path: '/test/alias.gs',
        declarations: [
          {
            kind: 'typeAlias',
            name: 'NodeRef',
            type: types.class('Node', Ownership.Share),
          } as IRTypeAliasDecl,
          {
            kind: 'class',
            name: 'Node',
            fields: [
              {
                name: 'next',
                type: types.typeAlias('NodeRef', types.class('Node', Ownership.Share)),
                isReadonly: false,
              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      // Should detect self-loop through type alias
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('GS301');
      expect(result.errors[0].message).toContain('Node');
    });

    it('should resolve nested type aliases', () => {
      const module: IRModule = {
        path: '/test/nested-alias.gs',
        declarations: [
          {
            kind: 'typeAlias',
            name: 'SharedNode',
            type: types.class('Node', Ownership.Share),
          } as IRTypeAliasDecl,
          {
            kind: 'typeAlias',
            name: 'NodeRef',
            type: types.typeAlias('SharedNode', types.class('Node', Ownership.Share)),
          } as IRTypeAliasDecl,
          {
            kind: 'class',
            name: 'Node',
            fields: [
              {
                name: 'next',
                type: types.typeAlias('NodeRef', types.typeAlias('SharedNode', types.class('Node', Ownership.Share))),
                isReadonly: false,
              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      // Should detect self-loop through nested type aliases
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('GS301');
    });

    it('should resolve type alias in cycle detection', () => {
      const module: IRModule = {
        path: '/test/alias-cycle.gs',
        declarations: [
          {
            kind: 'typeAlias',
            name: 'BRef',
            type: types.class('B', Ownership.Share),
          } as IRTypeAliasDecl,
          {
            kind: 'class',
            name: 'A',
            fields: [
              {
                name: 'b',
                type: types.typeAlias('BRef', types.class('B', Ownership.Share)),
                isReadonly: false,
              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
          {
            kind: 'class',
            name: 'B',
            fields: [
              {
                name: 'a',
                type: types.class('A', Ownership.Share),
                isReadonly: false,
              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      // Should detect cycle through type alias
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('GS302');
      expect(result.errors[0].message).toContain('Cyclic share<T>');
    });

    it('should resolve type alias in container types', () => {
      const module: IRModule = {
        path: '/test/alias-container.gs',
        declarations: [
          {
            kind: 'typeAlias',
            name: 'NodeRef',
            type: types.class('Node', Ownership.Share),
          } as IRTypeAliasDecl,
          {
            kind: 'class',
            name: 'Node',
            fields: [
              {
                name: 'children',
                type: types.array(
                  types.typeAlias('NodeRef', types.class('Node', Ownership.Share)),
                  Ownership.Value
                ),
                isReadonly: false,
              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      // Should detect self-loop through type alias in array
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('GS301');
    });
  });

  describe('Intersection Type Handling', () => {
    it('should handle intersection types with share<T>', () => {
      const module: IRModule = {
        path: '/test/intersection.gs',
        declarations: [
          {
            kind: 'interface',
            name: 'Named',
            properties: [{ name: 'name', type: types.string() }],
            methods: [],
          } as IRInterfaceDecl,
          {
            kind: 'class',
            name: 'Node',
            fields: [
              {
                name: 'next',
                // Intersection of Named & share<Node>
                type: types.intersection([
                  types.class('Named', Ownership.Value),
                  types.class('Node', Ownership.Share)
                ]),
                isReadonly: false,
              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      // Should detect self-loop through intersection type
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('GS301');
      expect(result.errors[0].message).toContain('Node');
    });

    it('should handle deep intersection types', () => {
      const module: IRModule = {
        path: '/test/deep-intersection.gs',
        declarations: [
          {
            kind: 'interface',
            name: 'Serializable',
            properties: [{ name: 'serialize', type: types.function([], types.string()) }],
            methods: [],
          } as IRInterfaceDecl,
          {
            kind: 'interface',
            name: 'Comparable',
            properties: [{ name: 'compare', type: types.function([types.class('Comparable', Ownership.Use)], types.number()) }],
            methods: [],
          } as IRInterfaceDecl,
          {
            kind: 'class',
            name: 'A',
            fields: [
              {
                name: 'b',
                type: types.intersection([
                  types.class('Serializable', Ownership.Value),
                  types.class('B', Ownership.Share)
                ]),
                isReadonly: false,
              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
          {
            kind: 'class',
            name: 'B',
            fields: [
              {
                name: 'a',
                type: types.intersection([
                  types.class('Comparable', Ownership.Value),
                  types.class('A', Ownership.Share)
                ]),
                isReadonly: false,
              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      // Should detect cycle through intersection types
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('GS302');
      expect(result.errors[0].message).toContain('Cyclic share<T>');
    });

    it('should handle intersection in union types', () => {
      const module: IRModule = {
        path: '/test/intersection-union.gs',
        declarations: [
          {
            kind: 'interface',
            name: 'Tagged',
            properties: [{ name: 'tag', type: types.string() }],
            methods: [],
          } as IRInterfaceDecl,
          {
            kind: 'class',
            name: 'Container',
            fields: [
              {
                name: 'data',
                type: types.union([
                  types.string(),
                  types.intersection([
                    types.class('Tagged', Ownership.Value),
                    types.class('Container', Ownership.Share)
                  ])
                ]),
                isReadonly: false,
              },
            ],
            methods: [],
            constructor: { params: [], body: { id: 0, instructions: [], terminator: { kind: 'return' } } },
          } as IRClassDecl,
        ],
        imports: [],
      };

      const result = analyzeOwnership([module], 'ownership');

      // Should detect self-loop through intersection in union
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('GS301');
    });
  });
});
