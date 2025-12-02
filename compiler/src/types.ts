/**
 * Core type definitions for GoodScript
 */

/**
 * Ownership kind for variables and parameters
 */
export enum OwnershipKind {
  /** Exclusive ownership */
  Unique = 'unique',
  /** Shared ownership with reference counting */
  Shared = 'shared',
  /** Non-owning weak reference */
  Weak = 'weak',
}

/**
 * Information about ownership for a symbol
 */
export interface OwnershipInfo {
  kind: OwnershipKind;
  isNullable: boolean;
  symbol: string;
  location: SourceLocation;
}

/**
 * Source location information
 */
export interface SourceLocation {
  fileName: string;
  line: number;
  column: number;
}

/**
 * Ownership graph edge
 */
export interface OwnershipEdge {
  from: string; // Symbol name
  to: string;   // Symbol name
  kind: OwnershipKind;
  location: SourceLocation;
}

/**
 * Ownership graph for cycle detection
 */
export interface OwnershipGraph {
  nodes: Map<string, OwnershipInfo>;
  edges: OwnershipEdge[];
}

/**
 * Diagnostic message
 */
export interface Diagnostic {
  severity: 'error' | 'warning' | 'info';
  message: string;
  location: SourceLocation;
  code?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  success: boolean;
  diagnostics: Diagnostic[];
}

/**
 * GoodScript language level
 */
export type LanguageLevel = 'clean' | 'dag' | 'native';

/**
 * GoodScript-specific configuration from tsconfig.json
 */
export interface GoodScriptConfig {
  /**
   * Language level (determines which features are enabled)
   * - 'clean': Phase 1 restrictions only (TypeScript "good parts")
   * - 'dag': Phase 1 + ownership/DAG validation
   * - 'native': Full validation for native compilation
   * Default: 'clean'
   */
  level?: LanguageLevel;
  
  /**
   * @deprecated Use 'level' instead
   * Skip ownership analysis for all files
   * Default: false
   */
  skipOwnership?: boolean;
  
  /**
   * @deprecated Use 'level' instead
   * Skip null-check analysis for all files
   * Default: false
   */
  skipNullChecks?: boolean;
  
  /**
   * Enable additional diagnostic output
   * Default: false
   */
  verbose?: boolean;
  
  /**
   * Permissive mode for Test262 conformance testing
   * Allows function expressions/declarations and implicit truthiness
   * Still enforces memory safety (ownership/DAG)
   * Default: false
   */
  permissive?: boolean;
}
