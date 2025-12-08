# @goodscript/core

Core types and collections for GoodScript.

## Features

- **ArrayTools**: Array utilities with dual error handling (throwing and try* variants)
- **MapTools**: Map utilities for safe key access and transformations
- **SetTools**: Set operations (union, intersection, difference, etc.)
- **StringTools**: String parsing utilities with dual error handling

## Installation

```bash
npm install @goodscript/core
```

## Usage

```typescript
import { ArrayTools, MapTools, SetTools, StringTools } from '@goodscript/core';

// ArrayTools - dual error handling pattern
const arr = [1, 2, 3];
ArrayTools.at(arr, 1);        // 2
ArrayTools.tryAt(arr, 10);    // null (safe)
ArrayTools.at(arr, 10);       // throws Error

// MapTools
const map = new Map([['key', 'value']]);
MapTools.getOrDefault(map, 'missing', 'default');  // 'default'

// SetTools
const a = new Set([1, 2, 3]);
const b = new Set([2, 3, 4]);
SetTools.union(a, b);         // Set {1, 2, 3, 4}
SetTools.intersection(a, b);  // Set {2, 3}

// StringTools
StringTools.parseInt('123');      // 123
StringTools.tryParseInt('abc');   // null
```

## License

MIT OR Apache-2.0
