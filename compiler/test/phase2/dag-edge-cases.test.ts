/**
 * Tests for potential gaps in DAG cycle detection
 * These are edge cases that might fool the ownership analyzer
 */

import { describe, it, expect } from 'vitest';
import { compileWithOwnership, hasError, isSuccess } from './test-helpers';

describe('DAG Analysis Edge Cases', () => {
  
  describe('Deeply nested type alias cycles', () => {
    it('should detect 4-hop cycle through type aliases', () => {
      const code = `
        type A = { next: share<B> };
        type B = { next: share<C> };
        type C = { next: share<D> };
        type D = { next: share<A> };
      `;
      const result = compileWithOwnership(code);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });

    it('should detect 10-hop cycle', () => {
      const code = `
        type T1 = { n: share<T2> };
        type T2 = { n: share<T3> };
        type T3 = { n: share<T4> };
        type T4 = { n: share<T5> };
        type T5 = { n: share<T6> };
        type T6 = { n: share<T7> };
        type T7 = { n: share<T8> };
        type T8 = { n: share<T9> };
        type T9 = { n: share<T10> };
        type T10 = { n: share<T1> };
      `;
      const result = compileWithOwnership(code);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
  });

  describe('Index signatures', () => {
    it('should detect cycle in index signature', () => {
      const code = `
        type DynamicGraph = {
          [key: string]: share<DynamicGraph>;
        };
      `;
      const result = compileWithOwnership(code);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });

    it('should detect cycle in numbered index signature', () => {
      const code = `
        type NumericGraph = {
          [index: number]: share<NumericGraph>;
        };
      `;
      const result = compileWithOwnership(code);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
  });

  describe('Tuple types', () => {
    it('should detect cycle in tuple type', () => {
      const code = `
        type Node = {
          children: [share<Node>, share<Node>];
        };
      `;
      const result = compileWithOwnership(code);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });

    it('should detect cycle in mixed tuple', () => {
      const code = `
        type Node = {
          data: [number, share<Node>, string];
        };
      `;
      const result = compileWithOwnership(code);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
  });

  describe('Generic type aliases', () => {
    it('should detect cycle through generic type alias', () => {
      const code = `
        type Ref<T> = { value: share<T> };
        type Node = Ref<Node>;
      `;
      const result = compileWithOwnership(code);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });

    it('should detect cycle through nested generic aliases', () => {
      const code = `
        type Box<T> = { item: share<T> };
        type Container<T> = Box<T>;
        type Node = Container<Node>;
      `;
      const result = compileWithOwnership(code);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
  });

  describe('Conditional types (if supported)', () => {
    it('should detect cycle in conditional type with self-reference', () => {
      const code = `
        type Node = number extends string
          ? { value: number }
          : { next: share<Node> };
      `;
      const result = compileWithOwnership(code);
      // Should detect the cycle in the false branch (which is always taken)
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
  });

  describe('Mapped types', () => {
    it('should detect cycle in mapped type', () => {
      const code = `
        type Node = {
          [K in 'next' | 'prev']: share<Node>;
        };
      `;
      const result = compileWithOwnership(code);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
  });

  describe('Verified safe patterns', () => {
    it('should allow function return types with share', () => {
      const code = `
        type Node = {
          id: number;
          getNext: () => share<Node>;
        };
      `;
      const result = compileWithOwnership(code);
      // Function types should NOT create ownership edges
      expect(isSuccess(result)).toBe(true);
    });

    it('should handle union with null/undefined', () => {
      const code = `
        type Node = {
          next: share<Node> | null | undefined;
        };
      `;
      const result = compileWithOwnership(code);
      // Should detect cycle despite union with null
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });

    it('should handle optional with union', () => {
      const code = `
        type Node = {
          next?: share<Node> | null;
        };
      `;
      const result = compileWithOwnership(code);
      // Should detect cycle despite optional and union
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
  });

  describe('Intersection types', () => {
    it('should detect cycle through intersection type alias', () => {
      const code = `
        type HasNext = { next: share<Node> };
        type HasValue = { value: number };
        type Node = HasNext & HasValue;
      `;
      const result = compileWithOwnership(code);
      // Node inherits the 'next' field from HasNext, creating a cycle
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });

    it('should detect cycle in field with intersection type', () => {
      const code = `
        type HasNext = { next: share<Node> };
        type HasValue = { value: number };
        type Node = {
          data: HasNext & HasValue;
        };
      `;
      const result = compileWithOwnership(code);
      // Node -> data (intersection) -> next -> share<Node>
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });

    it('should handle safe intersection types', () => {
      const code = `
        type HasValue = { value: number };
        type HasId = { id: string };
        type Node = HasValue & HasId;
      `;
      const result = compileWithOwnership(code);
      // No share<T> in the intersection, so no cycle
      expect(isSuccess(result)).toBe(true);
    });
  });

  describe('Complex nesting', () => {
    it('should detect cycle in deeply nested union', () => {
      const code = `
        type Node = {
          data: (share<Node> | null) | undefined;
        };
      `;
      const result = compileWithOwnership(code);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });

    it('should detect cycle in array within optional', () => {
      const code = `
        type Node = {
          children?: share<Node>[];
        };
      `;
      const result = compileWithOwnership(code);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
  });
});
