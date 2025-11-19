# vite-plugin-goodscript

Vite plugin for compiling [GoodScript](https://github.com/fcapolini/goodscript) files on-the-fly with full Hot Module Replacement (HMR) support.

## Installation

```bash
npm install --save-dev vite-plugin-goodscript goodscript
```

## Usage

### Basic Setup (Any Framework)

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import goodscript from 'vite-plugin-goodscript';

export default defineConfig({
  plugins: [
    goodscript({
      level: 'clean',  // Enforce GoodScript "clean" level (TypeScript good parts)
      include: ['**/*.gs.ts']
    })
  ]
});
```

### With React

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import goodscript from 'vite-plugin-goodscript';

export default defineConfig({
  plugins: [
    goodscript({
      level: 'clean',
      include: ['**/*.gs.ts', '**/*.gs.tsx']
    }),
    react()
  ]
});
```

### With Vue

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import goodscript from 'vite-plugin-goodscript';

export default defineConfig({
  plugins: [
    goodscript({
      level: 'clean',
      include: ['**/*.gs.ts']
    }),
    vue()
  ]
});
```

## Options

### `level`
- **Type**: `'clean' | 'dag' | 'rust'`
- **Default**: `'clean'`

Language level to enforce:
- `'clean'`: TypeScript good parts only (Phase 1 restrictions)
- `'dag'`: Level 1 + ownership/DAG validation (Phase 2)
- `'rust'`: Full validation for native compilation (Phase 3)

### `include`
- **Type**: `string[]`
- **Default**: `['**/*.gs.ts', '**/*.gs.tsx']`

Glob patterns for files to process. Only files matching these patterns will be compiled by GoodScript.

### `exclude`
- **Type**: `string[]`
- **Default**: `['node_modules/**']`

Glob patterns for files to exclude from processing.

### `skipOwnershipChecks`
- **Type**: `boolean`
- **Default**: `false` for level `'clean'`, `true` for `'dag'`/`'rust'`

Skip ownership analysis (Phase 2 checks). Automatically set based on `level` if not specified.

## How It Works

1. **Vite intercepts** `.gs.ts` and `.gs.tsx` files during module resolution
2. **GoodScript compiler** validates and transforms them on-the-fly
3. **Generated TypeScript** flows into subsequent plugins (React, Vue, etc.)
4. **Full HMR support** - changes trigger recompilation and hot reload

## Features

✅ **Real-time compilation** during development  
✅ **Full HMR support** with file caching  
✅ **Framework-agnostic** - works with React, Vue, Svelte, vanilla TS, etc.  
✅ **Proper error reporting** in Vite's error overlay  
✅ **Zero config** for common cases  
⚠️ **Source maps** (coming soon)  

## Example Project Structure

```
my-app/
├── src/
│   ├── main.gs.ts          # GoodScript entry point
│   ├── components/
│   │   ├── Button.gs.tsx   # React component in GoodScript
│   │   └── utils.gs.ts     # Utility functions
│   └── legacy/
│       └── old-code.ts     # Regular TypeScript (not processed)
├── vite.config.ts
└── package.json
```

## Migration from CLI Workflow

If you're currently using `gsc` to pre-compile GoodScript files:

**Before** (CLI workflow):
```json
{
  "scripts": {
    "build": "gsc && vite build",
    "dev": "concurrently \"gsc --watch\" \"vite dev\""
  }
}
```

**After** (Vite plugin):
```json
{
  "scripts": {
    "build": "vite build",
    "dev": "vite dev"
  }
}
```

The plugin handles compilation automatically - no more generated `.ts` files cluttering your source tree!

## Troubleshooting

### TypeScript errors in `.gs.ts` files

Make sure your `tsconfig.json` includes the GoodScript type definitions:

```json
{
  "compilerOptions": {
    "types": ["goodscript"]
  }
}
```

### Plugin not processing files

Check that your file patterns match. The default is `**/*.gs.ts` and `**/*.gs.tsx`. If you're using different extensions, update the `include` option.

### Performance issues with large projects

The plugin caches compiled results based on file modification time. If you experience slowness:

1. Make sure you're not processing `node_modules` (excluded by default)
2. Use more specific `include` patterns to limit processed files
3. Consider using the CLI workflow for production builds

## License

MIT

## Links

- [GoodScript Documentation](https://github.com/fcapolini/goodscript)
- [Language Specification](https://github.com/fcapolini/goodscript/blob/main/docs/LANGUAGE.md)
- [React Integration Guide](https://github.com/fcapolini/goodscript/blob/main/docs/REACT.md)
- [Issue Tracker](https://github.com/fcapolini/goodscript/issues)
