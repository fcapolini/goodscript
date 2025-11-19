# Pool Pattern for Cycle-Free Data Structures

## Overview

The **pool pattern** is the fundamental, high-performance technique for building complex data structures like trees and graphs in GoodScript without creating ownership cycles. It allows for deterministic memory management and superior runtime performance.

Instead of nodes owning their neighbors directly (which creates cycles), all nodes are owned by a central pool, and nodes reference each other using simple **integer indices**.

This pattern is essential because GoodScript's Ownership System (Levels 2 and 3) prohibits cyclic ownership to enable memory safety guarantees and highly efficient Rust code generation.

-----

## ⛔ The Problem: Ownership Cycles

Traditional data structures often create ownership cycles that are incompatible with GoodScript's ownership model, preventing compile-time memory safety checks:

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
  parent: shared<TreeNode<T>> | null; // Shared ownership to parent - CYCLE!
  children: unique<TreeNode<T>>[];   // owns children
}
```

These structures violate the Directed Acyclic Graph (DAG) invariant enforced by the compiler.

-----

## ✅ The Solution: Pool Pattern

The pool pattern solves this by flattening the structure and centralizing ownership:

1.  **Centralized Ownership**: A single **Pool** holds the strong, exclusive ownership (`unique<T>`) of all nodes.
2.  **Weak Referencing**: Nodes refer to each other using **simple indices (`number`)**, which are non-owning and fast.
3.  **Contiguous Storage**: All nodes are stored contiguously in an array, providing the performance advantage of **cache locality**.

### Pool vs Arena

The terms **Pool** and **Arena** define the object lifecycle:

| Pattern | Ownership Structure | Node Lifecycle | Use Case |
| :--- | :--- | :--- | :--- |
| **Pool** (General) | Central ownership (`unique<T>[]`) | **Individual** nodes can be added and removed/freed independently. | Long-lived structures (e.g., entity system). |
| **Arena** (Optimization) | Central ownership (`unique<T>[]`) | **Bulk** allocation and deallocation. All nodes are freed together (`clear()`). | Short-lived, cache-friendly structures (e.g., per-request storage). |

Use the **pool pattern** as the default solution for complex graph/tree conflicts.

-----

## 🚀 Performance Rationale for Arrays vs. Sets

While a `Set<T>` or `Map<number, T>` can store objects, the array-based pool is mandatory for achieving GoodScript's **Rust-level performance**:

| Feature | Array/Vector Pool (`unique<T>[]`) | Set/Map (Hash Table) |
| :--- | :--- | :--- |
| **Memory Layout** | **Contiguous**. Nodes are packed tightly in memory. | **Scattered**. Nodes are placed arbitrarily based on a hash function. |
| **CPU Cache** | **Excellent Cache Locality**. CPU pre-fetches adjacent nodes during traversal. | **Frequent Cache Misses**. Requires costly jumps to random memory locations. |
| **Rust Transpilation** | Maps directly to `Vec<T>` and specialized, high-performance crates. | Maps to `HashMap` or `BTreeMap`, which are generally slower for traversal. |

The array-based design is key to maximizing speed and memory efficiency.

-----

## 💡 Implementation Details

### Basic Pool Structure

A general-purpose pool that supports individual node allocation and freeing via a simple free-list.

```typescript
// Node only holds its data and index, no ownership of others
class Node<T> {
  value: T;
  index: number;
  // Other references use number indices: next: number | null;
  
  constructor(value: T, index: number) {
    this.value = value;
    this.index = index;
  }
}

class Pool<T> {
  // Array holds the strong, exclusive ownership of all nodes.
  nodes: (unique<Node<T>> | null)[];
  freeList: number[]; // Indices of freed nodes for reuse
  
  constructor() {
    this.nodes = [];
    this.freeList = [];
  }
  
  // Allocate a new node, returns its index
  alloc(value: T): number {
    let index: number;
    
    // Reuse a free slot if available
    if (this.freeList.length > 0) {
      index = this.freeList.pop()!;
      this.nodes[index] = new Node(value, index);
    } else {
      index = this.nodes.length;
      this.nodes.push(new Node(value, index));
    }
    return index;
  }
  
