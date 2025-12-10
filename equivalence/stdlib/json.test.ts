/**
 * Equivalence tests for JSON operations
 */

import { defineEquivalenceTest } from '../test-framework.js';

export const tests = [
  defineEquivalenceTest({
    name: 'JSON.stringify number',
    code: `
      console.log(JSON.stringify(42));
      console.log(JSON.stringify(3.14));
    `,
    expectedOutput: '42\n3.14\n'
  }),

  defineEquivalenceTest({
    name: 'JSON.stringify string',
    code: `
      console.log(JSON.stringify("hello"));
      console.log(JSON.stringify("world"));
    `,
    expectedOutput: '"hello"\n"world"\n'
  }),

  defineEquivalenceTest({
    name: 'JSON.stringify boolean',
    code: `
      console.log(JSON.stringify(true));
      console.log(JSON.stringify(false));
    `,
    expectedOutput: 'true\nfalse\n'
  }),

  defineEquivalenceTest({
    name: 'JSON.stringify empty string',
    code: `
      console.log(JSON.stringify(""));
    `,
    expectedOutput: '""\n'
  }),

  defineEquivalenceTest({
    name: 'JSON.stringify zero',
    code: `
      console.log(JSON.stringify(0));
    `,
    expectedOutput: '0\n'
  }),

  defineEquivalenceTest({
    name: 'JSON.stringify negative number',
    code: `
      console.log(JSON.stringify(-123));
    `,
    expectedOutput: '-123\n'
  })
];
