/**
 * Tests for ownership derivation rules (GS305)
 * 
 * Rules:
 * 1. From Unique<T> can only derive Weak<T> (no Shared<T>)
 * 2. From Shared<T> can derive Shared<T> or Weak<T>
 * 3. From Weak<T> can only derive Weak<T> (no promotion to owning references)
 */

import { describe, it, expect } from 'vitest';
import { compileSource, getErrors } from '../phase1/test-helpers';

describe('Ownership Derivation Rules (GS305)', () => {
  describe('Rule 1: Unique<T> can only derive Weak<T>', () => {
    it('should reject Unique<T> → Shared<T>', () => {
      const source = `
        class Data { value: number = 0; }
        
        class Container {
          unique: Unique<Data> = null!;
          shared: Shared<Data> = null!;
          
          test(): void {
            this.shared = this.unique;  // Error: cannot convert Unique to Shared
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('Unique');
      expect(errors[0].message).toContain('Shared');
    });

    it('should allow Unique<T> → Weak<T>', () => {
      const source = `
        class Data { value: number = 0; }
        
        class Container {
          unique: Unique<Data> = null!;
          weak: Weak<Data> = null;
          
          test(): void {
            this.weak = this.unique;  // OK: Unique can derive Weak
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBe(0);
    });

    it('should reject new T() → Shared<T>', () => {
      const source = `
        class Data { value: number = 0; }
        
        class Container {
          shared: Shared<Data> = null!;
          
          test(): void {
            this.shared = new Data();  // Error: new T() is Unique<T>
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('new Data()');
      expect(errors[0].message).toContain('Unique');
    });

    it('should reject new T() → Weak<T>', () => {
      const source = `
        class Data { value: number = 0; }
        
        class Container {
          weak: Weak<Data> = null;
          
          test(): void {
            this.weak = new Data();  // Error: new T() is Unique<T>
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should allow new T() → Unique<T>', () => {
      const source = `
        class Data { value: number = 0; }
        
        class Container {
          unique: Unique<Data> = null!;
          
          test(): void {
            this.unique = new Data();  // OK: new T() creates Unique<T>
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBe(0);
    });
  });

  describe('Rule 2: Shared<T> can derive Shared<T> or Weak<T>', () => {
    it('should allow Shared<T> → Shared<T>', () => {
      const source = `
        class Data { value: number = 0; }
        
        class Container {
          shared1: Shared<Data> = null!;
          shared2: Shared<Data> = null!;
          
          test(): void {
            this.shared2 = this.shared1;  // OK: Shared can clone
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBe(0);
    });

    it('should allow Shared<T> → Weak<T>', () => {
      const source = `
        class Data { value: number = 0; }
        
        class Container {
          shared: Shared<Data> = null!;
          weak: Weak<Data> = null;
          
          test(): void {
            this.weak = this.shared;  // OK: Shared can derive Weak
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBe(0);
    });

    it('should reject Shared<T> → Unique<T>', () => {
      const source = `
        class Data { value: number = 0; }
        
        class Container {
          shared: Shared<Data> = null!;
          unique: Unique<Data> = null!;
          
          test(): void {
            this.unique = this.shared;  // Error: cannot convert Shared to Unique
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('Shared');
      expect(errors[0].message).toContain('Unique');
    });
  });

  describe('Rule 3: Weak<T> can only derive Weak<T>', () => {
    it('should allow Weak<T> → Weak<T>', () => {
      const source = `
        class Data { value: number = 0; }
        
        class Container {
          weak1: Weak<Data> = null;
          weak2: Weak<Data> = null;
          
          test(): void {
            this.weak2 = this.weak1;  // OK: Weak can copy
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBe(0);
    });

    it('should reject Weak<T> → Unique<T>', () => {
      const source = `
        class Data { value: number = 0; }
        
        class Container {
          weak: Weak<Data> = null;
          unique: Unique<Data> = null!;
          
          test(): void {
            this.unique = this.weak;  // Error: cannot promote Weak to Unique
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('Weak');
      expect(errors[0].message).toContain('cannot be promoted');
    });

    it('should reject Weak<T> → Shared<T>', () => {
      const source = `
        class Data { value: number = 0; }
        
        class Container {
          weak: Weak<Data> = null;
          shared: Shared<Data> = null!;
          
          test(): void {
            this.shared = this.weak;  // Error: cannot promote Weak to Shared
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('Weak');
      expect(errors[0].message).toContain('cannot be promoted');
    });
  });

  describe('Null assignments', () => {
    it('should allow null → any ownership type', () => {
      const source = `
        class Data { value: number = 0; }
        
        class Container {
          unique: Unique<Data> = null!;
          shared: Shared<Data> = null!;
          weak: Weak<Data> = null;
          
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
          unique: Unique<Node> = null!;
          shared: Shared<Node> = null!;
          
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
          subject: Weak<Subject> = null;  // Observer doesn't own subject
          
          setSubject(s: Unique<Subject>): void {
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
    it('should reject Unique<T> → Shared<T> in function call', () => {
      const source = `
        class Data { value: number = 0; }
        
        const takeShared = (data: Shared<Data>): void => { };
        
        class Container {
          unique: Unique<Data> = null!;
          
          test(): void {
            takeShared(this.unique);  // Error: cannot pass Unique to Shared param
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('Unique');
      expect(errors[0].message).toContain('Shared');
    });

    it('should allow Unique<T> → Weak<T> in function call', () => {
      const source = `
        class Data { value: number = 0; }
        
        const takeWeak = (data: Weak<Data>): void => { };
        
        class Container {
          unique: Unique<Data> = null!;
          
          test(): void {
            takeWeak(this.unique);  // OK: Unique can derive Weak
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBe(0);
    });

    it('should reject new T() → Shared<T> in function call', () => {
      const source = `
        class Data { value: number = 0; }
        
        const takeShared = (data: Shared<Data>): void => { };
        
        const test = (): void => {
          takeShared(new Data());  // Error: new T() is Unique<T>
        };
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject Weak<T> → Unique<T> in function call', () => {
      const source = `
        class Data { value: number = 0; }
        
        const takeUnique = (data: Unique<Data>): void => { };
        
        class Container {
          weak: Weak<Data> = null;
          
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
      expect(errors[0].message).toContain('Weak');
      expect(errors[0].message).toContain('cannot be promoted');
    });

    it('should validate array push with ownership types (user methods)', () => {
      const source = `
        class Node { value: number = 0; }
        
        class Arena {
          nodes: Shared<Node>[] = [];
          
          add(node: Shared<Node>): void {
            this.nodes.push(node);  // OK: Shared→Shared
          }
          
          addWrong(): void {
            const unique: Unique<Node> = null!;
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
          cache: Map<string, Shared<Node>> = new Map();
          unique: Unique<Node> = null!;
          shared: Shared<Node> = null!;
          
          addShared(): void {
            this.set("key", this.shared);  // OK: Shared→Shared
          }
          
          addUnique(): void {
            this.set("key", this.unique);  // Error: Unique→Shared
          }
          
          set(key: string, value: Shared<Node>): void {
            this.cache.set(key, value);
          }
        }
      `;
      
      const result = compileSource(source, 'dag');
      const errors = getErrors(result.diagnostics, 'GS305');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should allow Shared<T> → Shared<T> in method call', () => {
      const source = `
        class Data { value: number = 0; }
        
        class Container {
          shared: Shared<Data> = null!;
          
          process(data: Shared<Data>): void { }
          
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
