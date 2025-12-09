/**
 * Test return statements and early returns
 */

export function simpleReturn(x: number): number {
  return x * 2;
}

export function conditionalReturn(x: number): string {
  if (x > 0) {
    return "positive";
  }
  return "non-positive";
}

export function earlyReturn(x: number): number {
  if (x < 0) {
    return 0;
  }
  if (x > 100) {
    return 100;
  }
  return x;
}

export function voidReturn(): void {
  console.log("hello");
  return;
}

export function noExplicitReturn(): void {
  console.log("world");
}
