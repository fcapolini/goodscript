/**
 * Equivalence tests for operator precedence and associativity
 */

import { defineEquivalenceTest } from '../test-framework.js';

export const tests = [
  defineEquivalenceTest({
    name: 'Multiplication before addition',
    code: `
      const result: integer = 2 + 3 * 4;
      console.log(result);
    `,
    expectedOutput: '14\n'
  }),

  defineEquivalenceTest({
    name: 'Parentheses override precedence',
    code: `
      const result: integer = (2 + 3) * 4;
      console.log(result);
    `,
    expectedOutput: '20\n'
  }),

  defineEquivalenceTest({
    name: 'Division before subtraction',
    code: `
      const result: integer = 10 - 8 / 2;
      console.log(result);
    `,
    expectedOutput: '6\n'
  }),

  defineEquivalenceTest({
    name: 'Left-to-right associativity',
    code: `
      const result: integer = 20 - 10 - 5;
      console.log(result);
    `,
    expectedOutput: '5\n'
  }),

  defineEquivalenceTest({
    name: 'Comparison and logical operators',
    code: `
      const result: boolean = 5 > 3 && 10 < 20;
      console.log(result);
    `,
    expectedOutput: 'true\n'
  }),

  defineEquivalenceTest({
    name: 'Comparison before logical AND',
    code: `
      const result: boolean = 5 > 3 && 2 < 1;
      console.log(result);
    `,
    expectedOutput: 'false\n'
  }),

  defineEquivalenceTest({
    name: 'Logical OR precedence',
    code: `
      const result: boolean = false || true && false;
      console.log(result);
    `,
    expectedOutput: 'false\n'
  }),

  defineEquivalenceTest({
    name: 'Unary minus precedence',
    code: `
      const x: integer = 5;
      const result: integer = -x * 2;
      console.log(result);
    `,
    expectedOutput: '-10\n'
  }),

  defineEquivalenceTest({
    name: 'Complex expression',
    code: `
      const result: integer = 2 * 3 + 4 * 5 - 6 / 2;
      console.log(result);
    `,
    expectedOutput: '23\n'
  }),

  defineEquivalenceTest({
    name: 'Modulo with multiplication',
    code: `
      const result: integer = 17 % 5 * 2;
      console.log(result);
    `,
    expectedOutput: '4\n'
  })
];
