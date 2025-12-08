// Test Map methods compilation

function testBasicOperations(): void {
  const map = new Map<string, number>();
  
  // Set values
  map.set("one", 1);
  map.set("two", 2);
  map.set("three", 3);
  
  console.log("Map has 'two':", map.has("two"));
  console.log("Map get 'two':", map.get("two"));
  console.log("Map size:", map.size);
}

function testIteration(): void {
  const map = new Map<string, number>();
  map.set("a", 1);
  map.set("b", 2);
  map.set("c", 3);
  
  console.log("Keys:");
  for (const key of map.keys()) {
    console.log("  ", key);
  }
  
  console.log("Values:");
  for (const value of map.values()) {
    console.log("  ", value);
  }
}

function testDelete(): void {
  const map = new Map<string, number>();
  map.set("x", 10);
  map.set("y", 20);
  
  console.log("Before delete, size:", map.size);
  map.delete("x");
  console.log("After delete, size:", map.size);
  console.log("Has 'x':", map.has("x"));
}

function testClear(): void {
  const map = new Map<string, number>();
  map.set("p", 1);
  map.set("q", 2);
  
  console.log("Before clear, size:", map.size);
  map.clear();
  console.log("After clear, size:", map.size);
}

function main(): void {
  console.log("=== Basic Operations ===");
  testBasicOperations();
  console.log("");
  
  console.log("=== Iteration ===");
  testIteration();
  console.log("");
  
  console.log("=== Delete ===");
  testDelete();
  console.log("");
  
  console.log("=== Clear ===");
  testClear();
}

main();
