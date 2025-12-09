#!/usr/bin/env node

/**
 * GoodScript Compiler CLI (gsc)
 * 
 * Drop-in replacement for tsc with GoodScript-specific --gs* flags
 */

import { parseArguments, mergeOptions, validateOptions, applyDefaults } from './options.js';
import { compileCommand, watchCommand } from './commands.js';
import { HELP_TEXT, VERSION_TEXT } from './help.js';

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  const { options: rawOptions, errors: parseErrors } = parseArguments(args);
  
  // Show help
  if (rawOptions.help) {
    console.log(HELP_TEXT);
    process.exit(0);
  }
  
  // Show version
  if (rawOptions.version) {
    console.log(VERSION_TEXT);
    process.exit(0);
  }
  
  // Check for parse errors
  if (parseErrors.length > 0) {
    for (const error of parseErrors) {
      console.error(`❌ ${error}`);
    }
    console.error('\nRun "gsc --help" for usage information.');
    process.exit(1);
  }
  
  // Merge with tsconfig.json
  const mergedOptions = mergeOptions(rawOptions);
  
  // Apply defaults
  const options = applyDefaults(mergedOptions);
  
  // Validate options
  const validationErrors = validateOptions(options);
  if (validationErrors.length > 0) {
    for (const error of validationErrors) {
      console.error(`❌ ${error}`);
    }
    process.exit(1);
  }
  
  // Execute command
  try {
    const result = options.watch 
      ? await watchCommand(options)
      : await compileCommand(options);
    
    // Print warnings
    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      for (const warning of result.warnings) {
        console.log(`  ${warning}`);
      }
    }
    
    // Print errors
    if (result.errors.length > 0) {
      console.error('\n❌ Errors:');
      for (const error of result.errors) {
        console.error(`  ${error}`);
      }
      process.exit(1);
    }
    
    process.exit(result.success ? 0 : 1);
    
  } catch (err) {
    console.error('❌ Fatal error:', err instanceof Error ? err.message : String(err));
    if (err instanceof Error && err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

main();
