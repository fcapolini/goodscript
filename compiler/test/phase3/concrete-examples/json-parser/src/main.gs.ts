/**
 * Simple JSON Tokenizer and Parser
 * 
 * Demonstrates:
 * - Recursive parsing
 * - State management
 * - String manipulation
 * - Error handling
 * - Complex control flow
 */

/// <reference path="../../../../../lib/goodscript.d.ts" />

enum TokenType {
  LeftBrace,
  RightBrace,
  LeftBracket,
  RightBracket,
  Colon,
  Comma,
  String,
  Number,
  True,
  False,
  Null,
  EOF
}

class Token {
  type: TokenType;
  value: string;
  
  constructor(type: TokenType, value: string) {
    this.type = type;
    this.value = value;
  }
}

class Tokenizer {
  private input: share<string>;
  private pos: number;
  
  constructor(input: share<string>) {
    this.input = input;
    this.pos = 0;
  }
  
  private peek(): string | null {
    if (this.pos < this.input.length) {
      return this.input.charAt(this.pos);
    }
    return null;
  }
  
  private advance(): void {
    this.pos++;
  }
  
  private skipWhitespace(): void {
    while (this.pos < this.input.length) {
      const ch = this.peek();
      if (ch !== null && (ch === " " || ch === "\n" || ch === "\t" || ch === "\r")) {
        this.advance();
      } else {
        break;
      }
    }
  }
  
  private readString(): string {
    let result = "";
    this.advance(); // Skip opening quote
    
    while (this.pos < this.input.length) {
      const ch = this.peek();
      if (ch === "\"") {
        this.advance();
        break;
      } else if (ch === "\\") {
        this.advance();
        const next = this.peek();
        if (next !== null) {
          result = result + next;
          this.advance();
        }
      } else if (ch !== null) {
        result = result + ch;
        this.advance();
      }
    }
    
    return result;
  }
  
  private readNumber(): string {
    let result = "";
    
    while (this.pos < this.input.length) {
      const ch = this.peek();
      if (ch !== null && (ch >= "0" && ch <= "9" || ch === "." || ch === "-" || ch === "e" || ch === "E" || ch === "+")) {
        result = result + ch;
        this.advance();
      } else {
        break;
      }
    }
    
    return result;
  }
  
  private readKeyword(): string {
    let result = "";
    
    while (this.pos < this.input.length) {
      const ch = this.peek();
      if (ch !== null && ch >= "a" && ch <= "z") {
        result = result + ch;
        this.advance();
      } else {
        break;
      }
    }
    
    return result;
  }
  
  nextToken(): own<Token> {
    this.skipWhitespace();
    
    if (this.pos >= this.input.length) {
      return new Token(TokenType.EOF, "");
    }
    
    const ch = this.peek();
    
    if (ch === "{") {
      this.advance();
      return new Token(TokenType.LeftBrace, "{");
    } else if (ch === "}") {
      this.advance();
      return new Token(TokenType.RightBrace, "}");
    } else if (ch === "[") {
      this.advance();
      return new Token(TokenType.LeftBracket, "[");
    } else if (ch === "]") {
      this.advance();
      return new Token(TokenType.RightBracket, "]");
    } else if (ch === ":") {
      this.advance();
      return new Token(TokenType.Colon, ":");
    } else if (ch === ",") {
      this.advance();
      return new Token(TokenType.Comma, ",");
    } else if (ch === "\"") {
      const str = this.readString();
      return new Token(TokenType.String, str);
    } else if (ch !== null && (ch >= "0" && ch <= "9" || ch === "-")) {
      const num = this.readNumber();
      return new Token(TokenType.Number, num);
    } else if (ch !== null) {
      const keyword = this.readKeyword();
      if (keyword === "true") {
        return new Token(TokenType.True, "true");
      } else if (keyword === "false") {
        return new Token(TokenType.False, "false");
      } else if (keyword === "null") {
        return new Token(TokenType.Null, "null");
      }
    }
    
    // Error case - skip unknown character
    this.advance();
    return this.nextToken();
  }
}

class JsonValue {
  kind: string;
  stringValue: string;
  numberValue: number;
  booleanValue: boolean;
  objectValue: Map<string, share<JsonValue>> | null;
  arrayValue: share<JsonValue>[] | null;
  
