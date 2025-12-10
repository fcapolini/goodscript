// Function hoisting comparison benchmark
// Compares hoisted nested functions vs. non-hoisted (with closures)

// HOISTED VERSION - nested recursive functions with NO closure dependencies
function hoistedFibonacci(n: integer53): integer53 {
  // This will be hoisted because it has no closure dependencies
  function fib(x: integer53): integer53 {
    if (x <= 1) {
      return x;
    }
    return fib(x - 1) + fib(x - 2);
  }
  return fib(n);
}

// NON-HOISTED VERSION - nested function WITH closure dependencies
function nonHoistedFibonacci(n: integer53): integer53 {
  const offset: integer53 = 0; // Closure variable - prevents hoisting
  
  function fib(x: integer53): integer53 {
    if (x <= 1) {
      return x + offset; // References parent scope variable
    }
    return fib(x - 1) + fib(x - 2);
  }
  return fib(n);
}

// HOISTED VERSION - factorial
function hoistedFactorial(n: integer53): integer53 {
  function factorial(x: integer53): integer53 {
    if (x <= 1) {
      return 1;
    }
    return x * factorial(x - 1);
  }
  return factorial(n);
}

// NON-HOISTED VERSION - factorial with closure
function nonHoistedFactorial(n: integer53): integer53 {
  const multiplier: integer53 = 1; // Closure variable
  
  function factorial(x: integer53): integer53 {
    if (x <= 1) {
      return multiplier;
    }
    return x * factorial(x - 1);
  }
  return factorial(n);
}

function runBenchmark(): void {
  const fibIterations: integer53 = 2000;
  const factIterations: integer53 = 200000;
  
  console.log("=== HOISTED vs NON-HOISTED COMPARISON ===\n");
  
  // Test hoisted fibonacci
  const hoistedFibStart: number = Date.now();
  for (let i: integer53 = 0; i < fibIterations; i = i + 1) {
    const result: integer53 = hoistedFibonacci(20);
  }
  const hoistedFibTime: number = Date.now() - hoistedFibStart;
  console.log(`Hoisted Fibonacci (2000x fib(20)): ${hoistedFibTime}ms`);
  
  // Test non-hoisted fibonacci
  const nonHoistedFibStart: number = Date.now();
  for (let i: integer53 = 0; i < fibIterations; i = i + 1) {
    const result: integer53 = nonHoistedFibonacci(20);
  }
  const nonHoistedFibTime: number = Date.now() - nonHoistedFibStart;
  console.log(`Non-hoisted Fibonacci (2000x fib(20)): ${nonHoistedFibTime}ms`);
  console.log(`Speedup: ${(nonHoistedFibTime / hoistedFibTime).toFixed(2)}x\n`);
  
  // Test hoisted factorial
  const hoistedFactStart: number = Date.now();
  for (let i: integer53 = 0; i < factIterations; i = i + 1) {
    const result: integer53 = hoistedFactorial(20);
  }
  const hoistedFactTime: number = Date.now() - hoistedFactStart;
  console.log(`Hoisted Factorial (200000x fact(20)): ${hoistedFactTime}ms`);
  
  // Test non-hoisted factorial
  const nonHoistedFactStart: number = Date.now();
  for (let i: integer53 = 0; i < factIterations; i = i + 1) {
    const result: integer53 = nonHoistedFactorial(20);
  }
  const nonHoistedFactTime: number = Date.now() - nonHoistedFactStart;
  console.log(`Non-hoisted Factorial (200000x fact(20)): ${nonHoistedFactTime}ms`);
  console.log(`Speedup: ${(nonHoistedFactTime / hoistedFactTime).toFixed(2)}x`);
}

runBenchmark();
