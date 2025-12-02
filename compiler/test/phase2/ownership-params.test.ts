/**
 * Tests for GS303: Naked class references in function parameters
 */

import { describe, it, expect } from 'vitest';
import { compileWithOwnership } from './test-helpers';
import { Diagnostic } from '../../src/types';

describe('Ownership Parameter Validation', () => {
  it('should allow unqualified class parameters (implicitly share<T>)', () => {
    const source = `
      class Data {
        value: number = 0;
      }
      
      class Handler {
        process(d: Data): void {  // OK: implicitly share<Data>
          console.log(d.value);
        }
      }
    `;
    
    const result = compileWithOwnership(source);
    const errors = result.diagnostics.filter((d: Diagnostic) => d.code === 'GS303');
    
    // Unqualified parameters are implicitly share<T> (shared ownership)
    expect(errors.length).toBe(0);
  });

  it('should accept own<T> parameters', () => {
    const source = `
      class Data {
        value: number = 0;
      }
      
      class Handler {
        process(d: own<Data>): void {
          console.log(d.value);
        }
      }
    `;
    
    const result = compileWithOwnership(source);
    const gs303Errors = result.diagnostics.filter((d: Diagnostic) => d.code === 'GS303');
    
    expect(gs303Errors).toHaveLength(0);
  });

  it('should accept share<T> parameters', () => {
    const source = `
      class Data {
        value: number = 0;
      }
      
      class Handler {
        process(d: share<Data>): void {
          console.log(d.value);
        }
      }
    `;
    
    const result = compileWithOwnership(source);
    const gs303Errors = result.diagnostics.filter((d: Diagnostic) => d.code === 'GS303');
    
    expect(gs303Errors).toHaveLength(0);
  });

  it('should accept use<T> parameters', () => {
    const source = `
      class Data {
        value: number = 0;
      }
      
      class Handler {
        process(d: use<Data>): void {
          if (d !== null) {
            console.log(d.value);
          }
        }
      }
    `;
    
    const result = compileWithOwnership(source);
    const gs303Errors = result.diagnostics.filter((d: Diagnostic) => d.code === 'GS303');
    
    expect(gs303Errors).toHaveLength(0);
  });

  it('should accept primitive parameters', () => {
    const source = `
      class Handler {
        process(n: number, s: string, b: boolean): void {
          console.log(n, s, b);
        }
      }
    `;
    
    const result = compileWithOwnership(source);
    const gs303Errors = result.diagnostics.filter((d: Diagnostic) => d.code === 'GS303');
    
    expect(gs303Errors).toHaveLength(0);
  });

  it('should accept interface parameters (no ownership needed)', () => {
    const source = `
      interface IData {
        value: number;
      }
      
      class Handler {
        process(d: IData): void {
          console.log(d.value);
        }
      }
    `;
    
    const result = compileWithOwnership(source);
    const gs303Errors = result.diagnostics.filter((d: Diagnostic) => d.code === 'GS303');
    
    expect(gs303Errors).toHaveLength(0);
  });
});
