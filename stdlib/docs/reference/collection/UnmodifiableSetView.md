# UnmodifiableSetView

A read-only wrapper around a set that prevents modifications.

## Import

```typescript
import { UnmodifiableSetView } from '@goodscript/collection';
```

## Constructor

```typescript
new UnmodifiableSetView<E>(source: Set<E>)
```

Wraps an existing Set. Changes to the source are visible through the view.

## Methods

- `has(element: E): boolean` - Check membership
- `getLength(): number` - Number of elements
- `isEmpty(): boolean`
- `isNotEmpty(): boolean`
- `contains(element: E): boolean` - Alias for `has`
- `toArray(): E[]` - Create array copy
- `toString(): string`

## Iteration

```typescript
const view = new UnmodifiableSetView(new Set([1, 2, 3]));
for (const item of view) {
  console.log(item);
}
```

## Example

```typescript
const source = new Set([1, 2, 3]);
const view = new UnmodifiableSetView(source);

view.has(2); // true
view.getLength(); // 3

source.add(4);
view.getLength(); // 4 (reflects source changes)
```
