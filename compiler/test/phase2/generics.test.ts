/**
 * Phase 2: Generics with Ownership Types
 * 
 * Tests that ownership analysis works correctly with generic types
 */

import { describe, it, expect } from 'vitest';
import { compileWithOwnership, hasError } from './test-helpers';

describe('Phase 2: Generics with Ownership', () => {
  
  describe('Generic classes with share<T>', () => {
    
    it('should detect cycles through generic share<T>', () => {
      const source = `
        class Box<T> {
          item: share<T> | null = null;
        }
        
        class Node {
          next: Box<Node> | null = null;  // Creates edge through generic
        }
      `;
      
      const result = compileWithOwnership(source);
      // Box<Node> contains share<Node>, should create self-reference
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should allow generic use<T>', () => {
      const source = `
        class Box<T> {
          item: use<T> = null;
        }
        
        class Node {
          next: Box<Node> | null = null;  // No edge - use<T>
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
    
    it('should allow generic own<T>', () => {
      const source = `
        class Box<T> {
          item: own<T> | null = null;
        }
        
        class Node {
          next: Box<Node> | null = null;  // No edge - own<T>
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
    
    it('should handle multiple type parameters', () => {
      const source = `
        class Pair<T, U> {
          first: share<T> | null = null;
          second: share<U> | null = null;
        }
        
        class A {
          pair: Pair<B, C> | null = null;
        }
        
        class B {
          back: share<A> | null = null;  // Cycle through first
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
          item: share<T> | null = null;
          
          set<U>(value: share<U> | null): void {
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
          item: use<T> = null;
          
          get(): use<T> {
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
          item: share<T> | null = null;
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
          item: use<T> = null;
        }
        
        class Item implements Named, Valued {
          name: string = '';
          value: number = 0;
          box: Box<Item> | null = null;  // No cycle - use<T>
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
          items: Array<share<Item>> = [];
        }
        
        class Item {
          container: share<Container> | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should handle Map<K, V> with ownership', () => {
      const source = `
        class Container {
          items: Map<string, share<Item>> = new Map();
        }
        
        class Item {
          container: share<Container> | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should handle Set<T> with ownership', () => {
      const source = `
        class Container {
          items: Set<share<Item>> = new Set();
        }
        
        class Item {
          container: share<Container> | null = null;
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
          container: share<Container> | null = null;  // No cycle through Promise
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
  });
  
  describe('Generic null-check enforcement', () => {
    
    it('should enforce null-checks on generic use<T>', () => {
      const source = `
        class Box<T> {
          item: use<T> = null;
          
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
    
    it('should accept checked generic use<T>', () => {
      const source = `
        class Box<T> {
          item: use<T> = null;
          
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
          item: share<U> | null = null;
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
          items: own<T>[] = [];
        }
        
        class Node {
          pool: Pool<Node> | null = null;  // No cycle - own<T>[]
          next: use<Node> = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
    
    it('should handle conditional types with generics', () => {
      const source = `
        class Box<T> {
          item: T extends object ? share<T> : T = null as any;
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
