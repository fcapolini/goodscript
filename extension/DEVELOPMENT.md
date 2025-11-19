# VS Code Extension Development

## Setup

```bash
cd vscode-extension
npm install
npm run compile
```

## Testing

1. Open the `vscode-extension` folder in VS Code
2. Press `Fn+F5` (or `Cmd+Shift+D` then click play) to launch Extension Development Host
3. In the new window, open a folder with `.gs.ts` files to test

## Building

```bash
npm run package
```

This creates a `.vsix` file that can be installed in VS Code.

## Publishing

1. Get a Personal Access Token from Azure DevOps
2. Create a publisher account
3. Run: `vsce publish`

See: https://code.visualstudio.com/api/working-with-extensions/publishing-extension

## How It Works

The extension automatically:
1. Activates when any TypeScript file is opened
2. Detects `.gs.ts` files in the workspace
3. Auto-generates `tsconfig.json` and `.goodscript/goodscript.d.ts` if needed
4. Runs `gsc --json-output` for validation
5. Shows GoodScript diagnostics as error squiggles
6. Provides full TypeScript language features (go to definition, etc.)

## Requirements

- GoodScript compiler (`gsc`) must be in PATH
- Or configure custom path in settings

## Settings

- `goodscript.compilerPath`: Path to gsc
- `goodscript.enableValidation`: Enable/disable validation
- `goodscript.validateOnSave`: Validate on save (default: true)
- `goodscript.validateOnType`: Validate as you type (default: false)

## Architecture

- `.gs.ts` files are treated as TypeScript files by VS Code
- Extension adds GoodScript-specific validation on top
- No separate language registration needed
- Full TypeScript language server integration
