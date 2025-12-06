# UnmodifiableListView

A read-only wrapper around a list that prevents modifications.

## Import

```typescript
import { UnmodifiableListView } from '@goodscript/collection';
```

## Constructor

```typescript
new UnmodifiableListView<E>(source: E[])
```

Wraps an existing array. Changes to the source array are visible through the view.

## Methods

**Read-only operations:**
- `get(index: number): E` - Get element at index
- `getLength(): number` - Number of elements
- `getFirst(): E` - First element
- `getLast(): E` - Last element
- `isEmpty(): boolean`
- `isNotEmpty(): boolean`
- `contains(element: E): boolean`
- `indexOf(element: E, start?: number): number`
- `lastIndexOf(element: E, start?: number): number`
- `toArray(): E[]` - Creates a copy

## Iteration

Supports `for...of` loops:

```typescript
const view = new UnmodifiableListView([1, 2, 3]);
for (const item of view) {
  console.log(item);
}
```

## Example

```typescript
const data = [1, 2, 3];
const view = new UnmodifiableListView(data);

view.get(0); // 1
view.getLength(); // 3

// Modifications to source are visible
data.push(4);
view.getLength(); // 4
```

## Use Cases

- Expose internal collections without allowing modifications
- API return values that should be read-only
- Functional programming with immutable data
