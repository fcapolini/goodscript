# GoodScript Minimal Standard Library Proposal

**Audience:** GoodScript runtime and compiler developers

**Purpose:** Suggest a minimal set of standard library APIs for GoodScript compiled binaries, showing mappings to C++ libraries.

---

## **1️⃣ Math API**

Wrap common TS `Math` methods using **Boost.Math** or `<cmath>`.

| GoodScript      | C++ Wrapper          | Library                |
| --------------- | -------------------- | ---------------------- |
| `Math.sin(x)`   | `gs::Math::sin(x)`   | `<cmath>` / Boost.Math |
| `Math.cos(x)`   | `gs::Math::cos(x)`   | `<cmath>` / Boost.Math |
| `Math.sqrt(x)`  | `gs::Math::sqrt(x)`  | `<cmath>`              |
| `Math.random()` | `gs::Math::random()` | PCG Random             |

**Example:**

```cpp
namespace gs {
namespace Math {
    double sin(double x) { return std::sin(x); }
    double random() { static pcg32 rng; return std::generate_canonical<double, 64>(rng); }
}
}
```

---

## **2️⃣ Networking / Fetch API**

Wrap async HTTP using **Asio / cppcoro / libcurl**.

| GoodScript         | C++ Wrapper               | Library                  |
| ------------------ | ------------------------- | ------------------------ |
| `await fetch(url)` | `co_await gs::fetch(url)` | Asio / cppcoro / libcurl |

**Example:**

```cpp
namespace gs {
cppcoro::task<std::string> fetch(const std::string& url) {
    // implement async GET using cppcoro + Asio
}
}
```

---

## **3️⃣ Array and Data Structures**

Leverage **STL** and **Abseil** for TS-like arrays and maps.

| GoodScript | C++ Wrapper                | Library |
| ---------- | -------------------------- | ------- |
| `Array<T>` | `std::vector<T>`           | STL     |
| `Map<K,V>` | `absl::flat_hash_map<K,V>` | Abseil  |
| `Set<T>`   | `absl::flat_hash_set<T>`   | Abseil  |

**Example:**

```cpp
namespace gs {
    template<typename T>
    using Array = std::vector<T>;
}
```

---

## **4️⃣ Weak / Shared References**

Map GoodScript reference qualifiers to C++ smart pointers.

| GoodScript  | C++ Wrapper          |
| ----------- | -------------------- |
| `own<T>` | `std::unique_ptr<T>` |
| `share<T>` | `std::shared_ptr<T>` |
| `use<T>`   | `std::weak_ptr<T>`   |

Optional chaining (`?.`) maps to `lock()` on `weak_ptr`.

---

## **5️⃣ Utility / Random**

Random number generation using **PCG**.

```cpp
namespace gs {
namespace Math {
    double random() {
        static pcg32 rng;
        return std::generate_canonical<double, 64>(rng);
    }
}
```

---

## **6️⃣ Optional / Advanced Libraries**

* **Stan Math**: automatic differentiation, distributions.
* **mlpack**: ML algorithms.
* Can be added as optional modules for GoodScript users needing scientific computing.

---

## **7️⃣ Wrapping Strategy**

1. All standard library symbols in the **`gs` namespace**.
2. Map GoodScript async functions to **C++20 coroutines** (`cppcoro::task<T>`).
3. Map ownership qualifiers transparently to smart pointers.
4. Header-only or minimal dependencies where possible for simple distribution.
5. Provide TS-like API names, so GoodScript code looks familiar.

---

## **8️⃣ Example Usage in GoodScript**

```ts
// .gs.ts file
async function demo() {
    let val: number = Math.sqrt(9);
    let response = await fetch('https://example.com');
    let arr: Array<number> = [1,2,3];
}
```

* Runs in Node.js as TypeScript.
* Transpiles to C++ with `gs::Math::sqrt`, `gs::fetch`, and `std::vector<int>`.

---

### ✅ **Conclusion**

This minimal standard library provides GoodScript developers with:

* Familiar TS-like APIs.
* Safe ownership semantics in native code.
* Efficient native execution via compiled C++ backends.
* Expandable ecosystem for future libraries (ML, optimization, networking, GUI, etc.).

*End of document.*
