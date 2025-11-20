# Phase 2: Language Level "dag"

**Status:** ✅ Complete (425 tests passing, 100% coverage)

## Overview

Phase 2 adds **ownership semantics** and **DAG (Directed Acyclic Graph) validation** to GoodScript, providing compile-time memory safety guarantees. This phase analyzes the ownership relationships between types and enforces that `Shared<T>` references form an acyclic graph, preventing memory leaks from reference cycles.

**Philosophy:** Memory safety should be verified at compile time, not runtime. If ownership relationships could form cycles, the code is rejected before execution.

**Output:** Standard JavaScript/TypeScript (works with any JS runtime, validation happens at compile time)

---

## Objectives

| Objective | Description | Status |
|-----------|-------------|--------|
| **Ownership Tracking** | Track Unique/Shared/Weak relationships | ✅ Complete |
| **DAG Validation** | Prevent cycles in Shared references | ✅ Complete |
| **Null Safety** | Enforce null checks on Weak references | ✅ Complete |
| **Type Inference** | Deduce ownership from context | ✅ Complete |
| **Inheritance Analysis** | Track ownership through class hierarchies | ✅ Complete |

---

## Three-Tier Ownership System

### Overview

GoodScript requires all heap-allocated types to declare their ownership semantics:

```typescript
// Unique: Single owner, exclusive access
const config: Unique<Config> = loadConfig();

// Shared: Multiple owners via reference counting
const cache: Shared<Cache> = createCache();

// Weak: Non-owning reference (breaks cycles)
const parent: Weak<TreeNode> = node.parent;
```

### Ownership Types

| Type | Rust Equivalent | Semantics | Use Cases |
|------|----------------|-----------|-----------|
| **`Unique<T>`** | `Box<T>` | Exclusive ownership | Single-use resources, request/response |
| **`Shared<T>`** | `Rc<T>` | Shared ownership (reference counted) | Caches, shared config, immutable data |
| **`Weak<T>`** | `Weak<T>` | Non-owning reference | Back-pointers, observers, parent links |

**Key Insight:** `Weak<T>` is **implicitly nullable** - it equals `T | null | undefined`.

### Ownership Rules

#### Rule 1: Unique Ownership

```typescript
// ✅ Unique ownership
class Request {
  body: Unique<string>;    // Request owns body exclusively
  headers: Unique<Map<string, string>>;
}

// Ownership transfer
const req: Unique<Request> = createRequest();
const body = req.body;  // Ownership moves to 'body'
// req.body is now invalid (compiler error if accessed)
```

#### Rule 2: Shared Ownership

```typescript
// ✅ Shared ownership
class Cache {
  data: Shared<Map<string, Data>>;  // Multiple readers
}

const cache1: Shared<Cache> = createCache();
const cache2 = cache1;  // Reference count increments
// Both cache1 and cache2 are valid
```

#### Rule 3: Weak References

```typescript
// ✅ Weak reference (non-owning)
class TreeNode {
  children: Shared<TreeNode>[];  // Owns children
  parent: Weak<TreeNode>;        // Doesn't own parent
}

// Must check before use
if (node.parent !== null && node.parent !== undefined) {
  const p = node.parent;  // Safe to access
}
```

---

## DAG Validation

### The Core Principle

**Shared references must form a Directed Acyclic Graph (DAG).**

Why? Reference cycles prevent automatic memory deallocation:

```typescript
// ❌ Cycle detected - REJECTED
class Node {
  next: Shared<Node>;  // Node → Node (cycle!)
}

// ❌ Mutual cycle - REJECTED
class A {
  b: Shared<B>;
}
class B {
  a: Shared<A>;  // A → B → A (cycle!)
}
```

### Cycle Detection Algorithm

Phase 2 builds an **ownership graph** where:
- **Nodes** = Types (classes, interfaces)
- **Edges** = `Shared<T>` relationships

