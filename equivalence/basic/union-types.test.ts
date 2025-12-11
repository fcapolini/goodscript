/**
 * Union Types Equivalence Tests
 * 
 * Tests T | null, T | undefined, and union type semantics
 */

import { defineEquivalenceTest, type EquivalenceTest } from '../test-framework.js';

export const tests: EquivalenceTest[] = [
  defineEquivalenceTest({
    name: 'T | null basic usage',
    code: `
      function getValue(hasValue: boolean): integer | null {
        if (hasValue) {
          return 42;
        }
        return null;
      }
      
      const v1 = getValue(true);
      const v2 = getValue(false);
      
      console.log(v1);
      console.log(v2);
    `,
    expectedOutput: '42\nnull\n'
  }),

  defineEquivalenceTest({
    name: 'T | undefined basic usage',
    code: `
      function findValue(search: boolean): string | undefined {
        if (search) {
          return "found";
        }
        return undefined;
      }
      
      const r1 = findValue(true);
      const r2 = findValue(false);
      
      console.log(r1);
      console.log(r2);
    `,
    expectedOutput: 'found\nundefined\n'
  }),

  defineEquivalenceTest({
    name: 'Function returning T | null',
    code: `
      function divide(a: number, b: number): number | null {
        if (b === 0) {
          return null;
        }
        return a / b;
      }
      
      const result1 = divide(10, 2);
      const result2 = divide(10, 0);
      
      console.log(result1);
      console.log(result2);
    `,
    expectedOutput: '5\nnull\n'
  }),

  defineEquivalenceTest({
    name: 'Variable with union type annotation',
    code: `
      let value: integer | null = 100;
      console.log(value);
      
      value = null;
      console.log(value);
      
      value = 200;
      console.log(value);
    `,
    expectedOutput: '100\nnull\n200\n'
  }),

  defineEquivalenceTest({
    name: 'typeof narrowing for unions',
    code: `
      function processValue(val: integer | null): string {
        if (typeof val === "number") {
          return "number: " + val.toString();
        }
        return "null value";
      }
      
      console.log(processValue(42));
      console.log(processValue(null));
    `,
    expectedOutput: 'number: 42\nnull value\n'
  }),

  defineEquivalenceTest({
    name: 'Array of union types',
    code: `
      const values: (integer | null)[] = [1, null, 3, null, 5];
      
      for (const v of values) {
        console.log(v);
      }
    `,
    expectedOutput: '1\nnull\n3\nnull\n5\n'
  }),

  defineEquivalenceTest({
    name: 'Map with union value types',
    code: `
      const cache = new Map<string, integer | null>();
      
      cache.set("a", 10);
      cache.set("b", null);
      cache.set("c", 30);
      
      console.log(cache.get("a"));
      console.log(cache.get("b"));
      console.log(cache.get("c"));
    `,
    expectedOutput: '10\nnull\n30\n'
  }),

  defineEquivalenceTest({
    name: 'Union with primitives - string | null',
    code: `
      function getName(id: integer): string | null {
        if (id === 1) {
          return "Alice";
        } else if (id === 2) {
          return "Bob";
        }
        return null;
      }
      
      console.log(getName(1));
      console.log(getName(2));
      console.log(getName(3));
    `,
    expectedOutput: 'Alice\nBob\nnull\n'
  }),

  defineEquivalenceTest({
    name: 'Union in function parameters',
    code: `
      function printValue(val: integer | null): void {
        if (val === null) {
          console.log("no value");
        } else {
          console.log("value: " + val.toString());
        }
      }
      
      printValue(42);
      printValue(null);
      printValue(0);
    `,
    expectedOutput: 'value: 42\nno value\nvalue: 0\n'
  }),

  defineEquivalenceTest({
    name: 'Multiple union checks',
    code: `
      function checkType(val: string | null | undefined): string {
        if (val === null) {
          return "null";
        } else if (val === undefined) {
          return "undefined";
        } else {
          return "string: " + val;
        }
      }
      
      console.log(checkType("hello"));
      console.log(checkType(null));
      console.log(checkType(undefined));
    `,
    expectedOutput: 'string: hello\nnull\nundefined\n'
  })
];
