#!/usr/bin/env node
import ts from 'typescript';

const code = `
interface Options {
  method: string;
}

const options: Options | null = null;
const method = options?.method;
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
    console.log(indent + '  expression:', ts.SyntaxKind[node.expression?.kind]);
    console.log(indent + '  name:', node.name?.text);
  }
  
  ts.forEachChild(node, child => printNode(child, depth + 1));
}

printNode(sourceFile);
