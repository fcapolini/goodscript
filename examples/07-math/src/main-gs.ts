// Example: Math Operations
// Shows the Math object and mathematical operations

// Basic arithmetic
console.log("Addition: 5 + 3 =", 5 + 3);
console.log("Subtraction: 10 - 4 =", 10 - 4);
console.log("Multiplication: 6 * 7 =", 6 * 7);
console.log("Division: 20 / 4 =", 20 / 4);
console.log("Modulo: 17 % 5 =", 17 % 5);

// Math.min and Math.max
console.log("\nMin/Max:");
console.log("Math.min(5, 3, 8, 1):", Math.min(Math.min(Math.min(5, 3), 8), 1));
console.log("Math.max(5, 3, 8, 1):", Math.max(Math.max(Math.max(5, 3), 8), 1));

// Absolute value
console.log("\nAbsolute values:");
console.log("Math.abs(-42):", Math.abs(-42));
console.log("Math.abs(42):", Math.abs(42));

// Rounding functions
const value = 3.7;
console.log("\nRounding", value + ":");
console.log("Math.floor:", Math.floor(value));
console.log("Math.ceil:", Math.ceil(value));
console.log("Math.round:", Math.round(value));

// Powers and roots
console.log("\nPowers and roots:");
console.log("Math.pow(2, 8):", Math.pow(2, 8));
console.log("Math.sqrt(144):", Math.sqrt(144));

// Trigonometry (radians)
console.log("\nTrigonometry:");
console.log("Math.sin(0):", Math.sin(0));
console.log("Math.cos(0):", Math.cos(0));
console.log("Math.tan(0):", Math.tan(0));

// Logarithms
console.log("\nLogarithms:");
console.log("Math.log(Math.E):", Math.log(Math.E));
console.log("Math.log10(100):", Math.log10(100));

// Constants
console.log("\nMath constants:");
console.log("Math.PI:", Math.PI);
console.log("Math.E:", Math.E);
