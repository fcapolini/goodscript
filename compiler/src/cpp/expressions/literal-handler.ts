/**
 * Literal Handler
 * 
 * Handles literal expressions: numeric, string, regex, boolean, null, this.
 */

import * as ts from 'typescript';
import * as ast from '../ast';
import { cpp } from '../builder';
import * as cppUtils from '../cpp-utils';

export class LiteralHandler {
  /**
   * Handle literal expressions
   * Returns undefined if the node is not a literal
   */
  handleLiteral(node: ts.Expression): ast.Expression | undefined {
    if (ts.isNumericLiteral(node)) {
      // For numeric literals, create a raw identifier with the number value
      return cpp.id(node.text);
    }
    
    if (ts.isStringLiteral(node)) {
      // String literal already contains the text without quotes
      // We need to add quotes and escape
      const escaped = cppUtils.escapeString(node.text);
      return cpp.call(
        cpp.id('gs::String'),
        [cpp.id(`"${escaped}"`)] // Use id() not literal() to avoid double-quoting
      );
    }
    
    // Handle regular expression literals: /pattern/flags
    if (node.kind === ts.SyntaxKind.RegularExpressionLiteral) {
      const regexText = node.getText();
      // Parse /pattern/flags
      const lastSlash = regexText.lastIndexOf('/');
      const pattern = regexText.substring(1, lastSlash);
      const flags = regexText.substring(lastSlash + 1);
      
      // Use raw string literal for pattern to avoid escaping issues
      // R"(pattern)" syntax handles most regex patterns without escaping
      const args: ast.Expression[] = [cpp.id(`R"(${pattern})"`)];
      
      // Add flags if present
      if (flags) {
        args.push(cpp.id(`"${flags}"`));
      }
      
      return cpp.call(cpp.id('gs::RegExp'), args);
    }
    
    if (node.kind === ts.SyntaxKind.TrueKeyword) {
      return cpp.id('true');
    }
    
    if (node.kind === ts.SyntaxKind.FalseKeyword) {
      return cpp.id('false');
    }
    
    if (node.kind === ts.SyntaxKind.NullKeyword) {
      return cpp.id('nullptr');
    }
    
    if (node.kind === ts.SyntaxKind.ThisKeyword) {
      return cpp.id('this');
    }
    
    // Not a literal
    return undefined;
  }
}
