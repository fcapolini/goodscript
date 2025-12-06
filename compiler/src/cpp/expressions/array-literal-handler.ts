/**
 * Array Literal Handler
 * 
 * Handles array literal expressions with tuple detection and element type inference.
 */

import * as ts from 'typescript';
import * as ast from '../ast';
import { cpp } from '../builder';
import { TransformContext } from '../transform-context';
import { CppTypeMapper } from '../type-mapper';

export class ArrayLiteralHandler {
  constructor(
    private checker: ts.TypeChecker | undefined,
    private ctx: TransformContext,
    private typeMapper: CppTypeMapper,
    private visitExpression: (node: ts.Expression) => ast.Expression,
    private mapTypeScriptTypeToCpp: (tsType: string) => string,
    private getOwnershipTypeForNew: (node: ts.NewExpression) => 'unique' | 'shared'
  ) {}

  /**
   * Handle array literal expressions: [1, 2, 3] or tuples [x, y]
   */
  handleArrayLiteral(node: ts.ArrayLiteralExpression): ast.Expression {
    const elements = node.elements.map(el => this.visitExpression(el));
    
    // Check if this is a tuple literal based on context
    if (this.checker) {
      const type = this.checker.getTypeAtLocation(node);
      const typeStr = this.checker.typeToString(type);
      
      // Detect tuple type: [string, number] or [T, U, V, ...]
      // TypeChecker represents tuples as "[string, number]" in typeToString
      if (typeStr.startsWith('[') && typeStr.endsWith(']') && !typeStr.endsWith('[]')) {
        return this.handleTupleLiteral(elements);
      }
    }
    
    // Not a tuple - handle as regular array
    const elementType = this.inferElementType(node, elements);
    
    // Generate gs::Array<T>({...}) with explicit template parameter if we know the type
    // This prevents type inference issues with int vs double literals
    // Note: if elementType is still 'auto', omit it (can't use auto as template arg)
    const arrayType = (elementType && elementType !== 'auto') ? `gs::Array<${elementType}>` : 'gs::Array';
    
    // Special case: empty array → gs::Array<T>() instead of gs::Array<T>({})
    // The latter can't deduce template types in C++
    if (elements.length === 0) {
      return cpp.call(cpp.id(arrayType), []);
    }
    
    return cpp.call(cpp.id(arrayType), [cpp.initList(elements)]);
  }

  /**
   * Handle tuple literals: [x, y] → std::make_pair or std::make_tuple
   */
  private handleTupleLiteral(elements: ast.Expression[]): ast.Expression {
    if (elements.length === 2) {
      // Use std::make_pair for 2-element tuples
      return cpp.call(cpp.id('std::make_pair'), elements);
    } else {
      // Use std::make_tuple for other sizes
      return cpp.call(cpp.id('std::make_tuple'), elements);
    }
  }

  /**
   * Infer element type for array literal using TypeChecker
   */
  private inferElementType(
    node: ts.ArrayLiteralExpression, 
    elements: ast.Expression[]
  ): string | undefined {
    if (!this.checker) {
      return undefined;
    }

    // NEW: For empty arrays in assignment context, try to get type from variable
    // This handles: let list = map.get(k); if (...) { list = []; }
    // where contextual type might not propagate correctly
    if (elements.length === 0) {
      const elementTypeFromAssignment = this.tryInferFromAssignmentTarget(node);
      if (elementTypeFromAssignment) {
        return elementTypeFromAssignment;
      }
    }

    // First try contextual type (e.g., from assignment target)
    // This is crucial for empty arrays: const items: T[] = []
    let type = this.checker.getContextualType(node);
    let typeStr = type ? this.checker.typeToString(type) : undefined;
    
    // If no contextual type, use the literal's own type
    if (!type || !typeStr) {
      type = this.checker.getTypeAtLocation(node);
      typeStr = this.checker.typeToString(type);
    }
    
    let elementType: string | undefined;
    
    // Extract element type from type string like "number[]" or "Array<number>"
    if (typeStr.endsWith('[]')) {
      elementType = this.inferFromArraySuffix(node, typeStr);
    } else if (typeStr.startsWith('Array<')) {
      elementType = this.inferFromArrayGeneric(typeStr);
    }
    
    // Also try to get type arguments from type reference
    if (!elementType && (type as any).target) {
      elementType = this.inferFromTypeReference(type);
    }
    
    // NEW: If elements are new expressions creating class instances,
    // the element type should be the smart pointer type (unique_ptr or shared_ptr)
    if (!elementType && elements.length > 0 && node.elements[0] && ts.isNewExpression(node.elements[0])) {
      elementType = this.inferFromNewExpression(node.elements[0]);
    }
    
    // Special case: if element type is 'auto' (from TypeScript 'any'), and we're in a generic class,
    // use the template parameter with std::optional (common pattern for nullable element arrays)
    if (elementType === 'auto' && this.ctx.templateParameters.size > 0) {
      // Get the first template parameter (usually 'E' or 'T')
      const firstParam = Array.from(this.ctx.templateParameters)[0];
      elementType = `std::optional<${firstParam}>`;
    }
    
    return elementType;
  }

