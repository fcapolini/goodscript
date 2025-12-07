/**
 * Parser
 * 
 * Wrapper around TypeScript compiler API
 */

import ts from 'typescript';

export class Parser {
  parse(fileName: string, content: string): ts.SourceFile {
    return ts.createSourceFile(
      fileName,
      content,
      ts.ScriptTarget.ES2022,
      true // setParentNodes
    );
  }

  createProgram(files: Map<string, string>): ts.Program {
    const sourceFiles = new Map<string, ts.SourceFile>();
    
    for (const [fileName, content] of files) {
      sourceFiles.set(fileName, this.parse(fileName, content));
    }

    const host: ts.CompilerHost = {
      getSourceFile: (fileName) => sourceFiles.get(fileName),
      writeFile: () => {},
      getCurrentDirectory: () => '',
      getDirectories: () => [],
      fileExists: () => true,
      readFile: () => '',
      getCanonicalFileName: (fileName) => fileName,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      getDefaultLibFileName: () => 'lib.d.ts',
    };

    return ts.createProgram(
      Array.from(files.keys()),
      {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
        strict: true,
      },
      host
    );
  }
}
