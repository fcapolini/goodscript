/**
 * Phase 3 Tests: Primitive Types (Triple-Mode)
 * 
 * Tests C++ code generation for primitive types in all three modes:
 * - JavaScript (TypeScript → JS)
 * - Ownership C++ (smart pointers)
 * - GC C++ (raw pointers with GC)
 */

import { describe, it, expect } from 'vitest';
import { testTripleMode, expectTripleModeEquivalence, expectTripleModeCompilation } from '../triple-mode-helpers.js';

describe('Phase 3: Primitive Types (Triple-Mode)', () => {
  describe('Code Generation', () => {
    it('should generate number variable in all modes', () => {
      const { ownershipCppCode, gcCppCode } = expectTripleModeCompilation(
        `const x: number = 42;`
      );
      
      // Ownership mode
      expect(ownershipCppCode).toContain('namespace gs {');
      expect(ownershipCppCode).toContain('const double x = 42;');
      expect(ownershipCppCode).toContain('} // namespace gs');
      
      // GC mode should have same code (primitives don't differ)
      expect(gcCppCode).toContain('namespace gs {');
      expect(gcCppCode).toContain('const double x = 42;');
      expect(gcCppCode).toContain('} // namespace gs');
    });
    
    it('should generate string variable in all modes', () => {
      const { ownershipCppCode, gcCppCode } = expectTripleModeCompilation(
        `const name: string = "Alice";`
      );
      
      // Both modes should use gs::String
      expect(ownershipCppCode).toContain('const gs::String name = gs::String("Alice")');
      expect(gcCppCode).toContain('const gs::String name = gs::String("Alice")');
    });
    
    it('should include correct runtime headers', () => {
      const { ownershipCppCode, gcCppCode } = expectTripleModeCompilation(
        `const x: number = 1;`
      );
      
      // Different runtime headers for each mode
      expect(ownershipCppCode).toContain('#include "gs_runtime.hpp"');
      expect(gcCppCode).toContain('#include "gs_gc_runtime.hpp"');
    });
  });
  
  describe('Runtime Equivalence', () => {
    it('should produce identical output for console.log with number', () => {
      const result = expectTripleModeEquivalence(`
        console.log(42);
      `);
      
      expect(result.allMatch).toBe(true);
      expect(result.jsResult.stdout.trim()).toBe('42');
      expect(result.ownershipResult.stdout.trim()).toBe('42');
      expect(result.gcResult.stdout.trim()).toBe('42');
    });
    
    it('should produce identical output for console.log with string', () => {
      const result = expectTripleModeEquivalence(`
        console.log("Hello, World!");
      `);
      
      expect(result.allMatch).toBe(true);
      expect(result.jsResult.stdout.trim()).toBe('Hello, World!');
      expect(result.ownershipResult.stdout.trim()).toBe('Hello, World!');
      expect(result.gcResult.stdout.trim()).toBe('Hello, World!');
    });
    
    it('should produce identical output for arithmetic operations', () => {
      const result = expectTripleModeEquivalence(`
        const a: number = 10;
        const b: number = 20;
        const sum: number = a + b;
        console.log(sum);
      `);
      
      expect(result.allMatch).toBe(true);
      expect(result.jsResult.stdout.trim()).toBe('30');
      expect(result.ownershipResult.stdout.trim()).toBe('30');
      expect(result.gcResult.stdout.trim()).toBe('30');
    });
    
    it('should produce identical output for string concatenation', () => {
      const result = expectTripleModeEquivalence(`
        const first: string = "Hello";
        const second: string = "World";
        const greeting: string = first + ", " + second + "!";
        console.log(greeting);
      `);
      
      expect(result.allMatch).toBe(true);
      expect(result.jsResult.stdout.trim()).toBe('Hello, World!');
      expect(result.ownershipResult.stdout.trim()).toBe('Hello, World!');
      expect(result.gcResult.stdout.trim()).toBe('Hello, World!');
    });
    
    it('should produce identical output for boolean operations', () => {
      const result = expectTripleModeEquivalence(`
        const isTrue: boolean = true;
        const isFalse: boolean = false;
        const andResult: boolean = isTrue && isFalse;
        const orResult: boolean = isTrue || isFalse;
        console.log(andResult);
        console.log(orResult);
      `);
      
      expect(result.allMatch).toBe(true);
      const jsLines = result.jsResult.stdout.trim().split('\n');
      const ownershipLines = result.ownershipResult.stdout.trim().split('\n');
      const gcLines = result.gcResult.stdout.trim().split('\n');
      
      expect(jsLines[0]).toBe('false');
      expect(jsLines[1]).toBe('true');
      expect(ownershipLines[0]).toBe('false');
      expect(ownershipLines[1]).toBe('true');
      expect(gcLines[0]).toBe('false');
      expect(gcLines[1]).toBe('true');
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle floating-point precision consistently', () => {
      const result = expectTripleModeEquivalence(`
        const x: number = 0.1 + 0.2;
        console.log(x);
      `);
      
      expect(result.allMatch).toBe(true);
      // All three modes should handle IEEE 754 floating point the same way
    });
    
    it('should handle empty strings', () => {
      const result = expectTripleModeEquivalence(`
        const empty: string = "";
        console.log(">" + empty + "<");
      `);
      
      expect(result.allMatch).toBe(true);
      expect(result.jsResult.stdout.trim()).toBe('><');
    });
    
    it('should handle special string characters', () => {
      const result = expectTripleModeEquivalence(`
        const special: string = "Line 1\\nLine 2\\tTabbed";
        console.log(special);
      `);
      
      expect(result.allMatch).toBe(true);
    });
  });
});
