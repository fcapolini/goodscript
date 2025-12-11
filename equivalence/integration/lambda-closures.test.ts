/**
 * Lambda Closures Equivalence Tests
 * 
 * Tests closure capture, nested closures, and lambda semantics
 */

import { defineEquivalenceTest, type EquivalenceTest } from '../test-framework.js';

export const tests: EquivalenceTest[] = [
  defineEquivalenceTest({
    name: 'Simple closure capture',
    code: `
      function makeAdder(x: integer): (y: integer) => integer {
        return (y: integer) => x + y;
      }
      
      const add5 = makeAdder(5);
      const add10 = makeAdder(10);
      
      console.log(add5(3));
      console.log(add10(3));
    `,
    expectedOutput: '8\n13\n'
  }),

  defineEquivalenceTest({
    name: 'Nested closures',
    code: `
      function outer(a: integer): (b: integer) => (c: integer) => integer {
        return (b: integer) => {
          return (c: integer) => a + b + c;
        };
      }
      
      const result = outer(1)(2)(3);
      console.log(result);
    `,
    expectedOutput: '6\n'
  }),

  defineEquivalenceTest({
    name: 'Closure in array',
    code: `
      function createMultipliers(): ((x: integer) => integer)[] {
        const multipliers: ((x: integer) => integer)[] = [];
        const factors: integer[] = [2, 3, 4];
        
        for (const factor of factors) {
          multipliers.push((x: integer) => x * factor);
        }
        
        return multipliers;
      }
      
      const mults = createMultipliers();
      console.log(mults[0](5));
      console.log(mults[1](5));
      console.log(mults[2](5));
    `,
    expectedOutput: '10\n15\n20\n'
  }),

  defineEquivalenceTest({
    name: 'Closure with parameters',
    code: `
      function greet(greeting: string): (name: string) => string {
        return (name: string) => greeting + ", " + name;
      }
      
      const sayHello = greet("Hello");
      const sayHi = greet("Hi");
      
      console.log(sayHello("Alice"));
      console.log(sayHi("Bob"));
    `,
    expectedOutput: 'Hello, Alice\nHi, Bob\n'
  }),

  defineEquivalenceTest({
    name: 'Closure return value',
    code: `
      function counter(start: integer): () => integer {
        let count = start;
        return () => {
          const result = count;
          count = count + 1;
          return result;
        };
      }
      
      const count = counter(10);
      console.log(count());
      console.log(count());
      console.log(count());
    `,
    expectedOutput: '10\n11\n12\n'
  }),

  defineEquivalenceTest({
    name: 'Higher-order function - map',
    code: `
      function map(arr: integer[], fn: (x: integer) => integer): integer[] {
        const result: integer[] = [];
        for (const item of arr) {
          result.push(fn(item));
        }
        return result;
      }
      
      const numbers: integer[] = [1, 2, 3, 4];
      const doubled = map(numbers, (x) => x * 2);
      
      console.log(doubled.join(","));
    `,
    expectedOutput: '2,4,6,8\n'
  }),

  defineEquivalenceTest({
    name: 'Currying',
    code: `
      function multiply(a: integer): (b: integer) => integer {
        return (b: integer) => a * b;
      }
      
      const double = multiply(2);
      const triple = multiply(3);
      
      console.log(double(5));
      console.log(triple(5));
    `,
    expectedOutput: '10\n15\n'
  }),

  defineEquivalenceTest({
    name: 'Partial application',
    code: `
      function add(a: integer, b: integer, c: integer): integer {
        return a + b + c;
      }
      
      function partial(fn: (a: integer, b: integer, c: integer) => integer, x: integer): (b: integer, c: integer) => integer {
        return (b: integer, c: integer) => fn(x, b, c);
      }
      
      const add10 = partial(add, 10);
      console.log(add10(5, 3));
    `,
    expectedOutput: '18\n'
  }),

  defineEquivalenceTest({
    name: 'IIFE - Immediately Invoked Function',
    code: `
      const result = ((x: integer) => x * 2)(21);
      console.log(result);
    `,
    expectedOutput: '42\n'
  }),

  defineEquivalenceTest({
    name: 'Lambda with array methods',
    code: `
      const numbers: integer[] = [1, 2, 3, 4, 5];
      
      const evens = numbers.filter((n) => n % 2 === 0);
      const doubled = evens.map((n) => n * 2);
      const sum = doubled.reduce((acc, n) => acc + n, 0);
      
      console.log(sum);
    `,
    expectedOutput: '12\n'
  }),

  defineEquivalenceTest({
    name: 'Closure capturing loop variable',
    code: `
      function createPrinters(): (() => void)[] {
        const printers: (() => void)[] = [];
        const values: string[] = ["a", "b", "c"];
        
        for (const val of values) {
          printers.push(() => {
            console.log(val);
          });
        }
        
        return printers;
      }
      
      const printers = createPrinters();
      printers[0]();
      printers[1]();
      printers[2]();
    `,
    expectedOutput: 'a\nb\nc\n'
  }),

  defineEquivalenceTest({
    name: 'Lambda type inference',
    code: `
      const numbers: integer[] = [1, 2, 3, 4, 5];
      const squares = numbers.map((n) => n * n);
      
      console.log(squares.join(","));
    `,
    expectedOutput: '1,4,9,16,25\n'
  })
];
