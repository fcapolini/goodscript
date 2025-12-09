// Example: Maps (Key-Value Storage)
// Shows Map operations for dynamic data storage

// Create a Map
const userScores = new Map<string, number>();

// Add entries
userScores.set("Alice", 95);
userScores.set("Bob", 87);
userScores.set("Charlie", 92);

console.log("Map size:", userScores.size);

// Get values
console.log("Alice's score:", userScores.get("Alice"));
console.log("Bob's score:", userScores.get("Bob"));

// Check if key exists
console.log("Has Charlie?", userScores.has("Charlie"));
console.log("Has David?", userScores.has("David"));

// Iterate over entries
console.log("\nAll scores:");
userScores.forEach((score: number, name: string): void => {
  console.log(`  ${name}: ${score}`);
});

// Iterate over keys
console.log("\nAll names:");
for (const name of userScores.keys()) {
  console.log("  -", name);
}

// Iterate over values
console.log("\nAll scores (values only):");
for (const score of userScores.values()) {
  console.log("  -", score);
}

// Delete an entry
userScores.delete("Bob");
console.log("\nAfter deleting Bob, size:", userScores.size);

// Clear all entries
userScores.clear();
console.log("After clear, size:", userScores.size);
