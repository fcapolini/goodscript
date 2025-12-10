/**
 * Equivalence tests for Date operations
 */

import { defineEquivalenceTest } from '../test-framework.js';

export const tests = [
  defineEquivalenceTest({
    name: 'Date.now returns a number',
    code: `
      const timestamp: number = Date.now();
      console.log(typeof timestamp);
    `,
    expectedOutput: 'number\n'
  }),

  defineEquivalenceTest({
    name: 'Date.now is positive',
    code: `
      const timestamp: number = Date.now();
      console.log(timestamp > 0);
    `,
    expectedOutput: 'true\n'
  }),

  defineEquivalenceTest({
    name: 'Date.now measures elapsed time',
    code: `
      const start: number = Date.now();
      let sum: integer = 0;
      for (let i: integer = 0; i < 1000; i = i + 1) {
        sum = sum + i;
      }
      const end: number = Date.now();
      const elapsed: number = end - start;
      console.log(elapsed >= 0);
      console.log(sum);
    `,
    expectedOutput: 'true\n499500\n'
  }),

  defineEquivalenceTest({
    name: 'Date.now in expressions',
    code: `
      const t1: number = Date.now();
      const t2: number = Date.now();
      const diff: number = t2 - t1;
      console.log(diff >= 0);
    `,
    expectedOutput: 'true\n'
  })
];
