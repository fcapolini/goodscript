# GoodScript Project - GitHub Copilot Instructions

## Project Overview

**GoodScript** is a TypeScript variant with ownership semantics that compiles to both TypeScript/JavaScript and (eventually) Rust. It eliminates JavaScript's "bad parts" and adds a three-tier ownership system for deterministic memory management.

**Current Status**: Language level "clean" (Phase 1) complete with 244 tests passing. Language level "dag" (Phase 2) in progress.

## Core Concepts

### Language Levels (User-Facing)
- **Level 1 "clean"** - TypeScript "good parts" only (default for TS/JS target)
- **Level 2 "dag"** - Level 1 + ownership/DAG validation
- **Level 3 "rust"** - Full validation for native compilation (default for Rust target)

**Implementation Phases** (internal development milestones):
- **Phase 1** implements level "clean"
- **Phase 2** implements level "dag"
- **Phase 3** implements level "rust"

### Three-Tier Ownership System (Levels 2 & 3)
- **`unique<T>`** - Exclusive ownership (maps to Rust's `Box<T>`)
- **`shared<T>`** - Shared ownership with reference counting (maps to `Rc<T>`)
- **`weak<T>`** - Non-owning references (maps to `Weak<T>`) - implicitly nullable

### Null/Undefined Semantics
- `null` and `undefined` are **synonyms** in GoodScript
- `weak<T>` = `T | null | undefined` (implicitly nullable)
- Checking for either `null` or `undefined` satisfies null-safety requirements

### Level "clean" Restrictions (All Levels)
Enforces compile-time restrictions (error codes GS101-GS108, GS201):

| Code | Restriction | Why |
|------|-------------|-----|
| GS101 | No `with` statement | Unpredictable scope |
| GS102 | No `eval` or `Function` constructor | Security, prevents optimization |
| GS103 | No `arguments` object | Use rest parameters |
| GS104 | No `for-in` loops | Use `for-of` or explicit iteration |
| GS105 | No `var` keyword | Use `let` or `const` |
| GS106 | No `==` operator | Use `===` |
| GS107 | No `!=` operator | Use `!==` |
| GS108 | No function declarations/expressions | Use arrow functions (lexical `this`) |
| GS201 | No implicit type coercion | Explicit string/number conversion |

**Important**: These restrictions apply **only to `.gs.ts` and `.gs.tsx` files**. Regular `.ts` files are compiled like TypeScript (tsc-compatible).

## Project Structure

```
goodscript/
├── compiler/                    # Main compiler package
│   ├── src/
│   │   ├── compiler.ts         # Main compilation orchestrator
│   │   ├── parser.ts           # TypeScript AST parser
│   │   ├── validator.ts        # Phase 1 restrictions enforcer
│   │   ├── ownership-analyzer.ts   # Phase 2 ownership tracking
│   │   ├── null-check-analyzer.ts  # Null safety enforcement
│   │   ├── ts-codegen.ts       # TypeScript code generator
│   │   ├── gsc.ts              # CLI compiler entry point
│   │   └── gs.ts               # CLI runner entry point
│   ├── test/
│   │   ├── phase1/             # Phase 1 tests (142 tests)
│   │   │   ├── fixtures/       # 5 compliant source files
│   │   │   ├── test-helpers.ts # Testing utilities
│   │   │   └── *.test.ts       # Restriction tests
│   │   ├── cli/                # CLI compatibility (20 tests)
│   │   ├── phase2/             # Phase 2 tests (TBD)
│   │   └── phase3/             # Phase 3 tests (TBD)
│   ├── docs/
│   │   ├── LANGUAGE.md         # Complete language spec
│   │   ├── GOOD-PARTS.md       # Phase 1 restrictions & rationale
│   │   └── DAG-DETECTION.md    # Cycle detection algorithm
│   └── lib/
│       └── goodscript.d.ts     # Type definitions for ownership wrappers
├── extension/                   # VS Code extension
└── notes/                       # Development session notes
    └── SESSION-1.md
```

## Key Files & Their Roles

### Compiler Core
- **compiler.ts**: Main entry point, orchestrates compilation pipeline
  - `compile(options: CompileOptions): CompileResult`
  - Handles both `.ts` and `.gs.ts` files
  - Filters TypeScript null/undefined errors (TS18047, 18048, 18049, 2532, 2533, 2322, 2345)

- **validator.ts**: Enforces Phase 1 restrictions on `.gs.ts` files
  - `validate(sourceFile: ts.SourceFile, checker: ts.TypeChecker): ValidationResult`
  - Returns diagnostics with GS error codes

- **ownership-analyzer.ts**: Phase 2 ownership tracking (1012 lines)
  - Tracks `unique<T>`, `shared<T>`, `weak<T>` references
  - DAG cycle detection for `shared<T>` references
  - Currently functional but Phase 2 tests not yet complete

- **null-check-analyzer.ts**: Enforces null checks on weak references (758 lines)
  - Uses `isNullOrUndefined()` helper (accepts both `null` and `undefined`)
  - Verifies weak references are checked before use

- **ts-codegen.ts**: Generates TypeScript by removing ownership annotations
  - `generate(sourceFile: ts.SourceFile): string`
  - Transforms `weak<T>` → `T | null | undefined`
  - Removes `unique<T>` and `shared<T>` wrappers

### CLI
- **gsc.ts**: Command-line compiler (`gsc`)
  - Drop-in replacement for `tsc`
  - Supports `--help`, `--version`, `--out-dir`, `--project`, etc.
  - Auto-discovers `tsconfig.json` like `tsc`

- **gs.ts**: Command-line runner (executes GoodScript files directly)

### Testing
- **test-helpers.ts**: Core utilities
  - `compileSource(source: string)`: Compile source strings via temp files
  - `getErrors(diagnostics, code)`: Filter by error code
  - `hasError(diagnostics, code)`: Check for error existence

- **Fixtures** (test/phase1/fixtures/): Phase 1 compliant examples
  - `basic-functions.gs.ts`: Arrow functions, rest parameters
  - `control-flow.gs.ts`: if/else, for-of, switch
  - `classes.gs.ts`: Class declarations
  - `types.gs.ts`: Interfaces, generics
  - `null-handling.gs.ts`: null/undefined patterns

## Common Development Patterns

### Running Tests
```bash
npm test                    # All tests
npm test -- test/phase1     # Phase 1 only
npm test -- test/cli        # CLI tests only
npm test -- path/to/file.test.ts  # Specific file
npm run test:watch          # Watch mode
```

### Adding New Phase 1 Restrictions
1. Add error code constant to validator.ts
2. Implement check in `Validator.validate()`
3. Add tests in `test/phase1/`
4. Update `GOOD-PARTS.md` with rationale
5. Update error code table in README

### Adding Test Fixtures
1. Create `.gs.ts` file in `test/phase1/fixtures/`
2. Ensure it's Phase 1 compliant (no GS errors)
3. Add to fixture list in `codegen-comparison.test.ts`
4. Tests automatically validate against TypeScript output

### Working with Ownership Types
- Parser creates TypeScript program
- Ownership analyzer walks AST, tracks ownership types
- Null-check analyzer verifies weak references are checked
- Code generator removes ownership annotations for TypeScript output

## Important Implementation Details

### Null/Undefined Handling
- TypeScript's strict null checking produces errors we suppress
- Our null-check analyzer enforces safety instead
- `weak<T>` is the only nullable type (by design)
- Both `=== null` and `=== undefined` checks are valid

### Function Constructor Detection
- Both `new Function()` and `Function()` are caught
- Treated same as `eval` (GS102 error)
- Added in Session 1

### Mixed .ts and .gs.ts Projects
- `.ts` files: Compiled like TypeScript (no Phase 1 restrictions)
- `.gs.ts` files: Full GoodScript validation
- Allows gradual adoption in existing TypeScript projects

### CLI Compatibility with tsc
- Supports same flags: `-p`, `-o`, `--project`, `--out-dir`
- Auto-discovers `tsconfig.json` when no files specified
- CLI flags override `tsconfig.json` settings
- Returns proper exit codes (0 = success, non-zero = errors)

## Testing Philosophy

1. **Comprehensive coverage**: Every restriction has positive and negative tests
2. **Fixture validation**: Real-world compliant code tested end-to-end
3. **Code generation comparison**: Verify GoodScript produces identical output to TypeScript
4. **CLI compatibility**: Ensure drop-in replacement for tsc works correctly

## Development Workflow

1. **Make changes** to source files
2. **Build**: `npm run build`
3. **Test**: `npm test`
4. **Update docs** if adding features/restrictions
5. **Commit** with descriptive message
6. **Update session notes** in `/notes/SESSION-X.md`

## Common Gotchas

- **TypeScript errors in tests**: Make sure temp tsconfig.json has `lib: ['ES2020']`
- **Relative paths in CLI tests**: Need a tsconfig.json in temp directory
- **Fixture tests failing**: Ensure fixtures are truly Phase 1 compliant
- **Null checks**: Remember to use `isNullOrUndefined()` helper for both forms

## Next Steps (Phase 2)

1. Complete Phase 2 test suite
   - Ownership semantics validation
   - DAG cycle detection tests
   - Null-check enforcement tests

2. Improve error messages
   - More specific ownership violation messages
   - Suggest fixes for common mistakes

3. Phase 3 preparation
   - Rust code generation infrastructure
   - Ownership type mapping tests

## Quick Reference

### Error Codes
- **GS1xx**: Language restriction violations
- **GS2xx**: Type system violations
- **Future GS3xx**: Ownership violations
- **Future GS4xx**: Rust codegen issues

### File Extensions
- `.gs.ts`: GoodScript with TypeScript IDE support (recommended)
- `.gs`: Original GoodScript extension (legacy)
- `.ts`: Regular TypeScript (no Phase 1 restrictions)

### Test Framework
- **Vitest** 1.0.4
- Use `describe()` and `it()` for test organization
- `expect()` assertions
- Temp files for CLI testing

## Session Notes
Development session summaries are in `/notes/SESSION-X.md`. Always check the latest session note to understand recent changes and context.
