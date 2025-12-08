# DAG Analysis & Ownership Derivation Rules

## Overview

Phase 2a (Ownership Analysis) enforces two complementary safety mechanisms:

1. **DAG (Directed Acyclic Graph) Check** — prevents reference cycles that cause memory leaks
2. **Ownership Derivation Rules** — prevents logic mistakes in ownership transfer

Both are applied by traversing the IR after Phase 3 (Lowering).

### DAG Check

The DAG analysis focuses exclusively on the `share<T>` qualifier, as `own<T>` cannot form cycles and `use<T>` actively breaks them.

### Ownership Derivation Rules

Enforced on assignments and function arguments (error codes GS304, GS305):

- From `own<T>` → only `use<T>` (no aliasing of exclusive ownership)
- From `share<T>` → `share<T>` or `use<T>` (can share or downgrade)
- From `use<T>` → only `use<T>` (cannot upgrade to ownership)
- `new T()` → implicitly `own<T>` (can only assign to `own<T>` fields)

---

## 🛑 Rule Set for the Static Ownership DAG Check

The compiler's ownership analyzer must build a graph where **Types are Nodes** and **`share<T>` relationships are Edges**. The entire graph must be a DAG.

### 1. Building the Ownership Graph (Edges)

An **Ownership Edge** exists from Type $A$ to Type $B$ if and only if Type $A$ contains a field that confers `share<T>` ownership of Type $B$.

#### Rule 1.1: Direct `share<T>` Field

If a `class A` declares a field `b: share<B>`, an edge exists: $A \to B$.

```typescript
class A {
  b: share<B>;  // Edge: A → B
}
```

#### Rule 1.2: Container Transitivity (Shallow Ownership)

If a container (like `Array`, `Map`, `Set`) is defined to hold shared elements, ownership is conferred transitively.

- If `class A` declares a field `list: share<B>[]` (or `Array<share<B>>`), an edge exists: $A \to B$.
- If `class C` declares a field `map: Map<K, share<D>>`, an edge exists: $C \to D$. (The key $K$ is usually a value type like `string` or `number`, so it does not affect the cycle analysis.)

```typescript
class A {
  list: share<B>[];           // Edge: A → B
  map: Map<string, share<C>>; // Edge: A → C
}
```

#### Rule 1.3: Intermediate Wrapper Transitivity (Deep Ownership)

If Type $A$ owns Type $B$, and Type $B$ owns Type $C$, the ownership link extends.

- If `class A` declares `b: share<B>` and `class B` declares `c: share<C>`, an edge exists: $A \to B$ and $B \to C$. The ownership is transitively $A \to C$.

```typescript
class A {
  b: share<B>;  // Edge: A → B
}
class B {
  c: share<C>;  // Edge: B → C
}
// Transitive: A → B → C
```

#### Rule 1.4: Generic Type Parameters

Generic type parameters are instantiated during analysis to detect cycles through parameterized types.

- If `class Container<T>` declares `items: share<T>[]` and `class Node` declares `container: share<Container<Node>>`, edges exist: $\text{Node} \to \text{Container<Node>} \to \text{Node}$.

```typescript
class Container<T> {
  items: share<T>[];  // Edge: Container<T> → T
}

class Node {
  container: share<Container<Node>>;  // Edge: Node → Container<Node> → Node (CYCLE)
}
```

**Compiler Action**: Instantiate generics with concrete types during analysis. Each `Container<Node>` is treated as a distinct type node in the graph.

#### Rule 1.5: Type Aliases (Transparent)

Type aliases are resolved to their underlying types before cycle detection. They do not create additional nodes in the ownership graph.

```typescript
type NodeRef = share<Node>;

class Node {
  next: NodeRef;  // Resolved to: next: share<Node> → Edge: Node → Node (CYCLE)
}
```

**Compiler Action**: Maintain a type alias resolution cache. When encountering a type alias, recursively resolve it to the underlying type before checking for `share<T>` ownership.

#### Rule 1.6: Intersection Types (All Members Analyzed)

Intersection types (`A & B`) are analyzed by checking each member type for `share<T>` ownership.

```typescript
interface Named { name: string; }

class Node {
  next: Named & share<Node>;  // Edge: Node → Node (CYCLE from share<Node> member)
}
```

