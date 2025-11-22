/**
 * Tests for GS303: Naked class references in function parameters
 */

import { describe, it, expect } from 'vitest';
import { compileWithOwnership } from './test-helpers';
import { Diagnostic } from '../../src/types';

describe('Ownership Parameter Validation', () => {
  it('should reject naked class parameters', () => {
    const source = `
      class Data {
        value: number = 0;
      }
      
      class Handler {
        process(d: Data): void {  // ERROR: naked class parameter
          console.log(d.value);
        }
      }
    `;
    
    const result = compileWithOwnership(source);
    const errors = result.diagnostics.filter((d: Diagnostic) => d.code === 'GS303');
    
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain("Parameter 'd'");
    expect(errors[0].message).toContain('Data');
  });

  it('should accept Unique<T> parameters', () => {
    const source = `
      class Data {
        value: number = 0;
      }
      
      class Handler {
        process(d: Unique<Data>): void {
          console.log(d.value);
        }
      }
    `;
    
    const result = compileWithOwnership(source);
    const gs303Errors = result.diagnostics.filter((d: Diagnostic) => d.code === 'GS303');
    
    expect(gs303Errors).toHaveLength(0);
  });

  it('should accept Shared<T> parameters', () => {
    const source = `
      class Data {
        value: number = 0;
      }
      
      class Handler {
        process(d: Shared<Data>): void {
          console.log(d.value);
        }
      }
    `;
    
    const result = compileWithOwnership(source);
    const gs303Errors = result.diagnostics.filter((d: Diagnostic) => d.code === 'GS303');
    
    expect(gs303Errors).toHaveLength(0);
  });

  it('should accept Weak<T> parameters', () => {
    const source = `
      class Data {
        value: number = 0;
      }
      
      class Handler {
        process(d: Weak<Data>): void {
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
