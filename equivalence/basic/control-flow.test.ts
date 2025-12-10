/**
 * Equivalence tests for control flow statements
 */

import { defineEquivalenceTest } from '../test-framework.js';

export const tests = [
  defineEquivalenceTest({
    name: 'Simple if statement',
    code: `
      const x: integer = 10;
      if (x > 5) {
        console.log("x is greater than 5");
      }
    `,
    expectedOutput: 'x is greater than 5\n'
  }),

  defineEquivalenceTest({
    name: 'If-else statement',
    code: `
      function checkNumber(n: integer): void {
        if (n > 0) {
          console.log("positive");
        } else {
          console.log("non-positive");
        }
      }
      checkNumber(5);
      checkNumber(-3);
      checkNumber(0);
    `,
    expectedOutput: 'positive\nnon-positive\nnon-positive\n'
  }),

  defineEquivalenceTest({
    name: 'If-else-if chain',
    code: `
      function classify(n: integer): void {
        if (n > 0) {
          console.log("positive");
        } else if (n < 0) {
          console.log("negative");
        } else {
          console.log("zero");
        }
      }
      classify(10);
      classify(-5);
      classify(0);
    `,
    expectedOutput: 'positive\nnegative\nzero\n'
  }),

  defineEquivalenceTest({
    name: 'While loop',
    code: `
      let i: integer = 0;
      while (i < 5) {
        console.log(i);
        i = i + 1;
      }
    `,
    expectedOutput: '0\n1\n2\n3\n4\n'
  }),

  defineEquivalenceTest({
    name: 'Traditional for loop',
    code: `
      for (let i: integer = 0; i < 5; i = i + 1) {
        console.log(i);
      }
    `,
    expectedOutput: '0\n1\n2\n3\n4\n'
  }),

  defineEquivalenceTest({
    name: 'For loop with step',
    code: `
      for (let i: integer = 0; i < 10; i = i + 2) {
        console.log(i);
      }
    `,
    expectedOutput: '0\n2\n4\n6\n8\n'
  }),

  defineEquivalenceTest({
    name: 'For-of loop with array',
    code: `
      const items: string[] = ["apple", "banana", "cherry"];
      for (const item of items) {
        console.log(item);
      }
    `,
    expectedOutput: 'apple\nbanana\ncherry\n'
  }),

  defineEquivalenceTest({
    name: 'Break statement',
    code: `
      for (let i: integer = 0; i < 10; i = i + 1) {
        if (i === 5) {
          break;
        }
        console.log(i);
      }
    `,
    expectedOutput: '0\n1\n2\n3\n4\n'
  }),

  defineEquivalenceTest({
    name: 'Continue statement',
    code: `
      for (let i: integer = 0; i < 5; i = i + 1) {
        if (i === 2) {
          continue;
        }
        console.log(i);
      }
    `,
    expectedOutput: '0\n1\n3\n4\n'
  }),

  defineEquivalenceTest({
    name: 'Nested loops',
    code: `
      for (let i: integer = 1; i <= 3; i = i + 1) {
        for (let j: integer = 1; j <= 3; j = j + 1) {
          console.log(\`\${i},\${j}\`);
        }
      }
    `,
    expectedOutput: '1,1\n1,2\n1,3\n2,1\n2,2\n2,3\n3,1\n3,2\n3,3\n'
  }),

  defineEquivalenceTest({
    name: 'Switch statement',
    code: `
      function getDayType(day: integer): void {
        switch (day) {
          case 1:
          case 7:
            console.log("weekend");
            break;
          case 2:
          case 3:
          case 4:
          case 5:
          case 6:
            console.log("weekday");
            break;
          default:
            console.log("invalid");
            break;
        }
      }
      getDayType(1);
      getDayType(3);
      getDayType(7);
      getDayType(10);
    `,
    expectedOutput: 'weekend\nweekday\nweekend\ninvalid\n'
  })
];
