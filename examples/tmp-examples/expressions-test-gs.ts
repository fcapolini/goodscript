/**
 * Test various expression types
 */

// Ternary/conditional expressions
export function maxTernary(a: number, b: number): number {
  return a > b ? a : b;
}

// Template literals
export function greet(name: string): string {
  return `Hello, ${name}!`;
}

// Parenthesized expressions
export function complex(x: number): number {
  return (x + 1) * 2;
}

// Type assertions
export function asNumber(x: number): number {
  return x as number;
}

// New expressions
export class Point {
  x: number;
  y: number;
  
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

export function makePoint(): Point {
  return new Point(0, 0);
}
