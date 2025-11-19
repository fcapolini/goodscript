# Arena Pattern for Cycle-Free Data Structures

## Overview

The **arena pattern** is a fundamental technique for building complex data structures in GoodScript without creating ownership cycles. Instead of nodes owning their neighbors directly, all nodes are owned by a central arena, and nodes reference each other using weak references or indices.

This pattern is essential because GoodScript's ownership system (like Rust's) prohibits cyclic ownership to enable deterministic memory management.

## The Problem: Ownership Cycles

Traditional data structures often create ownership cycles that are incompatible with GoodScript's ownership model:

```typescript
// ❌ ILLEGAL: Cyclic ownership in a doubly-linked list
class Node<T> {
  value: T;
  next: unique<Node<T>> | null;  // owns next node
  prev: unique<Node<T>> | null;  // owns previous node - CYCLE!
}

// ❌ ILLEGAL: Parent-child cycle in a tree
class TreeNode<T> {
  value: T;
  parent: unique<TreeNode<T>> | null;   // owns parent - CYCLE!
  children: unique<TreeNode<T>>[];      // owns children
}

// ❌ ILLEGAL: Graph with mutual ownership
class GraphNode<T> {
  value: T;
  neighbors: unique<GraphNode<T>>[];  // multiple ownership paths - CYCLES!
}
```

These structures create cycles because nodes try to own each other, which violates the ownership hierarchy.

## The Solution: Arena Pattern

The arena pattern solves this by:

1. **Centralizing ownership**: A single arena owns all nodes
2. **Using indices/weak references**: Nodes reference each other without ownership
3. **Maintaining a flat structure**: All nodes live in the arena's storage

### Basic Arena Structure

```typescript
class Arena<T> {
  nodes: unique<Node<T>>[];
  
  constructor() {
    this.nodes = [];
  }
  
  // Allocate a new node, returns its index
  alloc(value: T): number {
    const index = this.nodes.length;
    this.nodes.push(new Node(value, index));
    return index;
  }
  
  // Access a node by index
  get(index: number): weak<Node<T>> {
    return this.nodes[index] ?? null;
  }
  
  // Free a node (mark as unused)
  free(index: number): void {
    // Implementation depends on reuse strategy
    // Could mark as free, add to free list, etc.
  }
}

class Node<T> {
  value: T;
  index: number;  // this node's index in the arena
  
  constructor(value: T, index: number) {
    this.value = value;
    this.index = index;
  }
}
```

## Example: Doubly-Linked List

```typescript
class ListNode<T> {
  value: T;
  index: number;
  next: number | null;  // index of next node, not ownership
  prev: number | null;  // index of previous node, not ownership
  
  constructor(value: T, index: number) {
    this.value = value;
    this.index = index;
    this.next = null;
    this.prev = null;
  }
}

class LinkedListArena<T> {
  nodes: unique<ListNode<T>>[];
  head: number | null;
  tail: number | null;
  
  constructor() {
    this.nodes = [];
    this.head = null;
    this.tail = null;
  }
  
  // Add node to end of list
  push(value: T): number {
    const index = this.nodes.length;
    const node = new ListNode(value, index);
    
    if (this.tail !== null) {
      const tailNode = this.nodes[this.tail];
      if (tailNode !== null && tailNode !== undefined) {
        tailNode.next = index;
        node.prev = this.tail;
      }
    } else {
      this.head = index;
    }
    
    this.tail = index;
    this.nodes.push(node);
    return index;
  }
  
  // Get node by index
  get(index: number): weak<ListNode<T>> {
    return this.nodes[index] ?? null;
  }
  
  // Iterate forward from head
  *iterate(): IterableIterator<T> {
    let current = this.head;
    while (current !== null) {
      const node = this.nodes[current];
      if (node !== null && node !== undefined) {
        yield node.value;
        current = node.next;
      } else {
        break;
      }
    }
  }
}
```

## Example: Tree Structure

```typescript
class TreeNode<T> {
  value: T;
  index: number;
  parent: number | null;     // index, not ownership
  children: number[];        // indices, not ownership
  
  constructor(value: T, index: number) {
    this.value = value;
    this.index = index;
    this.parent = null;
    this.children = [];
  }
}

class TreeArena<T> {
  nodes: unique<TreeNode<T>>[];
  root: number | null;
  
  constructor() {
    this.nodes = [];
    this.root = null;
  }
  
  // Create root node
  createRoot(value: T): number {
    const index = this.nodes.length;
    this.nodes.push(new TreeNode(value, index));
    this.root = index;
    return index;
  }
  
  // Add child to a parent node
  addChild(parentIndex: number, value: T): number {
    const parent = this.nodes[parentIndex];
    if (parent === null || parent === undefined) {
      throw new Error('Parent node not found');
    }
    
    const childIndex = this.nodes.length;
    const child = new TreeNode(value, childIndex);
    child.parent = parentIndex;
    
    parent.children.push(childIndex);
    this.nodes.push(child);
    return childIndex;
  }
  
  // Get node by index
  get(index: number): weak<TreeNode<T>> {
    return this.nodes[index] ?? null;
  }
  
  // Depth-first traversal
  *traverse(startIndex: number = this.root ?? 0): IterableIterator<T> {
    const node = this.nodes[startIndex];
    if (node === null || node === undefined) return;
    
    yield node.value;
    
    for (const childIndex of node.children) {
      yield* this.traverse(childIndex);
    }
  }
}
```

