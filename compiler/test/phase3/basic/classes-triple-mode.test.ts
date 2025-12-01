/**
 * Phase 3 Tests: Classes (Triple-Mode)
 * 
 * Tests that class behavior is identical across JavaScript, Ownership C++, and GC C++.
 */

import { describe, it, expect } from 'vitest';
import { expectTripleModeEquivalence } from '../triple-mode-helpers.js';

describe('Phase 3: Classes (Triple-Mode)', () => {
  describe('Basic Classes', () => {
    it('should create and use simple class', () => {
      expectTripleModeEquivalence(`
        class Point {
          x: number;
          y: number;
          
          constructor(x: number, y: number) {
            this.x = x;
            this.y = y;
          }
        }
        
        const p = new Point(3, 4);
        console.log(p.x);
        console.log(p.y);
      `);
    });
    
    it('should call methods', () => {
      expectTripleModeEquivalence(`
        class Counter {
          count: number;
          
          constructor(initial: number) {
            this.count = initial;
          }
          
          increment(): void {
            this.count = this.count + 1;
          }
          
          getValue(): number {
            return this.count;
          }
        }
        
        const c = new Counter(10);
        console.log(c.getValue());
        c.increment();
        console.log(c.getValue());
        c.increment();
        console.log(c.getValue());
      `);
    });
    
    it('should handle string fields', () => {
      expectTripleModeEquivalence(`
        class Person {
          name: string;
          age: number;
          
          constructor(name: string, age: number) {
            this.name = name;
            this.age = age;
          }
          
          greet(): string {
            return "Hello, " + this.name;
          }
        }
        
        const p = new Person("Alice", 30);
        console.log(p.name);
        console.log(p.age);
        console.log(p.greet());
      `);
    });
    
    it('should handle boolean fields', () => {
      expectTripleModeEquivalence(`
        class Flag {
          isActive: boolean;
          
          constructor(active: boolean) {
            this.isActive = active;
          }
          
          toggle(): void {
            this.isActive = !this.isActive;
          }
        }
        
        const f = new Flag(true);
        console.log(f.isActive);
        f.toggle();
        console.log(f.isActive);
        f.toggle();
        console.log(f.isActive);
      `);
    });
  });
  
  describe('Methods with Returns', () => {
    it('should return calculated values', () => {
      expectTripleModeEquivalence(`
        class Rectangle {
          width: number;
          height: number;
          
          constructor(w: number, h: number) {
            this.width = w;
            this.height = h;
          }
          
          area(): number {
            return this.width * this.height;
          }
          
          perimeter(): number {
            return 2 * (this.width + this.height);
          }
        }
        
        const r = new Rectangle(5, 3);
        console.log(r.area());
        console.log(r.perimeter());
      `);
    });
  });
  
  describe('Multiple Instances', () => {
    it('should maintain separate state per instance', () => {
      expectTripleModeEquivalence(`
        class Account {
          balance: number;
          
          constructor(initial: number) {
            this.balance = initial;
          }
          
          deposit(amount: number): void {
            this.balance = this.balance + amount;
          }
          
          withdraw(amount: number): void {
            this.balance = this.balance - amount;
          }
        }
        
        const a1 = new Account(100);
        const a2 = new Account(200);
        
        a1.deposit(50);
        a2.withdraw(30);
        
        console.log(a1.balance);
        console.log(a2.balance);
      `);
    });
  });
});
