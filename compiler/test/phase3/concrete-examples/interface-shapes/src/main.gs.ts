/**
 * Interface and Shapes Example
 * 
 * Demonstrates:
 * - Interface definitions
 * - Classes implementing interfaces
 * - Polymorphism through interfaces
 * - Interface type checking
 * - Multiple implementations
 */

/// <reference path="../../../../../lib/goodscript.d.ts" />

interface Shape {
  area(): number;
  perimeter(): number;
  getName(): string;
}

interface Drawable {
  draw(): void;
}

interface Comparable {
  compareTo(other: Comparable): number;
}

class Rectangle implements Shape, Drawable {
  private width: number;
  private height: number;
  private name: string;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.name = "Rectangle";
  }

  area(): number {
    return this.width * this.height;
  }

  perimeter(): number {
    return 2 * (this.width + this.height);
  }

  getName(): string {
    return this.name;
  }

  draw(): void {
    console.log(`Drawing ${this.name}: ${this.width}x${this.height}`);
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }
}

class Circle implements Shape, Drawable {
  private radius: number;
  private name: string;

  constructor(radius: number) {
    this.radius = radius;
    this.name = "Circle";
  }

  area(): number {
    return Math.PI * this.radius * this.radius;
  }

  perimeter(): number {
    return 2 * Math.PI * this.radius;
  }

  getName(): string {
    return this.name;
  }

  draw(): void {
    console.log(`Drawing ${this.name}: radius ${this.radius}`);
  }

  getRadius(): number {
    return this.radius;
  }
}

class Triangle implements Shape, Drawable {
  private sideA: number;
  private sideB: number;
  private sideC: number;
  private name: string;

  constructor(sideA: number, sideB: number, sideC: number) {
    this.sideA = sideA;
    this.sideB = sideB;
    this.sideC = sideC;
    this.name = "Triangle";
  }

  area(): number {
    // Using Heron's formula
    const s = this.perimeter() / 2;
    return Math.sqrt(s * (s - this.sideA) * (s - this.sideB) * (s - this.sideC));
  }

  perimeter(): number {
    return this.sideA + this.sideB + this.sideC;
  }

  getName(): string {
    return this.name;
  }

  draw(): void {
    console.log(`Drawing ${this.name}: sides ${this.sideA}, ${this.sideB}, ${this.sideC}`);
  }
}

// Function that works with any Shape
const printShapeInfo = (shape: Shape): void => {
  console.log(`Shape: ${shape.getName()}`);
  console.log(`  Area: ${shape.area().toFixed(2)}`);
  console.log(`  Perimeter: ${shape.perimeter().toFixed(2)}`);
};

// Function that works with any Drawable
const drawShape = (drawable: Drawable): void => {
  drawable.draw();
};

// Calculate total area of multiple shapes
const calculateTotalArea = (shapes: Shape[]): number => {
  let total = 0;
  for (let i = 0; i < shapes.length; i++) {
    total = total + shapes[i].area();
  }
  return total;
};

// Find largest shape by area
const findLargestShape = (shapes: Shape[]): Shape | null => {
  if (shapes.length === 0) {
    return null;
  }
  
  let largest = shapes[0];
  let maxArea = largest.area();
  
  for (let i = 1; i < shapes.length; i++) {
    const currentArea = shapes[i].area();
    if (currentArea > maxArea) {
      maxArea = currentArea;
      largest = shapes[i];
    }
  }
  
  return largest;
};

const testShapes = (): void => {
  console.log("=== Shape Tests ===");
  
  const rect = new Rectangle(5, 10);
  const circle = new Circle(7);
  const triangle = new Triangle(3, 4, 5);
  
  printShapeInfo(rect);
  console.log("");
  printShapeInfo(circle);
  console.log("");
  printShapeInfo(triangle);
};

const testDrawable = (): void => {
  console.log("\n=== Drawable Tests ===");
  
  const shapes: Drawable[] = [
    new Rectangle(4, 6),
    new Circle(5),
    new Triangle(3, 4, 5)
  ];
  
  for (let i = 0; i < shapes.length; i++) {
    drawShape(shapes[i]);
  }
};

const testPolymorphism = (): void => {
  console.log("\n=== Polymorphism Tests ===");
  
  const shapes: Shape[] = [
    new Rectangle(10, 20),
    new Circle(10),
    new Triangle(6, 8, 10)
  ];
  
  const total = calculateTotalArea(shapes);
  console.log(`Total area: ${total.toFixed(2)}`);
  
  const largest = findLargestShape(shapes);
  if (largest !== null) {
    console.log(`Largest shape: ${largest.getName()} with area ${largest.area().toFixed(2)}`);
  }
};

const testTypeChecking = (): void => {
  console.log("\n=== Type Checking Tests ===");
  
  const rect = new Rectangle(8, 12);
  const circle = new Circle(6);
  
  // Both implement Shape
  const isShapeRect = rect instanceof Rectangle;
  const isShapeCircle = circle instanceof Circle;
  
  console.log(`Rectangle is Rectangle: ${isShapeRect}`);
  console.log(`Circle is Circle: ${isShapeCircle}`);
  
  // Specific type checks
  if ((rect instanceof Rectangle) === true) {
    console.log(`Rectangle width: ${rect.getWidth()}`);
  }
  
  if ((circle instanceof Circle) === true) {
    console.log(`Circle radius: ${circle.getRadius()}`);
  }
};

// Run all tests
const runInterfaceTests = (): void => {
  testShapes();
  testDrawable();
  testPolymorphism();
  testTypeChecking();
  console.log("\n=== All tests completed ===");
};

runInterfaceTests();
