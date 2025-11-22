/**
 * LRU Cache Implementation
 * 
 * Demonstrates:
 * - Shared ownership pattern for arena-managed objects
 * - Weak references for non-owning pointers
 * - Hash map integration
 * 
 * Note: This is a simplified example showing ownership patterns.
 * Full implementation would require runtime support for Shared→Weak conversion.
 */

/// <reference path="../../../../../lib/goodscript.d.ts" />

class CacheNode {
  key: string;
  value: number;
  
  constructor(key: string, value: number) {
    this.key = key;
    this.value = value;
  }
}

class LRUCache {
  private capacity: number;
  private size: number;
  private nodes: share<CacheNode>[];  // Arena owns all nodes with shared ownership
  private cache: Map<string, share<CacheNode>>;  // Map stores shared references
  
  constructor(capacity: number) {
    this.capacity = capacity;
    this.size = 0;
    this.nodes = [];
    this.cache = new Map();
  }
  
  private addNode(node: share<CacheNode>): void {
    this.nodes.push(node);  // Arena owns it with shared ownership
  }
  
  private removeLast(): void {
    if (this.nodes.length > 0) {
      const lastNode = this.nodes[this.nodes.length - 1];
      if (lastNode !== null && lastNode !== undefined) {
        const key = lastNode.key;
        this.cache.delete(key);
      }
      // Note: In a full implementation, we'd remove from nodes array
      this.size--;
    }
  }
  
  get(key: string): number | null {
    const node = this.cache.get(key);
    
    if (node !== undefined && node !== null) {
      return node.value;
    }
    
    return null;
  }
  
  put(key: string, value: number): void {
    const existing = this.cache.get(key);
    
    if (existing !== undefined && existing !== null) {
      // Update existing
      existing.value = value;
    } else {
      // Add new - create as Shared for arena storage
      const node = new CacheNode(key, value);
      this.cache.set(key, node);
      this.addNode(node);
      this.size++;
      
      if (this.size > this.capacity) {
        this.removeLast();
      }
    }
  }
  
  has(key: string): boolean {
    const node = this.cache.get(key);
    return node !== undefined && node !== null;
  }
  
  getSize(): number {
    return this.size;
  }
}

// Example usage
const testCache = (): void => {
  const cache = new LRUCache(3);
  
  cache.put("a", 1);
  cache.put("b", 2);
  cache.put("c", 3);
  
  console.log(`Cache size: ${cache.getSize()}`);
  
  const val = cache.get("a");
  if (val !== null) {
    console.log(`Got value: ${val}`);
  }
  
  cache.put("d", 4);  // Should evict oldest
  
  if (cache.has("a")) {
    console.log("a is still in cache");
  }
}

testCache();
