/**
 * Test array operations
 */

export function createArray(): number[] {
  return [1, 2, 3];
}

export function getElement(arr: number[], index: number): number {
  return arr[index];
}

export function arrayLength(arr: string[]): number {
  return arr.length;
}

export function emptyArray(): boolean[] {
  return [];
}

export function mixedOperations(nums: number[]): number {
  const first = nums[0];
  const len = nums.length;
  return first + len;
}
