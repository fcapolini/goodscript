#!/usr/bin/env node
import ts from 'typescript';

const code = `
interface Headers {
  has(key: string): boolean;
}
interface Options {
  headers: Headers;
}

function test(options: Options | null): void {
  const hasAuth = options?.headers?.has('Authorization');
}
`;

const sourceFile = ts.createSourceFile(
  'test.ts',
  code,
  ts.ScriptTarget.ES2022,
  true
);

function printNode(node, depth = 0) {
  const indent = '  '.repeat(depth);
  const kindName = ts.SyntaxKind[node.kind];
  
  console.log(indent + kindName);
  
  if (node.kind === ts.SyntaxKind.PropertyAccessExpression) {
    console.log(indent + '  questionDotToken:', node.questionDotToken ? 'YES' : 'NO');
  }
  if (node.kind === ts.SyntaxKind.CallExpression) {
    console.log(indent + '  questionDotToken:', node.questionDotToken ? 'YES' : 'NO');
  }
  
  ts.forEachChild(node, child => printNode(child, depth + 1));
}

printNode(sourceFile);
