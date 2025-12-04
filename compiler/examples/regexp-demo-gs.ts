// GoodScript RegExp Example
// Demonstrates regex support compiling to C++

// Basic regex matching
const pattern = /\d+/g;
console.log(pattern.test("hello 123"));  // true
console.log(pattern.global);              // true

// String methods with regex
const text = "hello world";
console.log(text.replace(/world/, "GoodScript"));  // "hello GoodScript"
console.log(text.search(/world/));                 // 6

// Flags
const caseInsensitive = /HELLO/i;
console.log(caseInsensitive.test("hello"));  // true

// Complex patterns
const email = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
console.log(email.test("user@example.com"));  // true
