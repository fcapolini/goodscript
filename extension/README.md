# GoodScript VS Code Extension

Language support for GoodScript - TypeScript with ownership semantics.

## Features

- **Full TypeScript Integration**: `.gs.ts` files work as TypeScript files with all IDE features
- **Zero Configuration**: Automatic setup - just open a `.gs.ts` file and start coding
- **Real-time Validation**: Instant feedback on ownership cycles, missing null checks, and forbidden syntax
- **Error Squiggles**: All GoodScript diagnostics shown as VS Code problems
- **Auto-Generated Types**: Extension automatically creates type definitions for `owns<T>`

## Requirements

**Install the GoodScript compiler:**

```bash
npm install -g goodscript
```

This installs both `gsc` (compiler) and `gs` (modern CLI tool).

Alternatively, configure a custom compiler path in VS Code settings.

## Quick Start

1. Install the extension
2. Create a file with `.gs.ts` extension
3. Start coding - the extension will:
   - Auto-generate `tsconfig.json` if needed
   - Auto-generate `.goodscript/goodscript.d.ts` with type definitions
   - Provide full TypeScript IntelliSense
   - Show GoodScript-specific errors

## File Extension

**Use `.gs.ts` for all GoodScript files.**

This provides:
- ✅ Full TypeScript language server support
- ✅ Go to definition, rename, refactoring
- ✅ Import/export works seamlessly
- ✅ All IDE features work out of the box

## Automatic Configuration

When you open a folder with `.gs.ts` files, the extension automatically creates:

**`.goodscript/goodscript.d.ts`** - Type definitions:
```typescript
declare type owns<T> = T;
declare const console: { ... };
```

**`tsconfig.json`** - TypeScript configuration:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"]
  },
  "include": ["**/*.gs.ts", ".goodscript/goodscript.d.ts"]
}
```

These files are generated once and can be added to `.gitignore` if desired.

## Extension Settings

This extension contributes the following settings:

- `goodscript.compilerPath`: Path to the GoodScript compiler (default: `gsc`)
- `goodscript.enableValidation`: Enable/disable real-time validation (default: `true`)
- `goodscript.validateOnSave`: Validate files on save (default: `true`)
- `goodscript.validateOnType`: Validate as you type (default: `false`, may impact performance)

## Installation

### 1. Install the Extension

Search for "GoodScript" in VS Code Extensions marketplace, or:

```bash
code --install-extension goodscript.goodscript
```

### 2. Install the Compiler

```bash
npm install -g goodscript
```

This provides the `gsc` compiler and `gs` CLI tool needed for validation.

## Usage

1. Open or create a `.gs.ts` file
2. Extension automatically activates and configures your workspace
3. Write GoodScript code with full TypeScript IntelliSense
4. Errors and warnings appear as squiggles
5. View all diagnostics in Problems panel (Cmd/Ctrl+Shift+M)

## Supported Diagnostics

The extension shows all GoodScript compiler diagnostics:

- **GS001**: Ownership cycle detected
- **GS101-GS107**: Language restrictions (var, eval, ==, !=, etc.)
- **GS201**: Type coercion not allowed
- **GS301**: Missing null check on usage reference

And more!

## Commands

- `GoodScript: Validate Current File` - Manually trigger validation

## Known Issues

- Validation on type may impact performance on large files (disabled by default)
- Requires GoodScript compiler to be installed separately

## Release Notes

### 0.4.1

Documentation update:
- Added npm installation instructions
- Updated release notes

### 0.4.0

Updated to match GoodScript 0.4.0 release:
- Support for no-args compilation with tsconfig.json
- Directory structure preservation in output
- Enhanced tsc compatibility

### 0.1.0

Initial release:
- Zero-configuration setup for `.gs.ts` files
- Automatic type definition generation
- Full TypeScript language feature integration
- Real-time GoodScript validation
- Support for ownership analysis, null-check enforcement, and language restrictions

## Contributing

See the [GoodScript repository](https://github.com/fcapolini/goodscript) for contribution guidelines.

## License

MIT
