// Control flow structures allowed in Phase 1

const findMax = (numbers: number[]): number | null => {
  if (numbers.length === 0) {
    return null;
  }
  
  let max = numbers[0];
  for (const num of numbers) {
    if (num > max) {
      max = num;
    }
  }
  
  return max;
};

const categorize = (value: number): string => {
  if (value < 0) {
    return 'negative';
  } else if (value === 0) {
    return 'zero';
  } else {
    return 'positive';
  }
};

const processArray = (items: string[]): string[] => {
  const result: string[] = [];
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item !== null && item !== undefined) {
      result.push(item.toUpperCase());
    }
  }
  
  return result;
};

// Switch statement
const getDayType = (day: number): string => {
  switch (day) {
    case 0:
    case 6:
      return 'weekend';
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
      return 'weekday';
    default:
      return 'invalid';
  }
};

export { findMax, categorize, processArray, getDayType };