**Compiler Action**: For `type1 & type2 & ...`, check each member type independently. If any member has `share<T>` ownership, create an ownership edge for that member.

#### Rule 1.7: Union Types (All Variants Analyzed)

Union types (`A | B`) are analyzed by checking each variant for `share<T>` ownership.

```typescript
class Container {
  data: string | share<Container>;  // Edge: Container → Container (CYCLE from variant)
}
```

**Compiler Action**: For `type1 | type2 | ...`, check each variant independently. If any variant has `share<T>` ownership, create an ownership edge for that variant.

**Combined Example** (Union of Intersections):
```typescript
class Node {
  data: string | (Named & share<Node>);  // Edge through intersection in union (CYCLE)
}
```

#### Rule 1.8: Cross-Module Cycles

Ownership edges can span module boundaries. The analyzer must build the complete ownership graph across all imported modules.

```typescript
// a.gs
export class A {
  b: share<B>;  // Edge: A → B
}

// b.gs
import { A } from './a.js';
export class B {
  a: share<A>;  // Edge: B → A (CYCLE: A → B → A)
}
```

**Compiler Action**: Module resolution must happen before ownership analysis. The dependency graph ensures modules are analyzed in topological order, but the ownership graph is built across all modules simultaneously.

#### Rule 1.9: Function Return Types (Non-Edges)

Function return types **do not create ownership edges** because they do not store persistent references.

```typescript
class A {
  getChild(): share<A> {  // NO EDGE: returns don't store references
    return this;
  }
}
```

**Rationale**: Returning a `share<A>` increases the reference count temporarily but doesn't create a persistent ownership relationship stored in a field.

#### Rule 1.10: Closure Captures (Non-Edges)

Closures that capture `this` or other variables **do not create ownership edges** because they represent borrowed references (`use<T>`).

```typescript
class A {
  value: number;
  
  makeCallback(): () => void {
    return () => {
      console.log(this.value);  // NO EDGE: closure captures 'use<A>'
    };
  }
}
```

**Rationale**: Closures in GoodScript capture by reference (equivalent to `use<T>`), not by ownership. The function object doesn't own `this`, it borrows it.

---

### 2. The Cycle Detection Rule (The Prohibition)

The fundamental rule for rejecting code is based on graph theory:

#### Rule 2.1: The Self-Ownership Prohibition

A type $T$ must not transitively own an instance of type $T$ through a chain of `share<T>` relationships.

- **Compiler Action**: Perform a Depth-First Search (DFS) or Tarjan's strongly connected components algorithm on the graph built from Rules 1.1-1.7.
- **Result**: If the traversal of the graph starting at node $T$ can return to $T$, the graph contains a cycle, and the code MUST be rejected.

| **Cycle Type** | **Example** | **Graph** |
|----------------|-------------|-----------|
| Direct Cycle (Length 1) | `class A { child: share<A>; }` | $A \to A$ |
| Mutual Cycle (Length 2) | `class A { b: share<B>; }` + `class B { a: share<A>; }` | $A \to B \to A$ |
| Transitive Cycle (Length 3+) | `class A { b: share<B>; }` + `class B { c: share<C>; }` + `class C { a: share<A>; }` | $A \to B \to C \to A$ |
| Container Cycle | `class A { children: share<A>[]; }` | $A \to A$ (Rejected due to Rule 1.2) |
| Generic Cycle | `class Node { container: share<Container<Node>>; }` | $\text{Node} \to \text{Container<Node>} \to \text{Node}$ |
| Cross-Module Cycle | `A { b: share<B>; }` + `B { a: share<A>; }` (different files) | $A \to B \to A$ |

**Error Codes**:
- **GS301**: Direct self-reference cycle detected (`A → A`)
- **GS302**: Mutual cycle detected (`A → B → A`)
- **GS303**: Transitive cycle detected (`A → B → C → ... → A`)

---

### 3. Rules for Non-Owning Types (The Escape Hatch)

These rules define how `use<T>` and `own<T>` references are permitted to exist without triggering a cycle failure:

#### Rule 3.1: `use<T>` is NOT an Edge

Fields declared using `use<T>` do not create an ownership edge in the DAG analysis. They are ignored during cycle detection.

