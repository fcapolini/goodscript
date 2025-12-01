/**
 * Phase 3 Tests: Control Flow (Triple-Mode)
 * 
 * Tests that control flow statements behave identically across JavaScript, Ownership C++, and GC C++.
 */

import { describe, it, expect } from 'vitest';
import { expectTripleModeEquivalence } from '../triple-mode-helpers.js';

describe('Phase 3: Control Flow (Triple-Mode)', () => {
  describe('If Statements', () => {
    it('should execute if-else branches correctly', () => {
      expectTripleModeEquivalence(`
        const x1 = 5;
        const x2 = -3;
        const x3 = 0;
        
        if (x1 > 0) {
          console.log("positive");
        } else {
          console.log("non-positive");
        }
        
        if (x2 > 0) {
          console.log("positive");
        } else {
          console.log("non-positive");
        }
        
        if (x3 > 0) {
          console.log("positive");
        } else {
          console.log("non-positive");
        }
      `);
    });
    
    it('should handle if without else', () => {
      expectTripleModeEquivalence(`
        const x1 = 5;
        const x2 = -3;
        
        if (x1 > 0) {
          console.log("positive");
        }
        
        if (x2 > 0) {
          console.log("positive");
        }
      `);
    });
    
    it('should handle else-if chains', () => {
      expectTripleModeEquivalence(`
        const scores: number[] = [95, 85, 75, 65];
        
        for (const score of scores) {
          if (score >= 90) {
            console.log("A");
          } else if (score >= 80) {
            console.log("B");
          } else if (score >= 70) {
            console.log("C");
          } else {
            console.log("F");
          }
        }
      `);
    });
    
    it('should handle nested if statements', () => {
      expectTripleModeEquivalence(`
        const x = 5;
        const y = 3;
        
        if (x > 0) {
          if (y > 0) {
            console.log("both positive");
          } else {
            console.log("x positive, y non-positive");
          }
        } else {
          console.log("x non-positive");
        }
        
        const x2 = 5;
        const y2 = -3;
        
        if (x2 > 0) {
          if (y2 > 0) {
            console.log("both positive");
          } else {
            console.log("x positive, y non-positive");
          }
        } else {
          console.log("x non-positive");
        }
      `);
    });
  });
  
  describe('For Loops', () => {
    it('should execute for loop', () => {
      expectTripleModeEquivalence(`
        let total: number = 0;
        for (let i: number = 0; i < 5; i = i + 1) {
          total = total + i;
        }
        console.log(total);
        
        let total2: number = 0;
        for (let i: number = 0; i < 10; i = i + 1) {
          total2 = total2 + i;
        }
        console.log(total2);
      `);
    });
    
    it('should handle for loop with break', () => {
      expectTripleModeEquivalence(`
        let result: number = -1;
        for (let i: number = 0; i < 10; i = i + 1) {
          if (i === 3) {
            result = i;
            break;
          }
        }
        console.log(result);
        
        let result2: number = -1;
        for (let i: number = 0; i < 2; i = i + 1) {
          if (i === 3) {
            result2 = i;
            break;
          }
        }
        console.log(result2);
      `);
    });
    
    it('should handle for loop with continue', () => {
      expectTripleModeEquivalence(`
        let total: number = 0;
        for (let i: number = 0; i < 10; i = i + 1) {
          if (i % 2 !== 0) {
            continue;
          }
          total = total + i;
        }
        console.log(total);
      `);
    });
  });
  
  describe('While Loops', () => {
    it('should execute while loop', () => {
      expectTripleModeEquivalence(`
        let n = 3;
        while (n > 0) {
          console.log(n);
          n = n - 1;
        }
      `);
    });
    
    it('should handle while loop with break', () => {
      expectTripleModeEquivalence(`
        let power: number = 1;
        let exp: number = 0;
        const target = 16;
        
        while (true) {
          if (power >= target) {
            break;
          }
          power = power * 2;
          exp = exp + 1;
        }
        console.log(exp);
        
        let power2: number = 1;
        let exp2: number = 0;
        const target2 = 100;
        
        while (true) {
          if (power2 >= target2) {
            break;
          }
          power2 = power2 * 2;
          exp2 = exp2 + 1;
        }
        console.log(exp2);
      `);
    });
  });
  
  describe('For-Of Loops', () => {
    it('should iterate over array', () => {
      expectTripleModeEquivalence(`
        const numbers1: number[] = [1, 2, 3, 4, 5];
        let total1: number = 0;
        for (const num of numbers1) {
          total1 = total1 + num;
        }
        console.log(total1);
        
        const numbers2: number[] = [10, 20, 30];
        let total2: number = 0;
        for (const num of numbers2) {
          total2 = total2 + num;
        }
        console.log(total2);
      `);
    });
    
    it('should iterate over string array', () => {
      expectTripleModeEquivalence(`
        const words: string[] = ["Hello", " ", "World"];
        let result: string = "";
        for (const word of words) {
          result = result + word;
        }
        console.log(result);
      `);
    });
    
    it('should handle empty array', () => {
      expectTripleModeEquivalence(`
        const numbers: number[] = [];
        let total: number = 0;
        for (const num of numbers) {
          total = total + num;
        }
        console.log(total);
      `);
    });
  });
  
  describe('Ternary Operator', () => {
    it('should evaluate ternary expressions', () => {
      expectTripleModeEquivalence(`
        const a = 5;
        const b = 3;
        const max1 = a > b ? a : b;
        console.log(max1);
        
        const c = 2;
        const d = 8;
        const max2 = c > d ? c : d;
        console.log(max2);
      `);
    });
    
    it('should nest ternary expressions', () => {
      expectTripleModeEquivalence(`
        const x1 = 5;
        const result1 = x1 > 0 ? "positive" : x1 < 0 ? "negative" : "zero";
        console.log(result1);
        
        const x2 = -3;
        const result2 = x2 > 0 ? "positive" : x2 < 0 ? "negative" : "zero";
        console.log(result2);
        
        const x3 = 0;
        const result3 = x3 > 0 ? "positive" : x3 < 0 ? "negative" : "zero";
        console.log(result3);
      `);
    });
  });
  
  describe('Boolean Logic', () => {
    it('should evaluate AND conditions', () => {
      expectTripleModeEquivalence(`
        const x1 = 5;
        const result1 = x1 >= 1 && x1 <= 10;
        console.log(result1);
        
        const x2 = 15;
        const result2 = x2 >= 1 && x2 <= 10;
        console.log(result2);
        
        const x3 = 0;
        const result3 = x3 >= 1 && x3 <= 10;
        console.log(result3);
      `);
    });
    
    it('should evaluate OR conditions', () => {
      expectTripleModeEquivalence(`
        const x1 = -5;
        const result1 = x1 < 0 || x1 > 100;
        console.log(result1);
        
        const x2 = 150;
        const result2 = x2 < 0 || x2 > 100;
        console.log(result2);
        
        const x3 = 50;
        const result3 = x3 < 0 || x3 > 100;
        console.log(result3);
      `);
    });
    
    it('should evaluate NOT conditions', () => {
      expectTripleModeEquivalence(`
        const x1 = 3;
        const result1 = !(x1 % 2 === 0);
        console.log(result1);
        
        const x2 = 4;
        const result2 = !(x2 % 2 === 0);
        console.log(result2);
      `);
    });
  });
});
