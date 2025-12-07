# GoodScript Compiler v0.12.0

Clean rewrite with proper IR-based architecture.

## Architecture

```
TypeScript Source
      ↓
[Frontend]
  - Parser (TypeScript AST)
  - Validator (Phase 1: Good Parts)
  - Ownership Analyzer (Phase 2: DAG)
  - IR Lowering
      ↓
GoodScript IR (SSA, typed, ownership-aware)
      ↓
[Optimizer]
  - Constant folding
  - Dead code elimination
  - Ownership simplification
      ↓
[Backend]
  - C++ Codegen (ownership/gc mode)
  - TypeScript Codegen
  - (Future: WASM, LLVM)
      ↓
Native Binary / JavaScript
```

## Key Improvements over v0.11

1. **Proper IR**: SSA-based, explicitly typed intermediate representation
2. **Single source of truth**: All type and ownership info in IR
3. **Clean separation**: Frontend, IR, optimizer, backend are independent
4. **Multiple backends**: Easy to add new targets
5. **Better optimizations**: IR enables dataflow analysis

## Directory Structure

```
src/
├── ir/           # IR types, builder, visitor
├── frontend/     # TS parsing, validation, lowering
├── backend/      # Code generation (C++, TS)
├── optimizer/    # IR optimization passes
├── compiler.ts   # Main entry point
└── types.ts      # Shared types
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Test
pnpm test

# Watch mode
pnpm dev
```

## Status

🚧 **Under active development** - This is a clean rewrite. See the original compiler in the `goodscript` repository for the v0.11 implementation.
