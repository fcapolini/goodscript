// Class definitions with methods

class Counter {
  private count: number;
  
  constructor(initial: number = 0) {
    this.count = initial;
  }
  
  increment(): void {
    this.count = this.count + 1;
  }
  
  decrement(): void {
    this.count = this.count - 1;
  }
  
  getValue(): number {
    return this.count;
  }
  
  reset(): void {
    this.count = 0;
  }
}

class Person {
  name: string;
  private age: number;
  
  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }
  
  greet(): string {
    return `Hello, I'm ${this.name}`;
  }
  
  getAge(): number {
    return this.age;
  }
  
  haveBirthday(): void {
    this.age = this.age + 1;
  }
}

// Class with arrow function properties
class Calculator {
  private result: number = 0;
  
  add = (value: number): void => {
    this.result = this.result + value;
  };
  
  subtract = (value: number): void => {
    this.result = this.result - value;
  };
  
  getResult(): number {
    return this.result;
  }
  
  clear(): void {
    this.result = 0;
  }
}

export { Counter, Person, Calculator };
