/**
 * Equivalence tests for optional chaining
 */

import { defineEquivalenceTest } from '../test-framework.js';

export const tests = [
  defineEquivalenceTest({
    name: 'Optional chaining with null',
    code: `
      class Person {
        name: string;
        
        constructor(name: string) {
          this.name = name;
        }
      }
      
      const p: Person | null = null;
      const name: string | undefined = p?.name;
      console.log(name === undefined);
    `,
    expectedOutput: 'true\n',
    skipModes: ['gc', 'ownership'] // Union types not yet fully supported in C++
  }),

  defineEquivalenceTest({
    name: 'Optional chaining with value',
    code: `
      class Person {
        name: string;
        
        constructor(name: string) {
          this.name = name;
        }
      }
      
      const p: Person | null = new Person("Alice");
      const name: string | undefined = p?.name;
      if (name !== undefined) {
        console.log(name);
      }
    `,
    expectedOutput: 'Alice\n',
    skipModes: ['gc', 'ownership'] // Union types not yet fully supported in C++
  })
];
