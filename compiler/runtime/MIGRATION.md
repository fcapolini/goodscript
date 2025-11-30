# Migration Guide: Using GoodScript Runtime Wrappers

This guide explains how the C++ codegen (`cpp/codegen.ts`) generates code that uses the GoodScript runtime wrapper classes (`gs::String`, `gs::Array`, etc.) instead of raw C++ STL types.

## Overview of Changes

### Before (Raw STL)
```cpp
#include <string>
#include <vector>
#include <unordered_map>

std::string message = "Hello";
std::vector<int> numbers = {1, 2, 3};
std::unordered_map<std::string, int> cache;
```

### After (GoodScript Wrappers)
```cpp
#include "gs_runtime.hpp"

gs::String message = "Hello";
gs::Array<int> numbers = {1, 2, 3};
gs::Map<gs::String, int> cache;
```

## Step-by-Step Migration

### 1. Update Include Generation

**File**: `cpp-codegen.ts`

**Current**:
```typescript
private buildOutput(): string {
  const lines: string[] = [];
  
  // Add includes
  for (const include of this.includes) {
    lines.push(`#include ${include}`);
  }
  // ...
}
```

**New**:
```typescript
private buildOutput(): string {
  const lines: string[] = [];
  
  // Add GoodScript runtime first
  lines.push('#include "gs_runtime.hpp"');
  lines.push('');
  
  // Other includes (if any) - most won't be needed anymore
  for (const include of this.includes) {
    // Skip includes now provided by gs_runtime.hpp
    if (include === '<string>' || 
        include === '<vector>' || 
        include === '<unordered_map>' ||
        include === '<unordered_set>' ||
        include === '<memory>' ||
        include === '<optional>') {
      continue;
    }
    lines.push(`#include ${include}`);
  }
  // ...
}
```

### 2. Update Type Mappings

**File**: `cpp-codegen.ts` - Method `generateType()`

**Current**:
```typescript
private generateType(type: ts.TypeNode): string {
  // ...
  } else if (type.kind === ts.SyntaxKind.StringKeyword) {
    return 'std::string';
  } else if (ts.isArrayTypeNode(type)) {
    this.addInclude('<vector>');
    const elementType = this.generateType(type.elementType);
    return `std::vector<${elementType}>`;
  }
  // ...
}
```

**New**:
```typescript
private generateType(type: ts.TypeNode): string {
  // ...
  } else if (type.kind === ts.SyntaxKind.StringKeyword) {
    return 'gs::String';
  } else if (ts.isArrayTypeNode(type)) {
    // No need to add include - gs_runtime.hpp provides it
    const elementType = this.generateType(type.elementType);
    return `gs::Array<${elementType}>`;
  }
  // ...
}
```

**Update `generateTypeReference()` as well**:

```typescript
private generateTypeReference(type: ts.TypeReferenceNode): string {
  const typeName = type.typeName.getText();
  
  // ... (ownership qualifiers stay the same)
  
  } else if (typeName === 'Map' && type.typeArguments && type.typeArguments.length === 2) {
    const keyType = this.generateType(type.typeArguments[0]);
    const valueType = this.generateType(type.typeArguments[1]);
    return `gs::Map<${keyType}, ${valueType}>`;
  } else if (typeName === 'Set' && type.typeArguments && type.typeArguments.length > 0) {
    const elementType = this.generateType(type.typeArguments[0]);
    return `gs::Set<${elementType}>`;
  }
  // ...
}
```

### 3. Update Method Call Translations

**File**: `cpp-codegen.ts` - Method `generateCallExpression()`

Many method translations can be simplified or removed:

**Current (lots of manual translation)**:
```typescript
// String methods
if (methodName === 'startsWith') {
  return `gs::starts_with(${object}, ${args})`;
}

if (methodName === 'substring') {
  const argArray = expr.arguments.map(arg => this.generateExpression(arg));
  if (argArray.length === 1) {
    return `${object}${accessor}substr(${argArray[0]})`;
  } else if (argArray.length === 2) {
    return `${object}${accessor}substr(${argArray[0]}, ${argArray[1]} - ${argArray[0]})`;
  }
}

if (methodName === 'indexOf') {
  return `gs::index_of(${object}, ${args})`;
}
```

**New (direct method calls)**:
```typescript
// String methods - most work directly!
if (methodName === 'charAt' || 
    methodName === 'charCodeAt' ||
    methodName === 'indexOf' ||
    methodName === 'lastIndexOf' ||
    methodName === 'substring' ||
    methodName === 'slice' ||
    methodName === 'toLowerCase' ||
    methodName === 'toUpperCase' ||
    methodName === 'trim' ||
    methodName === 'startsWith' ||
    methodName === 'endsWith' ||
    methodName === 'includes' ||
    methodName === 'repeat' ||
    methodName === 'padStart' ||
    methodName === 'padEnd') {
  // These all map directly!
  return `${object}${accessor}${methodName}(${args})`;
}

