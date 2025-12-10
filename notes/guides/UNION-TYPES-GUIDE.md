# Union Types in GoodScript

**Version**: 0.12  
**Date**: December 9, 2025  
**Status**: Implemented (basic T | null and T | undefined support)

## Overview

Union types allow a value to be one of several types. GoodScript currently supports basic union types, particularly the `T | null` and `T | undefined` patterns used for optional values.

**Key Use Cases**:
- Optional return values (`Array.find()` → `T | undefined`)
- Nullable parameters and fields (`string | null`)
- Function overloading alternatives
- Error handling patterns

## Syntax

### Basic Union Types

```typescript
// Nullable types
let name: string | null = null;
let age: number | undefined = undefined;

// Combined nullability
let value: string | null | undefined;

// Function return types
function findUser(id: number): User | null {
  // Returns null if not found
}

function findIndex(arr: number[], target: number): number | undefined {
  // Returns undefined if not found
}
```

### Type Annotations

```typescript
// Variables
const result: string | null = maybeGetValue();

// Function parameters
function process(value: string | null): void {
  if (value !== null) {
    console.log(value);
  }
}

// Function returns
function lookup(key: string): number | undefined {
  // Implementation
}
```

## Implementation Details

### GC Mode (Default)

In GC mode, `T | null` is **normalized** to just `T` because all object types are represented as nullable pointers:

```typescript
// TypeScript
function getValue(): string | null {
  return null;
}

// C++ (GC mode)
gs::String* getValue() {
  return nullptr;  // null maps to nullptr
}
```

**Key Points**:
- All objects are `T*` (nullable pointers)
- `null` → `nullptr`
- `undefined` → treated similarly to `null`
- No performance overhead for nullable types

### Ownership Mode (Future)

In ownership mode (future enhancement), `T | null` will use `std::optional<T>`:

```cpp
// C++ (ownership mode)
std::optional<gs::String> getValue() {
  return std::nullopt;  // null maps to std::nullopt
}

// Checking for null
if (value.has_value()) {
  // value is not null
}

// Accessing value
gs::String str = value.value();
```

## Common Patterns

### Pattern 1: Optional Return Values

```typescript
function findNumber(arr: number[], target: number): number | undefined {
  for (const num of arr) {
    if (num === target) {
      return num;
    }
  }
  return undefined;
}

// Usage
const result = findNumber([1, 2, 3], 2);
if (result !== undefined) {
  console.log("Found: " + result);
}
```

### Pattern 2: Nullable Parameters

```typescript
function greet(name: string | null): void {
  if (name !== null) {
    console.log("Hello, " + name);
  } else {
    console.log("Hello, stranger");
  }
}

greet("Alice");  // Hello, Alice
greet(null);     // Hello, stranger
```

### Pattern 3: Default Values

```typescript
function getName(hasName: boolean): string {
  const name: string | null = hasName ? "Alice" : null;
  return name !== null ? name : "Unknown";
}
```

### Pattern 4: Early Return

```typescript
function requireValue(key: string): number {
  const value: number | undefined = lookup(key);
  if (value === undefined) {
    throw new Error("Value not found");
  }
  return value;
}
```

### Pattern 5: Chaining with Optional Chaining

```typescript
// Optional chaining works with union types
const user: User | null = findUser(123);
const email: string | null | undefined = user?.email;
```

## Standard Library Usage

### Array Methods

```typescript
// Array.find() returns T | undefined
const arr = [1, 2, 3, 4, 5];
const found: number | undefined = arr.find(x => x > 3);

// Array.findIndex() returns number (uses -1 for not found)
const index: number = arr.findIndex(x => x > 3);
```

### Map Methods

```typescript
// Map.get() returns V | undefined (future)
const map = new Map<string, number>();
map.set("answer", 42);

const value: number | undefined = map.get("answer");
if (value !== undefined) {
  console.log("Value: " + value);
}
```

## Type Checking

### Current Behavior

Currently, union types are recognized but not narrowed in control flow:

```typescript
function process(value: string | null): void {
  if (value !== null) {
    // Type is still (string | null) here
    // But value is guaranteed to be non-null at runtime
    console.log(value.length);
  }
}
```

### Future: Type Narrowing

Future versions will implement type narrowing:

```typescript
function process(value: string | null): void {
  if (value !== null) {
    // Type is narrowed to 'string' here
    console.log(value.length);  // Safe access
  }
  // Type is 'null' here
}
```

## Memory Management

### GC Mode

```typescript
// All of these compile to the same C++ type
let x: string;          // gs::String*
let y: string | null;   // gs::String* (normalized)
let z: string | undefined; // gs::String* (normalized)
```

**Rationale**: In GC mode, all objects are garbage-collected pointers, so they're inherently nullable. The union type annotation documents intent but doesn't change the runtime representation.

### Ownership Mode (Future)

```cpp
// Different representations based on nullability
string x;                    // gs::String (value type)
string | null y;             // std::optional<gs::String>
own<string> z;               // std::unique_ptr<gs::String>
own<string> | null w;        // std::unique_ptr<gs::String> (already nullable)
```

## Compilation

### Type Lowering

```typescript
// AST → IR lowering
ts.UnionTypeNode → IRType { kind: 'union', types: [...] }

// Normalization
normalizeUnion([string, null]) → string  // In GC mode
```

### C++ Code Generation

```cpp
// GC mode
string | null → gs::String*

// Ownership mode (future)
string | null → std::optional<gs::String>
number | undefined → std::optional<double>
```

## Limitations

