/**
 * Equivalence tests for basic arithmetic operations
 */

import { defineEquivalenceTest } from '../test-framework.js';

export const tests = [
  defineEquivalenceTest({
    name: 'Integer addition',
    code: `
      function add(a: integer, b: integer): integer {
        return a + b;
      }
      console.log(add(5, 3));
    `,
    expectedOutput: '8\n'
  }),

  defineEquivalenceTest({
    name: 'Integer subtraction',
    code: `
      const result: integer = 10 - 7;
      console.log(result);
    `,
    expectedOutput: '3\n'
  }),

  defineEquivalenceTest({
    name: 'Integer multiplication',
    code: `
      const result: integer = 6 * 7;
      console.log(result);
    `,
    expectedOutput: '42\n'
  }),

  defineEquivalenceTest({
    name: 'Floating-point division',
    code: `
      const result: number = 10 / 3;
      console.log(result);
    `,
    expectedOutput: '3.3333333333333335\n'
  }),

  defineEquivalenceTest({
    name: 'Modulo operation',
    code: `
      const result: integer = 17 % 5;
      console.log(result);
    `,
    expectedOutput: '2\n'
  }),

  defineEquivalenceTest({
    name: 'Negative numbers',
    code: `
      const a: integer = -5;
      const b: integer = -3;
      console.log(a + b);
      console.log(a * b);
    `,
    expectedOutput: '-8\n15\n'
  }),

  defineEquivalenceTest({
    name: 'Order of operations',
    code: `
      const result: integer = 2 + 3 * 4;
      console.log(result);
    `,
    expectedOutput: '14\n'
  }),

  defineEquivalenceTest({
    name: 'Integer overflow boundary (integer53)',
    code: `
      const max: integer53 = 9007199254740991;  // 2^53 - 1
      console.log(max);
    `,
    expectedOutput: '9007199254740991\n'
  }),
];
