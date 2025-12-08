/**
 * Phase 2a: Ownership Analysis
 * 
 * Detects cycles in share<T> ownership graphs to enforce DAG requirement.
 * See docs/DAG-ANALYSIS.md for complete algorithm specification.
 */

import { IRModule, IRClassDecl, IRInterfaceDecl, IRTypeAliasDecl, IRType, Ownership } from '../ir/types.js';

/** Node in the ownership graph */
interface OwnershipNode {
  className: string;
  fields: Map<string, OwnershipEdge>;
}

/** Edge in the ownership graph (field with share<T> ownership) */
interface OwnershipEdge {
  fieldName: string;
  targetClass: string;
  source: 'direct' | 'container' | 'generic' | 'cross-module';
}

/** Strongly Connected Component (cycle) */
interface SCC {
  nodes: string[];  // Class names in the cycle
}

/** Diagnostic error for ownership violations */
export interface OwnershipDiagnostic {
  code: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
}

/** Result of ownership analysis */
export interface OwnershipAnalysisResult {
  errors: OwnershipDiagnostic[];
  warnings: OwnershipDiagnostic[];
  graph: Map<string, OwnershipNode>;
  sccs: SCC[];
}

/**
 * Ownership Analyzer
 * 
 * Builds ownership graph and detects cycles using Tarjan's algorithm.
 */
export class OwnershipAnalyzer {
  private graph = new Map<string, OwnershipNode>();
  private typeAliases = new Map<string, IRType>();  // Type alias resolution cache
  private errors: OwnershipDiagnostic[] = [];
  private warnings: OwnershipDiagnostic[] = [];
  private memoryMode: 'gc' | 'ownership';

  // Tarjan's algorithm state
  private index = 0;
  private stack: string[] = [];
  private indices = new Map<string, number>();
  private lowlinks = new Map<string, number>();
  private onStack = new Set<string>();
  private sccs: SCC[] = [];
  
  // Recursion depth tracking (safety limit)
  private readonly MAX_RECURSION_DEPTH = 10000;
  private currentDepth = 0;

  constructor(memoryMode: 'gc' | 'ownership' = 'gc') {
    this.memoryMode = memoryMode;
  }

  /**
   * Analyze ownership semantics for all modules
   * 
   * In GC mode: Cycles produce warnings (informational)
   * In ownership mode: Cycles produce errors (DAG requirement enforced)
   */
  analyze(modules: IRModule[]): OwnershipAnalysisResult {
    // Step 1: Build ownership graph
    for (const module of modules) {
      this.buildGraphForModule(module);
    }

    // Step 2: Detect cycles using Tarjan's algorithm
    for (const className of this.graph.keys()) {
      if (!this.indices.has(className)) {
        this.strongConnect(className);
      }
    }

    // Step 3: Report cycles as errors or warnings
    this.reportCycles();

    return {
      errors: this.errors,
      warnings: this.warnings,
      graph: this.graph,
      sccs: this.sccs,
    };
  }

  /**
   * Build ownership graph for a single module
   */
  private buildGraphForModule(module: IRModule): void {
    // First pass: collect type aliases for resolution
    for (const decl of module.declarations) {
      if (decl.kind === 'typeAlias') {
        const aliasDecl = decl as IRTypeAliasDecl;
        this.typeAliases.set(aliasDecl.name, aliasDecl.type);
      }
    }

    // Second pass: build ownership graph
    for (const decl of module.declarations) {
      if (decl.kind === 'class') {
        this.buildGraphForClass(decl as IRClassDecl, module.path);
      } else if (decl.kind === 'interface') {
        this.buildGraphForInterface(decl as IRInterfaceDecl, module.path);
      }
      // Note: Struct types are anonymous (no declarations)
      // They are analyzed when encountered as field types
    }
  }

  /**
   * Build ownership graph node for a class (Rules 1.1-1.7)
   */
  private buildGraphForClass(classDecl: IRClassDecl, modulePath: string): void {
    this.buildGraphForType(classDecl.name, classDecl.fields, modulePath);
  }

