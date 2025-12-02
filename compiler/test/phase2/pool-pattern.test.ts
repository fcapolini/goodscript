/**
 * Phase 2 Tests: Pool Pattern
 * 
 * Tests for the Pool Pattern - a fundamental pattern in GoodScript that allows
 * self-referential data structures while maintaining DAG ownership properties.
 * 
 * Pattern: Central ownership (own<T>[]) + Weak references for structure
 * 
 * See: POOL-PATTERN.md for detailed documentation
 */

import { describe, it, expect } from 'vitest';
import { compileWithOwnership, hasError, isSuccess } from './test-helpers';

describe('Phase 2: Pool Pattern', () => {
  
  describe('Basic Pool Pattern structures', () => {
    
    it('should accept simple Pool Pattern for linked list', () => {
      const source = `
        class NodePool {
          nodes: own<Node>[] = [];
          head: use<Node> = null;
        }
        
        class Node {
          next: use<Node> = null;
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept doubly-linked list with Pool Pattern', () => {
      const source = `
        class DoublyLinkedList {
          nodes: own<ListNode>[] = [];
          head: use<ListNode> = null;
          tail: use<ListNode> = null;
        }
        
        class ListNode {
          next: use<ListNode> = null;
          prev: use<ListNode> = null;
          data: string = '';
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept binary tree with Pool Pattern', () => {
      const source = `
        class BinaryTree {
          nodes: own<TreeNode>[] = [];
          root: use<TreeNode> = null;
        }
        
        class TreeNode {
          left: use<TreeNode> = null;
          right: use<TreeNode> = null;
          parent: use<TreeNode> = null;
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept general tree with children array', () => {
      const source = `
        class Tree {
          nodes: own<TreeNode>[] = [];
          root: use<TreeNode> = null;
        }
        
        class TreeNode {
          children: use<TreeNode>[] = [];
          parent: use<TreeNode> = null;
          value: string = '';
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept graph with Pool Pattern', () => {
      const source = `
        class Graph {
          nodes: own<GraphNode>[] = [];
        }
        
        class GraphNode {
          edges: use<GraphNode>[] = [];
          id: string = '';
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
  });
  
  describe('Pool Pattern with complex structures', () => {
    
    it('should accept skip list with multiple levels', () => {
      const source = `
        class SkipList {
          nodes: own<SkipNode>[] = [];
          head: use<SkipNode> = null;
        }
        
        class SkipNode {
          next: use<SkipNode>[] = [];
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept adjacency list graph with Map', () => {
      const source = `
        class Graph {
          nodes: own<GraphNode>[] = [];
          adjacency: Map<string, use<GraphNode>[]> = new Map();
        }
        
        class GraphNode {
          neighbors: Set<use<GraphNode>> = new Set();
          id: string = '';
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept tree with metadata and weak back-references', () => {
      const source = `
        class DocumentTree {
          nodes: own<DocumentNode>[] = [];
          root: use<DocumentNode> = null;
          index: Map<string, use<DocumentNode>> = new Map();
        }
        
        class DocumentNode {
          children: use<DocumentNode>[] = [];
          parent: use<DocumentNode> = null;
          nextSibling: use<DocumentNode> = null;
          prevSibling: use<DocumentNode> = null;
          id: string = '';
          content: string = '';
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept scene graph with transformations', () => {
      const source = `
        class SceneGraph {
          nodes: own<SceneNode>[] = [];
          root: use<SceneNode> = null;
        }
        
        class SceneNode {
          children: use<SceneNode>[] = [];
          parent: use<SceneNode> = null;
          transform: own<Transform> = new Transform();
        }
        
        class Transform {
          x: number = 0;
          y: number = 0;
          rotation: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
  });
  
  describe('Pool Pattern vs invalid patterns', () => {
    
    it('should reject self-referential structure without pool', () => {
      const source = `
        class Node {
          next: share<Node> | null = null;
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should reject tree without pool (Shared ownership)', () => {
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
    
    it('should reject graph without pool (Shared ownership)', () => {
      const source = `
        class GraphNode {
          edges: share<GraphNode>[] = [];
          id: string = '';
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
  });
  
  describe('Multiple pools and hybrid patterns', () => {
    
    it('should accept multiple independent pools', () => {
      const source = `
        class Application {
          treePool: own<TreeNode>[] = [];
          listPool: own<ListNode>[] = [];
        }
        
        class TreeNode {
          children: use<TreeNode>[] = [];
          parent: use<TreeNode> = null;
        }
        
        class ListNode {
          next: use<ListNode> = null;
          prev: use<ListNode> = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept pool with Shared cross-references to other types', () => {
      const source = `
        class DocumentManager {
          nodes: own<DocumentNode>[] = [];
          metadata: share<Metadata> | null = null;
        }
        
        class DocumentNode {
          children: use<DocumentNode>[] = [];
          parent: use<DocumentNode> = null;
        }
        
        class Metadata {
          author: string = '';
          created: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept nested pools (pool of pools)', () => {
      const source = `
        class Application {
          forests: own<Forest>[] = [];
        }
        
        class Forest {
          trees: own<Tree>[] = [];
        }
        
        class Tree {
          nodes: own<TreeNode>[] = [];
          root: use<TreeNode> = null;
        }
        
        class TreeNode {
          children: use<TreeNode>[] = [];
          parent: use<TreeNode> = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
  });
  
  describe('Pool Pattern with generics', () => {
    
    it('should accept generic pool pattern', () => {
      const source = `
        class Pool<T> {
          items: own<T>[] = [];
        }
        
        class Node {
          next: use<Node> = null;
          value: number = 0;
        }
        
        const nodePool: Pool<Node> = new Pool<Node>();
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept generic tree pool', () => {
      const source = `
        class TreePool<T> {
          nodes: own<TreeNode<T>>[] = [];
          root: use<TreeNode<T>> = null;
        }
        
        class TreeNode<T> {
          children: use<TreeNode<T>>[] = [];
          parent: use<TreeNode<T>> = null;
          data: T | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
  });
  
  describe('Arena pattern (bulk deallocation variant)', () => {
    
    it('should accept arena pattern for temporary allocations', () => {
      const source = `
        class Arena {
          nodes: own<Node>[] = [];
          
          clear(): void {
            this.nodes = [];
          }
        }
        
        class Node {
          next: use<Node> = null;
          data: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept arena with multiple node types', () => {
      const source = `
        class RenderArena {
          vertices: own<Vertex>[] = [];
          edges: own<Edge>[] = [];
          
          clear(): void {
            this.vertices = [];
            this.edges = [];
          }
        }
        
        class Vertex {
          edges: use<Edge>[] = [];
          position: number[] = [];
        }
        
        class Edge {
          from: use<Vertex> = null;
          to: use<Vertex> = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
  });
  
  describe('Real-world patterns', () => {
    
    it('should accept DOM-like tree structure', () => {
      const source = `
        class Document {
          nodes: own<Element>[] = [];
          root: use<Element> = null;
          
          getElementById(id: string): use<Element> {
            return null;
          }
        }
        
        class Element {
          children: use<Element>[] = [];
          parent: use<Element> = null;
          tagName: string = '';
          id: string = '';
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept entity-component system', () => {
      const source = `
        class EntityManager {
          entities: own<Entity>[] = [];
          components: own<Component>[] = [];
        }
        
        class Entity {
          components: use<Component>[] = [];
          id: string = '';
        }
        
        class Component {
          owner: use<Entity> = null;
          type: string = '';
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept AST with symbol table', () => {
      const source = `
        class AST {
          nodes: own<ASTNode>[] = [];
          symbols: Map<string, use<ASTNode>> = new Map();
          root: use<ASTNode> = null;
        }
        
        class ASTNode {
          children: use<ASTNode>[] = [];
          parent: use<ASTNode> = null;
          type: string = '';
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept file system tree', () => {
      const source = `
        class FileSystem {
          nodes: own<FileNode>[] = [];
          root: use<FileNode> = null;
          index: Map<string, use<FileNode>> = new Map();
        }
        
        class FileNode {
          children: use<FileNode>[] = [];
          parent: use<FileNode> = null;
          name: string = '';
          isDirectory: boolean = false;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
  });
  
  describe('Edge cases and variations', () => {
    
    it('should accept pool with optional weak references', () => {
      const source = `
        class Pool {
          nodes: own<Node>[] = [];
        }
        
        class Node {
          next: use<Node> = null;
          prev: use<Node> = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept pool with Set of weak references', () => {
      const source = `
        class Pool {
          nodes: own<Node>[] = [];
        }
        
        class Node {
          connections: Set<use<Node>> = new Set();
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept pool with Map of weak references', () => {
      const source = `
        class Pool {
          nodes: own<Node>[] = [];
        }
        
        class Node {
          neighbors: Map<string, use<Node>> = new Map();
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept empty pool (no weak references needed)', () => {
      const source = `
        class Pool {
          items: own<Item>[] = [];
        }
        
        class Item {
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
  });
});
