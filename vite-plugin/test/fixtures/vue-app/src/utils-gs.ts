// Utility functions in GoodScript for Vue app

const formatCount = (count: number): string => {
  return `Count is: ${count}`;
};

const calculateSum = (...numbers: number[]): number => {
  let total = 0;
  for (const num of numbers) {
    total += num;
  }
  return total;
};

export { formatCount, calculateSum };
