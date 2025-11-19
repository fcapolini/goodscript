/**
 * Phase 2 Tests: Ownership Cycle Detection
 * 
 * Tests for DAG-DETECTION.md rules:
 * - Rule 1.1: Direct shared<T> field creates edge
 * - Rule 1.2: Container transitivity
 * - Rule 1.3: Intermediate wrapper transitivity
 * - Rule 2.1: Self-ownership prohibition
 * - Rule 3.1/3.2: weak<T> and unique<T> do NOT create edges
 * - Rule 4.1: Pool Pattern enforcement
 */

import { describe, it, expect } from 'vitest';
import { compileWithOwnership, compileMultipleWithOwnership, hasError, getErrors, isSuccess } from './test-helpers';

describe('Phase 2: Ownership Cycle Detection', () => {
  
  describe('Rule 1.1: Direct shared<T> field creates edge', () => {
    
    it('should detect direct self-reference cycle (A → A)', () => {
      const source = `
        class Node {
          next: shared<Node> | null = null;
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
          b: shared<B> | null = null;
        }
        class B {
          a: shared<A> | null = null;
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
          b: shared<B> | null = null;
        }
        class B {
          c: shared<C> | null = null;
        }
        class C {
          a: shared<A> | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should allow acyclic ownership', () => {
      const source = `
        class Parent {
          child: shared<Child> | null = null;
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
    
    it('should detect cycle through Array<shared<T>>', () => {
      const source = `
        class Node {
          children: Array<shared<Node>> = [];
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
      expect(getErrors(result.diagnostics, 'GS301')[0].message).toContain('Node → Node');
    });
    
    it('should detect cycle through shared<T>[] syntax', () => {
      const source = `
        class Node {
          children: shared<Node>[] = [];
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should detect cycle through Set<shared<T>>', () => {
      const source = `
        class Node {
          connections: Set<shared<Node>> = new Set();
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should detect cycle through Map<K, shared<V>>', () => {
      const source = `
        class Node {
          children: Map<string, shared<Node>> = new Map();
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
          wrapper: shared<Wrapper> | null = null;
        }
        class Wrapper {
          b: shared<B> | null = null;
        }
        class B {
          a: shared<A> | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should track ownership through deep nesting', () => {
      const source = `
        class Root {
          level1: shared<Level1> | null = null;
        }
        class Level1 {
          level2: shared<Level2> | null = null;
        }
        class Level2 {
          level3: shared<Level3> | null = null;
        }
        class Level3 {
          root: shared<Root> | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
  });
  
  describe('Rule 2.1: Self-ownership prohibition', () => {
    
    it('should reject self-referential linked list with shared<T>', () => {
      const source = `
        class ListNode {
          next: shared<ListNode> | null = null;
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
      expect(getErrors(result.diagnostics, 'GS301')[0].message).toContain('Pool Pattern');
    });
    
    it('should reject tree with shared<T> children', () => {
      const source = `
        class TreeNode {
          left: shared<TreeNode> | null = null;
          right: shared<TreeNode> | null = null;
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should reject graph with shared<T> edges', () => {
      const source = `
        class GraphNode {
          edges: shared<GraphNode>[] = [];
          value: string = '';
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
  });
  
  describe('Rule 3.1: weak<T> does NOT create edges', () => {
    
    it('should allow self-reference with weak<T>', () => {
      const source = `
        class Node {
          next: weak<Node> = null;
          prev: weak<Node> = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
    
    it('should allow bidirectional reference with weak<T>', () => {
      const source = `
        class Parent {
          child: shared<Child> | null = null;
        }
        class Child {
          parent: weak<Parent> = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
    
    it('should allow weak<T>[] arrays', () => {
      const source = `
        class TreeNode {
          children: weak<TreeNode>[] = [];
          parent: weak<TreeNode> = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
    
    it('should allow complex weak references', () => {
      const source = `
        class GraphNode {
          neighbors: weak<GraphNode>[] = [];
          backEdges: Set<weak<GraphNode>> = new Set();
          metadata: Map<string, weak<GraphNode>> = new Map();
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
  });
  
  describe('Rule 3.2: unique<T> does NOT create edges', () => {
    
    it('should allow unique<T> ownership without cycles', () => {
      const source = `
        class Container {
          item: unique<Item> | null = null;
        }
        class Item {
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
    
    it('should allow unique<T>[] arrays', () => {
      const source = `
        class Pool {
          items: unique<Item>[] = [];
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
          nodes: unique<TreeNode>[] = [];
          root: weak<TreeNode> = null;
        }
        
        class TreeNode {
          children: weak<TreeNode>[] = [];
          parent: weak<TreeNode> = null;
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
    
    it('should accept Pool Pattern for linked list', () => {
      const source = `
        class LinkedList {
          nodes: unique<ListNode>[] = [];
          head: weak<ListNode> = null;
        }
        
        class ListNode {
          next: weak<ListNode> = null;
          prev: weak<ListNode> = null;
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
    
    it('should accept Pool Pattern for graph', () => {
      const source = `
        class Graph {
          nodes: unique<GraphNode>[] = [];
        }
        
        class GraphNode {
          edges: weak<GraphNode>[] = [];
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
              b: shared<B> | null = null;
            }
          `
        },
        {
          name: 'b.gs.ts',
          source: `
            import { A } from './a';
            export class B {
              a: shared<A> | null = null;
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
          left: shared<Branch> | null = null;
          right: shared<Branch> | null = null;
        }
        class Branch {
          leaf: shared<Leaf> | null = null;
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
          left: shared<Branch> | null = null;
          right: shared<Branch> | null = null;
        }
        class Branch {
          leaf: shared<Leaf> | null = null;
        }
        class Leaf {
          root: shared<Root> | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should allow mixed ownership types', () => {
      const source = `
        class Manager {
          ownedItems: unique<Item>[] = [];
          sharedResource: shared<Resource> | null = null;
          weakRef: weak<Item> = null;
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
          next: shared<INode> | null;
        }
        
        class Node implements INode {
          next: shared<INode> | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should allow acyclic interface relationships', () => {
      const source = `
        interface IParent {
          child: shared<IChild> | null;
        }
        
        interface IChild {
          value: number;
        }
        
        class Parent implements IParent {
          child: shared<IChild> | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
  });
});
