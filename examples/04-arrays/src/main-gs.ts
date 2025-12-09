// Example: Arrays and Array Operations
// Shows array literals, indexing, methods, and iteration

// Array literal
const numbers: number[] = [1, 2, 3, 4, 5];
const names: string[] = ["Alice", "Bob", "Charlie"];

console.log("Numbers:", numbers);
console.log("Names:", names);
console.log("First number:", numbers[0]);
console.log("Array length:", numbers.length);

// Array methods
const doubled = numbers.map((n: number): number => n * 2);
console.log("Doubled:", doubled);

const evens = numbers.filter((n: number): boolean => n % 2 === 0);
console.log("Even numbers:", evens);

const sum = numbers.reduce((acc: number, n: number): number => acc + n, 0);
console.log("Sum:", sum);

// for-of loop
console.log("Iterating with for-of:");
for (const num of numbers) {
  console.log("  -", num);
}

// Array with forEach
console.log("Names with forEach:");
names.forEach((name: string): void => {
  console.log("  Hello,", name);
});

// String as iterable
const message = "Hello";
console.log("Iterating over string:");
for (const char of message) {
  console.log("  Char:", char);
}
