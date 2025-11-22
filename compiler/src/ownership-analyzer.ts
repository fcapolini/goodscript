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
 * Represents an ownership edge in the graph (A owns B via Shared<T>)
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
  edges: OwnershipEdge[];            // All Shared<T> ownership edges
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
   * Builds the ownership graph by extracting Shared<T> edges
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
   * Collect ownership edges by analyzing Shared<T> fields
   * Implements Rules 1.1, 1.2, and 1.3 from DAG-DETECTION.md
   * Also tracks inherited fields from base classes/interfaces
   * Additionally validates assignment compatibility for ownership types
   */
  private collectOwnershipEdges(sourceFile: ts.SourceFile, checker: ts.TypeChecker): void {
    const visit = (node: ts.Node) => {
      // Analyze class declarations to include inherited fields
      if (ts.isClassDeclaration(node) && node.name) {
        this.analyzeClassWithInheritance(node, sourceFile, checker);
        // Don't continue visiting - analyzeClassWithInheritance already processed properties
        // But we DO need to visit methods for their parameters and bodies
        for (const member of node.members) {
          if (ts.isMethodDeclaration(member) || ts.isConstructorDeclaration(member) || ts.isGetAccessor(member) || ts.isSetAccessor(member)) {
            // Visit parameters
            for (const param of member.parameters) {
              visit(param);
            }
            // Visit method body for assignments
            if (member.body) {
              ts.forEachChild(member.body, visit);
            }
          }
        }
      }
      // Analyze interface declarations for their own properties
      else if (ts.isInterfaceDeclaration(node)) {
        // Interfaces are analyzed through their properties
        ts.forEachChild(node, visit);
      }
      // Only analyze property declarations/signatures
      else if (ts.isPropertyDeclaration(node) || ts.isPropertySignature(node)) {
        this.analyzePropertyForOwnership(node, sourceFile, checker);
      }
      // Check function/method parameters for naked class references
      else if (ts.isParameter(node) && node.type) {
        const paramName = node.name.getText(sourceFile);
        const location = Parser.getLocation(node, sourceFile);
        this.checkForNakedClassReference(node.type, `parameter '${paramName}'`, location, sourceFile, checker);
        ts.forEachChild(node, visit);
      }
      // Check method declarations to visit their parameters
      else if (ts.isMethodDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isArrowFunction(node)) {
        // Visit parameters explicitly
        for (const param of node.parameters) {
          visit(param);
        }
        ts.forEachChild(node, visit);
      }
      // Validate ownership type assignments
      else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        this.checkOwnershipAssignment(node, sourceFile, checker);
        ts.forEachChild(node, visit);
      }
      // Validate function/method call arguments
      else if (ts.isCallExpression(node)) {
        this.checkCallArguments(node, sourceFile, checker);
        ts.forEachChild(node, visit);
      }
      else {
        ts.forEachChild(node, visit);
      }
    };
    
    visit(sourceFile);
  }

  /**
   * Analyze a class including its inherited fields
   */
  private analyzeClassWithInheritance(
    classDecl: ts.ClassDeclaration,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker
  ): void {
    const className = this.getFullyQualifiedName(classDecl.name!, sourceFile);
    
    // Analyze own properties
    for (const member of classDecl.members) {
      if (ts.isPropertyDeclaration(member)) {
        this.analyzePropertyForOwnership(member, sourceFile, checker);
      }
    }
    
    // Analyze inherited properties from base classes
    this.analyzeInheritedProperties(classDecl, className, sourceFile, checker);
  }

  /**
   * Analyze properties inherited from base classes/interfaces
   */
  private analyzeInheritedProperties(
    classDecl: ts.ClassDeclaration,
    derivedClassName: string,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker
  ): void {
    const type = checker.getTypeAtLocation(classDecl);
    const baseTypes = type.getBaseTypes() || [];
    
    for (const baseType of baseTypes) {
      // Get all properties from the base type
      const properties = baseType.getProperties();
      
      for (const property of properties) {
        // Skip constructor and methods
        if (property.name === 'constructor') continue;
        
        const declarations = property.declarations;
        if (!declarations || declarations.length === 0) continue;
        
        const decl = declarations[0];
        
        // Only process property declarations/signatures
        if (ts.isPropertyDeclaration(decl) || ts.isPropertySignature(decl)) {
          if (!decl.type) continue;
          
          const fieldName = property.name;
          const location = Parser.getLocation(classDecl.name!, sourceFile);
          
          // Extract ownership edges from inherited property
          const ownedTypes = this.extractSharedOwnership(decl.type, decl.getSourceFile(), checker);
          
          // Create edges from the derived class (not the base class)
          for (const ownedType of ownedTypes) {
            this.addEdge(derivedClassName, ownedType, `${fieldName} (inherited)`, location);
          }
        }
      }
    }
  }

  /**
   * Analyze a property declaration/signature for Shared<T> ownership
   * Also validates that class-type fields use ownership annotations
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

    // Check for naked class references (class types without ownership wrappers)
    this.checkForNakedClassReference(node.type, fieldName, location, sourceFile, checker);

    // Extract all Shared<T> ownership relationships from the field type
    const ownedTypes = this.extractSharedOwnership(node.type, sourceFile, checker);
    
    // Create edges for each owned type
    for (const ownedType of ownedTypes) {
      this.addEdge(containingType, ownedType, fieldName, location);
    }
  }

  /**
   * Resolve type aliases to get the underlying type node
   * Does NOT resolve Shared/Weak/Unique - these are ownership wrappers, not aliases
   * Handles generic type aliases by substituting type arguments
   */
  private resolveTypeAlias(
    typeNode: ts.TypeNode,
    checker: ts.TypeChecker,
    visited: Set<ts.TypeNode> = new Set()
  ): ts.TypeNode {
    // Prevent infinite recursion
    if (visited.has(typeNode)) {
      return typeNode;
    }
    visited.add(typeNode);

    if (ts.isTypeReferenceNode(typeNode)) {
      // Don't resolve ownership wrappers - they are not aliases
      // Use the identifier text directly to avoid source file issues
      const typeNameText = ts.isIdentifier(typeNode.typeName) 
        ? typeNode.typeName.text 
        : typeNode.typeName.getText();
      if (typeNameText === 'Shared' || typeNameText === 'Weak' || typeNameText === 'Unique') {
        return typeNode;
      }
      
      // Get the symbol from the type name (this works for type aliases)
      const symbol = checker.getSymbolAtLocation(typeNode.typeName);
      if (symbol?.declarations?.[0]) {
        const declaration = symbol.declarations[0];
        if (ts.isTypeAliasDeclaration(declaration)) {
          const resolvedType = declaration.type;
          
          // Handle generic type aliases: Ref<Item> where Ref<T> = Shared<T>
          // If the original has type arguments and the resolved type is a type reference with type parameters,
          // we need to substitute
          if (typeNode.typeArguments && 
              ts.isTypeReferenceNode(resolvedType) && 
              resolvedType.typeArguments &&
              typeNode.typeArguments.length === resolvedType.typeArguments.length) {
            // Check if all the resolved type arguments are type parameters (like T, U, etc.)
            const allTypeParams = resolvedType.typeArguments.every(arg => 
              ts.isTypeReferenceNode(arg) && ts.isIdentifier(arg.typeName)
            );
            
            if (allTypeParams) {
              // Create a new type reference with substituted arguments
              // For example: Ref<Item> where Ref<T> = Shared<T> becomes Shared<Item>
              return ts.factory.createTypeReferenceNode(
                resolvedType.typeName,
                typeNode.typeArguments
              );
            }
          }
          
          // Recursively resolve nested aliases (non-generic case)
          return this.resolveTypeAlias(resolvedType, checker, visited);
        }
      }
    }
    return typeNode;
  }

  /**
   * Extract Shared<T> ownership from a type annotation
   * Handles:
   * - Direct Shared<T>: Rule 1.1
   * - Array<Shared<T>>, Shared<T>[]: Rule 1.2
   * - Map<K, Shared<T>>, Set<Shared<T>>: Rule 1.2
   * - Nested types: Rule 1.3
   * 
   * Returns the set of type names that are owned via Shared<T>
   */
  private extractSharedOwnership(
    typeNode: ts.TypeNode,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker
  ): Set<string> {
    const ownedTypes = new Set<string>();

    // Union types: check each branch first (before resolving aliases)
    if (ts.isUnionTypeNode(typeNode)) {
      for (const unionMember of typeNode.types) {
        const memberOwnedTypes = this.extractSharedOwnership(unionMember, sourceFile, checker);
        memberOwnedTypes.forEach(t => ownedTypes.add(t));
      }
      return ownedTypes;
    }

    // Intersection types: check each branch first
    if (ts.isIntersectionTypeNode(typeNode)) {
      for (const intersectionMember of typeNode.types) {
        const memberOwnedTypes = this.extractSharedOwnership(intersectionMember, sourceFile, checker);
        memberOwnedTypes.forEach(t => ownedTypes.add(t));
      }
      return ownedTypes;
    }

    // Resolve type aliases
    const resolvedType = this.resolveTypeAlias(typeNode, checker);
    
    // If the resolved type is different from the original (i.e., we resolved an alias),
    // recursively process it (it might be a union, intersection, etc.)
    if (resolvedType !== typeNode) {
      return this.extractSharedOwnership(resolvedType, sourceFile, checker);
    }

    // Rule 3.1 & 3.2: Weak<T> and Unique<T> do NOT create edges
    if (ts.isTypeReferenceNode(resolvedType)) {
      const typeName = resolvedType.typeName.getText(sourceFile);
      
      if (typeName === 'Weak' || typeName === 'Unique') {
        return ownedTypes; // Empty set - these don't create ownership edges
      }
      
      // Rule 1.1: Direct Shared<T> field
      if (typeName === 'Shared' && resolvedType.typeArguments && resolvedType.typeArguments.length > 0) {
        const targetType = this.getTypeNameFromTypeNode(resolvedType.typeArguments[0], sourceFile, checker);
        if (targetType) {
          ownedTypes.add(targetType);
        }
        return ownedTypes;
      }
      
      // Rule 1.2: Container transitivity
      // Array<Shared<T>> or Set<Shared<T>>
      if ((typeName === 'Array' || typeName === 'Set') && 
          resolvedType.typeArguments && resolvedType.typeArguments.length > 0) {
        const elementType = resolvedType.typeArguments[0];
        // Check if element is Shared<T> (recursively resolve)
        const resolvedElement = this.resolveTypeAlias(elementType, checker);
        if (ts.isTypeReferenceNode(resolvedElement)) {
          const elementTypeName = resolvedElement.typeName.getText(sourceFile);
          if (elementTypeName === 'Shared' && 
              resolvedElement.typeArguments && resolvedElement.typeArguments.length > 0) {
            const targetType = this.getTypeNameFromTypeNode(resolvedElement.typeArguments[0], sourceFile, checker);
            if (targetType) {
              ownedTypes.add(targetType);
            }
          }
        }
        return ownedTypes;
      }
      
      // Rule 1.2: Map<K, Shared<V>>
      if (typeName === 'Map' && resolvedType.typeArguments && resolvedType.typeArguments.length === 2) {
        const valueType = resolvedType.typeArguments[1];
        // Check if value is Shared<T> (recursively resolve)
        const resolvedValue = this.resolveTypeAlias(valueType, checker);
        if (ts.isTypeReferenceNode(resolvedValue)) {
          const valueTypeName = resolvedValue.typeName.getText(sourceFile);
          if (valueTypeName === 'Shared' && 
              resolvedValue.typeArguments && resolvedValue.typeArguments.length > 0) {
            const targetType = this.getTypeNameFromTypeNode(resolvedValue.typeArguments[0], sourceFile, checker);
            if (targetType) {
              ownedTypes.add(targetType);
            }
          }
        }
        return ownedTypes;
      }
      
      // Handle generic class instantiations (e.g., Box<Node>)
      // If this is a class type with type arguments, we need to check its fields
      // with type parameter substitution
      if (resolvedType.typeArguments && resolvedType.typeArguments.length > 0) {
        const symbol = checker.getSymbolAtLocation(resolvedType.typeName);
        if (symbol?.declarations?.[0]) {
          const declaration = symbol.declarations[0];
          if (ts.isClassDeclaration(declaration)) {
            // This is a generic class instantiation
            const genericOwnedTypes = this.extractOwnershipFromGenericClass(
              declaration,
              resolvedType.typeArguments,
              sourceFile,
              checker
            );
            genericOwnedTypes.forEach(t => ownedTypes.add(t));
            return ownedTypes;
          }
        }
      }
    }

    // Rule 1.2: Array type syntax (Shared<T>[])
    if (ts.isArrayTypeNode(typeNode)) {
      const elementType = typeNode.elementType;
      if (ts.isTypeReferenceNode(elementType)) {
        const elementTypeName = elementType.typeName.getText(sourceFile);
        if (elementTypeName === 'Shared' && 
            elementType.typeArguments && elementType.typeArguments.length > 0) {
          const targetType = this.getTypeNameFromTypeNode(elementType.typeArguments[0], sourceFile, checker);
          if (targetType) {
            ownedTypes.add(targetType);
          }
        }
      }
      return ownedTypes;
    }

    return ownedTypes;
  }

  /**
   * Extract ownership from a generic class instantiation
   * For example, when we have Box<Node> and Box<T> contains Shared<T>,
   * we substitute Node for T and find that it owns Node
   */
  private extractOwnershipFromGenericClass(
    classDecl: ts.ClassDeclaration,
    typeArguments: ts.NodeArray<ts.TypeNode>,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker
  ): Set<string> {
    const ownedTypes = new Set<string>();
    
    // Get type parameters from the class declaration
    const typeParameters = classDecl.typeParameters;
    if (!typeParameters || typeParameters.length !== typeArguments.length) {
      return ownedTypes;
    }
    
    // Build a substitution map: T -> Node, U -> Item, etc.
    const substitutionMap = new Map<string, ts.TypeNode>();
    for (let i = 0; i < typeParameters.length; i++) {
      const paramName = typeParameters[i].name.text;
      substitutionMap.set(paramName, typeArguments[i]);
    }
    
    // Analyze each field in the generic class
    for (const member of classDecl.members) {
      if (ts.isPropertyDeclaration(member) && member.type) {
        // Extract ownership with type parameter substitution
        const fieldOwnedTypes = this.extractSharedOwnershipWithSubstitution(
          member.type,
          member.getSourceFile(),
          checker,
          substitutionMap
        );
        fieldOwnedTypes.forEach(t => ownedTypes.add(t));
      }
    }
    
    return ownedTypes;
  }

  /**
   * Extract Shared<T> ownership with type parameter substitution
   * This is like extractSharedOwnership but applies generic type parameter substitution
   */
  private extractSharedOwnershipWithSubstitution(
    typeNode: ts.TypeNode,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker,
    substitutionMap: Map<string, ts.TypeNode>
  ): Set<string> {
    const ownedTypes = new Set<string>();
    
    // Handle unions
    if (ts.isUnionTypeNode(typeNode)) {
      for (const member of typeNode.types) {
        const memberOwned = this.extractSharedOwnershipWithSubstitution(member, sourceFile, checker, substitutionMap);
        memberOwned.forEach(t => ownedTypes.add(t));
      }
      return ownedTypes;
    }
    
    // Handle intersections
    if (ts.isIntersectionTypeNode(typeNode)) {
      for (const member of typeNode.types) {
        const memberOwned = this.extractSharedOwnershipWithSubstitution(member, sourceFile, checker, substitutionMap);
        memberOwned.forEach(t => ownedTypes.add(t));
      }
      return ownedTypes;
    }
    
    // Handle type references
    if (ts.isTypeReferenceNode(typeNode)) {
      const typeNameText = ts.isIdentifier(typeNode.typeName) 
        ? typeNode.typeName.text 
        : typeNode.typeName.getText();
      
      // Weak and Unique don't create edges
      if (typeNameText === 'Weak' || typeNameText === 'Unique') {
        return ownedTypes;
      }
      
      // Shared<T> - check if T is a type parameter that needs substitution
      if (typeNameText === 'Shared' && typeNode.typeArguments && typeNode.typeArguments.length > 0) {
        const targetTypeNode = typeNode.typeArguments[0];
        
        // Check if it's a type parameter reference (e.g., T)
        if (ts.isTypeReferenceNode(targetTypeNode) && ts.isIdentifier(targetTypeNode.typeName)) {
          const paramName = targetTypeNode.typeName.text;
          
          // Substitute if we have a mapping
          if (substitutionMap.has(paramName)) {
            const substituted = substitutionMap.get(paramName)!;
            const targetType = this.getTypeNameFromTypeNode(substituted, sourceFile, checker);
            if (targetType) {
              ownedTypes.add(targetType);
            }
          }
        } else {
          // Not a type parameter, just a regular type
          const targetType = this.getTypeNameFromTypeNode(targetTypeNode, sourceFile, checker);
          if (targetType) {
            ownedTypes.add(targetType);
          }
        }
        return ownedTypes;
      }
      
      // For other generic types (e.g., Inner<T>), recursively analyze
      // This handles nested generics like Outer<T> containing Inner<T>
      if (typeNode.typeArguments && typeNode.typeArguments.length > 0) {
        // Substitute type arguments
        const substitutedArgs: ts.TypeNode[] = [];
        for (const arg of typeNode.typeArguments) {
          if (ts.isTypeReferenceNode(arg) && ts.isIdentifier(arg.typeName)) {
            const paramName = arg.typeName.text;
            if (substitutionMap.has(paramName)) {
              substitutedArgs.push(substitutionMap.get(paramName)!);
            } else {
              substitutedArgs.push(arg);
            }
          } else {
            substitutedArgs.push(arg);
          }
        }
        
        // Find the generic class declaration
        const symbol = checker.getSymbolAtLocation(typeNode.typeName);
        if (symbol && symbol.declarations && symbol.declarations.length > 0) {
          const decl = symbol.declarations[0];
          if (ts.isClassDeclaration(decl)) {
            // Recursively analyze the nested generic class
            const nestedOwned = this.extractOwnershipFromGenericClass(
              decl,
              ts.factory.createNodeArray(substitutedArgs),
              sourceFile,
              checker
            );
            nestedOwned.forEach(t => ownedTypes.add(t));
          }
        }
      }
    }
    
    return ownedTypes;
  }

  /**
   * Get the type name from a type node
   */
  /**
   * Extract the type name from a type node (resolving type aliases)
   */
  private getTypeNameFromTypeNode(typeNode: ts.TypeNode, sourceFile: ts.SourceFile, checker: ts.TypeChecker): string | null {
    // Resolve type aliases first
    const resolvedType = this.resolveTypeAlias(typeNode, checker);
    
    if (ts.isTypeReferenceNode(resolvedType)) {
      return this.getFullyQualifiedName(resolvedType.typeName, sourceFile);
    }
    
    // Handle intersection types - use the first type as the base
    if (ts.isIntersectionTypeNode(resolvedType) && resolvedType.types.length > 0) {
      return this.getTypeNameFromTypeNode(resolvedType.types[0], sourceFile, checker);
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
                `Type '${cycleNode}' cannot own itself via Shared<T>. ` +
                `Use the Pool Pattern: create a container type that owns all instances with Unique<T>[], ` +
                `and use Weak<T>[] for references within '${cycleNode}'.`;
    } else if (cycleLength === 2) {
      // Mutual cycle
      cycleType = 'Mutual Cycle';
      message = `Ownership cycle detected: ${cycleDescription}. ` +
                `Types '${cyclePath[0]}' and '${cyclePath[1]}' cannot own each other via Shared<T>. ` +
                `Use Weak<T> for at least one direction to break the cycle.`;
    } else {
      // Longer cycle
      cycleType = `Cycle (length ${cycleLength})`;
      message = `Ownership cycle detected: ${cycleDescription}. ` +
                `No type can transitively own itself via Shared<T>. ` +
                `Break the cycle by changing at least one field to Weak<T>.`;
    }

    this.diagnostics.push({
      severity: 'error',
      code: 'GS301',
      message,
      location: cycleEdge.location,
    });
  }

  /**
   * Check if a type is a naked class reference (class type without ownership wrapper)
   * Reports GS303 error if a class-type field doesn't use Unique/Shared/Weak
   */
  private checkForNakedClassReference(
    typeNode: ts.TypeNode,
    fieldName: string,
    location: SourceLocation,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker
  ): void {
    // Handle union types (e.g., CacheNode | null)
    if (ts.isUnionTypeNode(typeNode)) {
      for (const unionMember of typeNode.types) {
        // Skip null/undefined in unions
        const text = unionMember.getText(sourceFile);
        if (text !== 'null' && text !== 'undefined') {
          this.checkForNakedClassReference(unionMember, fieldName, location, sourceFile, checker);
        }
      }
      return;
    }

    // Handle intersection types
    if (ts.isIntersectionTypeNode(typeNode)) {
      for (const intersectionMember of typeNode.types) {
        this.checkForNakedClassReference(intersectionMember, fieldName, location, sourceFile, checker);
      }
      return;
    }

    // Check if it's a type reference
    if (!ts.isTypeReferenceNode(typeNode)) {
      // Primitive types (number, string, boolean) are fine
      return;
    }

    const typeName = typeNode.typeName.getText(sourceFile);

    // If it's already wrapped in ownership type, it's fine
    if (typeName === 'Unique' || typeName === 'Shared' || typeName === 'Weak') {
      return;
    }

    // Check if this is a class type
    const symbol = checker.getSymbolAtLocation(typeNode.typeName);
    if (!symbol) return;

    const declarations = symbol.getDeclarations();
    if (!declarations || declarations.length === 0) return;

    // Check if any declaration is a class
    const isClass = declarations.some(decl => ts.isClassDeclaration(decl));
    if (!isClass) {
      // Not a class - could be interface, type alias, or built-in type
      // Interfaces and type aliases are fine, built-in types like Array, Map are fine
      return;
    }

    // This is a naked class reference - report error
    // Format the field name appropriately (handles both "fieldName" and "parameter 'paramName'")
    const formattedFieldName = fieldName.startsWith('parameter ') 
      ? fieldName.charAt(0).toUpperCase() + fieldName.slice(1)  // "parameter 'd'" → "Parameter 'd'"
      : `Field '${fieldName}'`;  // "item" → "Field 'item'"
    
    this.diagnostics.push({
      severity: 'error',
      code: 'GS303',
      message: `${formattedFieldName} has class type '${typeName}' without ownership annotation. ` +
               `Use Unique<${typeName}>, Shared<${typeName}>, or Weak<${typeName}> to specify ownership semantics.`,
      location,
    });
  }

  /**
   * Check that assignments to ownership-typed fields have compatible source types
   * GS304: Ownership type mismatch in assignment
   * GS305: Invalid ownership derivation
   * 
   * Rules:
   * - Unique<T> field: source must be Unique<T>, new T(), or null
   * - Shared<T> field: source must be Shared<T> or null (NOT from Unique<T> or new T())
   * - Weak<T> field: source must be Weak<T> or null (can derive from Unique/Shared via conversion API)
   * 
   * Derivation rules (explicit conversion APIs required):
   * 1. From Unique<T> can only create Weak<T> (no Shared<T>)
   * 2. From Shared<T> can create Shared<T> or Weak<T>
   * 3. From Weak<T> can only create Weak<T> (no promotion to owning references)
   * 
   * Note: new T() implicitly creates Unique<T>, can only assign to Unique<T> fields
   */
  private checkOwnershipAssignment(
    assignment: ts.BinaryExpression,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker
  ): void {
    // Only check property access assignments (e.g., this.data = ...)
    if (!ts.isPropertyAccessExpression(assignment.left)) {
      return;
    }

    // Get the property symbol to find its declared type
    const symbol = checker.getSymbolAtLocation(assignment.left.name);
    if (!symbol) return;

    const declarations = symbol.getDeclarations();
    if (!declarations || declarations.length === 0) return;

    // Get the type annotation from the declaration
    const decl = declarations[0];
    if (!ts.isPropertyDeclaration(decl) && !ts.isPropertySignature(decl)) return;
    if (!decl.type) return;  // No type annotation

    // Get the type text directly from the source
    const leftTypeText = decl.type.getText(sourceFile);

    // Check if it's an ownership-typed field
    const ownershipMatch = leftTypeText.match(/^(Unique|Shared|Weak)<(.+)>$/);
    if (!ownershipMatch) {
      return; // Not an ownership type, no validation needed
    }

    const [, targetOwnership, innerType] = ownershipMatch;
    const rightNode = assignment.right;

    // Allow null/undefined assignments
    if (rightNode.kind === ts.SyntaxKind.NullKeyword || 
        rightNode.kind === ts.SyntaxKind.UndefinedKeyword) {
      return;
    }

    // Allow new expressions (new T() creates Unique<T> by default)
    if (ts.isNewExpression(rightNode)) {
      // new T() is Unique<T>, can assign to Unique<T> fields only
      if (targetOwnership === 'Shared' || targetOwnership === 'Weak') {
        this.diagnostics.push({
          severity: 'error',
          code: 'GS305',
          message: `Cannot assign 'new ${innerType}()' (implicitly Unique<${innerType}>) to ${targetOwnership}<${innerType}>. ` +
                   `From Unique<T> can only derive Weak<T>. Use explicit conversion API (future feature).`,
          location: Parser.getLocation(assignment, sourceFile),
        });
      }
      return;
    }

    // Get the type text of the right-hand side
    // Try to get it from the source first, fall back to type checker
    let rightTypeText = '';
    
    if (ts.isCallExpression(rightNode)) {
      // Handle method/function calls - get the return type from the declaration
      if (ts.isPropertyAccessExpression(rightNode.expression)) {
        // Method call: obj.method()
        const methodSymbol = checker.getSymbolAtLocation(rightNode.expression.name);
        if (methodSymbol) {
          const methodDecls = methodSymbol.getDeclarations();
          if (methodDecls && methodDecls.length > 0) {
            const methodDecl = methodDecls[0];
            if (ts.isMethodDeclaration(methodDecl) || ts.isMethodSignature(methodDecl)) {
              if (methodDecl.type) {
                rightTypeText = methodDecl.type.getText(sourceFile);
              }
            }
          }
        }
      } else if (ts.isIdentifier(rightNode.expression)) {
        // Function call: func()
        const funcSymbol = checker.getSymbolAtLocation(rightNode.expression);
        if (funcSymbol) {
          const funcDecls = funcSymbol.getDeclarations();
          if (funcDecls && funcDecls.length > 0) {
            const funcDecl = funcDecls[0];
            if (ts.isFunctionDeclaration(funcDecl) && funcDecl.type) {
              rightTypeText = funcDecl.type.getText(sourceFile);
            }
          }
        }
      }
    } else if (ts.isIdentifier(rightNode)) {
      // Handle identifiers (parameters, variables, etc.)
      const rightSymbol = checker.getSymbolAtLocation(rightNode);
      if (rightSymbol) {
        const rightDecls = rightSymbol.getDeclarations();
        if (rightDecls && rightDecls.length > 0) {
          const rightDecl = rightDecls[0];
          // Check for parameters, variable declarations, property declarations
          if (ts.isParameter(rightDecl) && rightDecl.type) {
            rightTypeText = rightDecl.type.getText(sourceFile);
          } else if (ts.isVariableDeclaration(rightDecl) && rightDecl.type) {
            rightTypeText = rightDecl.type.getText(sourceFile);
          } else if ((ts.isPropertyDeclaration(rightDecl) || ts.isPropertySignature(rightDecl)) && rightDecl.type) {
            rightTypeText = rightDecl.type.getText(sourceFile);
          }
        }
      }
    } else if (ts.isPropertyAccessExpression(rightNode)) {
      // Get the symbol and its declaration
      const rightSymbol = checker.getSymbolAtLocation(rightNode.name);
      if (rightSymbol) {
        const rightDecls = rightSymbol.getDeclarations();
        if (rightDecls && rightDecls.length > 0) {
          const rightDecl = rightDecls[0];
          if ((ts.isPropertyDeclaration(rightDecl) || ts.isPropertySignature(rightDecl)) && rightDecl.type) {
            rightTypeText = rightDecl.type.getText(sourceFile);
          }
        }
      }
    }
    
    if (!rightTypeText) {
      // Fall back to type checker (less precise but better than nothing)
      const rightType = checker.getTypeAtLocation(rightNode);
      rightTypeText = checker.typeToString(rightType);
    }

    // Check if right side is wrapped in ownership type
    const rightOwnershipMatch = rightTypeText.match(/^(Unique|Shared|Weak)<(.+)>$/);
    
    if (rightOwnershipMatch) {
      const [, sourceOwnership] = rightOwnershipMatch;
      
      // Check ownership derivation rules
      if (sourceOwnership === 'Unique') {
        // From Unique<T> can only derive Weak<T>
        if (targetOwnership === 'Shared') {
          this.diagnostics.push({
            severity: 'error',
            code: 'GS305',
            message: `Cannot assign Unique<${innerType}> to Shared<${innerType}>. ` +
                     `From Unique<T> can only derive Weak<T>. Use explicit conversion API (future feature).`,
            location: Parser.getLocation(assignment, sourceFile),
          });
          return;
        }
        if (targetOwnership === 'Unique') {
          // Unique→Unique is a move, which we don't support yet
          // For now, allow it but this will need refinement
          return;
        }
        // Unique→Weak is OK
        return;
      }
      
      if (sourceOwnership === 'Shared') {
        // From Shared<T> can derive Shared<T> or Weak<T>
        if (targetOwnership === 'Shared' || targetOwnership === 'Weak') {
          return; // OK
        }
        if (targetOwnership === 'Unique') {
          this.diagnostics.push({
            severity: 'error',
            code: 'GS305',
            message: `Cannot assign Shared<${innerType}> to Unique<${innerType}>. ` +
                     `Shared ownership cannot be converted to unique ownership.`,
            location: Parser.getLocation(assignment, sourceFile),
          });
          return;
        }
      }
      
      if (sourceOwnership === 'Weak') {
        // Weak<T> can only assign to Weak<T>
        if (targetOwnership === 'Weak') {
          return; // OK
        }
        this.diagnostics.push({
          severity: 'error',
          code: 'GS305',
          message: `Cannot assign Weak<${innerType}> to ${targetOwnership}<${innerType}>. ` +
                   `Weak references cannot be promoted to owning references.`,
          location: Parser.getLocation(assignment, sourceFile),
        });
        return;
      }
      
      // Same ownership type
      if (sourceOwnership === targetOwnership) {
        return; // OK
      }
      
      // Different ownership types - generic error
      this.diagnostics.push({
        severity: 'error',
        code: 'GS304',
        message: `Cannot assign ${sourceOwnership}<T> to ${targetOwnership}<T> field. ` +
                 `Ownership types must match exactly.`,
        location: Parser.getLocation(assignment, sourceFile),
      });
      return;
    }

    // Right side is not wrapped in ownership type
    // This is only valid for new expressions (already checked above)
    this.diagnostics.push({
      severity: 'error',
      code: 'GS304',
      message: `Cannot assign '${rightTypeText}' to '${leftTypeText}'. ` +
               `Expected ${targetOwnership}<${innerType}>, new ${innerType}(), or null.`,
      location: Parser.getLocation(assignment, sourceFile),
    });
  }

  /**
   * Check that function/method call arguments respect ownership derivation rules
   * GS305: Invalid ownership derivation in argument passing
   * 
   * Same rules as assignment:
   * 1. From Unique<T> can only pass to Weak<T> parameters
   * 2. From Shared<T> can pass to Shared<T> or Weak<T> parameters
   * 3. From Weak<T> can only pass to Weak<T> parameters
   */
  private checkCallArguments(
    callExpr: ts.CallExpression,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker
  ): void {
    // Get the signature of the called function/method
    const signature = checker.getResolvedSignature(callExpr);
    if (!signature) return;

    const parameters = signature.getParameters();
    if (parameters.length === 0) return;

    // Check each argument
    for (let i = 0; i < callExpr.arguments.length && i < parameters.length; i++) {
      const arg = callExpr.arguments[i];
      const param = parameters[i];

      // Get parameter's declared type from its declaration
      const paramDecls = param.getDeclarations();
      if (!paramDecls || paramDecls.length === 0) continue;

      const paramDecl = paramDecls[0];
      if (!ts.isParameter(paramDecl)) continue;
      if (!paramDecl.type) continue;

      // Get parameter type text from source
      const paramTypeText = paramDecl.type.getText(paramDecl.getSourceFile());

      // Check if parameter has ownership type
      const paramOwnershipMatch = paramTypeText.match(/^(Unique|Shared|Weak)<(.+)>$/);
      if (!paramOwnershipMatch) continue; // Not an ownership-typed parameter

      const [, targetOwnership, innerType] = paramOwnershipMatch;

      // Allow null/undefined arguments
      if (arg.kind === ts.SyntaxKind.NullKeyword || 
          arg.kind === ts.SyntaxKind.UndefinedKeyword) {
        continue;
      }

      // Check new expressions
      if (ts.isNewExpression(arg)) {
        // new T() is implicitly Unique<T>
        if (targetOwnership === 'Shared' || targetOwnership === 'Weak') {
          this.diagnostics.push({
            severity: 'error',
            code: 'GS305',
            message: `Cannot pass 'new ${innerType}()' (implicitly Unique<${innerType}>) to ${targetOwnership}<${innerType}> parameter. ` +
                     `From Unique<T> can only derive Weak<T>. Use explicit conversion API (future feature).`,
            location: Parser.getLocation(arg, sourceFile),
          });
        }
        continue;
      }

      // Get argument type
      let argTypeText = '';
      
      if (ts.isPropertyAccessExpression(arg)) {
        // Get the symbol and its declaration
        const argSymbol = checker.getSymbolAtLocation(arg.name);
        if (argSymbol) {
          const argDecls = argSymbol.getDeclarations();
          if (argDecls && argDecls.length > 0) {
            const argDecl = argDecls[0];
            if ((ts.isPropertyDeclaration(argDecl) || ts.isPropertySignature(argDecl)) && argDecl.type) {
              argTypeText = argDecl.type.getText(argDecl.getSourceFile());
            }
          }
        }
      } else if (ts.isIdentifier(arg)) {
        // Local variable or parameter - get its declaration
        const argSymbol = checker.getSymbolAtLocation(arg);
        if (argSymbol) {
          const argDecls = argSymbol.getDeclarations();
          if (argDecls && argDecls.length > 0) {
            const argDecl = argDecls[0];
            if (ts.isVariableDeclaration(argDecl) && argDecl.type) {
              argTypeText = argDecl.type.getText(argDecl.getSourceFile());
            } else if (ts.isParameter(argDecl) && argDecl.type) {
              argTypeText = argDecl.type.getText(argDecl.getSourceFile());
            }
          }
        }
      }

      if (!argTypeText) {
        // Fall back to type checker
        const argType = checker.getTypeAtLocation(arg);
        argTypeText = checker.typeToString(argType);
      }

      // Check if argument has ownership type
      const argOwnershipMatch = argTypeText.match(/^(Unique|Shared|Weak)<(.+)>$/);
      if (!argOwnershipMatch) {
        // Argument is not ownership-typed - might need error
        continue;
      }

      const [, sourceOwnership] = argOwnershipMatch;

      // Check ownership derivation rules (same as assignment)
      if (sourceOwnership === 'Unique') {
        if (targetOwnership === 'Shared') {
          this.diagnostics.push({
            severity: 'error',
            code: 'GS305',
            message: `Cannot pass Unique<${innerType}> to Shared<${innerType}> parameter. ` +
                     `From Unique<T> can only derive Weak<T>. Use explicit conversion API (future feature).`,
            location: Parser.getLocation(arg, sourceFile),
          });
        }
        // Unique→Unique is OK (would be a move)
        // Unique→Weak is OK
      } else if (sourceOwnership === 'Shared') {
        if (targetOwnership === 'Unique') {
          this.diagnostics.push({
            severity: 'error',
            code: 'GS305',
            message: `Cannot pass Shared<${innerType}> to Unique<${innerType}> parameter. ` +
                     `Shared ownership cannot be converted to unique ownership.`,
            location: Parser.getLocation(arg, sourceFile),
          });
        }
        // Shared→Shared is OK
        // Shared→Weak is OK
      } else if (sourceOwnership === 'Weak') {
        if (targetOwnership !== 'Weak') {
          this.diagnostics.push({
            severity: 'error',
            code: 'GS305',
            message: `Cannot pass Weak<${innerType}> to ${targetOwnership}<${innerType}> parameter. ` +
                     `Weak references cannot be promoted to owning references.`,
            location: Parser.getLocation(arg, sourceFile),
          });
        }
        // Weak→Weak is OK
      }
    }
  }
}
