/**
 * Simple lambda test for GoodScript
 */

export function main(): void {
  // Simple expression lambda with reserved keyword
  const double = (x: number): number => x * 2;
  const result: number = double(21);
  console.log("Result:", result);
  
  // Lambda with block body
  const add = (a: number, b: number): number => {
    return a + b;
  };
  const sum: number = add(10, 32);
  console.log("Sum:", sum);
}
