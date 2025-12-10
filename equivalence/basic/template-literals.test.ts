/**
 * Equivalence tests for template literals and string interpolation
 */

import { defineEquivalenceTest } from '../test-framework.js';

export const tests = [
  defineEquivalenceTest({
    name: 'Simple template literal',
    code: `
      const name: string = "Alice";
      const greeting: string = \`Hello, \${name}!\`;
      console.log(greeting);
    `,
    expectedOutput: 'Hello, Alice!\n'
  }),

  defineEquivalenceTest({
    name: 'Template literal with numbers',
    code: `
      const x: integer = 10;
      const y: integer = 20;
      const result: string = \`\${x} + \${y} = \${x + y}\`;
      console.log(result);
    `,
    expectedOutput: '10 + 20 = 30\n'
  }),

  defineEquivalenceTest({
    name: 'Template literal with expression',
    code: `
      const price: number = 19.99;
      const quantity: integer = 3;
      const total: string = \`Total: $\${price * quantity}\`;
      console.log(total);
    `,
    expectedOutput: 'Total: $59.97\n'
  }),

  defineEquivalenceTest({
    name: 'Nested template literals',
    code: `
      const first: string = "John";
      const last: string = "Doe";
      const fullName: string = \`\${first} \${last}\`;
      const message: string = \`Name: \${fullName}\`;
      console.log(message);
    `,
    expectedOutput: 'Name: John Doe\n'
  }),

  defineEquivalenceTest({
    name: 'Template literal with boolean',
    code: `
      const isActive: boolean = true;
      const status: string = \`Status: \${isActive}\`;
      console.log(status);
    `,
    expectedOutput: 'Status: true\n'
  }),

  defineEquivalenceTest({
    name: 'Multi-line template literal',
    code: `
      const lines: string = \`Line 1
Line 2
Line 3\`;
      console.log(lines);
    `,
    expectedOutput: 'Line 1\nLine 2\nLine 3\n'
  }),

  defineEquivalenceTest({
    name: 'Empty interpolation',
    code: `
      const empty: string = "";
      const result: string = \`Value: \${empty}\`;
      console.log(result);
    `,
    expectedOutput: 'Value: \n'
  })
];
