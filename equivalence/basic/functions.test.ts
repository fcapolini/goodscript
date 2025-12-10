/**
 * Equivalence tests for function operations
 */

import { defineEquivalenceTest } from '../test-framework.js';

export const tests = [
  defineEquivalenceTest({
    name: 'Simple function call',
    code: `
      function greet(name: string): string {
        return "Hello, " + name;
      }
      console.log(greet("World"));
    `,
    expectedOutput: 'Hello, World\n'
  }),

  defineEquivalenceTest({
    name: 'Function with multiple parameters',
    code: `
      function multiply(a: integer, b: integer): integer {
        return a * b;
      }
      console.log(multiply(6, 7));
      console.log(multiply(12, 5));
    `,
    expectedOutput: '42\n60\n'
  }),

  defineEquivalenceTest({
    name: 'Arrow function',
    code: `
      const add = (a: integer, b: integer): integer => a + b;
      console.log(add(10, 20));
      console.log(add(5, 5));
    `,
    expectedOutput: '30\n10\n'
  }),

  defineEquivalenceTest({
    name: 'Arrow function with block body',
    code: `
      const isEven = (n: integer): boolean => {
        return n % 2 === 0;
      };
      console.log(isEven(4));
      console.log(isEven(7));
      console.log(isEven(0));
    `,
    expectedOutput: 'true\nfalse\ntrue\n'
  }),

  defineEquivalenceTest({
    name: 'Nested function calls',
    code: `
      function double(x: integer): integer {
        return x * 2;
      }
      function addTen(x: integer): integer {
        return x + 10;
      }
      console.log(addTen(double(5)));
    `,
    expectedOutput: '20\n'
  }),

  defineEquivalenceTest({
    name: 'Function returning function',
    code: `
      function makeAdder(n: integer): (x: integer) => integer {
        return (x: integer): integer => x + n;
      }
      const addFive = makeAdder(5);
      console.log(addFive(10));
      console.log(addFive(20));
    `,
    expectedOutput: '15\n25\n'
  }),

  defineEquivalenceTest({
    name: 'Recursive function',
    code: `
      function factorial(n: integer): integer {
        if (n <= 1) {
          return 1;
        }
        return n * factorial(n - 1);
      }
      console.log(factorial(5));
      console.log(factorial(6));
    `,
    expectedOutput: '120\n720\n'
  }),

  defineEquivalenceTest({
    name: 'Void function',
    code: `
      function printMessage(msg: string): void {
        console.log("Message: " + msg);
      }
      printMessage("Hello");
      printMessage("Goodbye");
    `,
    expectedOutput: 'Message: Hello\nMessage: Goodbye\n'
  }),

  defineEquivalenceTest({
    name: 'Function with default behavior',
    code: `
      function max(a: integer, b: integer): integer {
        if (a > b) {
          return a;
        }
        return b;
      }
      console.log(max(10, 5));
      console.log(max(3, 8));
      console.log(max(7, 7));
    `,
    expectedOutput: '10\n8\n7\n'
  }),

  defineEquivalenceTest({
    name: 'Function hoisting with recursion',
    code: `
      function fibonacci(n: integer): integer {
        if (n <= 1) {
          return n;
        }
        return fibonacci(n - 1) + fibonacci(n - 2);
      }
      console.log(fibonacci(6));
      console.log(fibonacci(7));
    `,
    expectedOutput: '8\n13\n'
  })
];
