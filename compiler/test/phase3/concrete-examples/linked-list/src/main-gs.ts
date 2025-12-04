/**
 * Doubly-linked list demonstrating:
 * - share<T> for shared ownership (nodes owned by list)
 * - Index-based linking (Pool Pattern)
 * - Classes with methods
 * - Array operations
 */

class Node {
  value: number;
  nextIndex: number;
  prevIndex: number;

  constructor(value: number) {
    this.value = value;
    this.nextIndex = -1;
    this.prevIndex = -1;
  }
}

class DoublyLinkedList {
  private nodes: share<Node>[];
  private headIndex: number;
  private tailIndex: number;

  constructor() {
    this.nodes = [];
    this.headIndex = -1;
    this.tailIndex = -1;
  }

  append(value: number): void {
    const newNode = new Node(value);
    const nodeIndex = this.nodes.length;
    this.nodes.push(newNode);

    if (this.tailIndex === -1) {
      // First node
      this.headIndex = nodeIndex;
      this.tailIndex = nodeIndex;
    } else {
      // Link to tail
      const tailNode = this.nodes[this.tailIndex];
      tailNode.nextIndex = nodeIndex;
      // Get the pushed node from array to modify it
      const pushedNode = this.nodes[nodeIndex];
      pushedNode.prevIndex = this.tailIndex;
      this.tailIndex = nodeIndex;
    }
  }

  prepend(value: number): void {
    const newNode = new Node(value);
    const nodeIndex = this.nodes.length;
    this.nodes.push(newNode);

    if (this.headIndex === -1) {
      // First node
      this.headIndex = nodeIndex;
      this.tailIndex = nodeIndex;
    } else {
      // Link to head
      const headNode = this.nodes[this.headIndex];
      headNode.prevIndex = nodeIndex;
      // Get the pushed node from array to modify it
      const pushedNode = this.nodes[nodeIndex];
      pushedNode.nextIndex = this.headIndex;
      this.headIndex = nodeIndex;
    }
  }

  toArray(): number[] {
    const result: number[] = [];
    
    if (this.headIndex !== -1) {
      let currentIdx = this.headIndex;
      
      while (true) {
        const current = this.nodes[currentIdx];
        result.push(current.value);
        
        if (current.nextIndex === -1) {
          break;
        }
        
        currentIdx = current.nextIndex;
      }
    }
    
    return result;
  }

  toArrayReverse(): number[] {
    const result: number[] = [];
    
    if (this.tailIndex !== -1) {
      let currentIdx = this.tailIndex;
      
      while (true) {
        const current = this.nodes[currentIdx];
        result.push(current.value);
        
        if (current.prevIndex === -1) {
          break;
        }
        
        currentIdx = current.prevIndex;
      }
    }
    
    return result;
  }

  size(): number {
    return this.nodes.length;
  }
}

// Test the linked list
const list = new DoublyLinkedList();

console.log('Adding elements...');
list.append(1);
list.append(2);
list.append(3);
list.prepend(0);
list.prepend(-1);

console.log(`List size: ${list.size()}`);
console.log(`Forward: ${JSON.stringify(list.toArray())}`);
console.log(`Reverse: ${JSON.stringify(list.toArrayReverse())}`);

// Verify bidirectional consistency
const forward = list.toArray();
const reverse = list.toArrayReverse();
let consistent = true;

if (forward.length !== reverse.length) {
  console.log('ERROR: Different lengths!');
  consistent = false;
} else {
  for (let i = 0; i < forward.length; i++) {
    if (forward[i] !== reverse[reverse.length - 1 - i]) {
      console.log(`ERROR: Mismatch at position ${i}`);
      consistent = false;
    }
  }
}

if (consistent === true) {
  console.log('Bidirectional traversal consistent!');
}