- This is the mechanism used to implement the **Pool Pattern** and parent-child relationships safely (e.g., `Child` holds `parent: use<Parent>`).

```typescript
class Parent {
  children: share<Child>[];  // Edge: Parent → Child
}

class Child {
  parent: use<Parent>;  // NO EDGE: use<T> breaks the cycle
}
// Result: DAG is valid (Parent → Child, no back-edge)
```

#### Rule 3.2: `own<T>` is NOT an Edge

Fields declared using `own<T>` do not create an edge in the `share<T>` DAG analysis.

- Since `own<T>` cannot be shared (it's unique ownership), it cannot participate in the `share<T>` cycle. It creates its own orthogonal graph of unique ownership.

```typescript
class A {
  b: own<B>;     // NO EDGE in share<T> graph (own<T> is unique)
  c: share<C>;   // Edge: A → C
}
```

**Rationale**: `own<T>` is move-only and cannot form reference-counted cycles. The DAG analysis is specifically for detecting `share<T>` cycles.

---

### 4. Special Case: Handling Self-Contained Structures

#### Rule 4.1: The Pool Pattern Requirement (Enforcing the Conservative Rejection)

If a developer attempts to define a structure like a `TreeNode` that is naturally acyclic but potentially cyclic in the type system:

```typescript
class TreeNode {
  children: share<TreeNode>[];  // Edge: TreeNode → TreeNode (CYCLE)
  parent: use<TreeNode>;        // Ignored (use<T> doesn't create edges)
}
```

The compiler **must reject this definition** even though runtime construction might avoid actual cycles. This enforces the use of the **Pool Pattern**:

```typescript
class Tree {
  nodes: own<TreeNode>[];  // Tree owns all nodes (no cycle: own<T> ignored)
}

class TreeNode {
  children: use<TreeNode>[];  // All links are non-owning (no edges)
  parent: use<TreeNode>;      // Non-owning reference
}
```

This conservative rejection (the desired "false positive") guarantees the system remains sound, as the compiler cannot verify the runtime construction logic (i.e., that a child node will never be inserted into its own subtree).

**Rationale**: Static analysis cannot prove runtime acyclicity. The compiler must assume worst-case: if `TreeNode` can reference `TreeNode`, a cycle is possible.

---

## Implementation Algorithm

### Phase 2a: Ownership Analyzer

**Input**: IR from Phase 3 (Lowering)  
**Output**: Validated DAG or compilation error (GS301-GS305)

#### Step 1: Build Ownership Graph

```typescript
interface OwnershipGraph {
  nodes: Set<string>;           // Class/interface names
  edges: Map<string, Set<string>>;  // Type → Set of owned types
  generics: Map<string, string[]>;  // Generic instantiations
}

function buildGraph(ir: IRModule): OwnershipGraph {
  const graph: OwnershipGraph = { nodes: new Set(), edges: new Map(), generics: new Map() };
  
  for (const decl of ir.declarations) {
    if (decl.kind === 'class' || decl.kind === 'interface') {
      graph.nodes.add(decl.name);
      graph.edges.set(decl.name, new Set());
      
      for (const field of decl.fields) {
        // Rule 1.1: Direct share<T> field
        if (field.type.ownership === Ownership.Share) {
          const targetType = getTypeName(field.type);
          graph.edges.get(decl.name)!.add(targetType);
        }
        
        // Rule 1.2: Container transitivity (share<T>[], Map<K, share<V>>)
        if (field.type.kind === 'array' && field.type.ownership === Ownership.Share) {
          const elementType = getTypeName(field.type.element);
          graph.edges.get(decl.name)!.add(elementType);
        }
        
        // Rule 1.4: Generic instantiation tracking
        if (hasGenerics(field.type)) {
          trackGenericInstantiation(graph, decl.name, field.type);
        }
      }
    }
  }
  
  return graph;
}
```

#### Step 2: Detect Cycles (Tarjan's Algorithm)

```typescript
function detectCycles(graph: OwnershipGraph): CycleError[] {
  const errors: CycleError[] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();
  
  function dfs(node: string, path: string[]): void {
    visited.add(node);
    recStack.add(node);
    path.push(node);
    
    const neighbors = graph.edges.get(node) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path]);
      } else if (recStack.has(neighbor)) {
        // Cycle detected
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart).concat(neighbor);
        errors.push(createCycleError(cycle));
      }
    }
    
    recStack.delete(node);
  }
  
  for (const node of graph.nodes) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }
  
  return errors;
}

function createCycleError(cycle: string[]): CycleError {
  const len = cycle.length - 1; // Subtract duplicate end node
  
  if (len === 1) {
    return { code: 'GS301', message: `Direct cycle detected: ${cycle[0]} → ${cycle[0]}`, cycle };
  } else if (len === 2) {
    return { code: 'GS302', message: `Mutual cycle detected: ${cycle.join(' → ')}`, cycle };
  } else {
    return { code: 'GS303', message: `Transitive cycle detected: ${cycle.join(' → ')}`, cycle };
  }
}
```

#### Step 3: Validate Ownership Derivation

```typescript
function validateOwnershipDerivation(ir: IRModule): DerivationError[] {
  const errors: DerivationError[] = [];
  
  // Check all assignments
  for (const stmt of ir.statements) {
    if (stmt.kind === 'assignment') {
      const lhs = stmt.left.type.ownership;
      const rhs = stmt.right.type.ownership;
      
      if (!isValidDerivation(lhs, rhs)) {
        errors.push({
          code: 'GS304',
          message: `Invalid ownership derivation in assignment: cannot assign ${rhs} to ${lhs}`,
          location: stmt.source
        });
      }
    }
    
    // Check function arguments
    if (stmt.kind === 'call') {
      for (let i = 0; i < stmt.args.length; i++) {
        const paramOwnership = stmt.callee.params[i].type.ownership;
        const argOwnership = stmt.args[i].type.ownership;
        
        if (!isValidDerivation(paramOwnership, argOwnership)) {
          errors.push({
            code: 'GS305',
            message: `Invalid ownership derivation in function argument: cannot pass ${argOwnership} to ${paramOwnership}`,
            location: stmt.source
          });
        }
      }
    }
  }
  
  return errors;
}

function isValidDerivation(target: Ownership, source: Ownership): boolean {
  // own<T> → use<T> only
  if (source === Ownership.Own && target !== Ownership.Use) return false;
  
  // share<T> → share<T> or use<T>
  if (source === Ownership.Share && target === Ownership.Own) return false;
  
  // use<T> → use<T> only
  if (source === Ownership.Use && target !== Ownership.Use) return false;
  
  return true;
}
```

### Complexity Analysis

- **Graph Construction**: $O(V + E)$ where $V$ = number of types, $E$ = number of `share<T>` fields
- **Cycle Detection (DFS)**: $O(V + E)$
- **Tarjan's SCC**: $O(V + E)$ (finds all cycles in one pass)
- **Total**: $O(V + E)$ - linear in the size of the type graph

### Cross-Module Analysis

For multi-module projects:

1. **Module Resolution**: Build dependency graph of imports/exports
2. **Topological Sort**: Determine module compilation order
3. **Global Graph Construction**: Merge ownership graphs from all modules
4. **Global Cycle Detection**: Run Tarjan's algorithm on the merged graph

**Note**: Cycles can span modules, so analysis must be global, not per-module.

---

## Error Messages

### GS301: Direct Self-Reference Cycle

```
Error GS301: Direct cycle detected in ownership graph
  class Node {
    next: share<Node>;
    ^^^^^^^^^^^^^^^^^^^^^ share<Node> creates cycle: Node → Node
  }

In ownership mode, share<T> references must form a DAG (no cycles).
Use 'use<Node>' for non-owning back-references, or refactor with the Pool Pattern.
```

### GS302: Mutual Cycle

```
Error GS302: Mutual cycle detected in ownership graph
  class A {
    b: share<B>;
       ^^^^^^^^^ creates edge: A → B
  }
  
  class B {
    a: share<A>;
       ^^^^^^^^^ creates edge: B → A
  }

Cycle: A → B → A

In ownership mode, share<T> references must form a DAG (no cycles).
Use 'use<T>' to break the cycle, or refactor with the Pool Pattern.
```

### GS303: Transitive Cycle

```
Error GS303: Transitive cycle detected in ownership graph
  Cycle: Document → Section → Paragraph → Document

  Document.sections: share<Section>[]
  Section.paragraphs: share<Paragraph>[]
  Paragraph.document: share<Document>

In ownership mode, share<T> references must form a DAG (no cycles).
Use 'use<Document>' for the back-reference, or refactor with the Pool Pattern.
```

### GS304: Invalid Assignment Derivation

```
Error GS304: Invalid ownership derivation in assignment
  const a: own<A> = b;  // b is own<B>
           ^^^^^^ cannot assign own<B> to own<A> (ownership would be aliased)

Valid derivations:
  - own<T> → use<T> only
  - share<T> → share<T> or use<T>
  - use<T> → use<T> only
```

### GS305: Invalid Argument Derivation

```
Error GS305: Invalid ownership derivation in function argument
  function process(x: share<X>): void { ... }
  
  const y: use<Y> = ...;
  process(y);
          ^ cannot pass use<Y> to share<X> (cannot upgrade borrowed reference to ownership)

Valid derivations:
  - own<T> → use<T> only
  - share<T> → share<T> or use<T>
  - use<T> → use<T> only
```

---

## Memory Mode Behavior

### GC Mode (Default)

```bash
gsc --target cpp src/main.gs
```

- **DAG violations**: Emit **warning** (not error)
- **Runtime behavior**: Garbage collector handles cycles automatically
- **Use case**: Rapid prototyping, TypeScript-like development

### Ownership Mode

```bash
gsc --target cpp --memory ownership src/main.gs
```

- **DAG violations**: Emit **error** (compilation fails)
- **Runtime behavior**: Smart pointers (`std::shared_ptr`) with deterministic destruction
- **Use case**: Performance-critical code, embedded systems, no GC overhead

**Recommendation**: Start with GC mode, optimize to ownership mode when needed.

---

## Best Practices

### 1. Use the Pool Pattern for Self-Referential Data Structures

**Anti-pattern**:
```typescript
class TreeNode {
  children: share<TreeNode>[];  // ERROR GS301: cycle TreeNode → TreeNode
}
```

**Pattern**:
```typescript
class Tree {
  nodes: own<TreeNode>[];  // Tree owns all nodes
}

class TreeNode {
  children: use<TreeNode>[];  // Non-owning references
  parent: use<TreeNode>;
}
```

### 2. Use `use<T>` for Back-References

**Anti-pattern**:
```typescript
class Parent {
  children: share<Child>[];
}

class Child {
  parent: share<Parent>;  // ERROR GS302: Parent → Child → Parent
}
```

**Pattern**:
```typescript
class Parent {
  children: share<Child>[];
}

class Child {
  parent: use<Parent>;  // Breaks cycle
}
```

### 3. Prefer `own<T>` for Composition

```typescript
class Document {
  title: string;
  sections: own<Section>[];  // Document uniquely owns sections
}

class Section {
  content: string;
}
```

### 4. Use `share<T>` Only When Necessary

- Multiple owners need to keep object alive
- Cross-module shared state
- Observer/listener patterns

**Example**:
```typescript
class EventEmitter {
  listeners: share<Listener>[];  // Multiple emitters can share listeners
}
```

---

## Testing Strategy

### Unit Tests for Ownership Analyzer

1. **Direct cycles**: `class A { a: share<A>; }`
2. **Mutual cycles**: `A → B → A`
3. **Transitive cycles**: `A → B → C → A`
4. **Container cycles**: `class A { arr: share<A>[]; }`
5. **Generic cycles**: `Container<Node>` self-reference
6. **Cross-module cycles**: Import-based cycles
7. **Valid DAGs**: Complex graphs without cycles
8. **Pool Pattern**: Tree/graph structures with `use<T>`

### Integration Tests

1. Multi-module projects with cross-file ownership
2. Generic instantiation with deeply nested types
3. Mixed `own<T>`, `share<T>`, `use<T>` patterns

---

## References

- **Tarjan's Algorithm**: Strongly connected components detection in $O(V + E)$
- **Rust Ownership**: Similar borrow checker, but runtime-flexible
- **C++ Smart Pointers**: `std::shared_ptr` cycle issues (weak_ptr solution)
- **Graph Theory**: DAG verification, topological sorting

---

Last Updated: December 8, 2025
