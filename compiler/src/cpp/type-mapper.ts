/**
 * C++ Type Mapping Service
 * 
 * Centralizes all TypeScript → C++ type mapping logic.
 */

import * as ts from 'typescript';
import * as ast from './ast';
import * as cppUtils from './cpp-utils';

export class CppTypeMapper {
  private readonly builtInValueTypes = new Set(['Map', 'Array', 'Set', 'String', 'RegExp', 'Date', 'Promise']);
  private readonly primitiveTypeMap = new Map<string, string>([
    ['number', 'double'],
    ['string', 'gs::String'],
    ['boolean', 'bool'],
    ['void', 'void'],
    ['any', 'auto'],
    ['unknown', 'auto'],
    ['never', 'void'],
  ]);

  constructor(
    private checker?: ts.TypeChecker,
    private interfaceNames?: Set<string>,
    private templateParameters?: Set<string>
  ) {}

  /**
   * Map a TypeScript type node to C++ type
   */
  mapTsNodeType(node: ts.TypeNode): ast.CppType {
    // Handle primitive types
    if (ts.isToken(node)) {
      const kind = node.kind;
      if (kind === ts.SyntaxKind.NumberKeyword) return new ast.CppType('double');
      if (kind === ts.SyntaxKind.StringKeyword) return new ast.CppType('gs::String');
      if (kind === ts.SyntaxKind.BooleanKeyword) return new ast.CppType('bool');
      if (kind === ts.SyntaxKind.VoidKeyword) return new ast.CppType('void');
      if (kind === ts.SyntaxKind.AnyKeyword) return new ast.CppType('auto');
      if (kind === ts.SyntaxKind.UnknownKeyword) return new ast.CppType('auto');
      if (kind === ts.SyntaxKind.NeverKeyword) return new ast.CppType('void');
    }

    // Handle array types: T[] or Array<T>
    if (ts.isArrayTypeNode(node)) {
      const elementType = this.mapTsNodeType(node.elementType);
      return new ast.CppType(`gs::Array<${elementType.toString()}>`);
    }

    // Handle type references (Map<K,V>, Set<T>, custom classes, etc.)
    if (ts.isTypeReferenceNode(node)) {
      const typeName = node.typeName.getText();
      
      // Check if it's a template parameter
      if (this.templateParameters?.has(typeName)) {
        return new ast.CppType(typeName);
      }

      // Handle generic types with type arguments
      if (node.typeArguments) {
        const baseType = cppUtils.escapeName(typeName);
        const typeArgs = node.typeArguments.map(arg => this.mapTsNodeType(arg).toString());
        
        // Special handling for built-in generic types
        if (typeName === 'Array') {
          return new ast.CppType(`gs::Array<${typeArgs[0]}>`);
        }
        if (typeName === 'Map') {
          return new ast.CppType(`gs::Map<${typeArgs[0]}, ${typeArgs[1]}>`);
        }
        if (typeName === 'Set') {
          return new ast.CppType(`gs::Set<${typeArgs[0]}>`);
        }
        if (typeName === 'Promise') {
          return new ast.CppType(`cppcoro::task<${typeArgs[0]}>`);
        }
        
        // Ownership types: own<T>, share<T>, use<T>
        if (typeName === 'own' && typeArgs.length === 1) {
          const innerType = typeArgs[0];
          // Don't add gs:: if already present
          const fullType = innerType.startsWith('gs::') ? innerType : `gs::${innerType}`;
          return new ast.CppType(`std::unique_ptr<${fullType}>`);
        }
        if (typeName === 'share' && typeArgs.length === 1) {
          const innerType = typeArgs[0];
          const fullType = innerType.startsWith('gs::') ? innerType : `gs::${innerType}`;
          return new ast.CppType(`std::shared_ptr<${fullType}>`);
        }
        if (typeName === 'use' && typeArgs.length === 1) {
          const innerType = typeArgs[0];
          const fullType = innerType.startsWith('gs::') ? innerType : `gs::${innerType}`;
          return new ast.CppType(`std::weak_ptr<${fullType}>`);
        }
        
        // Custom generic types
        return new ast.CppType(`gs::${baseType}<${typeArgs.join(', ')}>`);
      }

      // Non-generic type reference
      return new ast.CppType(this.mapTypeScriptTypeToCpp(typeName));
    }

    // Handle union types (T | null, T | undefined)
    if (ts.isUnionTypeNode(node)) {
      // Find the non-null/undefined type
      const nonNullType = node.types.find(t => 
        t.kind !== ts.SyntaxKind.NullKeyword && 
        t.kind !== ts.SyntaxKind.UndefinedKeyword
      );
      
      if (nonNullType) {
        const baseType = this.mapTsNodeType(nonNullType);
        // Wrap in std::optional for nullable types
        return new ast.CppType(`std::optional<${baseType.toString()}>`);
      }
    }

    // Handle function types
    if (ts.isFunctionTypeNode(node)) {
      const returnType = node.type ? this.mapTsNodeType(node.type) : new ast.CppType('void');
      const paramTypes = node.parameters.map(p => 
        p.type ? this.mapTsNodeType(p.type).toString() : 'double'
      );
      return new ast.CppType(`std::function<${returnType.toString()}(${paramTypes.join(', ')})>`);
    }

    // Default: auto
    return new ast.CppType('auto');
  }

