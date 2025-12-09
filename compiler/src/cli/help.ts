/**
 * CLI Help Text
 */

export const HELP_TEXT = `
GoodScript Compiler v0.12.4

USAGE:
  gsc [options] [files...]

DESCRIPTION:
  Compiles GoodScript/TypeScript files to native binaries or JavaScript.
  Compatible with tsc options, plus GoodScript-specific --gs* flags.

COMMON EXAMPLES:

  gsc src/main-gs.ts
    Transpile to JavaScript (default)

  gsc --gsTarget cpp src/main-gs.ts
    Compile to native binary (default for C++ target)

  gsc --gsTarget cpp -o myapp src/main-gs.ts
    Compile to named binary

  gsc --gsTarget cpp --gsCodegen src/main-gs.ts
    Generate C++ code only (no compilation)

  gsc --project tsconfig.json
    Use tsconfig.json configuration

  gsc --watch src/**/*-gs.ts
    Watch mode (auto-recompile on changes)

TSC-COMPATIBLE OPTIONS:

  -h, --help              Show this help message
  -v, --version           Show compiler version
  -p, --project FILE      Use tsconfig.json at specified path
  -w, --watch             Watch mode (recompile on file changes)
  --outDir DIR            Output directory for generated files
  --outFile FILE          Concatenate output to single file
  --noEmit                Type-check only, don't emit files
  --sourceMap             Generate source maps for debugging

GOODSCRIPT OPTIONS:

  --gsTarget TARGET       Compilation target (default: js)
                          Values: cpp, js, ts, haxe
                          Note: cpp target compiles to binary by default

  --gsMemory MODE         Memory management mode (C++ only)
                          Values: gc (default), ownership

  --gsCodegen             Generate C++ code only, don't compile to binary
  -o FILE                 Output binary path (C++ target only)

  --gsOptimize LEVEL      Optimization level (default: 3 for production, 0 for debug)
                          Values: 0 (none), 1, 2, 3 (max), s (size), z (size aggressive)

  --gsTriple TRIPLE       Target triple for cross-compilation
                          Examples: x86_64-linux-gnu, aarch64-apple-darwin, wasm32-wasi

  --gsDebug               Enable debug symbols and source maps
  --gsShowIR              Print intermediate representation (for debugging)
  --gsValidateOnly        Only validate GoodScript restrictions, don't compile
  --gsSkipValidation      Skip GoodScript restriction checks (dangerous!)

EXAMPLES:

  Development (fast iteration):
    gsc --sourceMap --gsTarget cpp --gsDebug src/

  Production (optimized binary):
    gsc --gsTarget cpp --gsMemory ownership --gsOptimize 3 -o myapp src/main-gs.ts

  Generate C++ code only:
    gsc --gsTarget cpp --gsCodegen src/main-gs.ts

  Cross-compilation:
    gsc --gsTarget cpp --gsTriple wasm32-wasi -o app.wasm src/main-gs.ts

  Type-check only:
    gsc --noEmit src/**/*-gs.ts

CONFIGURATION:

  GoodScript reads tsconfig.json with a "goodscript" section:

  {
    "compilerOptions": {
      "outDir": "./dist",
      "sourceMap": true
    },
    "goodscript": {
      "target": "cpp",
      "memory": "gc",
      "compile": true,
      "optimize": 3,
      "outFile": "./bin/myapp"
    }
  }

  CLI flags override tsconfig.json settings.

MORE INFO:

  Documentation: https://github.com/goodscript/goodscript
  Report issues: https://github.com/goodscript/goodscript/issues
`;

export const VERSION_TEXT = `GoodScript Compiler v0.12.4`;
