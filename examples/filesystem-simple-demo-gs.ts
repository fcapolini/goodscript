/**
 * Simple FileSystem Demo
 * Tests basic file operations that are currently supported
 */

function testBasicOperations(): void {
  console.log('FileSystem Demo Starting...');
  console.log('');
  
  console.log('=== Basic File Operations ===');
  
  FileSystem.writeText('test.txt', 'Hello from GoodScript!');
  console.log('Wrote test.txt');
  
  const content = FileSystem.readText('test.txt');
  console.log('Read content:');
  console.log(content);
  
  const exists = FileSystem.exists('test.txt');
  console.log('File exists:');
  console.log(exists);
  
  const info = FileSystem.stat('test.txt');
  console.log('File info:');
  console.log(info.path);
  console.log('Size:');
  console.log(info.size);
  
  console.log('');
  console.log('Demo complete!');
}
