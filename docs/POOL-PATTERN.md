# Pool Pattern for Cycle-Free Data Structures

## Overview

The **pool pattern** is a fundamental technique for building complex data structures in GoodScript without creating ownership cycles. Instead of nodes owning their neighbors directly, all nodes are owned by a central pool, and nodes reference each other using weak references or indices.

This pattern is essential because GoodScript's ownership system (like Rust's) prohibits cyclic ownership to enable deterministic memory management.

### Pool vs Arena

- **Pool Pattern** (general): Central ownership with individual node lifecycle management. Nodes can be added/removed independently.
- **Arena Pattern** (optimization): A pool variant optimized for bulk allocation/deallocation. All nodes share the same lifecycle and are freed together.

Use the **pool pattern** as the default solution for DAG conflicts. Use the **arena pattern** only when bulk deallocation is appropriate.

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

## The Solution: Pool Pattern

The pool pattern solves this by:

1. **Centralizing ownership**: A single pool owns all nodes
2. **Using indices/weak references**: Nodes reference each other without ownership
3. **Maintaining a flat structure**: All nodes live in the pool's storage

### Basic Pool Structure

```typescript
class Pool<T> {
  nodes: unique<Node<T>>[];
  freeList: number[];  // Indices of freed nodes for reuse
  
  constructor() {
    this.nodes = [];
    this.freeList = [];
  }
  
  // Allocate a new node, returns its index
  alloc(value: T): number {
    // Reuse freed slot if available
    if (this.freeList.length > 0) {
      const index = this.freeList.pop()!;
      this.nodes[index] = new Node(value, index);
      return index;
    }
    // Otherwise allocate new slot
    const index = this.nodes.length;
    this.nodes.push(new Node(value, index));
    return index;
  }
  
  // Access a node by index
  get(index: number): weak<Node<T>> {
    return this.nodes[index] ?? null;
  }
  
  // Free a node and make its slot available for reuse
  free(index: number): void {
    this.freeList.push(index);
    // Note: We don't actually remove from nodes array
    // to keep indices stable. Node is simply marked as free.
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

## Benefits of the Pool Pattern

1. **No Ownership Cycles**: Pool owns all nodes; nodes use indices/weak references
2. **Flexible Lifecycle**: Individual nodes can be freed independently (pool) or bulk-freed (arena variant)
3. **Cache Locality**: All nodes stored contiguously in memory
4. **Deterministic Cleanup**: No need for garbage collection cycles
5. **Rust Compatibility**: Maps directly to Rust's pool/arena patterns (e.g., `typed-arena`, `generational-arena`)

## Rust Translation

GoodScript pool patterns translate naturally to Rust:

```rust
// GoodScript pool compiles to Rust using Vec and indices
struct Pool<T> {
    nodes: Vec<Node<T>>,
    free_list: Vec<usize>,
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

## When to Use the Pool Pattern

✅ **Use pools when:**
- Building complex data structures (trees, graphs, linked lists)
- Nodes need to reference each other (would create DAG cycles)
- Need to break ownership cycles for compiler validation
- Nodes may have different lifetimes (individual add/remove)

✅ **Use arena variant when:**
- All nodes share the same lifecycle
- Bulk allocation/deallocation is beneficial
- Cache-friendly memory layout is important
- Structure lifetime is well-defined (e.g., per-request allocator)

❌ **Don't use pools when:**
- Simple linear ownership suffices (e.g., `unique<T>`)
- Structure is simple enough for standard collections
- Need true shared ownership across independent contexts (use `shared<T>` instead)

## Pool vs Arena Implementation

### Pool (General Case)
```typescript
class Pool<T> {
  nodes: unique<Node<T>>[];
  freeList: number[];
  
  free(index: number): void {
    this.freeList.push(index);  // Individual removal
  }
}
```

### Arena (Bulk Deallocation)
```typescript
class Arena<T> {
  nodes: unique<Node<T>>[];
  
  clear(): void {
    this.nodes = [];  // Bulk removal of all nodes
  }
}
```

## Related Patterns

- **Generational Indices**: Add generation counters to detect stale references
- **Slotmap Pattern**: Combine free list with generation tracking for safety
- **Entity-Component-System (ECS)**: Multiple pools for different component types
- **Arena Allocator**: Specialized pool optimized for bulk deallocation

## See Also

- [DAG-DETECTION.md](./DAG-DETECTION.md) - How GoodScript detects ownership cycles
- [LANGUAGE.md](./LANGUAGE.md) - Complete ownership semantics
- Rust's `typed-arena` crate (bulk deallocation)
- Rust's `generational-arena` crate (individual lifecycle management)
