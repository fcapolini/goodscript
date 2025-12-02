/**
 * Tests for ownership derivation rules (GS305)
 * 
 * Rules:
 * 1. From own<T> can only derive use<T> (no share<T>)
 * 2. From share<T> can derive share<T> or use<T>
 * 3. From use<T> can only derive use<T> (no promotion to owning references)
 */

import { describe, it, expect } from 'vitest';
import { compileSource, getErrors } from '../phase1/test-helpers';

describe('Ownership Derivation Rules (GS305)', () => {
  describe('Rule 1: own<T> can only derive use<T>', () => {
    it('should reject own<T> → share<T>', () => {
      const source = `
        class Data { value: number = 0; }
        
        class Container {
          unique: own<Data> = null!;
          shared: share<Data> = null!;
          
          test(): void {
            this.shared = this.unique;  // Error: cannot convert Unique to Shared
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('own');
      expect(errors[0].message).toContain('share');
    });

    it('should allow own<T> → use<T>', () => {
      const source = `
        class Data { value: number = 0; }
        
        class Container {
          unique: own<Data> = null!;
          weak: use<Data> = null;
          
          test(): void {
            this.weak = this.unique;  // OK: Unique can derive Weak
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBe(0);
    });

    it('should reject new T() → share<T>', () => {
      const source = `
        class Data { value: number = 0; }
        
        class Container {
          shared: share<Data> = null!;
          
          test(): void {
            this.shared = new Data();  // Error: new T() is own<T>
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('new Data()');
      expect(errors[0].message).toContain('own');
    });

    it('should reject new T() → use<T>', () => {
      const source = `
        class Data { value: number = 0; }
        
        class Container {
          weak: use<Data> = null;
          
          test(): void {
            this.weak = new Data();  // Error: new T() is own<T>
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should allow new T() → own<T>', () => {
      const source = `
        class Data { value: number = 0; }
        
        class Container {
          unique: own<Data> = null!;
          
          test(): void {
            this.unique = new Data();  // OK: new T() creates own<T>
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBe(0);
    });
  });

  describe('Rule 2: share<T> can derive share<T> or use<T>', () => {
    it('should allow share<T> → share<T>', () => {
      const source = `
        class Data { value: number = 0; }
        
        class Container {
          shared1: share<Data> = null!;
          shared2: share<Data> = null!;
          
          test(): void {
            this.shared2 = this.shared1;  // OK: Shared can clone
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBe(0);
    });

    it('should allow share<T> → use<T>', () => {
      const source = `
        class Data { value: number = 0; }
        
        class Container {
          shared: share<Data> = null!;
          weak: use<Data> = null;
          
          test(): void {
            this.weak = this.shared;  // OK: Shared can derive Weak
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBe(0);
    });

    it('should reject share<T> → own<T>', () => {
      const source = `
        class Data { value: number = 0; }
        
        class Container {
          shared: share<Data> = null!;
          unique: own<Data> = null!;
          
          test(): void {
            this.unique = this.shared;  // Error: cannot convert Shared to Unique
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('share');
      expect(errors[0].message).toContain('own');
    });
  });

  describe('Rule 3: use<T> can only derive use<T>', () => {
    it('should allow use<T> → use<T>', () => {
      const source = `
        class Data { value: number = 0; }
        
        class Container {
          weak1: use<Data> = null;
          weak2: use<Data> = null;
          
          test(): void {
            this.weak2 = this.weak1;  // OK: Weak can copy
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBe(0);
    });

    it('should reject use<T> → own<T>', () => {
      const source = `
        class Data { value: number = 0; }
        
        class Container {
          weak: use<Data> = null;
          unique: own<Data> = null!;
          
          test(): void {
            this.unique = this.weak;  // Error: cannot promote Weak to Unique
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('use');
      expect(errors[0].message).toContain('cannot be promoted');
    });

    it('should reject use<T> → share<T>', () => {
      const source = `
        class Data { value: number = 0; }
        
        class Container {
          weak: use<Data> = null;
          shared: share<Data> = null!;
          
          test(): void {
            this.shared = this.weak;  // Error: cannot promote Weak to Shared
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('use');
      expect(errors[0].message).toContain('cannot be promoted');
    });
  });

  describe('Null assignments', () => {
    it('should allow null → any ownership type', () => {
      const source = `
        class Data { value: number = 0; }
        
        class Container {
          unique: own<Data> = null!;
          shared: share<Data> = null!;
          weak: use<Data> = null;
          
          clear(): void {
            this.unique = null!;
            this.shared = null!;
            this.weak = null;
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBe(0);
    });
  });

  describe('Complex scenarios', () => {
    it('should validate arena pattern correctly', () => {
      const source = `
        class Node { value: number = 0; }
        
        class Arena {
          unique: own<Node> = null!;
          shared: share<Node> = null!;
          
          add(): void {
            // Error: cannot assign Unique to Shared field
            this.shared = this.unique;
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate observer pattern correctly', () => {
      const source = `
        class Subject { state: number = 0; }
        
        class Observer {
          subject: use<Subject> = null;  // Observer doesn't own subject
          
          setSubject(s: own<Subject>): void {
            this.subject = s;  // OK: Unique can derive Weak
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBe(0);
    });
  });

  describe('Function call arguments', () => {
    it('should reject own<T> → share<T> in function call', () => {
      const source = `
        class Data { value: number = 0; }
        
        const takeShared = (data: share<Data>): void => { };
        
        class Container {
          unique: own<Data> = null!;
          
          test(): void {
            takeShared(this.unique);  // Error: cannot pass Unique to Shared param
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('own');
      expect(errors[0].message).toContain('share');
    });

    it('should allow own<T> → use<T> in function call', () => {
      const source = `
        class Data { value: number = 0; }
        
        const takeWeak = (data: use<Data>): void => { };
        
        class Container {
          unique: own<Data> = null!;
          
          test(): void {
            takeWeak(this.unique);  // OK: Unique can derive Weak
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBe(0);
    });

    it('should reject new T() → share<T> in function call', () => {
      const source = `
        class Data { value: number = 0; }
        
        const takeShared = (data: share<Data>): void => { };
        
        const test = (): void => {
          takeShared(new Data());  // Error: new T() is own<T>
        };
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject use<T> → own<T> in function call', () => {
      const source = `
        class Data { value: number = 0; }
        
        const takeUnique = (data: own<Data>): void => { };
        
        class Container {
          weak: use<Data> = null;
          
          test(): void {
            if (this.weak !== null && this.weak !== undefined) {
              takeUnique(this.weak);  // Error: cannot promote Weak to Unique
            }
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('use');
      expect(errors[0].message).toContain('cannot be promoted');
    });

    it('should validate array push with ownership types (user methods)', () => {
      const source = `
        class Node { value: number = 0; }
        
        class Arena {
          nodes: share<Node>[] = [];
          
          add(node: share<Node>): void {
            this.nodes.push(node);  // OK: Shared→Shared
          }
          
          addWrong(): void {
            const unique: own<Node> = null!;
            this.add(unique);  // Error: Unique→Shared in method call
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate Map.set with ownership types (user methods)', () => {
      const source = `
        class Node { value: number = 0; }
        
        class Cache {
          cache: Map<string, share<Node>> = new Map();
          unique: own<Node> = null!;
          shared: share<Node> = null!;
          
          addShared(): void {
            this.set("key", this.shared);  // OK: Shared→Shared
          }
          
          addUnique(): void {
            this.set("key", this.unique);  // Error: Unique→Shared
          }
          
          set(key: string, value: share<Node>): void {
            this.cache.set(key, value);
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should allow share<T> → share<T> in method call', () => {
      const source = `
        class Data { value: number = 0; }
        
        class Container {
          shared: share<Data> = null!;
          
          process(data: share<Data>): void { }
          
          test(): void {
            this.process(this.shared);  // OK: Shared→Shared
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBe(0);
    });
  });
});
