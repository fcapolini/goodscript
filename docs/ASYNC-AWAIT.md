# GoodScript Async/Await → C++20 / cppcoro Templates

> **✅ IMPLEMENTATION STATUS**: Async/await support is now **fully implemented** as of December 2024.
> See [ASYNC-AWAIT-IMPLEMENTATION.md](./ASYNC-AWAIT-IMPLEMENTATION.md) for implementation details, test results, and usage guide.

**Audience:** GoodScript compiler implementors and codegen engineers

**Purpose:** Provide C++ templates for generating GoodScript `async`/`await` constructs using cppcoro.

---

## 1️⃣ Async Function Template

GoodScript:

```ts
async function fetchValue(): number {
    return 42;
}
```

Generated C++ (cppcoro):

```cpp
#include <cppcoro/task.hpp>

cppcoro::task<int> fetchValue() {
    co_return 42;
}
```

**Notes:**

* `async function` → `cppcoro::task<T>` return type.
* `co_return` returns the value.

---

## 2️⃣ Await Expression Template

GoodScript:

```ts
async function main() {
    let value = await fetchValue();
    print(value);
}
```

Generated C++:

```cpp
cppcoro::task<void> mainTask() {
    int value = co_await fetchValue();
    std::cout << value << std::endl;
}
```

**Notes:**

* `await` → `co_await`.
* Assignments work directly as in TypeScript.

---

## 3️⃣ Handling Heap-Allocated Objects with References

GoodScript:

```ts
async function processNode(node: share<Node>) {
    node.value += 1;
}
```

Generated C++:

```cpp
cppcoro::task<void> processNode(std::shared_ptr<Node> node) {
    node->value += 1;
    co_return;
}
```

**Notes:**

* `share<T>` maps to `std::shared_ptr<T>`.
* Safe to capture across suspension points.
* `own<T>` should be moved in or allocated in arena if it persists across `co_await`.

---

## 4️⃣ Conditional Weak Reference Access

GoodScript:

```ts
async function maybeUpdateNode(node: use<Node>) {
    node?.value += 1;
}
```

Generated C++:

```cpp
cppcoro::task<void> maybeUpdateNode(std::weak_ptr<Node> node) {
    if (auto n = node.lock()) {
        n->value += 1;
    }
    co_return;
}
```

**Notes:**

* `use<T>` → `std::weak_ptr<T>`.
* `?.` → `lock()` check in C++.
* Safe even if the object was destroyed before the coroutine resumes.

---

## 5️⃣ Combining Multiple Async Tasks

GoodScript:

```ts
async function sumValues() {
    let a = await fetchValue();
    let b = await fetchValue();
    return a + b;
}
```

Generated C++:

```cpp
cppcoro::task<int> sumValues() {
    int a = co_await fetchValue();
    int b = co_await fetchValue();
    co_return a + b;
}
```

**Optional parallel execution:**

* You can generate a helper to `co_await` multiple tasks concurrently using cppcoro combinators or custom awaitables.

---

## 6️⃣ Notes for Codegen

1. **Lifetimes:** Use `shared_ptr` or arena allocation for any object that persists across suspension points.
2. **Exception handling:** Translate GoodScript `throw` and `try/catch` directly to C++ exceptions.
3. **Workers:** If GoodScript workers are used, each worker can have its own coroutine scheduler.
4. **Templates / Generics:** Map `own<T>`, `share<T>`, `use<T>` to `unique_ptr<T>`, `shared_ptr<T>`, `weak_ptr<T>` in coroutine code.

---

*End of document.*
