# GoodScript v0.12.0

Clean TypeScript, compiled to native code.

## 🎉 Status: Core Pipeline Complete (153/153 Tests Passing)

This is a **clean rewrite** of GoodScript with a proper IR-based compiler architecture.

**Phases 1-5 Complete** ✅:
- ✅ Language validation (15 "good parts" restrictions)  
- ✅ SSA-based IR with ownership semantics
- ✅ Ownership cycle detection (DAG enforcement)
- ✅ Null safety checking (use<T> lifetime analysis)
- ✅ Type signatures (structural typing)
- ✅ IR optimizer (constant folding, DCE, multi-pass)
- ✅ TypeScript code generator (clean transpilation)
- ✅ C++ code generator (GC and ownership modes)

**Test Suite:**
- 45 validator tests
- 13 lowering tests
- 16 ownership analysis tests
- 13 null checker tests
- 11 type signature tests
- 11 IR infrastructure tests
- 15 optimizer tests
- 14 TypeScript codegen tests
- 15 C++ codegen tests

**Next**: Runtime library, standard library, and CLI tooling

See the original [GoodScript repository](https://github.com/fcapolini/goodscript0) for the v0.11 implementation.

## Why the Rewrite?

The v0.11 compiler (built in 3 weeks!) proved the concept but had architectural limitations:

1. **No IR layer** - Direct TS AST → C++ AST made optimizations difficult
2. **Type tracking scattered** - Multiple systems tracking the same information
3. **GC mode was a hack** - String replacements on generated C++ code
4. **Hard to extend** - Adding features required touching many files

## v0.12 Architecture

```
TypeScript → [Frontend] → IR → [Optimizer] → [Backend] → Native/JS
```

**Key improvements:**

- ✅ Proper SSA-based IR with explicit types and ownership
- ✅ Single source of truth for type information
- ✅ Clean separation: frontend, IR, optimizer, backend
- ✅ Multiple backends (C++, TypeScript, future: WASM, LLVM)
- ✅ IR-level optimizations (constant folding, DCE, etc.)

## Project Structure

```
goodscript/
├── compiler/     # Main compiler (TS → IR → C++/TS)
├── runtime/      # C++ runtime library
├── stdlib/       # Standard library packages
└── tools/        # CLI tools and editor support
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Watch mode
pnpm dev
```

## Roadmap

**Phase 1-2: Frontend & Analysis** ✅ (109 tests)
- [x] Project structure and IR design
- [x] Frontend: TS parsing and validation (45 tests)
- [x] IR lowering (AST → SSA) (13 tests)
- [x] Ownership analyzer (cycle detection) (16 tests)
- [x] Null checker (use<T> lifetime safety) (13 tests)
- [x] Type signatures (structural typing) (11 tests)

**Phase 3-4: Optimization** ✅ (15 tests)
- [x] Constant folding and propagation
- [x] Dead code elimination
- [x] Multi-pass optimization
- [x] SSA transformations

**Phase 5: Code Generation** ✅ (29 tests)
- [x] C++ backend - GC mode (header + source files)
- [x] C++ backend - Ownership mode (smart pointers)
- [x] TypeScript backend (clean transpilation)
- [x] Module namespaces and imports
- [ ] Source maps

**Phase 6: Runtime & Tooling** 🚧
- [ ] CLI tool (compile, build, run)
- [ ] Runtime library (GC integration, builtins)
- [ ] Standard library (collections, I/O, etc.)
- [ ] Module system integration
- [ ] Build system (Zig integration)
- [ ] VS Code extension

## License

MIT
