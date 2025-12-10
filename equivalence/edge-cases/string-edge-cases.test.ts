/**
 * Equivalence tests for string edge cases
 */

import { defineEquivalenceTest } from '../test-framework.js';

export const tests = [
  defineEquivalenceTest({
    name: 'String with special characters',
    code: `
      const str: string = "Hello\\nWorld";
      console.log(str);
    `,
    expectedOutput: 'Hello\nWorld\n'
  }),

  defineEquivalenceTest({
    name: 'String with quotes',
    code: `
      const str: string = 'He said "Hello"';
      console.log(str);
    `,
    expectedOutput: 'He said "Hello"\n'
  }),

  defineEquivalenceTest({
    name: 'String concatenation chain',
    code: `
      const result: string = "a" + "b" + "c" + "d";
      console.log(result);
    `,
    expectedOutput: 'abcd\n'
  }),

  defineEquivalenceTest({
    name: 'String slice edge cases',
    code: `
      const str: string = "hello";
      console.log(str.slice(0, 2));
      console.log(str.slice(2));
      console.log(str.slice(0, 0));
    `,
    expectedOutput: 'he\nllo\n\n'
  }),

  defineEquivalenceTest({
    name: 'String indexOf not found',
    code: `
      const str: string = "hello world";
      console.log(str.indexOf("xyz"));
      console.log(str.indexOf("hello"));
    `,
    expectedOutput: '-1\n0\n'
  }),

  defineEquivalenceTest({
    name: 'String split edge cases',
    code: `
      const str: string = "a,b,c";
      const parts: string[] = str.split(",");
      console.log(parts.length);
      for (const part of parts) {
        console.log(part);
      }
    `,
    expectedOutput: '3\na\nb\nc\n'
  }),

  defineEquivalenceTest({
    name: 'String split empty delimiter',
    code: `
      const str: string = "abc";
      const chars: string[] = str.split("");
      console.log(chars.length);
      for (const char of chars) {
        console.log(char);
      }
    `,
    expectedOutput: '3\na\nb\nc\n'
  }),

  defineEquivalenceTest({
    name: 'String trim whitespace',
    code: `
      const str1: string = "  hello  ";
      const str2: string = str1.trim();
      console.log(str2);
      console.log(str2.length);
    `,
    expectedOutput: 'hello\n5\n'
  }),

  defineEquivalenceTest({
    name: 'String case conversion',
    code: `
      const str: string = "Hello World";
      console.log(str.toLowerCase());
      console.log(str.toUpperCase());
    `,
    expectedOutput: 'hello world\nHELLO WORLD\n'
  }),

  defineEquivalenceTest({
    name: 'String includes',
    code: `
      const str: string = "hello world";
      console.log(str.includes("world"));
      console.log(str.includes("xyz"));
    `,
    expectedOutput: 'true\nfalse\n'
  })
];
