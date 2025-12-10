// Function hoisting benchmark - nested recursive functions
// Tests the performance impact of hoisting optimization

// Uses nested recursive fibonacci (will be hoisted)
function nestedFibonacci(n: integer53): integer53 {
  function fib(x: integer53): integer53 {
    if (x <= 1) {
      return x;
    }
    return fib(x - 1) + fib(x - 2);
  }
  return fib(n);
}

// Uses nested recursive factorial (will be hoisted)
function nestedFactorial(n: integer53): integer53 {
  function factorial(x: integer53): integer53 {
    if (x <= 1) {
      return 1;
    }
    return x * factorial(x - 1);
  }
  return factorial(n);
}

// Uses nested recursive GCD (will be hoisted)
function nestedGCD(a: integer53, b: integer53): integer53 {
  function gcd(x: integer53, y: integer53): integer53 {
    if (y === 0) {
      return x;
    }
    return gcd(y, x % y);
  }
  return gcd(a, b);
}

function runBenchmark(): void {
  const fibIterations: integer53 = 100;
  const factIterations: integer53 = 10000;
  const gcdIterations: integer53 = 100000;
  
  const startTotal: number = Date.now();
  
  // Fibonacci benchmark - more expensive computation
  const fibStart: number = Date.now();
  for (let i: integer53 = 0; i < fibIterations; i = i + 1) {
    const result: integer53 = nestedFibonacci(25);
  }
  const fibTime: number = Date.now() - fibStart;
  console.log(`Fibonacci (100 iterations of fib(25)): ${fibTime}ms`);
  
  // Factorial benchmark
  const factStart: number = Date.now();
  for (let i: integer53 = 0; i < factIterations; i = i + 1) {
    const result: integer53 = nestedFactorial(20);
  }
  const factTime: number = Date.now() - factStart;
  console.log(`Factorial (10000 iterations of fact(20)): ${factTime}ms`);
  
  // GCD benchmark
  const gcdStart: number = Date.now();
  for (let i: integer53 = 0; i < gcdIterations; i = i + 1) {
    const result: integer53 = nestedGCD(48, 18);
  }
  const gcdTime: number = Date.now() - gcdStart;
  console.log(`GCD (100000 iterations): ${gcdTime}ms`);
  
  const totalTime: number = Date.now() - startTotal;
  console.log(`Total time: ${totalTime}ms`);
}

runBenchmark();
