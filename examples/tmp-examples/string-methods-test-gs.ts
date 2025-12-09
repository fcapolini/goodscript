// Test string methods
// GoodScript test for Phase 7a.6

function testSplit(): void {
  const str = "a,b,c";
  const parts = str.split(",");
  console.log("Split:", parts);
}

function testSlice(): void {
  const str = "hello world";
  const sub = str.slice(0, 5);
  console.log("Slice:", sub);
}

function testTrim(): void {
  const str = "  hello  ";
  const trimmed = str.trim();
  console.log("Trim:", trimmed);
}

function testCase(): void {
  const str = "Hello World";
  const lower = str.toLowerCase();
  const upper = str.toUpperCase();
  console.log("Lower:", lower);
  console.log("Upper:", upper);
}

function testSearch(): void {
  const str = "hello world";
  const idx = str.indexOf("world");
  const has = str.includes("world");
  console.log("IndexOf:", idx);
  console.log("Includes:", has);
}

function testChaining(): void {
  const str = "  Hello World  ";
  const result = str.trim().toLowerCase();
  console.log("Chained:", result);
}

testSplit();
testSlice();
testTrim();
testCase();
testSearch();
testChaining();
