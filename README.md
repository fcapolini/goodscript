# Introducing GoodScript: TypeScript with Deterministic Memory Safety

**Audience:** TypeScript developers interested in writing memory-safe systems code

**Purpose:** Highlight GoodScript's dual-mode workflow, tooling support, and memory-safety features.

---

## 1. What is GoodScript?

GoodScript is a **TypeScript specialization** designed to enable safe systems programming with deterministic memory management. It retains **TypeScript syntax** while augmenting the language with **ownership qualifiers**:

* `Unique<T>` — exclusive ownership of a value.
* `Shared<T>` — reference-counted shared ownership.
* `Weak<T>` — non-owning references (may be `null` or `undefined`).

These types are **transparent in TypeScript**, making GoodScript code valid TS code for development and prototyping.

```ts
declare type Unique<T> = T;
declare type Shared<T> = T;
declare type Weak<T> = T | null | undefined;
```

---

## 2. Dual-Mode Workflow

GoodScript supports **two modes of execution**:

### **2.1 TypeScript Runtime Mode**

* `.gs.ts` files are valid TypeScript.
* Run directly in Node.js or Deno.
* Use standard TS tooling: type checking, linters, editors.
* Rapid development and testing without transpiling to native code.

Example:

```ts
async function example(sharedNode: Shared<Node>) {
    let weakNode: Weak<Node> = sharedNode;
    console.log(weakNode?.value); // Safe access in TS
}
```

### **2.2 Native Mode (Transpilation)**

* Transpile `.gs.ts` to **C++** or other native targets.
* Ownership qualifiers map to smart pointers:

  * `Unique<T>` → `std::unique_ptr<T>`
  * `Shared<T>` → `std::shared_ptr<T>`
  * `Weak<T>` → `std::weak_ptr<T>`
* Ensures **memory safety, deterministic destruction, and DAG-enforced ownership**.
* Optional: use **Zig toolchain** for cross-compilation.

---

## 3. Memory Safety and Reference Qualifiers

* All heap-allocated values must have **explicit reference qualification**.
* Reference derivation rules prevent cycles and unsafe memory access:

  * From `Unique<T>` → only `Weak<T>` can be derived.
  * From `Shared<T>` → `Shared<T>` or `Weak<T>`.
  * From `Weak<T>` → only `Weak<T>`.
* Weak references are accessed with optional chaining (`?.`) in TS, which maps to safe upgrade in native code.

---

## 4. Tooling Support

### **VSCode Extension**

* Supports `.gs.ts` files.
* Provides:

  * **Validation of GoodScript constraints** (no dynamic features, reference qualifiers).
  * **Syntax highlighting** and IntelliSense for `.gs.ts` files.
  * **Real-time feedback** on memory-safety rules and DAG enforcement.
* Enables **fast feedback loop** during development while keeping code valid TypeScript.

---

## 5. Benefits for Developers

1. **Familiar TS syntax:** Minimal learning curve.
2. **Rapid iteration:** Node.js execution allows testing before native deployment.
3. **Memory-safe systems programming:** Safe ownership semantics enforced during transpilation.
4. **Cross-platform native builds:** Use C++ backend + Zig toolchain for multiple targets.
5. **Safe complex data structures:** Arena/Pool pattern handles graphs and trees without violating DAG rules.
6. **Integrated tooling:** VSCode extension ensures errors are caught early.

---

## 6. Example: GoodScript in Action

```ts
// .gs.ts file
declare type Shared<T> = T;
declare type Weak<T> = T | null | undefined;

class Node {
    value: number;
    parent: Weak<Node>;
    children: Shared<Node>[];
}

async function demo(node: Shared<Node>) {
    let child: Shared<Node> = node;
    let weakRef: Weak<Node> = child;
    console.log(weakRef?.value);
}
```

* Runs directly in Node.js.
* Transpiles to C++ with proper `shared_ptr`/`weak_ptr` semantics.

---

## 7. Conclusion

GoodScript allows developers to **write memory-safe systems code using familiar TypeScript syntax**, with a smooth transition from fast TS development to robust native deployment. The **VSCode extension** ensures validation and tooling support, while the **dual-mode workflow** enables both rapid iteration and high-performance native applications.

---

*End of document.*
