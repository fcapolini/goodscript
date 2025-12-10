/**
 * Equivalence tests for number edge cases
 */

import { defineEquivalenceTest } from '../test-framework.js';

export const tests = [
  defineEquivalenceTest({
    name: 'Zero arithmetic',
    code: `
      console.log(0 + 0);
      console.log(0 * 5);
      console.log(5 * 0);
      console.log(0 - 0);
    `,
    expectedOutput: '0\n0\n0\n0\n'
  }),

  defineEquivalenceTest({
    name: 'Negative numbers',
    code: `
      const neg: integer = -5;
      console.log(neg);
      console.log(neg + 3);
      console.log(neg * 2);
    `,
    expectedOutput: '-5\n-2\n-10\n'
  }),

  defineEquivalenceTest({
    name: 'Integer overflow safe',
    code: `
      const large: integer = 1000000;
      const result: integer = large * 2;
      console.log(result);
    `,
    expectedOutput: '2000000\n'
  }),

  defineEquivalenceTest({
    name: 'Float precision',
    code: `
      const a: number = 0.1;
      const b: number = 0.2;
      const sum: number = a + b;
      console.log(sum);
    `,
    expectedOutput: '0.30000000000000004\n'
  }),

  defineEquivalenceTest({
    name: 'Integer division truncation',
    code: `
      const a: integer = 7;
      const b: integer = 2;
      const result: number = a / b;
      console.log(result);
    `,
    expectedOutput: '3.5\n'
  }),

  defineEquivalenceTest({
    name: 'Modulo with negatives',
    code: `
      console.log(17 % 5);
      console.log(-17 % 5);
      console.log(17 % -5);
    `,
    expectedOutput: '2\n-2\n2\n'
  }),

  defineEquivalenceTest({
    name: 'Number comparison',
    code: `
      console.log(5 > 3);
      console.log(3 > 5);
      console.log(5 === 5);
      console.log(5 !== 3);
    `,
    expectedOutput: 'true\nfalse\ntrue\ntrue\n'
  }),

  defineEquivalenceTest({
    name: 'Boolean arithmetic context',
    code: `
      const isPositive: boolean = 5 > 0;
      const isNegative: boolean = 5 < 0;
      console.log(isPositive);
      console.log(isNegative);
    `,
    expectedOutput: 'true\nfalse\n'
  })
];
