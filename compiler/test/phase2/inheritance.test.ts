/**
 * Phase 2: Inheritance with Ownership Types
 * 
 * Tests that ownership analysis works correctly with class inheritance
 */

import { describe, it, expect } from 'vitest';
import { compileWithOwnership, hasError } from './test-helpers';

describe('Phase 2: Inheritance with Ownership', () => {
  
  describe('Basic inheritance', () => {
    
    it('should detect cycles through inherited Shared<T> fields', () => {
      const source = `
        class Base {
          item: Shared<Item> | null = null;
        }
        
        class Container extends Base {
          // Inherits item field
        }
        
        class Item {
          container: Shared<Container> | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should allow inherited Weak<T> fields', () => {
      const source = `
        class Base {
          item: Weak<Item> = null;
        }
        
        class Container extends Base {
          // Inherits weak reference
        }
        
        class Item {
          container: Shared<Container> | null = null;  // No cycle
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
    
    it('should allow inherited Unique<T> fields', () => {
      const source = `
        class Base {
          item: Unique<Item> | null = null;
        }
        
        class Container extends Base {
          // Inherits unique ownership
        }
        
        class Item {
          container: Shared<Container> | null = null;  // No cycle
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
  });
  
  describe('Multi-level inheritance', () => {
    
    it('should track ownership through multiple inheritance levels', () => {
      const source = `
        class GrandParent {
          root: Shared<Root> | null = null;
        }
        
        class Parent extends GrandParent {
          // Inherits root field
        }
        
        class Child extends Parent {
          // Inherits root field through Parent
        }
        
        class Root {
          child: Shared<Child> | null = null;  // Cycle through inheritance
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should handle mixed ownership types in hierarchy', () => {
      const source = `
        class Base {
          shared: Shared<Item> | null = null;
        }
        
        class Derived extends Base {
          weak: Weak<Item> = null;
          unique: Unique<Item> | null = null;
        }
        
        class Item {
          derived: Shared<Derived> | null = null;  // Cycle through shared
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
  });
  
  describe('Abstract classes', () => {
    
    it('should handle abstract base classes', () => {
      const source = `
        abstract class Base {
          abstract item: Shared<Item> | null;
        }
        
        class Container extends Base {
          item: Shared<Item> | null = null;
        }
        
        class Item {
          container: Shared<Container> | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should handle abstract methods with ownership types', () => {
      const source = `
        abstract class Base {
          abstract getItem(): Weak<Item>;
        }
        
        class Container extends Base {
          item: Weak<Item> = null;
          
          getItem(): Weak<Item> {
            return this.item;
          }
        }
        
        class Item {
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
  });
  
  describe('Method overriding', () => {
    
    it('should allow ownership type covariance in return types', () => {
      const source = `
        class Base {
          getItem(): Weak<Item> {
            return null;
          }
        }
        
        class Derived extends Base {
          override getItem(): Weak<Item> {
            return null;
          }
        }
        
        class Item {
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
  });
  
  describe('Interface implementation', () => {
    
    it('should detect cycles through interface implementation', () => {
      const source = `
        interface IContainer {
          item: Shared<Item> | null;
        }
        
        class Container implements IContainer {
          item: Shared<Item> | null = null;
        }
        
        class Item {
          container: Shared<Container> | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should allow Weak<T> through interface', () => {
      const source = `
        interface IContainer {
          item: Weak<Item>;
        }
        
        class Container implements IContainer {
          item: Weak<Item> = null;
        }
        
        class Item {
          container: Shared<Container> | null = null;  // No cycle
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
    
    it('should handle multiple interface implementation', () => {
      const source = `
        interface IHasItem {
          item: Shared<Item> | null;
        }
        
        interface IHasValue {
          value: number;
        }
        
        class Container implements IHasItem, IHasValue {
          item: Shared<Item> | null = null;
          value: number = 0;
        }
        
        class Item {
          container: Shared<Container> | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
  });
  
  describe('Null-check enforcement with inheritance', () => {
    
    it('should require null-checks on inherited Weak<T> fields', () => {
      const source = `
        class Base {
          item: Weak<Item> = null;
        }
        
        class Derived extends Base {
          getValue(): number {
            return this.item.value;  // Error: inherited weak field not checked
          }
        }
        
        class Item {
          value: number = 0;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS302')).toBe(true);
    });
    
    it('should accept checked inherited Weak<T> fields', () => {
      const source = `
        class Base {
          item: Weak<Item> = null;
        }
        
        class Derived extends Base {
          getValue(): number {
            if (this.item === null) return -1;
            return this.item.value;  // OK after check
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
  
  describe('Complex inheritance scenarios', () => {
    
    it('should handle diamond inheritance pattern', () => {
      const source = `
        interface IBase {
          item: Shared<Item> | null;
        }
        
        interface ILeft extends IBase {
          left: number;
        }
        
        interface IRight extends IBase {
          right: number;
        }
        
        class Container implements ILeft, IRight {
          item: Shared<Item> | null = null;
          left: number = 0;
          right: number = 0;
        }
        
        class Item {
          container: Shared<Container> | null = null;
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(true);
    });
    
    it('should handle mixin pattern', () => {
      const source = `
        class Base {
          value: number = 0;
        }
        
        interface IHasItem {
          item: Weak<Item>;
        }
        
        class Container extends Base implements IHasItem {
          item: Weak<Item> = null;
        }
        
        class Item {
          container: Shared<Container> | null = null;  // No cycle
        }
      `;
      
      const result = compileWithOwnership(source);
      expect(hasError(result.diagnostics, 'GS301')).toBe(false);
    });
  });
});
