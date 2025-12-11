/**
 * Advanced Array Methods Equivalence Tests
 * 
 * Tests array method chaining, reduce, find, and advanced operations
 */

import { defineEquivalenceTest, type EquivalenceTest } from '../test-framework.js';

export const tests: EquivalenceTest[] = [
  defineEquivalenceTest({
    name: 'Method chaining - filter + map',
    code: `
      const numbers: integer[] = [1, 2, 3, 4, 5, 6];
      const result = numbers
        .filter((n) => n % 2 === 0)
        .map((n) => n * 2);
      
      for (const num of result) {
        console.log(num);
      }
    `,
    expectedOutput: '4\n8\n12\n'
  }),

  defineEquivalenceTest({
    name: 'Reduce with sum',
    code: `
      const numbers: integer[] = [1, 2, 3, 4, 5];
      const sum = numbers.reduce((acc, n) => acc + n, 0);
      console.log(sum);
    `,
    expectedOutput: '15\n'
  }),

  defineEquivalenceTest({
    name: 'Reduce with product',
    code: `
      const numbers: integer[] = [2, 3, 4];
      const product = numbers.reduce((acc, n) => acc * n, 1);
      console.log(product);
    `,
    expectedOutput: '24\n'
  }),

  defineEquivalenceTest({
    name: 'Find first matching element',
    code: `
      const numbers: integer[] = [10, 20, 30, 40, 50];
      const found = numbers.find((n) => n > 25);
      console.log(found);
    `,
    expectedOutput: '30\n'
  }),

  defineEquivalenceTest({
    name: 'FindIndex of element',
    code: `
      const numbers: integer[] = [10, 20, 30, 40, 50];
      const index = numbers.findIndex((n) => n === 30);
      console.log(index);
    `,
    expectedOutput: '2\n'
  }),

  defineEquivalenceTest({
    name: 'Some - test if any match',
    code: `
      const numbers: integer[] = [1, 2, 3, 4, 5];
      const hasEven = numbers.some((n) => n % 2 === 0);
      const hasNegative = numbers.some((n) => n < 0);
      
      console.log(hasEven);
      console.log(hasNegative);
    `,
    expectedOutput: 'true\nfalse\n'
  }),

  defineEquivalenceTest({
    name: 'Every - test if all match',
    code: `
      const numbers: integer[] = [2, 4, 6, 8];
      const allEven = numbers.every((n) => n % 2 === 0);
      const allPositive = numbers.every((n) => n > 0);
      const allLarge = numbers.every((n) => n > 10);
      
      console.log(allEven);
      console.log(allPositive);
      console.log(allLarge);
    `,
    expectedOutput: 'true\ntrue\nfalse\n'
  }),

  defineEquivalenceTest({
    name: 'Reverse array',
    code: `
      const numbers: integer[] = [1, 2, 3, 4, 5];
      const reversed = numbers.reverse();
      
      for (const num of reversed) {
        console.log(num);
      }
    `,
    expectedOutput: '5\n4\n3\n2\n1\n'
  }),

  defineEquivalenceTest({
    name: 'Slice with negative indices',
    code: `
      const numbers: integer[] = [1, 2, 3, 4, 5];
      const last2 = numbers.slice(-2);
      const middle = numbers.slice(1, -1);
      
      console.log(last2.join(","));
      console.log(middle.join(","));
    `,
    expectedOutput: '4,5\n2,3,4\n'
  }),

  defineEquivalenceTest({
    name: 'Concat multiple arrays',
    code: `
      const arr1: integer[] = [1, 2];
      const arr2: integer[] = [3, 4];
      const arr3: integer[] = [5, 6];
      const combined = arr1.concat(arr2).concat(arr3);
      
      console.log(combined.join(","));
    `,
    expectedOutput: '1,2,3,4,5,6\n'
  })
];
