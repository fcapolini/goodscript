// Test for-of loops compilation

function iterateArray(): void {
  const numbers: number[] = [1, 2, 3, 4, 5];
  
  console.log("All numbers:");
  for (const num of numbers) {
    console.log("  ", num);
  }
}

function filterWithBreak(): void {
  const numbers: number[] = [1, 2, 3, 4, 5];
  
  console.log("Numbers until we hit 4:");
  for (const num of numbers) {
    if (num === 4) {
      break;
    }
    console.log("  ", num);
  }
}

function skipWithContinue(): void {
  const numbers: number[] = [1, 2, 3, 4, 5];
  
  console.log("Odd numbers only:");
  for (const num of numbers) {
    if (num === 2 || num === 4) {
      continue;
    }
    console.log("  ", num);
  }
}

function nestedLoops(): void {
  const matrix: number[][] = [[1, 2], [3, 4]];
  
  console.log("Matrix:");
  for (const row of matrix) {
    for (const cell of row) {
      console.log("  Cell:", cell);
    }
  }
}

function main(): void {
  iterateArray();
  console.log("");
  
  filterWithBreak();
  console.log("");
  
  skipWithContinue();
  console.log("");
  
  nestedLoops();
}

main();
