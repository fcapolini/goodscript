/**
 * Ownership Analyzer
 * 
 * Implements the DAG (Directed Acyclic Graph) check as specified in DAG-DETECTION.md.
 * 
 * Core Principles:
 * 1. Types are Nodes, Shared<T> relationships are Edges
 * 2. Only Shared<T> creates ownership edges (Unique<T> and Weak<T> do NOT)
 * 3. The entire type graph must be acyclic (DAG)
 * 
 * Rules:
 * - Rule 1.1: Direct Shared<T> field creates edge (A -> B)
 * - Rule 1.2: Container transitivity (Array<Shared<B>>, Map<K, Shared<D>>)
 * - Rule 1.3: Intermediate wrapper transitivity (transitive ownership)
 * - Rule 2.1: Self-ownership prohibition (no cycles allowed)
 * - Rule 3.1: Weak<T> is NOT an edge (breaks cycles)
 * - Rule 3.2: Unique<T> is NOT an edge (orthogonal graph)
 * - Rule 4.1: Pool Pattern enforcement (reject potentially cyclic structures)
 */

import * as ts from 'typescript';
import { Diagnostic, SourceLocation } from './types';
import { Parser } from './parser';

/**
 * Represents a type node in the ownership graph
 */
interface TypeNode {
  name: string;              // Fully qualified type name
  location: SourceLocation;  // Declaration location
}

/**
 * Represents an ownership edge in the graph (A owns B via shared<T>)
 */
interface OwnershipEdge {
  from: string;              // Source type name
  to: string;                // Target type name
  location: SourceLocation;  // Location of the field creating this edge
  fieldName: string;         // Name of the field creating this edge
}

/**
 * The ownership graph for DAG analysis
 */
interface OwnershipGraph {
  nodes: Map<string, TypeNode>;      // Type name -> node info
  edges: OwnershipEdge[];            // All shared<T> ownership edges
  adjacencyList: Map<string, Set<string>>;  // Type name -> set of owned types
}

export class OwnershipAnalyzer {
  private graph: OwnershipGraph = {
    nodes: new Map(),
    edges: [],
    adjacencyList: new Map(),
  };
  
  private diagnostics: Diagnostic[] = [];
  private sourceFiles: ts.SourceFile[] = [];
  
  /**
   * Reset the analyzer state (call before analyzing a new program)
   */
  reset(): void {
    this.graph = {
      nodes: new Map(),
      edges: [],
      adjacencyList: new Map(),
    };
    this.diagnostics = [];
    this.sourceFiles = [];
  }

  /**
   * Analyze a source file for ownership relationships
   * Builds the ownership graph by extracting shared<T> edges
   */
  analyze(sourceFile: ts.SourceFile, checker: ts.TypeChecker): void {
    this.sourceFiles.push(sourceFile);
    this.collectTypeNodes(sourceFile);
    this.collectOwnershipEdges(sourceFile, checker);
  }

  /**
   * Finalize analysis after all files are processed
   * Performs cycle detection on the complete ownership graph
   */
  finalizeAnalysis(): void {
    this.detectCycles();
  }

  /**
   * Get accumulated diagnostics
   */
  getDiagnostics(): Diagnostic[] {
    return this.diagnostics;
  }

