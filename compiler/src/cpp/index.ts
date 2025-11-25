/**
 * C++ Code Generation Module
 * 
 * This module provides an AST-based approach to C++ code generation.
 * 
 * Architecture:
 * - ast.ts: Defines C++ AST node types
 * - builder.ts: Fluent API for constructing AST
 * - renderer.ts: Converts AST to formatted C++ source code
 * 
 * Benefits of AST-based approach:
 * 1. Type safety - catch errors at compile time
 * 2. Composability - build complex structures from simple parts
 * 3. Testability - validate AST before rendering
 * 4. Transformation - optimize or analyze before rendering
 * 5. Separation of concerns - construction vs. formatting
 * 
 * Usage:
 * ```typescript
 * import { cpp, render } from './cpp';
 * 
 * const ast = cpp.function(
 *   'add',
 *   cpp.int(),
 *   [cpp.param('a', cpp.int()), cpp.param('b', cpp.int())],
 *   cpp.block(
 *     cpp.return_(cpp.binary(cpp.id('a'), '+', cpp.id('b')))
 *   )
 * );
 * 
 * const code = render(ast);
 * ```
 */

// Export AST types
export * from './ast';

// Export builder
export * from './builder';

// Export renderer
export * from './renderer';