  /**
   * Build ownership graph node for an interface (Rules 1.1-1.7)
   */
  private buildGraphForInterface(interfaceDecl: IRInterfaceDecl, _modulePath: string): void {
    this.buildGraphForType(interfaceDecl.name, interfaceDecl.properties, _modulePath);
  }

  /**
   * Build ownership graph node for a type (class or interface)
   */
  private buildGraphForType(
    typeName: string,
    fields: Array<{ name: string; type: IRType }>,
    _modulePath: string
  ): void {
    const node: OwnershipNode = {
      className: typeName,
      fields: new Map(),
    };

    for (const field of fields) {
      // Rule 1.1: Direct share<T> field
      if (this.hasShareOwnership(field.type)) {
        const targetClass = this.extractClassName(field.type);
        if (targetClass) {
          node.fields.set(field.name, {
            fieldName: field.name,
            targetClass,
            source: 'direct',
          });
        }
      }

      // Struct fields: recursively analyze for share<T>
      if (field.type.kind === 'struct') {
        this.analyzeStructFields(field.type.fields, node, field.name);
      }

      // Union types: check each variant for share<T>
      if (field.type.kind === 'union') {
        for (const [i, variant] of field.type.types.entries()) {
          if (this.hasShareOwnership(variant)) {
            const targetClass = this.extractClassName(variant);
            if (targetClass) {
              node.fields.set(`${field.name}|${i}`, {
                fieldName: field.name,
                targetClass,
                source: 'container',
              });
            }
          }
          // Also check if variant is an intersection type with share<T>
          if (variant.kind === 'intersection') {
            for (const [j, member] of variant.types.entries()) {
              if (this.hasShareOwnership(member)) {
                const targetClass = this.extractClassName(member);
                if (targetClass) {
                  node.fields.set(`${field.name}|${i}&${j}`, {
                    fieldName: field.name,
                    targetClass,
                    source: 'container',
                  });
                }
              }
            }
          }
        }
      }

      // Intersection types: check each member for share<T>
      if (field.type.kind === 'intersection') {
        for (const [i, member] of field.type.types.entries()) {
          if (this.hasShareOwnership(member)) {
            const targetClass = this.extractClassName(member);
            if (targetClass) {
              node.fields.set(`${field.name}&${i}`, {
                fieldName: field.name,
                targetClass,
                source: 'container',
              });
            }
          }
          // Also check if member is a union type with share<T>
          if (member.kind === 'union') {
            for (const [j, variant] of member.types.entries()) {
              if (this.hasShareOwnership(variant)) {
                const targetClass = this.extractClassName(variant);
                if (targetClass) {
                  node.fields.set(`${field.name}&${i}|${j}`, {
                    fieldName: field.name,
                    targetClass,
                    source: 'container',
                  });
                }
              }
            }
          }
        }
      }

      // Rule 1.2: Container with share<T> elements
      const containerTarget = this.extractContainerShareTarget(field.type);
      if (containerTarget) {
        node.fields.set(field.name, {
          fieldName: field.name,
          targetClass: containerTarget,
          source: 'container',
        });
      }

      // Rule 1.3: Deep ownership (share<T> inside share<U>)
      const deepTargets = this.extractDeepShareTargets(field.type);
      for (const [i, target] of deepTargets.entries()) {
        node.fields.set(`${field.name}[${i}]`, {
          fieldName: field.name,
          targetClass: target,
          source: 'container',
        });
      }

      // Rule 1.4: Generic type parameters
      const genericTargets = this.extractGenericShareTargets(field.type);
      for (const [i, target] of genericTargets.entries()) {
        node.fields.set(`${field.name}<${i}>`, {
          fieldName: field.name,
          targetClass: target,
          source: 'generic',
        });
      }
    }

    this.graph.set(typeName, node);
  }

