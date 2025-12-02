/**
 * Test262 test file parser
 * Extracts YAML frontmatter and test code
 */

export interface Test262Test {
  path: string;
  code: string;
  description?: string;
  esid?: string;
  features?: string[];
  flags?: string[];
  includes?: string[];
  negative?: {
    phase: 'parse' | 'early' | 'resolution' | 'runtime';
    type: string;
  };
  info?: string;
}

/**
 * Parse Test262 test file with YAML frontmatter
 */
export function parseTest262Test(content: string, path: string): Test262Test {
  const frontmatterMatch = content.match(/\/\*---\n([\s\S]*?)\n---\*\//);
  
  if (!frontmatterMatch) {
    // No frontmatter, treat entire content as code
    return {
      path,
      code: content
    };
  }

  const frontmatter = frontmatterMatch[1];
  const code = content.slice(frontmatterMatch[0].length).trim();
  
  // Parse YAML frontmatter (simple parser, enough for Test262 format)
  const metadata = parseYAML(frontmatter);

  return {
    path,
    code,
    description: metadata.description,
    esid: metadata.esid,
    features: parseArray(metadata.features),
    flags: parseArray(metadata.flags),
    includes: parseArray(metadata.includes),
    negative: metadata.negative ? {
      phase: metadata.negative.phase || 'runtime',
      type: metadata.negative.type || 'Error'
    } : undefined,
    info: metadata.info
  };
}

/**
 * Simple YAML parser for Test262 frontmatter
 */
function parseYAML(yaml: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = yaml.split('\n');
  let currentKey: string | null = null;
  let currentValue: any = null;
  let indent = 0;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const currentIndent = line.search(/\S/);
    
    // Key-value pair
    const kvMatch = line.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/);
    if (kvMatch) {
      const [, spaces, key, value] = kvMatch;
      const keyIndent = spaces.length;

      if (keyIndent === 0 || keyIndent <= indent) {
        // Top-level or same level key
        if (currentKey && currentValue !== null) {
          result[currentKey] = currentValue;
        }
        currentKey = key;
        indent = keyIndent;

        if (value.trim()) {
          currentValue = parseValue(value.trim());
        } else {
          currentValue = {};
        }
      } else if (currentKey && typeof currentValue === 'object') {
        // Nested key
        currentValue[key] = parseValue(value.trim());
      }
      continue;
    }

    // Array item
    const arrayMatch = line.match(/^(\s*)-\s+(.*)$/);
    if (arrayMatch && currentKey) {
      const [, , value] = arrayMatch;
      if (!Array.isArray(currentValue)) {
        currentValue = [];
      }
      currentValue.push(parseValue(value.trim()));
      continue;
    }

    // Continuation line
    if (currentKey && typeof currentValue === 'string') {
      currentValue += ' ' + trimmed;
    }
  }

  // Save last key
  if (currentKey && currentValue !== null) {
    result[currentKey] = currentValue;
  }

  return result;
}

function parseValue(value: string): any {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
  if (value.startsWith('[') && value.endsWith(']')) {
    return value.slice(1, -1).split(',').map(v => parseValue(v.trim()));
  }
  return value;
}

function parseArray(value: any): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value.map(String);
  return [String(value)];
}