  /**
   * Collect all type declarations (classes, interfaces, type aliases) as graph nodes
   */
  private collectTypeNodes(sourceFile: ts.SourceFile): void {
    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node) && node.name) {
        const typeName = this.getFullyQualifiedName(node.name, sourceFile);
        if (!this.graph.nodes.has(typeName)) {
          this.graph.nodes.set(typeName, {
            name: typeName,
            location: Parser.getLocation(node, sourceFile),
          });
        }
      } else if (ts.isInterfaceDeclaration(node) && node.name) {
        const typeName = this.getFullyQualifiedName(node.name, sourceFile);
        if (!this.graph.nodes.has(typeName)) {
          this.graph.nodes.set(typeName, {
            name: typeName,
            location: Parser.getLocation(node, sourceFile),
          });
        }
      } else if (ts.isTypeAliasDeclaration(node) && node.name) {
        const typeName = this.getFullyQualifiedName(node.name, sourceFile);
        if (!this.graph.nodes.has(typeName)) {
          this.graph.nodes.set(typeName, {
            name: typeName,
            location: Parser.getLocation(node, sourceFile),
          });
        }
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
  }

  /**
   * Collect ownership edges by analyzing shared<T> fields
   * Implements Rules 1.1, 1.2, and 1.3 from DAG-DETECTION.md
   */
  private collectOwnershipEdges(sourceFile: ts.SourceFile, checker: ts.TypeChecker): void {
    const visit = (node: ts.Node) => {
      // Only analyze class and interface property declarations
      if (ts.isPropertyDeclaration(node) || ts.isPropertySignature(node)) {
        this.analyzePropertyForOwnership(node, sourceFile, checker);
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
  }

  /**
   * Analyze a property declaration/signature for shared<T> ownership
   */
  private analyzePropertyForOwnership(
    node: ts.PropertyDeclaration | ts.PropertySignature,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker
  ): void {
    if (!node.type) return;

    // Get the containing type (class or interface)
    const containingType = this.getContainingTypeName(node, sourceFile);
    if (!containingType) return;

    const fieldName = node.name.getText(sourceFile);
    const location = Parser.getLocation(node, sourceFile);

    // Extract all shared<T> ownership relationships from the field type
    const ownedTypes = this.extractSharedOwnership(node.type, sourceFile, checker);
    
    // Create edges for each owned type
    for (const ownedType of ownedTypes) {
      this.addEdge(containingType, ownedType, fieldName, location);
    }
  }

  /**
   * Extract shared<T> ownership from a type annotation
   * Handles:
   * - Direct shared<T>: Rule 1.1
   * - Array<shared<T>>, shared<T>[]: Rule 1.2
   * - Map<K, shared<T>>, Set<shared<T>>: Rule 1.2
   * - Nested types: Rule 1.3
   * 
   * Returns the set of type names that are owned via shared<T>
   */
  private extractSharedOwnership(
    typeNode: ts.TypeNode,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker
  ): Set<string> {
    const ownedTypes = new Set<string>();

    // Rule 3.1 & 3.2: weak<T> and unique<T> do NOT create edges
    if (ts.isTypeReferenceNode(typeNode)) {
      const typeName = typeNode.typeName.getText(sourceFile);
      
      if (typeName === 'Weak' || typeName === 'Unique') {
        return ownedTypes; // Empty set - these don't create ownership edges
      }
      
      // Rule 1.1: Direct Shared<T> field
      if (typeName === 'Shared' && typeNode.typeArguments && typeNode.typeArguments.length > 0) {
        const targetType = this.getTypeNameFromTypeNode(typeNode.typeArguments[0], sourceFile);
        if (targetType) {
          ownedTypes.add(targetType);
        }
        return ownedTypes;
      }
      
      // Rule 1.2: Container transitivity
      // Array<Shared<T>> or Set<Shared<T>>
      if ((typeName === 'Array' || typeName === 'Set') && 
          typeNode.typeArguments && typeNode.typeArguments.length > 0) {
        const elementType = typeNode.typeArguments[0];
        // Check if element is Shared<T>
        if (ts.isTypeReferenceNode(elementType)) {
          const elementTypeName = elementType.typeName.getText(sourceFile);
          if (elementTypeName === 'Shared' && 
              elementType.typeArguments && elementType.typeArguments.length > 0) {
            const targetType = this.getTypeNameFromTypeNode(elementType.typeArguments[0], sourceFile);
            if (targetType) {
              ownedTypes.add(targetType);
            }
          }
        }
        return ownedTypes;
      }
      
      // Rule 1.2: Map<K, Shared<V>>
      if (typeName === 'Map' && typeNode.typeArguments && typeNode.typeArguments.length === 2) {
        const valueType = typeNode.typeArguments[1];
        // Check if value is Shared<T>
        if (ts.isTypeReferenceNode(valueType)) {
          const valueTypeName = valueType.typeName.getText(sourceFile);
          if (valueTypeName === 'Shared' && 
              valueType.typeArguments && valueType.typeArguments.length > 0) {
            const targetType = this.getTypeNameFromTypeNode(valueType.typeArguments[0], sourceFile);
            if (targetType) {
              ownedTypes.add(targetType);
            }
          }
        }
        return ownedTypes;
      }
    }

    // Rule 1.2: Array type syntax (Shared<T>[])
    if (ts.isArrayTypeNode(typeNode)) {
      const elementType = typeNode.elementType;
      if (ts.isTypeReferenceNode(elementType)) {
        const elementTypeName = elementType.typeName.getText(sourceFile);
        if (elementTypeName === 'Shared' && 
            elementType.typeArguments && elementType.typeArguments.length > 0) {
          const targetType = this.getTypeNameFromTypeNode(elementType.typeArguments[0], sourceFile);
          if (targetType) {
            ownedTypes.add(targetType);
          }
        }
      }
      return ownedTypes;
    }

    // Union types: check each branch
    if (ts.isUnionTypeNode(typeNode)) {
      for (const unionMember of typeNode.types) {
        const memberOwnedTypes = this.extractSharedOwnership(unionMember, sourceFile, checker);
        memberOwnedTypes.forEach(t => ownedTypes.add(t));
      }
      return ownedTypes;
    }

    // Intersection types: check each branch
    if (ts.isIntersectionTypeNode(typeNode)) {
      for (const intersectionMember of typeNode.types) {
        const memberOwnedTypes = this.extractSharedOwnership(intersectionMember, sourceFile, checker);
        memberOwnedTypes.forEach(t => ownedTypes.add(t));
      }
      return ownedTypes;
    }

    return ownedTypes;
  }

  /**
   * Get the type name from a type node
   */
  private getTypeNameFromTypeNode(typeNode: ts.TypeNode, sourceFile: ts.SourceFile): string | null {
    if (ts.isTypeReferenceNode(typeNode)) {
      return this.getFullyQualifiedName(typeNode.typeName, sourceFile);
    }
    return null;
  }

  /**
   * Get the containing type name (class or interface) for a property
   */
  private getContainingTypeName(
    node: ts.PropertyDeclaration | ts.PropertySignature,
    sourceFile: ts.SourceFile
  ): string | null {
    let parent: ts.Node | undefined = node.parent;
    
    // Find the containing class or interface
    while (parent) {
      if (ts.isClassDeclaration(parent) && parent.name) {
        return this.getFullyQualifiedName(parent.name, sourceFile);
      }
      if (ts.isInterfaceDeclaration(parent) && parent.name) {
        return this.getFullyQualifiedName(parent.name, sourceFile);
      }
      parent = parent.parent;
    }
    
    return null;
  }

  /**
   * Get fully qualified name for a type
   * For now, just use the simple name (we can enhance this later for namespaces)
   */
  private getFullyQualifiedName(name: ts.EntityName, sourceFile: ts.SourceFile): string {
    return name.getText(sourceFile);
  }

  /**
   * Add an ownership edge to the graph
   */
  private addEdge(from: string, to: string, fieldName: string, location: SourceLocation): void {
    // Add the edge
    this.graph.edges.push({ from, to, location, fieldName });
    
    // Update adjacency list
    if (!this.graph.adjacencyList.has(from)) {
      this.graph.adjacencyList.set(from, new Set());
    }
    this.graph.adjacencyList.get(from)!.add(to);
  }

  /**
   * Detect cycles in the ownership graph
   * Implements Rule 2.1: Self-ownership prohibition
   * Uses DFS-based cycle detection
   */
  private detectCycles(): void {
    const visiting = new Set<string>();  // Nodes currently in DFS stack (gray)
    const visited = new Set<string>();   // Nodes completely processed (black)
    
    // Try DFS from each node
    for (const typeName of this.graph.nodes.keys()) {
      if (!visited.has(typeName)) {
        this.dfsDetectCycle(typeName, visiting, visited, []);
      }
    }
  }

  /**
   * DFS-based cycle detection
   * @param node Current node being visited
   * @param visiting Set of nodes in current DFS path (gray nodes)
   * @param visited Set of completely processed nodes (black nodes)
   * @param path Current path for cycle reporting
   */
  private dfsDetectCycle(
    node: string,
    visiting: Set<string>,
    visited: Set<string>,
    path: string[]
  ): void {
    if (visited.has(node)) {
      return; // Already fully processed
    }
    
    if (visiting.has(node)) {
      // Cycle detected! node is in the current path
      this.reportCycle(node, path);
      return;
    }
    
    // Mark as visiting (gray)
    visiting.add(node);
    path.push(node);
    
    // Visit all neighbors
    const neighbors = this.graph.adjacencyList.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        this.dfsDetectCycle(neighbor, visiting, visited, [...path]);
      }
    }
    
    // Mark as visited (black) and remove from visiting
    visiting.delete(node);
    visited.add(node);
  }

  /**
   * Report a cycle in the ownership graph
   * Rule 4.1: Pool Pattern enforcement - suggest using Pool Pattern
   */
  private reportCycle(cycleNode: string, path: string[]): void {
    // Find where the cycle starts in the path
    const cycleStartIndex = path.indexOf(cycleNode);
    if (cycleStartIndex === -1) return;
    
    const cyclePath = [...path.slice(cycleStartIndex), cycleNode];
    
    // Get the edge that creates the cycle (last edge in the cycle)
    const lastType = path[path.length - 1];
    const cycleEdge = this.graph.edges.find(e => e.from === lastType && e.to === cycleNode);
    
    if (!cycleEdge) return;

    // Build error message
    const cycleDescription = cyclePath.join(' → ');
    const cycleLength = cyclePath.length - 1;
    
    let cycleType: string;
    let message: string;
    
    if (cycleLength === 1) {
      // Direct cycle (self-reference)
      cycleType = 'Direct Cycle';
      message = `Ownership cycle detected: ${cycleDescription}. ` +
                `Type '${cycleNode}' cannot own itself via shared<T>. ` +
                `Use the Pool Pattern: create a container type that owns all instances with unique<T>[], ` +
                `and use weak<T>[] for references within '${cycleNode}'.`;
    } else if (cycleLength === 2) {
      // Mutual cycle
      cycleType = 'Mutual Cycle';
      message = `Ownership cycle detected: ${cycleDescription}. ` +
                `Types '${cyclePath[0]}' and '${cyclePath[1]}' cannot own each other via shared<T>. ` +
                `Use weak<T> for at least one direction to break the cycle.`;
    } else {
      // Longer cycle
      cycleType = `Cycle (length ${cycleLength})`;
      message = `Ownership cycle detected: ${cycleDescription}. ` +
                `No type can transitively own itself via shared<T>. ` +
                `Break the cycle by changing at least one field to weak<T>.`;
    }

    this.diagnostics.push({
      severity: 'error',
      code: 'GS301',
      message,
      location: cycleEdge.location,
    });
  }
}
