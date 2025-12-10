/**
 * Equivalence tests for Map operations
 */

import { defineEquivalenceTest } from '../test-framework.js';

export const tests = [
  defineEquivalenceTest({
    name: 'Map creation and size',
    code: `
      const map = new Map<string, integer>();
      console.log(map.size);
    `,
    expectedOutput: '0\n'
  }),

  defineEquivalenceTest({
    name: 'Map set and get',
    code: `
      const map = new Map<string, integer>();
      map.set("a", 1);
      map.set("b", 2);
      map.set("c", 3);
      console.log(map.get("a"));
      console.log(map.get("b"));
      console.log(map.get("c"));
    `,
    expectedOutput: '1\n2\n3\n'
  }),

  defineEquivalenceTest({
    name: 'Map has',
    code: `
      const map = new Map<string, integer>();
      map.set("key1", 100);
      console.log(map.has("key1"));
      console.log(map.has("key2"));
    `,
    expectedOutput: 'true\nfalse\n'
  }),

  defineEquivalenceTest({
    name: 'Map delete',
    code: `
      const map = new Map<string, integer>();
      map.set("a", 1);
      map.set("b", 2);
      console.log(map.size);
      map.delete("a");
      console.log(map.size);
      console.log(map.has("a"));
      console.log(map.has("b"));
    `,
    expectedOutput: '2\n1\nfalse\ntrue\n'
  }),

  defineEquivalenceTest({
    name: 'Map clear',
    code: `
      const map = new Map<string, integer>();
      map.set("a", 1);
      map.set("b", 2);
      map.set("c", 3);
      console.log(map.size);
      map.clear();
      console.log(map.size);
    `,
    expectedOutput: '3\n0\n'
  }),

  defineEquivalenceTest({
    name: 'Map forEach',
    code: `
      const map = new Map<string, integer>();
      map.set("one", 1);
      map.set("two", 2);
      map.set("three", 3);
      map.forEach((value: integer, key: string): void => {
        console.log(key + ":" + value);
      });
    `,
    expectedOutput: 'one:1\ntwo:2\nthree:3\n'
  }),

  defineEquivalenceTest({
    name: 'Map keys iteration',
    code: `
      const map = new Map<string, integer>();
      map.set("alpha", 1);
      map.set("beta", 2);
      map.set("gamma", 3);
      for (const key of map.keys()) {
        console.log(key);
      }
    `,
    expectedOutput: 'alpha\nbeta\ngamma\n'
  }),

  defineEquivalenceTest({
    name: 'Map values iteration',
    code: `
      const map = new Map<string, integer>();
      map.set("a", 10);
      map.set("b", 20);
      map.set("c", 30);
      for (const value of map.values()) {
        console.log(value);
      }
    `,
    expectedOutput: '10\n20\n30\n'
  }),

  defineEquivalenceTest({
    name: 'Map string-to-string',
    code: `
      const map = new Map<string, string>();
      map.set("greeting", "hello");
      map.set("farewell", "goodbye");
      console.log(map.get("greeting"));
      console.log(map.get("farewell"));
    `,
    expectedOutput: 'hello\ngoodbye\n'
  }),

  defineEquivalenceTest({
    name: 'Map integer keys',
    code: `
      const map = new Map<integer, string>();
      map.set(1, "one");
      map.set(2, "two");
      map.set(3, "three");
      console.log(map.get(1));
      console.log(map.get(2));
      console.log(map.get(3));
    `,
    expectedOutput: 'one\ntwo\nthree\n'
  })
];
