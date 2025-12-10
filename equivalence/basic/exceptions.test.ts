/**
 * Equivalence tests for exception handling
 */

import { defineEquivalenceTest } from '../test-framework.js';

export const tests = [
  defineEquivalenceTest({
    name: 'Simple try-catch',
    code: `
      try {
        console.log("before throw");
        throw "error message";
        console.log("after throw");
      } catch (e) {
        console.log("caught: " + e);
      }
      console.log("after catch");
    `,
    expectedOutput: 'before throw\ncaught: error message\nafter catch\n'
  }),

  defineEquivalenceTest({
    name: 'Try-finally',
    code: `
      try {
        console.log("try block");
      } finally {
        console.log("finally block");
      }
      console.log("after try-finally");
    `,
    expectedOutput: 'try block\nfinally block\nafter try-finally\n'
  }),

  defineEquivalenceTest({
    name: 'Try-catch-finally',
    code: `
      try {
        console.log("try");
        throw "error";
      } catch (e) {
        console.log("catch: " + e);
      } finally {
        console.log("finally");
      }
      console.log("done");
    `,
    expectedOutput: 'try\ncatch: error\nfinally\ndone\n'
  }),

  defineEquivalenceTest({
    name: 'Nested try-catch',
    code: `
      try {
        console.log("outer try");
        try {
          console.log("inner try");
          throw "inner error";
        } catch (e) {
          console.log("inner catch: " + e);
        }
        console.log("after inner");
      } catch (e) {
        console.log("outer catch");
      }
    `,
    expectedOutput: 'outer try\ninner try\ninner catch: inner error\nafter inner\n'
  }),

  defineEquivalenceTest({
    name: 'Exception in function',
    code: `
      function mayThrow(shouldThrow: boolean): void {
        if (shouldThrow) {
          throw "function error";
        }
        console.log("no error");
      }
      
      try {
        mayThrow(false);
        mayThrow(true);
      } catch (e) {
        console.log("caught: " + e);
      }
    `,
    expectedOutput: 'no error\ncaught: function error\n'
  }),

  defineEquivalenceTest({
    name: 'Finally executes on throw',
    code: `
      let cleaned: boolean = false;
      try {
        throw "error";
      } catch (e) {
        console.log("caught: " + e);
      } finally {
        cleaned = true;
        console.log("cleaned up");
      }
      console.log(cleaned);
    `,
    expectedOutput: 'caught: error\ncleaned up\ntrue\n'
  })
];
