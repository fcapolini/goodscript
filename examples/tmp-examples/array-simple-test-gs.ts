/**
 * Test array operations with main
 */

export function createArray(): number[] {
  return [1, 2, 3];
}

export function getElement(arr: number[], index: number): number {
  return arr[index];
}

export function main(): void {
  const arr = createArray();
  console.log("Array:", arr);
  
  const elem = getElement(arr, 1);
  console.log("Element at index 1:", elem);
  
  const len = arr.length;
  console.log("Length:", len);
}

main();
