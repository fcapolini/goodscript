// Example: File I/O with FileSystem API
// Shows synchronous and asynchronous file operations

// Synchronous file operations
console.log("=== Synchronous File Operations ===");

// Write a file
const content = "Hello from GoodScript!\nThis is a test file.\n";
FileSystem.writeText("test-output.txt", content);
console.log("File written successfully");

// Read the file back
const readContent = FileSystem.readText("test-output.txt");
console.log("File content:", readContent);

// Check if file exists
const exists = FileSystem.exists("test-output.txt");
console.log("File exists:", exists);

// Append to file
FileSystem.appendText("test-output.txt", "Appended line!\n");
const updatedContent = FileSystem.readText("test-output.txt");
console.log("Updated content:", updatedContent);

// Create directory
FileSystem.mkdir("test-dir");
console.log("Directory created");

// Write file in directory
FileSystem.writeText("test-dir/nested-file.txt", "Nested content");

// List directory contents
const entries = FileSystem.readDir("test-dir");
console.log("Directory entries:");
for (const entry of entries) {
  console.log("  -", entry);
}

// Get file stats
const stats = FileSystem.stat("test-output.txt");
console.log("File size:", stats.size, "bytes");

// Asynchronous file operations
console.log("\n=== Asynchronous File Operations ===");

async function asyncExample(): Promise<void> {
  // Async write
  await FileSystemAsync.writeText("async-test.txt", "Async content\n");
  console.log("Async file written");
  
  // Async read
  const asyncContent = await FileSystemAsync.readText("async-test.txt");
  console.log("Async file content:", asyncContent);
  
  // Async exists check
  const asyncExists = await FileSystemAsync.exists("async-test.txt");
  console.log("Async file exists:", asyncExists);
  
  console.log("All async operations complete!");
  return Promise.resolve(undefined);
}

asyncExample();
