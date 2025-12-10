/**
 * Equivalence tests for class operations
 */

import { defineEquivalenceTest } from '../test-framework.js';

export const tests = [
  defineEquivalenceTest({
    name: 'Simple class instantiation',
    code: `
      class Point {
        x: integer;
        y: integer;
        
        constructor(x: integer, y: integer) {
          this.x = x;
          this.y = y;
        }
      }
      
      const p = new Point(3, 4);
      console.log(p.x);
      console.log(p.y);
    `,
    expectedOutput: '3\n4\n'
  }),

  defineEquivalenceTest({
    name: 'Class with methods',
    code: `
      class Calculator {
        value: integer;
        
        constructor(initial: integer) {
          this.value = initial;
        }
        
        add(n: integer): void {
          this.value = this.value + n;
        }
        
        getValue(): integer {
          return this.value;
        }
      }
      
      const calc = new Calculator(10);
      console.log(calc.getValue());
      calc.add(5);
      console.log(calc.getValue());
    `,
    expectedOutput: '10\n15\n'
  }),

  defineEquivalenceTest({
    name: 'Class with string fields',
    code: `
      class Person {
        name: string;
        age: integer;
        
        constructor(name: string, age: integer) {
          this.name = name;
          this.age = age;
        }
        
        greet(): void {
          console.log("Hello, I am " + this.name);
        }
      }
      
      const alice = new Person("Alice", 30);
      alice.greet();
      console.log(alice.age);
    `,
    expectedOutput: 'Hello, I am Alice\n30\n'
  }),

  defineEquivalenceTest({
    name: 'Multiple instances',
    code: `
      class Counter {
        count: integer;
        
        constructor() {
          this.count = 0;
        }
        
        increment(): void {
          this.count = this.count + 1;
        }
        
        getCount(): integer {
          return this.count;
        }
      }
      
      const c1 = new Counter();
      const c2 = new Counter();
      
      c1.increment();
      c1.increment();
      c2.increment();
      
      console.log(c1.getCount());
      console.log(c2.getCount());
    `,
    expectedOutput: '2\n1\n'
  }),

  defineEquivalenceTest({
    name: 'Class field initialization',
    code: `
      class Config {
        timeout: integer = 5000;
        retries: integer = 3;
        
        constructor() {}
      }
      
      const config = new Config();
      console.log(config.timeout);
      console.log(config.retries);
    `,
    expectedOutput: '5000\n3\n'
  }),

  defineEquivalenceTest({
    name: 'Class with boolean field',
    code: `
      class Flag {
        enabled: boolean;
        
        constructor(enabled: boolean) {
          this.enabled = enabled;
        }
        
        toggle(): void {
          this.enabled = !this.enabled;
        }
        
        isEnabled(): boolean {
          return this.enabled;
        }
      }
      
      const flag = new Flag(true);
      console.log(flag.isEnabled());
      flag.toggle();
      console.log(flag.isEnabled());
    `,
    expectedOutput: 'true\nfalse\n'
  })
];
