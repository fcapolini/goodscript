/**
 * Async/Await Equivalence Tests
 * 
 * Tests Promise<T>, async functions, and await expressions across all three modes
 */

import { defineEquivalenceTest, type EquivalenceTest } from '../test-framework.js';

export const tests: EquivalenceTest[] = [
  defineEquivalenceTest({
    name: 'Basic async function',
    code: `
      async function greet(): Promise<string> {
        return "Hello";
      }
      
      const result = await greet();
      console.log(result);
    `,
    expectedOutput: 'Hello\n'
  }),

  defineEquivalenceTest({
    name: 'Async function with await',
    code: `
      async function getValue(): Promise<integer> {
        return 42;
      }
      
      async function compute(): Promise<integer> {
        const value = await getValue();
        return value * 2;
      }
      
      const result = await compute();
      console.log(result);
    `,
    expectedOutput: '84\n'
  }),

  defineEquivalenceTest({
    name: 'Promise.resolve()',
    code: `
      const promise = Promise.resolve(123);
      const value = await promise;
      console.log(value);
    `,
    expectedOutput: '123\n'
  }),

  defineEquivalenceTest({
    name: 'Promise.resolve() with string',
    code: `
      const promise = Promise.resolve("test");
      const value = await promise;
      console.log(value);
    `,
    expectedOutput: 'test\n'
  }),

  defineEquivalenceTest({
    name: 'Multiple awaits in sequence',
    code: `
      async function step1(): Promise<integer> {
        return 10;
      }
      
      async function step2(x: integer): Promise<integer> {
        return x + 5;
      }
      
      async function step3(x: integer): Promise<integer> {
        return x * 2;
      }
      
      async function pipeline(): Promise<integer> {
        const a = await step1();
        const b = await step2(a);
        const c = await step3(b);
        return c;
      }
      
      const result = await pipeline();
      console.log(result);
    `,
    expectedOutput: '30\n'
  }),

  defineEquivalenceTest({
    name: 'Async arrow function',
    code: `
      const add = async (a: integer, b: integer): Promise<integer> => {
        return a + b;
      };
      
      const result = await add(3, 4);
      console.log(result);
    `,
    expectedOutput: '7\n'
  }),

  defineEquivalenceTest({
    name: 'Error handling with async/await',
    code: `
      async function mayFail(shouldFail: boolean): Promise<string> {
        if (shouldFail) {
          throw new Error("Failed");
        }
        return "Success";
      }
      
      try {
        const result1 = await mayFail(false);
        console.log(result1);
        
        const result2 = await mayFail(true);
        console.log(result2);
      } catch (e) {
        console.log("Caught error");
      }
    `,
    expectedOutput: 'Success\nCaught error\n'
  }),

  defineEquivalenceTest({
    name: 'Async function return values',
    code: `
      async function getNumber(): Promise<integer> {
        return 100;
      }
      
      async function getString(): Promise<string> {
        return "hello";
      }
      
      async function getBoolean(): Promise<boolean> {
        return true;
      }
      
      const num = await getNumber();
      const str = await getString();
      const bool = await getBoolean();
      
      console.log(num);
      console.log(str);
      console.log(bool);
    `,
    expectedOutput: '100\nhello\ntrue\n'
  }),

  defineEquivalenceTest({
    name: 'Nested async calls',
    code: `
      async function inner(): Promise<integer> {
        return 5;
      }
      
      async function middle(): Promise<integer> {
        const value = await inner();
        return value + 10;
      }
      
      async function outer(): Promise<integer> {
        const value = await middle();
        return value * 2;
      }
      
      const result = await outer();
      console.log(result);
    `,
    expectedOutput: '30\n'
  }),

  defineEquivalenceTest({
    name: 'Async with try/catch/finally',
    code: `
      async function doWork(): Promise<string> {
        return "work done";
      }
      
      async function main(): Promise<void> {
        try {
          const result = await doWork();
          console.log(result);
        } catch (e) {
          console.log("error");
        } finally {
          console.log("cleanup");
        }
      }
      
      await main();
    `,
    expectedOutput: 'work done\ncleanup\n'
  }),

  defineEquivalenceTest({
    name: 'Async function with conditional',
    code: `
      async function checkValue(x: integer): Promise<string> {
        if (x > 10) {
          return "large";
        } else if (x > 5) {
          return "medium";
        } else {
          return "small";
        }
      }
      
      const r1 = await checkValue(15);
      const r2 = await checkValue(7);
      const r3 = await checkValue(3);
      
      console.log(r1);
      console.log(r2);
      console.log(r3);
    `,
    expectedOutput: 'large\nmedium\nsmall\n'
  }),

  defineEquivalenceTest({
    name: 'Async with loop',
    code: `
      async function processItem(item: integer): Promise<integer> {
        return item * 2;
      }
      
      async function processAll(): Promise<void> {
        const items: integer[] = [1, 2, 3];
        for (const item of items) {
          const result = await processItem(item);
          console.log(result);
        }
      }
      
      await processAll();
    `,
    expectedOutput: '2\n4\n6\n'
  }),

  defineEquivalenceTest({
    name: 'Promise.reject()',
    code: `
      async function testReject(): Promise<void> {
        try {
          const promise = Promise.reject("error message");
          await promise;
          console.log("not reached");
        } catch (e) {
          console.log("caught rejection");
        }
      }
      
      await testReject();
    `,
    expectedOutput: 'caught rejection\n'
  }),

  defineEquivalenceTest({
    name: 'Async recursion',
    code: `
      async function countdown(n: integer): Promise<void> {
        console.log(n);
        if (n > 0) {
          await countdown(n - 1);
        }
      }
      
      await countdown(3);
    `,
    expectedOutput: '3\n2\n1\n0\n'
  }),

  defineEquivalenceTest({
    name: 'Multiple async variables',
    code: `
      async function getA(): Promise<integer> {
        return 10;
      }
      
      async function getB(): Promise<integer> {
        return 20;
      }
      
      async function getC(): Promise<integer> {
        return 30;
      }
      
      async function sum(): Promise<integer> {
        const a = await getA();
        const b = await getB();
        const c = await getC();
        return a + b + c;
      }
      
      const result = await sum();
      console.log(result);
    `,
    expectedOutput: '60\n'
  })
];
