# GoodScript C++ Runtime Library

This directory contains the GoodScript C++ runtime library - a collection of header-only wrapper classes that provide TypeScript-compatible APIs for C++ standard library types.

## Philosophy

Instead of using C++ standard library types directly (`std::string`, `std::vector`, etc.), we wrap them in custom classes (`gs::String`, `gs::Array<T>`, etc.) to provide:

1. **TypeScript-like API**: Methods match TypeScript/JavaScript naming and behavior
2. **Type Safety**: Distinct types help catch errors at compile time
3. **Future-proof**: Can optimize or change implementation without breaking code
4. **Consistent Namespace**: All GoodScript stdlib in `gs::` namespace
5. **Zero Overhead**: Wrappers are thin and inline, optimized away by compiler

## Why Not Inherit from STL Classes?

C++ standard library classes like `std::string`, `std::vector`, `std::map` etc. **cannot be safely inherited from** because:

- They lack virtual destructors
- They weren't designed as base classes
- Polymorphic use leads to undefined behavior

Instead, we use **composition** - wrapping STL types internally and exposing a TypeScript-like interface.

## Header Files

### Core Types

- **`gs_string.hpp`**: `gs::String` - TypeScript-compatible string wrapper
  - Methods: `charAt()`, `indexOf()`, `substring()`, `slice()`, `startsWith()`, `endsWith()`, `toLowerCase()`, `toUpperCase()`, `trim()`, `repeat()`, `padStart()`, `padEnd()`, etc.
  - Static: `String.fromCharCode()`
  
- **`gs_array.hpp`**: `gs::Array<T>` - TypeScript-compatible array wrapper
  - Methods: `push()`, `pop()`, `shift()`, `unshift()`, `slice()`, `splice()`, `map()`, `filter()`, `reduce()`, `find()`, `findIndex()`, `indexOf()`, `includes()`, `join()`, `reverse()`, `sort()`, `forEach()`, etc.
  - Property: `length()`

- **`gs_map.hpp`**: `gs::Map<K,V>` and `gs::Set<T>` - TypeScript-compatible collection wrappers
  - Map methods: `set()`, `get()`, `has()`, `delete_()`, `clear()`, `forEach()`, `keys()`, `values()`, `entries()`
  - Set methods: `add()`, `has()`, `delete_()`, `clear()`, `forEach()`, `values()`
  - Property: `size()`

- **`gs_property.hpp`**: `gs::Property` - Type-erased value wrapper
  - Holds any type: `bool`, `number`, `string`, or complex objects
  - Runtime type checking: `isBool()`, `isNumber()`, `isString()`, `isObject()`, `isNull()`, `isUndefined()`
  - Safe value extraction: `asBool()`, `asNumber()`, `asString()`, `asObject<T>()`
  - Used for object literal properties with heterogeneous types
  - Example:
    ```cpp
    Property p1(42);           // number
    Property p2("hello");      // string
    Property p3(true);         // bool
    double n = p1.asNumber();  // 42.0
    String s = p2.asString();  // "hello"
    ```

### Utilities

- **`gs_json.hpp`**: `gs::JSON` - JSON utilities
  - `JSON::stringify()` for basic types and arrays
  - `JSON::parse()` (placeholder - integrate proper JSON library for production)

- **`gs_console.hpp`**: `gs::console` - Console logging
  - `console::log()`, `console::error()`, `console::warn()`
  - Supports multiple arguments

- **`gs_math.hpp`**: `gs::Math` - Math utilities
  - Constants: `Math::PI`, `Math::E`
  - Functions: `Math::abs()`, `Math::sin()`, `Math::cos()`, `Math::sqrt()`, `Math::floor()`, `Math::ceil()`, `Math::round()`, etc.

- **`gs_number.hpp`**: `gs::Number` - Number utilities
  - `Number::isNaN()`, `Number::isFinite()`, `Number::parseInt()`, `Number::parseFloat()`

- **`gs_object.hpp`**: `gs::Object` - Object utilities and LiteralObject type
  - **LiteralObject type**: `Map<String, Property>` for heterogeneous object literals
    - Supports object literals with mixed property types: `{ a: 1, b: "hello", c: true }`
    - Example:
      ```cpp
      LiteralObject obj = {
        {"name", Property("Alice")},
        {"age", Property(30)},
        {"active", Property(true)}
      };
      auto name = obj.get("name").value().asString();  // "Alice"
      ```
  - **Supported Object methods**:
    - `Object::keys(map/obj)` - returns `Array<K>` of keys
    - `Object::values(map/obj)` - returns `Array<V>` or `Array<Property>` of values
    - `Object::entries(map/obj)` - returns `Array<pair<K,V>>` or `Array<pair<String,Property>>` of entries
    - `Object::assign(target, sources...)` - merge maps or literal objects (variadic template)
    - `Object::is(a, b)` - SameValue comparison (handles NaN and ±0 correctly)
  - **Restricted methods** (GS123-124):
    - Immutability: `freeze()`, `seal()`, `preventExtensions()` (no-ops, restricted)
    - Reflection/prototypes: `defineProperty()`, `create()`, `getPrototypeOf()`, etc. (restricted)
  - Note: Supports both `Map<K,V>` and `LiteralObject` types

