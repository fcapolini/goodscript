# GoodScript Runtime

C++ runtime library for compiled GoodScript code.

## Contents

- `cpp/` - C++ header-only runtime library
  - `gs_runtime.hpp` - Ownership mode runtime (smart pointers)
  - `gs_gc_runtime.hpp` - GC mode runtime (garbage collector)
  - Core types: String, Array, Map, Set, etc.

## Usage

The compiler automatically includes the appropriate runtime header based on compilation mode.

```cpp
// Generated code includes:
#include "gs_runtime.hpp"      // ownership mode
// or
#include "gs_gc_runtime.hpp"   // GC mode
```

## Status

🚧 Will be ported from v0.11 once IR stabilizes.

## License

Licensed under either of:

- Apache License, Version 2.0 ([LICENSE-APACHE](../LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT License ([LICENSE-MIT](../LICENSE-MIT) or http://opensource.org/licenses/MIT)

at your option.
