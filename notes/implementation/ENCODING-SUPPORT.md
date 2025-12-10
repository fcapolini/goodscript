# Text Encoding Support - Implementation Summary

**Date**: December 10, 2025  
**Status**: ✅ Complete  
**Tests**: 401 passing (7 new encoding tests)

## Overview

Added comprehensive text encoding support to GoodScript's FileSystem API. Users can now read and write files in multiple encodings beyond UTF-8.

## Supported Encodings

| Encoding | Aliases | Description |
|----------|---------|-------------|
| `utf-8` | `utf8` | UTF-8 (default) - Universal Unicode encoding |
| `ascii` | - | 7-bit ASCII (validates range 0-127) |
| `latin1` | `iso-8859-1` | 8-bit Latin-1 (Western European) |
| `utf-16le` | `utf16le` | UTF-16 Little Endian (Windows) |
| `utf-16be` | `utf16be` | UTF-16 Big Endian |

## API Changes

### Before (UTF-8 only)
```typescript
FileSystem.readText(path: string): string
FileSystem.writeText(path: string, content: string): void
FileSystem.appendText(path: string, content: string): void
```

### After (Multi-encoding)
```typescript
FileSystem.readText(path: string, encoding?: string): string
FileSystem.writeText(path: string, content: string, encoding?: string): void
FileSystem.appendText(path: string, content: string, encoding?: string): void
```

**Backward Compatible**: Default is `'utf-8'`, so existing code works unchanged.

## Implementation Details

### C++ Runtime (Both GC and Ownership Modes)

**Files Modified**:
- `compiler/runtime/cpp/gc/filesystem.hpp`
- `compiler/runtime/cpp/ownership/gs_filesystem.hpp`

**Key Features**:
1. **Encoding conversion helpers** (`detail::decodeBytes`, `detail::encodeString`)
2. **UTF-8 ↔ ASCII**: Validates 7-bit range
3. **UTF-8 ↔ Latin-1**: 2-byte UTF-8 to single-byte Latin-1 conversion
4. **UTF-8 ↔ UTF-16LE/BE**: Uses `<codecvt>` for Unicode conversion
5. **Error handling**: Throws descriptive errors for invalid conversions

**Example**:
```cpp
// Read Latin-1 file, convert to UTF-8 internally
auto content = FileSystem::readText("legacy.txt", "latin1");

// Write UTF-8 string to ASCII file (validates range)
FileSystem::writeText("ascii.txt", "Hello", "ascii");
```

### TypeScript/Node.js Stdlib

**File Modified**:
- `stdlib/io/src/file-gs.ts`

**Changes**:
- Added optional `encoding` parameter to all text methods
- Uses Node.js `BufferEncoding` type for type safety
- Maps encoding names to Node.js conventions

**Example**:
```typescript
// Read with encoding
const latin1 = await File.readText('legacy.txt', 'latin1');

// Write with encoding
await File.writeText('output.txt', content, 'utf-16le');
```

### Documentation

**File Modified**:
- `compiler/FILESYSTEM-API-GUIDE.md`

**New Sections**:
1. **Text Encoding Support** - Overview and encoding table
2. **Reading with Encoding** - Examples and patterns
3. **Writing with Encoding** - Conversion examples
4. **Best Practices** - 5 guidelines for encoding usage
5. **Common Encoding Issues** - Troubleshooting guide

**Total Addition**: ~200 lines of comprehensive documentation

## Testing

**New Test File**: `compiler/test/encoding-support.test.ts`

**Test Coverage** (7 tests):
1. ✅ UTF-8 encoding (default)
2. ✅ ASCII encoding with validation
3. ✅ Latin-1 encoding
4. ✅ UTF-16LE encoding
5. ✅ Encoding conversion (Latin-1 → UTF-8)
6. ✅ Non-ASCII rejection in ASCII mode
7. ✅ Append with consistent encoding

**All Tests Pass**: 401/401 (19 skipped)

## Example Code

**Demo File**: `examples/10-file-io/src/encoding-demo-gs.ts`

Demonstrates:
- Default UTF-8 usage
- ASCII validation
- Latin-1 for Western European text
- UTF-16LE for Windows compatibility
- Encoding conversion workflows
- Append with matching encodings

## Usage Examples

### 1. Default UTF-8 (Recommended)
```typescript
// Modern approach - UTF-8 everywhere
FileSystem.writeText('config.json', JSON.stringify(config));
const data = FileSystem.readText('config.json');
```

