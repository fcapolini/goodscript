/**
 * Phase 2 Tests: Wrong Ownership Choice Consequences
 * 
 * Demonstrates what happens when developers choose the wrong ownership type
 */

import { describe, it, expect } from 'vitest';
import { compileWithOwnership, hasError, getErrors } from './test-helpers';

describe('Phase 2: Wrong Ownership Choices', () => {
  
  describe('Choosing Shared<T> for circular references', () => {
    
    it('should error with GS301 for doubly-linked list using Shared<T>', () => {
      const source = `
        class Node {
          prev: Shared<Node> | null = null;
          next: Shared<Node> | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      
      // GS303: No naked class references (good!)
      expect(hasError(result.diagnostics, 'GS303')).toBe(false);
      
      // GS301: Ownership cycle detected (catches the mistake!)
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
      
      const errors = getErrors(result.diagnostics, 'GS301');
      expect(errors[0].message).toContain('Ownership cycle detected');
      expect(errors[0].message).toContain('Pool Pattern');
    });
    
    it('should error with GS301 for parent-child using Shared<T> both ways', () => {
      const source = `
        class Parent {
          child: Shared<Child> | null = null;
        }
        
        class Child {
          parent: Shared<Parent> | null = null;  // Wrong! Should be Weak
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
      
      const errors = getErrors(result.diagnostics, 'GS301');
      expect(errors[0].message).toContain('cannot own each other');
      expect(errors[0].message).toContain('Use Weak<T>');
    });
  });
  
  describe('Choosing Unique<T> for shared references', () => {
    
    it('should compile but lose sharing semantics', () => {
      // This compiles but may not behave as expected in practice
      const source = `
        class Cache {
          data: Unique<Data> | null = null;  // Can't share!
        }
        
        class Data {
          value: string = '';
        }
      `;
      
      const result = compileWithOwnership(source);
      
      // No ownership errors
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
      expect(hasError(result.diagnostics, 'GS303')).toBe(false);
      
      // But this means each Cache instance would need its own Data
      // Moving/copying becomes restrictive
    });
  });
  
  describe('Forgetting Weak<T> for back-references', () => {
    
    it('should error when tree parent uses Shared<T> instead of Weak<T>', () => {
      const source = `
        class TreeNode {
          children: Shared<TreeNode>[] = [];
          parent: Shared<TreeNode> | null = null;  // Wrong! Creates cycle
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
      
      const errors = getErrors(result.diagnostics, 'GS301');
      expect(errors[0].message).toContain('Ownership cycle');
    });
    
    it('should succeed when using Weak<T> for parent', () => {
      const source = `
        class TreeNode {
          children: Shared<TreeNode>[] = [];
          parent: Weak<TreeNode> = null;  // Correct! Breaks cycle
        }
      `;
      
      const result = compileWithOwnership(source);
      // Still has GS301 because children own parent (cycle)
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should succeed with proper tree structure', () => {
      const source = `
        class Tree {
          root: Unique<TreeNode> | null = null;  // Tree owns root
        }
        
        class TreeNode {
          children: Unique<TreeNode>[] = [];  // Parent owns children
          parent: Weak<TreeNode> = null;      // Child doesn't own parent
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
      expect(hasError(result.diagnostics, 'GS303')).toBe(false);
    });
  });
  
  describe('Pool Pattern - the escape hatch', () => {
    
    it('should work when using Pool Pattern correctly', () => {
      const source = `
        // The pool owns all nodes with Unique<T>
        class NodePool {
          nodes: Unique<Node>[] = [];
        }
        
        // Nodes reference each other with Weak<T>
        class Node {
          prev: Weak<Node> = null;
          next: Weak<Node> = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
      expect(hasError(result.diagnostics, 'GS302')).toBe(false);  // Weak refs need null checks
      expect(hasError(result.diagnostics, 'GS303')).toBe(false);
    });
  });
  
  describe('Real consequences in generated code', () => {
    
    it('demonstrates the issue: Shared<T> cycle would leak in native target', () => {
      // This is what developers might try:
      const source = `
        class LRUCache {
          head: Shared<Node> | null = null;
          tail: Shared<Node> | null = null;
        }
        
        class Node {
          prev: Shared<Node> | null = null;  // Creates reference cycle
          next: Shared<Node> | null = null;  // These Rc references form a cycle
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      
      // Compiler catches this!
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
      
      // In native target, this would compile but leak memory:
      // - Each Node is Rc<Node>
      // - prev/next create circular Rc references
      // - Reference count never reaches zero
      // - Memory leak!
      
      // GoodScript prevents this at compile time
    });
    
    it('shows the correct solution using Pool Pattern', () => {
      const source = `
        class LRUCache {
          nodes: Unique<Node>[] = [];      // Arena owns all nodes
          head: Weak<Node> = null;          // Just a reference
          tail: Weak<Node> = null;          // Just a reference
        }
        
        class Node {
          prev: Weak<Node> = null;          // Non-owning references
          next: Weak<Node> = null;          // Can't form reference cycle
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      
      // No ownership errors!
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
      expect(hasError(result.diagnostics, 'GS303')).toBe(false);
    });
  });
});
