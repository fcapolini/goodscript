import * as vscode from 'vscode';

/**
 * Code Action Provider for GoodScript
 * Provides quick fixes for common errors, especially ownership qualifiers
 */
export class GoodScriptCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix
  ];

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.CodeAction[] | undefined {
    const actions: vscode.CodeAction[] = [];

    // Handle GS303: Missing ownership annotation
    const gs303Diagnostics = context.diagnostics.filter(d => d.code === 'GS303');
    for (const diagnostic of gs303Diagnostics) {
      actions.push(...this.createOwnershipQuickFixes(document, diagnostic));
    }

    return actions.length > 0 ? actions : undefined;
  }

  /**
   * Create quick fix actions for GS303 (naked class reference)
   * Offers to wrap the type with own<T>, share<T>, or use<T>
   */
  private createOwnershipQuickFixes(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];
    const range = diagnostic.range;
    
    // Extract the type name from the diagnostic range
    // The diagnostic should be on the type reference (e.g., "Node" in "next: Node")
    const line = document.lineAt(range.start.line);
    const typeName = this.extractTypeNameFromLine(line.text, range);
    
    if (!typeName) {
      return actions;
    }

    // Create three quick fix options
    actions.push(this.createOwnershipQuickFix(
      document,
      diagnostic,
      typeName,
      'own',
      '🔒 Exclusive ownership (unique_ptr) - single owner, moved on assignment'
    ));

    actions.push(this.createOwnershipQuickFix(
      document,
      diagnostic,
      typeName,
      'share',
      '🔗 Shared ownership (shared_ptr) - reference counted, multiple owners'
    ));

    actions.push(this.createOwnershipQuickFix(
      document,
      diagnostic,
      typeName,
      'use',
      '👁️ Non-owning reference (weak_ptr) - doesn\'t extend lifetime, breaks cycles'
    ));

    return actions;
  }

  /**
   * Extract the type name from a line of code at the given range
   * Handles patterns like: "field: TypeName | null" or "field: TypeName[]"
   */
  private extractTypeNameFromLine(lineText: string, range: vscode.Range): string | null {
    // Get the text at the diagnostic range
    const beforeRange = lineText.substring(0, range.start.character);
    const afterRange = lineText.substring(range.start.character);
    
    // Find the type annotation (after the colon)
    const colonMatch = beforeRange.match(/:\s*$/);
    if (!colonMatch) {
      // Try to extract from the range itself
      const text = lineText.substring(range.start.character, range.end.character);
      const typeMatch = text.match(/^([A-Z][a-zA-Z0-9]*)/);
      return typeMatch ? typeMatch[1] : null;
    }

    // Extract the type name (handle arrays, unions, etc.)
    const typeMatch = afterRange.match(/^([A-Z][a-zA-Z0-9]*)/);
    return typeMatch ? typeMatch[1] : null;
  }

  /**
   * Create a single quick fix action for a specific ownership qualifier
   */
  private createOwnershipQuickFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    typeName: string,
    qualifier: 'own' | 'share' | 'use',
    description: string
  ): vscode.CodeAction {
    // Include description in the title for better UX
    const title = qualifier === 'own' 
      ? `🔒 Wrap with own<${typeName}> (exclusive ownership)`
      : qualifier === 'share'
      ? `🔗 Wrap with share<${typeName}> (shared ownership)` 
      : `👁️ Wrap with use<${typeName}> (non-owning reference)`;
    
    const action = new vscode.CodeAction(
      title,
      vscode.CodeActionKind.QuickFix
    );
    
    action.diagnostics = [diagnostic];
    action.isPreferred = qualifier === 'share'; // Default to share<T> as most common
    
    // Create the edit to wrap the type
    const edit = new vscode.WorkspaceEdit();
    const line = document.lineAt(diagnostic.range.start.line);
    const lineText = line.text;
    
    // Find the full type annotation to replace
    const typeRange = this.findTypeAnnotationRange(document, diagnostic.range);
    if (!typeRange) {
      return action;
    }
    
    const originalType = document.getText(typeRange);
    const wrappedType = this.wrapTypeWithQualifier(originalType, qualifier);
    
    edit.replace(document.uri, typeRange, wrappedType);
    action.edit = edit;
    
    return action;
  }

  /**
   * Find the full range of the type annotation
   * Handles: "Type", "Type | null", "Type[]", "Type | undefined", etc.
   */
  private findTypeAnnotationRange(
    document: vscode.TextDocument,
    diagnosticRange: vscode.Range
  ): vscode.Range | null {
    const line = document.lineAt(diagnosticRange.start.line);
    const lineText = line.text;
    
    // Find the colon that starts the type annotation
    let colonPos = -1;
    for (let i = diagnosticRange.start.character - 1; i >= 0; i--) {
      if (lineText[i] === ':') {
        colonPos = i;
        break;
      }
    }
    
    if (colonPos === -1) {
      // Fallback to diagnostic range
      return diagnosticRange;
    }
    
    // Find the start of the type (skip whitespace after colon)
    let typeStart = colonPos + 1;
    while (typeStart < lineText.length && /\s/.test(lineText[typeStart])) {
      typeStart++;
    }
    
    // Find the end of the type annotation
    // Stop at: =, ;, {, or end of line
    let typeEnd = typeStart;
    let parenDepth = 0;
    let bracketDepth = 0;
    
    while (typeEnd < lineText.length) {
      const char = lineText[typeEnd];
      
      if (char === '(') parenDepth++;
      if (char === ')') parenDepth--;
      if (char === '[') bracketDepth++;
      if (char === ']') bracketDepth--;
      
      // Stop at assignment or semicolon (only if not inside parens/brackets)
      if (parenDepth === 0 && bracketDepth === 0) {
        if (char === '=' || char === ';' || char === '{') {
          break;
        }
      }
      
      typeEnd++;
    }
    
    // Trim trailing whitespace
    while (typeEnd > typeStart && /\s/.test(lineText[typeEnd - 1])) {
      typeEnd--;
    }
    
    return new vscode.Range(
      diagnosticRange.start.line,
      typeStart,
      diagnosticRange.start.line,
      typeEnd
    );
  }

  /**
   * Wrap a type string with an ownership qualifier
   * Preserves unions, arrays, etc.
   */
  private wrapTypeWithQualifier(originalType: string, qualifier: 'own' | 'share' | 'use'): string {
    // Handle union types with null/undefined specially
    // "Type | null" -> "share<Type> | null"
    // "Type | undefined" -> "share<Type> | undefined"
    // "Type | null | undefined" -> "share<Type> | null | undefined"
    
    const nullUnionMatch = originalType.match(/^([^|]+)\s*(\|\s*(?:null|undefined)(?:\s*\|\s*(?:null|undefined))?\s*)$/);
    if (nullUnionMatch) {
      const baseType = nullUnionMatch[1].trim();
      const unionPart = nullUnionMatch[2];
      return `${qualifier}<${baseType}>${unionPart}`;
    }
    
    // Handle array syntax: "Type[]" -> "share<Type>[]"
    const arrayMatch = originalType.match(/^([^[]+)(\[\].*)$/);
    if (arrayMatch) {
      const baseType = arrayMatch[1].trim();
      const arraySuffix = arrayMatch[2];
      return `${qualifier}<${baseType}>${arraySuffix}`;
    }
    
    // Simple case: just wrap the type
    return `${qualifier}<${originalType}>`;
  }
}
