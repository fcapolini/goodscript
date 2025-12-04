#!/usr/bin/env node

/**
 * GoodScript Modern CLI
 * Unified toolchain for GoodScript development
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// Read version from package.json
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8')
);
const VERSION = packageJson.version;

function printHelp(): void {
  console.log(`
GoodScript v${VERSION}
Modern toolchain for GoodScript

Usage: gs <command> [options]

Commands:
  compile [files...]     Compile GoodScript files (delegates to gsc)

Future commands (planned):
  run <file>            Compile and run a GoodScript program
  build                 Build the project
  test                  Run tests
  fmt                   Format GoodScript code
  check                 Type check without building
  init                  Initialize a new GoodScript project
  add <package>         Add a dependency
  doc                   Generate documentation

For compiler-specific options, use 'gsc --help'

Examples:
  gs compile main-gs.ts           Compile a file
  gs compile src/**/*-gs.ts       Compile multiple files
  gs compile -o dist main-gs.ts   Compile with output directory
  
  # Future:
  gs run main-gs.ts               Compile and run
  gs build                        Build entire project
  gs test                         Run all tests
  gs fmt                          Format all code
  `);
}

function runCompile(args: string[]): void {
  // Find gsc in the same directory as this script
  const gscPath = path.join(__dirname, 'gsc.js');
  
  // Spawn gsc with all the arguments
  const gsc = spawn('node', [gscPath, ...args], {
    stdio: 'inherit',
    shell: false
  });
  
  gsc.on('close', (code) => {
    process.exit(code || 0);
  });
  
  gsc.on('error', (err) => {
    console.error('Error running gsc:', err.message);
    process.exit(1);
  });
}

function main(): void {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    process.exit(0);
  }
  
  if (args[0] === '--version' || args[0] === '-v') {
    console.log(VERSION);
    process.exit(0);
  }
  
  const command = args[0];
  const commandArgs = args.slice(1);
  
  switch (command) {
    case 'compile':
      runCompile(commandArgs);
      break;
      
    case 'run':
    case 'build':
    case 'test':
    case 'fmt':
    case 'check':
    case 'init':
    case 'add':
    case 'doc':
      console.error(`Error: '${command}' command is not yet implemented.`);
      console.error(`This command is planned for a future release.`);
      console.error(`\nCurrently available: compile`);
      process.exit(1);
      break;
      
    default:
      console.error(`Error: Unknown command '${command}'`);
      console.error(`\nRun 'gs --help' for available commands.`);
      process.exit(1);
  }
}

main();
