/**
 * Test compound assignment operators
 */

export function addAssign(x: number): number {
  let y = x;
  y += 5;
  return y;
}

export function subAssign(x: number): number {
  let y = x;
  y -= 3;
  return y;
}

export function mulAssign(x: number): number {
  let y = x;
  y *= 2;
  return y;
}

export function divAssign(x: number): number {
  let y = x;
  y /= 4;
  return y;
}

export function increment(x: number): number {
  let y = x;
  y++;
  return y;
}

export function decrement(x: number): number {
  let y = x;
  y--;
  return y;
}

export function preIncrement(x: number): number {
  let y = x;
  ++y;  // Use as statement, not in return expression
  return y;
}

export function preDecrement(x: number): number {
  let y = x;
  --y;  // Use as statement, not in return expression
  return y;
}
