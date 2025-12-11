/**
 * Nested Control Flow Equivalence Tests
 * 
 * Tests nested loops, breaks, continues, and complex control structures
 */

import { defineEquivalenceTest, type EquivalenceTest } from '../test-framework.js';

export const tests: EquivalenceTest[] = [
  defineEquivalenceTest({
    name: 'Nested for loops - 2 levels',
    code: `
      for (let i: integer = 0; i < 3; i = i + 1) {
        for (let j: integer = 0; j < 2; j = j + 1) {
          console.log(i.toString() + "," + j.toString());
        }
      }
    `,
    expectedOutput: '0,0\n0,1\n1,0\n1,1\n2,0\n2,1\n'
  }),

  defineEquivalenceTest({
    name: 'Nested for loops - 3 levels',
    code: `
      for (let i: integer = 0; i < 2; i = i + 1) {
        for (let j: integer = 0; j < 2; j = j + 1) {
          for (let k: integer = 0; k < 2; k = k + 1) {
            console.log(i.toString() + j.toString() + k.toString());
          }
        }
      }
    `,
    expectedOutput: '000\n001\n010\n011\n100\n101\n110\n111\n'
  }),

  defineEquivalenceTest({
    name: 'for-of inside for',
    code: `
      const arrays: integer[][] = [[1, 2], [3, 4]];
      
      for (let i: integer = 0; i < arrays.length; i = i + 1) {
        for (const item of arrays[i]) {
          console.log(item);
        }
      }
    `,
    expectedOutput: '1\n2\n3\n4\n'
  }),

  defineEquivalenceTest({
    name: 'for inside while',
    code: `
      let outer: integer = 0;
      while (outer < 2) {
        for (let inner: integer = 0; inner < 3; inner = inner + 1) {
          console.log(outer.toString() + "-" + inner.toString());
        }
        outer = outer + 1;
      }
    `,
    expectedOutput: '0-0\n0-1\n0-2\n1-0\n1-1\n1-2\n'
  }),

  defineEquivalenceTest({
    name: 'Break in nested loop',
    code: `
      for (let i: integer = 0; i < 3; i = i + 1) {
        for (let j: integer = 0; j < 3; j = j + 1) {
          if (j === 2) {
            break;
          }
          console.log(i.toString() + "," + j.toString());
        }
      }
    `,
    expectedOutput: '0,0\n0,1\n1,0\n1,1\n2,0\n2,1\n'
  }),

  defineEquivalenceTest({
    name: 'Continue in nested loop',
    code: `
      for (let i: integer = 0; i < 3; i = i + 1) {
        for (let j: integer = 0; j < 3; j = j + 1) {
          if (j === 1) {
            continue;
          }
          console.log(i.toString() + "," + j.toString());
        }
      }
    `,
    expectedOutput: '0,0\n0,2\n1,0\n1,2\n2,0\n2,2\n'
  }),

  defineEquivalenceTest({
    name: 'Multiple breaks and continues',
    code: `
      for (let i: integer = 0; i < 4; i = i + 1) {
        if (i === 3) {
          break;
        }
        if (i === 1) {
          continue;
        }
        console.log(i);
      }
    `,
    expectedOutput: '0\n2\n'
  }),

  defineEquivalenceTest({
    name: 'Try/catch inside loop',
    code: `
      const values: integer[] = [1, 0, 2];
      
      for (const val of values) {
        try {
          if (val === 0) {
            throw new Error("zero");
          }
          console.log(val);
        } catch (e) {
          console.log("error");
        }
      }
    `,
    expectedOutput: '1\nerror\n2\n'
  }),

  defineEquivalenceTest({
    name: 'Nested if-else chains',
    code: `
      function classify(a: integer, b: integer): string {
        if (a > 0) {
          if (b > 0) {
            return "both positive";
          } else if (b < 0) {
            return "a positive, b negative";
          } else {
            return "a positive, b zero";
          }
        } else if (a < 0) {
          if (b > 0) {
            return "a negative, b positive";
          } else {
            return "both negative or zero";
          }
        } else {
          return "a is zero";
        }
      }
      
      console.log(classify(1, 1));
      console.log(classify(1, -1));
      console.log(classify(-1, 1));
      console.log(classify(0, 5));
    `,
    expectedOutput: 'both positive\na positive, b negative\na negative, b positive\na is zero\n'
  }),

  defineEquivalenceTest({
    name: 'Matrix multiplication pattern',
    code: `
      const a: integer[][] = [[1, 2], [3, 4]];
      const b: integer[][] = [[5, 6], [7, 8]];
      
      for (let i: integer = 0; i < 2; i = i + 1) {
        for (let j: integer = 0; j < 2; j = j + 1) {
          let sum: integer = 0;
          for (let k: integer = 0; k < 2; k = k + 1) {
            sum = sum + a[i][k] * b[k][j];
          }
          console.log(sum);
        }
      }
    `,
    expectedOutput: '19\n22\n43\n50\n'
  })
];
