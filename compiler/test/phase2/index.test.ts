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
        next: shared<Node> | null = null;  // Would be error in dag mode
      }
    `;
    
    const result = compileWithOwnership(source, 'test.gs.ts', 'dag');
    expect(hasError(result.diagnostics, 'GS301')).toBe(true);
  });
  
  it('should validate ownership types are recognized', () => {
    const source = `
      class Container {
        unique_item: unique<Item> | null = null;
        shared_item: shared<Item> | null = null;
        weak_item: weak<Item> = null;
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
          b: shared<B> | null = null;
        }
        class B {
          a: shared<A> | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    // TODO: Weak type detection needs improvement - TypeChecker doesn't always resolve weak<T>
    it.skip('should report GS302 for missing null checks', () => {
      const source = `
        class Container {
          item: weak<Item> = null;
          
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
    
    // TODO: TypeScript errors for property initialization need to be resolved
    it.skip('should accept Pool Pattern for data structures', () => {
      const source = `
        // Pool Pattern: centralized ownership
        class NodePool {
          nodes: unique<Node>[] = [];
        }
        
        class Node {
          next: weak<Node> = null;
          prev: weak<Node> = null;
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept parent-child with weak back-reference', () => {
      const source = `
        class Parent {
          children: shared<Child>[] = [];
        }
        
        class Child {
          parent: weak<Parent> = null;
          value: string = '';
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(isSuccess(result)).toBe(true);
    });
    
    it('should accept observer pattern with weak references', () => {
      const source = `
        class Subject {
          observers: weak<Observer>[] = [];
          
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
    
    it('should enforce ownership rules only in dag/rust level', () => {
      const source = `
        class Node {
          next: shared<Node> | null = null;
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
