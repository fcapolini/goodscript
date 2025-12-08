/**
 * Test null and undefined handling
 */

export function returnNull(): null {
  return null;
}

export function returnUndefined(): void {
  return undefined;
}

export function checkNull(x: number | null): boolean {
  return x === null;
}

export function checkNotNull(x: string | null): boolean {
  return x !== null;
}

export function nullCoalesce(x: number | null): number {
  return x ?? 0;
}
