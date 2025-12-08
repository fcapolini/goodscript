/**
 * Simple test without lambdas - just basic operations
 */

export function main(): void {
  const greeting: string = "Hello from GoodScript!";
  console.log(greeting);
  
  const numbers: number[] = [10, 20, 30];
  console.log("Numbers:", numbers);
  
  const sum: number = 10 + 20 + 30;
  console.log("Sum:", sum);
  
  const doubled: number = sum * 2;
  console.log("Doubled:", doubled);
}

main();
