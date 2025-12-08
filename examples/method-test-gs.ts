/**
 * Method call test for GoodScript
 */

export function main(): void {
  const numbers: number[] = [1, 2, 3];
  
  // Test array method calls
  const doubled: number[] = numbers.map((x: number): number => x * 2);
  console.log("Numbers:", numbers);
  console.log("Doubled:", doubled);
  
  // Test reduce
  const sum: number = numbers.reduce((acc: number, x: number): number => acc + x, 0);
  console.log("Sum:", sum);
}
