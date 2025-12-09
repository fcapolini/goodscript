/**
 * Test JavaScript/TypeScript array semantics
 * This file tests edge cases to ensure C++ matches JS/TS behavior
 */

export function testOutOfBoundsRead(): void {
  const arr: number[] = [1, 2, 3];
  
  // In JS/TS: arr[5] returns undefined (not an error)
  const val = arr[5];
  console.log("Out of bounds read (arr[5]):", val);
  
  // Negative index should return undefined in JS/TS
  const neg = arr[-1];
  console.log("Negative index (arr[-1]):", neg);
}

export function testOutOfBoundsWrite(): void {
  const arr: number[] = [1, 2, 3];
  
  // In JS/TS: arr[5] = 99 creates sparse array [1, 2, 3, <2 empty items>, 99]
  // The "empty items" are undefined
  arr[5] = 99;
  console.log("After arr[5] = 99, length:", arr.length);
  console.log("arr[3] (should be undefined):", arr[3]);
  console.log("arr[4] (should be undefined):", arr[4]);
  console.log("arr[5]:", arr[5]);
}

export function testLengthProperty(): void {
  const arr: number[] = [1, 2, 3];
  
  // In JS/TS: setting length truncates or extends array
  arr.length = 5;
  console.log("After arr.length = 5, length:", arr.length);
  console.log("arr[3] (should be undefined):", arr[3]);
  console.log("arr[4] (should be undefined):", arr[4]);
  
  // Truncating
  arr.length = 2;
  console.log("After arr.length = 2, length:", arr.length);
  console.log("arr[2] (should be undefined):", arr[2]);
}

export function testPushAndLength(): void {
  const arr: number[] = [];
  
  // push returns new length
  const len1 = arr.push(1);
  console.log("After push(1), returned:", len1, "length:", arr.length);
  
  // NOTE: JavaScript supports push(2, 3) with multiple args
  // but our C++ implementation currently only supports one at a time
  arr.push(2);
  arr.push(3);
  console.log("After push(2), push(3), length:", arr.length);
  console.log("Array contents: arr[0]:", arr[0], "arr[1]:", arr[1], "arr[2]:", arr[2]);
}

export function testCompoundAssignment(): void {
  const arr: number[] = [10, 20, 30];
  
  // Test compound assignment on array elements
  arr[0] += 5;
  console.log("After arr[0] += 5, arr[0]:", arr[0]);
  
  arr[1] *= 2;
  console.log("After arr[1] *= 2, arr[1]:", arr[1]);
}

export function main(): void {
  console.log("=== Out of Bounds Read ===");
  testOutOfBoundsRead();
  
  console.log("\n=== Out of Bounds Write ===");
  testOutOfBoundsWrite();
  
  console.log("\n=== Length Property ===");
  testLengthProperty();
  
  console.log("\n=== Push and Length ===");
  testPushAndLength();
  
  console.log("\n=== Compound Assignment ===");
  testCompoundAssignment();
}

main();
