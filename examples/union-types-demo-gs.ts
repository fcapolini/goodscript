/**
 * Union Types Demo for GoodScript
 * 
 * This demonstrates union type support in GoodScript, particularly
 * the T | null and T | undefined patterns used for optional values.
 */

// ============================================================================
// Basic Union Types
// ============================================================================

/**
 * Function that returns string | null
 * In GC mode, this is represented as gs::String* (can be nullptr)
 */
function maybeGetName(hasName: boolean): string | null {
  if (hasName) {
    return "Alice";
  }
  return null;
}

/**
 * Function that returns number | undefined
 * undefined is similar to null in C++ representation
 */
function maybeGetAge(hasAge: boolean): number | undefined {
  if (hasAge) {
    return 42;
  }
  return undefined;
}

/**
 * Combining both: T | null | undefined
 * All nullable patterns are treated similarly in GC mode
 */
function maybeGetValue(mode: number): string | null | undefined {
  if (mode === 1) {
    return "value";
  } else if (mode === 2) {
    return null;
  }
  return undefined;
}

// ============================================================================
// Practical Examples: Array Operations
// ============================================================================

/**
 * Array.find() pattern: returns T | undefined
 * Returns undefined if no element matches the predicate
 */
function findNumber(numbers: number[], target: number): number | undefined {
  for (const num of numbers) {
    if (num === target) {
      return num;
    }
  }
  return undefined;
}

/**
 * Array.findIndex() pattern: returns number (uses -1 for not found)
 * This is an alternative to union types
 */
function findIndex(numbers: number[], target: number): number {
  for (let i = 0; i < numbers.length; i++) {
    if (numbers[i] === target) {
      return i;
    }
  }
  return -1;
}

// ============================================================================
// Practical Examples: Map Operations
// ============================================================================

/**
 * Map.get() pattern: returns V | undefined
 * Returns undefined if key doesn't exist
 * 
 * Note: Currently Map.get() returns the value or null in the runtime.
 * This demo shows the type signature we want for the future.
 */
function getFromMap(map: Map<string, number>, key: string): number | undefined {
  if (map.has(key)) {
    return map.get(key);
  }
  return undefined;
}

// ============================================================================
// Null Checking Patterns
// ============================================================================

/**
 * Pattern 1: Explicit null check with if statement
 */
function processNameExplicit(hasName: boolean): void {
  const name = maybeGetName(hasName);
  
  // In the future, type narrowing will recognize this check
  if (name !== null) {
    console.log("Name: " + name);
  } else {
    console.log("No name provided");
  }
}

/**
 * Pattern 2: Using default values
 * This uses a ternary to provide a fallback
 */
function getNameWithDefault(hasName: boolean): string {
  const name = maybeGetName(hasName);
  return name !== null ? name : "Unknown";
}

/**
 * Pattern 3: Early return pattern
 */
function requireName(hasName: boolean): string {
  const name = maybeGetName(hasName);
  if (name === null) {
    throw new Error("Name is required");
  }
  return name;
}

// ============================================================================
// Demo Execution
// ============================================================================

function demoBasicUnions(): void {
  console.log("=== Basic Union Types ===");
  
  const name1 = maybeGetName(true);
  console.log("With name: " + (name1 !== null ? name1 : "null"));
  
  const name2 = maybeGetName(false);
  console.log("Without name: " + (name2 !== null ? name2 : "null"));
  
  const age1 = maybeGetAge(true);
  console.log("With age: " + (age1 !== undefined ? age1 : "undefined"));
  
  const age2 = maybeGetAge(false);
  console.log("Without age: " + (age2 !== undefined ? age2 : "undefined"));
}

function demoArrayOperations(): void {
  console.log("=== Array Operations ===");
  
  const numbers = [1, 2, 3, 4, 5];
  
  const found = findNumber(numbers, 3);
  console.log("Find 3: " + (found !== undefined ? found : "not found"));
  
  const notFound = findNumber(numbers, 10);
  console.log("Find 10: " + (notFound !== undefined ? notFound : "not found"));
  
  const index1 = findIndex(numbers, 3);
  console.log("Index of 3: " + index1);
  
  const index2 = findIndex(numbers, 10);
  console.log("Index of 10: " + index2);
}

function demoMapOperations(): void {
  console.log("=== Map Operations ===");
  
  const map = new Map<string, number>();
  map.set("answer", 42);
  map.set("pi", 3);
  
  const value1 = getFromMap(map, "answer");
  console.log("Get 'answer': " + (value1 !== undefined ? value1 : "undefined"));
  
  const value2 = getFromMap(map, "missing");
  console.log("Get 'missing': " + (value2 !== undefined ? value2 : "undefined"));
}

function demoNullChecking(): void {
  console.log("=== Null Checking Patterns ===");
  
  processNameExplicit(true);
  processNameExplicit(false);
  
  const withDefault1 = getNameWithDefault(true);
  console.log("With default (has name): " + withDefault1);
  
  const withDefault2 = getNameWithDefault(false);
  console.log("With default (no name): " + withDefault2);
  
  try {
    const required = requireName(false);
  } catch (e) {
    console.log("Caught error: Name is required");
  }
}

// Run all demos
demoBasicUnions();
demoArrayOperations();
demoMapOperations();
demoNullChecking();

console.log("=== Union Types Demo Complete ===");

/**
 * Implementation Notes:
 * 
 * 1. GC Mode vs Ownership Mode:
 *    - GC mode: T | null → T* (nullable pointer, nullptr for null)
 *    - Ownership mode: T | null → std::optional<T> (future)
 * 
 * 2. Normalization:
 *    - In GC mode, T | null is normalized to just T because all objects
 *      are already nullable by default (represented as pointers)
 *    - This simplifies the type system while maintaining correctness
 * 
 * 3. Type Narrowing (Future):
 *    - Currently, null checks don't narrow types
 *    - Future enhancement: Track control flow to narrow union types
 *    - Example: After `if (x !== null)`, x is known to be non-null
 * 
 * 4. Undefined vs Null:
 *    - Both map to similar C++ representations
 *    - undefined: void return / missing value
 *    - null: explicit null value
 *    - In practice, they're often interchangeable
 * 
 * 5. Limitations:
 *    - General unions (string | number) not yet supported (needs std::variant)
 *    - Discriminated unions not supported (needs pattern matching)
 *    - Type guards not supported (needs runtime type info)
 * 
 * 6. Best Practices:
 *    - Use T | null for explicitly nullable values
 *    - Use T | undefined for optional returns (like Array.find)
 *    - Provide default values to avoid null checks
 *    - Use early returns to handle null cases
 *    - Throw errors for required values
 */