  /**
   * Infer element type from "Type[]" syntax
   */
  private inferFromArraySuffix(node: ts.ArrayLiteralExpression, typeStr: string): string | undefined {
    const baseType = typeStr.slice(0, -2);
    
    // Check if the base type is an anonymous object type { ... }
    if (baseType.startsWith('{') && baseType.includes(';')) {
      // Try to get the contextual type which might have the named interface
      const contextualType = this.checker!.getContextualType(node);
      if (contextualType && (contextualType as any).target) {
        const typeRef = contextualType as ts.TypeReference;
        const typeArgs = this.checker!.getTypeArguments(typeRef);
        if (typeArgs && typeArgs.length > 0) {
          const argStr = this.checker!.typeToString(typeArgs[0]);
          // Check if argStr is a named type (not anonymous)
          if (!argStr.startsWith('{') && !argStr.includes(';')) {
            return this.typeMapper.mapTypeScriptTypeToCpp(argStr);
          }
        }
      }
      
      // If we couldn't find a named type, try to infer from first element
      if (node.elements.length > 0 && node.elements[0] && ts.isObjectLiteralExpression(node.elements[0])) {
        const firstElem = node.elements[0];
        const elemContextualType = this.checker!.getContextualType(firstElem);
        if (elemContextualType) {
          const elemTypeStr = this.checker!.typeToString(elemContextualType);
          if (!elemTypeStr.startsWith('{') && !elemTypeStr.includes(';')) {
            return this.typeMapper.mapTypeScriptTypeToCpp(elemTypeStr);
          }
        }
      }
      
      return undefined;
    } else {
      // Regular type like "number" or "Person"
      // Check if the base type is a class - if so, wrap in shared_ptr
      // because all class instances in GoodScript are shared_ptr by default
      let elementType = this.typeMapper.mapTypeScriptTypeToCpp(baseType);
      
      // If element type is a class (starts with gs:: and isn't a built-in like gs::String/Array/Map/Set),
      // it needs to be wrapped in shared_ptr
      if (this.checker && elementType.startsWith('gs::')) {
        const className = baseType;
        // Check if it's a built-in value type (String, Array, Map, Set, RegExp, Date, Promise)
        const builtInValueTypes = ['String', 'Array', 'Map', 'Set', 'RegExp', 'Date', 'Promise'];
        if (!builtInValueTypes.includes(className)) {
          // Try to find the type symbol to check if it's a class
          const sourceFile = node.getSourceFile();
          const classDecl = sourceFile.statements.find(stmt => 
            ts.isClassDeclaration(stmt) && stmt.name?.text === className
          );
          // Also check if it's in interface names (interfaces also need shared_ptr)
          const isInterface = this.ctx.interfaceNames.has(className);
          
          if (classDecl || isInterface) {
            elementType = `std::shared_ptr<${elementType}>`;
          }
        }
      }
      
      return elementType;
    }
  }

  /**
   * Infer element type from "Array<Type>" syntax
   */
  private inferFromArrayGeneric(typeStr: string): string | undefined {
    const match = typeStr.match(/^Array<(.+)>$/);
    if (match) {
      return this.typeMapper.mapTypeScriptTypeToCpp(match[1]);
    }
    return undefined;
  }

  /**
   * Infer element type from TypeReference type arguments
   */
  private inferFromTypeReference(type: ts.Type): string | undefined {
    const typeRef = type as ts.TypeReference;
    const typeArgs = this.checker!.getTypeArguments(typeRef);
    if (typeArgs && typeArgs.length > 0) {
      const argStr = this.checker!.typeToString(typeArgs[0]);
      return this.mapTypeScriptTypeToCpp(argStr);
    }
    return undefined;
  }

  /**
   * For empty arrays, try to infer element type from assignment target variable
   * Handles: let list = map.get(k); if (...) { list = []; }
   */
  private tryInferFromAssignmentTarget(node: ts.ArrayLiteralExpression): string | undefined {
    // Check if parent is a binary expression (assignment)
    const parent = node.parent;
    if (!parent || !ts.isBinaryExpression(parent) || 
        parent.operatorToken.kind !== ts.SyntaxKind.EqualsToken ||
        parent.right !== node) {
      return undefined;
    }

    // Get the left-hand side (variable being assigned to)
    const leftSide = parent.left;
    if (!ts.isIdentifier(leftSide)) {
      return undefined;
    }

    // Look up the variable's type from TypeChecker
    const variableSymbol = this.checker!.getSymbolAtLocation(leftSide);
    if (!variableSymbol || !variableSymbol.valueDeclaration) {
      return undefined;
    }

    // Get the declared type
    const varType = this.checker!.getTypeAtLocation(variableSymbol.valueDeclaration);
    const varTypeStr = this.checker!.typeToString(varType);

    // Extract element type: S[] | undefined → S, Array<S> | undefined → S
    // Handle union types with undefined/null
    const parts = varTypeStr.split(' | ').map(p => p.trim());
    const arrayPart = parts.find(p => p.endsWith('[]') || p.startsWith('Array<'));
    
    if (!arrayPart) {
      return undefined;
    }

    if (arrayPart.endsWith('[]')) {
      const elementTypeStr = arrayPart.slice(0, -2);
      return this.mapTypeScriptTypeToCpp(elementTypeStr);
    } else if (arrayPart.startsWith('Array<')) {
      const match = arrayPart.match(/^Array<(.+)>$/);
      if (match) {
        return this.mapTypeScriptTypeToCpp(match[1]);
      }
    }

    return undefined;
  }

  /**
   * Infer element type from new expression (creates smart pointer type)
   */
  private inferFromNewExpression(firstNew: ts.NewExpression): string | undefined {
    const className = firstNew.expression.getText();
    const ownershipType = this.getOwnershipTypeForNew(firstNew);
    if (ownershipType === 'unique') {
      return `std::unique_ptr<gs::${className}>`;
    } else {
      return `std::shared_ptr<gs::${className}>`;
    }
  }
}
