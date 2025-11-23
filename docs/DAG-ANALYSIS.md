# DAG Analysis & Ownership Derivation Rules

## Overview

**Phase 2 (Ownership Analysis)** enforces two complementary safety mechanisms:

1. **DAG (Directed Acyclic Graph) Check** — prevents reference cycles that cause memory leaks
2. **Ownership Derivation Rules** — prevents logic mistakes in ownership transfer

Both are applied by traversing the Abstract Syntax Tree (AST) after Phase 1 validation.

### DAG Check

The DAG analysis focuses exclusively on the **`share<T>`** qualifier, as `own<T>` cannot form cycles and `use<T>` actively breaks them.

### Derivation Rules

Enforced on assignments and function arguments (error codes GS304, GS305):
- From `own<T>` → only `use<T>` (no aliasing of exclusive ownership)
- From `share<T>` → `share<T>` or `use<T>` (can share or downgrade)
- From `use<T>` → only `use<T>` (cannot upgrade to ownership)
- `new T()` → implicitly `own<T>` (can only assign to `own<T>` fields)

-----

## 🛑 Rule Set for the Static Ownership DAG Check

The compiler's ownership analyzer must build a graph where **Types are Nodes** and **`share<T>` relationships are Edges**. The entire graph must be a DAG.

### 1\. Building the Ownership Graph (Edges)

An **Ownership Edge** exists from Type $A$ to Type $B$ if and only if **Type $A$ contains a field that confers `share<T>` ownership of Type $B$**.

#### Rule 1.1: Direct $\text{shared}<T>$ Field

If a `class A` declares a field `b: share<B>`, an edge exists: $A \to B$.

#### Rule 1.2: Container Transitivity (Shallow Ownership)

If a container (like `Array`, `Map`, `Set`) is defined to hold shared elements, ownership is conferred transitively.

  * If `class A` declares a field `list: share<B>[]` (or `Array<share<B>>`), an edge exists: $A \to B$.
  * If `class C` declares a field `map: Map<K, share<D>>`, an edge exists: $C \to D$. (The key $K$ is usually a value type like `string` or `number`, so it does not affect the cycle analysis).

#### Rule 1.3: Intermediate Wrapper Transitivity (Deep Ownership)

If Type $A$ owns Type $B$, and Type $B$ owns Type $C$, the ownership link extends.

  * If `class A` declares `b: share<B>` and `class B` declares `c: share<C>`, an edge exists: $A \to B$ and $B \to C$. The ownership is transitively $A \to C$.

-----

### 2\. The Cycle Detection Rule (The Prohibition)

The fundamental rule for rejecting code is based on graph theory:

#### Rule 2.1: The Self-Ownership Prohibition

**A type $T$ must not transitively own an instance of type $T$ through a chain of $\text{shared}<T>$ relationships.**

  * **Compiler Action:** Perform a Depth-First Search (DFS) or similar cycle detection algorithm on the graph built from Rules 1.1-1.3.
  * **Result:** If the traversal of the graph starting at node $T$ can return to $T$, the graph contains a cycle, and the code **MUST be rejected**.

| Forbidden Cycle Type | Example Declaration | Graph Path |
| :--- | :--- | :--- |
| **Direct Cycle** (Length 1) | `class A { child: share<A>; }` | $A \to A$ |
| **Mutual Cycle** (Length 2) | `class A { b: share<B>; }` + `class B { a: share<A>; }` | $A \to B \to A$ |
| **Container Cycle** | `class A { children: share<A>[]; }` | $A \to \text{Array} \to A$ (Rejected due to Rule 1.2) |

-----

### 3\. Rules for Non-Owning Types (The Escape Hatch)

These rules define how $\text{weak}<T>$ references are permitted to exist without triggering a cycle failure:

#### Rule 3.1: $\text{weak}<T>$ is NOT an Edge

**Fields declared using $\text{weak}<T>$ do not create an ownership edge in the DAG analysis.** They are ignored during cycle detection.

  * This is the mechanism used to implement the **Pool Pattern** and **Parent-Child** relationships safely (e.g., `Child` holds `parent: use<Parent>`).

#### Rule 3.2: $\text{unique}<T>$ is NOT an Edge

**Fields declared using $\text{unique}<T>$ do not create an edge in the $\text{shared}<T>$ DAG analysis.**

  * Since `own<T>` cannot be shared, it cannot participate in the `share<T>` cycle. It creates its own orthogonal graph of unique ownership.

-----

### 4\. Special Case: Handling Self-Contained Structures

#### Rule 4.1: The Pool Pattern Requirement (Enforcing the False Positive)

If a developer attempts to define a structure like a `TreeNode` that is naturally acyclic but *potentially* cyclic in the type system:

```typescript
class TreeNode {
  children: share<TreeNode>[]; // A -> TreeNode
  parent: use<TreeNode>;        // Ignored
}
```

The compiler **must reject** this definition if the type of the contained element (`TreeNode`) is the same as the containing type. This enforces the use of the **Pool Pattern**:

```typescript
class Tree {
  // Tree is the single, non-cyclic owner of nodes
  nodes: own<TreeNode>[];
}

class TreeNode {
  children: use<TreeNode>[]; // All links are non-owning
  parent: use<TreeNode>;
}
```

This conservative rejection (the desired false positive) guarantees the system remains sound, as the compiler cannot verify the runtime construction logic (i.e., that a child node will never be inserted into its own subtree).