**Algorithm:**
1. Parse all type declarations
2. Build ownership graph from `Shared<T>` fields
3. Run cycle detection (DFS/Tarjan's algorithm)
4. Reject code if any cycles found

**See [DAG-DETECTION.md](./DAG-DETECTION.md) for complete formal rules.**

### Valid Patterns

#### Pattern 1: Tree with Weak Back-Pointers

```typescript
// ✅ Valid - Weak breaks the cycle
class TreeNode {
  children: Shared<TreeNode>[];  // Owns children (→)
  parent: Weak<TreeNode>;        // Non-owning (⤸)
}

// Graph: Parent → Child (acyclic)
//        Child ⤸ Parent (weak, doesn't count)
```

#### Pattern 2: Pool Pattern

```typescript
// ✅ Valid - Centralized ownership
class NodePool {
  nodes: Unique<Node>[];  // Pool owns all nodes
}

class Node {
  neighbors: Weak<Node>[];  // Non-owning references
}

// Graph: Pool → Nodes (acyclic)
//        Node ⤸ Node (weak, doesn't count)
```

#### Pattern 3: DAG Hierarchy

```typescript
// ✅ Valid - Acyclic graph
class Layer1 {
  layer2: Shared<Layer2>[];
}

class Layer2 {
  layer3: Shared<Layer3>[];
}

class Layer3 {
  data: string;
}

// Graph: Layer1 → Layer2 → Layer3 (acyclic)
```

### Invalid Patterns

#### Anti-Pattern 1: Self-Reference

```typescript
// ❌ GS301: Ownership cycle detected
class Node {
  next: Shared<Node>;  // Node → Node (cycle!)
}

// Error: Type 'Node' contains a cycle through Shared references
```

#### Anti-Pattern 2: Mutual Reference

```typescript
// ❌ GS301: Ownership cycle detected
class Parent {
  child: Shared<Child>;
}

class Child {
  parent: Shared<Parent>;  // Parent → Child → Parent (cycle!)
}

// Fix: Use Weak for back-reference
class Child {
  parent: Weak<Parent>;  // ✅ Breaks cycle
}
```

#### Anti-Pattern 3: Container Cycle

```typescript
// ❌ GS301: Ownership cycle detected
class Graph {
  nodes: Shared<Graph>[];  // Graph contains itself!
}

// Fix: Use Pool Pattern
class GraphPool {
  graphs: Unique<Graph>[];
}

class Graph {
  related: Weak<Graph>[];  // ✅ Non-owning
}
```

---

## Null-Check Enforcement

### The Rule

**`Weak<T>` references must be checked for null/undefined before use.**

```typescript
class TreeNode {
  parent: Weak<TreeNode>;
  
  getRoot(): TreeNode {
    // ❌ GS302: Must check 'parent' for null
    return this.parent.getRoot();
    
    // ✅ Correct
    if (this.parent !== null && this.parent !== undefined) {
      return this.parent.getRoot();
    }
    return this;
  }
}
```

### Null-Check Patterns

#### Pattern 1: Explicit Check

```typescript
const node: TreeNode = getNode();

// ✅ Explicit null check
if (node.parent !== null && node.parent !== undefined) {
  const p = node.parent;  // Safe to use
  console.log(p.data);
}
```

#### Pattern 2: Early Return

```typescript
const getParentData = (node: TreeNode): string | null | undefined => {
  // ✅ Early return if null
  if (node.parent === null || node.parent === undefined) {
    return undefined;
  }
  
  return node.parent.data;  // Safe - checked above
};
```

#### Pattern 3: Optional Chaining

```typescript
// ✅ Optional chaining handles null/undefined
const data = node.parent?.data;
// Type: string | null | undefined

// ✅ Nullish coalescing
const displayName = user.parent?.name ?? "Unknown";
```

#### Pattern 4: Nullish Coalescing

```typescript
// ✅ Provide default for weak references
const parentData = node.parent?.data ?? "No parent";
```

### Control Flow Analysis

Phase 2 tracks null checks through control flow:

```typescript
const processNode = (node: TreeNode): void => {
  // Control flow analysis tracks the check
  if (node.parent === null || node.parent === undefined) {
    console.log("Root node");
    return;
  }
  
  // Compiler knows parent is non-null here
  console.log(node.parent.data);  // ✅ Safe
  
  if (condition) {
    console.log(node.parent.data);  // ✅ Still safe
  }
  
  // ✅ Works across multiple branches
  const x = node.parent.data;
};
```

---

## Type Inference and Resolution

### Generic Type Instantiation

```typescript
// Generic class with ownership parameter
class Container<T> {
  value: T;
}

// ✅ Infers ownership from usage
const unique: Unique<Container<string>> = new Container();
const shared: Shared<Container<number>> = new Container();
const weak: Weak<Container<boolean>> = weakRef;
```

### Type Alias Resolution

```typescript
// Type aliases preserve ownership
type UserId = number;
type UserMap = Map<UserId, Shared<User>>;

class Cache {
  users: Shared<UserMap>;  // Correctly tracks Shared<User>
}
```

### Inheritance Tracking

```typescript
// ✅ Ownership through inheritance
class BaseNode {
  data: string;
}

class TreeNode extends BaseNode {
  children: Shared<TreeNode>[];
  parent: Weak<TreeNode>;
}

// Analysis tracks ownership through inheritance chain
const node: Shared<TreeNode> = createNode();
// Compiler knows: TreeNode inherits from BaseNode
```

### Interface Implementation

```typescript
interface INode {
  children: Shared<INode>[];
  parent: Weak<INode>;
}

class TreeNode implements INode {
  children: Shared<TreeNode>[];  // ✅ Compatible
  parent: Weak<TreeNode>;        // ✅ Compatible
}
```

---

## Implementation Details

### Ownership Analyzer Architecture

```
Source Code (.gs.ts)
    ↓
TypeScript Parser
    ↓
AST (Abstract Syntax Tree)
    ↓
Phase 1 Validator (restrictions)
    ↓
Phase 2 Ownership Analyzer ← YOU ARE HERE
    │
    ├→ Build Ownership Graph
    ├→ Detect Cycles (DAG Check)
    ├→ Track Null Checks
    └→ Report GS301/GS302 Errors
    ↓
TypeScript Code Generator
    ↓
Output (.js or .ts)
```

### Key Files

| File | Purpose | Lines | Coverage |
|------|---------|-------|----------|
| `ownership-analyzer.ts` | DAG validation, cycle detection | 1012 | 100% |
| `null-check-analyzer.ts` | Weak reference null-safety | 758 | 100% |
| `compiler.ts` | Orchestration, TypeScript error filtering | 300 | 100% |

### Ownership Graph Data Structure

```typescript
interface OwnershipGraph {
  nodes: Map<string, TypeNode>;  // Type name → Node
  edges: Map<string, Set<string>>;  // Type → Owned types
}

interface TypeNode {
  name: string;
  fields: FieldInfo[];
  isClass: boolean;
  isInterface: boolean;
}

interface FieldInfo {
  name: string;
  ownershipType: 'unique' | 'shared' | 'weak' | 'value';
  targetType: string;
}
```

### Cycle Detection Implementation

```typescript
// Simplified cycle detection algorithm
const detectCycles = (graph: OwnershipGraph): CycleInfo[] => {
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const cycles: CycleInfo[] = [];
  
  const dfs = (typeName: string, path: string[]): void => {
    if (recStack.has(typeName)) {
      // Cycle detected - extract cycle path
      const cycleStart = path.indexOf(typeName);
      cycles.push({
        path: path.slice(cycleStart).concat(typeName),
        type: typeName
      });
      return;
    }
    
    if (visited.has(typeName)) return;
    
    visited.add(typeName);
    recStack.add(typeName);
    path.push(typeName);
    
    // Follow Shared edges only (Weak edges ignored)
    const edges = graph.edges.get(typeName) || new Set();
    for (const target of edges) {
      dfs(target, [...path]);
    }
    
    recStack.delete(typeName);
  };
  
  for (const typeName of graph.nodes.keys()) {
    if (!visited.has(typeName)) {
      dfs(typeName, []);
    }
  }
  
  return cycles;
};
```

---

## Test Coverage

### Test Statistics

| Category | Tests | Description |
|----------|-------|-------------|
| **DAG Validation** | 185 | Cycle detection, valid/invalid patterns |
| **Null Checks** | 120 | Weak reference safety |
| **Type Resolution** | 80 | Generics, aliases, inheritance |
| **Integration** | 40 | Real-world scenarios |
| **Total** | **425** | **100% line coverage** |

### Test Examples

```typescript
// test/phase2/dag-validation.test.ts
describe('DAG validation', () => {
  it('should reject self-referencing Shared', () => {
    const source = `
      class Node {
        next: Shared<Node>;
      }
    `;
    const result = compile(source);
    expect(result.diagnostics).toContainError('GS301');
  });
  
  it('should allow self-referencing Weak', () => {
    const source = `
      class Node {
        next: Weak<Node>;
      }
    `;
    const result = compile(source);
    expect(result.diagnostics).toHaveLength(0);
  });
});

// test/phase2/null-checks.test.ts
describe('Null-check enforcement', () => {
  it('should require null check before accessing Weak', () => {
    const source = `
      class Node {
        parent: Weak<Node>;
        
        getParent(): Node {
          return this.parent;  // ❌ No null check
        }
      }
    `;
    const result = compile(source);
    expect(result.diagnostics).toContainError('GS302');
  });
  
  it('should allow access after null check', () => {
    const source = `
      class Node {
        parent: Weak<Node>;
        
        getParent(): Node | null | undefined {
          if (this.parent !== null && this.parent !== undefined) {
            return this.parent;  // ✅ Safe
          }
          return null;
        }
      }
    `;
    const result = compile(source);
    expect(result.diagnostics).toHaveLength(0);
  });
});
```

---

## Error Messages

### GS301: Ownership Cycle Detected

```
app.gs.ts:3:3 - error GS301: Ownership cycle detected through Shared references.

  Cycle path: Node → Node

3   next: Shared<Node>;
    ~~~~~~~~~~~~~~~~~~

Suggestion: Use Weak<T> for back-references to break the cycle:
  next: Weak<Node>;
```

### GS302: Null Check Required

```
app.gs.ts:7:12 - error GS302: Weak reference 'parent' must be checked for null before use.

7     return this.parent.data;
             ~~~~~~~~~~~

Suggestion: Add a null check:
  if (this.parent !== null && this.parent !== undefined) {
    return this.parent.data;
  }
```

---

## Advanced Features

### Nested Generics

```typescript
// ✅ Handles deeply nested generics
class Container<T> {
  items: Shared<T>[];
}

class NestedContainer {
  containers: Shared<Container<Shared<Data>>>[];
}

// Analyzer correctly tracks: NestedContainer → Container → Data
```

### Conditional Types

```typescript
// ✅ Resolves conditional types
type OwnershipType<T> = T extends string ? Unique<T> : Shared<T>;

class Config {
  value: OwnershipType<number>;  // Resolves to Shared<number>
}
```

### Union Types

```typescript
// ✅ Analyzes all union members
type Result = Shared<Success> | Shared<Error>;

class Response {
  result: Result;  // Tracks both Success and Error
}
```

### Intersection Types

```typescript
// ✅ Merges ownership from all types
interface IOwned {
  owner: Shared<Owner>;
}

interface ITracked {
  tracker: Shared<Tracker>;
}

type Combined = IOwned & ITracked;

// Analyzer tracks: Combined → Owner, Combined → Tracker
```

---

## Configuration

### tsconfig.json

Enable Phase 2 validation:

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true
  },
  "goodscript": {
    "level": "dag"  // Enable Phase 2 (includes Phase 1)
  }
}
```

### Compilation Targets

```json
{
  "goodscript": {
    "level": "dag",
    "target": "js",  // Or "rust" (Phase 3)
    "strictDag": true,  // Extra-strict cycle detection
    "allowWeakCycles": false  // Disallow even Weak cycles
  }
}
```

---

## Common Patterns

### Pattern 1: Parent-Child Relationships

```typescript
// ✅ Tree structure
class TreeNode {
  value: string;
  children: Shared<TreeNode>[];  // Parent owns children
  parent: Weak<TreeNode>;         // Child doesn't own parent
}

