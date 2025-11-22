/**
 * Test: Sharing data between multiple owners
 * 
 * Correct approach: Use Shared<T> for reference-counted sharing
 */

/// <reference path="../../../../../../lib/goodscript.d.ts" />

// Scenario: Multiple caches want to share the same data
class SharedData {
  value: string = "shared content";
  count: number = 0;
}

class Cache1 {
  data: Shared<SharedData> | null = null;
  
  setData(d: Shared<SharedData>): void {
    this.data = d;  // Shares ownership
  }
}

class Cache2 {
  data: Shared<SharedData> | null = null;
  
  setData(d: Shared<SharedData>): void {
    this.data = d;  // Also shares ownership - this is OK!
  }
}

// Share data between caches using Shared<T>
const sharedData = new SharedData();
const cache1 = new Cache1();
const cache2 = new Cache2();

cache1.setData(sharedData);  // cache1 shares ownership
cache2.setData(sharedData);  // cache2 also shares ownership

console.log("Both caches can access shared data");
