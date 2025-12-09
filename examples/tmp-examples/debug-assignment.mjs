import ts from 'typescript';
import { IRLowering } from '../../compiler/dist/frontend/lowering.js';

const code = `
function test() {
  let result = "";
  result = "try";
  return result;
}
`;

const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);
const program = ts.createProgram(['test.ts'], {}, {
  getSourceFile: (fileName) => fileName === 'test.ts' ? sourceFile : undefined,
  writeFile: () => {},
  getCurrentDirectory: () => '',
  getDirectories: () => [],
  fileExists: () => true,
  readFile: () => '',
  getCanonicalFileName: (fileName) => fileName,
  useCaseSensitiveFileNames: () => true,
  getNewLine: () => '\n'
});

const lowering = new IRLowering();
const ir = lowering.lower(program);

console.log('IR:', JSON.stringify(ir, null, 2));
