/**
 * Error Handling Example
 * 
 * Demonstrates:
 * - Error class and custom error types
 * - try-catch-finally blocks
 * - Error propagation
 * - Error message handling
 * - Resource cleanup with finally
 */

/// <reference path="../../../../../lib/goodscript.d.ts" />

class ValidationError {
  message: string;
  code: number;

  constructor(message: string, code: number) {
    this.message = message;
    this.code = code;
  }
}

class Calculator {
  private lastResult: number;

  constructor() {
    this.lastResult = 0;
  }

  divide(a: number, b: number): number {
    if (b === 0) {
      throw new ValidationError("Division by zero", 1001);
    }
    if (Number.isNaN(a) || Number.isNaN(b)) {
      throw new ValidationError("Invalid input: NaN", 1002);
    }
    const result = a / b;
    this.lastResult = result;
    return result;
  }

  safeDivide(a: number, b: number): number | null {
    try {
      return this.divide(a, b);
    } catch (e) {
      if ((e instanceof ValidationError) === true) {
        console.log(`Error: ${e.message} (code: ${e.code})`);
      }
      return null;
    }
  }

  getLastResult(): number {
    return this.lastResult;
  }
}

class ResourceManager {
  private isOpen: boolean;
  private name: string;

  constructor(name: string) {
    this.name = name;
    this.isOpen = false;
  }

  open(): void {
    console.log(`Opening resource: ${this.name}`);
    this.isOpen = true;
  }

  close(): void {
    if (this.isOpen === true) {
      console.log(`Closing resource: ${this.name}`);
      this.isOpen = false;
    }
  }

  process(shouldFail: boolean): void {
    if (this.isOpen === false) {
      throw new ValidationError("Resource not open", 2001);
    }
    if (shouldFail === true) {
      throw new ValidationError("Processing failed", 2002);
    }
    console.log(`Processing: ${this.name}`);
  }
}

const testBasicErrorHandling = (): void => {
  console.log("=== Basic Error Handling ===");
  const calc = new Calculator();

  // Test successful division
  const result1 = calc.safeDivide(10, 2);
  if (result1 !== null) {
    console.log(`10 / 2 = ${result1}`);
  }

  // Test division by zero
  const result2 = calc.safeDivide(10, 0);
  if (result2 === null) {
    console.log("Division by zero handled");
  }

  // Test NaN input
  const result3 = calc.safeDivide(10, NaN);
  if (result3 === null) {
    console.log("NaN input handled");
  }
};

const testFinallyBlock = (): void => {
  console.log("\n=== Finally Block Test ===");
  const resource = new ResourceManager("TestFile");

  // Test with success
  try {
    resource.open();
    resource.process(false);
  } catch (e) {
    if ((e instanceof ValidationError) === true) {
      console.log(`Caught error: ${e.message}`);
    }
  } finally {
    resource.close();
  }

  // Test with failure
  try {
    resource.open();
    resource.process(true);
  } catch (e) {
    if ((e instanceof ValidationError) === true) {
      console.log(`Caught error: ${e.message}`);
    }
  } finally {
    resource.close();
  }
};

const testNestedTryCatch = (): void => {
  console.log("\n=== Nested Try-Catch ===");
  const calc = new Calculator();

  try {
    console.log("Outer try block");
    try {
      console.log("Inner try block");
      calc.divide(10, 0);
    } catch (e) {
      if ((e instanceof ValidationError) === true) {
        console.log(`Inner catch: ${e.message}`);
        throw e; // Re-throw
      }
    }
  } catch (e) {
    if ((e instanceof ValidationError) === true) {
      console.log(`Outer catch: ${e.message}`);
    }
  }
};

const testMultipleErrorTypes = (): void => {
  console.log("\n=== Multiple Error Types ===");
  
  const processValue = (value: number): void => {
    if (value < 0) {
      throw new ValidationError("Negative value", 3001);
    }
    if (value > 100) {
      throw new ValidationError("Value too large", 3002);
    }
    console.log(`Processed value: ${value}`);
  };

  const values = [-5, 50, 150];
  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    try {
      processValue(val);
    } catch (e) {
      if ((e instanceof ValidationError) === true) {
        console.log(`Error for value ${val}: ${e.message} (${e.code})`);
      }
    }
  }
};

// Run all tests
const runTests = (): void => {
  testBasicErrorHandling();
  testFinallyBlock();
  testNestedTryCatch();
  testMultipleErrorTypes();
  console.log("\n=== All tests completed ===");
};

runTests();
