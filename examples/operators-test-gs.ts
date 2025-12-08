/**
 * Test string operations and other expressions
 */

// String concatenation
export function concat(a: string, b: string): string {
  return a + b;
}

// Type guards
export function isString(x: number | string): boolean {
  return typeof x === "string";
}

// Logical operators with proper short-circuit
export function and(a: boolean, b: boolean): boolean {
  return a && b;
}

export function or(a: boolean, b: boolean): boolean {
  return a || b;
}

// Comparison chains
export function inRange(x: number, min: number, max: number): boolean {
  return x >= min && x <= max;
}

// Assignment in expressions
export function increment(x: number): number {
  let y = x;
  y = y + 1;
  return y;
}
