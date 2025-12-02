/**
 * Tests for ownership qualifiers on primitive value types
 * Numeric and boolean primitives (number, boolean) are stack-allocated and passed by value,
 * so they should NOT use ownership qualifiers.
 * 
 * Note: string is NOT a value type - it can use ownership qualifiers (e.g., share<string>
 * for string interning/deduplication patterns).
 */

import { describe, it, expect } from 'vitest';
import { compileWithOwnership } from './test-helpers';
import { Diagnostic } from '../../src/types';

describe('Ownership qualifiers on value-type primitives', () => {
  // Ownership type declarations are automatically injected by the compiler
  const withTypes = (source: string) => source;

  it('should reject own<number>', () => {
    const source = withTypes(`
      class Box {
        value: own<number>;
      }
    `);
    
    const result = compileWithOwnership(source);
    const errors = result.diagnostics.filter((d: Diagnostic) => 
      d.severity === 'error' && d.message.includes('primitive'));
    
    expect(errors.length).toBeGreaterThan(0);
  });
  
  it('should reject share<boolean>', () => {
    const source = withTypes(`
      class Container {
        flag: share<boolean>;
      }
    `);
    
    const result = compileWithOwnership(source);
    const errors = result.diagnostics.filter((d: Diagnostic) => 
      d.severity === 'error' && d.message.includes('primitive'));
    
    expect(errors.length).toBeGreaterThan(0);
  });
  
  it('should allow share<string> for string deduplication', () => {
    const source = withTypes(`
      class StringPool {
        strings: Map<string, share<string>> = new Map<string, share<string>>();
      }
    `);
    
    const result = compileWithOwnership(source);
    const errors = result.diagnostics.filter((d: Diagnostic) => d.severity === 'error');
    expect(errors.length).toBe(0);
  });
  
  it('should allow plain number', () => {
    const source = `
      class Box {
        value: number = 0;
      }
    `;
    
    const result = compileWithOwnership(source);
    const errors = result.diagnostics.filter((d: Diagnostic) => d.severity === 'error');
    expect(errors.length).toBe(0);
  });
  
  it('should allow plain boolean', () => {
    const source = `
      class Container {
        flag: boolean = false;
      }
    `;
    
    const result = compileWithOwnership(source);
    expect(result.diagnostics.filter((d: Diagnostic) => d.severity === 'error').length).toBe(0);
  });
  
  it('should allow plain string', () => {
    const source = `
      class Data {
        name: string = '';
      }
    `;
    
    const result = compileWithOwnership(source);
    expect(result.diagnostics.filter((d: Diagnostic) => d.severity === 'error').length).toBe(0);
  });
});
