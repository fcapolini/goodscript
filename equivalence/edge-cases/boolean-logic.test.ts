/**
 * Equivalence tests for boolean logic
 */

import { defineEquivalenceTest } from '../test-framework.js';

export const tests = [
  defineEquivalenceTest({
    name: 'Boolean AND',
    code: `
      console.log(true && true);
      console.log(true && false);
      console.log(false && true);
      console.log(false && false);
    `,
    expectedOutput: 'true\nfalse\nfalse\nfalse\n'
  }),

  defineEquivalenceTest({
    name: 'Boolean OR',
    code: `
      console.log(true || true);
      console.log(true || false);
      console.log(false || true);
      console.log(false || false);
    `,
    expectedOutput: 'true\ntrue\ntrue\nfalse\n'
  }),

  defineEquivalenceTest({
    name: 'Boolean NOT',
    code: `
      console.log(!true);
      console.log(!false);
      console.log(!!true);
    `,
    expectedOutput: 'false\ntrue\ntrue\n'
  }),

  defineEquivalenceTest({
    name: 'Boolean comparison operators',
    code: `
      console.log(5 > 3);
      console.log(3 > 5);
      console.log(5 >= 5);
      console.log(3 < 5);
      console.log(5 <= 5);
    `,
    expectedOutput: 'true\nfalse\ntrue\ntrue\ntrue\n'
  }),

  defineEquivalenceTest({
    name: 'Strict equality',
    code: `
      console.log(5 === 5);
      console.log(5 !== 3);
      console.log("hello" === "hello");
      console.log("hello" !== "world");
    `,
    expectedOutput: 'true\ntrue\ntrue\ntrue\n'
  }),

  defineEquivalenceTest({
    name: 'Boolean in conditionals',
    code: `
      const a: boolean = true;
      const b: boolean = false;
      if (a && !b) {
        console.log("correct");
      } else {
        console.log("incorrect");
      }
    `,
    expectedOutput: 'correct\n'
  }),

  defineEquivalenceTest({
    name: 'Short-circuit AND',
    code: `
      function getTrue(): boolean {
        console.log("getTrue called");
        return true;
      }
      function getFalse(): boolean {
        console.log("getFalse called");
        return false;
      }
      const result: boolean = getFalse() && getTrue();
      console.log(result);
    `,
    expectedOutput: 'getFalse called\nfalse\n'
  }),

  defineEquivalenceTest({
    name: 'Short-circuit OR',
    code: `
      function getTrue(): boolean {
        console.log("getTrue called");
        return true;
      }
      function getFalse(): boolean {
        console.log("getFalse called");
        return false;
      }
      const result: boolean = getTrue() || getFalse();
      console.log(result);
    `,
    expectedOutput: 'getTrue called\ntrue\n'
  }),

  defineEquivalenceTest({
    name: 'Complex boolean expression',
    code: `
      const a: boolean = true;
      const b: boolean = false;
      const c: boolean = true;
      const result: boolean = (a || b) && c;
      console.log(result);
    `,
    expectedOutput: 'true\n'
  })
];
