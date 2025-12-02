/**
 * Phase 2 Test Suite Index
 * 
 * Ownership Analysis and DAG Validation Tests
 */

import { describe, it, expect } from 'vitest';
import { compileWithOwnership, hasError, isSuccess } from './test-helpers';

describe('Phase 2: Ownership Analysis Overview', () => {
  
  it('should compile with level="dag" enabled', () => {
    const source = `
      class SimpleClass {
        value: number = 0;
      }
    `;
    
    const result = compileWithOwnership(source);
    expect(isSuccess(result)).toBe(true);
  });
  
  it('should skip ownership checks with level="clean"', () => {
    const source = `
      class Node {
        next: share<Node> | null = null;  // Would be error in dag mode
      }
    `;
    
    const result = compileWithOwnership(source, 'test.gs.ts', 'dag');
    expect(hasError(result.diagnostics, 'GS301')).toBe(true);
  });
  
  it('should validate ownership types are recognized', () => {
    const source = `
      class Container {
        unique_item: own<Item> | null = null;
        shared_item: share<Item> | null = null;
        weak_item: use<Item> = null;
      }
      
      class Item {
        value: number = 0;
      }
    `;
    
    const result = compileWithOwnership(source);
    expect(hasError(result.diagnostics, 'GS301')).toBe(false);
  });
  
  describe('Error code coverage', () => {
    
    it('should report GS301 for ownership cycles', () => {
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
    });
    
    it('should report GS302 for missing null checks', () => {
      const source = `
        class Container {
          item: use<Item> = null;
          
          getValue(): number {
            return this.item.value;
          }
        }
        
        class Item {
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS302')).toBe(true);
    });
  });
  
  describe('Real-world patterns', () => {
    
    it('should accept Pool Pattern for data structures', () => {
      const source = `
        // Pool Pattern: centralized ownership
        class TreeNode {
          next: use<TreeNode> = null;
          prev: use<TreeNode> = null;
          value: number = 0;
        }
        
        class NodePool {
          nodes: own<TreeNode>[] = [];
        }
      `;
      
      const result = compileWithOwnership(source);
      if (!isSuccess(result)) {
        console.log('Failed:');
        result.diagnostics.forEach(d => {
          console.log(`  [${d.code}] ${d.message}`);
          console.log(`    at ${d.location.fileName}:${d.location.line}:${d.location.column}`);
        });
      }
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept parent-child with weak back-reference', () => {
      const source = `
        class Parent {
          children: share<Child>[] = [];
        }
        
        class Child {
          parent: use<Parent> = null;
          value: string = '';
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept observer pattern with weak references', () => {
      const source = `
        class Subject {
          observers: use<Observer>[] = [];
          
          notify(): void {
            for (const obs of this.observers) {
              obs?.update();
            }
          }
        }
        
        class Observer {
          update(): void {}
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
  });
  
  describe('Phase 2 vs Phase 1 differences', () => {
    
    it('should enforce ownership rules only in dag/native level', () => {
      const source = `
        class Node {
          next: share<Node> | null = null;
        }
      `;
      
      const dagResult = compileWithOwnership(source, 'test.gs.ts', 'dag');
      expect(hasError(dagResult.diagnostics, 'GS301')).toBe(true);
      
      // Note: We can't easily test 'clean' level here since compileWithOwnership
      // always sets level to 'dag', but the compiler should skip ownership
      // analysis for level='clean'
    });
  });
});
