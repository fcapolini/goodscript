# Session 17: Module Import/Export Implementation

**Date:** 2025-01-XX
**Status:** ✅ Complete
**Tests:** 869 passing (up from 865), 6 skipped (down from 10)

## Overview

Implemented module import and export-from statements in the Rust code generator, enabling single-file Rust code generation with proper `use` declarations.

## Implementation

### Import Declarations

Added support for all import statement types:

1. **Named imports**
   ```typescript
   import { add, subtract } from './math';
   ```
   Generates:
   ```rust
   use crate::math::{add, subtract};
   ```

2. **Default imports**
   ```typescript
   import Calculator from './calculator';
   ```
   Generates:
   ```rust
   use crate::calculator::Calculator;
   ```

3. **Namespace imports**
   ```typescript
   import * as Math from './math';
   ```
   Generates:
   ```rust
   use crate::math as Math;
   ```

4. **Import aliasing**
   ```typescript
   import { foo as bar } from './module';
   ```
   Generates:
   ```rust
   use crate::module::foo as bar;
   ```

### Export-From Statements

Added support for re-export declarations:

```typescript
export { add, subtract } from './math';
```
Generates:
```rust
pub use crate::math::{add, subtract};
```

Also handles:
- `export * from './module'` → `pub use module::*;`
- `export * as Name from './module'` → `pub use module as Name;`
- `export { foo as bar } from './module'` → `pub use module::foo as bar;`

### Module Path Conversion

Implemented `convertModulePath()` helper to translate TypeScript module paths to Rust:

- `./math` → `crate::math`
- `../utils` → `super::utils`
- `../../lib` → `super::super::lib`
- Removes file extensions (`.ts`, `.js`, `.gs`)
- Handles external packages (e.g., `@/lib` → `lib`)

### Compiler Changes

Modified `compiler.ts` to emit Rust code even when TypeScript has module resolution errors:

```typescript
// For Rust target, emit code even if there are TypeScript module resolution errors
// (we're not actually running the code, just generating it)
const shouldEmit = options.outDir && (
  !hasErrors || 
  (target === 'rust' && allDiagnostics.every(d => 
    d.severity !== 'error' || 
    d.code === 'TS2307' ||  // Module not found
    d.code === 'TS2792' ||  // Cannot find module (ESM)
    d.code === 'TS2305'     // Module has no exported member
  ))
);
```

This allows single-file Rust code generation without requiring the imported modules to exist.

## Code Structure

### New Methods in `RustCodegen`

1. **`convertModulePath(modulePath: string): string`** (lines ~478-514)
   - Converts TypeScript module paths to Rust module paths
   - Handles relative paths (`./`, `../`), external packages, file extensions
   - Shared by both import and export-from handling

2. **`generateImportDeclaration(statement: ts.ImportDeclaration)`** (lines ~516-595)
   - Handles named, default, namespace imports
   - Generates appropriate `use` statements
   - Updated to use `convertModulePath()` helper

3. **`generateExportDeclaration(statement: ts.ExportDeclaration)`** (lines ~597-632)
   - Handles export-from statements
   - Generates `pub use` statements
   - Supports named exports, namespace exports, wildcard exports

### Integration Points

- **`generateStatement()`** - Added handling for `ts.isExportDeclaration()`
- **`generateSourceFile()`** - Collect export-from declarations along with imports, emit them at the top

## Test Results

### Before
- 865 passing tests
- 10 skipped tests

### After
- 869 passing tests (+4)
- 6 skipped tests (-4)

### New Passing Tests

All tests in `test/phase3/modules.test.ts` → Import Statements:
1. ✅ "should handle named imports"
2. ✅ "should handle default imports"
3. ✅ "should handle namespace imports"

All tests in `test/phase3/modules.test.ts` → Re-exports:
4. ✅ "should handle export from statements"

## Examples

### Named Imports
**Input:**
```typescript
import { add, subtract } from './math';

const result = add(5, 3);
console.log(result);
```

**Generated Rust:**
```rust
use crate::math::{add, subtract};

pub fn main() {
    let result = (|| -> Result<(), String> {
        let result = add(5.0, 3.0)?;
        println!("{}", result);
        Ok(())
    })();

    match result {
        Ok(_) => {},
        Err(e) => {
            eprintln!("Uncaught exception: {}", e);
            std::process::exit(1);
        }
    }
}
```

### Export-From
**Input:**
```typescript
export { add, subtract } from './math';
```

**Generated Rust:**
```rust
pub use crate::math::{add, subtract};
```

## Technical Details

### Path Conversion Logic

The `convertModulePath()` method handles several cases:

1. **Same directory** (`./math`)
   - Remove `./` prefix
   - Convert `/` to `::`
   - Prepend `crate::`
   - Result: `crate::math`

2. **Parent directory** (`../utils`)
   - Count `..` segments → `super::` prefix
   - Join remaining path parts with `::`
   - Result: `super::utils`

3. **Multiple levels up** (`../../lib/util`)
   - Multiple `super::` prefixes
   - Result: `super::super::lib::util`

4. **External packages** (anything without `./` or `../`)
   - Replace `/` with `::`
   - Remove `@` prefix if present
   - Result: package name as Rust path

5. **File extensions**
   - Remove `.ts`, `.js`, `.gs` extensions
   - Rust modules don't use file extensions in `use` statements

### TypeScript Compilation Errors

When generating Rust code from TypeScript with import statements, TypeScript will produce TS2307 errors if the imported modules don't exist. We handle this by:

1. Allowing Rust code emission even with these specific errors
2. Only blocking emission for actual GoodScript validation errors
3. This enables single-file Rust generation for testing

### Import Ordering

Imports and export-from declarations are:
1. Collected in first pass through statements
2. Emitted at the top of the generated Rust file
3. Followed by exported declarations, then main function

This matches Rust convention where `use` statements appear at the top.

## Remaining Work

The 6 remaining skipped tests are in:
- `test/phase3/classes.test.ts` (1 skipped) - likely async-related
- `test/phase3/advanced-features.test.ts` (2 skipped) - advanced generics/async
- `test/phase3/extended-features.test.ts` (1 skipped) - complex features
- `test/phase3/control-flow.test.ts` (2 skipped) - advanced control flow

These are expected and represent features not yet implemented (async/await edge cases, trait bounds, etc.).

## Files Modified

1. **compiler/src/compiler.ts**
   - Modified emit logic to allow Rust generation with TypeScript module resolution errors
   - Added TS2307, TS2792, TS2305 to allowed errors for Rust target

2. **compiler/src/rust-codegen.ts**
   - Added `convertModulePath()` helper method
   - Refactored `generateImportDeclaration()` to use helper
   - Added `generateExportDeclaration()` method
   - Updated `generateStatement()` to handle export declarations
   - Updated `generateSourceFile()` to collect and emit export-from statements

3. **compiler/test/phase3/modules.test.ts**
   - Un-skipped and updated 4 import/export tests
   - Added specific expectations for generated `use` statements

4. **compiler/README.md**
   - Updated test count: 869 passing, 6 skipped

5. **docs/PHASE-3-RUST.md**
   - Updated test count
   - Added module imports to completed features
   - Updated remaining work section

## Conclusion

Module import and export-from support is now complete for single-file Rust code generation. The implementation correctly handles all import styles, path conversions, and export-from statements. This brings us closer to complete Phase 3 implementation, with only a few advanced features remaining.

The compiler now gracefully handles TypeScript module resolution errors when generating Rust code, enabling effective testing without requiring all imported modules to exist.
