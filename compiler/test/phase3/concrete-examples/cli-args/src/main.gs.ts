/**
 * CLI Argument Parser
 * 
 * Demonstrates:
 * - String parsing and manipulation
 * - Control flow (loops, conditionals)
 * - Null checks and error handling
 * - Class-based design
 */

class ArgParser {
  private args: string[];
  private flags: Map<string, boolean>;
  private options: Map<string, string>;
  private positional: string[];

  constructor(args: string[]) {
    this.args = args;
    this.flags = new Map();
    this.options = new Map();
    this.positional = [];
  }

  parse(): void {
    let i = 0;
    while (i < this.args.length) {
      const arg = this.args[i];
      
      if (arg.startsWith("--")) {
        // Long option: --key=value or --flag
        const name = arg.substring(2);
        
        const eqIndex = name.indexOf("=");
        
        if (eqIndex >= 0) {
          const key = name.substring(0, eqIndex);
          const value = name.substring(eqIndex + 1);
          this.options.set(key, value);
        } else {
          this.flags.set(name, true);
        }
      } else if (arg.startsWith("-")) {
        // Short option: -v or -o value
        const name = arg.substring(1);
        
        if (i + 1 < this.args.length) {
          const next = this.args[i + 1];
          if (!next.startsWith("-")) {
            this.options.set(name, next);
            i++;
          } else {
            this.flags.set(name, true);
          }
        } else {
          this.flags.set(name, true);
        }
      } else {
        // Positional argument
        this.positional.push(arg);
      }
      
      i++;
    }
  }

  hasFlag(name: string): boolean {
    const result = this.flags.get(name);
    return result !== null && result !== undefined;
  }

  getOption(name: string): string | null {
    const result = this.options.get(name);
    return result !== undefined ? result : null;
  }

  getPositional(index: number): string | null {
    if (index >= 0 && index < this.positional.length) {
      return this.positional[index];
    }
    return null;
  }

  getPositionalCount(): number {
    return this.positional.length;
  }
}

// Example usage
const main = (): void => {
  const args = [
    "input.txt",
    "--verbose",
    "-o", "output.txt",
    "--format=json",
    "extra.txt"
  ];

  const parser = new ArgParser(args);
  parser.parse();

  if (parser.hasFlag("verbose")) {
    console.log("Verbose mode enabled");
  }

  console.log(`Total positional args: ${parser.getPositionalCount()}`);
  
  const outputOpt = parser.getOption("o");
  if (outputOpt !== null) {
    console.log(`Output file: ${outputOpt}`);
  }

  const formatOpt = parser.getOption("format");
  if (formatOpt !== null) {
    console.log(`Format: ${formatOpt}`);
  }

  const inputFileOpt = parser.getPositional(0);
  if (inputFileOpt !== null) {
    console.log(`Input file: ${inputFileOpt}`);
  }
}

main();