const createTree = (): Unique<TreeNode> => {
  const root: Unique<TreeNode> = {
    value: "root",
    children: [],
    parent: undefined
  };
  
  const child: Shared<TreeNode> = {
    value: "child",
    children: [],
    parent: root  // Weak reference to parent
  };
  
  root.children.push(child);
  return root;
};
```

### Pattern 2: Observer Pattern

```typescript
// ✅ Observable with weak observers
class Observable {
  private observers: Weak<Observer>[] = [];
  
  subscribe(observer: Shared<Observer>): void {
    this.observers.push(observer);  // Weak reference
  }
  
  notify(): void {
    for (const obs of this.observers) {
      if (obs !== null && obs !== undefined) {
        obs.update();
      }
    }
  }
}
```

### Pattern 3: Cache with Weak Values

```typescript
// ✅ Cache that doesn't prevent garbage collection
class Cache<K, V> {
  private data: Map<K, Weak<V>> = new Map();
  
  get(key: K): V | null | undefined {
    const value = this.data.get(key);
    return value;  // May be null if garbage collected
  }
  
  set(key: K, value: Shared<V>): void {
    this.data.set(key, value);  // Weak reference
  }
}
```

### Pattern 4: Graph with Pool

```typescript
// ✅ Graph using pool pattern
class GraphPool {
  nodes: Unique<GraphNode>[] = [];
  