## Example: Graph Structure

```typescript
class GraphNode<T> {
  value: T;
  index: number;
  edges: number[];  // indices of connected nodes, not ownership
  
  constructor(value: T, index: number) {
    this.value = value;
    this.index = index;
    this.edges = [];
  }
}

class GraphArena<T> {
  nodes: unique<GraphNode<T>>[];
  
  constructor() {
    this.nodes = [];
  }
  
  // Add a new node
  addNode(value: T): number {
    const index = this.nodes.length;
    this.nodes.push(new GraphNode(value, index));
    return index;
  }
  
  // Add directed edge from -> to
  addEdge(from: number, to: number): void {
    const fromNode = this.nodes[from];
    if (fromNode !== null && fromNode !== undefined) {
      fromNode.edges.push(to);
    }
  }
  
  // Add undirected edge between two nodes
  addUndirectedEdge(a: number, b: number): void {
    this.addEdge(a, b);
    this.addEdge(b, a);
  }
  
  // Get node by index
  get(index: number): weak<GraphNode<T>> {
    return this.nodes[index] ?? null;
  }
  
  // Breadth-first search
  *bfs(startIndex: number): IterableIterator<T> {
    const visited = new Set<number>();
    const queue: number[] = [startIndex];
    
    while (queue.length > 0) {
      const currentIndex = queue.shift();
      if (currentIndex === null || currentIndex === undefined) continue;
      if (visited.has(currentIndex)) continue;
      
      visited.add(currentIndex);
      const node = this.nodes[currentIndex];
      if (node === null || node === undefined) continue;
      
      yield node.value;
      
      for (const edgeIndex of node.edges) {
        if (!visited.has(edgeIndex)) {
          queue.push(edgeIndex);
        }
      }
    }
  }
}
```

## Advanced: Free List for Node Reuse

For long-lived arenas where nodes are frequently added and removed, maintain a free list to reuse slots:

```typescript
class ArenaWithFreeList<T> {
  nodes: (unique<Node<T>> | null)[];  // null = free slot
  freeList: number[];
  
  constructor() {
    this.nodes = [];
    this.freeList = [];
  }
  
  alloc(value: T): number {
    let index: number;
    
    // Reuse a free slot if available
    if (this.freeList.length > 0) {
      index = this.freeList.pop() ?? this.nodes.length;
      this.nodes[index] = new Node(value, index);
    } else {
      index = this.nodes.length;
      this.nodes.push(new Node(value, index));
    }
    
    return index;
  }
  
  free(index: number): void {
    this.nodes[index] = null;
    this.freeList.push(index);
  }
  
  get(index: number): weak<Node<T>> {
    return this.nodes[index] ?? null;
  }
}
```

## Benefits of the Arena Pattern

1. **No Ownership Cycles**: Arena owns all nodes; nodes use indices/weak references
2. **Cache Locality**: All nodes stored contiguously in memory
3. **Simple Memory Management**: Free entire arena at once when done
4. **Deterministic Cleanup**: No need for garbage collection cycles
5. **Rust Compatibility**: Maps directly to Rust's arena patterns (e.g., `typed-arena`, `generational-arena`)

## Rust Translation

GoodScript arena patterns translate naturally to Rust:

```rust
// GoodScript arena compiles to Rust using Vec and indices
struct Arena<T> {
    nodes: Vec<Node<T>>,
}

impl<T> Arena<T> {
    fn alloc(&mut self, value: T) -> usize {
        let index = self.nodes.len();
        self.nodes.push(Node::new(value, index));
        index
    }
    
    fn get(&self, index: usize) -> Option<&Node<T>> {
        self.nodes.get(index)
    }
}
```

## When to Use the Arena Pattern

✅ **Use arenas when:**
- Building complex data structures (trees, graphs, linked lists)
- Nodes need to reference each other
- You need cache-friendly memory layout
- Bulk allocation/deallocation is acceptable
- Structure lifetime is well-defined

❌ **Don't use arenas when:**
- Simple linear ownership suffices (e.g., `unique<T>`)
- Nodes have independent lifetimes
- Need true shared ownership (use `shared<T>` instead)
- Structure is simple enough for standard collections

## Related Patterns

- **Generational Indices**: Add generation counters to detect stale references
- **Slotmap Pattern**: Combine free list with generation tracking
- **Entity-Component-System (ECS)**: Multiple arenas for different component types

## See Also

- [DAG-DETECTION.md](./DAG-DETECTION.md) - How GoodScript detects ownership cycles
- [LANGUAGE.md](./LANGUAGE.md) - Complete ownership semantics
- Rust's `typed-arena` crate
- Rust's `generational-arena` crate
