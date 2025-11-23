import * as ts from 'typescript';

/**
 * TypeScript Code Generator
 * 
 * Transforms GoodScript AST to plain TypeScript by removing ownership annotations.
 * Strategy: Remove Unique<T>, Shared<T>, Weak<T> wrappers while preserving all other TypeScript syntax.
 */
export class TypeScriptCodegen {
  /**
   * Type declarations to inject when ownership types are used
   */
  private static readonly TYPE_DECLARATIONS = `/**
 * GoodScript ownership type declarations
 * These are automatically injected by the compiler when needed
 */
declare type own<T> = T;
declare type share<T> = T;
declare type use<T> = T | null | undefined;

`;

  /**
   * Generate TypeScript code from a GoodScript AST
   */
  generate(sourceFile: ts.SourceFile): string {
    const transformed = this.transformSourceFile(sourceFile);
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    let code = printer.printFile(transformed);
    
    // Check if the file uses ownership types
    if (this.usesOwnershipTypes(sourceFile)) {
      // Prepend type declarations if not already present
      if (!code.includes('declare type own<T>') && 
          !code.includes('declare type share<T>') &&
          !code.includes('declare type use<T>')) {
        code = TypeScriptCodegen.TYPE_DECLARATIONS + code;
      }
    }
    
    return code;
  }
  
  /**
   * Check if the source file uses ownership types (own, share, use)
   */
  private usesOwnershipTypes(sourceFile: ts.SourceFile): boolean {
    let hasOwnershipTypes = false;
    
    const visit = (node: ts.Node): void => {
      if (ts.isTypeReferenceNode(node)) {
        const typeName = node.typeName.getText();
        if (typeName === 'own' || typeName === 'share' || typeName === 'use') {
          hasOwnershipTypes = true;
          return; // Early exit
        }
      }
      
      if (!hasOwnershipTypes) {
        ts.forEachChild(node, visit);
      }
    };
    
    visit(sourceFile);
    return hasOwnershipTypes;
  }

  /**
   * Transform the source file, removing ownership annotations
   */
  private transformSourceFile(sourceFile: ts.SourceFile): ts.SourceFile {
    const transformer = <T extends ts.Node>(context: ts.TransformationContext) => {
      return (rootNode: T): T => {
        const visit = (node: ts.Node): ts.Node => {
          // Transform type nodes to remove Unique<T>, Shared<T>, Weak<T>
          if (ts.isTypeReferenceNode(node)) {
            return this.transformTypeReference(node, visit);
          }

          // Transform union types that might contain ownership annotations
          if (ts.isUnionTypeNode(node)) {
            return this.transformUnionType(node, visit);
          }

          // Transform array types
          if (ts.isArrayTypeNode(node)) {
            return this.transformArrayType(node, visit);
          }

          // Recursively visit all child nodes
          return ts.visitEachChild(node, visit, context);
        };

        return ts.visitNode(rootNode, visit) as T;
      };
    };

    const result = ts.transform(sourceFile, [transformer]);
    const transformedSourceFile = result.transformed[0] as ts.SourceFile;
    result.dispose();
    return transformedSourceFile;
  }

  /**
   * Transform type reference nodes, removing ownership wrappers (Unique<T>, Shared<T>, Weak<T>)
   */
  private transformTypeReference(
    node: ts.TypeReferenceNode,
    visit: (node: ts.Node) => ts.Node
  ): ts.TypeNode {
    const typeName = node.typeName.getText();

    // If this is Unique<T> or Shared<T>, extract T and return it
    if ((typeName === 'unique' || typeName === 'shared') && 
        node.typeArguments && node.typeArguments.length === 1) {
      const innerType = node.typeArguments[0];
      // Recursively transform the inner type in case it's also wrapped
      return visit(innerType) as ts.TypeNode;
    }

    // If this is Weak<T>, extract T and make it nullable (T | null | undefined)
    // This allows GoodScript to treat null and undefined as synonyms
    if (typeName === 'weak' && node.typeArguments && node.typeArguments.length === 1) {
      const innerType = visit(node.typeArguments[0]) as ts.TypeNode;
      return ts.factory.createUnionTypeNode([
        innerType,
        ts.factory.createLiteralTypeNode(ts.factory.createNull()),
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword)
      ]);
    }

    // Otherwise, visit children normally (in case type arguments contain ownership wrappers)
    if (node.typeArguments) {
      const transformedArgs = ts.factory.createNodeArray(
        node.typeArguments.map(arg => visit(arg) as ts.TypeNode)
      );
      return ts.factory.updateTypeReferenceNode(
        node,
        node.typeName,
        transformedArgs
      );
    }

    return node;
  }

  /**
   * Transform union types, removing ownership annotations from members
   */
  private transformUnionType(
    node: ts.UnionTypeNode,
    visit: (node: ts.Node) => ts.Node
  ): ts.TypeNode {
    const transformedTypes = ts.factory.createNodeArray(
      node.types.map(t => visit(t) as ts.TypeNode)
    );
    return ts.factory.updateUnionTypeNode(node, transformedTypes);
  }

  /**
   * Transform array types, removing ownership annotations from element type
   */
  private transformArrayType(
    node: ts.ArrayTypeNode,
    visit: (node: ts.Node) => ts.Node
  ): ts.TypeNode {
    const transformedElementType = visit(node.elementType) as ts.TypeNode;
    return ts.factory.updateArrayTypeNode(node, transformedElementType);
  }
}