  /**
   * Analyze struct fields recursively for share<T> references
   */
  private analyzeStructFields(
    structFields: Array<{ name: string; type: IRType }>,
    parentNode: OwnershipNode,
    fieldPrefix: string
  ): void {
    for (const structField of structFields) {
      const fullFieldName = `${fieldPrefix}.${structField.name}`;
      
      // Direct share<T> in struct field
      if (this.hasShareOwnership(structField.type)) {
        const targetClass = this.extractClassName(structField.type);
        if (targetClass) {
          parentNode.fields.set(fullFieldName, {
            fieldName: fullFieldName,
            targetClass,
            source: 'direct',
          });
        }
      }

      // Nested struct
      if (structField.type.kind === 'struct') {
        this.analyzeStructFields(structField.type.fields, parentNode, fullFieldName);
      }

      // Container with share<T> in struct field
      const containerTarget = this.extractContainerShareTarget(structField.type);
      if (containerTarget) {
        parentNode.fields.set(fullFieldName, {
          fieldName: fullFieldName,
          targetClass: containerTarget,
          source: 'container',
        });
      }

      // Deep share<T> in struct field
      const deepTargets = this.extractDeepShareTargets(structField.type);
      for (const [i, target] of deepTargets.entries()) {
        parentNode.fields.set(`${fullFieldName}[${i}]`, {
          fieldName: fullFieldName,
          targetClass: target,
          source: 'container',
        });
      }
      
      // Note: As new collection types are added (Set, Tuple, etc.),
      // they will be automatically handled by extractContainerShareTarget
      // and extractDeepShareTargets
    }
  }

  /**
   * Tarjan's strongly connected components algorithm
   * Time complexity: O(V + E)
   * 
   * Protected against infinite recursion:
   * - Each node visited exactly once (indices map prevents re-visiting)
   * - Maximum depth = O(V) for graph with V nodes
   * - Explicit depth limit as safety net
   */
  private strongConnect(className: string): void {
    // Safety: Check recursion depth
    this.currentDepth++;
    if (this.currentDepth > this.MAX_RECURSION_DEPTH) {
      throw new Error(
        `Ownership analysis exceeded maximum recursion depth (${this.MAX_RECURSION_DEPTH}). ` +
        `This likely indicates an extremely deep class hierarchy or a compiler bug.`
      );
    }
    
    // Set the depth index for this node
    this.indices.set(className, this.index);
    this.lowlinks.set(className, this.index);
    this.index++;
    this.stack.push(className);
    this.onStack.add(className);

    // Consider successors of className
    const node = this.graph.get(className);
    if (node) {
      for (const edge of node.fields.values()) {
        const successor = edge.targetClass;

        if (!this.indices.has(successor)) {
          // Successor has not yet been visited; recurse on it
          this.strongConnect(successor);
          this.currentDepth--;  // Decrement on return from recursion
          
          const successorLowlink = this.lowlinks.get(successor)!;
          const currentLowlink = this.lowlinks.get(className)!;
          this.lowlinks.set(className, Math.min(currentLowlink, successorLowlink));
        } else if (this.onStack.has(successor)) {
          // Successor is in stack and hence in the current SCC
          const successorIndex = this.indices.get(successor)!;
          const currentLowlink = this.lowlinks.get(className)!;
          this.lowlinks.set(className, Math.min(currentLowlink, successorIndex));
        }
      }
    }

    // If className is a root node, pop the stack and create an SCC
    if (this.lowlinks.get(className) === this.indices.get(className)) {
      const scc: SCC = { nodes: [] };
      let w: string;
      do {
        w = this.stack.pop()!;
        this.onStack.delete(w);
        scc.nodes.push(w);
      } while (w !== className);

      // Only record non-trivial SCCs (cycles)
      if (scc.nodes.length > 1 || this.hasSelfLoop(className)) {
        this.sccs.push(scc);
      }
    }
    
    // Decrement depth as we return
    this.currentDepth--;
  }

