/**
 * C++ Code Generation Utility Functions
 * 
 * Pure functions for working with C++ types, names, and code generation
 * that don't require the code generator's state or context.
 */

import * as ts from 'typescript';
import * as ast from './ast';

/**
 * Escape a name to be safe for use as a C++ identifier
 * 
 * Handles C++ keywords and Unicode characters by converting them
 * to safe alternatives.
 * 
 * @param name The identifier name to escape
 * @returns Escaped name safe for C++ use
 * @example
 * escapeName("class") → "class_"
 * escapeName("delete") → "delete_"
 * escapeName("café") → "caf_ue9_"
 */
export function escapeName(name: string): string {
  // C++ keywords and common macros that conflict
  const keywords = new Set([
    'class', 'namespace', 'template', 'EOF', 'delete', 'char', 'abstract',
    'union', 'operator', 'private', 'protected', 'public', 'virtual',
    'explicit', 'friend', 'inline', 'register', 'static', 'extern',
    'const', 'volatile', 'mutable', 'typename', 'typedef', 'using',
    'struct', 'enum', 'auto', 'void', 'int', 'double', 'float', 'bool',
    'short', 'long', 'signed', 'unsigned', 'char', 'wchar_t',
    'new', 'delete', 'this', 'nullptr', 'sizeof', 'alignof',
    'throw', 'try', 'catch', 'noexcept', 'default'
  ]);
  let result = keywords.has(name) ? name + '_' : name;
  
  // Sanitize Unicode characters to hex codes for portability
  // Convert non-ASCII characters to _uXXXX_ format
  result = result.replace(/[^\x00-\x7F]/g, (char) => {
    const code = char.charCodeAt(0);
    return `_u${code.toString(16)}_`;
  });
  
  return result;
}

/**
 * Escape a string for use as a C++ string literal
 * 
 * Handles backslashes, quotes, and control characters.
 * 
 * @param str The string to escape
 * @returns Escaped string content (without surrounding quotes)
 * @example
 * escapeString('hello\nworld') → 'hello\\nworld'
 * escapeString('say "hi"') → 'say \\"hi\\"'
 */
export function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')  // Backslash must be first
    .replace(/"/g, '\\"')     // Double quotes
    .replace(/\n/g, '\\n')    // Newline
    .replace(/\r/g, '\\r')    // Carriage return
    .replace(/\t/g, '\\t');   // Tab
}

/**
 * Check if a C++ type is a primitive type
 * 
 * Primitives are: double, int, bool, float, long, short
 * 
 * @param type The C++ type to check
 * @returns true if the type is a primitive
 */
export function isPrimitiveType(type: ast.CppType): boolean {
  const name = type.name;
  return name === 'double' || name === 'int' || name === 'bool' || 
         name === 'float' || name === 'long' || name === 'short';
}

/**
 * Check if a C++ type is a smart pointer
 * 
 * Smart pointers are: std::unique_ptr<T>, std::shared_ptr<T>, std::weak_ptr<T>
 * 
 * @param type The C++ type to check
 * @returns true if the type is a smart pointer
 */
export function isSmartPointerType(type: ast.CppType): boolean {
  const name = type.name;
  return name.startsWith('std::unique_ptr<') || 
         name.startsWith('std::shared_ptr<') || 
         name.startsWith('std::weak_ptr<');
}

/**
 * Check if a variable of the given type can be const in C++
 * 
 * Considers both the C++ type and the initializer expression to determine
 * if the variable should be marked as const.
 * 
 * Rules:
 * - Primitives (number, bool): yes
 * - Strings: yes (immutable in TypeScript)
 * - Arrays: no (mutable)
 * - Maps/Sets: no (mutable)
 * - Objects created with 'new': no (mutable)
 * - Other types: yes (default)
 * 
 * @param type The C++ type of the variable
 * @param initializer Optional TypeScript initializer expression
 * @returns true if the variable can be marked as const
 */
export function isConstableType(type: ast.CppType, initializer?: ts.Expression): boolean {
  const name = type.name;
  
  // Primitives are always constable
  if (isPrimitiveType(type)) {
    return true;
  }
  
  // Strings are constable (immutable in TypeScript)
  if (name === 'gs::String') {
    return true;
  }
  
  // Arrays are mutable - not constable
  if (name.startsWith('gs::Array<')) {
    return false;
  }
  
  // Maps and Sets are mutable - not constable
  if (name.startsWith('gs::Map<') || name.startsWith('gs::Set<')) {
    return false;
  }
  
  // If initialized with 'new', it's a mutable object - not constable
  if (initializer && ts.isNewExpression(initializer)) {
    return false;
  }
  
  // If type is 'auto', infer constability from initializer
  if (name === 'auto' && initializer) {
    // Function calls that return mutable containers should not be const
    if (ts.isCallExpression(initializer)) {
      // Conservatively assume function calls return mutable values
      // unless we know they return primitives/strings
      return false;
    }
    // Array literals are mutable
    if (ts.isArrayLiteralExpression(initializer)) {
      return false;
    }
    // Object literals are mutable
    if (ts.isObjectLiteralExpression(initializer)) {
      return false;
    }
    // Literals (numbers, strings, booleans, null) are constable
    if (ts.isNumericLiteral(initializer) || 
        ts.isStringLiteral(initializer) || 
        initializer.kind === ts.SyntaxKind.TrueKeyword ||
        initializer.kind === ts.SyntaxKind.FalseKeyword ||
        initializer.kind === ts.SyntaxKind.NullKeyword) {
      return true;
    }
    // Default for auto: not constable
    return false;
  }
  
  // Other cases: default to constable
  return true;
}
