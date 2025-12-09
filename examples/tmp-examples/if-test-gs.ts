/**
 * If statement test
 */

export function max(a: number, b: number): number {
  if (a > b) {
    return a;
  } else {
    return b;
  }
}

export function abs(x: number): number {
  if (x < 0) {
    return -x;
  }
  return x;
}

export function classify(n: number): string {
  if (n > 0) {
    return "positive";
  } else if (n < 0) {
    return "negative";
  } else {
    return "zero";
  }
}