  /**
   * Check if a class has a self-loop (share<T> field pointing to itself)
   */
  private hasSelfLoop(className: string): boolean {
    const node = this.graph.get(className);
    if (!node) return false;

    for (const edge of node.fields.values()) {
      if (edge.targetClass === className) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Get the current recursion depth (for testing/diagnostics)
   */
  getMaxDepthReached(): number {
    return this.indices.size; // Each visited node adds 1 to theoretical max depth
  }

  /**
   * Report detected cycles as errors (ownership mode) or warnings (GC mode)
   */
  private reportCycles(): void {
    for (const scc of this.sccs) {
      if (scc.nodes.length === 1) {
        // Self-loop
        const className = scc.nodes[0];
        const node = this.graph.get(className)!;
        const selfEdge = Array.from(node.fields.values()).find(
          (e) => e.targetClass === className
        );

        if (selfEdge) {
          const diagnostic: OwnershipDiagnostic = {
            code: 'GS301',
            message: `Self-referencing share<T> detected: class '${className}' has field '${selfEdge.fieldName}' of type 'share<${className}>'. This creates a cycle.`,
          };

          if (this.memoryMode === 'ownership') {
            this.errors.push(diagnostic);
          } else {
            this.warnings.push(diagnostic);
          }
        }
      } else {
        // Multi-node cycle
        const cycle = this.findCycleEdges(scc.nodes);
        const cycleDescription = cycle
          .map((e) => `${e.from}.${e.fieldName}`)
          .join(' → ');

        const diagnostic: OwnershipDiagnostic = {
          code: 'GS302',
          message: `Cyclic share<T> ownership detected: ${cycleDescription}. DAG requirement violated.`,
        };

        if (this.memoryMode === 'ownership') {
          this.errors.push(diagnostic);
        } else {
          this.warnings.push(diagnostic);
        }
      }
    }
  }

  /**
   * Find the edges that form the cycle in an SCC
   */
  private findCycleEdges(nodes: string[]): Array<{
    from: string;
    fieldName: string;
    to: string;
  }> {
    const edges: Array<{ from: string; fieldName: string; to: string }> = [];
    const nodeSet = new Set(nodes);

    for (const nodeName of nodes) {
      const node = this.graph.get(nodeName)!;
      for (const edge of node.fields.values()) {
        if (nodeSet.has(edge.targetClass)) {
          edges.push({
            from: nodeName,
            fieldName: edge.fieldName,
            to: edge.targetClass,
          });
        }
      }
    }

    return edges;
  }

  /**
   * Check if a type has share<T> ownership
   */
  private hasShareOwnership(type: IRType): boolean {
    // Resolve type aliases first
    const resolvedType = this.resolveTypeAlias(type);
    
    if ((resolvedType.kind === 'class' || resolvedType.kind === 'interface' || resolvedType.kind === 'struct') && resolvedType.ownership === Ownership.Share) {
      return true;
    }
    return false;
  }

  /**
   * Extract class/interface name from share<T> type
   */
  private extractClassName(type: IRType): string | null {
    // Resolve type aliases first
    const resolvedType = this.resolveTypeAlias(type);
    
    if (resolvedType.kind === 'class' || resolvedType.kind === 'interface') {
      return resolvedType.name;
    }
    if (resolvedType.kind === 'struct') {
      // Structs are anonymous, generate a stable name from structure
      // Use sorted field names for deterministic naming
      const fieldSig = resolvedType.fields
        .map(f => f.name)
        .sort()
        .join('_');
      return `__struct_${fieldSig}`;
    }
    return null;
  }

  /**
   * Extract target class from container types (Rule 1.2)
   * Handles all collection types:
   * - Array<share<T>> → T
   * - Map<K, share<V>> → V
   * - Set<share<T>> → T (future)
   * - Tuple<share<T>, ...> → T (future)
   * 
   * Also handles collections of structs:
   * - Array<struct { field: share<T> }> → T
   * - Map<K, struct { field: share<T> }> → T
   */
  private extractContainerShareTarget(type: IRType): string | null {
    // Array<share<T>> or Array<struct>
    if (type.kind === 'array') {
      if (this.hasShareOwnership(type.element)) {
        return this.extractClassName(type.element);
      }
      if (type.element.kind === 'struct') {
        return this.extractStructShareTarget(type.element);
      }
    }

    // Map<K, share<V>> or Map<K, struct>
    if (type.kind === 'map') {
      // Check map value for share<T>
      if (this.hasShareOwnership(type.value)) {
        return this.extractClassName(type.value);
      }
      if (type.value.kind === 'struct') {
        return this.extractStructShareTarget(type.value);
      }
      
      // Also check map key (rare but possible: Map<share<K>, V>)
      if (this.hasShareOwnership(type.key)) {
        return this.extractClassName(type.key);
      }
      if (type.key.kind === 'struct') {
        return this.extractStructShareTarget(type.key);
      }
    }

    // Future collection types would be added here:
    // - Set<share<T>> → type.kind === 'set'
    // - Tuple<share<T>, U, V> → type.kind === 'tuple'
    // - Queue<share<T>>, Stack<share<T>>, etc.
    
    return null;
  }

  /**
   * Extract share<T> target from struct (if any field has share<T>)
   */
  private extractStructShareTarget(structType: IRType): string | null {
    if (structType.kind !== 'struct') return null;
    
    for (const field of structType.fields) {
      if (this.hasShareOwnership(field.type)) {
        return this.extractClassName(field.type);
      }
      // Recursively check nested structs
      if (field.type.kind === 'struct') {
        const target = this.extractStructShareTarget(field.type);
        if (target) return target;
      }
      // Check containers in struct fields
      const containerTarget = this.extractContainerShareTarget(field.type);
      if (containerTarget) return containerTarget;
    }
    
    return null;
  }

  /**
   * Extract deep share<T> targets (Rule 1.3)
   * share<T> inside share<U>
   */
  private extractDeepShareTargets(type: IRType): string[] {
    const targets: string[] = [];

    // Recursively traverse type structure
    const traverse = (t: IRType): void => {
      if ((t.kind === 'class' || t.kind === 'interface' || t.kind === 'struct') && t.ownership === Ownership.Share) {
        // Found a share<T>, check if T contains share<U>
        const className = this.extractClassName(t);
        if (className) {
          const classNode = this.graph.get(className);
          if (classNode) {
            for (const edge of classNode.fields.values()) {
              targets.push(edge.targetClass);
            }
          } else if (t.kind === 'struct') {
            // Inline struct - analyze its fields directly
            for (const field of t.fields) {
              if (this.hasShareOwnership(field.type)) {
                const targetClass = this.extractClassName(field.type);
                if (targetClass) {
                  targets.push(targetClass);
                }
              }
            }
          }
        }
      } else if (t.kind === 'array') {
        traverse(t.element);
      } else if (t.kind === 'map') {
        traverse(t.key);
        traverse(t.value);
      } else if (t.kind === 'union') {
        // Traverse all union variants
        for (const variant of t.types) {
          traverse(variant);
        }
      } else if (t.kind === 'nullable') {
        // Traverse inner type
        traverse(t.inner);
      } else if (t.kind === 'struct') {
        // Traverse struct fields
        for (const field of t.fields) {
          traverse(field.type);
        }
      } else if (t.kind === 'intersection') {
        // Traverse all intersection members
        for (const member of t.types) {
          traverse(member);
        }
      } else if (t.kind === 'typeAlias') {
        // Resolve and traverse aliased type
        traverse(t.aliasedType);
      }
      // Future: Add handling for Set, Tuple, and other collection types
    };

    traverse(type);
    return targets;
  }

  /**
   * Extract share<T> from generic type parameters (Rule 1.4)
   */
  private extractGenericShareTargets(_type: IRType): string[] {
    const targets: string[] = [];

    // Check if type is a generic with share<T> arguments
    // This would require generic type information in IRType
    // For now, return empty array (to be implemented when generics are added)

    return targets;
  }

  /**
   * Resolve type alias to its underlying type
   * Returns the original type if not a type alias
   */
  private resolveTypeAlias(type: IRType): IRType {
    // Handle typeAlias kind (when used as a type reference)
    if (type.kind === 'typeAlias') {
      return this.resolveTypeAlias(type.aliasedType);
    }

    // Handle named type aliases (class/interface that might be aliases)
    if ((type.kind === 'class' || type.kind === 'interface') && this.typeAliases.has(type.name)) {
      return this.resolveTypeAlias(this.typeAliases.get(type.name)!);
    }

    return type;
  }
}

/**
 * Analyze ownership for a program
 */
export function analyzeOwnership(
  modules: IRModule[],
  memoryMode: 'gc' | 'ownership' = 'gc'
): OwnershipAnalysisResult {
  const analyzer = new OwnershipAnalyzer(memoryMode);
  return analyzer.analyze(modules);
}
