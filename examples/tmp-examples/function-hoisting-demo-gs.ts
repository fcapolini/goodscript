// Fibonacci using nested recursive function
// This demonstrates function hoisting optimization:
// The nested 'fib' function will be hoisted to module level
// because it's recursive and has no closure dependencies

function calculateFibonacci(n: integer53): integer53 {
  // Nested recursive function - will be hoisted!
  function fib(x: integer53): integer53 {
    if (x <= 1) {
      return x;
    }
    return fib(x - 1) + fib(x - 2);
  }
  
  return fib(n);
}

// Factorial using nested recursive function
function calculateFactorial(n: integer53): integer53 {
  // Nested recursive function - will be hoisted!
  function factorial(x: integer53): integer53 {
    if (x <= 1) {
      return 1;
    }
    return x * factorial(x - 1);
  }
  
  return factorial(n);
}

// GCD using nested recursive function
function calculateGCD(a: integer53, b: integer53): integer53 {
  // Nested recursive function - will be hoisted!
  function gcd(x: integer53, y: integer53): integer53 {
    if (y === 0) {
      return x;
    }
    return gcd(y, x % y);
  }
  
  return gcd(a, b);
}

// Example with closure - should NOT be hoisted
function withClosure(multiplier: integer53): integer53 {
  // This function references 'multiplier' from parent scope
  // It will NOT be hoisted because it has closure dependencies
  function scale(n: integer53): integer53 {
    if (n === 0) {
      return 0;
    }
    return scale(n - 1) + multiplier;
  }
  
  return scale(5);
}

console.log("Fibonacci(10) =", calculateFibonacci(10));
console.log("Factorial(10) =", calculateFactorial(10));
console.log("GCD(48, 18) =", calculateGCD(48, 18));
console.log("WithClosure(7) =", withClosure(7));
