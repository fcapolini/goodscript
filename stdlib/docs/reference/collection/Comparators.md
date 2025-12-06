# Comparators

String comparison utilities for GoodScript, providing various comparison functions including case-insensitive comparison and natural sort ordering.

**Module**: `@goodscript/collection`  
**Source**: Translated from [Dart's collection/comparators.dart](https://github.com/dart-lang/collection/blob/master/lib/src/comparators.dart)

## Overview

The comparators module provides efficient string comparison and hashing functions optimized for specific use cases:

- **Case-insensitive ASCII comparison**: Compare strings ignoring ASCII letter case
- **Natural sort ordering**: Sort strings with embedded numbers numerically
- **Hash functions**: Generate hash codes compatible with comparison functions

## Functions

### equalsIgnoreAsciiCase

```typescript
function equalsIgnoreAsciiCase(a: string, b: string): boolean
```

Checks if two strings are equal, ignoring the case of ASCII letters only.

**Parameters:**
- `a` - First string to compare
- `b` - Second string to compare

**Returns:** `true` if strings are equal ignoring ASCII case

**Example:**
```typescript
equalsIgnoreAsciiCase('hello', 'HELLO');  // true
equalsIgnoreAsciiCase('Test', 'test');    // true
equalsIgnoreAsciiCase('café', 'CAFÉ');    // false (non-ASCII)
```

**Notes:**
- Only ASCII letters (A-Z, a-z) are case-normalized
- Non-ASCII characters like æ, é, ñ must match exactly
- Useful for ASCII-only data like identifiers, hex strings, or GUIDs

---

### hashIgnoreAsciiCase

```typescript
function hashIgnoreAsciiCase(str: string): number
```

Generates a hash code compatible with `equalsIgnoreAsciiCase`. Strings that are equal according to `equalsIgnoreAsciiCase` will have the same hash.

**Parameters:**
- `str` - String to hash

**Returns:** Hash code as a number

**Example:**
```typescript
hashIgnoreAsciiCase('hello') === hashIgnoreAsciiCase('HELLO');  // true
```

**Notes:**
- Uses Jenkins hash function adapted for SMI values
- ASCII letters are normalized before hashing
- Can be used for case-insensitive hash tables

---

### compareAsciiUpperCase

```typescript
function compareAsciiUpperCase(a: string, b: string): number
```

Compares strings lexically after converting ASCII letters to uppercase. Uses tie-breaking on original case when strings differ only in case.

**Parameters:**
- `a` - First string
- `b` - Second string

**Returns:** 
- `-1` if `a < b`
- `0` if `a === b`
- `1` if `a > b`

**Example:**
```typescript
compareAsciiUpperCase('abc', 'ABC');  // 0 (equal ignoring case)
compareAsciiUpperCase('abc', 'def');  // -1
```

---

### compareAsciiLowerCase

```typescript
function compareAsciiLowerCase(a: string, b: string): number
```

Compares strings lexically after converting ASCII letters to lowercase. Uses tie-breaking on original case when strings differ only in case.

**Parameters:**
- `a` - First string
- `b` - Second string

**Returns:** 
- `-1` if `a < b`
- `0` if `a === b`
- `1` if `a > b`

**Example:**
```typescript
const arr = ['Zebra', 'apple', 'Banana'];
arr.sort(compareAsciiLowerCase);
// Result: ['apple', 'Banana', 'Zebra']
```

---

### compareNatural

```typescript
function compareNatural(a: string, b: string): number
```

Compares strings according to **natural sort ordering**, where embedded numbers are compared numerically rather than lexically.

**Parameters:**
- `a` - First string
- `b` - Second string

**Returns:** 
- `-1` if `a < b`
- `0` if `a === b`
- `1` if `a > b`

**Example:**
```typescript
compareNatural('a2', 'a10');    // -1 (2 < 10 numerically)
compareNatural('a100', 'a20');  // 1  (100 > 20 numerically)

// Sorting file names naturally
const files = ['file1.txt', 'file10.txt', 'file2.txt'];
files.sort(compareNatural);
// Result: ['file1.txt', 'file2.txt', 'file10.txt']
```

**Natural Sort Order Example:**

These strings are in natural sort order:
```
"a", "a0", "a0b", "a1", "a01", "a9", "a10", "a100", "a100b", "aa"
```

**Notes:**
- Embedded digit sequences are treated as numbers
- Leading zeros affect comparison (more zeros = greater)
- Non-numeric parts are compared lexically

---

### compareAsciiLowerCaseNatural

```typescript
function compareAsciiLowerCaseNatural(a: string, b: string): number
```

Combines case-insensitive ASCII comparison with natural sort ordering.

**Parameters:**
- `a` - First string
- `b` - Second string

**Returns:** 
- `-1` if `a < b`
- `0` if `a === b`
- `1` if `a > b`

**Example:**
```typescript
const files = ['Test10.txt', 'test2.txt', 'TEST1.txt'];
files.sort(compareAsciiLowerCaseNatural);
// Result: ['TEST1.txt', 'test2.txt', 'Test10.txt']
```

---

### compareAsciiUpperCaseNatural

```typescript
function compareAsciiUpperCaseNatural(a: string, b: string): number
```

Combines case-insensitive ASCII comparison (using uppercase) with natural sort ordering.

**Parameters:**
- `a` - First string
- `b` - Second string

**Returns:** 
- `-1` if `a < b`
- `0` if `a === b`
- `1` if `a > b`

**Example:**
```typescript
compareAsciiUpperCaseNatural('Test2', 'test10');  // -1
```

## Use Cases

### File Name Sorting

```typescript
import { compareNatural } from '@goodscript/collection';

const files = [
  'report1.pdf',
  'report10.pdf',
  'report2.pdf',
  'report20.pdf'
];

files.sort(compareNatural);
// Result: ['report1.pdf', 'report2.pdf', 'report10.pdf', 'report20.pdf']
```

### Case-Insensitive Lookup

```typescript
import { equalsIgnoreAsciiCase, hashIgnoreAsciiCase } from '@goodscript/collection';

class CaseInsensitiveMap<V> {
  private map = new Map<number, [string, V][]>();
  
  set(key: string, value: V): void {
    const hash = hashIgnoreAsciiCase(key);
    const bucket = this.map.get(hash) || [];
    
    // Find existing key
    for (let i = 0; i < bucket.length; i++) {
      if (equalsIgnoreAsciiCase(bucket[i][0], key)) {
        bucket[i] = [key, value];
        return;
      }
    }
    
    // Add new entry
    bucket.push([key, value]);
    this.map.set(hash, bucket);
  }
  
  get(key: string): V | undefined {
    const hash = hashIgnoreAsciiCase(key);
    const bucket = this.map.get(hash);
    if (!bucket) return undefined;
    
    for (const [k, v] of bucket) {
      if (equalsIgnoreAsciiCase(k, key)) {
        return v;
      }
    }
    return undefined;
  }
}
```

### Version Number Sorting

```typescript
import { compareNatural } from '@goodscript/collection';

const versions = ['v1.0', 'v1.10', 'v1.2', 'v2.0'];
versions.sort(compareNatural);
// Result: ['v1.0', 'v1.2', 'v1.10', 'v2.0']
```

## Performance Characteristics

- **equalsIgnoreAsciiCase**: O(n) where n is string length
- **hashIgnoreAsciiCase**: O(n) where n is string length
- **compareAscii***: O(n) where n is length of shorter string
- **compareNatural**: O(n) worst case, typically better with early differences
- **compare*Natural**: O(n) with additional overhead for number parsing

## Limitations

1. **ASCII-only case handling**: Non-ASCII letters (æ, é, ñ, etc.) are not normalized
2. **Natural sort**: Only handles decimal integers in strings
3. **Tie-breaking**: Case differences result in deterministic but secondary ordering

## See Also

- [Algorithms](./Algorithms.md) - Sorting and searching utilities
- [EqualityMap](./EqualityMap.md) - Map with custom equality
- [EqualitySet](./EqualitySet.md) - Set with custom equality
