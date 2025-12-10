/**
 * Equivalence tests for string operations
 */

import { defineEquivalenceTest } from '../test-framework.js';

export const tests = [
  defineEquivalenceTest({
    name: 'String concatenation',
    code: `
      const hello: string = "Hello";
      const world: string = "World";
      console.log(hello + " " + world);
    `,
    expectedOutput: 'Hello World\n'
  }),

  defineEquivalenceTest({
    name: 'String length',
    code: `
      const str: string = "GoodScript";
      console.log(str.length);
    `,
    expectedOutput: '10\n'
  }),

  defineEquivalenceTest({
    name: 'Empty string',
    code: `
      const empty: string = "";
      console.log(empty.length);
      console.log(empty + "test");
    `,
    expectedOutput: '0\ntest\n'
  }),

  defineEquivalenceTest({
    name: 'Template literals',
    code: `
      const name: string = "Alice";
      const age: integer = 30;
      const message: string = \`\${name} is \${age} years old\`;
      console.log(message);
    `,
    expectedOutput: 'Alice is 30 years old\n'
  }),

  defineEquivalenceTest({
    name: 'String slice',
    code: `
      const str: string = "Hello World";
      console.log(str.slice(0, 5));
      console.log(str.slice(6));
    `,
    expectedOutput: 'Hello\nWorld\n'
  }),

  defineEquivalenceTest({
    name: 'String toLowerCase/toUpperCase',
    code: `
      const str: string = "GoodScript";
      console.log(str.toLowerCase());
      console.log(str.toUpperCase());
    `,
    expectedOutput: 'goodscript\nGOODSCRIPT\n'
  }),

  defineEquivalenceTest({
    name: 'Unicode string',
    code: `
      const emoji: string = "Hello 👋 World 🌍";
      console.log(emoji);
    `,
    expectedOutput: 'Hello 👋 World 🌍\n'
  }),
];
