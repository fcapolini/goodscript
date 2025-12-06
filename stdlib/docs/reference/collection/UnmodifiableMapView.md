# UnmodifiableMapView

A read-only wrapper around a map that prevents modifications.

## Import

```typescript
import { UnmodifiableMapView } from '@goodscript/collection';
```

## Constructor

```typescript
new UnmodifiableMapView<K, V>(source: Map<K, V>)
```

Wraps an existing Map. Changes to the source are visible through the view.

## Methods

- `get(key: K): V | undefined` - Get value for key
- `has(key: K): boolean` - Check if key exists
- `containsKey(key: K): boolean` - Alias for `has`
- `containsValue(value: V): boolean` - Check if value exists
- `getLength(): number` - Number of entries
- `isEmpty(): boolean`
- `isNotEmpty(): boolean`
- `getKeys(): K[]` - Array of keys
- `getValues(): V[]` - Array of values
- `getEntries(): Array<[K, V]>` - Array of [key, value] pairs
- `forEach(fn: (value: V, key: K) => void): void`

## Iteration

```typescript
const view = new UnmodifiableMapView(new Map([
  ['a', 1],
  ['b', 2]
]));

for (const [key, value] of view) {
  console.log(key, value);
}
```

## Example

```typescript
const source = new Map([['a', 1], ['b', 2]]);
const view = new UnmodifiableMapView(source);

view.get('a'); // 1
view.has('b'); // true
view.getLength(); // 2

source.set('c', 3);
view.getLength(); // 3 (reflects source changes)
```
