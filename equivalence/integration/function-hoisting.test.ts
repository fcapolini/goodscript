/**
 * Function Hoisting Equivalence Tests
 * 
 * Tests recursive nested function optimization and hoisting behavior
 */

import { defineEquivalenceTest, type EquivalenceTest } from '../test-framework.js';

export const tests: EquivalenceTest[] = [
  defineEquivalenceTest({
    name: 'Simple recursive nested function - factorial',
    code: `
      function compute(): integer {
        function factorial(n: integer): integer {
          if (n <= 1) {
            return 1;
          }
          return n * factorial(n - 1);
        }
        
        return factorial(5);
      }
      
      console.log(compute());
    `,
    expectedOutput: '120\n'
  }),

  defineEquivalenceTest({
    name: 'Fibonacci with nested recursion',
    code: `
      function runFib(): integer {
        function fib(n: integer): integer {
          if (n <= 1) {
            return n;
          }
          return fib(n - 1) + fib(n - 2);
        }
        
        return fib(8);
      }
      
      console.log(runFib());
    `,
    expectedOutput: '21\n'
  }),

  defineEquivalenceTest({
    name: 'GCD recursive function',
    code: `
      function calculate(): integer {
        function gcd(a: integer, b: integer): integer {
          if (b === 0) {
            return a;
          }
          return gcd(b, a % b);
        }
        
        return gcd(48, 18);
      }
      
      console.log(calculate());
    `,
    expectedOutput: '6\n'
  }),

  defineEquivalenceTest({
    name: 'Hoisted function with parameters',
    code: `
      function wrapper(): integer {
        function power(base: integer, exp: integer): integer {
          if (exp === 0) {
            return 1;
          }
          return base * power(base, exp - 1);
        }
        
        return power(2, 5);
      }
      
      console.log(wrapper());
    `,
    expectedOutput: '32\n'
  }),

  defineEquivalenceTest({
    name: 'Multiple hoisted functions',
    code: `
      function multi(): integer {
        function add(a: integer, b: integer): integer {
          return a + b;
        }
        
        function multiply(a: integer, b: integer): integer {
          return a * b;
        }
        
        return multiply(add(2, 3), add(4, 1));
      }
      
      console.log(multi());
    `,
    expectedOutput: '25\n'
  }),

  defineEquivalenceTest({
    name: 'Countdown recursion',
    code: `
      function runCountdown(): string {
        function countdown(n: integer): string {
          if (n === 0) {
            return "done";
          }
          return n.toString() + " " + countdown(n - 1);
        }
        
        return countdown(3);
      }
      
      console.log(runCountdown());
    `,
    expectedOutput: '3 2 1 done\n'
  }),

  defineEquivalenceTest({
    name: 'Sum array recursion',
    code: `
      function sumAll(): integer {
        const nums: integer[] = [1, 2, 3, 4, 5];
        
        function sum(arr: integer[], idx: integer): integer {
          if (idx >= arr.length) {
            return 0;
          }
          return arr[idx] + sum(arr, idx + 1);
        }
        
        return sum(nums, 0);
      }
      
      console.log(sumAll());
    `,
    expectedOutput: '15\n'
  }),

  defineEquivalenceTest({
    name: 'Tail recursion factorial',
    code: `
      function tailFact(): integer {
        function factTail(n: integer, acc: integer): integer {
          if (n <= 1) {
            return acc;
          }
          return factTail(n - 1, n * acc);
        }
        
        return factTail(6, 1);
      }
      
      console.log(tailFact());
    `,
    expectedOutput: '720\n'
  }),

  defineEquivalenceTest({
    name: 'Conditional recursion',
    code: `
      function search(): integer {
        const arr: integer[] = [10, 20, 30, 40, 50];
        
        function find(target: integer, idx: integer): integer {
          if (idx >= arr.length) {
            return -1;
          }
          if (arr[idx] === target) {
            return idx;
          }
          return find(target, idx + 1);
        }
        
        return find(30, 0);
      }
      
      console.log(search());
    `,
    expectedOutput: '2\n'
  }),

  defineEquivalenceTest({
    name: 'Even/odd mutual recursion hoisting',
    code: `
      function checkParity(): string {
        function isEven(n: integer): boolean {
          if (n === 0) {
            return true;
          }
          return isOdd(n - 1);
        }
        
        function isOdd(n: integer): boolean {
          if (n === 0) {
            return false;
          }
          return isEven(n - 1);
        }
        
        return isEven(4).toString() + " " + isOdd(5).toString();
      }
      
      console.log(checkParity());
    `,
    expectedOutput: 'true true\n'
  })
];
