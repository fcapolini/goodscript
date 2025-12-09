/**
 * Array methods test for GoodScript
 */

export function testMap(): number[] {
  const arr: number[] = [1, 2, 3, 4, 5];
  return arr.map((x: number) => x * 2);
}

export function testFilter(): number[] {
  const arr: number[] = [1, 2, 3, 4, 5];
  return arr.filter((x: number) => x > 2);
}

export function testSlice(): number[] {
  const arr: number[] = [1, 2, 3, 4, 5];
  return arr.slice(1, 3);
}

export function testPush(): number {
  const arr: number[] = [1, 2, 3];
  return arr.push(4);
}

export function main(): void {
  const mapped: number[] = testMap();
  console.log("Mapped:", mapped);
  
  const filtered: number[] = testFilter();
  console.log("Filtered:", filtered);
  
  const sliced: number[] = testSlice();
  console.log("Sliced:", sliced);
  
  const length: number = testPush();
  console.log("New length:", length);
}