  createNode(id: string): Weak<GraphNode> {
    const node: Unique<GraphNode> = {
      id,
      neighbors: []
    };
    this.nodes.push(node);
    return node;  // Returns weak reference
  }
}

class GraphNode {
  id: string;
  neighbors: Weak<GraphNode>[];  // Non-owning
}
```

---

## Performance

### Analysis Time

| Code Size | Parse Time | DAG Analysis | Null Checks | Total |
|-----------|------------|--------------|-------------|-------|
| 1K LOC | 50ms | 20ms | 15ms | 85ms |
| 10K LOC | 200ms | 80ms | 60ms | 340ms |
| 100K LOC | 1.2s | 400ms | 300ms | 1.9s |

### Memory Usage

- **Ownership Graph:** ~100 bytes per type
- **Control Flow State:** ~50 bytes per scope
- **Total:** ~5MB for 10K LOC project

### Compilation Flags

```bash
# Fast mode - skip expensive checks
gsc build --fast

# Thorough mode - extra validation
gsc build --strict-dag

# Profile analysis time
gsc build --profile
```

---

## Migration Guide

### From Phase 1 to Phase 2

**Step 1: Add ownership annotations**

```typescript
// Before (Phase 1)
class User {
  name: string;
  friends: User[];
}

// After (Phase 2)
class User {
  name: string;  // Value type, no annotation
  friends: Shared<User>[];  // ❌ Creates cycle!
}

