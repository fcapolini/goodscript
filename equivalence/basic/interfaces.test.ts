/**
 * Interface Equivalence Tests
 * 
 * Tests interface declarations and structural typing (duck typing)
 */

import { defineEquivalenceTest, type EquivalenceTest } from '../test-framework.js';

export const tests: EquivalenceTest[] = [
  defineEquivalenceTest({
    name: 'Simple interface implementation',
    code: `
      interface Point {
        x: integer;
        y: integer;
      }
      
      const p: Point = { x: 10, y: 20 };
      console.log(p.x);
      console.log(p.y);
    `,
    expectedOutput: '10\n20\n'
  }),

  defineEquivalenceTest({
    name: 'Interface with methods',
    code: `
      interface Greeter {
        greet(): string;
      }
      
      class Person implements Greeter {
        name: string;
        
        constructor(name: string) {
          this.name = name;
        }
        
        greet(): string {
          return "Hello, " + this.name;
        }
      }
      
      const p = new Person("Alice");
      console.log(p.greet());
    `,
    expectedOutput: 'Hello, Alice\n'
  }),

  defineEquivalenceTest({
    name: 'Interface as function parameter',
    code: `
      interface Printable {
        toString(): string;
      }
      
      function print(obj: Printable): void {
        console.log(obj.toString());
      }
      
      class Item implements Printable {
        value: integer;
        
        constructor(value: integer) {
          this.value = value;
        }
        
        toString(): string {
          return "Item: " + this.value.toString();
        }
      }
      
      const item = new Item(42);
      print(item);
    `,
    expectedOutput: 'Item: 42\n'
  }),

  defineEquivalenceTest({
    name: 'Interface as return type',
    code: `
      interface Shape {
        area(): number;
      }
      
      class Circle implements Shape {
        radius: number;
        
        constructor(radius: number) {
          this.radius = radius;
        }
        
        area(): number {
          return 3.14159 * this.radius * this.radius;
        }
      }
      
      function createShape(r: number): Shape {
        return new Circle(r);
      }
      
      const shape = createShape(2);
      console.log(shape.area());
    `,
    expectedOutput: '12.56636\n'
  }),

  defineEquivalenceTest({
    name: 'Structural typing - duck typing',
    code: `
      interface Named {
        name: string;
      }
      
      function printName(obj: Named): void {
        console.log(obj.name);
      }
      
      const person = { name: "Alice", age: 30 };
      const product = { name: "Widget", price: 9.99 };
      
      printName(person);
      printName(product);
    `,
    expectedOutput: 'Alice\nWidget\n'
  }),

  defineEquivalenceTest({
    name: 'Interface with multiple properties',
    code: `
      interface User {
        id: integer;
        name: string;
        active: boolean;
      }
      
      const user: User = {
        id: 1,
        name: "Bob",
        active: true
      };
      
      console.log(user.id);
      console.log(user.name);
      console.log(user.active);
    `,
    expectedOutput: '1\nBob\ntrue\n'
  }),

  defineEquivalenceTest({
    name: 'Interface with nested interface',
    code: `
      interface Address {
        city: string;
        zip: integer;
      }
      
      interface Person {
        name: string;
        address: Address;
      }
      
      const person: Person = {
        name: "Charlie",
        address: {
          city: "NYC",
          zip: 10001
        }
      };
      
      console.log(person.name);
      console.log(person.address.city);
      console.log(person.address.zip);
    `,
    expectedOutput: 'Charlie\nNYC\n10001\n'
  })
];
