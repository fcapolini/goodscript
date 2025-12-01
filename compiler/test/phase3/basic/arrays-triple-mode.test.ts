/**
 * Phase 3 Tests: Arrays (Triple-Mode)
 * 
 * Tests array operations in all three modes:
 * - JavaScript (TypeScript → JS)
 * - Ownership C++ (smart pointers)
 * - GC C++ (raw pointers with GC)
 */

import { describe, it, expect } from 'vitest';
import { expectTripleModeEquivalence } from '../triple-mode-helpers.js';

describe('Phase 3: Arrays (Triple-Mode)', () => {
  describe('Array Creation and Access', () => {
    it('should create and access array elements', () => {
      expectTripleModeEquivalence(`
        const numbers: number[] = [1, 2, 3, 4, 5];
        console.log(numbers[0]);
        console.log(numbers[2]);
        console.log(numbers[4]);
      `);
    });
    
    it('should create array with strings', () => {
      expectTripleModeEquivalence(`
        const words: string[] = ["hello", "world"];
        console.log(words[0]);
        console.log(words[1]);
      `);
    });
    
    it('should handle empty arrays', () => {
      expectTripleModeEquivalence(`
        const empty: number[] = [];
        console.log(empty.length);
      `);
    });
  });
  
  describe('Array Methods', () => {
    it('should use push and length', () => {
      expectTripleModeEquivalence(`
        const arr: number[] = [1, 2, 3];
        arr.push(4);
        arr.push(5);
        console.log(arr.length);
        console.log(arr[3]);
        console.log(arr[4]);
      `);
    });
    
    it('should use pop', () => {
      expectTripleModeEquivalence(`
        const arr: number[] = [1, 2, 3];
        const last: number | undefined = arr.pop();
        console.log(arr.length);
        if (last !== undefined) {
          console.log(last);
        }
      `);
    });
    
    it('should iterate with for loop', () => {
      expectTripleModeEquivalence(`
        const numbers: number[] = [10, 20, 30];
        for (let i = 0; i < numbers.length; i++) {
          console.log(numbers[i]);
        }
      `);
    });
    
    it('should use map', () => {
      expectTripleModeEquivalence(`
        const numbers: number[] = [1, 2, 3];
        const doubled: number[] = numbers.map((n: number) => n * 2);
        for (let i = 0; i < doubled.length; i++) {
          console.log(doubled[i]);
        }
      `);
    });
    
    it('should use filter', () => {
      expectTripleModeEquivalence(`
        const numbers: number[] = [1, 2, 3, 4, 5];
        const evens: number[] = numbers.filter((n: number) => n % 2 === 0);
        for (let i = 0; i < evens.length; i++) {
          console.log(evens[i]);
        }
      `);
    });
    
    it('should use reduce', () => {
      expectTripleModeEquivalence(`
        const numbers: number[] = [1, 2, 3, 4, 5];
        const sum: number = numbers.reduce((acc: number, n: number) => acc + n, 0);
        console.log(sum);
      `);
    });
    
    it('should use find', () => {
      expectTripleModeEquivalence(`
        const numbers: number[] = [1, 2, 3, 4, 5];
        const found: number | undefined = numbers.find((n: number) => n > 3);
        if (found !== undefined) {
          console.log(found);
        }
      `);
    });
    
    it('should use slice', () => {
      expectTripleModeEquivalence(`
        const numbers: number[] = [1, 2, 3, 4, 5];
        const slice: number[] = numbers.slice(1, 4);
        for (let i = 0; i < slice.length; i++) {
          console.log(slice[i]);
        }
      `);
    });
    
    it('should use join', () => {
      expectTripleModeEquivalence(`
        const words: string[] = ["hello", "world", "test"];
        const joined: string = words.join(", ");
        console.log(joined);
      `);
    });
  });
  
  describe('Array Modification', () => {
    it('should modify elements by index', () => {
      expectTripleModeEquivalence(`
        const numbers: number[] = [1, 2, 3];
        numbers[1] = 20;
        console.log(numbers[0]);
        console.log(numbers[1]);
        console.log(numbers[2]);
      `);
    });
    
    it('should auto-resize on assignment', () => {
      expectTripleModeEquivalence(`
        const arr: number[] = [1, 2, 3];
        arr[5] = 60;
        console.log(arr.length);
        console.log(arr[5]);
      `);
    });
  });
  
  describe('String Arrays', () => {
    it('should concatenate string array elements', () => {
      expectTripleModeEquivalence(`
        const parts: string[] = ["Good", "Script"];
        const combined: string = parts[0] + parts[1];
        console.log(combined);
      `);
    });
    
    it('should use array of strings with methods', () => {
      expectTripleModeEquivalence(`
        const words: string[] = ["apple", "banana", "cherry"];
        const filtered: string[] = words.filter((w: string) => w.length > 5);
        for (let i = 0; i < filtered.length; i++) {
          console.log(filtered[i]);
        }
      `);
    });
  });
});