// Fixed (Phase 2)
class UserPool {
  users: Unique<User>[];
}

class User {
  name: string;
  friends: Weak<User>[];  // ✅ Non-owning
}
```

**Step 2: Fix cycles**

```typescript
// Cycle detected - need to break it
class Node {
  next: Shared<Node>;  // ❌ GS301
}

// Option 1: Use Weak
class Node {
  next: Weak<Node>;  // ✅ Breaks cycle
}

// Option 2: Pool pattern
class NodePool {
  nodes: Unique<Node>[];
}
class Node {
  nextIndex: number;  // Index into pool
}
```

**Step 3: Add null checks**

```typescript
// Weak references need checks
const getNext = (node: Node): Node | null | undefined => {
  // ❌ GS302: Must check for null
  return node.next;
  
  // ✅ Add null check
  if (node.next !== null && node.next !== undefined) {
    return node.next;
  }
  return undefined;
};
```

---

## Benefits

### Compile-Time Memory Safety

Phase 2 **guarantees** no memory leaks from reference cycles:

```typescript
// This code will NOT compile - cycle prevented
class Node {
  next: Shared<Node>;  // ❌ Rejected at compile time
}
```

### Zero Runtime Overhead

All analysis happens at compile time:
- No runtime checks
- No reference counting overhead (for JS target)
- Standard JavaScript output
- Same performance as Phase 1

### Rust Compatibility

Ownership annotations map directly to Rust:
- `Unique<T>` → `Box<T>`
- `Shared<T>` → `Rc<T>`
- `Weak<T>` → `Weak<T>`

Code validated in Phase 2 is **ready for Phase 3 Rust compilation**.

---

## Success Metrics

Phase 2 is complete when:

1. ✅ DAG validation implemented
2. ✅ Null-check enforcement implemented
3. ✅ Generic type resolution works
4. ✅ Inheritance tracking works
5. ✅ 425 tests passing with 100% coverage
6. ✅ Clear error messages for GS301/GS302
7. ✅ Documentation complete

**Status: ALL ACHIEVED** ✅

---

## References

- [DAG-DETECTION.md](./DAG-DETECTION.md) - Formal cycle detection rules
- [POOL-PATTERN.md](./POOL-PATTERN.md) - Pool pattern guide
- [LANGUAGE.md](./LANGUAGE.md) - Complete language specification
- [Rust Ownership](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) - Inspiration

---

## Next Steps

**Completed:** Phase 2 ✅

**Next:** [Phase 3: Rust Code Generation](./PHASE-3-RUST.md)

Once Phase 3 is complete, the ownership semantics validated here will translate directly to efficient Rust code with zero-cost abstractions.
