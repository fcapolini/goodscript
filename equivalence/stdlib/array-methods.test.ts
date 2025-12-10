/**
 * Equivalence tests for array methods
 */

import { defineEquivalenceTest } from '../test-framework.js';

export const tests = [
  defineEquivalenceTest({
    name: 'Array push and pop',
    code: `
      const arr: integer[] = [1, 2];
      arr.push(3);
      console.log(arr.length);
      const popped: integer = arr.pop();
      console.log(popped);
      console.log(arr.length);
    `,
    expectedOutput: '3\n3\n2\n'
  }),

  defineEquivalenceTest({
    name: 'Array map',
    code: `
      const nums: integer[] = [1, 2, 3, 4];
      const doubled: integer[] = nums.map((x: integer): integer => x * 2);
      for (const n of doubled) {
        console.log(n);
      }
    `,
    expectedOutput: '2\n4\n6\n8\n'
  }),

  defineEquivalenceTest({
    name: 'Array filter',
    code: `
      const nums: integer[] = [1, 2, 3, 4, 5, 6];
      const evens: integer[] = nums.filter((x: integer): boolean => x % 2 === 0);
      for (const n of evens) {
        console.log(n);
      }
    `,
    expectedOutput: '2\n4\n6\n'
  }),

  defineEquivalenceTest({
    name: 'Array forEach',
    code: `
      const items: string[] = ["apple", "banana", "cherry"];
      items.forEach((item: string): void => {
        console.log(item);
      });
    `,
    expectedOutput: 'apple\nbanana\ncherry\n'
  }),

  defineEquivalenceTest({
    name: 'Array slice',
    code: `
      const arr: integer[] = [1, 2, 3, 4, 5];
      const sliced: integer[] = arr.slice(1, 4);
      console.log(sliced.length);
      for (const n of sliced) {
        console.log(n);
      }
    `,
    expectedOutput: '3\n2\n3\n4\n'
  }),

  defineEquivalenceTest({
    name: 'Array join',
    code: `
      const words: string[] = ["hello", "world", "test"];
      const joined: string = words.join(" ");
      console.log(joined);
      const comma: string = words.join(",");
      console.log(comma);
    `,
    expectedOutput: 'hello world test\nhello,world,test\n'
  }),

  defineEquivalenceTest({
    name: 'Array reverse',
    code: `
      const arr: integer[] = [1, 2, 3, 4, 5];
      arr.reverse();
      for (const n of arr) {
        console.log(n);
      }
    `,
    expectedOutput: '5\n4\n3\n2\n1\n'
  }),

  defineEquivalenceTest({
    name: 'Array concat',
    code: `
      const a: integer[] = [1, 2];
      const b: integer[] = [3, 4];
      const c: integer[] = a.concat(b);
      console.log(c.length);
      for (const n of c) {
        console.log(n);
      }
    `,
    expectedOutput: '4\n1\n2\n3\n4\n'
  }),

  defineEquivalenceTest({
    name: 'Array includes',
    code: `
      const arr: integer[] = [1, 2, 3, 4, 5];
      console.log(arr.includes(3));
      console.log(arr.includes(10));
    `,
    expectedOutput: 'true\nfalse\n'
  }),

  defineEquivalenceTest({
    name: 'Array indexOf',
    code: `
      const arr: string[] = ["a", "b", "c", "b"];
      console.log(arr.indexOf("b"));
      console.log(arr.indexOf("c"));
      console.log(arr.indexOf("z"));
    `,
    expectedOutput: '1\n2\n-1\n'
  })
];
