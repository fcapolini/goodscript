// Example: Text Encoding Support
// Demonstrates reading and writing files in different encodings

console.log("=== Text Encoding Demo ===\n");

// 1. Default UTF-8 (recommended for new files)
console.log("1. UTF-8 (default):");
const utf8Content = "Hello, 世界! 你好 🌍";
FileSystem.writeText("utf8.txt", utf8Content);
const readUtf8 = FileSystem.readText("utf8.txt");
console.log("  Written and read:", readUtf8);
console.log("  Match:", utf8Content === readUtf8 ? "✓" : "✗");

// 2. ASCII (7-bit, English only)
console.log("\n2. ASCII (7-bit):");
const asciiContent = "ASCII only - no special chars!";
FileSystem.writeText("ascii.txt", asciiContent, "ascii");
const readAscii = FileSystem.readText("ascii.txt", "ascii");
console.log("  Written and read:", readAscii);

// Try to write non-ASCII (should fail gracefully)
try {
  FileSystem.writeText("ascii-fail.txt", "Café", "ascii");
  console.log("  Error: Should have thrown!");
} catch {
  console.log("  ✓ Correctly rejected non-ASCII content");
}

// 3. Latin-1 / ISO-8859-1 (Western European)
console.log("\n3. Latin-1 / ISO-8859-1:");
const latin1Content = "Café résumé naïve Zürich";
FileSystem.writeText("latin1.txt", latin1Content, "latin1");
const readLatin1 = FileSystem.readText("latin1.txt", "latin1");
console.log("  Written and read:", readLatin1);
console.log("  Match:", latin1Content === readLatin1 ? "✓" : "✗");

// 4. UTF-16LE (Windows text files)
console.log("\n4. UTF-16LE (Windows):");
const utf16Content = "Windows UTF-16LE: Hello, 日本語";
FileSystem.writeText("utf16le.txt", utf16Content, "utf-16le");
const readUtf16 = FileSystem.readText("utf16le.txt", "utf-16le");
console.log("  Written and read:", readUtf16);
console.log("  Match:", utf16Content === readUtf16 ? "✓" : "✗");

// 5. Encoding conversion
console.log("\n5. Encoding conversion:");
FileSystem.writeText("source.txt", "Conversion test: Café", "latin1");
const converted = FileSystem.readText("source.txt", "latin1");
FileSystem.writeText("converted.txt", converted, "utf-8");
console.log("  Converted Latin-1 → UTF-8");
const readConverted = FileSystem.readText("converted.txt");
console.log("  Result:", readConverted);

// 6. Append with encoding
console.log("\n6. Append with matching encoding:");
FileSystem.writeText("log.txt", "Entry 1: Start\n", "utf-8");
FileSystem.appendText("log.txt", "Entry 2: Processing\n", "utf-8");
FileSystem.appendText("log.txt", "Entry 3: Complete\n", "utf-8");
const logContent = FileSystem.readText("log.txt");
console.log("  Log entries:");
const lines = logContent.split("\n");
for (const line of lines) {
  if (line.length > 0) {
    console.log("    " + line);
  }
}

console.log("\n=== Demo Complete ===");
console.log("\nCreated files:");
console.log("  utf8.txt (UTF-8)");
console.log("  ascii.txt (ASCII)");
console.log("  latin1.txt (Latin-1)");
console.log("  utf16le.txt (UTF-16LE)");
console.log("  converted.txt (Latin-1 → UTF-8)");
console.log("  log.txt (UTF-8 with appends)");
