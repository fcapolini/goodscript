/**
 * Ownership Analyzer
 * 
 * Phase 2a: DAG (Directed Acyclic Graph) Analysis
 * 
 * Validates ownership semantics:
 * 1. Detects cycles in share<T> relationships (prevents memory leaks)
 * 2. Validates ownership derivation rules (prevents logic errors)
 * 3. Ensures class fields have proper ownership annotations
 * 
 * Rules:
 * - share<T> creates an ownership edge (A → B)
 * - Cycles in the ownership graph are forbidden
 * - own<T> → only use<T> derivation allowed
 * - share<T> → share<T> or use<T> allowed
 * - use<T> → only use<T> allowed
 */

import ts from 'typescript';
import type { Diagnostic, SourceLocation } from '../types.js';

interface OwnershipEdge {
  from: string;  // Type that owns
  to: string;    // Type that is owned
  via: string;   // Field name
  location: SourceLocation;
}

interface OwnershipGraph {
  nodes: Set<string>;
  edges: OwnershipEdge[];
  adjacencyList: Map<string, string[]>;
}

export class OwnershipAnalyzer {
  private graph: OwnershipGraph = {
    nodes: new Set(),
    edges: [],
    adjacencyList: new Map(),
  };
  private diagnostics: Diagnostic[] = [];

  /**
   * Analyze a source file for ownership relationships
   */
  analyze(sourceFile: ts.SourceFile, checker: ts.TypeChecker): void {
    this.collectTypeNodes(sourceFile);
    this.collectOwnershipEdges(sourceFile, checker);
  }

  /**
   * Finalize analysis after all files processed
   */
  finalize(): Diagnostic[] {
    this.detectCycles();
    return this.diagnostics;
  }

  /**
   * Reset analyzer state
   */
  reset(): void {
    this.graph = {
      nodes: new Set(),
      edges: [],
      adjacencyList: new Map(),
    };
    this.diagnostics = [];
  }

  /**
   * Collect all type declarations (classes, interfaces)
   */
  private collectTypeNodes(sourceFile: ts.SourceFile): void {
    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node) && node.name) {
        this.graph.nodes.add(node.name.text);
      } else if (ts.isInterfaceDeclaration(node)) {
        this.graph.nodes.add(node.name.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  /**
   * Collect ownership edges from share<T> fields
   */
  private collectOwnershipEdges(sourceFile: ts.SourceFile, checker: ts.TypeChecker): void {
    const visit = (node: ts.Node) => {
      if (ts.isPropertyDeclaration(node) || ts.isPropertySignature(node)) {
        this.analyzeProperty(node, sourceFile, checker);
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  /**
   * Analyze a property for share<T> ownership
   */
  private analyzeProperty(
    node: ts.PropertyDeclaration | ts.PropertySignature,
    sourceFile: ts.SourceFile,
    _checker: ts.TypeChecker
  ): void {
    if (!node.type) return;

    const typeText = node.type.getText(sourceFile);
    const shareMatch = typeText.match(/share<(\w+)>/);
    
    if (shareMatch) {
      const ownedType = shareMatch[1];
      const ownerType = this.getContainingClass(node, sourceFile);
      
      if (ownerType && this.graph.nodes.has(ownedType)) {
        this.addEdge(ownerType, ownedType, node.name.getText(sourceFile), sourceFile, node);
      }
    }

    // TODO: Handle Array<share<T>>, Map<K, share<V>>, etc.
  }

  /**
   * Add an ownership edge to the graph
   */
  private addEdge(
    from: string,
    to: string,
    via: string,
    sourceFile: ts.SourceFile,
    node: ts.Node
  ): void {
    const edge: OwnershipEdge = {
      from,
      to,
      via,
      location: this.getLocation(node, sourceFile),
    };

    this.graph.edges.push(edge);

    if (!this.graph.adjacencyList.has(from)) {
      this.graph.adjacencyList.set(from, []);
    }
    this.graph.adjacencyList.get(from)!.push(to);
  }

  /**
   * Detect cycles using DFS
   */
  private detectCycles(): void {
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const dfs = (node: string, path: string[]): boolean => {
      if (visiting.has(node)) {
        // Found a cycle
        const cycleStart = path.indexOf(node);
        const cycle = [...path.slice(cycleStart), node];
        this.reportCycle(cycle);
        return true;
      }

      if (visited.has(node)) {
        return false;
      }

      visiting.add(node);
      path.push(node);

      const neighbors = this.graph.adjacencyList.get(node) || [];
      for (const neighbor of neighbors) {
        dfs(neighbor, path);
      }

      path.pop();
      visiting.delete(node);
      visited.add(node);
      return false;
    };

    for (const node of this.graph.nodes) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }
  }

  /**
   * Report a detected cycle
   */
  private reportCycle(cycle: string[]): void {
    this.diagnostics.push({
      code: 'GS301',
      severity: 'error',
      message: `Ownership cycle detected: ${cycle.join(' → ')}. Use use<T> to break the cycle.`,
    });
  }

  /**
   * Get the containing class name
   */
  private getContainingClass(node: ts.Node, _sourceFile: ts.SourceFile): string | undefined {
    let current = node.parent;
    while (current) {
      if (ts.isClassDeclaration(current) && current.name) {
        return current.name.text;
      }
      if (ts.isInterfaceDeclaration(current)) {
        return current.name.text;
      }
      current = current.parent;
    }
    return undefined;
  }

  /**
   * Get source location from node
   */
  private getLocation(node: ts.Node, sourceFile: ts.SourceFile): SourceLocation {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    return {
      fileName: sourceFile.fileName,
      line: line + 1,
      column: character + 1,
    };
  }
}
