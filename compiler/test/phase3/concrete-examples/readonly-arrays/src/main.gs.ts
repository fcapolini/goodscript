/**
 * Demonstrates readonly array parameters
 */

class Calculator {
  // Readonly parameter - input is not modified
  sum(numbers: readonly number[]): number {
    let total = 0;
    for (const n of numbers) {
      total = total + n;
    }
    return total;
  }
  
  // Mutable parameter - output array is modified
  doubleValues(input: readonly number[], output: number[]): void {
    for (const n of input) {
      output.push(n * 2);
    }
  }
}

const calc = new Calculator();

// Readonly parameters can accept regular arrays
const arr1 = [1, 2, 3, 4, 5];
console.log("Sum:", calc.sum(arr1));

const arr2 = [10, 20, 30];
console.log("Sum:", calc.sum(arr2));

// Mixed readonly and mutable
const input = [1, 2, 3];
const output: number[] = [];
calc.doubleValues(input, output);
console.log("Doubled:", output);
