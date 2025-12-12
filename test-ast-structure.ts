import * as ts from 'typescript';

// Create a simple test to understand the AST structure
const code = `
const numbers: integer[] = [1, 2, 3];
const evens = numbers.filter((n) => n % 2 === 0);
`;

const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);

function visit(node: ts.Node, depth = 0) {
  const indent = '  '.repeat(depth);
  console.log(indent + ts.SyntaxKind[node.kind]);
  
  if (ts.isCallExpression(node)) {
    console.log(indent + '  -> CallExpression');
  }
  if (ts.isArrowFunction(node)) {
    console.log(indent + '  -> ArrowFunction (parent: ' + ts.SyntaxKind[node.parent.kind] + ')');
  }
  
  ts.forEachChild(node, child => visit(child, depth + 1));
}

visit(sourceFile);
