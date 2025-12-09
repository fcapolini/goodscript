/**
 * Simple FileSystem Demo
 * Tests basic file operations that are currently supported
 */

function testBasicOperations(): void {
  console.log('=== Basic File Operations ===');
  
  // Check if file exists
  const exists = FileSystem.exists('test.txt');
  console.log('File exists: ');
  console.log(exists);
  
  // Write a file
  FileSystem.writeText('test.txt', 'Hello from GoodScript!');
  console.log('Wrote test.txt');
  
  // Read the file
  const content = FileSystem.readText('test.txt');
  console.log('Read content: ');
  console.log(content);
  
  // Get file info
  const info = FileSystem.stat('test.txt');
  console.log('File size: ');
  console.log(info.size);
}

async function testAsyncOperations(): Promise<void> {
  console.log('=== Async File Operations ===');
  
  // Async write
  await FileSystemAsync.writeText('async-test.txt', 'Async content!');
  console.log('Wrote async-test.txt');
  
  // Async read
  const content = await FileSystemAsync.readText('async-test.txt');
  console.log('Read async content: ');
  console.log(content);
  
  // Async exists check
  const exists = await FileSystemAsync.exists('async-test.txt');
  console.log('Async file exists: ');
  console.log(exists);
}

async function main(): Promise<void> {
  console.log('FileSystem Demo Starting...');
  console.log('');
  
  testBasicOperations();
  console.log('');
  
  await testAsyncOperations();
  console.log('');
  
  console.log('Demo complete!');
}
