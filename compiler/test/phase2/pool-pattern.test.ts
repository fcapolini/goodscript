/**
 * Phase 2 Tests: Pool Pattern
 * 
 * Tests for the Pool Pattern - a fundamental pattern in GoodScript that allows
 * self-referential data structures while maintaining DAG ownership properties.
 * 
 * Pattern: Central ownership (Unique<T>[]) + Weak references for structure
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
          nodes: Unique<Node>[] = [];
          head: Weak<Node> = null;
        }
        
        class Node {
          next: Weak<Node> = null;
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept doubly-linked list with Pool Pattern', () => {
      const source = `
        class DoublyLinkedList {
          nodes: Unique<ListNode>[] = [];
          head: Weak<ListNode> = null;
          tail: Weak<ListNode> = null;
        }
        
        class ListNode {
          next: Weak<ListNode> = null;
          prev: Weak<ListNode> = null;
          data: string = '';
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept binary tree with Pool Pattern', () => {
      const source = `
        class BinaryTree {
          nodes: Unique<TreeNode>[] = [];
          root: Weak<TreeNode> = null;
        }
        
        class TreeNode {
          left: Weak<TreeNode> = null;
          right: Weak<TreeNode> = null;
          parent: Weak<TreeNode> = null;
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept general tree with children array', () => {
      const source = `
        class Tree {
          nodes: Unique<TreeNode>[] = [];
          root: Weak<TreeNode> = null;
        }
        
        class TreeNode {
          children: Weak<TreeNode>[] = [];
          parent: Weak<TreeNode> = null;
          value: string = '';
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept graph with Pool Pattern', () => {
      const source = `
        class Graph {
          nodes: Unique<GraphNode>[] = [];
        }
        
        class GraphNode {
          edges: Weak<GraphNode>[] = [];
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
          nodes: Unique<SkipNode>[] = [];
          head: Weak<SkipNode> = null;
        }
        
        class SkipNode {
          next: Weak<SkipNode>[] = [];
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept adjacency list graph with Map', () => {
      const source = `
        class Graph {
          nodes: Unique<GraphNode>[] = [];
          adjacency: Map<string, Weak<GraphNode>[]> = new Map();
        }
        
        class GraphNode {
          neighbors: Set<Weak<GraphNode>> = new Set();
          id: string = '';
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept tree with metadata and weak back-references', () => {
      const source = `
        class DocumentTree {
          nodes: Unique<DocumentNode>[] = [];
          root: Weak<DocumentNode> = null;
          index: Map<string, Weak<DocumentNode>> = new Map();
        }
        
        class DocumentNode {
          children: Weak<DocumentNode>[] = [];
          parent: Weak<DocumentNode> = null;
          nextSibling: Weak<DocumentNode> = null;
          prevSibling: Weak<DocumentNode> = null;
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
          nodes: Unique<SceneNode>[] = [];
          root: Weak<SceneNode> = null;
        }
        
        class SceneNode {
          children: Weak<SceneNode>[] = [];
          parent: Weak<SceneNode> = null;
          transform: Transform = new Transform();
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
          next: Shared<Node> | null = null;
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should reject tree without pool (Shared ownership)', () => {
      const source = `
        class TreeNode {
          left: Shared<TreeNode> | null = null;
          right: Shared<TreeNode> | null = null;
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should reject graph without pool (Shared ownership)', () => {
      const source = `
        class GraphNode {
          edges: Shared<GraphNode>[] = [];
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
          treePool: Unique<TreeNode>[] = [];
          listPool: Unique<ListNode>[] = [];
        }
        
        class TreeNode {
          children: Weak<TreeNode>[] = [];
          parent: Weak<TreeNode> = null;
        }
        
        class ListNode {
          next: Weak<ListNode> = null;
          prev: Weak<ListNode> = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept pool with Shared cross-references to other types', () => {
      const source = `
        class DocumentManager {
          nodes: Unique<DocumentNode>[] = [];
          metadata: Shared<Metadata> | null = null;
        }
        
        class DocumentNode {
          children: Weak<DocumentNode>[] = [];
          parent: Weak<DocumentNode> = null;
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
          forests: Unique<Forest>[] = [];
        }
        
        class Forest {
          trees: Unique<Tree>[] = [];
        }
        
        class Tree {
          nodes: Unique<TreeNode>[] = [];
          root: Weak<TreeNode> = null;
        }
        
        class TreeNode {
          children: Weak<TreeNode>[] = [];
          parent: Weak<TreeNode> = null;
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
          items: Unique<T>[] = [];
        }
        
        class Node {
          next: Weak<Node> = null;
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
          nodes: Unique<TreeNode<T>>[] = [];
          root: Weak<TreeNode<T>> = null;
        }
        
        class TreeNode<T> {
          children: Weak<TreeNode<T>>[] = [];
          parent: Weak<TreeNode<T>> = null;
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
          nodes: Unique<Node>[] = [];
          
          clear(): void {
            this.nodes = [];
          }
        }
        
        class Node {
          next: Weak<Node> = null;
          data: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept arena with multiple node types', () => {
      const source = `
        class RenderArena {
          vertices: Unique<Vertex>[] = [];
          edges: Unique<Edge>[] = [];
          
          clear(): void {
            this.vertices = [];
            this.edges = [];
          }
        }
        
        class Vertex {
          edges: Weak<Edge>[] = [];
          position: number[] = [];
        }
        
        class Edge {
          from: Weak<Vertex> = null;
          to: Weak<Vertex> = null;
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
          nodes: Unique<Element>[] = [];
          root: Weak<Element> = null;
          
          getElementById(id: string): Weak<Element> {
            return null;
          }
        }
        
        class Element {
          children: Weak<Element>[] = [];
          parent: Weak<Element> = null;
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
          entities: Unique<Entity>[] = [];
          components: Unique<Component>[] = [];
        }
        
        class Entity {
          components: Weak<Component>[] = [];
          id: string = '';
        }
        
        class Component {
          owner: Weak<Entity> = null;
          type: string = '';
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept AST with symbol table', () => {
      const source = `
        class AST {
          nodes: Unique<ASTNode>[] = [];
          symbols: Map<string, Weak<ASTNode>> = new Map();
          root: Weak<ASTNode> = null;
        }
        
        class ASTNode {
          children: Weak<ASTNode>[] = [];
          parent: Weak<ASTNode> = null;
          type: string = '';
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept file system tree', () => {
      const source = `
        class FileSystem {
          nodes: Unique<FileNode>[] = [];
          root: Weak<FileNode> = null;
          index: Map<string, Weak<FileNode>> = new Map();
        }
        
        class FileNode {
          children: Weak<FileNode>[] = [];
          parent: Weak<FileNode> = null;
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
          nodes: Unique<Node>[] = [];
        }
        
        class Node {
          next: Weak<Node> = null;
          prev: Weak<Node> = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept pool with Set of weak references', () => {
      const source = `
        class Pool {
          nodes: Unique<Node>[] = [];
        }
        
        class Node {
          connections: Set<Weak<Node>> = new Set();
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept pool with Map of weak references', () => {
      const source = `
        class Pool {
          nodes: Unique<Node>[] = [];
        }
        
        class Node {
          neighbors: Map<string, Weak<Node>> = new Map();
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept empty pool (no weak references needed)', () => {
      const source = `
        class Pool {
          items: Unique<Item>[] = [];
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
