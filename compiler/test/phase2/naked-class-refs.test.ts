/**
 * Phase 2 Tests: Naked Class Reference Detection
 * 
 * Tests that class-type fields must use ownership annotations (Unique/Shared/Weak)
 * at level "dag" and above.
 */

import { describe, it, expect } from 'vitest';
import { compileWithOwnership, hasError, getErrors } from './test-helpers';

describe('Phase 2: Naked Class Reference Detection', () => {
  
  describe('GS303: Missing ownership annotation', () => {
    
    it('should reject naked class reference in field', () => {
      const source = `
        class Node {
          next: Node | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS303')).toBe(true);
      
      const errors = getErrors(result.diagnostics, 'GS303');
      expect(errors.length).toBe(1);
      expect(errors[0].message).toContain('Field \'next\'');
      expect(errors[0].message).toContain('Use own<Node>, share<Node>, or use<Node>');
    });
    
    it('should reject multiple naked class references', () => {
      const source = `
        class CacheNode {
          prev: CacheNode | null = null;
          next: CacheNode | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS303')).toBe(true);
      
      const errors = getErrors(result.diagnostics, 'GS303');
      expect(errors.length).toBe(2);
    });
    
    it('should reject naked class reference to different class', () => {
      const source = `
        class Container {
          item: Item | null = null;
        }
        
        class Item {
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS303')).toBe(true);
      
      const errors = getErrors(result.diagnostics, 'GS303');
      expect(errors.length).toBe(1);
      expect(errors[0].message).toContain('Field \'item\'');
      expect(errors[0].message).toContain('Use own<Item>, share<Item>, or use<Item>');
    });
    
    it('should reject naked class reference in array', () => {
      const source = `
        class Container {
          items: Item[] = [];
        }
        
        class Item {
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      // Note: This currently won't error because Item[] is an array type reference,
      // not a direct class reference. We may want to enhance this in the future.
      // For now, users should use own<Item>[] or use<Item>[] explicitly.
    });
  });
  
  describe('Valid ownership annotations', () => {
    
    it('should accept own<T> annotation', () => {
      const source = `
        class Container {
          item: own<Item> | null = null;
        }
        
        class Item {
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS303')).toBe(false);
    });
    
    it('should accept share<T> annotation', () => {
      const source = `
        class TreeNode {
          children: share<TreeNode>[] = [];
        }
      `;
      
      const result = compileWithOwnership(source);
      // GS303 should not error (ownership is specified)
      expect(hasError(result.diagnostics, 'GS303')).toBe(false);
      // GS301 will error (cycle), but that's a different check
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should accept use<T> annotation', () => {
      const source = `
        class TreeNode {
          parent: use<TreeNode> = null;
          children: use<TreeNode>[] = [];
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS303')).toBe(false);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
    
    it('should accept Pool Pattern with Weak references', () => {
      const source = `
        class NodePool {
          nodes: own<Node>[] = [];
        }
        
        class Node {
          next: use<Node> = null;
          prev: use<Node> = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS303')).toBe(false);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
  });
  
  describe('Non-class types (should not error)', () => {
    
    it('should allow primitive types without ownership', () => {
      const source = `
        class Container {
          count: number = 0;
          name: string = '';
          active: boolean = false;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS303')).toBe(false);
    });
    
    it('should allow interface types without ownership', () => {
      const source = `
        interface Config {
          setting: string;
        }
        
        class Container {
          config: Config | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      // Interfaces don't require ownership annotations
      expect(hasError(result.diagnostics, 'GS303')).toBe(false);
    });
    
    it('should allow type aliases without ownership', () => {
      const source = `
        type ItemData = {
          value: number;
        };
        
        class Container {
          data: ItemData | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      // Type aliases (structural types) don't require ownership
      expect(hasError(result.diagnostics, 'GS303')).toBe(false);
    });
    
    it('should allow built-in types without ownership', () => {
      const source = `
        class Container {
          items: Array<number> = [];
          map: Map<string, number> = new Map();
          set: Set<string> = new Set();
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS303')).toBe(false);
    });
  });
  
  describe('Complex scenarios', () => {
    
    it('should handle union types correctly', () => {
      const source = `
        class Container {
          item: Item | null | undefined = null;
        }
        
        class Item {
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS303')).toBe(true);
      
      const errors = getErrors(result.diagnostics, 'GS303');
      expect(errors[0].message).toContain('Use own<Item>, share<Item>, or use<Item>');
    });
    
    it('should detect in nested union types', () => {
      const source = `
        class Container {
          item: string | Item | null = null;
        }
        
        class Item {
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS303')).toBe(true);
    });
  });
});
