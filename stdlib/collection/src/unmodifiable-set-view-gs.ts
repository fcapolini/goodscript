/**
 * An unmodifiable set view.
 * 
 * Translated from Dart's UnmodifiableSetView (dart:collection)
 * Source: https://api.dart.dev/stable/dart-collection/UnmodifiableSetView-class.html
 * 
 * An unmodifiable Set view of another Set.
 * Methods that could change the set, such as add and remove, must not be called.
 */

export class UnmodifiableSetView<E> implements Iterable<E> {
  private source: Set<E>;

  constructor(source: Set<E>) {
    this.source = source;
  }

  /**
   * Returns the number of elements.
   */
  getLength(): number {
    return this.source.size;
  }

  /**
   * Whether this collection has no elements.
   */
  isEmpty(): boolean {
    return this.source.size === 0;
  }

  /**
   * Whether this collection has at least one element.
   */
  isNotEmpty(): boolean {
    return this.source.size > 0;
  }

  /**
   * Whether value is in the set.
   */
  contains(value: E): boolean {
    return this.source.has(value);
  }

  /**
   * Whether this set contains all the elements of other.
   */
  containsAll(other: E[]): boolean {
    for (const element of other) {
      if (!this.source.has(element)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Returns all elements as an array.
   */
  toArray(): E[] {
    return Array.from(this.source);
  }

  /**
   * Applies action to each element of the set.
   */
  forEach(action: (element: E) => void): void {
    for (const element of this.source) {
      action(element);
    }
  }

  /**
   * If an object equal to object is in the set, return it.
   */
  lookup(object: E): E | undefined {
    if (this.source.has(object)) {
      return object;
    }
    return undefined;
  }

  /**
   * Creates a new set with the elements of this that are not in other.
   */
  difference(other: Set<E>): Set<E> {
    const result = new Set<E>();
    for (const element of this.source) {
      if (!other.has(element)) {
        result.add(element);
      }
    }
    return result;
  }

  /**
   * Creates a new set which is the intersection between this set and other.
   */
  intersection(other: Set<E>): Set<E> {
    const result = new Set<E>();
    for (const element of this.source) {
      if (other.has(element)) {
        result.add(element);
      }
    }
    return result;
  }

  /**
   * Creates a new set which contains all the elements of this set and other.
   */
  union(other: Set<E>): Set<E> {
    const result = new Set<E>(this.source);
    for (const element of other) {
      result.add(element);
    }
    return result;
  }

  /**
   * Returns a string representation of the set.
   */
  toString(): string {
    return `{${Array.from(this.source).join(', ')}}`;
  }
  
  /**
   * Returns an iterator over the elements.
   */
  [Symbol.iterator](): Iterator<E> {
    return new UnmodifiableSetViewIterator(this);
  }

  // Mutation methods that throw errors

  /**
   * Not supported - set is unmodifiable.
   */
  add(value: E): boolean {
    throw new Error('Cannot modify an unmodifiable set');
  }

  /**
   * Not supported - set is unmodifiable.
   */
  addAll(elements: E[]): void {
    throw new Error('Cannot modify an unmodifiable set');
  }

  /**
   * Not supported - set is unmodifiable.
   */
  remove(value: E): boolean {
    throw new Error('Cannot modify an unmodifiable set');
  }

  /**
   * Not supported - set is unmodifiable.
   */
  removeAll(elements: E[]): void {
    throw new Error('Cannot modify an unmodifiable set');
  }

  /**
   * Not supported - set is unmodifiable.
   */
  clear(): void {
    throw new Error('Cannot modify an unmodifiable set');
  }
}

/**
 * Concrete implementation of IteratorResult
 */
class IteratorResultImpl<T> {
  done: boolean;
  value: T;
  
  constructor(done: boolean, value: T) {
    this.done = done;
    this.value = value;
  }
}

/**
 * Iterator for UnmodifiableSetView
 */
class UnmodifiableSetViewIterator<E> implements Iterator<E> {
  private view: UnmodifiableSetView<E>;
  private elements: E[];
  private index: number;
  private cachedFirst: E | undefined;
  
  constructor(view: UnmodifiableSetView<E>) {
    this.view = view;
    this.elements = view.toArray();
    this.index = 0;
    // Cache first element for use as dummy value when done
    this.cachedFirst = this.elements.length > 0 ? this.elements[0] : undefined;
  }
  
  next(): IteratorResult<E> {
    if (this.index < this.elements.length) {
      const value = this.elements[this.index];
      this.index++;
      return new IteratorResultImpl(false, value);
    }
    // When done, value is required but won't be used
    return new IteratorResultImpl(true, this.cachedFirst as E);
  }
}
