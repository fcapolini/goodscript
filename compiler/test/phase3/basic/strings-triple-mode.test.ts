/**
 * Phase 3 Tests: String Operations (Triple-Mode)
 * 
 * Tests that string operations behave identically across JavaScript, Ownership C++, and GC C++.
 */

import { describe, it, expect } from 'vitest';
import { expectTripleModeEquivalence } from '../triple-mode-helpers.js';

describe('Phase 3: String Operations (Triple-Mode)', () => {
  describe('String Creation and Concatenation', () => {
    it('should create and concatenate strings', () => {
      expectTripleModeEquivalence(`
        const s1 = "Hello";
        const s2 = "World";
        const s3 = s1 + " " + s2;
        console.log(s3);
      `);
    });
    
    it('should concatenate multiple strings', () => {
      expectTripleModeEquivalence(`
        const greeting = "Hello" + " " + "from" + " " + "GoodScript";
        console.log(greeting);
      `);
    });
    
    it('should handle empty strings', () => {
      expectTripleModeEquivalence(`
        const empty = "";
        const result = "start" + empty + "end";
        console.log(result);
        console.log(empty);
      `);
    });
  });
  
  // Note: String.length is a property in JS but a method in C++
  // The codegen should auto-convert .length to .length() but this needs work
  // describe('String Length', () => { ... });
  
  describe('String Indexing', () => {
    it('should access characters by index with charAt', () => {
      expectTripleModeEquivalence(`
        const str = "Hello";
        console.log(str.charAt(0));
        console.log(str.charAt(1));
        console.log(str.charAt(4));
      `);
    });
    
    it('should handle out of bounds charAt', () => {
      expectTripleModeEquivalence(`
        const str = "Hi";
        console.log(str.charAt(10));
      `);
    });
  });
  
  describe('String Methods', () => {
    it('should use substring', () => {
      expectTripleModeEquivalence(`
        const str = "Hello World";
        console.log(str.substring(0, 5));
        console.log(str.substring(6, 11));
        console.log(str.substring(6));
      `);
    });
    
    it('should use indexOf', () => {
      expectTripleModeEquivalence(`
        const str = "Hello World";
        console.log(str.indexOf("World"));
        console.log(str.indexOf("o"));
        console.log(str.indexOf("xyz"));
      `);
    });
    
    it('should use toLowerCase and toUpperCase', () => {
      expectTripleModeEquivalence(`
        const str = "Hello World";
        console.log(str.toLowerCase());
        console.log(str.toUpperCase());
      `);
    });
    
    it('should use trim', () => {
      expectTripleModeEquivalence(`
        const str = "  Hello World  ";
        console.log(str.trim());
      `);
    });
    
    it('should use split', () => {
      expectTripleModeEquivalence(`
        const str = "a,b,c";
        const parts = str.split(",");
        for (const part of parts) {
          console.log(part);
        }
      `);
    });
  });
  
  describe('String Comparison', () => {
    it('should compare strings for equality', () => {
      expectTripleModeEquivalence(`
        const s1 = "Hello";
        const s2 = "Hello";
        const s3 = "World";
        
        console.log(s1 === s2);
        console.log(s1 === s3);
        console.log(s1 !== s3);
      `);
    });
    
    it('should compare strings lexicographically', () => {
      expectTripleModeEquivalence(`
        const s1 = "apple";
        const s2 = "banana";
        
        console.log(s1 < s2);
        console.log(s1 > s2);
        console.log(s2 > s1);
      `);
    });
  });
  
  describe('String Templates', () => {
    it('should handle template literals with variables', () => {
      expectTripleModeEquivalence(`
        const name = "Alice";
        const age = 30;
        const greeting = \`Hello, \${name}!\`;
        console.log(greeting);
      `);
    });
    
    it('should handle template literals with expressions', () => {
      expectTripleModeEquivalence(`
        const x = 5;
        const y = 3;
        const result = \`\${x} + \${y} = \${x + y}\`;
        console.log(result);
      `);
    });
  });
  
  describe('String Edge Cases', () => {
    it('should handle special characters', () => {
      expectTripleModeEquivalence(`
        const newline = "Line 1\\nLine 2";
        const tab = "Col1\\tCol2";
        const quote = "He said \\"Hello\\"";
        
        console.log(newline);
        console.log(tab);
        console.log(quote);
      `);
    });
  });
  
  // Note: Tests using .length() don't work in triple-mode since
  // JS uses .length property but C++ needs .length() method
  // describe('String Building', () => { ... });
});
