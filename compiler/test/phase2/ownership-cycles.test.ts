/**
 * Phase 2 Tests: Ownership Cycle Detection
 * 
 * Tests for DAG-DETECTION.md rules:
 * - Rule 1.1: Direct share<T> field creates edge
 * - Rule 1.2: Container transitivity
 * - Rule 1.3: Intermediate wrapper transitivity
 * - Rule 2.1: Self-ownership prohibition
 * - Rule 3.1/3.2: use<T> and own<T> do NOT create edges
 * - Rule 4.1: Pool Pattern enforcement
 */

import { describe, it, expect } from 'vitest';
import { compileWithOwnership, compileMultipleWithOwnership, hasError, getErrors, isSuccess } from './test-helpers';

describe('Phase 2: Ownership Cycle Detection', () => {
  
  describe('Rule 1.1: Direct share<T> field creates edge', () => {
    
    it('should detect direct self-reference cycle (A → A)', () => {
      const source = `
        class Node {
          next: share<Node> | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
      
      const errors = getErrors(result.diagnostics, 'GS301');
      expect(errors[0].message).toContain('Node → Node');
      expect(errors[0].message).toContain('Pool Pattern');
    });
    
    it('should detect mutual cycle (A → B → A)', () => {
      const source = `
        class A {
          b: share<B> | null = null;
        }
        class B {
          a: share<A> | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
      
      const errors = getErrors(result.diagnostics, 'GS301');
      expect(errors[0].message).toContain('A → B → A');
    });
    
    it('should detect longer cycle (A → B → C → A)', () => {
      const source = `
        class A {
          b: share<B> | null = null;
        }
        class B {
          c: share<C> | null = null;
        }
        class C {
          a: share<A> | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should allow acyclic ownership', () => {
      const source = `
        class Parent {
          child: share<Child> | null = null;
        }
        class Child {
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
  });
  
  describe('Rule 1.2: Container transitivity', () => {
    
    it('should detect cycle through Array<share<T>>', () => {
      const source = `
        class Node {
          children: Array<share<Node>> = [];
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
      expect(getErrors(result.diagnostics, 'GS301')[0].message).toContain('Node → Node');
    });
    
    it('should detect cycle through share<T>[] syntax', () => {
      const source = `
        class Node {
          children: share<Node>[] = [];
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should detect cycle through Set<share<T>>', () => {
      const source = `
        class Node {
          connections: Set<share<Node>> = new Set();
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should detect cycle through Map<K, share<V>>', () => {
      const source = `
        class Node {
          children: Map<string, share<Node>> = new Map();
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should allow containers without shared ownership', () => {
      const source = `
        class Container {
          items: string[] = [];
          values: Map<string, number> = new Map();
          ids: Set<number> = new Set();
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
  });
  
  describe('Rule 1.3: Intermediate wrapper transitivity', () => {
    
    it('should detect transitive cycle (A → B → C → A)', () => {
      const source = `
        class A {
          wrapper: share<Wrapper> | null = null;
        }
        class Wrapper {
          b: share<B> | null = null;
        }
        class B {
          a: share<A> | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should track ownership through deep nesting', () => {
      const source = `
        class Root {
          level1: share<Level1> | null = null;
        }
        class Level1 {
          level2: share<Level2> | null = null;
        }
        class Level2 {
          level3: share<Level3> | null = null;
        }
        class Level3 {
          root: share<Root> | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
  });
  
  describe('Rule 2.1: Self-ownership prohibition', () => {
    
    it('should reject self-referential linked list with share<T>', () => {
      const source = `
        class ListNode {
          next: share<ListNode> | null = null;
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
      expect(getErrors(result.diagnostics, 'GS301')[0].message).toContain('Pool Pattern');
    });
    
    it('should reject tree with share<T> children', () => {
      const source = `
        class TreeNode {
          left: share<TreeNode> | null = null;
          right: share<TreeNode> | null = null;
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should reject graph with share<T> edges', () => {
      const source = `
        class GraphNode {
          edges: share<GraphNode>[] = [];
          value: string = '';
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
  });
  
  describe('Rule 3.1: use<T> does NOT create edges', () => {
    
    it('should allow self-reference with use<T>', () => {
      const source = `
        class Node {
          next: use<Node> = null;
          prev: use<Node> = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
    
    it('should allow bidirectional reference with use<T>', () => {
      const source = `
        class Parent {
          child: share<Child> | null = null;
        }
        class Child {
          parent: use<Parent> = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
    
    it('should allow use<T>[] arrays', () => {
      const source = `
        class TreeNode {
          children: use<TreeNode>[] = [];
          parent: use<TreeNode> = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
    
    it('should allow complex weak references', () => {
      const source = `
        class GraphNode {
          neighbors: use<GraphNode>[] = [];
          backEdges: Set<use<GraphNode>> = new Set();
          metadata: Map<string, use<GraphNode>> = new Map();
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
  });
  
  describe('Rule 3.2: own<T> does NOT create edges', () => {
    
    it('should allow own<T> ownership without cycles', () => {
      const source = `
        class Container {
          item: own<Item> | null = null;
        }
        class Item {
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
    
    it('should allow own<T>[] arrays', () => {
      const source = `
        class Pool {
          items: own<Item>[] = [];
        }
        class Item {
          id: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
  });
  
  describe('Rule 4.1: Pool Pattern enforcement', () => {
    
    it('should accept Pool Pattern for tree structure', () => {
      const source = `
        class Tree {
          nodes: own<TreeNode>[] = [];
          root: use<TreeNode> = null;
        }
        
        class TreeNode {
          children: use<TreeNode>[] = [];
          parent: use<TreeNode> = null;
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
    
    it('should accept Pool Pattern for linked list', () => {
      const source = `
        class LinkedList {
          nodes: own<ListNode>[] = [];
          head: use<ListNode> = null;
        }
        
        class ListNode {
          next: use<ListNode> = null;
          prev: use<ListNode> = null;
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
    
    it('should accept Pool Pattern for graph', () => {
      const source = `
        class Graph {
          nodes: own<GraphNode>[] = [];
        }
        
        class GraphNode {
          edges: use<GraphNode>[] = [];
          value: string = '';
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
  });
  
  describe('Cross-file cycle detection', () => {
    
    it('should detect cycles across multiple files', () => {
      const result = compileMultipleWithOwnership([
        {
          name: 'a.gs.ts',
          source: `
            import { B } from './b';
            export class A {
              b: share<B> | null = null;
            }
          `
        },
        {
          name: 'b.gs.ts',
          source: `
            import { A } from './a';
            export class B {
              a: share<A> | null = null;
            }
          `
        }
      ]);
      
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
  });
  
  describe('Complex scenarios', () => {
    
    it('should allow diamond dependency without cycles', () => {
      const source = `
        class Root {
          left: share<Branch> | null = null;
          right: share<Branch> | null = null;
        }
        class Branch {
          leaf: share<Leaf> | null = null;
        }
        class Leaf {
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
    
    it('should detect cycle in diamond with back edge', () => {
      const source = `
        class Root {
          left: share<Branch> | null = null;
          right: share<Branch> | null = null;
        }
        class Branch {
          leaf: share<Leaf> | null = null;
        }
        class Leaf {
          root: share<Root> | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should allow mixed ownership types', () => {
      const source = `
        class Manager {
          ownedItems: own<Item>[] = [];
          sharedResource: share<Resource> | null = null;
          weakRef: use<Item> = null;
        }
        class Item {
          id: number = 0;
        }
        class Resource {
          data: string = '';
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
  });
  
  describe('Interface support', () => {
    
    it('should detect cycles through interfaces', () => {
      const source = `
        interface INode {
          next: share<INode> | null;
        }
        
        class Node implements INode {
          next: share<INode> | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should allow acyclic interface relationships', () => {
      const source = `
        interface IParent {
          child: share<IChild> | null;
        }
        
        interface IChild {
          value: number;
        }
        
        class Parent implements IParent {
          child: share<IChild> | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
  });
});
