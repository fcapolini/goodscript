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
    const props = type.getProperties();
    for (const prop of props) {
      console.log(`Property: ${prop.getName()}`);
      console.log(`  valueDeclaration:`, prop.valueDeclaration?.kind);
      if (prop.valueDeclaration) {
        const propType = typeChecker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration);
        console.log(`  Type:`, typeChecker.typeToString(propType));
        console.log(`  Props:`, propType.getProperties().map(p => p.getName()));
      }
    }
  }
  ts.forEachChild(node, visit);
}

visit(sourceFile);
