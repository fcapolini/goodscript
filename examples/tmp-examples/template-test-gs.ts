/**
 * Test template literal expressions
 */

export function greet(name: string): string {
  return `Hello, ${name}!`;
}

export function formatNumber(value: number): string {
  return `The value is ${value}`;
}

export function multiExpression(x: number, y: number): string {
  return `${x} + ${y} = ${x + y}`;
}