// Array methods - most work directly!
if (methodName === 'push' ||
    methodName === 'pop' ||
    methodName === 'shift' ||
    methodName === 'unshift' ||
    methodName === 'slice' ||
    methodName === 'splice' ||
    methodName === 'map' ||
    methodName === 'filter' ||
    methodName === 'reduce' ||
    methodName === 'find' ||
    methodName === 'findIndex' ||
    methodName === 'indexOf' ||
    methodName === 'lastIndexOf' ||
    methodName === 'includes' ||
    methodName === 'join' ||
    methodName === 'reverse' ||
    methodName === 'sort' ||
    methodName === 'forEach' ||
    methodName === 'every' ||
    methodName === 'some') {
  // These all map directly!
  return `${object}${accessor}${methodName}(${args})`;
}

// Map methods
if (methodName === 'set' ||
    methodName === 'get' ||
    methodName === 'has' ||
    methodName === 'clear' ||
    methodName === 'forEach' ||
    methodName === 'keys' ||
    methodName === 'values' ||
    methodName === 'entries') {
  return `${object}${accessor}${methodName}(${args})`;
}

// Special case: Map/Set.delete() -> delete_() (C++ keyword)
if (methodName === 'delete') {
  return `${object}${accessor}delete_(${args})`;
}

// Set methods
if (methodName === 'add') {
  return `${object}${accessor}add(${args})`;
}
```

### 4. Update Property Access

**File**: `cpp-codegen.ts` - Method `generatePropertyAccess()`

**Current**:
```typescript
if (propertyName === 'length') {
  // array.length -> array.size()
  const sizeCall = `${object}${accessor}size()`;
  return needsOptionalUnwrap ? `(*${object})->size()` : sizeCall;
}
```

**New**:
```typescript
if (propertyName === 'length') {
  // Both gs::String and gs::Array have length() method
  const lengthCall = `${object}${accessor}length()`;
  return needsOptionalUnwrap ? `(*${object})->length()` : lengthCall;
}

if (propertyName === 'size') {
  // gs::Map and gs::Set use size()
  const sizeCall = `${object}${accessor}size()`;
  return needsOptionalUnwrap ? `(*${object})->size()` : sizeCall;
}
```

### 5. Update Literal Generation

**File**: `cpp-codegen.ts` - Method `generateExpression()`

**For string literals**:

**Current**:
```typescript
if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
  const text = expr.text;
  // Escape the string
  const escaped = text.replace(/\\/g, '\\\\')
                     .replace(/"/g, '\\"')
                     .replace(/\n/g, '\\n')
                     .replace(/\r/g, '\\r')
                     .replace(/\t/g, '\\t');
  return `"${escaped}"`;
}
```

**New**:
```typescript
if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
  const text = expr.text;
  // Escape the string
  const escaped = text.replace(/\\/g, '\\\\')
                     .replace(/"/g, '\\"')
                     .replace(/\n/g, '\\n')
                     .replace(/\r/g, '\\r')
                     .replace(/\t/g, '\\t');
  return `gs::String("${escaped}")`;
}
```

**For array literals**:

**Current**:
```typescript
if (ts.isArrayLiteralExpression(expr)) {
  const elements = expr.elements.map(el => this.generateExpression(el));
  
  // Try to infer the type
  let inferredType = 'auto';
  if (expr.elements.length > 0) {
    const firstElement = expr.elements[0];
    if (ts.isNumericLiteral(firstElement)) {
      inferredType = 'std::vector<double>';
    } else if (ts.isStringLiteral(firstElement)) {
      inferredType = 'std::vector<std::string>';
    }
    // ...
  }
  
  if (inferredType !== 'auto') {
    return `${inferredType}{${elements.join(', ')}}`;
  }
  return `{${elements.join(', ')}}`;
}
```

**New**:
```typescript
if (ts.isArrayLiteralExpression(expr)) {
  const elements = expr.elements.map(el => this.generateExpression(el));
  
  // Try to infer the type
  let inferredType = 'auto';
  if (expr.elements.length > 0) {
    const firstElement = expr.elements[0];
    if (ts.isNumericLiteral(firstElement)) {
      inferredType = 'gs::Array<double>';
    } else if (ts.isStringLiteral(firstElement)) {
      inferredType = 'gs::Array<gs::String>';
    }
    // ...
  }
  
  if (inferredType !== 'auto') {
    return `${inferredType}{${elements.join(', ')}}`;
  }
  return `{${elements.join(', ')}}`;
}
```

### 6. Update Static Method Calls

**File**: `cpp-codegen.ts` - Method `generateCallExpression()`

**For `String.fromCharCode()`**:

**Current**:
```typescript
if (ts.isPropertyAccessExpression(expr.expression)) {
  const obj = expr.expression.expression.getText();
  const method = expr.expression.name.getText();
  if (obj === 'String' && method === 'fromCharCode') {
    return `gs::from_char_code(${args})`;
  }
}
```

**New**:
```typescript
if (ts.isPropertyAccessExpression(expr.expression)) {
  const obj = expr.expression.expression.getText();
  const method = expr.expression.name.getText();
  if (obj === 'String' && method === 'fromCharCode') {
    return `gs::String::fromCharCode(${args})`;
  }
}
```

**For `JSON.stringify()`**:

**Current**:
```typescript
if (obj === 'JSON' && method === 'stringify') {
  return `JSON::stringify(${args})`;
}
```

**New**:
```typescript
if (obj === 'JSON' && method === 'stringify') {
  return `gs::JSON::stringify(${args})`;
}

