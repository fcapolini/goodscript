/**
 * Minimal native execution test - validates end-to-end compilation
 * Based on conformance-tsc passing tests
 */

class Point {
  x: number;
  y: number;
  
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  
  distance(): number {
    return this.x * this.x + this.y * this.y;
  }
}

function main(): void {
  const p = new Point(3, 4);
  const d = p.distance();
  console.log('Point distance squared: ' + d.toString());
  
  if (d === 25) {
    console.log('✅ Test passed!');
  } else {
    console.log('❌ Test failed!');
  }
}

main();
