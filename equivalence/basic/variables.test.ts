/**
 * Equivalence tests for variable declarations and scoping
 */

import { defineEquivalenceTest } from '../test-framework.js';

export const tests = [
  defineEquivalenceTest({
    name: 'const declaration',
    code: `
      const x: integer = 42;
      console.log(x);
    `,
    expectedOutput: '42\n'
  }),

  defineEquivalenceTest({
    name: 'let declaration',
    code: `
      let x: integer = 10;
      console.log(x);
      x = 20;
      console.log(x);
    `,
    expectedOutput: '10\n20\n'
  }),

  defineEquivalenceTest({
    name: 'Block scoping',
    code: `
      let x: integer = 1;
      {
        let x: integer = 2;
        console.log(x);
      }
      console.log(x);
    `,
    expectedOutput: '2\n1\n'
  }),

  defineEquivalenceTest({
    name: 'Function parameter scope',
    code: `
      const x: integer = 100;
      function test(x: integer): void {
        console.log(x);
      }
      test(200);
      console.log(x);
    `,
    expectedOutput: '200\n100\n'
  }),

  defineEquivalenceTest({
    name: 'Loop variable scope',
    code: `
      for (let i: integer = 0; i < 3; i = i + 1) {
        console.log(i);
      }
      // i is not accessible here
      console.log("done");
    `,
    expectedOutput: '0\n1\n2\ndone\n'
  }),

  defineEquivalenceTest({
    name: 'Multiple declarations',
    code: `
      const a: integer = 1;
      const b: integer = 2;
      const c: integer = 3;
      console.log(a);
      console.log(b);
      console.log(c);
    `,
    expectedOutput: '1\n2\n3\n'
  }),

  defineEquivalenceTest({
    name: 'Reassignment in loop',
    code: `
      let sum: integer = 0;
      for (let i: integer = 1; i <= 5; i = i + 1) {
        sum = sum + i;
      }
      console.log(sum);
    `,
    expectedOutput: '15\n'
  })
];
