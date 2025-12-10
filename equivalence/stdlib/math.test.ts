/**
 * Equivalence tests for Math operations
 */

import { defineEquivalenceTest } from '../test-framework.js';

export const tests = [
  defineEquivalenceTest({
    name: 'Math.abs',
    code: `
      console.log(Math.abs(-5));
      console.log(Math.abs(5));
      console.log(Math.abs(0));
    `,
    expectedOutput: '5\n5\n0\n'
  }),

  defineEquivalenceTest({
    name: 'Math.min',
    code: `
      console.log(Math.min(5, 3));
      console.log(Math.min(-1, -5));
      console.log(Math.min(0, 0));
    `,
    expectedOutput: '3\n-5\n0\n'
  }),

  defineEquivalenceTest({
    name: 'Math.max',
    code: `
      console.log(Math.max(5, 3));
      console.log(Math.max(-1, -5));
      console.log(Math.max(0, 0));
    `,
    expectedOutput: '5\n-1\n0\n'
  }),

  defineEquivalenceTest({
    name: 'Math.floor',
    code: `
      console.log(Math.floor(3.7));
      console.log(Math.floor(3.2));
      console.log(Math.floor(-3.7));
    `,
    expectedOutput: '3\n3\n-4\n'
  }),

  defineEquivalenceTest({
    name: 'Math.ceil',
    code: `
      console.log(Math.ceil(3.2));
      console.log(Math.ceil(3.7));
      console.log(Math.ceil(-3.2));
    `,
    expectedOutput: '4\n4\n-3\n'
  }),

  defineEquivalenceTest({
    name: 'Math.round',
    code: `
      console.log(Math.round(3.4));
      console.log(Math.round(3.5));
      console.log(Math.round(3.6));
      console.log(Math.round(-3.5));
    `,
    expectedOutput: '3\n4\n4\n-3\n'
  }),

  defineEquivalenceTest({
    name: 'Math.sqrt',
    code: `
      console.log(Math.sqrt(4));
      console.log(Math.sqrt(9));
      console.log(Math.sqrt(16));
    `,
    expectedOutput: '2\n3\n4\n'
  }),

  defineEquivalenceTest({
    name: 'Math.pow',
    code: `
      console.log(Math.pow(2, 3));
      console.log(Math.pow(5, 2));
      console.log(Math.pow(10, 0));
    `,
    expectedOutput: '8\n25\n1\n'
  }),

  defineEquivalenceTest({
    name: 'Math.PI',
    code: `
      const pi: number = Math.PI;
      console.log(Math.floor(pi * 1000));
    `,
    expectedOutput: '3141\n'
  }),

  defineEquivalenceTest({
    name: 'Math.E',
    code: `
      const e: number = Math.E;
      console.log(Math.floor(e * 1000));
    `,
    expectedOutput: '2718\n'
  }),

  defineEquivalenceTest({
    name: 'Math operations in expression',
    code: `
      const result: number = Math.pow(Math.sqrt(16), 2);
      console.log(result);
    `,
    expectedOutput: '16\n'
  })
];
