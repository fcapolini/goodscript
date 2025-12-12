function sumArray(arr: integer[], index: integer): integer {
  if (index >= arr.length()) {
    return 0;
  }
  return arr[index] + sumArray(arr, index + 1);
}

const nums: integer[] = [1, 2, 3, 4, 5];
console.log(sumArray(nums, 0));
