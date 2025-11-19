# GoodScript Compiler

The GoodScript compiler (`gsc`) transforms GoodScript (`.gs.ts` and `.gs.tsx`) files into JavaScript/TypeScript or Rust, enforcing ownership semantics and memory safety guarantees.

## Overview

The compiler implements GoodScript in three phases:

- **Phase 1** (✅ In Progress): Strict TypeScript semantics - eliminates JavaScript "bad parts"
- **Phase 2** (🚧 In Progress): Ownership analysis and DAG validation  
- **Phase 3** (📋 Planned): Rust code generation for native performance

## Installation

```bash
npm install goodscript
```

Or install globally:

```bash
npm install -g goodscript
```

## Usage

### Command Line

Compile a single file:

```bash
gsc myfile.gs.ts
# or for React/JSX:
gsc mycomponent.gs.tsx
```

Compile with options:

```bash
gsc --outDir dist --target ES2020 src/**/*.gs.ts
```

Run a GoodScript file directly:

```bash
gs myfile.gs.ts
```

### Programmatic API

```typescript
import { compile } from 'goodscript';

const result = compile({
  filePath: 'src/main.gs.ts',
  outDir: 'dist',
  target: 'ES2020'
});

if (result.diagnostics.length > 0) {
  console.error('Compilation errors:', result.diagnostics);
}
```

## Project Structure

```
compiler/
├── src/
│   ├── compiler.ts           # Main compilation orchestrator
│   ├── parser.ts              # TypeScript AST parser
│   ├── validator.ts           # Phase 1 restrictions enforcer
│   ├── ownership-analyzer.ts  # Phase 2 ownership tracking
│   ├── null-check-analyzer.ts # Null safety enforcement
│   ├── ts-codegen.ts          # TypeScript code generator
│   ├── gsc.ts                 # CLI compiler entry point
│   └── gs.ts                  # CLI runner entry point
│
├── test/
│   ├── phase1/                # Phase 1 restriction tests
│   ├── phase2/                # Phase 2 ownership tests (TBD)
│   └── phase3/                # Phase 3 codegen tests (TBD)
│
└── lib/
    └── goodscript.d.ts        # Type definitions for ownership wrappers
```

## Development

### Building

```bash
npm run build        # Compile TypeScript to JavaScript
npm run watch        # Watch mode for development
npm run clean        # Remove build artifacts
```

### Testing

```bash
npm test             # Run all tests
npm test -- phase1   # Run only Phase 1 tests
npm run test:watch   # Watch mode for tests
npm run test:coverage # Generate coverage report
```

### Linting

```bash
npm run lint         # Run ESLint
```

## Phase 1: Strict TypeScript

Phase 1 enforces "The Good Parts" - a subset of TypeScript that eliminates error-prone features:

| Error Code | Restriction | Rationale |
|------------|-------------|-----------|
| GS101 | No `with` statement | Unpredictable scope, deprecated |
| GS102 | No `eval` or `Function` constructor | Security risk, prevents optimization |
| GS103 | No `arguments` object | Use rest parameters instead |
| GS104 | No `for-in` loops | Use `for-of` or explicit iteration |
| GS105 | No `var` keyword | Use `let` or `const` for block scope |
| GS106 | No `==` operator | Use `===` for strict equality |
| GS107 | No `!=` operator | Use `!==` for strict inequality |
| GS108 | No function declarations/expressions | Use arrow functions for lexical `this` |
| GS109 | No `any` type | All types must be explicit and known |
| GS110 | No truthy/falsy coercion | Explicit boolean conditions only |
| GS111 | No `delete` operator | Use optional properties or immutable patterns |
| GS112 | No comma operator | Use separate statements for clarity |
| GS115 | No `void` operator | Use `undefined` explicitly if needed |
| GS201 | No implicit type coercion | Explicit string/number conversion |

See [../docs/GOOD-PARTS.md](../docs/GOOD-PARTS.md) for detailed rationale and examples.

## Phase 2: Ownership System

Phase 2 introduces a three-tier ownership system:

- **`Unique<T>`** - Exclusive ownership (Box)
- **`Shared<T>`** - Shared ownership with reference counting (Rc)
- **`Weak<T>`** - Non-owning references (Weak, implicitly nullable)

The compiler enforces that `Shared<T>` references form a **Directed Acyclic Graph (DAG)**, preventing memory leaks at compile time.

**Null semantics:** `null` and `undefined` are synonyms in GoodScript. All `Weak<T>` types are implicitly `T | null | undefined`.

See [../docs/LANGUAGE.md](../docs/LANGUAGE.md) for the complete ownership specification.

## Phase 3: Rust Code Generation

Phase 3 (planned) will transpile GoodScript to Rust, mapping ownership types to native Rust primitives:

- `Unique<T>` → `Box<T>`
- `Shared<T>` → `Rc<T>`
- `Weak<T>` → `Weak<T>`

The result: Rust-level performance with deterministic memory management and no garbage collection.

## Contributing

Contributions are welcome! Please see the main [repository README](../README.md) for contribution guidelines.

## Testing Infrastructure

The test suite uses:
- **Vitest** for test execution
- **Phase-based organization** matching implementation roadmap
- **Helper utilities** in `test/phase1/test-helpers.ts` for compilation testing

Example test:
```typescript
import { compileSource, hasError } from './test-helpers';

it('should reject var keyword', () => {
  const result = compileSource('var x = 42;');
  expect(hasError(result.diagnostics, 'GS105')).toBe(true);
});
```

## License

MIT - See [LICENSE](LICENSE) file for details.

## Links

- 📖 [Language Documentation](../docs/LANGUAGE.md)
- 📋 [Good Parts Rationale](../docs/GOOD-PARTS.md)
- 🔍 [DAG Detection Algorithm](../docs/DAG-DETECTION.md)
- 🐛 [Issue Tracker](https://github.com/fcapolini/goodscript/issues)
- 💬 [Discussions](https://github.com/fcapolini/goodscript/discussions)
