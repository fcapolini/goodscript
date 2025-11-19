# DAG detection

This are the rules for the **Directed Acyclic Graph (DAG) Check** which forms the central safety mechanism of the language. These rules must be applied during **Phase 2 (Ownership Analysis)** by traversing the Abstract Syntax Tree (AST) after basic type checking.

The analysis focuses exclusively on the **`shared<T>`** qualifier, as `unique<T>` cannot form cycles and `weak<T>` actively breaks them.

-----

## 🛑 Rule Set for the Static Ownership DAG Check

The compiler's ownership analyzer must build a graph where **Types are Nodes** and **`shared<T>` relationships are Edges**. The entire graph must be a DAG.

### 1\. Building the Ownership Graph (Edges)

An **Ownership Edge** exists from Type $A$ to Type $B$ if and only if **Type $A$ contains a field that confers `shared<T>` ownership of Type $B$**.

#### Rule 1.1: Direct $\text{shared}<T>$ Field

If a `class A` declares a field `b: shared<B>`, an edge exists: $A \to B$.

#### Rule 1.2: Container Transitivity (Shallow Ownership)

If a container (like `Array`, `Map`, `Set`) is defined to hold shared elements, ownership is conferred transitively.

  * If `class A` declares a field `list: shared<B>[]` (or `Array<shared<B>>`), an edge exists: $A \to B$.
  * If `class C` declares a field `map: Map<K, shared<D>>`, an edge exists: $C \to D$. (The key $K$ is usually a value type like $\text{string}$ or $\text{integer}$, so it does not affect the cycle analysis).

#### Rule 1.3: Intermediate Wrapper Transitivity (Deep Ownership)

If Type $A$ owns Type $B$, and Type $B$ owns Type $C$, the ownership link extends.

  * If `class A` declares `b: shared<B>` and `class B` declares `c: shared<C>`, an edge exists: $A \to B$ and $B \to C$. The ownership is transitively $A \to C$.

-----

### 2\. The Cycle Detection Rule (The Prohibition)

The fundamental rule for rejecting code is based on graph theory:

#### Rule 2.1: The Self-Ownership Prohibition

**A type $T$ must not transitively own an instance of type $T$ through a chain of $\text{shared}<T>$ relationships.**

  * **Compiler Action:** Perform a Depth-First Search (DFS) or similar cycle detection algorithm on the graph built from Rules 1.1-1.3.
  * **Result:** If the traversal of the graph starting at node $T$ can return to $T$, the graph contains a cycle, and the code **MUST be rejected**.

| Forbidden Cycle Type | Example Declaration | Graph Path |
| :--- | :--- | :--- |
| **Direct Cycle** (Length 1) | `class A { child: shared<A>; }` | $A \to A$ |
| **Mutual Cycle** (Length 2) | `class A { b: shared<B>; }` + `class B { a: shared<A>; }` | $A \to B \to A$ |
| **Container Cycle** | `class A { children: shared<A>[]; }` | $A \to \text{Array} \to A$ (Rejected due to Rule 1.2) |

-----

### 3\. Rules for Non-Owning Types (The Escape Hatch)

These rules define how $\text{weak}<T>$ references are permitted to exist without triggering a cycle failure:

#### Rule 3.1: $\text{weak}<T>$ is NOT an Edge

**Fields declared using $\text{weak}<T>$ do not create an ownership edge in the DAG analysis.** They are ignored during cycle detection.

  * This is the mechanism used to implement the **Arena Pattern** and **Parent-Child** relationships safely (e.g., `Child` holds `parent: weak<Parent>`).

#### Rule 3.2: $\text{unique}<T>$ is NOT an Edge

**Fields declared using $\text{unique}<T>$ do not create an edge in the $\text{shared}<T>$ DAG analysis.**

  * Since `unique<T>` cannot be shared, it cannot participate in the `shared<T>` cycle. It creates its own orthogonal graph of unique ownership.

-----

### 4\. Special Case: Handling Self-Contained Structures

#### Rule 4.1: The Arena Pattern Requirement (Enforcing the False Positive)

If a developer attempts to define a structure like a `TreeNode` that is naturally acyclic but *potentially* cyclic in the type system:

```typescript
class TreeNode {
  children: shared<TreeNode>[]; // A -> TreeNode
  parent: weak<TreeNode>;        // Ignored
}
```

The compiler **must reject** this definition if the type of the contained element (`TreeNode`) is the same as the containing type. This enforces the use of the **Arena Pattern**:

```typescript
class Tree {
  // Tree is the single, non-cyclic owner of nodes
  nodes: unique<TreeNode>[];
}

class TreeNode {
  children: weak<TreeNode>[]; // All links are non-owning
  parent: weak<TreeNode>;
}
```

This conservative rejection (the desired false positive) guarantees the system remains sound, as the compiler cannot verify the runtime construction logic (i.e., that a child node will never be inserted into its own subtree).
