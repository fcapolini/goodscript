import { Compiler } from '../src/compiler';
import { writeFileSync, readFileSync } from 'fs';

const source = `
const x: number = 10;
if (x > 5) {
  console.log("greater");
} else {
  console.log("lesser");
}
`;

writeFileSync('temp/test-ifelse.gs.ts', source);

const compiler = new Compiler();
const result = compiler.compile({
  files: ['temp/test-ifelse.gs.ts'],
  outDir: 'temp/out',
  target: 'native',
});

console.log('Success:', result.success);
console.log('Diagnostics:', result.diagnostics.length);

if (result.diagnostics.length > 0) {
  result.diagnostics.forEach(d => {
    console.log(`  ${d.severity} ${d.code}: ${d.message}`);
  });
}

const cpp = readFileSync('temp/out/test-ifelse.cpp', 'utf-8');
console.log('\n=== Generated C++ ===');
console.log(cpp);
