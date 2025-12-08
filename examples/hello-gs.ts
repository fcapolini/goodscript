/**
 * Simple Hello World example for GoodScript
 * Tests basic string operations and console output
 */

export function main(): void {
  const message: string = "Hello, GoodScript!";
  console.log(message);
  
  // Test string operations
  const upper: string = message.toUpperCase();
  console.log(upper);
  
  // Test array operations
  const numbers: number[] = [1, 2, 3, 4, 5];
  const doubled: number[] = numbers.map((x: number): number => x * 2);
  console.log("Original:", numbers);
  console.log("Doubled:", doubled);
  
  // Test reduce
  const sum: number = numbers.reduce((acc: number, x: number): number => acc + x, 0);
  console.log("Sum:", sum);
}

main();
