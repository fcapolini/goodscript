/**
 * Equivalence tests for equality operations (=== and !==)
 * Tests various types and edge cases for strict equality
 */

import { defineEquivalenceTest } from '../test-framework.js';

export const tests = [
  defineEquivalenceTest({
    name: 'Number equality - same values',
    code: `
      console.log(42 === 42);
      console.log(0 === 0);
      console.log(-1 === -1);
      console.log(3.14 === 3.14);
    `,
    expectedOutput: 'true\ntrue\ntrue\ntrue\n'
  }),

  defineEquivalenceTest({
    name: 'Number equality - different values',
    code: `
      console.log(42 === 43);
      console.log(0 === 1);
      console.log(-1 === 1);
      console.log(3.14 === 3.15);
    `,
    expectedOutput: 'false\nfalse\nfalse\nfalse\n'
  }),

  defineEquivalenceTest({
    name: 'Number inequality - same values',
    code: `
      console.log(42 !== 42);
      console.log(0 !== 0);
      console.log(-1 !== -1);
    `,
    expectedOutput: 'false\nfalse\nfalse\n'
  }),

  defineEquivalenceTest({
    name: 'Number inequality - different values',
    code: `
      console.log(42 !== 43);
      console.log(0 !== 1);
      console.log(-1 !== 1);
    `,
    expectedOutput: 'true\ntrue\ntrue\n'
  }),

  defineEquivalenceTest({
    name: 'String equality - same values',
    code: `
      console.log("hello" === "hello");
      console.log("" === "");
      console.log("test123" === "test123");
    `,
    expectedOutput: 'true\ntrue\ntrue\n'
  }),

  defineEquivalenceTest({
    name: 'String equality - different values',
    code: `
      console.log("hello" === "world");
      console.log("" === " ");
      console.log("test" === "Test");
    `,
    expectedOutput: 'false\nfalse\nfalse\n'
  }),

  defineEquivalenceTest({
    name: 'String inequality',
    code: `
      console.log("hello" !== "world");
      console.log("test" !== "test");
      console.log("" !== " ");
    `,
    expectedOutput: 'true\nfalse\ntrue\n'
  }),

  defineEquivalenceTest({
    name: 'Boolean equality',
    code: `
      console.log(true === true);
      console.log(false === false);
      console.log(true === false);
      console.log(false === true);
    `,
    expectedOutput: 'true\ntrue\nfalse\nfalse\n'
  }),

  defineEquivalenceTest({
    name: 'Boolean inequality',
    code: `
      console.log(true !== true);
      console.log(false !== false);
      console.log(true !== false);
      console.log(false !== true);
    `,
    expectedOutput: 'false\nfalse\ntrue\ntrue\n'
  }),

  defineEquivalenceTest({
    name: 'Variable equality - numbers',
    code: `
      const a: number = 10;
      const b: number = 10;
      const c: number = 20;
      console.log(a === b);
      console.log(a === c);
      console.log(b !== c);
    `,
    expectedOutput: 'true\nfalse\ntrue\n'
  }),

  defineEquivalenceTest({
    name: 'Variable equality - strings',
    code: `
      const s1: string = "hello";
      const s2: string = "hello";
      const s3: string = "world";
      console.log(s1 === s2);
      console.log(s1 === s3);
      console.log(s2 !== s3);
    `,
    expectedOutput: 'true\nfalse\ntrue\n'
  }),

  defineEquivalenceTest({
    name: 'Variable equality - booleans',
    code: `
      const t1: boolean = true;
      const t2: boolean = true;
      const f1: boolean = false;
      console.log(t1 === t2);
      console.log(t1 === f1);
      console.log(t2 !== f1);
    `,
    expectedOutput: 'true\nfalse\ntrue\n'
  }),

  defineEquivalenceTest({
    name: 'Equality in conditionals',
    code: `
      const x: number = 5;
      const y: number = 5;
      const z: number = 10;
      
      if (x === y) {
        console.log("x equals y");
      }
      
      if (x !== z) {
        console.log("x not equal z");
      }
      
      if (y === z) {
        console.log("should not print");
      } else {
        console.log("y not equal z");
      }
    `,
    expectedOutput: 'x equals y\nx not equal z\ny not equal z\n'
  }),

  defineEquivalenceTest({
    name: 'Equality with arithmetic expressions',
    code: `
      console.log((2 + 2) === 4);
      console.log((5 * 2) === 10);
      console.log((10 - 3) !== 8);
      console.log((15 / 3) === 5);
    `,
    expectedOutput: 'true\ntrue\ntrue\ntrue\n'
  }),

  defineEquivalenceTest({
    name: 'Equality with function returns',
    code: `
      function getValue(): number {
        return 42;
      }
      
      console.log(getValue() === 42);
      console.log(getValue() !== 43);
      console.log(getValue() === getValue());
    `,
    expectedOutput: 'true\ntrue\ntrue\n'
  }),

  defineEquivalenceTest({
    name: 'String equality with concatenation',
    code: `
      const part1: string = "hel";
      const part2: string = "lo";
      const full: string = "hello";
      
      console.log((part1 + part2) === full);
      console.log((part1 + part2) === "hello");
      console.log(("hel" + "lo") === full);
    `,
    expectedOutput: 'true\ntrue\ntrue\n'
  }),

  defineEquivalenceTest({
    name: 'Chained equality comparisons',
    code: `
      const a: number = 5;
      const b: number = 5;
      const c: number = 5;
      
      if (a === b && b === c) {
        console.log("all equal");
      }
      
      const x: number = 1;
      const y: number = 2;
      const z: number = 3;
      
      if (x !== y && y !== z) {
        console.log("all different");
      }
    `,
    expectedOutput: 'all equal\nall different\n'
  }),

  defineEquivalenceTest({
    name: 'Equality with null - explicit null type',
    code: `
      const x: number | null = 42;
      const y: number | null = null;
      
      console.log(x !== null);
      console.log(y === null);
    `,
    expectedOutput: 'true\ntrue\n'
  }),

  defineEquivalenceTest({
    name: 'Inequality chains with numbers',
    code: `
      const nums: number[] = [1, 2, 3, 4, 5];
      
      console.log(nums[0] !== nums[1]);
      console.log(nums[2] !== nums[3]);
      console.log(nums[0] === 1);
      console.log(nums[4] === 5);
    `,
    expectedOutput: 'true\ntrue\ntrue\ntrue\n'
  }),

  defineEquivalenceTest({
    name: 'Equality in loops',
    code: `
      for (let i: integer = 0; i < 5; i = i + 1) {
        if (i === 2) {
          console.log("found 2");
        }
        if (i !== 3) {
          continue;
        }
        console.log("found 3");
      }
    `,
    expectedOutput: 'found 2\nfound 3\n'
  }),

  defineEquivalenceTest({
    name: 'String equality - case sensitivity',
    code: `
      const lower: string = "hello";
      const upper: string = "HELLO";
      const mixed: string = "Hello";
      
      console.log(lower === upper);
      console.log(lower === mixed);
      console.log(upper === mixed);
      console.log(lower !== upper);
    `,
    expectedOutput: 'false\nfalse\nfalse\ntrue\n'
  }),

  defineEquivalenceTest({
    name: 'Zero and negative zero',
    code: `
      const zero: number = 0;
      const negZero: number = -0;
      
      console.log(zero === negZero);
      console.log(zero !== negZero);
    `,
    expectedOutput: 'true\nfalse\n'
  }),

  defineEquivalenceTest({
    name: 'Equality with integer type',
    code: `
      const a: integer = 10;
      const b: integer = 10;
      const c: integer = 20;
      
      console.log(a === b);
      console.log(a !== c);
      console.log(b === 10);
    `,
    expectedOutput: 'true\ntrue\ntrue\n'
  }),

  defineEquivalenceTest({
    name: 'Mixed number and integer equality',
    code: `
      const num: number = 42;
      const int: integer = 42;
      
      console.log(num === 42);
      console.log(int === 42);
      console.log(num !== 43);
    `,
    expectedOutput: 'true\ntrue\ntrue\n'
  }),

  defineEquivalenceTest({
    name: 'Equality with template literals',
    code: `
      const name: string = "World";
      const greeting: string = \`Hello, \${name}!\`;
      
      console.log(greeting === "Hello, World!");
      console.log(greeting !== "Hello!");
    `,
    expectedOutput: 'true\ntrue\n'
  })
];
