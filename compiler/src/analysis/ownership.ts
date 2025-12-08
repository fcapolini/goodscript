/**
 * Phase 2a: Ownership Analysis
 * 
 * Detects cycles in share<T> ownership graphs to enforce DAG requirement.
 * See docs/DAG-ANALYSIS.md for complete algorithm specification.
 */

import { IRModule, IRClassDecl, IRInterfaceDecl, IRType, Ownership } from '../ir/types.js';

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
    for (const decl of module.declarations) {
      if (decl.kind === 'class') {
        this.buildGraphForClass(decl as IRClassDecl, module.path);
      } else if (decl.kind === 'interface') {
        this.buildGraphForInterface(decl as IRInterfaceDecl, module.path);
      }
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
    if ((type.kind === 'class' || type.kind === 'interface') && type.ownership === Ownership.Share) {
      return true;
    }
    return false;
  }

  /**
   * Extract class/interface name from share<T> type
   */
  private extractClassName(type: IRType): string | null {
    if (type.kind === 'class' || type.kind === 'interface') {
      return type.name;
    }
    return null;
  }

  /**
   * Extract target class from container types (Rule 1.2)
   * Array<share<T>>, Map<K, share<V>>, Set<share<T>>
   */
  private extractContainerShareTarget(type: IRType): string | null {
    if (type.kind === 'array' && this.hasShareOwnership(type.element)) {
      return this.extractClassName(type.element);
    }

    if (type.kind === 'map' && this.hasShareOwnership(type.value)) {
      return this.extractClassName(type.value);
    }

    // Set<share<T>> would be similar
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
      if ((t.kind === 'class' || t.kind === 'interface') && t.ownership === Ownership.Share) {
        // Found a share<T>, check if T contains share<U>
        const className = t.name;
        const classNode = this.graph.get(className);
        if (classNode) {
          for (const edge of classNode.fields.values()) {
            targets.push(edge.targetClass);
          }
        }
      } else if (t.kind === 'array') {
        traverse(t.element);
      } else if (t.kind === 'map') {
        traverse(t.key);
        traverse(t.value);
      }
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
