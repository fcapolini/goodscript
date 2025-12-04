// Basic arrow functions and operations
const add = (a: number, b: number): number => a + b;

const multiply = (x: number, y: number): number => {
  return x * y;
};

const greet = (name: string): string => {
  return `Hello, ${name}!`;
};

// Rest parameters
const sum = (...numbers: number[]): number => {
  return numbers.reduce((acc, n) => acc + n, 0);
};

// Nested arrow functions
const createMultiplier = (factor: number) => {
  return (value: number): number => value * factor;
};

const double = createMultiplier(2);
const triple = createMultiplier(3);

// Export for module testing
export { add, multiply, greet, sum, double, triple };