if (obj === 'JSON' && method === 'parse') {
  return `gs::JSON::parse(${args})`;
}
```

**For `console` methods**:

**Current** (various approaches):
```typescript
// console.log probably generated as std::cout << ... or similar
```

**New**:
```typescript
if (obj === 'console' && (method === 'log' || method === 'error' || method === 'warn')) {
  return `gs::console::${method}(${args})`;
}
```

### 7. Remove Helper Functions

The following helper functions in the generated preamble can be removed since they're now in `gs_runtime.hpp`:

- `starts_with()`
- `index_of()`
- `from_char_code()`
- `to_string_int()`
- `map_get()` (replaced by `Map::get()`)
- `array_get()` (use `Array::operator[]` or add bounds checking)
- `json_stringify()` (replaced by `JSON::stringify()`)
- `wrap_for_push()` (moved to `gs_runtime.hpp`)

**Remove from `buildOutput()` or similar**:

```typescript
private generateHelperFunctions(): string[] {
  const lines: string[] = [];
  
  // Remove all the old helper functions - they're in gs_runtime.hpp now!
  // Just keep any truly custom helpers that aren't in the runtime
  
  return lines;
}
```

### 8. Update Binary Operations

**String concatenation**:

**Current**:
```typescript
if (expr.operatorToken.kind === ts.SyntaxKind.PlusToken) {
  // Check if either operand is a string
  const leftIsString = /* ... type checking ... */;
  const rightIsString = /* ... type checking ... */;
  
  if (leftIsString || rightIsString) {
    // String concatenation
    return `${left} + ${right}`;  // Relies on std::string operator+
  }
}
```

**New**:
```typescript
if (expr.operatorToken.kind === ts.SyntaxKind.PlusToken) {
  // gs::String has operator+ defined, works naturally
  return `(${left} + ${right})`;
}
```

### 9. Example Complete Transformation

**TypeScript/GoodScript Input**:
```typescript
const message: string = "Hello";
const upper = message.toUpperCase();
const index = message.indexOf("World");
const numbers: Array<number> = [1, 2, 3];
const doubled = numbers.map(x => x * 2);
console.log(JSON.stringify(numbers));
```

**Old Generated C++**:
```cpp
#include <string>
#include <vector>
#include <iostream>

namespace gs {
  inline bool starts_with(const std::string& str, const std::string& prefix) { /*...*/ }
  inline int index_of(const std::string& str, const std::string& search) { /*...*/ }
  inline std::string json_stringify(const std::vector<double>& arr) { /*...*/ }
  // ... many more helpers ...
}

int main() {
  std::string message = "Hello";
  std::string upper = /* manual toUpperCase implementation */;
  int index = gs::index_of(message, "World");
  std::vector<double> numbers = {1.0, 2.0, 3.0};
  auto doubled = /* manual map implementation with lambda */;
  std::cout << gs::json_stringify(numbers) << std::endl;
  return 0;
}
```

**New Generated C++**:
```cpp
#include "gs_runtime.hpp"

int main() {
  gs::String message = gs::String("Hello");
  gs::String upper = message.toUpperCase();
  int index = message.indexOf(gs::String("World"));
  gs::Array<double> numbers = {1.0, 2.0, 3.0};
  auto doubled = numbers.map([](double x) { return x * 2; });
  gs::console::log(gs::JSON::stringify(numbers));
  return 0;
}
```

## Benefits Summary

1. **Cleaner Code**: Less boilerplate, more idiomatic
2. **TypeScript-like API**: Methods match TypeScript exactly
3. **Easier Maintenance**: Runtime library can be updated independently
4. **Better Type Safety**: Distinct types catch more errors
5. **Simpler Codegen**: Less translation logic, fewer special cases
6. **Future-proof**: Can optimize runtime without changing codegen

## Testing Strategy

1. **Unit Tests**: Test each method of wrapper classes (already done in `test_runtime.cpp`)
2. **Codegen Tests**: Update existing phase 3 tests to generate new syntax
3. **Runtime Equivalence**: Verify JS and C++ produce identical output
4. **Compilation Tests**: Ensure generated code compiles with g++/clang++
5. **Benchmark**: Verify zero-cost abstraction (wrappers optimized away)

## Rollout Plan

1. ✅ **Create runtime library** (DONE)
2. ✅ **Write runtime tests** (DONE)
3. **Update codegen incrementally**:
   - Start with simple types (string, number, boolean)
   - Then arrays
   - Then maps/sets
   - Then method calls
   - Finally, edge cases
4. **Update existing tests** to expect new generated code
5. **Add new tests** for runtime wrapper features
6. **Document** the runtime API for users

## Notes

- The wrapper classes are **header-only** and **inline**, so there's no runtime overhead
- The compiler will optimize away the wrapper layer in release builds
- **C++ interop** is preserved via `.str()`, `.vec()`, `.map()` methods
- The runtime can be enhanced independently of the codegen
