# JSON Parser Example

A comprehensive JSON tokenizer and parser implemented in GoodScript that demonstrates many language features.

## Features Demonstrated

- **Enums**: `TokenType` enum for token classification
- **Classes**: `Token`, `Tokenizer`, `Parser`, and `JsonValue` classes
- **Ownership types**: Uses `own<T>` for owned strings and tokenizer
- **String manipulation**: Character-by-character parsing with peek/advance pattern
- **Null handling**: Proper nullable return types (`string | null`, `JsonValue | null`)
- **Control flow**: Complex while loops, if-else chains, and recursive descent parsing
- **State management**: Position tracking, token buffering
- **Static methods**: Factory pattern for creating `JsonValue` instances
- **Collections**: Use of `Map` and arrays

## Current Status

### ✅ GoodScript Validation
- Passes all Phase 1 (clean) restrictions
- Passes all Phase 2 (dag) ownership checks
- Ready for Phase 3 (native) compilation
- Uses natural naming (uses C++ "gs" namespace)

### ✅ TypeScript Compilation
- Generates valid TypeScript/JavaScript code
- Executes successfully with Node.js
- Produces expected output

### ✅ Native Compilation

## Building and Running

### TypeScript/JavaScript
```bash
# Compile to TypeScript
gsc src/main.gs.ts --out-dir dist --target typescript

# Run with Node.js
node dist/main.js
```

Expected output:
```
Parsed JSON kind: object
```

### Native
```bash
# Compile to C++
gsc src/main.gs.ts --out-dir dist --target native

# Compile C++ to binary
gcc dist/main.cpp -o json-parser

# Run
./json-parser
```

Expected output:
```
Parsed JSON kind: object
```

## Code Structure

- **Token**: Represents a single token (type + value)
- **Tokenizer**: Breaks input string into tokens
  - `peek()`: Look at current character without consuming
  - `advance()`: Move to next character
  - `skipWhitespace()`: Skip whitespace characters
  - `readString()`: Parse string literals
  - `readNumber()`: Parse numeric literals
  - `readKeyword()`: Parse keywords (true, false, null)
  - `nextToken()`: Get next token from input

- **JsonValue**: Represents a parsed JSON value
  - Supports strings, numbers, booleans, null, objects (Map), and arrays
  - Factory methods for type-safe construction

- **Parser**: Recursive descent parser
  - `parseValue()`: Parse any JSON value
  - `parseObject()`: Parse object literals
  - `parseArray()`: Parse array literals

## Test Coverage

See `test/phase3/json-parser-example.test.ts` for automated tests.
