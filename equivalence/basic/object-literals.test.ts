/**
 * Object Literals Equivalence Tests
 * 
 * Tests object literal syntax, struct types, and anonymous structs
 */

import { defineEquivalenceTest, type EquivalenceTest } from '../test-framework.js';

export const tests: EquivalenceTest[] = [
  defineEquivalenceTest({
    name: 'Simple object literal',
    code: `
      const person = { name: "Alice", age: 30 };
      console.log(person.name);
      console.log(person.age);
    `,
    expectedOutput: 'Alice\n30\n'
  }),

  defineEquivalenceTest({
    name: 'Nested object literals',
    code: `
      const user = {
        name: "Bob",
        address: {
          city: "NYC",
          zip: 10001
        }
      };
      
      console.log(user.name);
      console.log(user.address.city);
      console.log(user.address.zip);
    `,
    expectedOutput: 'Bob\nNYC\n10001\n'
  }),

  defineEquivalenceTest({
    name: 'Object with mixed types',
    code: `
      const data = {
        id: 42,
        name: "test",
        active: true,
        score: 3.14
      };
      
      console.log(data.id);
      console.log(data.name);
      console.log(data.active);
      console.log(data.score);
    `,
    expectedOutput: '42\ntest\ntrue\n3.14\n'
  }),

  defineEquivalenceTest({
    name: 'Object as function parameter',
    code: `
      function greet(person: { name: string; age: integer }): string {
        return "Hello " + person.name + ", age " + person.age.toString();
      }
      
      const p = { name: "Charlie", age: 25 };
      console.log(greet(p));
    `,
    expectedOutput: 'Hello Charlie, age 25\n'
  }),

  defineEquivalenceTest({
    name: 'Object as return value',
    code: `
      function createPoint(x: integer, y: integer): { x: integer; y: integer } {
        return { x: x, y: y };
      }
      
      const point = createPoint(10, 20);
      console.log(point.x);
      console.log(point.y);
    `,
    expectedOutput: '10\n20\n'
  }),

  defineEquivalenceTest({
    name: 'Anonymous struct type inference',
    code: `
      const config = {
        host: "localhost",
        port: 8080,
        secure: false
      };
      
      function connect(cfg: typeof config): string {
        return cfg.host + ":" + cfg.port.toString();
      }
      
      console.log(connect(config));
    `,
    expectedOutput: 'localhost:8080\n',
    skip: true  // Skip if typeof not yet supported for object types
  }),

  defineEquivalenceTest({
    name: 'Object literal in array',
    code: `
      const users = [
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
        { name: "Charlie", age: 35 }
      ];
      
      for (const user of users) {
        console.log(user.name + ": " + user.age.toString());
      }
    `,
    expectedOutput: 'Alice: 30\nBob: 25\nCharlie: 35\n'
  }),

  defineEquivalenceTest({
    name: 'Empty object literal',
    code: `
      const empty = {};
      console.log(typeof empty);
    `,
    expectedOutput: 'object\n',
    skip: true  // Skip if empty objects not supported
  })
];
