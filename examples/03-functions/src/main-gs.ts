// Example: Functions and Arrow Functions
// Shows function declarations, arrow functions, and lambdas

// Regular function
function add(a: number, b: number): number {
  return a + b;
}

// Arrow function
const multiply = (a: number, b: number): number => {
  return a * b;
};

// Single-expression arrow function
const square = (x: number): number => x * x;

// Function with multiple parameters
function greet(name: string, age: integer): string {
  return `Hello, ${name}! You are ${age} years old.`;
}

// Higher-order function (function that returns a function)
function makeMultiplier(factor: number): (x: number) => number {
  return (x: number): number => x * factor;
}

// Using the functions
console.log("2 + 3 =", add(2, 3));
console.log("4 * 5 =", multiply(4, 5));
console.log("7 squared =", square(7));
console.log(greet("Alice", 30));

const double = makeMultiplier(2);
const triple = makeMultiplier(3);
console.log("double(10) =", double(10));
console.log("triple(10) =", triple(10));
