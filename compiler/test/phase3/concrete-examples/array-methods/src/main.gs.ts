/**
 * Array Methods Example
 * 
 * Demonstrates:
 * - Array.map() for transformations
 * - Array.filter() for filtering
 * - Array.reduce() for aggregation
 * - Array.find() and Array.findIndex()
 * - Array.some() and Array.every()
 * - Array.sort() and Array.reverse()
 * - Chaining array methods
 * - Higher-order functions
 */

class Person {
  name: string;
  age: number;
  salary: number;

  constructor(name: string, age: number, salary: number) {
    this.name = name;
    this.age = age;
    this.salary = salary;
  }

  toString(): string {
    return `${this.name} (age: ${this.age}, salary: ${this.salary})`;
  }
}

const testMap = (): void => {
  console.log("=== Array.map() Tests ===");
  
  const numbers = [1, 2, 3, 4, 5];
  const doubled = numbers.map((x: number): number => x * 2);
  console.log(`Original: [${numbers.join(', ')}]`);
  console.log(`Doubled: [${doubled.join(', ')}]`);
  
  const squared = numbers.map((x: number): number => x * x);
  console.log(`Squared: [${squared.join(', ')}]`);
  
  const people = [
    new Person("Alice", 30, 50000),
    new Person("Bob", 25, 45000),
    new Person("Charlie", 35, 60000)
  ];
  
  const names = people.map((p: Person): string => p.name);
  console.log(`Names: [${names.join(', ')}]`);
};

const testFilter = (): void => {
  console.log("\n=== Array.filter() Tests ===");
  
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const evens = numbers.filter((x: number): boolean => x % 2 === 0);
  console.log(`Even numbers: [${evens.join(', ')}]`);
  
  const greaterThan5 = numbers.filter((x: number): boolean => x > 5);
  console.log(`Greater than 5: [${greaterThan5.join(', ')}]`);
  
  const people = [
    new Person("Alice", 30, 50000),
    new Person("Bob", 25, 45000),
    new Person("Charlie", 35, 60000),
    new Person("David", 28, 52000)
  ];
  
  const over30 = people.filter((p: Person): boolean => p.age >= 30);
  console.log("People 30 or older:");
  for (let i = 0; i < over30.length; i++) {
    console.log(`  ${over30[i].toString()}`);
  }
};

const testReduce = (): void => {
  console.log("\n=== Array.reduce() Tests ===");
  
  const numbers = [1, 2, 3, 4, 5];
  const sum = numbers.reduce((acc: number, x: number): number => acc + x, 0);
  console.log(`Sum: ${sum}`);
  
  const product = numbers.reduce((acc: number, x: number): number => acc * x, 1);
  console.log(`Product: ${product}`);
  
  const people = [
    new Person("Alice", 30, 50000),
    new Person("Bob", 25, 45000),
    new Person("Charlie", 35, 60000)
  ];
  
  const totalSalary = people.reduce((acc: number, p: Person): number => acc + p.salary, 0);
  console.log(`Total salary: ${totalSalary}`);
  
  const avgSalary = totalSalary / people.length;
  console.log(`Average salary: ${avgSalary.toFixed(2)}`);
};

const testFind = (): void => {
  console.log("\n=== Array.find() Tests ===");
  
  const numbers = [1, 2, 3, 4, 5];
  const firstEven = numbers.find((x: number): boolean => x % 2 === 0);
  if (firstEven !== undefined) {
    console.log(`First even number: ${firstEven}`);
  }
  
  const firstGreaterThan10 = numbers.find((x: number): boolean => x > 10);
  if (firstGreaterThan10 === undefined) {
    console.log("No number greater than 10");
  }
  
  const people = [
    new Person("Alice", 30, 50000),
    new Person("Bob", 25, 45000),
    new Person("Charlie", 35, 60000)
  ];
  
  const bob = people.find((p: Person): boolean => p.name === "Bob");
  if (bob !== undefined) {
    console.log(`Found: ${bob.toString()}`);
  }
};

const testFindIndex = (): void => {
  console.log("\n=== Array.findIndex() Tests ===");
  
  const numbers = [10, 20, 30, 40, 50];
  const index30 = numbers.findIndex((x: number): boolean => x === 30);
  console.log(`Index of 30: ${index30}`);
  
  const index99 = numbers.findIndex((x: number): boolean => x === 99);
  console.log(`Index of 99: ${index99}`);
  
  const people = [
    new Person("Alice", 30, 50000),
    new Person("Bob", 25, 45000),
    new Person("Charlie", 35, 60000)
  ];
  
  const charlieIndex = people.findIndex((p: Person): boolean => p.name === "Charlie");
  console.log(`Charlie is at index: ${charlieIndex}`);
};

const testSomeEvery = (): void => {
  console.log("\n=== Array.some() and every() Tests ===");
  
  const numbers = [1, 2, 3, 4, 5];
  
  const hasEven = numbers.some((x: number): boolean => x % 2 === 0);
  console.log(`Has even number: ${hasEven}`);
  
  const allPositive = numbers.every((x: number): boolean => x > 0);
  console.log(`All positive: ${allPositive}`);
  
  const allEven = numbers.every((x: number): boolean => x % 2 === 0);
  console.log(`All even: ${allEven}`);
  
  const people = [
    new Person("Alice", 30, 50000),
    new Person("Bob", 25, 45000),
    new Person("Charlie", 35, 60000)
  ];
  
  const anyOver40 = people.some((p: Person): boolean => p.age > 40);
  console.log(`Anyone over 40: ${anyOver40}`);
  
  const allOver20 = people.every((p: Person): boolean => p.age > 20);
  console.log(`Everyone over 20: ${allOver20}`);
};

const testChaining = (): void => {
  console.log("\n=== Method Chaining Tests ===");
  
  const people = [
    new Person("Alice", 30, 50000),
    new Person("Bob", 25, 45000),
    new Person("Charlie", 35, 60000),
    new Person("David", 28, 52000),
    new Person("Eve", 32, 58000)
  ];
  
  // Filter people over 28, get their salaries, sum them
  const filtered = people.filter((p: Person): boolean => p.age > 28);
  const salaries = filtered.map((p: Person): number => p.salary);
  const total = salaries.reduce((acc: number, s: number): number => acc + s, 0);
  
  console.log(`Total salary of people over 28: ${total}`);
  
  // Count people with salary over 50000
  const highEarners = people.filter((p: Person): boolean => p.salary > 50000);
  console.log(`High earners (>50k): ${highEarners.length}`);
};

const testSort = (): void => {
  console.log("\n=== Array.sort() Tests ===");
  
  const numbers = [5, 2, 8, 1, 9, 3];
  const sorted = numbers.slice().sort((a: number, b: number): number => a - b);
  console.log(`Original: [${numbers.join(', ')}]`);
  console.log(`Sorted: [${sorted.join(', ')}]`);
  
  const people = [
    new Person("Charlie", 35, 60000),
    new Person("Alice", 30, 50000),
    new Person("Bob", 25, 45000)
  ];
  
  const sortedByAge = people.slice().sort((a: Person, b: Person): number => a.age - b.age);
  console.log("Sorted by age:");
  for (let i = 0; i < sortedByAge.length; i++) {
    console.log(`  ${sortedByAge[i].toString()}`);
  }
};

// Run all tests
const runArrayTests = (): void => {
  testMap();
  testFilter();
  testReduce();
  testFind();
  testFindIndex();
  testSomeEvery();
  testChaining();
  testSort();
  console.log("\n=== All tests completed ===");
};

runArrayTests();
