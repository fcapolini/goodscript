/**
 * Core compiler types
 */

export interface CompileOptions {
  files: string[];
  outDir?: string;
  target?: 'cpp';
  mode?: 'ownership' | 'gc';
  optimize?: boolean;
  emit?: 'js' | 'ts' | 'both';
  skipValidation?: boolean;
  
  /** Compile to binary (requires --target native) */
  compile?: boolean;
  
  /** Output binary path (when compile=true) */
  outputBinary?: string;
  
  /** Target triple for cross-compilation (e.g., 'x86_64-linux-gnu') */
  targetTriple?: string;
  
  /** Build directory for intermediate files */
  buildDir?: string;
  
  /** Path to tsconfig.json (auto-detects sourceMap for debug mode) */
  tsconfig?: string;
  
  /** Enable debug symbols */
  debug?: boolean;
}

export interface Diagnostic {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  location?: SourceLocation;
}

export interface SourceLocation {
  fileName: string;
  line: number;
  column: number;
}

export interface CompileResult {
  success: boolean;
  diagnostics: Diagnostic[];
  output?: Map<string, string>; // fileName -> content
  binaryPath?: string; // Path to compiled binary (when compile=true)
  buildTime?: number; // Time in ms
}
