/**
 * Test for-of loops
 */

export function sumArray(nums: number[]): number {
  let total = 0;
  for (const num of nums) {
    total += num;
  }
  return total;
}

export function findFirst(items: string[], target: string): boolean {
  for (const item of items) {
    if (item === target) {
      return true;
    }
  }
  return false;
}
