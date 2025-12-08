// Test method calls without console
export function main(): void {
  const numbers: number[] = [1, 2, 3];
  const doubled = numbers.map((x: number): number => x * 2);
  const sum = numbers.reduce((acc: number, x: number): number => acc + x, 0);
  return;
}