### 2. Legacy System Integration
```typescript
// Read old Latin-1 config file
const legacyConfig = FileSystem.readText('app.ini', 'latin1');

// Convert to UTF-8
FileSystem.writeText('app-utf8.ini', legacyConfig, 'utf-8');
```

### 3. Windows Interop
```typescript
// Write Windows-compatible UTF-16LE
FileSystem.writeText('data.txt', 'Windows text', 'utf-16le');

// Read it back
const windowsText = FileSystem.readText('data.txt', 'utf-16le');
```

### 4. ASCII Validation
```typescript
// Ensure file contains only ASCII
try {
  FileSystem.writeText('data.txt', content, 'ascii');
  console.log('Content is ASCII-safe');
} catch {
  console.log('Content contains non-ASCII characters');
}
```

### 5. Encoding Conversion Pipeline
```typescript
// Read various encodings, normalize to UTF-8
const files = [
  { path: 'old.txt', encoding: 'latin1' },
  { path: 'windows.txt', encoding: 'utf-16le' },
  { path: 'modern.txt', encoding: 'utf-8' },
];

for (const file of files) {
  const content = FileSystem.readText(file.path, file.encoding);
  FileSystem.writeText(`normalized/${file.path}`, content, 'utf-8');
}
```

## Best Practices

### ✅ DO
- Use UTF-8 by default for new files
- Specify encoding explicitly for legacy files
- Match encoding when appending to existing files
- Handle encoding errors gracefully
- Document file encodings in comments

### ❌ DON'T
- Mix encodings when appending
- Assume file encoding without checking
- Use ASCII for non-English text
- Use Latin-1 for Unicode characters (use UTF-8)

## Error Handling

### Encoding Errors
```typescript
// Invalid ASCII character
FileSystem.writeText('file.txt', 'Café', 'ascii');
// Throws: String contains non-ASCII characters

// Character outside Latin-1 range
FileSystem.writeText('file.txt', '中文', 'latin1');
// Throws: Character U+4E2D cannot be encoded as Latin1
```

### Safe Error Handling
```typescript
function safeTryEncoding(path: string, content: string, encoding: string): boolean {
  try {
    FileSystem.writeText(path, content, encoding);
    return true;
  } catch (e) {
    console.log(`Cannot encode as ${encoding}:`, e);
    return false;
  }
}
```

## Platform Compatibility

| Platform | Implementation | Encodings |
|----------|---------------|-----------|
| **C++ (GC mode)** | Custom converters + `<codecvt>` | All 5 |
| **C++ (Ownership)** | Custom converters + `<codecvt>` | All 5 |
| **TypeScript/Node.js** | Node.js `Buffer` | All 5 |
| **Browser** | TextEncoder/TextDecoder | UTF-8, UTF-16 |

## Performance Considerations

- **UTF-8**: Zero conversion overhead (native format)
- **ASCII**: O(n) validation pass
- **Latin-1**: O(n) byte-by-byte conversion
- **UTF-16**: Uses standard library `<codecvt>` (optimized)

**Recommendation**: Use UTF-8 unless interfacing with legacy systems.

## Future Enhancements

Potential additions:
- **Base64 encoding**: For binary data in text format
- **Auto-detection**: Detect file encoding automatically
- **BOM handling**: Byte Order Mark for UTF-16/UTF-8
- **More encodings**: Windows-1252, Shift-JIS, GB2312, etc.
- **Streaming encoders**: For large file conversion

## Migration Guide

### Existing Code (No Changes Needed)
```typescript
// This still works - defaults to UTF-8
const content = FileSystem.readText('file.txt');
FileSystem.writeText('output.txt', content);
```

### Adding Encoding Support
```typescript
// Explicitly specify encoding
const content = FileSystem.readText('file.txt', 'latin1');
FileSystem.writeText('output.txt', content, 'utf-8');
```

## Summary

✅ **5 encodings supported**: utf-8, ascii, latin1, utf-16le, utf-16be  
✅ **Backward compatible**: Default UTF-8 behavior unchanged  
✅ **Cross-platform**: Works in C++ (both modes) and TypeScript  
✅ **Well tested**: 7 comprehensive encoding tests  
✅ **Documented**: 200+ lines in API guide with examples  
✅ **Production ready**: All 401 tests passing  

This implementation enables GoodScript to interoperate with legacy systems and handle files in various encodings while maintaining UTF-8 as the recommended default for modern applications.