### Implementation Details

- **`gs_array_impl.hpp`**: Template implementations that require cross-type dependencies
  - Currently contains `Array::join()` which depends on `String`

### Main Header

- **`gs_runtime.hpp`**: Main runtime header - includes all of the above
  - Also defines `gs::shared_ptr<T>` and `gs::weak_ptr<T>`
  - Provides helper functions like `wrap_for_push<>()`

## Usage in Generated Code

The C++ code generator should:

1. **Include the runtime**:
   ```cpp
   #include "gs_runtime.hpp"
   ```

2. **Map TypeScript types to GoodScript types**:
   - `string` → `gs::String`
   - `number` → `double` (or `int` for integers)
   - `boolean` → `bool`
   - `Array<T>` → `gs::Array<T>`
   - `Map<K,V>` → `gs::Map<K,V>`
   - `Set<T>` → `gs::Set<T>`
   - Object literals → `gs::LiteralObject` (Map<String, Property>)
   - `own<T>` → `std::unique_ptr<T>`
   - `share<T>` → `gs::shared_ptr<T>`
   - `use<T>` → `gs::weak_ptr<T>`

3. **Map global objects**:
   - `JSON` → `gs::JSON`
   - `console` → `gs::console`
   - `Math` → `gs::Math`
   - `Number` → `gs::Number`
   - `Object` → `gs::Object`
   - `String` → `gs::String` (for static methods)

## Example Transformations

### TypeScript/GoodScript

```typescript
const message: string = "Hello, World!";
const upper = message.toUpperCase();
const index = message.indexOf("World");

const numbers: Array<number> = [1, 2, 3, 4, 5];
const doubled = numbers.map(x => x * 2);
const sum = numbers.reduce((acc, x) => acc + x, 0);

// Object literals with mixed types
const person = { name: "Alice", age: 30, active: true };
console.log(Object.keys(person));  // ["name", "age", "active"]
const name = person.name;           // "Alice"
const sum = numbers.reduce((acc, x) => acc + x, 0);

const cache = new Map<string, number>();
cache.set("answer", 42);
const answer = cache.get("answer");

console.log("Answer:", answer);
console.log(JSON.stringify(numbers));
```

### Generated C++

```cpp
#include "gs_runtime.hpp"

int main() {
  gs::String message = "Hello, World!";
  gs::String upper = message.toUpperCase();
  int index = message.indexOf(gs::String("World"));

  gs::Array<double> numbers = {1, 2, 3, 4, 5};
  auto doubled = numbers.map([](double x) { return x * 2; });
  auto sum = numbers.reduce([](double acc, double x) { return acc + x; }, 0.0);

  // Object literal becomes LiteralObject
  gs::LiteralObject person = {
    {"name", gs::Property("Alice")},
    {"age", gs::Property(30)},
    {"active", gs::Property(true)}
  };
  gs::console::log(Object::keys(person));  // ["name", "age", "active"]
  auto name = person.get("name").value().asString();  // "Alice"

  gs::Map<gs::String, double> cache;
  cache.set(gs::String("answer"), 42.0);
  auto answer = cache.get(gs::String("answer"));

  gs::console::log(gs::String("Answer:"), answer.value());
  gs::console::log(gs::JSON::stringify(numbers));
  
  return 0;
}
```  gs::console::log(gs::String("Answer:"), answer.value());
  gs::console::log(gs::JSON::stringify(numbers));
  
  return 0;
}
```

## C++ Interoperability

All wrapper classes provide conversion methods to access underlying STL types:

```cpp
gs::String str = "hello";
const std::string& stdStr = str.str();  // Get underlying std::string

gs::Array<int> arr = {1, 2, 3};
const std::vector<int>& vec = arr.vec();  // Get underlying std::vector

gs::Map<int, int> map;
const std::unordered_map<int, int>& stdMap = map.map();  // Get underlying map
```

They also provide implicit conversions where safe:

```cpp
gs::String str = "hello";
std::string_view sv = str;  // Implicit conversion to string_view
```

## Performance Notes

- **Header-only**: All code is inline, allowing aggressive compiler optimization
- **Zero-cost abstraction**: Wrappers are optimized away in release builds
- **Move semantics**: Full support for C++11 move semantics
- **Non-atomic smart pointers**: `gs::shared_ptr<T>` and `gs::weak_ptr<T>` use non-atomic reference counting for single-threaded performance (currently aliased to `std::shared_ptr` - TODO: implement custom version)

## Future Enhancements

1. **Custom `gs::shared_ptr<T>`**: Non-atomic reference counting for better performance
2. **Full JSON support**: Integrate nlohmann/json or simdjson
3. **Math library**: `gs::Math` with common functions (`sin`, `cos`, `sqrt`, `random`, etc.)
4. **Async/await**: C++20 coroutine support for `Promise<T>`
5. **RegExp**: Regular expression support
6. **Date**: Date/time utilities

## Testing

TODO: Add unit tests for each wrapper class to verify:
- API compatibility with TypeScript behavior
- Performance benchmarks
- Compiler optimization verification
- Edge cases and error handling

## License

Same as GoodScript project.