  /**
   * Map TypeScript type string to C++ type string
   */
  mapTypeScriptTypeToCpp(tsType: string): string {
    // Handle empty object type (often inferred for unknown)
    // In async contexts, we should use 'auto' to let compiler deduce from co_return
    // But this method is context-free, so caller should handle async case
    if (tsType === '{}') {
      return 'auto';  // Use auto for type inference
    }

    // Handle primitive types
    const primitive = this.primitiveTypeMap.get(tsType);
    if (primitive) return primitive;

    // Template parameter
    if (this.templateParameters?.has(tsType)) {
      return tsType;
    }

    // Handle generic types
    if (tsType.includes('<')) {
      const match = tsType.match(/^([^<]+)<(.+)>$/);
      if (match) {
        const baseType = match[1].trim();
        const typeArgs = this.splitTypeArguments(match[2]);
        const mappedArgs = typeArgs.map(arg => this.mapTypeScriptTypeToCpp(arg.trim()));
        
        if (baseType === 'Array') {
          return `gs::Array<${mappedArgs[0]}>`;
        }
        if (baseType === 'Map') {
          return `gs::Map<${mappedArgs[0]}, ${mappedArgs[1]}>`;
        }
        if (baseType === 'Set') {
          return `gs::Set<${mappedArgs[0]}>`;
        }
        if (baseType === 'Promise') {
          return `cppcoro::task<${mappedArgs[0]}>`;
        }
        
        // Custom generic type
        return `gs::${cppUtils.escapeName(baseType)}<${mappedArgs.join(', ')}>`;
      }
    }

    // Interface or custom type - add gs:: namespace
    return `gs::${cppUtils.escapeName(tsType)}`;
  }

  /**
   * Create smart pointer type based on ownership
   */
  mapOwnershipType(ownership: 'own' | 'share' | 'use', baseType: string): ast.CppType {
    const escapedType = cppUtils.escapeName(baseType);
    
    if (ownership === 'own') {
      return new ast.CppType(`std::unique_ptr<gs::${escapedType}>`);
    }
    if (ownership === 'share') {
      return new ast.CppType(`std::shared_ptr<gs::${escapedType}>`);
    }
    // ownership === 'use'
    return new ast.CppType(`std::weak_ptr<gs::${escapedType}>`);
  }

  /**
   * Check if a class name is a built-in value type (not wrapped in smart pointers)
   */
  isBuiltInValueType(className: string): boolean {
    const baseClassName = className.split('<')[0];
    return this.builtInValueTypes.has(baseClassName);
  }

  /**
   * Check if a type is primitive (number, string, boolean)
   */
  isPrimitiveType(type: ast.CppType): boolean {
    const typeStr = type.toString();
    return typeStr === 'double' || 
           typeStr === 'gs::String' || 
           typeStr === 'bool' ||
           typeStr === 'int' ||
           typeStr === 'size_t';
  }

  /**
   * Check if a type should be const in C++
   * (primitives yes, containers no - they're mutable even when TypeScript const)
   */
  isConstableType(type: ast.CppType): boolean {
    const typeStr = type.toString();
    return !typeStr.startsWith('gs::Array<') && 
           !typeStr.startsWith('gs::Map<') && 
           !typeStr.startsWith('gs::Set<') &&
           !typeStr.startsWith('std::unique_ptr<') &&
           !typeStr.startsWith('std::shared_ptr<');
  }

  /**
   * Split type arguments respecting nested generics
   * "Map<string, Array<number>>" → ["Map<string, Array<number>>"]
   */
  private splitTypeArguments(args: string): string[] {
    const result: string[] = [];
    let current = '';
    let depth = 0;
    
    for (let i = 0; i < args.length; i++) {
      const ch = args[i];
      if (ch === '<') {
        depth++;
        current += ch;
      } else if (ch === '>') {
        depth--;
        current += ch;
      } else if (ch === ',' && depth === 0) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    
    if (current.trim()) {
      result.push(current.trim());
    }
    
    return result;
  }
}
