// Type definitions and interfaces

interface Point {
  x: number;
  y: number;
}

interface Rectangle {
  topLeft: Point;
  bottomRight: Point;
}

type Color = 'red' | 'green' | 'blue';

type Result<T> = 
  | { success: true; value: T }
  | { success: false; error: string };

const createPoint = (x: number, y: number): Point => {
  return { x, y };
};

const calculateArea = (rect: Rectangle): number => {
  const width = rect.bottomRight.x - rect.topLeft.x;
  const height = rect.bottomRight.y - rect.topLeft.y;
  return width * height;
};

const parseNumber = (input: string): Result<number> => {
  const parsed = parseFloat(input);
  
  if (Number.isNaN(parsed)) {
    return { success: false, error: 'Invalid number' };
  }
  
  return { success: true, value: parsed };
};

// Generics
const identity = <T>(value: T): T => {
  return value;
};

const first = <T>(items: T[]): T | undefined => {
  if (items.length === 0) {
    return undefined;
  }
  return items[0];
};

export { Point, Rectangle, Color, Result, createPoint, calculateArea, parseNumber, identity, first };
