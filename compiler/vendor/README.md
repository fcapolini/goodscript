# Vendored Dependencies

This directory contains third-party libraries bundled with GoodScript for ease of installation and deployment.

## cppcoro

**Version:** Based on andreasbuhr/cppcoro (C++20 fork of lewissbaker/cppcoro)  
**License:** MIT  
**Source:** https://github.com/andreasbuhr/cppcoro  
**Purpose:** Async/await support via C++20 coroutines

### Files Included

- `include/cppcoro/*.hpp` - All public headers
- `include/cppcoro/detail/*.hpp` - Internal implementation headers  
- `lib/lightweight_manual_reset_event.cpp` - Synchronization primitive for sync_wait
- `lib/spin_wait.cpp`, `lib/spin_mutex.cpp` - Supporting utilities
- `LICENSE` - MIT license from original project

### Why Vendored?

cppcoro is vendored (rather than using git submodule) to:
1. Ensure npm package includes everything needed for async/await
2. Eliminate need for `git submodule update --init`
3. Match Go's philosophy of bundling dependencies
4. Simplify installation to just `npm i -g goodscript`

### Modifications

None. Files are copied directly from the upstream repository with no changes.

### Updating

To update to a newer version of cppcoro:

```bash
# In a temporary directory
git clone https://github.com/andreasbuhr/cppcoro.git
cd cppcoro
git checkout <desired-tag-or-commit>

# Copy to GoodScript
cp -r include/cppcoro/*.hpp /path/to/goodscript/compiler/vendor/cppcoro/include/cppcoro/
cp -r include/cppcoro/detail/*.hpp /path/to/goodscript/compiler/vendor/cppcoro/include/cppcoro/detail/
cp lib/lightweight_manual_reset_event.cpp lib/spin_wait.cpp lib/spin_mutex.cpp lib/*.hpp \
   /path/to/goodscript/compiler/vendor/cppcoro/lib/
cp LICENSE.txt /path/to/goodscript/compiler/vendor/cppcoro/LICENSE

# Test
cd /path/to/goodscript/compiler
npm test test/phase3/basic/async-await.test.ts
npm test test/phase3/concrete-examples/async-await.test.ts
```

## Future Dependencies

Additional libraries that may be vendored in the future:

- **PCRE2** - For RegExp support (BSD license)
  - Currently requires system installation via brew/pkg-config
  - Plan: Vendor pre-compiled static libraries for major platforms

## License Compliance

All vendored dependencies are under permissive licenses (MIT, BSD) that allow:
- ✅ Use in commercial software
- ✅ Bundling/redistribution
- ✅ Modification (though we don't modify)

See each dependency's LICENSE file for full terms.
