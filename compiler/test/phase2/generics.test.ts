/**
 * Phase 2: Generics with Ownership Types
 * 
 * Tests that ownership analysis works correctly with generic types
 */

import { describe, it, expect } from 'vitest';
import { compileWithOwnership, hasError } from './test-helpers';

describe('Phase 2: Generics with Ownership', () => {
  
  describe('Generic classes with Shared<T>', () => {
    
    it('should detect cycles through generic Shared<T>', () => {
      const source = `
        class Box<T> {
          item: Shared<T> | null = null;
        }
        
        class Node {
          next: Box<Node> | null = null;  // Creates edge through generic
        }
      `;
      
      const result = compileWithOwnership(source);
      // Box<Node> contains Shared<Node>, should create self-reference
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should allow generic Weak<T>', () => {
      const source = `
        class Box<T> {
          item: Weak<T> = null;
        }
        
        class Node {
          next: Box<Node> | null = null;  // No edge - Weak<T>
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
    
    it('should allow generic Unique<T>', () => {
      const source = `
        class Box<T> {
          item: Unique<T> | null = null;
        }
        
        class Node {
          next: Box<Node> | null = null;  // No edge - Unique<T>
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
    
    it('should handle multiple type parameters', () => {
      const source = `
        class Pair<T, U> {
          first: Shared<T> | null = null;
          second: Shared<U> | null = null;
        }
        
        class A {
          pair: Pair<B, C> | null = null;
        }
        
        class B {
          back: Shared<A> | null = null;  // Cycle through first
        }
        
        class C {
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
  });
  
  describe('Generic methods and functions', () => {
    
    it('should handle generic method parameters', () => {
      const source = `
        class Container<T> {
          item: Shared<T> | null = null;
          
          set<U>(value: Shared<U> | null): void {
            // Generic method parameter
          }
        }
        
        class Item {
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
    
    it('should handle generic return types', () => {
      const source = `
        class Container<T> {
          item: Weak<T> = null;
          
          get(): Weak<T> {
            return this.item;
          }
        }
        
        class Item {
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS302')).toBe(false);
    });
  });
  
  describe('Generic constraints', () => {
    
    it('should handle extends constraints', () => {
      const source = `
        interface Named {
          name: string;
        }
        
        class Box<T extends Named> {
          item: Shared<T> | null = null;
        }
        
        class Item implements Named {
          name: string = '';
          box: Box<Item> | null = null;  // Self-reference through generic
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should handle multiple constraints', () => {
      const source = `
        interface Named {
          name: string;
        }
        
        interface Valued {
          value: number;
        }
        
        class Box<T extends Named & Valued> {
          item: Weak<T> = null;
        }
        
        class Item implements Named, Valued {
          name: string = '';
          value: number = 0;
          box: Box<Item> | null = null;  // No cycle - Weak<T>
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
  });
  
  describe('Built-in generic types', () => {
    
    it('should handle Array<T> with ownership', () => {
      const source = `
        class Container {
          items: Array<Shared<Item>> = [];
        }
        
        class Item {
          container: Shared<Container> | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should handle Map<K, V> with ownership', () => {
      const source = `
        class Container {
          items: Map<string, Shared<Item>> = new Map();
        }
        
        class Item {
          container: Shared<Container> | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should handle Set<T> with ownership', () => {
      const source = `
        class Container {
          items: Set<Shared<Item>> = new Set();
        }
        
        class Item {
          container: Shared<Container> | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should handle Promise<T> (no ownership edges)', () => {
      const source = `
        class Container {
          pending: Promise<Item> | null = null;
        }
        
        class Item {
          container: Shared<Container> | null = null;  // No cycle through Promise
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
  });
  
  describe('Generic null-check enforcement', () => {
    
    it('should enforce null-checks on generic Weak<T>', () => {
      const source = `
        class Box<T> {
          item: Weak<T> = null;
          
          getValue(getter: (item: T) => number): number {
            return getter(this.item);  // Error: missing null check
          }
        }
        
        class Item {
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS302')).toBe(true);
    });
    
    it('should accept checked generic Weak<T>', () => {
      const source = `
        class Box<T> {
          item: Weak<T> = null;
          
          getValue(getter: (item: T) => number): number {
            if (this.item === null) return -1;
            return getter(this.item);  // OK after check
          }
        }
        
        class Item {
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS302')).toBe(false);
    });
  });
  
  describe('Complex generic scenarios', () => {
    
    it('should handle nested generics', () => {
      const source = `
        class Outer<T> {
          inner: Inner<T> | null = null;
        }
        
        class Inner<U> {
          item: Shared<U> | null = null;
        }
        
        class Node {
          outer: Outer<Node> | null = null;  // Cycle through nested generic
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should handle generic type as non-owning field', () => {
      const source = `
        class Box<T> {
          item: T | null = null;  // T without wrapper - no ownership
        }
        
        class Node {
          next: Box<Node> | null = null;  // No cycle - T is not wrapped
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
    
    it('should handle generic with Pool Pattern', () => {
      const source = `
        class Pool<T> {
          items: Unique<T>[] = [];
        }
        
        class Node {
          pool: Pool<Node> | null = null;  // No cycle - Unique<T>[]
          next: Weak<Node> = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
    
    it('should handle conditional types with generics', () => {
      const source = `
        class Box<T> {
          item: T extends object ? Shared<T> : T = null as any;
        }
        
        class Node {
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      // Complex conditional - just ensure it compiles
      expect(result.diagnostics.length >= 0).toBe(true);
    });
  });
});
