import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

let diagnosticCollection: vscode.DiagnosticCollection;
let validationTimeout: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('GoodScript extension activated');

  // Ensure TypeScript knows about GoodScript types
  ensureTypeScriptConfiguration(context);

  // Create diagnostic collection
  diagnosticCollection = vscode.languages.createDiagnosticCollection('goodscript');
  context.subscriptions.push(diagnosticCollection);

  // Validate on save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(document => {
      if (isGoodScriptFile(document)) {
        const config = vscode.workspace.getConfiguration('goodscript');
        if (config.get('validateOnSave', true)) {
          validateDocument(document);
        }
      }
    })
  );

  // Validate on type (debounced)
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(event => {
      if (isGoodScriptFile(event.document)) {
        const config = vscode.workspace.getConfiguration('goodscript');
        if (config.get('validateOnType', false)) {
          // Debounce validation
          if (validationTimeout) {
            clearTimeout(validationTimeout);
          }
          const debounceMs = config.get('validateOnTypeDebounce', 2000);
          validationTimeout = setTimeout(() => {
            validateDocument(event.document);
          }, debounceMs);
        }
      }
    })
  );

  // Validate on open
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(document => {
      if (isGoodScriptFile(document)) {
        validateDocument(document);
      }
    })
  );

  // Validate all open GoodScript files
  vscode.workspace.textDocuments.forEach(document => {
    if (isGoodScriptFile(document)) {
      validateDocument(document);
    }
  });

  // Register command to manually validate
  context.subscriptions.push(
    vscode.commands.registerCommand('goodscript.validate', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && isGoodScriptFile(editor.document)) {
        validateDocument(editor.document);
      }
    })
  );
}

export function deactivate() {
  if (diagnosticCollection) {
    diagnosticCollection.dispose();
  }
}

function isGoodScriptFile(document: vscode.TextDocument): boolean {
  return document.fileName.endsWith('.gs.ts');
}

