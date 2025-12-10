# GoodScript v0.13.0

Clean TypeScript, compiled to native code.

## 🎉 Status: Core Pipeline Complete (594/594 Tests Passing)

This is a **clean rewrite** of GoodScript with a proper IR-based compiler architecture.

**Phases 1-5 Complete** ✅:
- ✅ Language validation (15 "good parts" restrictions)  
- ✅ SSA-based IR with ownership semantics
- ✅ Ownership cycle detection (DAG enforcement)
- ✅ Null safety checking (use<T> lifetime analysis)
- ✅ Type signatures (structural typing)
- ✅ IR optimizer (constant folding, DCE, multi-pass)
- ✅ C++ code generator (GC and ownership modes)
- ✅ Zig compiler integration (native binaries)
- ✅ Source maps (#line directives for debugging)

**Test Suite:**
- 410 compiler tests (validator, lowering, ownership, null checker, optimizer, codegen, async, etc.)
- 184 standard library tests (@goodscript/core, @goodscript/json, @goodscript/io, @goodscript/http)

**Available on npm:**
```bash
npm install goodscript              # Main compiler with TypeScript type definitions
npm install @goodscript/core        # Core utilities (Array, String, Map methods)
npm install @goodscript/json        # JSON parsing and serialization
npm install @goodscript/io          # File system I/O (sync and async)
npm install @goodscript/http        # HTTP/HTTPS client with TLS support
```

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
├── compiler/     # Main compiler (TS → IR → C++/TS) + TypeScript type definitions
├── runtime/      # C++ runtime library (GC and ownership modes)
├── stdlib/       # Standard library packages (published to npm as @goodscript/*)
│   ├── core/     # Core utilities (89 tests) - @goodscript/core
│   ├── json/     # JSON support (30 tests) - @goodscript/json
│   ├── io/       # File I/O (48 tests) - @goodscript/io
│   └── http/     # HTTP client (17 tests) - @goodscript/http
└── examples/     # Example programs demonstrating GoodScript features
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

**Phase 5: Code Generation** ✅ (17 tests)
- [x] C++ backend - GC mode (header + source files)
- [x] C++ backend - Ownership mode (smart pointers)
- [x] Module namespaces and imports
- [x] Source maps (#line directives)

**Phase 6: Binary Compilation** ✅ (15 tests)
- [x] Zig compiler integration
- [x] Native binary generation
- [x] Cross-compilation support
- [x] Vendored dependencies (MPS GC, PCRE2)
- [x] Build caching
- [x] tsconfig.json integration

**Phase 7: Runtime & Tooling** 🚧
- [ ] CLI tool (compile, build, run)
- [ ] Runtime library (GC integration, builtins)
- [ ] Standard library (collections, I/O, etc.)
- [ ] Module system integration
- [ ] VS Code extension

## License

Licensed under either of:

- Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT License ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)

at your option.
