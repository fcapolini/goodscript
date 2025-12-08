# GoodScript Compiler v0.12.0

Complete TypeScript-to-C++/TypeScript compiler with binary compilation support.

## Architecture

```
TypeScript Source
      ↓
[Phase 1: Frontend]
  - Parser (TypeScript AST)
  - Validator (Good Parts restrictions)
      ↓
[Phase 2: Analysis]
  - Ownership Analyzer (DAG for share<T>)
  - Null Checker (use<T> lifetime safety)
  - Type Signatures (structural typing)
      ↓
[Phase 3: IR Lowering]
  - TypeScript AST → GoodScript IR
  - SSA-based, typed, ownership-aware
      ↓
[Phase 4: Optimizer]
  - Constant folding
  - Dead code elimination
  - Multi-pass optimization
      ↓
[Phase 5: Code Generation]
  - C++ Codegen (ownership/gc mode)
      ↓
[Phase 6: Binary Compilation]
  - Zig compiler integration
  - Cross-platform native binaries
      ↓
Native Binary / TypeScript
```

## Key Improvements over v0.11

1. **Proper IR**: SSA-based, explicitly typed intermediate representation
2. **Single source of truth**: All type and ownership info in IR
3. **Clean separation**: Frontend, IR, optimizer, backend are independent
4. **Multiple backends**: C++ (ownership/GC modes), TypeScript
5. **Better optimizations**: IR enables dataflow analysis
6. **Binary compilation**: End-to-end native binary generation via Zig

## Directory Structure

```
src/
├── ir/              # IR types, builder, visitor, signatures
├── frontend/        # TS parsing, validation, lowering
├── analysis/        # Ownership & null checking
├── backend/         # Code generation (C++, TS)
│   └── cpp/         # C++ codegen + Zig compiler
├── optimizer/       # IR optimization passes
├── compiler.ts      # Main entry point
└── types.ts         # Shared types
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Test (149 tests)
pnpm test

# Watch mode
pnpm dev
```

## Status

✅ **Phases 1-6 Complete** (149 tests passing)
- ✅ Phase 1: Frontend (validator, parser)
- ✅ Phase 2: Analysis (ownership, null checking, type signatures)
- ✅ Phase 3: IR Lowering (AST → IR)
- ✅ Phase 4: Optimizer (constant folding, DCE)
- ✅ Phase 5: Code Generation (C++)
- ✅ Phase 6: Binary Compilation (Zig integration)

**Next Steps**:
- CLI tool for command-line usage
- Runtime library implementation
- Standard library porting
- Source map generation

**Note**: For TypeScript/JavaScript output, just use `tsc` directly on your `.gs` files.
GoodScript files are valid TypeScript with type aliases for ownership annotations:
```typescript
type own<T> = T;
type share<T> = T;
type use<T> = T;
```
