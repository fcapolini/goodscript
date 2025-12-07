/**
 * Core compiler types
 */

export interface CompileOptions {
  files: string[];
  outDir?: string;
  target?: 'typescript' | 'native';
  mode?: 'ownership' | 'gc';
  optimize?: boolean;
  emit?: 'js' | 'ts' | 'both';
  skipValidation?: boolean;
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
}
