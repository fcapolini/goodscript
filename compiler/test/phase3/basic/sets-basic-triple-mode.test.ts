/**
 * Phase 3: Set Basic Operations (Triple-Mode Testing)
 * 
 * Tests Set functionality across all three execution modes:
 * 1. JavaScript (Node.js/Deno)
 * 2. Ownership C++ (smart pointers)
 * 3. GC C++ (MPS allocator)
 * 
 * Validates that Set operations produce identical results in all modes.
 */

import { describe, it } from 'vitest';
import { expectTripleModeEquivalence } from '../triple-mode-helpers.js';

describe('Phase 3: Set Basic (Triple-Mode)', () => {
  describe('Set Creation', () => {
    it('should create empty Set', () => {
      expectTripleModeEquivalence(`
        const set = new Set<string>();
        console.log(set.size);
      `);
    });
  });

  describe('Set add and has', () => {
    it('should add and check values', () => {
      expectTripleModeEquivalence(`
        const set = new Set<string>();
        set.add("apple");
        set.add("banana");
        console.log(set.has("apple"));
        console.log(set.has("banana"));
        console.log(set.has("cherry"));
      `);
    });

    it('should handle duplicate adds', () => {
      expectTripleModeEquivalence(`
        const set = new Set<string>();
        set.add("test");
        set.add("test");
        set.add("test");
        console.log(set.size);
        console.log(set.has("test"));
      `);
    });
  });

  describe('Set size tracking', () => {
    it('should track size correctly', () => {
      expectTripleModeEquivalence(`
        const set = new Set<number>();
        console.log(set.size);
        set.add(1);
        console.log(set.size);
        set.add(2);
        console.log(set.size);
        set.add(3);
        console.log(set.size);
      `);
    });
  });

  describe('Set with different value types', () => {
    it('should work with number values', () => {
      expectTripleModeEquivalence(`
        const set = new Set<number>();
        set.add(10);
        set.add(20);
        set.add(30);
        console.log(set.has(10));
        console.log(set.has(25));
        console.log(set.size);
      `);
    });

    it('should work with boolean values', () => {
      expectTripleModeEquivalence(`
        const set = new Set<boolean>();
        set.add(true);
        set.add(false);
        set.add(true);
        console.log(set.size);
        console.log(set.has(true));
        console.log(set.has(false));
      `);
    });
  });

  describe('Set edge cases', () => {
    it('should handle adding same value multiple times', () => {
      expectTripleModeEquivalence(`
        const set = new Set<string>();
        set.add("x");
        set.add("x");
        set.add("x");
        console.log(set.size);
      `);
    });

    it('should handle empty string values', () => {
      expectTripleModeEquivalence(`
        const set = new Set<string>();
        set.add("");
        console.log(set.has(""));
        console.log(set.size);
      `);
    });
  });

  describe('Set clear', () => {
    it('should clear all entries', () => {
      expectTripleModeEquivalence(`
        const set = new Set<string>();
        set.add("a");
        set.add("b");
        set.add("c");
        console.log(set.size);
        set.clear();
        console.log(set.size);
        console.log(set.has("a"));
      `);
    });
  });

  describe('Set delete', () => {
    it('should delete entries', () => {
      expectTripleModeEquivalence(`
        const set = new Set<string>();
        set.add("a");
        set.add("b");
        set.add("c");
        console.log(set.size);
        set.delete("b");
        console.log(set.size);
        console.log(set.has("b"));
      `);
    });

    it('should track size after deletes', () => {
      expectTripleModeEquivalence(`
        const set = new Set<string>();
        console.log(set.size);
        set.add("a");
        console.log(set.size);
        set.add("b");
        console.log(set.size);
        set.add("c");
        console.log(set.size);
        set.delete("b");
        console.log(set.size);
      `);
    });

    it('should handle multiple deletes', () => {
      expectTripleModeEquivalence(`
        const set = new Set<string>();
        set.add("a");
        set.add("b");
        set.add("c");
        console.log(set.size);
        set.delete("a");
        console.log(set.size);
        set.delete("c");
        console.log(set.size);
        set.delete("b");
        console.log(set.size);
      `);
    });
  });

  describe('Set iteration', () => {
    it('should return values array', () => {
      expectTripleModeEquivalence(`
        const set = new Set<string>();
        set.add("first");
        set.add("second");
        set.add("third");
        const values = Array.from(set.values());
        console.log(values.length);
        console.log(values.includes("first"));
        console.log(values.includes("second"));
        console.log(values.includes("third"));
      `);
    });

    it('should handle values on empty set', () => {
      expectTripleModeEquivalence(`
        const set = new Set<string>();
        const values = Array.from(set.values());
        console.log(values.length);
      `);
    });

    it('should handle values after clear', () => {
      expectTripleModeEquivalence(`
        const set = new Set<string>();
        set.add("a");
        set.add("b");
        set.clear();
        const values = Array.from(set.values());
        console.log(values.length);
      `);
    });

    it('should work with number values', () => {
      expectTripleModeEquivalence(`
        const set = new Set<number>();
        set.add(10);
        set.add(20);
        set.add(30);
        const values = Array.from(set.values());
        console.log(values.length);
        console.log(values.includes(10));
        console.log(values.includes(20));
        console.log(values.includes(30));
      `);
    });

    it('should not contain duplicates after iteration', () => {
      expectTripleModeEquivalence(`
        const set = new Set<string>();
        set.add("x");
        set.add("y");
        set.add("x");
        set.add("z");
        const values = Array.from(set.values());
        console.log(values.length);
      `);
    });
  });
});
