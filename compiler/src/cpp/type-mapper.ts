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
    return this.mapTypeNode(node);
  }

  /**
   * Comprehensive type node mapping (handles undefined, unions, tuples, auto-wrapping, etc.)
   */
  mapTypeNode(node: ts.TypeNode | undefined): ast.CppType {
    // Handle undefined type (use auto)
    if (!node) {
      return new ast.CppType('auto');
    }

    // Handle parenthesized types: (E | undefined) → unwrap and process inner type
    if (ts.isParenthesizedTypeNode(node)) {
      return this.mapTypeNode(node.type);
    }

    // Handle function types: (a: number, b: string) => boolean
    // Maps to: std::function<bool(double, gs::String)>
    if (ts.isFunctionTypeNode(node)) {
      const returnType = this.mapTypeNode(node.type).toString();
      const paramTypes = node.parameters.map(p => {
        if (p.type) {
          return this.mapTypeNode(p.type).toString();
        }
        return 'auto';
      });
      return new ast.CppType(`std::function<${returnType}(${paramTypes.join(', ')})>`);
    }

    // Handle union types (T | null → std::optional<T>)
    if (ts.isUnionTypeNode(node)) {
      // Check if it's a nullable type (T | null | undefined)
      const nonNullableTypes = node.types.filter(t => {
        // Check for null keyword
        if (t.kind === ts.SyntaxKind.NullKeyword) return false;
        // Check for undefined keyword
        if (t.kind === ts.SyntaxKind.UndefinedKeyword) return false;
        // Check for literal null type
        if (ts.isLiteralTypeNode(t) && t.literal.kind === ts.SyntaxKind.NullKeyword) return false;
        return true;
      });
      
      if (nonNullableTypes.length === 1) {
        // T | null | undefined → std::optional<T>
        // BUT: If T is a smart pointer (shared_ptr, unique_ptr, weak_ptr), don't wrap in optional
        // because smart pointers can already be null
        // ALSO: If T is a user-defined class, it will be mapped to shared_ptr, so don't wrap
        const innerType = this.mapTypeNode(nonNullableTypes[0]);
        const innerTypeStr = innerType.toString();
        
        // Skip optional wrapping for smart pointers - they're already nullable
        // Check if the type STARTS with a smart pointer (not just contains one as a type argument)
        if (innerTypeStr.startsWith('std::shared_ptr<') || 
            innerTypeStr.startsWith('std::unique_ptr<') ||
            innerTypeStr.startsWith('std::weak_ptr<')) {
          return innerType;
        }
        
        // Check if inner type is a template parameter (e.g., E in E | undefined)
        // Template parameters should be wrapped in optional
        const innerTypeText = nonNullableTypes[0].getText?.() || '';
        const isTemplateParam = this.templateParameters?.has(innerTypeText);
        
        // Also skip optional wrapping for user-defined classes and interfaces
        // They're automatically wrapped in shared_ptr
        // BUT: don't skip for template parameters
        if (!isTemplateParam && this.checker && ts.isTypeReferenceNode(nonNullableTypes[0])) {
          const typeName = cppUtils.escapeName(nonNullableTypes[0].typeName.getText());
          
          // Check if it's an interface
          if (this.interfaceNames?.has(typeName)) {
            // Interface: return std::shared_ptr<gs::InterfaceName> (already nullable)
            return new ast.CppType(`std::shared_ptr<gs::${typeName}>`);
          }
          
          const type = this.checker.getTypeAtLocation(nonNullableTypes[0]);
          const symbol = type.getSymbol();
          if (symbol && (symbol.flags & ts.SymbolFlags.Class)) {
            // It's a class, so mapTypeNode will return std::shared_ptr<gs::T>
            // Return it unwrapped (already nullable)
            return innerType;
          }
        }
        
        return new ast.CppType('std::optional', [innerType]);
      }
      
      // Multiple non-null types - not supported, use auto
      return new ast.CppType('auto');
    }

    // Tuple types: [string, number] → std::pair<gs::String, double>
    // Or [T, U, V] → std::tuple<T, U, V> for 3+ elements
    if (ts.isTupleTypeNode(node)) {
      const elementTypes = node.elements.map(el => {
        // Named tuple elements have type member
        const elemType = (el as any).type || el;
        return this.mapTypeNode(elemType).toString();
      });
      
      if (elementTypes.length === 2) {
        // Use std::pair for 2-element tuples
        return new ast.CppType(`std::pair<${elementTypes[0]}, ${elementTypes[1]}>`);
      } else {
        // Use std::tuple for other sizes
        return new ast.CppType(`std::tuple<${elementTypes.join(', ')}>`);
      }
    }

    // Array types: number[] → gs::Array<double>
    // If element type is an interface, wrap in shared_ptr
    if (ts.isArrayTypeNode(node)) {
      const elementType = this.mapTypeNode(node.elementType);
      const elementTypeStr = elementType.toString();
      
      // Check if element type is an interface (need to use shared_ptr for polymorphism)
      const isInterface = ts.isTypeReferenceNode(node.elementType) && 
                          this.interfaceNames?.has(cppUtils.escapeName(node.elementType.typeName.getText()));
      
      if (isInterface) {
        return new ast.CppType(`gs::Array<std::shared_ptr<${elementTypeStr}>>`);
      }
      
      return new ast.CppType(`gs::Array<${elementTypeStr}>`);
    }

    // typeof expression (e.g., typeof A where A is a class)
    // This gets the constructor type, which for our purposes is just a template parameter
    // typeof A as a parameter type means "any type compatible with A's constructor"
    // In C++, we can use a template parameter or just ignore it (use auto)
    if (ts.isTypeQueryNode(node)) {
      // For conformance tests, typeof A in parameter position can just be auto
      // The actual value passed will be the class itself (not an instance)
      // In C++, this doesn't have a direct equivalent - we'll use a template
      return new ast.CppType('auto');
    }

    // Generic types: Map<K, V> → gs::Map<K, V>
    // Also handle ownership types: own<T>, share<T>, use<T>
    if (ts.isTypeReferenceNode(node) && node.typeArguments) {
      const baseName = node.typeName.getText();
      const typeArgs = node.typeArguments.map(arg => this.mapTypeNode(arg).toString());
      
      // Ownership types map to smart pointers
      if (baseName === 'own') {
        return new ast.CppType(`std::unique_ptr<${typeArgs[0]}>`);
      }
      if (baseName === 'share') {
        return new ast.CppType(`std::shared_ptr<${typeArgs[0]}>`);
      }
      if (baseName === 'use') {
        return new ast.CppType(`std::weak_ptr<${typeArgs[0]}>`);
      }
      
      // Promise<T> maps to cppcoro::task<T> (return type of async functions)
      // This should only appear in return type position
      if (baseName === 'Promise') {
        return new ast.CppType(`cppcoro::task<${typeArgs[0]}>`);
      }
      
      return new ast.CppType(`gs::${baseName}<${typeArgs.join(', ')}>`);
    }

    const text = node.getText();
    
    if (text === 'number') {
      return new ast.CppType('double');
    }
    
    if (text === 'string') {
      return new ast.CppType('gs::String');
    }
    
    if (text === 'boolean') {
      return new ast.CppType('bool');
    }
    
    if (text === 'void') {
      return new ast.CppType('void');
    }
    
    // TypeScript's 'never' type - represents impossible values
    // For array types, use gs::String as a safe placeholder (empty array will work with any type)
    if (text === 'never') {
      return new ast.CppType('gs::String');  // Safe placeholder for empty arrays
    }
    
    // User-defined types need gs:: prefix (unless they are template parameters)
    if (ts.isTypeReferenceNode(node)) {
      // Don't add gs:: prefix to template parameters like T, K, V
      if (this.templateParameters?.has(text)) {
        return new ast.CppType(text);
      }
      
      // If the type reference has NO type arguments (plain class name),
      // and it's a class, wrap in shared_ptr (default ownership)
      // BUT: don't do this if we're being called recursively from ownership type processing
      // We can detect this by checking if the parent is own<T>/share<T>/use<T>
      // ALSO: Don't wrap built-in value types (Array, Map, Set, String, etc.)
      const builtInValueTypes = ['Array', 'Map', 'Set', 'String', 'RegExp', 'Date', 'Promise'];
      const parent = node.parent;
      const shouldAutoWrap = !node.typeArguments && 
                             !builtInValueTypes.includes(text) &&  // Don't wrap value types
                             !(parent && ts.isTypeReferenceNode(parent) && 
                               ['own', 'share', 'use'].includes(parent.typeName.getText()));
      
      if (shouldAutoWrap && this.checker) {
        const type = this.checker.getTypeAtLocation(node);
        const symbol = type.getSymbol();
        // Check if it's a class (not a primitive or built-in type)
        if (symbol && (symbol.flags & ts.SymbolFlags.Class)) {
          return new ast.CppType(`std::shared_ptr<gs::${text}>`);
        }
      }
      
      return new ast.CppType(`gs::${text}`);
    }
    
    return new ast.CppType(text);
  }

  /**
   * Map a TypeScript type node to C++ type
   */
  mapTsNodeTypeOld(node: ts.TypeNode): ast.CppType {
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
        p.type ? this.adjustFunctionParameterType(this.mapTsNodeType(p.type)) : 'double'
      );
      return new ast.CppType(`std::function<${returnType.toString()}(${paramTypes.join(', ')})>`);
    }

    // Default: auto
    return new ast.CppType('auto');
  }

  /**
   * Adjust parameter type for std::function template
   * Interfaces and abstract classes must be passed by const reference
   */
  private adjustFunctionParameterType(cppType: ast.CppType): string {
    const typeStr = cppType.toString();
    
    // Extract base type name (strip gs:: prefix, template args, etc.)
    const baseTypeName = typeStr
      .replace(/^gs::/, '')
      .replace(/<.*$/, '')
      .trim();
    
    // Check if this is an interface type
    const isInterface = this.interfaceNames?.has(baseTypeName) ?? false;
    
    // Interfaces must be passed by const reference
    if (isInterface) {
      return `const ${typeStr}&`;
    }
    
    return typeStr;
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

    // Handle tuple types: [string, number] → std::pair<gs::String, double>
    // Or [T, U, V] → std::tuple<T, U, V> for 3+ elements
    if (tsType.startsWith('[') && tsType.endsWith(']')) {
      const inner = tsType.slice(1, -1);
      const elements = this.splitTypeArguments(inner);
      const mappedElements = elements.map(el => this.mapTypeScriptTypeToCpp(el.trim()));
      
      if (mappedElements.length === 2) {
        return `std::pair<${mappedElements[0]}, ${mappedElements[1]}>`;
      } else if (mappedElements.length > 0) {
        return `std::tuple<${mappedElements.join(', ')}>`;
      }
      // Empty tuple is treated as void
      return 'void';
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
        
        // Ownership types: own<T>, share<T>, use<T>
        if (baseType === 'own' && mappedArgs.length === 1) {
          const innerType = mappedArgs[0];
          // Don't add gs:: if already present
          const fullType = innerType.startsWith('gs::') ? innerType : `gs::${innerType}`;
          return `std::unique_ptr<${fullType}>`;
        }
        if (baseType === 'share' && mappedArgs.length === 1) {
          const innerType = mappedArgs[0];
          const fullType = innerType.startsWith('gs::') ? innerType : `gs::${innerType}`;
          return `std::shared_ptr<${fullType}>`;
        }
        if (baseType === 'use' && mappedArgs.length === 1) {
          const innerType = mappedArgs[0];
          const fullType = innerType.startsWith('gs::') ? innerType : `gs::${innerType}`;
          return `std::weak_ptr<${fullType}>`;
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
