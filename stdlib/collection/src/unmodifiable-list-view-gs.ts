/**
 * An unmodifiable list view.
 * 
 * Translated from Dart's UnmodifiableListView (dart:collection)
 * Source: https://api.dart.dev/stable/dart-collection/UnmodifiableListView-class.html
 * 
 * An UnmodifiableListView contains a list and prevents modification to it.
 * This class doesn't copy the list but creates a view on the list.
 * Modifying the original list will also change the view.
 */

export class UnmodifiableListView<E> implements Iterable<E> {
  private source: E[];

  constructor(source: E[]) {
    this.source = source;
  }

  /**
   * Returns the element at the given index.
   */
  get(index: number): E {
    if (index < 0 || index >= this.source.length) {
      throw new Error(`Index out of bounds: ${index}`);
    }
    return this.source[index];
  }

  /**
   * Returns the number of elements.
   */
  getLength(): number {
    return this.source.length;
  }

  /**
   * Returns the first element.
   * Throws if the list is empty.
   */
  getFirst(): E {
    if (this.source.length === 0) {
      throw new Error('No element');
    }
    return this.source[0];
  }

  /**
   * Returns the last element.
   * Throws if the list is empty.
   */
  getLast(): E {
    if (this.source.length === 0) {
      throw new Error('No element');
    }
    return this.source[this.source.length - 1];
  }

  /**
   * Whether the list is empty.
   */
  isEmpty(): boolean {
    return this.source.length === 0;
  }

  /**
   * Whether the list has at least one element.
   */
  isNotEmpty(): boolean {
    return this.source.length > 0;
  }

  /**
   * Returns all elements as a new array (defensive copy).
   */
  toArray(): E[] {
    return [...this.source];
  }

  /**
   * Returns the index of the first occurrence of element, or -1 if not found.
   */
  indexOf(element: E, start?: number): number {
    const startIndex = start !== null && start !== undefined ? start : 0;
    for (let i = startIndex; i < this.source.length; i++) {
      if (this.source[i] === element) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Returns the index of the last occurrence of element, or -1 if not found.
   */
  lastIndexOf(element: E, start?: number): number {
    let startIndex = start !== null && start !== undefined ? start : this.source.length - 1;
    if (startIndex >= this.source.length) {
      startIndex = this.source.length - 1;
    }
    for (let i = startIndex; i >= 0; i--) {
      if (this.source[i] === element) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Whether the list contains the given element.
   */
  contains(element: E): boolean {
    return this.indexOf(element) !== -1;
  }

  /**
   * Returns a sublist view from start (inclusive) to end (exclusive).
   * The returned view is also unmodifiable.
   */
  sublist(start: number, end?: number): UnmodifiableListView<E> {
    const actualEnd = end !== null && end !== undefined ? end : this.source.length;
    if (start < 0 || actualEnd > this.source.length || start > actualEnd) {
      throw new Error(`Invalid range: ${start} to ${actualEnd}`);
    }
    return new UnmodifiableListView(this.source.slice(start, actualEnd));
  }

  /**
   * Returns a new list with elements in reverse order.
   */
  reversed(): UnmodifiableListView<E> {
    return new UnmodifiableListView([...this.source].reverse());
  }

  /**
   * Returns a string representation of the list.
   */
  toString(): string {
    return '[' + this.source.join(', ') + ']';
  }
  
  /**
   * Returns an iterator over the elements.
   */
  [Symbol.iterator](): Iterator<E> {
    return new UnmodifiableListViewIterator(this);
  }

  // Mutation methods that throw errors

  /**
   * Not supported - list is unmodifiable.
   */
  set(index: number, value: E): void {
    throw new Error('Cannot modify an unmodifiable list');
  }

  /**
   * Not supported - list is unmodifiable.
   */
  setLength(newLength: number): void {
    throw new Error('Cannot modify an unmodifiable list');
  }

  /**
   * Not supported - list is unmodifiable.
   */
  add(element: E): void {
    throw new Error('Cannot modify an unmodifiable list');
  }

  /**
   * Not supported - list is unmodifiable.
   */
  addAll(elements: E[]): void {
    throw new Error('Cannot modify an unmodifiable list');
  }

  /**
   * Not supported - list is unmodifiable.
   */
  insert(index: number, element: E): void {
    throw new Error('Cannot modify an unmodifiable list');
  }

  /**
   * Not supported - list is unmodifiable.
   */
  remove(element: E): boolean {
    throw new Error('Cannot modify an unmodifiable list');
  }

  /**
   * Not supported - list is unmodifiable.
   */
  removeAt(index: number): E {
    throw new Error('Cannot modify an unmodifiable list');
  }

  /**
   * Not supported - list is unmodifiable.
   */
  clear(): void {
    throw new Error('Cannot modify an unmodifiable list');
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
 * Iterator for UnmodifiableListView
 */
class UnmodifiableListViewIterator<E> implements Iterator<E> {
  private view: UnmodifiableListView<E>;
  private index: number;
  private cachedFirst: E | undefined;
  
  constructor(view: UnmodifiableListView<E>) {
    this.view = view;
    this.index = 0;
    // Cache first element for use as dummy value when done (undefined if empty)
    this.cachedFirst = view.getLength() > 0 ? view.get(0) : undefined;
  }
  
  next(): IteratorResult<E> {
    if (this.index < this.view.getLength()) {
      const value = this.view.get(this.index);
      this.index++;
      return new IteratorResultImpl(false, value);
    }
    // When done, value is required but won't be used
    // Use cached first element as dummy (safe since done=true means value is ignored)
    return new IteratorResultImpl(true, this.cachedFirst as E);
  }
}
