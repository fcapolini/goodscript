/**
 * RegExp Runtime Library Tests
 * 
 * Tests that GoodScript RegExp runtime library (gs::RegExp)
 * produces identical results in both JavaScript and C++ execution.
 * 
 * Each test:
 * 1. Writes GoodScript code using RegExp features
 * 2. Compiles to JavaScript (TypeScript mode)
 * 3. Compiles to C++ (native mode)
 * 4. Runs both and compares output
 * 
 * NOTE: C++ tests currently use skipCpp: true because the compiler
 * doesn't yet generate RegExp code. Once regex literal support is added,
 * these tests will validate JavaScript/C++ equivalence.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { CppCodegen } from '../../src/cpp/codegen';
import ts from 'typescript';

describe('RegExp Runtime Library', () => {
  let tempDir: string;
  
  beforeEach(() => {
    // Create temp directory for test files
    tempDir = fs.mkdtempSync(path.join(__dirname, 'regexp-test-'));
  });
  
  afterEach(() => {
    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
  
  /**
   * Helper: Compile and run GoodScript code in both JS and C++, compare output
   */
  function testEquivalence(
    testName: string,
    gsCode: string,
    options?: { skipCpp?: boolean; pcre2Required?: boolean }
  ): { jsOutput: string; cppOutput?: string } {
    const sourceFile = path.join(tempDir, `${testName}.ts`);
    const jsOutDir = path.join(tempDir, 'js');
    const cppOutDir = path.join(tempDir, 'cpp');
    
    // Write GoodScript source
    fs.writeFileSync(sourceFile, gsCode);
    
    // Compile to JavaScript using TypeScript compiler
    fs.mkdirSync(jsOutDir, { recursive: true });
    
    const jsOutFile = path.join(jsOutDir, `${testName}.js`);
    
    // Use tsc to compile TypeScript to JavaScript
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      outDir: jsOutDir,
      skipLibCheck: true
    };
    
    const program = ts.createProgram([sourceFile], compilerOptions);
    const emitResult = program.emit();
    
    if (emitResult.diagnostics.length > 0) {
      const errors = emitResult.diagnostics.map(d => 
        ts.formatDiagnostic(d, {
          getCurrentDirectory: () => process.cwd(),
          getCanonicalFileName: (f) => f,
          getNewLine: () => '\n'
        })
      ).join('\n');
      throw new Error(`TypeScript compilation failed:\n${errors}`);
    }
    
    // Run JavaScript
    const jsOutput = execSync(`node ${jsOutFile}`, {
      cwd: jsOutDir,
      encoding: 'utf-8',
      stdio: 'pipe'
    }).trim();
    
    if (options?.skipCpp) {
      return { jsOutput };
    }
    
    // Compile to C++
    fs.mkdirSync(cppOutDir, { recursive: true });
    
    // Parse and generate C++
    const tsSourceFile = ts.createSourceFile(
      testName + '.ts',
      gsCode,
      ts.ScriptTarget.ES2020,
      true
    );
    
    const codegen = new CppCodegen();
    const cppCode = codegen.generate(tsSourceFile);
    
    // Write C++ source
    const cppSourceFile = path.join(cppOutDir, `${testName}.cpp`);
    fs.writeFileSync(cppSourceFile, cppCode);
    
    // Copy runtime headers (including new regexp headers)
    const runtimeDir = path.join(__dirname, '../../runtime');
    const headers = [
      'gs_string.hpp',
      'gs_array.hpp',
      'gs_array_impl.hpp',
      'gs_map.hpp',
      'gs_json.hpp',
      'gs_console.hpp',
      'gs_regexp.hpp',
      'gs_regexp_impl.hpp',
      'gs_runtime.hpp'
    ];
    
    for (const header of headers) {
      const src = path.join(runtimeDir, header);
      const dest = path.join(cppOutDir, header);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    }
    
    // Compile C++ with PCRE2 if required
    const cppBinary = path.join(cppOutDir, testName);
    let compileCmd = `zig c++ -std=c++20 -I. ${cppSourceFile} -o ${cppBinary}`;
    
    if (options?.pcre2Required) {
      // Try to find PCRE2 via pkg-config or brew
      try {
        const pcre2Flags = execSync('pkg-config --cflags --libs libpcre2-8', {
          encoding: 'utf-8',
          stdio: 'pipe'
        }).trim();
        compileCmd += ` ${pcre2Flags}`;
      } catch {
        // Try brew on macOS
        try {
          const brewPrefix = execSync('brew --prefix pcre2', {
            encoding: 'utf-8',
            stdio: 'pipe'
          }).trim();
          compileCmd += ` -I${brewPrefix}/include -L${brewPrefix}/lib -lpcre2-8`;
        } catch {
          // Skip test if PCRE2 not found
          console.warn(`Skipping ${testName}: PCRE2 library not found`);
          return { jsOutput };
        }
      }
    }
    
    try {
      execSync(compileCmd, {
        cwd: cppOutDir,
        stdio: 'pipe'
      });
    } catch (error: any) {
      throw new Error(`C++ compilation failed:\n${error.stderr?.toString() || error.message}\n\nGenerated C++:\n${cppCode}`);
    }
    
    // Run C++
    const cppOutput = execSync(cppBinary, {
      cwd: cppOutDir,
      encoding: 'utf-8',
      stdio: 'pipe'
    }).trim();
    
    return { jsOutput, cppOutput };
  }
  
  describe('RegExp Basic Matching', () => {
    it('should test basic pattern matching', () => {
      const code = `
const pattern = /hello/;
console.log(pattern.test("hello world"));
console.log(pattern.test("goodbye"));
console.log(pattern.test("HELLO"));
      `.trim();
      
      const { jsOutput } = testEquivalence('regexp-basic-test', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        'true',
        'false',
        'false'
      ]);
    });
    
    it('should support case-insensitive flag', () => {
      const code = `
const pattern = /HELLO/i;
console.log(pattern.test("hello world"));
console.log(pattern.test("HELLO world"));
console.log(pattern.test("HeLLo world"));
      `.trim();
      
      const { jsOutput } = testEquivalence('regexp-case-insensitive', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        'true',
        'true',
        'true'
      ]);
    });
    
    it('should support global flag', () => {
      const code = `
const pattern = /\\d+/g;
console.log(pattern.global);
console.log(pattern.test("123"));
console.log(pattern.lastIndex);
      `.trim();
      
      const { jsOutput } = testEquivalence('regexp-global-flag', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        'true',
        'true',
        '3'
      ]);
    });
  });
  
  describe('RegExp.exec()', () => {
    it('should return match with capture groups', () => {
      const code = `
const pattern = /(\\w+)@(\\w+)\\.(\\w+)/;
const result = pattern.exec("user@example.com");
if (result) {
  console.log(result[0]);
  console.log(result[1]);
  console.log(result[2]);
  console.log(result[3]);
  console.log(result.length);
}
      `.trim();
      
      const { jsOutput } = testEquivalence('regexp-exec-groups', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        'user@example.com',
        'user',
        'example',
        'com',
        '4'
      ]);
    });
    
    it('should return null for no match', () => {
      const code = `
const pattern = /xyz/;
const result = pattern.exec("abc");
console.log(result === null);
      `.trim();
      
      const { jsOutput } = testEquivalence('regexp-exec-nomatch', code, { skipCpp: true });
      
      expect(jsOutput).toBe('true');
    });
  });
  
  describe('String.match()', () => {
    it('should match with capture groups (non-global)', () => {
      const code = `
const email = "contact@goodscript.dev";
const pattern = /(\\w+)@(\\w+)\\.(\\w+)/;
const match = email.match(pattern);
if (match) {
  console.log(match[0]);
  console.log(match[1]);
  console.log(match[2]);
  console.log(match[3]);
}
      `.trim();
      
      const { jsOutput } = testEquivalence('string-match-groups', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        'contact@goodscript.dev',
        'contact',
        'goodscript',
        'dev'
      ]);
    });
    
    it('should return all matches with global flag', () => {
      const code = `
const text = "The numbers are 42, 123, and 7";
const pattern = /\\d+/g;
const matches = text.match(pattern);
if (matches) {
  console.log(matches.length);
  console.log(matches[0]);
  console.log(matches[1]);
  console.log(matches[2]);
}
      `.trim();
      
      const { jsOutput } = testEquivalence('string-match-global', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        '3',
        '42',
        '123',
        '7'
      ]);
    });
    
    it('should return null for no match', () => {
      const code = `
const text = "hello";
const pattern = /xyz/;
const match = text.match(pattern);
console.log(match === null);
      `.trim();
      
      const { jsOutput } = testEquivalence('string-match-nomatch', code, { skipCpp: true });
      
      expect(jsOutput).toBe('true');
    });
  });
  
  describe('String.search()', () => {
    it('should return index of first match', () => {
      const code = `
const text = "The quick brown fox";
const pattern = /brown/;
console.log(text.search(pattern));
      `.trim();
      
      const { jsOutput } = testEquivalence('string-search-found', code, { skipCpp: true });
      
      expect(jsOutput).toBe('10');
    });
    
    it('should return -1 for no match', () => {
      const code = `
const text = "The quick brown fox";
const pattern = /purple/;
console.log(text.search(pattern));
      `.trim();
      
      const { jsOutput } = testEquivalence('string-search-notfound', code, { skipCpp: true });
      
      expect(jsOutput).toBe('-1');
    });
  });
  
  describe('String.replace()', () => {
    it('should replace first match (non-global)', () => {
      const code = `
const text = "1 2 3 4 5";
const pattern = /\\d/;
const result = text.replace(pattern, "X");
console.log(result);
      `.trim();
      
      const { jsOutput } = testEquivalence('string-replace-first', code, { skipCpp: true });
      
      expect(jsOutput).toBe('X 2 3 4 5');
    });
    
    it('should replace all matches with global flag', () => {
      const code = `
const text = "1 2 3 4 5";
const pattern = /\\d/g;
const result = text.replace(pattern, "X");
console.log(result);
      `.trim();
      
      const { jsOutput } = testEquivalence('string-replace-global', code, { skipCpp: true });
      
      expect(jsOutput).toBe('X X X X X');
    });
    
    it('should replace with string (non-regex)', () => {
      const code = `
const text = "Hello World";
const result = text.replace("World", "GoodScript");
console.log(result);
      `.trim();
      
      const { jsOutput } = testEquivalence('string-replace-string', code, { skipCpp: true });
      
      expect(jsOutput).toBe('Hello GoodScript');
    });
  });
  
  describe('String.split()', () => {
    it('should split by regex pattern', () => {
      const code = `
const csv = "apple,banana,cherry";
const pattern = /,/;
const parts = csv.split(pattern);
console.log(parts.length);
console.log(parts[0]);
console.log(parts[1]);
console.log(parts[2]);
      `.trim();
      
      const { jsOutput } = testEquivalence('string-split-regex', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        '3',
        'apple',
        'banana',
        'cherry'
      ]);
    });
    
    it('should split by whitespace pattern', () => {
      const code = `
const text = "one   two\\tthree\\nfour";
const pattern = /\\s+/;
const words = text.split(pattern);
console.log(words.length);
console.log(words[0]);
console.log(words[1]);
console.log(words[2]);
console.log(words[3]);
      `.trim();
      
      const { jsOutput } = testEquivalence('string-split-whitespace', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        '4',
        'one',
        'two',
        'three',
        'four'
      ]);
    });
  });
  
  describe('Advanced Regex Features', () => {
    it('should support lookahead assertions', () => {
      const code = `
const pattern = /\\d+(?=px)/;
console.log(pattern.test("width: 100px"));
console.log(pattern.test("width: 100em"));
      `.trim();
      
      const { jsOutput } = testEquivalence('regexp-lookahead', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        'true',
        'false'
      ]);
    });
    
    it('should support lookbehind assertions', () => {
      const code = `
const pattern = /(?<=\\$)\\d+/;
console.log(pattern.test("Price: $50"));
console.log(pattern.test("Price: 50"));
      `.trim();
      
      const { jsOutput } = testEquivalence('regexp-lookbehind', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        'true',
        'false'
      ]);
    });
    
    it('should support multiline flag', () => {
      const code = `
const pattern = /^test/m;
console.log(pattern.test("line1\\ntest line"));
console.log(pattern.test("line1\\nno match"));
      `.trim();
      
      const { jsOutput } = testEquivalence('regexp-multiline', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        'true',
        'false'
      ]);
    });
    
    it('should support dotAll flag', () => {
      const code = `
const pattern = /a.b/s;
console.log(pattern.test("a\\nb"));
const pattern2 = /a.b/;
console.log(pattern2.test("a\\nb"));
      `.trim();
      
      const { jsOutput } = testEquivalence('regexp-dotall', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        'true',
        'false'
      ]);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle empty pattern', () => {
      const code = `
const pattern = new RegExp("");
console.log(pattern.test("anything"));
console.log(pattern.test(""));
      `.trim();
      
      const { jsOutput } = testEquivalence('regexp-empty-pattern', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        'true',
        'true'
      ]);
    });
    
    it('should handle empty string', () => {
      const code = `
const text = "";
const pattern = /test/;
console.log(text.search(pattern));
console.log(text.match(pattern) === null);
      `.trim();
      
      const { jsOutput } = testEquivalence('regexp-empty-string', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        '-1',
        'true'
      ]);
    });
    
    it('should handle special characters', () => {
      const code = `
const pattern = /\\./;
console.log(pattern.test("file.txt"));
console.log(pattern.test("filename"));

const pattern2 = /\\$/;
console.log(pattern2.test("Price: $50"));
      `.trim();
      
      const { jsOutput } = testEquivalence('regexp-special-chars', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        'true',
        'false',
        'true'
      ]);
    });
  });
  
  describe('RegExp Properties', () => {
    it('should expose pattern source', () => {
      const code = `
const pattern = /test/gi;
console.log(pattern.source);
console.log(pattern.flags);
console.log(pattern.global);
console.log(pattern.ignoreCase);
      `.trim();
      
      const { jsOutput } = testEquivalence('regexp-properties', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        'test',
        'gi',
        'true',
        'true'
      ]);
    });
    
    it('should track lastIndex for global patterns', () => {
      const code = `
const pattern = /\\d/g;
console.log(pattern.lastIndex);
pattern.test("123");
console.log(pattern.lastIndex);
pattern.test("456");
console.log(pattern.lastIndex);
      `.trim();
      
      const { jsOutput } = testEquivalence('regexp-lastindex', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        '0',
        '1',
        '2'
      ]);
    });
  });
  
  describe('Real-World Use Cases', () => {
    it('should validate email addresses', () => {
      const code = `
const emailPattern = /^[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}$/;
console.log(emailPattern.test("user@example.com"));
console.log(emailPattern.test("invalid.email"));
console.log(emailPattern.test("name@domain.co.uk"));
      `.trim();
      
      const { jsOutput } = testEquivalence('regexp-email-validation', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        'true',
        'false',
        'true'
      ]);
    });
    
    it('should extract URL components', () => {
      const code = `
const url = "https://www.example.com:8080/path/to/page?query=value";
const pattern = /(https?):\\/\\/([^:\\/]+)(?::(\\d+))?\\/([^?]*)/;
const match = url.match(pattern);
if (match) {
  console.log(match[1]); // protocol
  console.log(match[2]); // domain
  console.log(match[3]); // port
  console.log(match[4]); // path
}
      `.trim();
      
      const { jsOutput } = testEquivalence('regexp-url-parsing', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        'https',
        'www.example.com',
        '8080',
        'path/to/page'
      ]);
    });
    
    it('should sanitize input by removing tags', () => {
      const code = `
const html = "<p>Hello <b>World</b></p>";
const pattern = /<[^>]+>/g;
const clean = html.replace(pattern, "");
console.log(clean);
      `.trim();
      
      const { jsOutput } = testEquivalence('regexp-sanitize', code, { skipCpp: true });
      
      expect(jsOutput).toBe('Hello World');
    });
    
    it('should format phone numbers', () => {
      const code = `
const phone = "1234567890";
const pattern = /(\\d{3})(\\d{3})(\\d{4})/;
const match = phone.match(pattern);
if (match) {
  const formatted = \`(\${match[1]}) \${match[2]}-\${match[3]}\`;
  console.log(formatted);
}
      `.trim();
      
      const { jsOutput } = testEquivalence('regexp-phone-format', code, { skipCpp: true });
      
      expect(jsOutput).toBe('(123) 456-7890');
    });
  });
});
