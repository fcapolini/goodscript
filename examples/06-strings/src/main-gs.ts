// Example: String Operations
// Shows string manipulation methods

const text = "  Hello, GoodScript!  ";
console.log("Original:", text);

// Trim whitespace
const trimmed = text.trim();
console.log("Trimmed:", trimmed);

// Case conversion
console.log("Uppercase:", trimmed.toUpperCase());
console.log("Lowercase:", trimmed.toLowerCase());

// Substring operations
const sliced = trimmed.slice(0, 5);
console.log("Slice(0, 5):", sliced);

// Split into array
const words = trimmed.split(" ");
console.log("Split by space:", words);

// Search operations
console.log("Index of 'Good':", trimmed.indexOf("Good"));
console.log("Includes 'Script'?", trimmed.includes("Script"));
console.log("Includes 'Java'?", trimmed.includes("Java"));

// Template literals
const name = "World";
const count: integer = 42;
const message = `Hello, ${name}! The answer is ${count}.`;
console.log("Template literal:", message);

// String iteration
console.log("Characters:");
for (const char of "GoodScript") {
  console.log("  -", char);
}
