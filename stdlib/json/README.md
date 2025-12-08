# @goodscript/json

JSON parsing and serialization for GoodScript.

## Features

- **Type-safe JSON**: Discriminated union representation
- **Dual error handling**: Throwing and try* variants for all operations
- **Typed extraction**: Helpers to safely extract values from JSON (`JsonTools`)

## Installation

```bash
npm install @goodscript/json
```

## Usage

```typescript
import { JSON, JsonTools, type JsonValue } from '@goodscript/json';

// Parse JSON
const data = JSON.parse('{"name": "Alice", "age": 30}');

// Type-safe access
if (data.kind === 'object') {
  const name = JsonTools.get(data, 'name');
  if (name.kind === 'string') {
    console.log(name.value);  // "Alice"
  }
}

// Safe parsing
const maybeData = JSON.tryParse('invalid json');
if (maybeData === null) {
  console.log('Parse failed');
}

// Stringify
const obj: JsonValue = {
  kind: 'object',
  value: new Map([
    ['name', { kind: 'string', value: 'Bob' }],
    ['score', { kind: 'number', value: 95 }]
  ])
};
const json = JSON.stringify(obj);          // Compact
const pretty = JSON.stringify(obj, true);  // Pretty-printed
```

## JsonValue Type

All JSON values use a discriminated union:

```typescript
type JsonValue =
  | { kind: 'null' }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'array'; value: Array<JsonValue> }
  | { kind: 'object'; value: Map<string, JsonValue> };
```

This ensures type safety and makes pattern matching explicit.

## License

MIT OR Apache-2.0
