/**
 * Core type definitions for GoodScript
 */

/**
 * Ownership kind for variables and parameters
 * Maps to Rust types: Unique -> Box<T>, Shared -> Rc<T>, Weak -> Weak<T>
 */
export enum OwnershipKind {
  /** Exclusive ownership - maps to Box<T> in Rust */
  Unique = 'unique',
  /** Shared ownership with reference counting - maps to Rc<T> in Rust */
  Shared = 'shared',
  /** Non-owning weak reference - maps to Weak<T> in Rust */
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
 * GoodScript-specific configuration from tsconfig.json
 */
export interface GoodScriptConfig {
  /**
   * Skip ownership analysis for all files
   * Default: false
   */
  skipOwnership?: boolean;
  
  /**
   * Skip null-check analysis for all files
   * Default: false
   */
  skipNullChecks?: boolean;
  
  /**
   * Enable additional diagnostic output
   * Default: false
   */
  verbose?: boolean;
}
