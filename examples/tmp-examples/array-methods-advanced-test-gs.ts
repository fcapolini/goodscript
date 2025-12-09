// Test additional array methods: forEach, reduce, every, some, indexOf, includes
// Note: find() requires union type support (number | undefined)

function testForEach(): void {
  const arr: number[] = [1, 2, 3];
  arr.forEach((x: number) => {
    console.log("  Element:", x);
  });
}

function testReduce(): number {
  const arr: number[] = [1, 2, 3, 4];
  return arr.reduce((acc: number, x: number) => acc + x, 0);
}

function testEvery(): boolean {
  const arr: number[] = [2, 4, 6, 8];
  return arr.every((x: number) => x > 1);
}

function testSome(): boolean {
  const arr: number[] = [1, 3, 4, 5];
  return arr.some((x: number) => x > 4);
}

function testIndexOf(): number {
  const arr: number[] = [10, 20, 30, 20];
  return arr.indexOf(20);
}

function testIncludes(): boolean {
  const arr: number[] = [1, 2, 3];
  return arr.includes(2);
}

function main(): void {
  console.log("Testing forEach:");
  testForEach();
  
  const reduced: number = testReduce();
  console.log("Reduced:", reduced);
  
  const all: boolean = testEvery();
  console.log("All > 1:", all);
  
  const has: boolean = testSome();
  console.log("Has > 4:", has);
  
  const index: number = testIndexOf();
  console.log("Index of 20:", index);
  
  const hasTwo: boolean = testIncludes();
  console.log("Includes 2:", hasTwo);
}

main();
