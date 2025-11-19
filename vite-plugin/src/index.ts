/**
 * @goodscript/vite-plugin
 * Vite plugin for compiling GoodScript (.gs.ts) files on-the-fly
 */

import type { Plugin } from 'vite';
import { Parser, Validator, TypeScriptCodegen, type CompileOptions } from 'goodscript';
import * as path from 'path';
import * as fs from 'fs';
import * as ts from 'typescript';

export interface GoodScriptPluginOptions {
  /**
   * Language level to enforce
   * - 'clean': TypeScript good parts only (default for TS target)
   * - 'dag': Level 1 + ownership/DAG validation
   * - 'rust': Full validation for native compilation
   */
  level?: 'clean' | 'dag' | 'rust';
  
  /**
   * Glob patterns for files to include
   * @default ['**\/*.gs.ts', '**\/*.gs.tsx']
   */
  include?: string[];
  
  /**
   * Glob patterns for files to exclude
   * @default ['node_modules/**']
   */
  exclude?: string[];
  
  /**
   * Skip ownership analysis (Phase 2 checks)
   * @default false for level 'clean', true for 'dag'/'rust'
   */
  skipOwnershipChecks?: boolean;
}

/**
 * Vite plugin for GoodScript compilation
 * 
 * @example
 * ```typescript
 * // vite.config.ts
 * import { defineConfig } from 'vite';
 * import goodscript from '@goodscript/vite-plugin';
 * 
 * export default defineConfig({
 *   plugins: [
 *     goodscript({
 *       level: 'clean',
 *       include: ['**\/*.gs.ts', '**\/*.gs.tsx']
 *     })
 *   ]
 * });
 * ```
 */
export default function goodscriptPlugin(
  options: GoodScriptPluginOptions = {}
): Plugin {
  const {
    level = 'clean',
    include = ['**/*.gs.ts', '**/*.gs.tsx'],
    exclude = ['node_modules/**'],
    skipOwnershipChecks = level === 'clean',
  } = options;

  const parser = new Parser();
  const validator = new Validator();
  const codegen = new TypeScriptCodegen();
  
  // Cache compiled results to avoid recompilation
  const cache = new Map<string, { code: string; timestamp: number }>();

  return {
    name: 'vite-plugin-goodscript',
    
    // Run before other plugins (like @vitejs/plugin-react)
    enforce: 'pre',
    
    // Resolve .gs.ts and .gs.tsx imports
    resolveId(source: string, importer?: string) {
      // Handle imports like: import { X } from './file.gs'
      if (source.endsWith('.gs') && !source.includes('.gs.')) {
        return source + '.ts';
      }
      return null;
    },
    
    // Transform .gs.ts and .gs.tsx files
    async transform(code: string, id: string) {
      // Only process .gs.ts and .gs.tsx files
      if (!id.match(/\.gs\.tsx?$/)) {
        return null;
      }
      
      // Check if excluded
      const relativePath = path.relative(process.cwd(), id);
      if (exclude.some(pattern => matchGlob(relativePath, pattern))) {
        return null;
      }
      
      try {
        // Check cache
        const stats = fs.statSync(id);
        const cached = cache.get(id);
        if (cached && cached.timestamp >= stats.mtimeMs) {
          return {
            code: cached.code,
            map: null, // TODO: Source maps
          };
        }
        
        // Parse the file
        parser.createProgram([id]);
        const program = parser.getProgram();
        const sourceFile = program?.getSourceFile(id);
        
        if (!sourceFile) {
          this.error(`Failed to parse file: ${id}`);
          return null;
        }
        
        // Validate GoodScript restrictions
        const checker = parser.getTypeChecker();
        const validationResult = validator.validate(sourceFile, checker);
        
        if (validationResult.diagnostics.length > 0) {
          // Format errors for Vite overlay
          const errors = validationResult.diagnostics
            .filter(d => d.severity === 'error')
            .map(d => {
              const loc = d.location;
              return `${path.relative(process.cwd(), loc.fileName)}:${loc.line}:${loc.column}\n  ${d.message}`;
            })
            .join('\n\n');
          
          if (errors) {
            this.error(errors);
            return null;
          }
        }
        
        // Generate TypeScript output
        const output = codegen.generate(sourceFile);
        
        // Cache the result
        cache.set(id, {
          code: output,
          timestamp: stats.mtimeMs,
        });
        
        return {
          code: output,
          map: null, // TODO: Source maps
        };
        
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.error(`GoodScript compilation failed: ${message}`);
        return null;
      }
    },
    
    // Handle Hot Module Replacement
    handleHotUpdate({ file, server }) {
      if (file.match(/\.gs\.tsx?$/)) {
        // Clear cache for this file
        cache.delete(file);
        
        // Trigger full reload for now
        // TODO: More granular HMR with proper module graph analysis
        server.ws.send({
          type: 'full-reload',
          path: '*',
        });
      }
    },
    
    // Clear cache when build starts
    buildStart() {
      cache.clear();
    },
  };
}

/**
 * Simple glob pattern matcher
 * Supports ** (multi-level) and * (single-level) wildcards
 */
function matchGlob(filepath: string, pattern: string): boolean {
  // Escape special regex characters except * and /
  const regexPattern = pattern
    .replace(/\./g, '\\.')  // Escape dots first
    .replace(/\*\*/g, '§DOUBLESTAR§')  // Temporarily mark **
    .replace(/\*/g, '[^/]*')  // Single * matches anything except /
    .replace(/§DOUBLESTAR§/g, '.*');  // ** matches anything including /
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filepath);
}
