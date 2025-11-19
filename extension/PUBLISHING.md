# Publishing the GoodScript VS Code Extension

## Prerequisites

Before you can publish to the VS Code Marketplace, you need:

1. **A Microsoft/Azure account**
2. **A Visual Studio Marketplace publisher account**
3. **A Personal Access Token (PAT)** from Azure DevOps

## Step-by-Step Publishing Guide

### 1. Create a Publisher Account

1. Go to https://marketplace.visualstudio.com/manage
2. Sign in with your Microsoft account
3. Click "Create publisher"
4. Choose a publisher ID (e.g., "goodscript" or "fcapolini")
5. Fill in the display name and other details

### 2. Generate a Personal Access Token (PAT)

1. Go to https://dev.azure.com/
2. Click on your profile icon → Security → Personal access tokens
3. Click "New Token"
4. Configure:
   - **Name**: "VS Code Extension Publishing"
   - **Organization**: All accessible organizations
   - **Expiration**: Set as needed (recommend 90 days or custom)
   - **Scopes**: Select "Marketplace" → Check "Manage"
5. Copy the token (you won't see it again!)

### 3. Login to vsce

```bash
cd extension
npx @vscode/vsce login <publisher-id>
# Paste your PAT when prompted
```

### 4. Update package.json Publisher

If you created a publisher with a different name than "goodscript", update `package.json`:

```json
{
  "publisher": "your-actual-publisher-id"
}
```

### 5. Publish the Extension

```bash
# Option 1: Publish directly
npx @vscode/vsce publish

# Option 2: Package and upload manually
npx @vscode/vsce package
# Then upload goodscript-0.5.0.vsix at https://marketplace.visualstudio.com/manage
```

## Already Packaged!

The extension is already packaged as `goodscript-0.5.0.vsix` and ready to publish.

Contents:
- Extension size: 10.8 KB
- Files: 9 files total
- Includes: Extension code, syntax highlighting, language configuration

## Testing Before Publishing

You can test the extension locally:

1. Open VS Code
2. Go to Extensions view (Cmd+Shift+X)
3. Click "..." menu → "Install from VSIX..."
4. Select `goodscript-0.5.0.vsix`

## Current Status

✅ Extension compiled successfully
✅ Package created: `goodscript-0.5.0.vsix`
⏳ Publisher account needed
⏳ Personal Access Token needed
⏳ Ready to publish once authenticated

## Useful Commands

```bash
# Login (requires PAT)
npx @vscode/vsce login <publisher-id>

# Publish new version
npx @vscode/vsce publish

# Publish specific version
npx @vscode/vsce publish patch
npx @vscode/vsce publish minor
npx @vscode/vsce publish major

# Show extension info
npx @vscode/vsce show goodscript

# List your publishers
npx @vscode/vsce ls-publishers
```

## Alternative: Manual Upload

If you prefer not to use the CLI:

1. Go to https://marketplace.visualstudio.com/manage
2. Click your publisher
3. Click "New extension" → "Visual Studio Code"
4. Upload `goodscript-0.5.0.vsix`
5. Fill in any required metadata

## Documentation Links

- [VS Code Publishing Guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [vsce CLI Reference](https://github.com/microsoft/vscode-vsce)
- [Marketplace Management Portal](https://marketplace.visualstudio.com/manage)