  // Access a node by index (returns a non-owning, weak reference)
  get(index: number): weak<Node<T>> {
    // Note: The Pool holds the unique<T> owner. We expose a weak reference.
    return this.nodes[index] ?? null;
  }
  
  // Free a node and make its slot available for reuse
  free(index: number): void {
    if (this.nodes[index] !== null) {
      this.nodes[index] = null;
      this.freeList.push(index);
    }
  }
}
```

-----

## 3\. Example: Doubly-Linked List

By using indices instead of direct ownership pointers (`unique<T>`), we break the cycle.

```typescript
class ListNode<T> {
  value: T;
  index: number;
  next: number | null; // index, not ownership
  prev: number | null; // index, not ownership
  
  // ... constructor and other methods ...
}

class LinkedListArena<T> {
  nodes: unique<ListNode<T>>[]; // The Pool array
  head: number | null;
  tail: number | null;
  
  // ... push, get, and iteration methods use indices to traverse ...
}
```

-----

## 4\. Example: Tree Structure

Indices allow a child to reference a parent without ownership.

```typescript
class TreeNode<T> {
  value: T;
  index: number;
  parent: number | null; // index, not ownership (breaks cycle)
  children: number[];    // indices, not ownership
  
  // ... constructor ...
}

class TreeArena<T> {
  nodes: unique<TreeNode<T>>[];
  root: number | null;
  
  // ... createRoot, addChild, and traversal methods ...
}
```

-----

## 5\. Example: Graph Structure

Nodes can reference any other node via indices, breaking mutual ownership and allowing for graph traversal.

```typescript
class GraphNode<T> {
  value: T;
  index: number;
  edges: number[]; // indices of connected nodes, not ownership
  
  // ... constructor ...
}

class GraphArena<T> {
  nodes: unique<GraphNode<T>>[];
  
  // ... addNode, addEdge, and traversal methods (like BFS) ...
}
```

-----

## ⚠️ Advanced Safety: The Stale Index Problem

The simple index (`number`) approach carries a risk in long-lived applications where nodes are frequently allocated and freed:

1.  Node A is created at index `5`.
2.  Node A is freed, and index `5` is put back on the `freeList`.
3.  Node B is later allocated and reuses index `5`.
4.  If an old reference to index `5` is still active, it now **incorrectly points to the new Node B**. This is a **stale reference**.

### The Solution: Generational Indices

For maximum safety, you must use **Generational Indices** (or the **Slotmap Pattern**). This involves:

  * The index being a struct: `(index: number, generation: number)`.
  * The Pool tracking a generation counter for each slot.
  * When a slot is reused, its generation counter is incremented.
  * Any lookup checks if the generation in the reference matches the generation in the slot. If they mismatch, the reference is known to be stale and invalid.

-----

## Benefits and Use Cases

| Benefit | Description |
| :--- | :--- |
| **No Ownership Cycles** | Guarantees compliance with GoodScript's DAG validation at compile time. |
| **Native Performance** | Achieved through contiguous memory storage (cache locality). |
| **Deterministic Cleanup** | Nodes are destroyed immediately upon removal from the pool (no GC pauses). |
| **Rust Compatibility** | Translates directly to highly optimized Rust pool/arena implementations. |

| When to Use | Use Case |
| :--- | :--- |
| ✅ **Pool** (General) | Complex structures, individual node management, long-lived data. |
| ✅ **Arena** (Optimization) | Structures that are built and destroyed together (e.g., data per request). |
| ❌ **Don't Use** | Simple linear ownership (`unique<T>`) or pure shared ownership (`shared<T>`). |

## See Also

  - [DAG-DETECTION.md](https://www.google.com/search?q=./DAG-DETECTION.md) - How GoodScript detects ownership cycles
  - [LANGUAGE.md](https://www.google.com/search?q=./LANGUAGE.MD) - Complete ownership semantics
  - Rust's `generational-arena` crate (for generational indices)
  - Rust's `typed-arena` crate (for bulk deallocation)
