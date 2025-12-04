// Test fixture: Vanilla TypeScript with GoodScript
// Tests Phase 1 "clean" restrictions

const greet = (name: string): string => {
  return `Hello, ${name}!`;
};

const sum = (...numbers: number[]): number => {
  let total = 0;
  for (const num of numbers) {
    total += num;
  }
  return total;
};

const isEqual = (a: number, b: number): boolean => {
  return a === b;
};

export { greet, sum, isEqual };
