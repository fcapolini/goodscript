/**
 * String parsing utilities with dual error handling pattern.
 */
export class StringTools {
  /**
   * Parse integer from string. Throws on invalid input.
   */
  static parseInt(s: string): number {
    const result = StringTools.tryParseInt(s);
    if (result === null) {
      throw new Error(`Invalid integer: "${s}"`);
    }
    return result;
  }

  /**
   * Parse integer from string. Returns null on invalid input.
   */
  static tryParseInt(s: string): number | null {
    const trimmed = s.trim();
    if (trimmed === '') {
      return null;
    }

    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isNaN(parsed)) {
      return null;
    }

    // Ensure the entire string was consumed (no trailing garbage)
    if (!/^-?\d+$/.test(trimmed)) {
      return null;
    }

    return parsed;
  }

  /**
   * Parse float from string. Throws on invalid input.
   */
  static parseFloat(s: string): number {
    const result = StringTools.tryParseFloat(s);
    if (result === null) {
      throw new Error(`Invalid number: "${s}"`);
    }
    return result;
  }

  /**
   * Parse float from string. Returns null on invalid input.
   */
  static tryParseFloat(s: string): number | null {
    const trimmed = s.trim();
    if (trimmed === '') {
      return null;
    }

    const parsed = Number.parseFloat(trimmed);
    if (Number.isNaN(parsed)) {
      return null;
    }

    return parsed;
  }

  /**
   * Check if string contains substring.
   */
  static contains(s: string, substring: string): boolean {
    return s.includes(substring);
  }

  /**
   * Check if string starts with prefix.
   */
  static startsWith(s: string, prefix: string): boolean {
    return s.startsWith(prefix);
  }

  /**
   * Check if string ends with suffix.
   */
  static endsWith(s: string, suffix: string): boolean {
    return s.endsWith(suffix);
  }

  /**
   * Repeat string n times.
   */
  static repeat(s: string, count: number): string {
    if (count < 0) {
      throw new Error(`Repeat count must be non-negative: ${count}`);
    }
    return s.repeat(count);
  }

  /**
   * Reverse string.
   */
  static reverse(s: string): string {
    return s.split('').reverse().join('');
  }

  /**
   * Pad string to length on left with fillString.
   */
  static padLeft(s: string, length: number, fillString: string = ' '): string {
    return s.padStart(length, fillString);
  }

  /**
   * Pad string to length on right with fillString.
   */
  static padRight(s: string, length: number, fillString: string = ' '): string {
    return s.padEnd(length, fillString);
  }

  /**
   * Split string by separator.
   */
  static split(s: string, separator: string): Array<string> {
    return s.split(separator);
  }

  /**
   * Join array of strings with separator.
   */
  static join(parts: Array<string>, separator: string = ''): string {
    return parts.join(separator);
  }

  /**
   * Convert string to uppercase.
   */
  static toUpperCase(s: string): string {
    return s.toUpperCase();
  }

  /**
   * Convert string to lowercase.
   */
  static toLowerCase(s: string): string {
    return s.toLowerCase();
  }

  /**
   * Trim whitespace from both ends.
   */
  static trim(s: string): string {
    return s.trim();
  }

  /**
   * Trim whitespace from left end.
   */
  static trimLeft(s: string): string {
    return s.trimStart();
  }

  /**
   * Trim whitespace from right end.
   */
  static trimRight(s: string): string {
    return s.trimEnd();
  }
}
