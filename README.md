# GoodScript v0.12.0

Clean TypeScript, compiled to native code.

## 🚧 Status: Core Compiler Complete (109/109 Tests Passing)

This is a **clean rewrite** of GoodScript with a proper IR-based compiler architecture.

**Phase 1-2 Complete** ✅:
- Language validation (15 "good parts" restrictions)
- SSA-based IR with ownership semantics
- Ownership cycle detection (DAG enforcement)
- Null safety checking (use<T> lifetime analysis)
- Type signatures (structural typing)

**Next**: Optimizer and code generation backends

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

**Phase 1-2: Frontend & Analysis** ✅
- [x] Project structure and IR design
- [x] Frontend: TS parsing and validation
- [x] IR lowering (AST → SSA)
- [x] Ownership analyzer (cycle detection)
- [x] Null checker (use<T> lifetime safety)
- [x] Type signatures (structural typing)

**Phase 3-4: Optimization**
- [ ] SSA transformations
- [ ] Constant folding and propagation
- [ ] Dead code elimination
- [ ] Ownership simplification

**Phase 5: Code Generation**
- [ ] C++ backend (ownership mode)
- [ ] C++ backend (GC mode)
- [ ] TypeScript backend
- [ ] Source maps

**Runtime & Stdlib**
- [ ] Port runtime library
- [ ] Port standard library
- [ ] Module system integration

## License

MIT
