import { describe, it, expect } from 'vitest';
import { compileWithOwnership, hasError, isSuccess, getErrors } from './test-helpers';

describe('Type Alias Cycle Detection', () => {
  describe('Self-referencing type aliases', () => {
    it('should detect direct self-reference with share<T>', () => {
      const code = `
        type Node = {
          value: number;
          next: share<Node>;
        };
      `;
      const result = compileWithOwnership(code);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
      const errors = getErrors(result.diagnostics, 'GS301');
      expect(errors[0].message).toContain('Ownership cycle');
      expect(errors[0].message).toContain('Node');
    });

    it('should detect optional self-reference with share<T>', () => {
      const code = `
        type Node = {
          next?: share<Node>;
        };
      `;
      const result = compileWithOwnership(code);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });

    it('should detect self-reference in array with share<T>', () => {
      const code = `
        type Node = {
          children: share<Node>[];
        };
      `;
      const result = compileWithOwnership(code);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });

    it('should detect self-reference in Map with share<T> values', () => {
      const code = `
        type Node = {
          edges: Map<string, share<Node>>;
        };
      `;
      const result = compileWithOwnership(code);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });

    it('should allow self-reference with use<T> (non-owning)', () => {
      const code = `
        type Node = {
          value: number;
          next: use<Node>;
        };
      `;
      const result = compileWithOwnership(code);
      expect(isSuccess(result)).toBe(true);
    });

    it('should allow self-reference with own<T> array (no cycle)', () => {
      const code = `
        type Node = {
          children: own<Node>[];
        };
      `;
      const result = compileWithOwnership(code);
      expect(isSuccess(result)).toBe(true);
    });
  });

  describe('Mutual reference cycles', () => {
    it('should detect two-type cycle', () => {
      const code = `
        type A = {
          b: share<B>;
        };
        type B = {
          a: share<A>;
        };
      `;
      const result = compileWithOwnership(code);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });

    it('should detect three-type cycle', () => {
      const code = `
        type A = {
          b: share<B>;
        };
        type B = {
          c: share<C>;
        };
        type C = {
          a: share<A>;
        };
      `;
      const result = compileWithOwnership(code);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });

    it('should allow mutual references with use<T>', () => {
      const code = `
        type A = {
          b: use<B>;
        };
        type B = {
          a: use<A>;
        };
      `;
      const result = compileWithOwnership(code);
      expect(isSuccess(result)).toBe(true);
    });
  });

  describe('Pool Pattern with type aliases', () => {
    it('should allow Pool Pattern with type aliases', () => {
      const code = `
        type Node = {
          id: number;
          children: use<Node>[];
        };

        type Tree = {
          nodes: own<Node>[];
        };
      `;
      const result = compileWithOwnership(code);
      expect(isSuccess(result)).toBe(true);
    });

    it('should allow linked list with Pool Pattern', () => {
      const code = `
        type LinkedListNode = {
          value: number;
          next: use<LinkedListNode>;
        };

        type LinkedList = {
          nodes: own<LinkedListNode>[];
          head: use<LinkedListNode>;
        };
      `;
      const result = compileWithOwnership(code);
      expect(isSuccess(result)).toBe(true);
    });

    it('should allow graph with Pool Pattern', () => {
      const code = `
        type GraphNode = {
          id: string;
          edges: use<GraphNode>[];
        };

        type Graph = {
          nodes: Map<string, own<GraphNode>>;
        };
      `;
      const result = compileWithOwnership(code);
      expect(isSuccess(result)).toBe(true);
    });
  });

  describe('Mixed class and type alias cycles', () => {
    it('should detect cycle between class and type alias', () => {
      const code = `
        class ClassA {
          b: share<TypeB>;
        }

        type TypeB = {
          a: share<ClassA>;
        };
      `;
      const result = compileWithOwnership(code);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });

    it('should allow mixed class/type with use<T>', () => {
      const code = `
        class ClassA {
          b: use<TypeB>;
        }

        type TypeB = {
          a: share<ClassA>;
        };
      `;
      const result = compileWithOwnership(code);
      expect(isSuccess(result)).toBe(true);
    });
  });

  describe('Non-object type aliases (should be ignored)', () => {
    it('should ignore union type aliases', () => {
      const code = `
        type Result = string | number;
        
        class A {
          result: Result = "hello";
        }
      `;
      const result = compileWithOwnership(code);
      if (!isSuccess(result)) {
        console.log('Union type alias errors:', result.diagnostics.map(d => `${d.code}: ${d.message}`));
      }
      expect(isSuccess(result)).toBe(true);
    });

    it('should ignore primitive type aliases', () => {
      const code = `
        type ID = string;
        
        class A {
          id: ID = "123";
        }
      `;
      const result = compileWithOwnership(code);
      expect(isSuccess(result)).toBe(true);
    });

    it('should ignore function type aliases', () => {
      const code = `
        type Callback = (x: number) => void;
        
        class A {
          cb: Callback = (x) => {};
        }
      `;
      const result = compileWithOwnership(code);
      expect(isSuccess(result)).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle type alias with multiple share<T> fields', () => {
      const code = `
        type Node = {
          left: share<Node>;
          right: share<Node>;
        };
      `;
      const result = compileWithOwnership(code);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });

    it('should detect cycle in nested optional share<T>', () => {
      const code = `
        type Node = {
          data?: {
            next?: share<Node>;
          };
        };
      `;
      const result = compileWithOwnership(code);
      // This DOES create a cycle: Node -> (via data field) -> (via next field) -> share<Node>
      // Nesting depth doesn't matter - any path to share<T> creates an ownership edge
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });

    it('should handle type alias referencing class', () => {
      const code = `
        class TreeNode {
          value: number = 0;
        }

        type Tree = {
          root: share<TreeNode>;
        };
      `;
      const result = compileWithOwnership(code);
      expect(isSuccess(result)).toBe(true);
    });
  });
});
