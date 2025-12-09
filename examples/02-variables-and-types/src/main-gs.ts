// Example: Variables and Types
// Shows basic type declarations and type inference

// Explicit type annotations
const message: string = "Hello, GoodScript!";
const count: number = 42;
const pi: number = 3.14159;
const isActive: boolean = true;

// Type inference
const inferredString = "This is a string";
const inferredNumber = 123;

// Integer types (32-bit and 53-bit safe integers)
const age: integer = 25;
const bigNumber: integer53 = 9007199254740991;

console.log("String:", message);
console.log("Number:", count);
console.log("Float:", pi);
console.log("Boolean:", isActive);
console.log("Inferred string:", inferredString);
console.log("Inferred number:", inferredNumber);
console.log("Integer:", age);
console.log("Integer53:", bigNumber);