  constructor(kind: string) {
    this.kind = kind;
    this.stringValue = "";
    this.numberValue = 0;
    this.booleanValue = false;
    this.objectValue = null;
    this.arrayValue = null;
  }
  
  static fromString(value: string): JsonValue {
    const result = new JsonValue("string");
    result.stringValue = value;
    return result;
  }
  
  static fromNumber(value: string): JsonValue {
    const result = new JsonValue("number");
    result.numberValue = 0; // Simplified
    return result;
  }
  
  static fromBoolean(value: boolean): JsonValue {
    const result = new JsonValue("boolean");
    result.booleanValue = value;
    return result;
  }
  
  static fromNull(): JsonValue {
    return new JsonValue("null");
  }
  
  static fromObject(value: Map<string, share<JsonValue>>): JsonValue {
    const result = new JsonValue('object');
    result.objectValue = value;
    return result;
  }
  
  static fromArray(value: share<JsonValue>[]): JsonValue {
    const result = new JsonValue('array');
    result.arrayValue = value;
    return result;
  }
}

class Parser {
  private tokenizer: own<Tokenizer>;
  private current: own<Token>;
  
  constructor(input: share<string>) {
    this.tokenizer = new Tokenizer(input);
    this.current = this.tokenizer.nextToken();
  }
  
  private advance(): void {
    this.current = this.tokenizer.nextToken();
  }
  
  private expect(type: TokenType): boolean {
    return this.current.type === type;
  }
  
  parse(): JsonValue | null {
    return this.parseValue();
  }
  
  private parseValue(): JsonValue | null {
    if (this.expect(TokenType.LeftBrace)) {
      return this.parseObject();
    } else if (this.expect(TokenType.LeftBracket)) {
      return this.parseArray();
    } else if (this.expect(TokenType.String)) {
      const value = this.current.value;
      this.advance();
      return JsonValue.fromString(value);
    } else if (this.expect(TokenType.Number)) {
      const value = this.current.value;
      this.advance();
      return JsonValue.fromNumber(value);
    } else if (this.expect(TokenType.True)) {
      this.advance();
      return JsonValue.fromBoolean(true);
    } else if (this.expect(TokenType.False)) {
      this.advance();
      return JsonValue.fromBoolean(false);
    } else if (this.expect(TokenType.Null)) {
      this.advance();
      return JsonValue.fromNull();
    }
    
    return null;
  }
  
  private parseObject(): JsonValue {
    const obj: Map<string, share<JsonValue>> = new Map<string, share<JsonValue>>();
    this.advance(); // Skip {
    
    while (!this.expect(TokenType.RightBrace) && !this.expect(TokenType.EOF)) {
      if (this.expect(TokenType.String)) {
        const key = this.current.value;
        this.advance();
        
        if (this.expect(TokenType.Colon)) {
          this.advance();
          const value = this.parseValue();
          if (value !== null) {
            obj.set(key, value);
          }
        }
        
        if (this.expect(TokenType.Comma)) {
          this.advance();
        }
      } else {
        this.advance();
      }
    }
    
    if (this.expect(TokenType.RightBrace)) {
      this.advance();
    }
    
    return JsonValue.fromObject(obj);
  }
  
  private parseArray(): JsonValue {
    const arr: share<JsonValue>[] = [];
    this.advance(); // Skip [
    
    while (!this.expect(TokenType.RightBracket) && !this.expect(TokenType.EOF)) {
      const value = this.parseValue();
      if (value !== null) {
        arr.push(value);
      }
      
      if (this.expect(TokenType.Comma)) {
        this.advance();
      } else if (!this.expect(TokenType.RightBracket)) {
        break;
      }
    }
    
    if (this.expect(TokenType.RightBracket)) {
      this.advance();
    }
    
    return JsonValue.fromArray(arr);
  }
}

// Example usage
const testParser = (): void => {
  const json = '{"name": "Alice", "age": 30, "active": true, "tags": ["dev", "admin"]}';
  const parser = new Parser(json);
  const result = parser.parse();
  
  if (result !== null) {
    console.log(`Parsed JSON kind: ${result.kind}`);
  } else {
    console.log("Failed to parse JSON");
  }
}

testParser();
