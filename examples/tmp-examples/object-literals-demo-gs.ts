type Point = {
  x: number;
  y: number;
};

function createPoint(): Point {
  return { x: 10, y: 20 };
}

const p: Point = createPoint();
console.log("x:", p.x);
console.log("y:", p.y);

type Person = {
  name: string;
  age: number;
};

const alice: Person = { name: "Alice", age: 30 };
console.log("Name:", alice.name);
console.log("Age:", alice.age);
