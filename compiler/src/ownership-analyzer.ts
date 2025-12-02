/**
 * Ownership Analyzer
 * 
 * Implements comprehensive ownership analysis including:
 * 1. DAG (Directed Acyclic Graph) cycle detection
 * 2. Ownership derivation rule enforcement
 * 3. Assignment compatibility validation
 * 
 * DAG Rules (prevents reference cycles):
 * - Rule 1.1: Direct share<T> field creates edge (A -> B)
 * - Rule 1.2: Container transitivity (Array<share<B>>, Map<K, share<D>>)
 * - Rule 1.3: Intermediate wrapper transitivity (transitive ownership)
 * - Rule 2.1: Self-ownership prohibition (no cycles allowed)
 * - Rule 3.1: use<T> is NOT an edge (breaks cycles)
 * - Rule 3.2: own<T> is NOT an edge (orthogonal graph)
 * - Rule 4.1: Pool Pattern enforcement (reject potentially cyclic structures)
 * 
 * Ownership Derivation Rules (prevents logic mistakes):
 * - From own<T> → only use<T> (no aliasing of exclusive ownership)
 * - From share<T> → share<T> or use<T> (can share or downgrade)
 * - From use<T> → only use<T> (cannot upgrade to ownership)
 * - new T() → implicitly own<T> (can only assign to own<T> fields)
 * 
 * Enforced via:
 * - GS303: Missing ownership annotation on class-type fields
 * - GS304: Ownership type mismatch in assignment
 * - GS305: Invalid ownership derivation (assignment/argument passing)
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
 * Represents an ownership edge in the graph (A owns B via share<T>)
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
  edges: OwnershipEdge[];            // All share<T> ownership edges
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
  
  // Map from node position to inferred ownership qualifier
  // Key: `${sourceFile.fileName}:${node.pos}:${node.end}`
  // Value: { qualifier: 'own' | 'share' | 'use', elementType: string }
  private inferredQualifiers = new Map<string, { qualifier: 'own' | 'share' | 'use', elementType: string }>();
  
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
    this.inferredQualifiers = new Map();
  }

  /**
   * Analyze a source file for ownership relationships
   * Builds the ownership graph by extracting share<T> edges
   */
  analyze(sourceFile: ts.SourceFile, checker: ts.TypeChecker): void {
    this.sourceFiles.push(sourceFile);
    this.collectTypeNodes(sourceFile);
    this.collectOwnershipEdges(sourceFile, checker);
    this.inferOwnershipQualifiers(sourceFile, checker);
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
   * Get inferred ownership qualifier for a variable declaration or parameter
   * Returns the qualifier ('own', 'share', or 'use') and element type if applicable
   */
  getInferredQualifier(node: ts.Node, sourceFile: ts.SourceFile): { qualifier: 'own' | 'share' | 'use', elementType: string } | undefined {
    const key = `${sourceFile.fileName}:${node.pos}:${node.end}`;
    return this.inferredQualifiers.get(key);
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
   * Collect ownership edges by analyzing share<T> fields
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
      // Analyze type alias declarations with object literal types
      else if (ts.isTypeAliasDeclaration(node)) {
        this.analyzeTypeAliasForOwnership(node, sourceFile, checker);
        ts.forEachChild(node, visit);
      }
      // Only analyze property declarations/signatures
      else if (ts.isPropertyDeclaration(node) || ts.isPropertySignature(node)) {
        this.analyzePropertyForOwnership(node, sourceFile, checker);
      }
      // Check method declarations to visit their parameters
      else if (ts.isMethodDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isArrowFunction(node)) {
        // Check parameters for primitive ownership qualifiers
        for (const param of node.parameters) {
          if (param.type) {
            const paramName = param.name.getText(sourceFile);
            const location = Parser.getLocation(param, sourceFile);
            this.checkPrimitiveOwnership(param.type, `parameter '${paramName}'`, location, sourceFile);
          }
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
   * Analyze a property declaration/signature for share<T> ownership
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

    // Check for ownership qualifiers on primitive types (not allowed)
    this.checkPrimitiveOwnership(node.type, fieldName, location, sourceFile);

    // Check for naked class references (class types without ownership wrappers)
    this.checkForNakedClassReference(node.type, fieldName, location, sourceFile, checker);

    // Extract all share<T> ownership relationships from the field type
    const ownedTypes = this.extractSharedOwnership(node.type, sourceFile, checker);
    
    // Create edges for each owned type
    for (const ownedType of ownedTypes) {
      this.addEdge(containingType, ownedType, fieldName, location);
    }
  }

  /**
   * Analyze a type alias declaration for ownership edges
   * Handles type aliases with object literal types like:
   * type Node = { next?: share<Node> }
   * Also handles intersection types like:
   * type NamedItem = Item & Named
   */
  private analyzeTypeAliasForOwnership(
    node: ts.TypeAliasDeclaration,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker
  ): void {
    const typeName = node.name.text;
    
    // Handle type literal (object types)
    if (ts.isTypeLiteralNode(node.type)) {
      // Analyze each property in the object literal type
      for (const member of node.type.members) {
        if (ts.isPropertySignature(member) && member.type) {
          const fieldName = member.name?.getText(sourceFile) ?? 'unknown';
          const location = Parser.getLocation(member, sourceFile);

          // Check for ownership qualifiers on primitive types (not allowed)
          this.checkPrimitiveOwnership(member.type, fieldName, location, sourceFile);

          // Check for naked class references (class types without ownership wrappers)
          this.checkForNakedClassReference(member.type, fieldName, location, sourceFile, checker);

          // Extract all share<T> ownership relationships from the field type
          const ownedTypes = this.extractSharedOwnership(member.type, sourceFile, checker);
          
          // Create edges for each owned type
          for (const ownedType of ownedTypes) {
            this.addEdge(typeName, ownedType, fieldName, location);
          }
        }
      }
    }
    // Handle intersection types like: type NamedItem = Item & Named
    // Create an edge from the alias to each class/interface in the intersection
    else if (ts.isIntersectionTypeNode(node.type)) {
      for (const intersectionMember of node.type.types) {
        if (ts.isTypeReferenceNode(intersectionMember)) {
          const referencedTypeName = this.getFullyQualifiedName(intersectionMember.typeName, sourceFile);
          // Add edge from alias to referenced type (e.g., NamedItem → Item)
          // This allows cycles to be detected when someone uses share<NamedItem>
          const location = Parser.getLocation(node, sourceFile);
          this.addEdge(typeName, referencedTypeName, 'intersection', location);
        }
      }
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
      if (typeNameText === 'share' || typeNameText === 'use' || typeNameText === 'own') {
        return typeNode;
      }
      
      // Get the symbol from the type name (this works for type aliases)
      const symbol = checker.getSymbolAtLocation(typeNode.typeName);
      if (symbol?.declarations?.[0]) {
        const declaration = symbol.declarations[0];
        if (ts.isTypeAliasDeclaration(declaration)) {
          const resolvedType = declaration.type;
          
          // Handle generic type aliases: Ref<Item> where Ref<T> = share<T>
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
              // For example: Ref<Item> where Ref<T> = share<T> becomes share<Item>
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
   * Extract share<T> ownership from a type annotation
   * Handles:
   * - Direct share<T>: Rule 1.1
   * - Array<share<T>>, share<T>[]: Rule 1.2
   * - Map<K, share<T>>, Set<share<T>>: Rule 1.2
   * - Nested types: Rule 1.3
   * 
   * Returns the set of type names that are owned via share<T>
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

    // Rule 3.1 & 3.2: use<T> and own<T> do NOT create edges
    if (ts.isTypeReferenceNode(resolvedType)) {
      const typeName = resolvedType.typeName.getText(sourceFile);
      
      if (typeName === 'use' || typeName === 'own') {
        return ownedTypes; // Empty set - these don't create ownership edges
      }
      
      // Rule 1.1: Direct share<T> field
      if (typeName === 'share' && resolvedType.typeArguments && resolvedType.typeArguments.length > 0) {
        const targetType = this.getTypeNameFromTypeNode(resolvedType.typeArguments[0], sourceFile, checker);
        if (targetType) {
          ownedTypes.add(targetType);
        }
        return ownedTypes;
      }
      
      // Rule 1.2: Container transitivity
      // Array<share<T>> or Set<share<T>>
      if ((typeName === 'Array' || typeName === 'Set') && 
          resolvedType.typeArguments && resolvedType.typeArguments.length > 0) {
        const elementType = resolvedType.typeArguments[0];
        // Check if element is share<T> (recursively resolve)
        const resolvedElement = this.resolveTypeAlias(elementType, checker);
        if (ts.isTypeReferenceNode(resolvedElement)) {
          const elementTypeName = resolvedElement.typeName.getText(sourceFile);
          if (elementTypeName === 'share' && 
              resolvedElement.typeArguments && resolvedElement.typeArguments.length > 0) {
            const targetType = this.getTypeNameFromTypeNode(resolvedElement.typeArguments[0], sourceFile, checker);
            if (targetType) {
              ownedTypes.add(targetType);
            }
          }
        }
        return ownedTypes;
      }
      
      // Rule 1.2: Map<K, share<V>>
      if (typeName === 'Map' && resolvedType.typeArguments && resolvedType.typeArguments.length === 2) {
        const valueType = resolvedType.typeArguments[1];
        // Check if value is share<T> (recursively resolve)
        const resolvedValue = this.resolveTypeAlias(valueType, checker);
        if (ts.isTypeReferenceNode(resolvedValue)) {
          const valueTypeName = resolvedValue.typeName.getText(sourceFile);
          if (valueTypeName === 'share' && 
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

    // Rule 1.2: Array type syntax (share<T>[])
    if (ts.isArrayTypeNode(typeNode)) {
      const elementType = typeNode.elementType;
      if (ts.isTypeReferenceNode(elementType)) {
        const elementTypeName = elementType.typeName.getText(sourceFile);
        if (elementTypeName === 'share' && 
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
   * For example, when we have Box<Node> and Box<T> contains share<T>,
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
   * Extract share<T> ownership with type parameter substitution
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
      if (typeNameText === 'use' || typeNameText === 'own') {
        return ownedTypes;
      }
      
      // share<T> - check if T is a type parameter that needs substitution
      if (typeNameText === 'share' && typeNode.typeArguments && typeNode.typeArguments.length > 0) {
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
    // DO NOT resolve type aliases here - we want the alias name itself (e.g., "Node" not the object literal)
    // Only resolve ownership wrappers (share/own/use)
    
    if (ts.isTypeReferenceNode(typeNode)) {
      return this.getFullyQualifiedName(typeNode.typeName, sourceFile);
    }
    
    // Handle intersection types - use the first type as the base
    if (ts.isIntersectionTypeNode(typeNode) && typeNode.types.length > 0) {
      return this.getTypeNameFromTypeNode(typeNode.types[0], sourceFile, checker);
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
                `Type '${cycleNode}' cannot own itself via share<T>. ` +
                `Use the Pool Pattern: create a container type that owns all instances with own<T>[], ` +
                `and use use<T>[] for references within '${cycleNode}'.`;
    } else if (cycleLength === 2) {
      // Mutual cycle
      cycleType = 'Mutual Cycle';
      message = `Ownership cycle detected: ${cycleDescription}. ` +
                `Types '${cyclePath[0]}' and '${cyclePath[1]}' cannot own each other via share<T>. ` +
                `Use use<T> for at least one direction to break the cycle.`;
    } else {
      // Longer cycle
      cycleType = `Cycle (length ${cycleLength})`;
      message = `Ownership cycle detected: ${cycleDescription}. ` +
                `No type can transitively own itself via share<T>. ` +
                `Break the cycle by changing at least one field to use<T>.`;
    }

    this.diagnostics.push({
      severity: 'error',
      code: 'GS301',
      message,
      location: cycleEdge.location,
    });
  }

  /**
   * Check for invalid ownership qualifiers on primitive types
   * Primitives (number, boolean) are stack-allocated and passed by value,
   * so they must NOT use ownership qualifiers.
   * 
   * Note: string is NOT included because gs::String can be used with ownership
   * qualifiers (e.g., share<string> for string interning/deduplication).
   * 
   * Reports GS306 error if a numeric or boolean primitive is wrapped in own<T>, share<T>, or use<T>.
   */
  private checkPrimitiveOwnership(
    typeNode: ts.TypeNode,
    fieldName: string,
    location: SourceLocation,
    sourceFile: ts.SourceFile
  ): void {
    // Check if it's a type reference (own<T>, share<T>, use<T>)
    if (!ts.isTypeReferenceNode(typeNode)) {
      return;
    }

    const typeName = typeNode.typeName.getText(sourceFile);

    // Check if it's an ownership qualifier
    if (typeName === 'own' || typeName === 'share' || typeName === 'use' ||
        typeName === 'own' || typeName === 'share' || typeName === 'use') {
      // Check if the inner type is a primitive (only number and boolean, NOT string)
      if (typeNode.typeArguments && typeNode.typeArguments.length === 1) {
        const innerType = typeNode.typeArguments[0];
        
        if (innerType.kind === ts.SyntaxKind.NumberKeyword ||
            innerType.kind === ts.SyntaxKind.BooleanKeyword) {
          
          const primitiveTypeName = innerType.kind === ts.SyntaxKind.NumberKeyword ? 'number' : 'boolean';
          
          this.diagnostics.push({
            severity: 'error',
            code: 'GS306',
            message: `Field '${fieldName}' uses ownership qualifier '${typeName}' on primitive type '${primitiveTypeName}'. ` +
                     `Primitives are stack-allocated and passed by value, and must not use ownership qualifiers. ` +
                     `Use plain '${primitiveTypeName}' instead.`,
            location,
          });
        }
      }
    }
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

    // Handle array types (T[])
    // Arrays are containers - check their element type, not the array itself
    if (ts.isArrayTypeNode(typeNode)) {
      this.checkForNakedClassReference(typeNode.elementType, fieldName, location, sourceFile, checker);
      return;
    }

    // Allow primitive keyword types (number, boolean, string)
    if (typeNode.kind === ts.SyntaxKind.NumberKeyword || 
        typeNode.kind === ts.SyntaxKind.BooleanKeyword ||
        typeNode.kind === ts.SyntaxKind.StringKeyword) {
      return;
    }

    // Check if it's a type reference
    if (!ts.isTypeReferenceNode(typeNode)) {
      return;
    }

    const typeName = typeNode.typeName.getText(sourceFile);

    // If it's already wrapped in ownership type, it's fine
    // Support both old (Unique/Shared/Weak) and new (own/share/use) naming
    if (typeName === 'own' || typeName === 'share' || typeName === 'use' ||
        typeName === 'own' || typeName === 'share' || typeName === 'use') {
      return;
    }

    // Built-in container types are fine - they're wrappers, check their type arguments
    const containers = ['Array', 'Map', 'Set', 'WeakMap', 'WeakSet'];
    if (containers.includes(typeName) && typeNode.typeArguments) {
      // Recursively check type arguments
      for (const typeArg of typeNode.typeArguments) {
        this.checkForNakedClassReference(typeArg, fieldName, location, sourceFile, checker);
      }
      return;
    }

    // Other built-in heap types are allowed without qualification (pragmatic)
    const builtinTypes = ['Promise', 'RegExp', 'Date', 'Error', 'Function', 'String', 'Number', 'Boolean'];
    if (builtinTypes.includes(typeName)) {
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
      // Not a class - could be interface or type alias, which are fine
      return;
    }

    // This is a naked class reference - report error
    this.reportMissingOwnershipQualifier(typeName, fieldName, location);
  }

  /**
   * Report error for heap-allocated type without ownership qualifier
   */
  private reportMissingOwnershipQualifier(
    typeName: string,
    fieldName: string,
    location: SourceLocation
  ): void {
    // Format the field name appropriately (handles both "fieldName" and "parameter 'paramName'")
    const formattedFieldName = fieldName.startsWith('parameter ') 
      ? fieldName.charAt(0).toUpperCase() + fieldName.slice(1)  // "parameter 'd'" → "Parameter 'd'"
      : `Field '${fieldName}'`;  // "item" → "Field 'item'"
    
    this.diagnostics.push({
      severity: 'error',
      code: 'GS303',
      message: `${formattedFieldName} has heap-allocated type '${typeName}' without ownership annotation. ` +
               `Use own<${typeName}>, share<${typeName}>, or use<${typeName}> to specify ownership semantics.`,
      location,
    });
  }

  /**
   * Check that assignments to ownership-typed fields have compatible source types
   * GS304: Ownership type mismatch in assignment
   * GS305: Invalid ownership derivation
   * 
   * Rules:
   * - own<T> field: source must be own<T>, new T(), or null
   * - share<T> field: source must be share<T> or null (NOT from own<T> or new T())
   * - use<T> field: source must be use<T> or null (can derive from Unique/Shared via conversion API)
   * 
   * Derivation rules (explicit conversion APIs required):
   * 1. From own<T> can only create use<T> (no share<T>)
   * 2. From share<T> can create share<T> or use<T>
   * 3. From use<T> can only create use<T> (no promotion to owning references)
   * 
   * Note: new T() implicitly creates own<T>, can only assign to own<T> fields
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
    const ownershipMatch = leftTypeText.match(/^(own|share|use)<(.+)>$/);
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

    // Allow new expressions (new T() creates own<T> by default)
    if (ts.isNewExpression(rightNode)) {
      // new T() is own<T>, can assign to own<T> fields only
      if (targetOwnership === 'share' || targetOwnership === 'use') {
        this.diagnostics.push({
          severity: 'error',
          code: 'GS305',
          message: `Cannot assign 'new ${innerType}()' (implicitly own<${innerType}>) to ${targetOwnership}<${innerType}>. ` +
                   `From own<T> can only derive use<T>. Use explicit conversion API (future feature).`,
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
    const rightOwnershipMatch = rightTypeText.match(/^((own|share|use))<(.+)>$/);
    
    if (rightOwnershipMatch) {
      const [, sourceOwnership] = rightOwnershipMatch;
      
      // Check ownership derivation rules
      if (sourceOwnership === 'own') {
        // From own<T> can only derive use<T>
        if (targetOwnership === 'share') {
          this.diagnostics.push({
            severity: 'error',
            code: 'GS305',
            message: `Cannot assign own<${innerType}> to share<${innerType}>. ` +
                     `From own<T> can only derive use<T>. Use explicit conversion API (future feature).`,
            location: Parser.getLocation(assignment, sourceFile),
          });
          return;
        }
        if (targetOwnership === 'own') {
          // Unique→Unique is a move, which we don't support yet
          // For now, allow it but this will need refinement
          return;
        }
        // Unique→Weak is OK
        return;
      }
      
      if (sourceOwnership === 'share') {
        // From share<T> can derive share<T> or use<T>
        if (targetOwnership === 'share' || targetOwnership === 'use') {
          return; // OK
        }
        if (targetOwnership === 'own') {
          this.diagnostics.push({
            severity: 'error',
            code: 'GS305',
            message: `Cannot assign share<${innerType}> to own<${innerType}>. ` +
                     `Shared ownership cannot be converted to unique ownership.`,
            location: Parser.getLocation(assignment, sourceFile),
          });
          return;
        }
      }
      
      if (sourceOwnership === 'use') {
        // use<T> can only assign to use<T>
        if (targetOwnership === 'use') {
          return; // OK
        }
        this.diagnostics.push({
          severity: 'error',
          code: 'GS305',
          message: `Cannot assign use<${innerType}> to ${targetOwnership}<${innerType}>. ` +
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
   * 1. From own<T> can only pass to use<T> parameters
   * 2. From share<T> can pass to share<T> or use<T> parameters
   * 3. From use<T> can only pass to use<T> parameters
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
      const paramOwnershipMatch = paramTypeText.match(/^((own|share|use))<(.+)>$/);
      if (!paramOwnershipMatch) continue; // Not an ownership-typed parameter

      const [, targetOwnership, innerType] = paramOwnershipMatch;

      // Allow null/undefined arguments
      if (arg.kind === ts.SyntaxKind.NullKeyword || 
          arg.kind === ts.SyntaxKind.UndefinedKeyword) {
        continue;
      }

      // Check new expressions
      if (ts.isNewExpression(arg)) {
        // new T() is implicitly own<T>
        if (targetOwnership === 'share' || targetOwnership === 'use') {
          this.diagnostics.push({
            severity: 'error',
            code: 'GS305',
            message: `Cannot pass 'new ${innerType}()' (implicitly own<${innerType}>) to ${targetOwnership}<${innerType}> parameter. ` +
                     `From own<T> can only derive use<T>. Use explicit conversion API (future feature).`,
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
      const argOwnershipMatch = argTypeText.match(/^((own|share|use))<(.+)>$/);
      if (!argOwnershipMatch) {
        // Argument is not ownership-typed - might need error
        continue;
      }

      const [, sourceOwnership] = argOwnershipMatch;

      // Check ownership derivation rules (same as assignment)
      if (sourceOwnership === 'own') {
        if (targetOwnership === 'share') {
          this.diagnostics.push({
            severity: 'error',
            code: 'GS305',
            message: `Cannot pass own<${innerType}> to share<${innerType}> parameter. ` +
                     `From own<T> can only derive use<T>. Use explicit conversion API (future feature).`,
            location: Parser.getLocation(arg, sourceFile),
          });
        }
        // Unique→Unique is OK (would be a move)
        // Unique→Weak is OK
      } else if (sourceOwnership === 'share') {
        if (targetOwnership === 'own') {
          this.diagnostics.push({
            severity: 'error',
            code: 'GS305',
            message: `Cannot pass share<${innerType}> to own<${innerType}> parameter. ` +
                     `Shared ownership cannot be converted to unique ownership.`,
            location: Parser.getLocation(arg, sourceFile),
          });
        }
        // Shared→Shared is OK
        // Shared→Weak is OK
      } else if (sourceOwnership === 'use') {
        if (targetOwnership !== 'use') {
          this.diagnostics.push({
            severity: 'error',
            code: 'GS305',
            message: `Cannot pass use<${innerType}> to ${targetOwnership}<${innerType}> parameter. ` +
                     `Weak references cannot be promoted to owning references.`,
            location: Parser.getLocation(arg, sourceFile),
          });
        }
        // Weak→Weak is OK
      }
    }
  }
  
  /**
   * Infer ownership qualifiers for unqualified references
   * Rules:
   * - Function parameters: share<T> (caller retains ownership, callee gets shared reference)
   * - Local var initialization from new expression: own<T> (taking exclusive ownership)
   * - Local var assignment from reference: use<T> (borrowing, not taking ownership)
   */
  private inferOwnershipQualifiers(sourceFile: ts.SourceFile, checker: ts.TypeChecker): void {
    const visit = (node: ts.Node) => {
      // Function parameters
      if (ts.isParameter(node) && node.type && this.needsOwnershipQualifier(node.type, sourceFile, checker)) {
        const elementType = this.extractElementType(node.type, sourceFile);
        if (elementType) {
          const key = `${sourceFile.fileName}:${node.pos}:${node.end}`;
          this.inferredQualifiers.set(key, { qualifier: 'share', elementType });
        }
      }
      
      // Variable declarations
      if (ts.isVariableDeclaration(node) && node.type && this.needsOwnershipQualifier(node.type, sourceFile, checker)) {
        const elementType = this.extractElementType(node.type, sourceFile);
        if (elementType && node.initializer) {
          const key = `${sourceFile.fileName}:${node.pos}:${node.end}`;
          
          // Check if initializer is a new expression
          if (ts.isNewExpression(node.initializer)) {
            // New object -> own<T>
            this.inferredQualifiers.set(key, { qualifier: 'own', elementType });
          } else {
            // Assignment from reference -> use<T>
            this.inferredQualifiers.set(key, { qualifier: 'use', elementType });
          }
        }
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
  }
  
  /**
   * Check if a type node is an unqualified class reference that needs ownership
   */
  private needsOwnershipQualifier(typeNode: ts.TypeNode, sourceFile: ts.SourceFile, checker: ts.TypeChecker): boolean {
    // Skip primitives
    if (typeNode.kind === ts.SyntaxKind.NumberKeyword || 
        typeNode.kind === ts.SyntaxKind.BooleanKeyword ||
        typeNode.kind === ts.SyntaxKind.StringKeyword) {
      return false;
    }
    
    // Check for already qualified types
    if (ts.isTypeReferenceNode(typeNode)) {
      const typeName = typeNode.typeName.getText(sourceFile);
      if (typeName === 'own' || typeName === 'share' || typeName === 'use' ||
          typeName === 'own' || typeName === 'share' || typeName === 'use') {
        return false;
      }
      
      // Check if it's a class
      const symbol = checker.getSymbolAtLocation(typeNode.typeName);
      if (symbol) {
        const declarations = symbol.getDeclarations();
        if (declarations && declarations.some(decl => ts.isClassDeclaration(decl))) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Extract the element type name from a type node
   */
  private extractElementType(typeNode: ts.TypeNode, sourceFile: ts.SourceFile): string | undefined {
    if (ts.isTypeReferenceNode(typeNode)) {
      return typeNode.typeName.getText(sourceFile);
    }
    return undefined;
  }
}
