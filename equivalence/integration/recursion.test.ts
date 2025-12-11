/**
 * Recursion Equivalence Tests
 * 
 * Tests recursive functions, mutual recursion, and recursive data structures
 */

import { defineEquivalenceTest, type EquivalenceTest } from '../test-framework.js';

export const tests: EquivalenceTest[] = [
  defineEquivalenceTest({
    name: 'Direct recursion - factorial',
    code: `
      function factorial(n: integer): integer {
        if (n <= 1) {
          return 1;
        }
        return n * factorial(n - 1);
      }
      
      console.log(factorial(5));
      console.log(factorial(0));
      console.log(factorial(1));
    `,
    expectedOutput: '120\n1\n1\n'
  }),

  defineEquivalenceTest({
    name: 'Tail recursion',
    code: `
      function factorialTail(n: integer, acc: integer): integer {
        if (n <= 1) {
          return acc;
        }
        return factorialTail(n - 1, n * acc);
      }
      
      console.log(factorialTail(5, 1));
      console.log(factorialTail(10, 1));
    `,
    expectedOutput: '120\n3628800\n'
  }),

  defineEquivalenceTest({
    name: 'Tree recursion - fibonacci',
    code: `
      function fibonacci(n: integer): integer {
        if (n <= 1) {
          return n;
        }
        return fibonacci(n - 1) + fibonacci(n - 2);
      }
      
      console.log(fibonacci(0));
      console.log(fibonacci(1));
      console.log(fibonacci(5));
      console.log(fibonacci(10));
    `,
    expectedOutput: '0\n1\n5\n55\n'
  }),

  defineEquivalenceTest({
    name: 'Mutual recursion - even/odd',
    code: `
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
      
      console.log(isEven(0));
      console.log(isEven(4));
      console.log(isOdd(3));
      console.log(isOdd(6));
    `,
    expectedOutput: 'true\ntrue\ntrue\nfalse\n'
  }),

  defineEquivalenceTest({
    name: 'Recursive array processing - sum',
    code: `
      function sumArray(arr: integer[], index: integer): integer {
        if (index >= arr.length) {
          return 0;
        }
        return arr[index] + sumArray(arr, index + 1);
      }
      
      const nums: integer[] = [1, 2, 3, 4, 5];
      console.log(sumArray(nums, 0));
    `,
    expectedOutput: '15\n'
  }),

  defineEquivalenceTest({
    name: 'Recursive string processing - reverse',
    code: `
      function reverseString(str: string, index: integer): string {
        if (index < 0) {
          return "";
        }
        return str[index] + reverseString(str, index - 1);
      }
      
      const text = "hello";
      console.log(reverseString(text, text.length - 1));
    `,
    expectedOutput: 'olleh\n'
  }),

  defineEquivalenceTest({
    name: 'Deep recursion - power',
    code: `
      function power(base: integer, exp: integer): integer {
        if (exp === 0) {
          return 1;
        }
        return base * power(base, exp - 1);
      }
      
      console.log(power(2, 0));
      console.log(power(2, 3));
      console.log(power(5, 2));
    `,
    expectedOutput: '1\n8\n25\n'
  }),

  defineEquivalenceTest({
    name: 'Recursion with accumulator - list length',
    code: `
      function arrayLength(arr: string[], count: integer): integer {
        if (arr.length === 0) {
          return count;
        }
        const rest: string[] = arr.slice(1);
        return arrayLength(rest, count + 1);
      }
      
      const items: string[] = ["a", "b", "c", "d"];
      console.log(arrayLength(items, 0));
    `,
    expectedOutput: '4\n'
  }),

  defineEquivalenceTest({
    name: 'Recursion with multiple parameters - GCD',
    code: `
      function gcd(a: integer, b: integer): integer {
        if (b === 0) {
          return a;
        }
        return gcd(b, a % b);
      }
      
      console.log(gcd(48, 18));
      console.log(gcd(100, 25));
      console.log(gcd(7, 3));
    `,
    expectedOutput: '6\n25\n1\n'
  }),

  defineEquivalenceTest({
    name: 'Recursive class method',
    code: `
      class Counter {
        count(n: integer): integer {
          if (n <= 0) {
            return 0;
          }
          return 1 + this.count(n - 1);
        }
      }
      
      const c = new Counter();
      console.log(c.count(5));
      console.log(c.count(0));
    `,
    expectedOutput: '5\n0\n'
  }),

  defineEquivalenceTest({
    name: 'Recursion with lambda',
    code: `
      const countdown = (n: integer): string => {
        if (n === 0) {
          return "done";
        }
        return n.toString() + " " + countdown(n - 1);
      };
      
      console.log(countdown(3));
    `,
    expectedOutput: '3 2 1 done\n'
  }),

  defineEquivalenceTest({
    name: 'Recursion termination conditions',
    code: `
      function search(arr: integer[], target: integer, index: integer): integer {
        if (index >= arr.length) {
          return -1;
        }
        if (arr[index] === target) {
          return index;
        }
        return search(arr, target, index + 1);
      }
      
      const numbers: integer[] = [10, 20, 30, 40, 50];
      console.log(search(numbers, 30, 0));
      console.log(search(numbers, 99, 0));
    `,
    expectedOutput: '2\n-1\n'
  })
];
