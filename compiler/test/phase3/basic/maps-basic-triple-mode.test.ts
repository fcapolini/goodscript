/**
 * Phase 3 Triple-Mode Tests: Map (Basic)
 * 
 * Tests basic Map operations that produce identical output across:
 * 1. JavaScript (TypeScript execution)
 * 2. C++ Ownership Mode
 * 3. C++ GC Mode
 * 
 * Note: This focuses on operations that currently work.
 * Advanced features (keys(), values(), iteration) are tested separately.
 */

import { describe, it } from 'vitest';
import { expectTripleModeEquivalence } from '../triple-mode-helpers.js';

describe('Phase 3: Map Basic (Triple-Mode)', () => {
  describe('Map Creation', () => {
    it('should create empty Map', () => {
      expectTripleModeEquivalence(`
        const map = new Map<string, number>();
        console.log(map.size);
      `);
    });
  });

  describe('Map set and get', () => {
    it('should set and get values', () => {
      expectTripleModeEquivalence(`
        const map = new Map<string, number>();
        map.set("a", 1);
        map.set("b", 2);
        console.log(map.get("a"));
        console.log(map.get("b"));
      `);
    });

    it('should handle has() checks', () => {
      expectTripleModeEquivalence(`
        const map = new Map<string, number>();
        map.set("key", 42);
        console.log(map.has("key"));
        console.log(map.has("missing"));
      `);
    });
  });

  describe('Map size tracking', () => {
    it('should track size correctly', () => {
      expectTripleModeEquivalence(`
        const map = new Map<string, number>();
        console.log(map.size);
        map.set("a", 1);
        console.log(map.size);
        map.set("b", 2);
        console.log(map.size);
        map.set("c", 3);
        console.log(map.size);
      `);
    });
  });

  describe('Map value updates', () => {
    it('should update existing values', () => {
      expectTripleModeEquivalence(`
        const map = new Map<string, number>();
        map.set("counter", 0);
        console.log(map.get("counter"));
        map.set("counter", 1);
        console.log(map.get("counter"));
        map.set("counter", 2);
        console.log(map.get("counter"));
      `);
    });

    it('should handle multiple key-value pairs', () => {
      expectTripleModeEquivalence(`
        const map = new Map<string, string>();
        map.set("name", "Alice");
        map.set("city", "NYC");
        map.set("role", "Dev");
        console.log(map.get("name"));
        console.log(map.get("city"));
        console.log(map.get("role"));
        console.log(map.size);
      `);
    });
  });

  describe('Map with different key types', () => {
    it('should work with number keys', () => {
      expectTripleModeEquivalence(`
        const map = new Map<number, string>();
        map.set(1, "one");
        map.set(2, "two");
        map.set(3, "three");
        console.log(map.get(1));
        console.log(map.get(2));
        console.log(map.get(3));
      `);
    });

    it('should work with boolean keys', () => {
      expectTripleModeEquivalence(`
        const map = new Map<boolean, number>();
        map.set(true, 100);
        map.set(false, 0);
        console.log(map.get(true));
        console.log(map.get(false));
      `);
    });
  });

  describe('Map edge cases', () => {
    it('should handle overwriting same key', () => {
      expectTripleModeEquivalence(`
        const map = new Map<string, number>();
        map.set("x", 1);
        map.set("x", 2);
        map.set("x", 3);
        console.log(map.get("x"));
        console.log(map.size);
      `);
    });

    it('should handle empty string keys', () => {
      expectTripleModeEquivalence(`
        const map = new Map<string, number>();
        map.set("", 42);
        console.log(map.has(""));
        console.log(map.get(""));
      `);
    });
  });

  describe('Map clear', () => {
    it('should clear all entries', () => {
      expectTripleModeEquivalence(`
        const map = new Map<string, number>();
        map.set("a", 1);
        map.set("b", 2);
        map.set("c", 3);
        console.log(map.size);
        map.clear();
        console.log(map.size);
      `);
    });
  });

  describe('Map delete', () => {
    it('should delete entries', () => {
      expectTripleModeEquivalence(`
        const map = new Map<string, number>();
        map.set("a", 1);
        map.set("b", 2);
        map.set("c", 3);
        console.log(map.size);
        map.delete("b");
        console.log(map.size);
        console.log(map.has("b"));
      `);
    });

    it('should track size after deletes', () => {
      expectTripleModeEquivalence(`
        const map = new Map<string, number>();
        console.log(map.size);
        map.set("a", 1);
        console.log(map.size);
        map.set("b", 2);
        console.log(map.size);
        map.set("c", 3);
        console.log(map.size);
        map.delete("b");
        console.log(map.size);
      `);
    });
  });
});
