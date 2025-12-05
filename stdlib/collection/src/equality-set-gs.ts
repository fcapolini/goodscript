/**
 * A set with custom equality and hash functions.
 * 
 * Translated from Dart's EqualitySet (package:collection)
 * Source: https://pub.dev/documentation/collection/latest/collection/EqualitySet-class.html
 * 
 * A set that uses custom equality and hash code functions instead of
 * the default === equality and identity hash code.
 * 
 * This allows creating sets of objects where equality is determined by
 * comparing field values rather than object identity.
 */

export interface Equality<E> {
  equals(a: E, b: E): boolean;
  hash(e: E): number;
}

export class EqualitySet<E> {
  private equality: Equality<E>;
  private map: Map<number, E[]>;
  private count: number;

  constructor(equality?: Equality<E>) {
    if (equality !== null && equality !== undefined) {
      this.equality = equality;
    } else {
      this.equality = new DefaultEquality<E>();
    }
    this.map = new Map();
    this.count = 0;
  }

  /**
   * Creates a set from elements using the given equality.
   */
  static from<E>(elements: E[], equality?: Equality<E>): EqualitySet<E> {
    const set = new EqualitySet<E>(equality);
    set.addAll(elements);
    return set;
  }

  /**
   * Returns the number of elements in the set.
   */
  getLength(): number {
    return this.count;
  }

  /**
   * Whether the set is empty.
   */
  isEmpty(): boolean {
    return this.count === 0;
  }

  /**
   * Whether the set has at least one element.
   */
  isNotEmpty(): boolean {
    return this.count > 0;
  }

  /**
   * Adds an element to the set.
   * Returns true if the element was added, false if it was already present.
   */
  add(element: E): boolean {
    const hashCode = this.equality.hash(element);
    const bucket = this.map.get(hashCode);

    if (bucket === null || bucket === undefined) {
      this.map.set(hashCode, [element]);
      this.count++;
      return true;
    }

    for (const existing of bucket) {
      if (this.equality.equals(existing, element)) {
        return false;
      }
    }

    bucket.push(element);
    this.count++;
    return true;
  }

  /**
   * Adds all elements from an array to the set.
   */
  addAll(elements: E[]): void {
    for (const element of elements) {
      this.add(element);
    }
  }

  /**
   * Removes an element from the set.
   * Returns true if the element was removed, false if it was not present.
   */
  remove(element: E): boolean {
    const hashCode = this.equality.hash(element);
    const bucket = this.map.get(hashCode);

    if (bucket === null || bucket === undefined) {
      return false;
    }

    for (let i = 0; i < bucket.length; i++) {
      if (this.equality.equals(bucket[i], element)) {
        bucket.splice(i, 1);
        this.count--;
        if (bucket.length === 0) {
          this.map.delete(hashCode);
        }
        return true;
      }
    }

    return false;
  }

  /**
   * Whether the set contains the given element.
   */
  contains(element: E): boolean {
    const hashCode = this.equality.hash(element);
    const bucket = this.map.get(hashCode);

    if (bucket === null || bucket === undefined) {
      return false;
    }

    for (const existing of bucket) {
      if (this.equality.equals(existing, element)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Looks up an element equal to the given element.
   * Returns the element if found, otherwise returns null.
   */
  lookup(element: E): E | null {
    const hashCode = this.equality.hash(element);
    const bucket = this.map.get(hashCode);

    if (bucket === null || bucket === undefined) {
      return null;
    }

    for (const existing of bucket) {
      if (this.equality.equals(existing, element)) {
        return existing;
      }
    }

    return null;
  }

  /**
   * Removes all elements from the set.
   */
  clear(): void {
    this.map.clear();
    this.count = 0;
  }

  /**
   * Returns all elements as an array.
   */
  toArray(): E[] {
    const result: E[] = [];
    for (const bucket of this.map.values()) {
      for (const element of bucket) {
        result.push(element);
      }
    }
    return result;
  }

  /**
   * Returns a string representation of the set.
   */
  toString(): string {
    return '{' + this.toArray().join(', ') + '}';
  }

  /**
   * Returns the union of this set and another set.
   */
  union(other: EqualitySet<E>): EqualitySet<E> {
    const result = new EqualitySet<E>(this.equality);
    result.addAll(this.toArray());
    result.addAll(other.toArray());
    return result;
  }

  /**
   * Returns the intersection of this set and another set.
   */
  intersection(other: EqualitySet<E>): EqualitySet<E> {
    const result = new EqualitySet<E>(this.equality);
    for (const element of this.toArray()) {
      if (other.contains(element)) {
        result.add(element);
      }
    }
    return result;
  }

  /**
   * Returns the difference of this set and another set.
   */
  difference(other: EqualitySet<E>): EqualitySet<E> {
    const result = new EqualitySet<E>(this.equality);
    for (const element of this.toArray()) {
      if (!other.contains(element)) {
        result.add(element);
      }
    }
    return result;
  }
}

/**
 * Default equality using === and a simple hash function.
 */
class DefaultEquality<E> implements Equality<E> {
  equals(a: E, b: E): boolean {
    return a === b;
  }

  hash(e: E): number {
    if (e === null || e === undefined) {
      return 0;
    }
    if (typeof e === 'number') {
      return e | 0;
    }
    if (typeof e === 'string') {
      return this.hashString(e);
    }
    if (typeof e === 'boolean') {
      return e === true ? 1 : 0;
    }
    // For objects, use a simple hash based on JSON
    return this.hashString(JSON.stringify(e));
  }

  private hashString(s: string): number {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      const char = s.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = (hash | 0); // Convert to 32-bit integer
    }
    return hash;
  }
}