### Not Yet Supported

1. **General unions** (`string | number`):
   ```typescript
   // NOT SUPPORTED YET
   let value: string | number;
   ```
   - Requires `std::variant<T, U>` in C++
   - Needs runtime type discrimination
   - Planned for future release

2. **Discriminated unions**:
   ```typescript
   // NOT SUPPORTED YET
   type Result = 
     | { type: 'success', value: number }
     | { type: 'error', message: string };
   ```
   - Requires pattern matching
   - Needs type guards
   - Complex feature for future

3. **Type guards**:
   ```typescript
   // NOT SUPPORTED YET
   if (typeof value === 'string') {
     // value is string here
   }
   ```
   - Requires runtime type information
   - Planned for future

4. **Type narrowing in control flow**:
   ```typescript
   // NOT FULLY SUPPORTED
   if (value !== null) {
     // Type not narrowed to non-null yet
   }
   ```
   - Basic structure in place
   - Needs dataflow analysis
   - Planned enhancement

### Workarounds

For unsupported features, use these alternatives:

**Instead of general unions**, use method overloads:
```typescript
// Instead of: function process(value: string | number)
function processString(value: string): void { }
function processNumber(value: number): void { }
```

**Instead of discriminated unions**, use explicit types:
```typescript
// Instead of union, use separate types
class Success {
  constructor(public value: number) {}
}
class Error {
  constructor(public message: string) {}
}
```

## Examples

### Complete Example: Array.find()

```typescript
function find<T>(
  arr: Array<T>, 
  predicate: (item: T) => boolean
): T | undefined {
  for (const item of arr) {
    if (predicate(item)) {
      return item;
    }
  }
  return undefined;
}

// Usage
const numbers = [1, 2, 3, 4, 5];
const result = find(numbers, n => n > 3);

if (result !== undefined) {
  console.log("Found: " + result);  // Found: 4
} else {
  console.log("Not found");
}
```

### Complete Example: Safe Lookup

```typescript
class Registry {
  private data: Map<string, string>;

  constructor() {
    this.data = new Map();
  }

  get(key: string): string | null {
    if (this.data.has(key)) {
      return this.data.get(key);
    }
    return null;
  }

  getOrDefault(key: string, defaultValue: string): string {
    const value = this.get(key);
    return value !== null ? value : defaultValue;
  }

  getOrThrow(key: string): string {
    const value = this.get(key);
    if (value === null) {
      throw new Error("Key not found: " + key);
    }
    return value;
  }
}
```

## Best Practices

1. **Use `T | null` for explicitly nullable values**:
   ```typescript
   function findUser(id: number): User | null {
     // null means "not found"
   }
   ```

2. **Use `T | undefined` for optional returns**:
   ```typescript
   function getFirst<T>(arr: T[]): T | undefined {
     // undefined means "empty array"
   }
   ```

3. **Provide default values when possible**:
   ```typescript
   function getName(user: User | null): string {
     return user !== null ? user.name : "Unknown";
   }
   ```

4. **Use early returns for required values**:
   ```typescript
   function process(value: string | null): void {
     if (value === null) {
       return;  // Early exit
     }
     // Process non-null value
   }
   ```

5. **Document nullability in function signatures**:
   ```typescript
   /**
    * Find a user by ID
    * @returns User object or null if not found
    */
   function findUser(id: number): User | null {
     // ...
   }
   ```

## Testing

```typescript
// Test nullable return values
function testNullable(): void {
  const value: string | null = maybeGetValue();
  
  // Explicit null check
  if (value === null) {
    console.log("Value is null");
    return;
  }
  
  console.log("Value: " + value);
}

// Test undefined returns
function testUndefined(): void {
  const arr = [1, 2, 3];
  const found: number | undefined = find(arr, x => x > 5);
  
  if (found === undefined) {
    console.log("Not found");
  } else {
    console.log("Found: " + found);
  }
}
```

## Migration Guide

### From TypeScript/JavaScript

Union types in GoodScript work the same as TypeScript:

```typescript
// TypeScript - works in GoodScript
function getValue(): string | null {
  return Math.random() > 0.5 ? "value" : null;
}

// TypeScript - NOT yet supported in GoodScript
function process(value: string | number): void {
  // General unions not supported
}
```

### From C++

If you're familiar with C++:

```cpp
// C++ optional
std::optional<int> getValue();
if (getValue().has_value()) { }

// GoodScript equivalent
function getValue(): number | undefined;
if (getValue() !== undefined) { }
```

## Performance

### GC Mode
- **Zero overhead**: Union types are normalized away
- Same performance as non-union types
- Pointers are already nullable

### Ownership Mode (Future)
- `std::optional<T>`: Small overhead for has_value flag
- Optimized away in many cases
- No heap allocation overhead

## Future Enhancements

1. **Type Narrowing**: Control flow analysis to narrow types
2. **General Unions**: `std::variant<T, U>` for `T | U`
3. **Discriminated Unions**: Pattern matching support
4. **Type Guards**: `typeof`, `instanceof` checks
5. **Exhaustiveness Checking**: Ensure all cases handled

## See Also

- [Optional Chaining Guide](./OPTIONAL-CHAINING-GUIDE.md) - For `?.` operator
- [Null Safety Guide](./NULL-SAFETY-GUIDE.md) - For `use<T>` semantics
- [Phase 8 Plan](./PHASE-8-UNION-TYPES-PLAN.md) - Implementation details
- [Language Specification](./docs/LANGUAGE.md) - Complete language reference

---

Last Updated: December 9, 2025