async function validateDocument(document: vscode.TextDocument): Promise<void> {
  const config = vscode.workspace.getConfiguration('goodscript');
  
  if (!config.get('enableValidation', true)) {
    return;
  }

  // First, run client-side validation for forbidden operators
  const clientDiagnostics = validateForbiddenOperators(document);

  const compilerPath = config.get('compilerPath', 'gsc');
  const filePath = document.uri.fsPath;

  try {
    const compilerDiagnostics = await runCompiler(compilerPath, filePath);
    // Combine client-side and compiler diagnostics
    const allDiagnostics = [...clientDiagnostics, ...compilerDiagnostics];
    diagnosticCollection.set(document.uri, allDiagnostics);
  } catch (error) {
    // If compiler fails, still show client-side diagnostics
    diagnosticCollection.set(document.uri, clientDiagnostics);
    console.error('GoodScript validation error:', error);
    vscode.window.showErrorMessage(
      `GoodScript validation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function validateForbiddenOperators(document: vscode.TextDocument): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  const text = document.getText();
  const lines = text.split('\n');

  // Phase 1 forbidden operators in GoodScript
  const forbiddenOperators = [
    { pattern: /!=(?!=)/g, name: '!=', code: 'GS107', replacement: '!==' },
    { pattern: /(?<![!=])==(?!=)/g, name: '==', code: 'GS106', replacement: '===' }
  ];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    
    // Skip comments
    const commentIndex = line.indexOf('//');
    const lineToCheck = commentIndex !== -1 ? line.substring(0, commentIndex) : line;
    
    // Check for forbidden operators
    for (const { pattern, name, code, replacement } of forbiddenOperators) {
      pattern.lastIndex = 0; // Reset regex
      let match;
      
      while ((match = pattern.exec(lineToCheck)) !== null) {
        const startPos = new vscode.Position(lineIndex, match.index);
        const endPos = new vscode.Position(lineIndex, match.index + name.length);
        const range = new vscode.Range(startPos, endPos);
        
        const diagnostic = new vscode.Diagnostic(
          range,
          `Operator '${name}' is forbidden in GoodScript. Use '${replacement}' instead`,
          vscode.DiagnosticSeverity.Error
        );
        
        diagnostic.code = code;
        diagnostic.source = 'GoodScript';
        diagnostics.push(diagnostic);
      }
    }

    // Check for 'var' keyword (GS105: forbidden in GoodScript, use let or const instead)
    const varPattern = /\bvar\b/g;
    varPattern.lastIndex = 0;
    let varMatch;
    
    while ((varMatch = varPattern.exec(lineToCheck)) !== null) {
      const startPos = new vscode.Position(lineIndex, varMatch.index);
      const endPos = new vscode.Position(lineIndex, varMatch.index + 'var'.length);
      const range = new vscode.Range(startPos, endPos);
      
      const diagnostic = new vscode.Diagnostic(
        range,
        `'var' is forbidden in GoodScript. Use 'let' or 'const' instead`,
        vscode.DiagnosticSeverity.Error
      );
      
      diagnostic.code = 'GS105';
      diagnostic.source = 'GoodScript';
      diagnostics.push(diagnostic);
    }

    // Check for non-arrow functions (GS108: except class methods)
    const functionPattern = /\bfunction\s+([a-zA-Z_$][a-zA-Z0-9_$]*)?/g;
    functionPattern.lastIndex = 0;
    let functionMatch;
    
    while ((functionMatch = functionPattern.exec(lineToCheck)) !== null) {
      // Check if this is a class method or constructor by looking at surrounding context
      const beforeFunction = lineToCheck.substring(0, functionMatch.index).trim();
      
      // Skip if it's a method definition or preceded by class/static/async/get/set
      const isClassMember = /\b(class|static|async|get|set|public|private|protected)\s*$/.test(beforeFunction);
      
      // Also check if we're likely inside a class by looking at indentation and previous lines
      let isInClass = false;
      for (let i = lineIndex - 1; i >= Math.max(0, lineIndex - 10); i--) {
        const prevLine = lines[i].trim();
        if (prevLine.startsWith('class ') || prevLine.match(/^class\s+/)) {
          isInClass = true;
          break;
        }
        if (prevLine === '}' || prevLine.startsWith('}')) {
          break;
        }
      }
      
      if (!isClassMember && !isInClass) {
        const startPos = new vscode.Position(lineIndex, functionMatch.index);
        const endPos = new vscode.Position(lineIndex, functionMatch.index + 'function'.length);
        const range = new vscode.Range(startPos, endPos);
        
        const diagnostic = new vscode.Diagnostic(
          range,
          `Non-arrow functions are forbidden in GoodScript. Use arrow functions instead`,
          vscode.DiagnosticSeverity.Error
        );
        
        diagnostic.code = 'GS108';
        diagnostic.source = 'GoodScript';
        diagnostics.push(diagnostic);
      }
    }
  }

  return diagnostics;
}

interface GoodScriptDiagnostic {
  severity: 'error' | 'warning' | 'info';
  message: string;
  location: {
    fileName: string;
    line: number;
    column: number;
  };
  code?: string;
}

interface CompilerResult {
  success: boolean;
  diagnostics: GoodScriptDiagnostic[];
}

function runCompiler(compilerPath: string, filePath: string): Promise<vscode.Diagnostic[]> {
  return new Promise((resolve, reject) => {
    // Run gsc with JSON output
    const args = [filePath, '--json-output'];
    const proc = spawn(compilerPath, args);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      try {
        // Parse compiler output
        const result = parseCompilerOutput(stdout, stderr);
        const vsDiagnostics = result.map(convertToVSDiagnostic);
        resolve(vsDiagnostics);
      } catch (error) {
        // If JSON parsing fails, try to extract diagnostics from text output
        const textDiagnostics = parseTextOutput(stdout + stderr);
        resolve(textDiagnostics);
      }
    });

    proc.on('error', (error) => {
      reject(new Error(`Failed to run GoodScript compiler: ${error.message}`));
    });
  });
}

function parseCompilerOutput(stdout: string, stderr: string): GoodScriptDiagnostic[] {
  // Try to parse JSON output
  try {
    const result: CompilerResult = JSON.parse(stdout);
    return result.diagnostics || [];
  } catch {
    // Fallback to text parsing
    return [];
  }
}

function parseTextOutput(output: string): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  
  // Parse text format: "ERROR [CODE] file:line:col\n  message"
  const lines = output.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Match: ERROR [GS001] file.gs.ts:10:5
    const match = line.match(/^(ERROR|WARNING|INFO)\s+\[(\w+)\]\s+([^:]+):(\d+):(\d+)/);
    
    if (match) {
      const [, severity, code, , lineNum, colNum] = match;
      
      // Get message from next lines
      let message = '';
      let j = i + 1;
      while (j < lines.length && lines[j].startsWith(' ')) {
        message += lines[j].trim() + ' ';
        j++;
      }
      
      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(
          parseInt(lineNum) - 1,
          parseInt(colNum) - 1,
          parseInt(lineNum) - 1,
          parseInt(colNum) + 10
        ),
        message.trim() || line,
        severity === 'ERROR' ? vscode.DiagnosticSeverity.Error :
        severity === 'WARNING' ? vscode.DiagnosticSeverity.Warning :
        vscode.DiagnosticSeverity.Information
      );
      
      diagnostic.code = code;
      diagnostic.source = 'GoodScript';
      diagnostics.push(diagnostic);
    }
  }
  
  return diagnostics;
}

function convertToVSDiagnostic(gsDiag: GoodScriptDiagnostic): vscode.Diagnostic {
  const line = Math.max(0, gsDiag.location.line - 1);
  const col = Math.max(0, gsDiag.location.column - 1);
  
  const diagnostic = new vscode.Diagnostic(
    new vscode.Range(line, col, line, col + 10),
    gsDiag.message,
    gsDiag.severity === 'error' ? vscode.DiagnosticSeverity.Error :
    gsDiag.severity === 'warning' ? vscode.DiagnosticSeverity.Warning :
    vscode.DiagnosticSeverity.Information
  );
  
  diagnostic.code = gsDiag.code;
  diagnostic.source = 'GoodScript';
  
  return diagnostic;
}

/**
 * Ensures TypeScript knows about GoodScript files by creating a minimal
 * tsconfig.json in the workspace if needed.
 */
function ensureTypeScriptConfiguration(context: vscode.ExtensionContext) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return;
  }

  // For each workspace folder, ensure it has config for .gs.ts files
  for (const folder of workspaceFolders) {
    const folderPath = folder.uri.fsPath;
    const tsconfigPath = path.join(folderPath, 'tsconfig.json');
    const jsconfigPath = path.join(folderPath, 'jsconfig.json');

    // Check if either config exists
    const hasTsconfig = fs.existsSync(tsconfigPath);
    const hasJsconfig = fs.existsSync(jsconfigPath);

    if (hasTsconfig || hasJsconfig) {
      // User has their own config - don't override
      continue;
    }

    // Check if workspace has any .gs.ts files
    vscode.workspace.findFiles('**/*.gs.ts', '**/node_modules/**', 1).then((files) => {
      if (files.length > 0) {
        try {
          const config = {
            compilerOptions: {
              target: 'ES2020',
              module: 'commonjs',
              lib: ['ES2020'],
              strict: true,
              skipLibCheck: true
            },
            include: ['**/*.gs.ts', '**/*.ts']
          };
          
          fs.writeFileSync(tsconfigPath, JSON.stringify(config, null, 2));
          vscode.window.showInformationMessage(
            `Created tsconfig.json for GoodScript support in ${folder.name}`
          );
        } catch (error) {
          console.error('Failed to create tsconfig.json:', error);
        }
      }
    });
  }
}
