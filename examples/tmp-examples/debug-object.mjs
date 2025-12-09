import ts from 'typescript';

const code = `
const person = {
  name: "Alice",
  age: 30,
  active: true
};
`;

const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.ES2022, true);
const program = ts.createProgram(['test.ts'], {}, {
  getSourceFile: (fileName) => fileName === 'test.ts' ? sourceFile : undefined,
  writeFile: () => {},
  getCurrentDirectory: () => '',
  getDirectories: () => [],
  fileExists: () => true,
  readFile: () => '',
  getCanonicalFileName: (fileName) => fileName,
  useCaseSensitiveFileNames: () => true,
  getNewLine: () => '\n',
  getDefaultLibFileName: () => 'lib.d.ts',
});

const typeChecker = program.getTypeChecker();

function visit(node) {
  if (ts.isObjectLiteralExpression(node)) {
    console.log('Found object literal:');
    const type = typeChecker.getTypeAtLocation(node);
    console.log('Type flags:', type.flags);
    console.log('Type string:', typeChecker.typeToString(type));
    const props = type.getProperties();
    console.log('Properties:', props.map(p => ({
      name: p.getName(),
      type: typeChecker.typeToString(typeChecker.getTypeOfSymbolAtLocation(p, node))
    })));
  }
  ts.forEachChild(node, visit);
}

visit(sourceFile);
