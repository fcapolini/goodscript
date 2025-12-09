// Example: Classes and Methods
// Shows class declarations, constructors, methods, and inheritance

// Base class
class Person {
  name: string;
  age: integer;
  
  constructor(name: string, age: integer) {
    this.name = name;
    this.age = age;
  }
  
  greet(): string {
    return `Hello, I'm ${this.name} and I'm ${this.age} years old.`;
  }
  
  haveBirthday(): void {
    this.age = this.age + 1;
    console.log(`Happy birthday! ${this.name} is now ${this.age}.`);
  }
}

// Create instances
const alice = new Person("Alice", 30);
const bob = new Person("Bob", 25);

console.log(alice.greet());
console.log(bob.greet());

alice.haveBirthday();
bob.haveBirthday();

// Class with methods that return values
class Calculator {
  lastResult: number;
  
  constructor() {
    this.lastResult = 0;
  }
  
  add(a: number, b: number): number {
    this.lastResult = a + b;
    return this.lastResult;
  }
  
  multiply(a: number, b: number): number {
    this.lastResult = a * b;
    return this.lastResult;
  }
  
  getLastResult(): number {
    return this.lastResult;
  }
}

const calc = new Calculator();
console.log("\nCalculator:");
console.log("5 + 3 =", calc.add(5, 3));
console.log("Last result:", calc.getLastResult());
console.log("4 * 6 =", calc.multiply(4, 6));
console.log("Last result:", calc.getLastResult());
