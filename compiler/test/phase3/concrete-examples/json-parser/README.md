# JSON Parser Example

A comprehensive JSON tokenizer and parser implemented in GoodScript that demonstrates many language features.

## Features Demonstrated

- **Enums**: `TokenType` enum for token classification
- **Classes**: `Token`, `Tokenizer`, `Parser`, and `JsonValue` classes
- **Ownership types**: Uses `Unique<T>` for owned strings and tokenizer
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
- Ready for Phase 3 (rust) compilation
- Uses natural naming (e.g., `type` field) - Rust keywords automatically escaped to `r#type`

### ✅ TypeScript Compilation
- Generates valid TypeScript/JavaScript code
- Executes successfully with Node.js
- Produces expected output

### ⚠️ Rust Compilation
Compiles to Rust code but reveals some edge cases in the Rust code generator that need fixing:

1. ~~**Keyword escaping in parameters**: The parameter name `type` is a Rust keyword and needs to be escaped as `r#type`~~ ✅ **FIXED** - Systematic keyword escaping implemented!
2. **Enum member access**: Uses `.` instead of `::` for enum variants (e.g., `TokenType.EOF` should be `TokenType::EOF`)
3. **Mutable self references**: Methods that mutate state need `&mut self` instead of `&self`
4. **Option unwrapping**: Some nullable checks need proper Option handling

These are known limitations in the current Rust codegen implementation and will be addressed in future iterations.

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

### Rust (when codegen is complete)
```bash
# Compile to Rust
gsc src/main.gs.ts --out-dir dist --target rust

# Compile Rust to binary
rustc dist/main.rs -o json-parser

# Run
./json-parser
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
