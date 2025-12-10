/**
 * Example GoodScript Program
 * Demonstrates type imports and usage
 */

import type { own, share, integer, integer53 } from 'goodscript';

// Fibonacci using integer type
export function fibonacci(n: integer): integer {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Buffer with unique ownership
export class Buffer {
  private data: own<Uint8Array>;
  private size: integer;
  
  constructor(size: integer) {
    this.data = new Uint8Array(size);
    this.size = size;
  }
  
  getSize(): integer {
    return this.size;
  }
}

// Linked list with shared ownership
export class Node {
  value: integer;
  next: share<Node> | null;
  
  constructor(value: integer) {
    this.value = value;
    this.next = null;
  }
}

// Timestamp using integer53
export function getTimestamp(): integer53 {
  return Date.now();
}

// Main function
function main(): void {
  console.log("Fibonacci(10):", fibonacci(10));
  
  const buffer = new Buffer(1024);
  console.log("Buffer size:", buffer.getSize());
  
  const node = new Node(42);
  console.log("Node value:", node.value);
  
  const timestamp = getTimestamp();
  console.log("Timestamp:", timestamp);
}

main();
