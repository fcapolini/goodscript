import * as ts from 'typescript';

/**
 * TypeScript Code Generator
 * 
 * Transforms GoodScript AST to plain TypeScript by removing ownership annotations.
 * Strategy: Remove unique<T>, shared<T>, weak<T> wrappers while preserving all other TypeScript syntax.
 */
export class TypeScriptCodegen {
  /**
   * Generate TypeScript code from a GoodScript AST
   */
  generate(sourceFile: ts.SourceFile): string {
    const transformed = this.transformSourceFile(sourceFile);
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    return printer.printFile(transformed);
  }

  /**
   * Transform the source file, removing ownership annotations
   */
  private transformSourceFile(sourceFile: ts.SourceFile): ts.SourceFile {
    const transformer = <T extends ts.Node>(context: ts.TransformationContext) => {
      return (rootNode: T): T => {
        const visit = (node: ts.Node): ts.Node => {
          // Transform type nodes to remove unique<T>, shared<T>, weak<T>
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
   * Transform type reference nodes, removing ownership wrappers (unique<T>, shared<T>, weak<T>)
   */
  private transformTypeReference(
    node: ts.TypeReferenceNode,
    visit: (node: ts.Node) => ts.Node
  ): ts.TypeNode {
    const typeName = node.typeName.getText();

    // If this is unique<T> or shared<T>, extract T and return it
    if ((typeName === 'unique' || typeName === 'shared') && 
        node.typeArguments && node.typeArguments.length === 1) {
      const innerType = node.typeArguments[0];
      // Recursively transform the inner type in case it's also wrapped
      return visit(innerType) as ts.TypeNode;
    }

    // If this is weak<T>, extract T and make it nullable (T | null | undefined)
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
