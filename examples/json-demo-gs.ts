// GoodScript JSON Object Demo
// Demonstrates JSON.stringify() for basic types

function stringifyNumbers(): void {
  console.log('=== Stringify Numbers ===');
  
  const int = JSON.stringify(42);
  const negative = JSON.stringify(-42);
  const float = JSON.stringify(3.14159);
  const zero = JSON.stringify(0);
  
  console.log('JSON.stringify(42) =', int);
  console.log('JSON.stringify(-42) =', negative);
  console.log('JSON.stringify(3.14159) =', float);
  console.log('JSON.stringify(0) =', zero);
}

function stringifyStrings(): void {
  console.log('\n=== Stringify Strings ===');
  
  const simple = JSON.stringify('hello');
  const empty = JSON.stringify('');
  const withSpaces = JSON.stringify('hello world');
  
  console.log('JSON.stringify("hello") =', simple);
  console.log('JSON.stringify("") =', empty);
  console.log('JSON.stringify("hello world") =', withSpaces);
}

function stringifyBooleans(): void {
  console.log('\n=== Stringify Booleans ===');
  
  const trueVal = JSON.stringify(true);
  const falseVal = JSON.stringify(false);
  
  console.log('JSON.stringify(true) =', trueVal);
  console.log('JSON.stringify(false) =', falseVal);
}

function practicalExample(): void {
  console.log('\n=== Practical Example: Data Serialization ===');
  
  // Simulate sending data as JSON strings
  const userId = 12345;
  const userName = 'alice';
  const isActive = true;
  const score = 98.5;
  
  console.log('User Data:');
  console.log('  id:', JSON.stringify(userId));
  console.log('  name:', JSON.stringify(userName));
  console.log('  active:', JSON.stringify(isActive));
  console.log('  score:', JSON.stringify(score));
}

function main(): void {
  console.log('GoodScript JSON Object Demo\n');
  
  stringifyNumbers();
  stringifyStrings();
  stringifyBooleans();
  practicalExample();
  
  console.log('\n=== Demo Complete ===');
  console.log('Note: JSON.stringify() currently supports basic types.');
  console.log('Full JSON support (objects, arrays, JSON.parse) requires');
  console.log('vendoring nlohmann/json library (future enhancement).');
}

main();
