/**
 * Equivalence tests for array operations
 */

import { defineEquivalenceTest } from '../test-framework.js';

export const tests = [
  defineEquivalenceTest({
    name: 'Array literal',
    code: `
      const arr: integer[] = [1, 2, 3, 4, 5];
      console.log(arr.length);
    `,
    expectedOutput: '5\n'
  }),

  defineEquivalenceTest({
    name: 'Array push',
    code: `
      const arr: integer[] = [];
      arr.push(10);
      arr.push(20);
      arr.push(30);
      console.log(arr.length);
    `,
    expectedOutput: '3\n'
  }),

  defineEquivalenceTest({
    name: 'Array indexing',
    code: `
      const arr: string[] = ["apple", "banana", "cherry"];
      console.log(arr[0]);
      console.log(arr[1]);
      console.log(arr[2]);
    `,
    expectedOutput: 'apple\nbanana\ncherry\n'
  }),

  defineEquivalenceTest({
    name: 'Array for-of loop',
    code: `
      const arr: integer[] = [1, 2, 3, 4, 5];
      let sum: integer = 0;
      for (const num of arr) {
        sum = sum + num;
      }
      console.log(sum);
    `,
    expectedOutput: '15\n'
  }),

  defineEquivalenceTest({
    name: 'Empty array',
    code: `
      const arr: integer[] = [];
      console.log(arr.length);
    `,
    expectedOutput: '0\n'
  }),

  defineEquivalenceTest({
    name: 'Array with reserve optimization',
    code: `
      const arr: integer[] = [];
      for (let i: integer = 0; i < 100; i = i + 1) {
        arr.push(i);
      }
      console.log(arr.length);
      console.log(arr[0]);
      console.log(arr[99]);
    `,
    expectedOutput: '100\n0\n99\n'
  }),
];
