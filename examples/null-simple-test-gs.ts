/**
 * Test basic null and undefined
 */

export function returnNull(): void {
  const x = null;
  return;
}

export function returnUndefined(): void {
  const x = undefined;
  return;
}

export function nullLiteral(): boolean {
  const x = null;
  return x === null;
}

export function undefinedLiteral(): boolean {
  const x = undefined;
  return x === undefined;
}
