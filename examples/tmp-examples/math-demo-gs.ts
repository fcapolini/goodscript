// GoodScript Math Object Demo
// Demonstrates all Math object methods and constants

function basicMathOperations(): void {
  console.log('=== Basic Math Operations ===');
  
  // Min/Max
  const min = Math.min(10, 5);
  const max = Math.max(10, 5);
  console.log('Math.min(10, 5) =', min);
  console.log('Math.max(10, 5) =', max);
  
  // Absolute value
  const abs = Math.abs(-42);
  console.log('Math.abs(-42) =', abs);
  
  // Rounding
  console.log('Math.floor(3.7) =', Math.floor(3.7));
  console.log('Math.ceil(3.2) =', Math.ceil(3.2));
  console.log('Math.round(3.5) =', Math.round(3.5));
  console.log('Math.trunc(3.9) =', Math.trunc(3.9));
}

function powerAndRoots(): void {
  console.log('\n=== Power and Roots ===');
  
  const sqrt = Math.sqrt(16);
  const pow = Math.pow(2, 8);
  const exp = Math.exp(1);
  
  console.log('Math.sqrt(16) =', sqrt);
  console.log('Math.pow(2, 8) =', pow);
  console.log('Math.exp(1) =', exp);
}

function trigonometry(): void {
  console.log('\n=== Trigonometric Functions ===');
  
  // Sine, cosine, tangent
  const sin90 = Math.sin(Math.PI / 2);
  const cos0 = Math.cos(0);
  const tan45 = Math.tan(Math.PI / 4);
  
  console.log('Math.sin(PI/2) =', sin90);
  console.log('Math.cos(0) =', cos0);
  console.log('Math.tan(PI/4) =', tan45);
  
  // Inverse functions
  const asin = Math.asin(1);
  const acos = Math.acos(1);
  const atan = Math.atan(1);
  
  console.log('Math.asin(1) =', asin);
  console.log('Math.acos(1) =', acos);
  console.log('Math.atan(1) =', atan);
}

function logarithms(): void {
  console.log('\n=== Logarithmic Functions ===');
  
  const logE = Math.log(Math.E);
  const log10_100 = Math.log10(100);
  const log2_8 = Math.log2(8);
  
  console.log('Math.log(E) =', logE);
  console.log('Math.log10(100) =', log10_100);
  console.log('Math.log2(8) =', log2_8);
}

function constants(): void {
  console.log('\n=== Mathematical Constants ===');
  
  console.log('Math.PI =', Math.PI);
  console.log('Math.E =', Math.E);
  console.log('Math.LN2 =', Math.LN2);
  console.log('Math.LN10 =', Math.LN10);
  console.log('Math.LOG2E =', Math.LOG2E);
  console.log('Math.LOG10E =', Math.LOG10E);
  console.log('Math.SQRT1_2 =', Math.SQRT1_2);
  console.log('Math.SQRT2 =', Math.SQRT2);
}

function utilities(): void {
  console.log('\n=== Utility Functions ===');
  
  console.log('Math.sign(42) =', Math.sign(42));
  console.log('Math.sign(-42) =', Math.sign(-42));
  console.log('Math.sign(0) =', Math.sign(0));
  
  const random1 = Math.random();
  const random2 = Math.random();
  console.log('Math.random() =', random1);
  console.log('Math.random() =', random2);
}

function practicalExample(): void {
  console.log('\n=== Practical Example: Distance Calculation ===');
  
  // Calculate distance between two points using Pythagorean theorem
  const x1 = 0;
  const y1 = 0;
  const x2 = 3;
  const y2 = 4;
  
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
  
  console.log('Point 1: (', x1, ',', y1, ')');
  console.log('Point 2: (', x2, ',', y2, ')');
  console.log('Distance:', distance);
}

function main(): void {
  console.log('GoodScript Math Object Demo\n');
  
  basicMathOperations();
  powerAndRoots();
  trigonometry();
  logarithms();
  constants();
  utilities();
  practicalExample();
  
  console.log('\n=== Demo Complete ===');
}

main();
