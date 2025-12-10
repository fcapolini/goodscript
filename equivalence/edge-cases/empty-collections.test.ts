/**
 * Equivalence tests for empty collections
 */

import { defineEquivalenceTest } from '../test-framework.js';

export const tests = [
  defineEquivalenceTest({
    name: 'Empty array length',
    code: `
      const arr: integer[] = [];
      console.log(arr.length);
    `,
    expectedOutput: '0\n'
  }),

  defineEquivalenceTest({
    name: 'Empty array for-of',
    code: `
      const arr: string[] = [];
      for (const item of arr) {
        console.log("This should not print");
      }
      console.log("done");
    `,
    expectedOutput: 'done\n'
  }),

  defineEquivalenceTest({
    name: 'Empty string operations',
    code: `
      const empty: string = "";
      console.log(empty.length);
      console.log(empty + "test");
      console.log("test" + empty);
    `,
    expectedOutput: '0\ntest\ntest\n'
  }),

  defineEquivalenceTest({
    name: 'Empty Map',
    code: `
      const map = new Map<string, integer>();
      console.log(map.size);
      console.log(map.has("anything"));
    `,
    expectedOutput: '0\nfalse\n'
  }),

  defineEquivalenceTest({
    name: 'Empty Map iteration',
    code: `
      const map = new Map<string, integer>();
      for (const key of map.keys()) {
        console.log("This should not print");
      }
      console.log("done");
    `,
    expectedOutput: 'done\n'
  }),

  defineEquivalenceTest({
    name: 'Array push to empty',
    code: `
      const arr: integer[] = [];
      console.log(arr.length);
      arr.push(1);
      console.log(arr.length);
      console.log(arr[0]);
    `,
    expectedOutput: '0\n1\n1\n'
  }),

  defineEquivalenceTest({
    name: 'Map set on empty',
    code: `
      const map = new Map<string, string>();
      console.log(map.size);
      map.set("key", "value");
      console.log(map.size);
      console.log(map.get("key"));
    `,
    expectedOutput: '0\n1\nvalue\n'
  })
];
