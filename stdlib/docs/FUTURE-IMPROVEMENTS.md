# GoodScript Standard Library - Future Improvements

This document tracks features and improvements that would enhance the stdlib but are deferred for later implementation.

## High Priority

### Iterator Protocol Support
**Status**: Blocked by language limitation  
**Blocker**: GoodScript validator rejects `Symbol` (error GS125)  
**Impact**: Currently using `toArray()` pattern instead of `for...of` loops

**What's needed:**
1. Define GoodScript-specific iterator protocol (without Symbol)
2. Add `Iterator<T>` interface to runtime
3. Implement codegen support for iterator methods → C++ begin/end
4. Create runtime iterator wrapper classes

**Current workaround:**
```typescript
// Instead of: for (const item of queue) { ... }
// Use: 
for (const item of queue.toArray()) { ... }
```

**Benefits when implemented:**
- More idiomatic code
- Better alignment with Dart originals
- Lazy iteration (don't need to snapshot to array)
- Prevents concurrent modification issues

**Estimated effort**: Medium (requires compiler + runtime changes)

**Reference**: 
- C++ runtime already has iterator support for Map/Set (see `gs_map.hpp`)
- Dart originals use `UnorderedElementsIterable` helper classes
- Would restore feature removed in PriorityQueue translation

---

## Medium Priority

### Getter/Setter Support
**Status**: Deferred - design decision needed  
**Current**: All getters converted to methods (`getLength()`, `getFirst()`, etc.)

**Trade-offs:**
- **Pros of current approach**: Explicit, clear C++ mapping, no ambiguity
- **Cons**: More verbose than property access, less JavaScript-idiomatic

**If implemented:**
- Would need codegen for getters → C++ methods
- Setters more complex (reference vs value semantics)
- Better Dart API alignment

**Estimated effort**: Low-Medium (codegen only)

---

### Enhanced Collection Methods
**Status**: Nice-to-have  
**Impact**: Quality of life improvements

Missing methods from Dart originals:
- `toList()` - non-destructive sorted snapshot (PriorityQueue)
- `toSet()` - convert to Set with deduplication
- `toUnorderedList()` - alias for `toArray()` with clearer semantics

**Current workarounds:**
```typescript
// toList() equivalent (destructive):
const sorted = queue.removeAll();

// toSet() equivalent:
const set = new Set(queue.toArray());
```

**Estimated effort**: Low (pure library code, no compiler changes)

---

## Low Priority

### Modification Count Tracking
**Status**: Removed for simplicity  
**Original purpose**: Detect concurrent modification during iteration

**Current approach**: 
- No iterator protocol, so no concurrent modification issues
- Users work with snapshots (`toArray()`)
- Simpler implementation, easier C++ translation

**If restored:**
- Would need iterator protocol first
- Adds complexity to every mutation
- Useful for catching bugs in complex code

**Estimated effort**: Low (once iterators are implemented)

---

### Symbol.iterator via Transpilation
**Status**: Potential workaround exploration  
**Idea**: Transpile `Symbol.iterator` to method name at compile time

**Example:**
```typescript
// TypeScript source:
[Symbol.iterator]() { return this.iterator(); }

// Transpiled to:
__gs_iterator() { return this.iterator(); }

// C++ codegen:
iterator begin() { return this->iterator(); }
```

**Benefits:**
- Enables `for...of` in TypeScript mode
- Clear C++ mapping
- No runtime Symbol overhead

**Challenges:**
- Need to handle all Symbol uses consistently
- May confuse TypeScript tooling
- Breaks from standard JavaScript

**Estimated effort**: Medium (compiler design + implementation)

---

## Research Needed

### Async Iterator Support
**Status**: Future consideration  
**Question**: How to map `async *` generators to C++ coroutines?

**Current approach**: N/A (not yet needed)

**When needed**: 
- Async/await support (planned for Phase 4)
- Streaming data structures
- Database result sets

**Estimated effort**: High (requires async/await foundation first)

---

## Tracking

| Feature | Priority | Blocker | Estimated Effort | Target Phase |
|---------|----------|---------|------------------|--------------|
| Iterator Protocol | High | Symbol rejection | Medium | 4 |
| Getter/Setter | Medium | Design decision | Low-Medium | 4-5 |
| Collection Methods | Low | None | Low | 4 |
| Modification Tracking | Low | Iterators | Low | 5 |
| Symbol Transpilation | Medium | Design review | Medium | 4-5 |
| Async Iterators | Research | Async/await | High | 5+ |

---

## Contributing

When you encounter a limitation during stdlib translation:
1. Document it here with current workaround
2. Estimate effort and impact
3. Mark dependencies/blockers
4. Propose solution approach if known

This helps prioritize compiler improvements based on real stdlib needs.
