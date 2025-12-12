const numbers: integer[] = [1, 2, 3, 4, 5, 6];
const evens = numbers.filter((n) => n % 2 === 0);
const doubled = evens.map((n) => n * 2);

for (const num of doubled) {
  console.log(num);
}
