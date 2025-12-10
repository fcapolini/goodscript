/**
 * Equivalence tests for type system features
 */

import { defineEquivalenceTest } from '../test-framework.js';

export const tests = [
  defineEquivalenceTest({
    name: 'typeof operator',
    code: `
      const num: number = 42;
      const str: string = "hello";
      const bool: boolean = true;
      console.log(typeof num);
      console.log(typeof str);
      console.log(typeof bool);
    `,
    expectedOutput: 'number\nstring\nboolean\n'
  }),

  defineEquivalenceTest({
    name: 'Number instance methods - toFixed',
    code: `
      const num: number = 3.14159;
      console.log(num.toFixed(2));
      console.log(num.toFixed(0));
      console.log(num.toFixed(4));
    `,
    expectedOutput: '3.14\n3\n3.1416\n'
  }),

  defineEquivalenceTest({
    name: 'Number instance methods - toString',
    code: `
      const num: number = 42;
      console.log(num.toString());
      const neg: number = -17;
      console.log(neg.toString());
    `,
    expectedOutput: '42\n-17\n'
  }),

  defineEquivalenceTest({
    name: 'Integer vs Number',
    code: `
      const int: integer = 10;
      const num: number = 10.5;
      console.log(int);
      console.log(num);
      const sum: number = int + num;
      console.log(sum);
    `,
    expectedOutput: '10\n10.5\n20.5\n'
  }),

  defineEquivalenceTest({
    name: 'Type coercion in concatenation',
    code: `
      const num: integer = 42;
      const str: string = "The answer is " + num;
      console.log(str);
    `,
    expectedOutput: 'The answer is 42\n'
  }),

  defineEquivalenceTest({
    name: 'Array type preservation',
    code: `
      const numbers: integer[] = [1, 2, 3];
      const strings: string[] = ["a", "b", "c"];
      console.log(numbers.length);
      console.log(strings.length);
      console.log(numbers[0]);
      console.log(strings[0]);
    `,
    expectedOutput: '3\n3\n1\na\n'
  })
];
