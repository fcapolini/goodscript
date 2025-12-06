/**
 * UnionSet - A view of the union over multiple sets.
 * 
 * Translated from Dart's collection package.
 * Source: https://github.com/dart-lang/core/blob/main/pkgs/collection/lib/src/union_set.dart
 * 
 * Provides a single set that acts as a view of the union of multiple sets.
 * Since this is just a view, it reflects all changes in the underlying sets.
 * 
 * This view is unmodifiable - all mutation operations throw errors.
 * 
 * @example
 * const set1 = new Set([1, 2, 3]);
 * const set2 = new Set([3, 4, 5]);
 * const set3 = new Set([5, 6, 7]);
 * const union = new UnionSet([set1, set2, set3]);
 * 
 * union.getSize();     // 7 (unique elements: 1,2,3,4,5,6,7)
 * union.has(4);        // true
 * union.has(8);        // false
 * 
 * // Reflects changes in underlying sets
 * set1.add(10);
 * union.has(10);       // true
 * union.getSize();     // 8
 */
export class UnionSet<E> {
  private sets: Set<E>[];
  private disjoint: boolean;

  /**
   * Creates a new set that's a view of the union of all sets.
   * 
   * If any sets change, this UnionSet reflects that change.
   * 
   * @param sets - The sets to union
   * @param disjoint - If true, sets are assumed to have no overlapping elements,
   *                   which makes size() operations more efficient
   */
  constructor(sets: Set<E>[], disjoint: boolean = false) {
    this.sets = sets;
    this.disjoint = disjoint;
  }

  /**
   * Returns the number of unique elements across all sets.
   * 
   * If disjoint=true, this is O(sets). Otherwise O(total elements).
   * 
   * @returns The number of unique elements
   */
  getSize(): number {
    if (this.disjoint === true) {
      // Fast path: just sum sizes
      let total = 0;
      for (const set of this.sets) {
        total += set.size;
      }
      return total;
    }
    
    // Slow path: count unique elements
    const seen = new Set<E>();
    for (const set of this.sets) {
      for (const element of set.values()) {
        seen.add(element);
      }
    }
    return seen.size;
  }

  /**
   * Checks if the union contains an element.
   * 
   * Performance: O(sets) in worst case.
   * 
   * @param element - The element to check
   * @returns true if any underlying set contains the element
   */
  has(element: E): boolean {
    for (const set of this.sets) {
      if (set.has(element)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks if the union is empty.
   * 
   * @returns true if all underlying sets are empty
   */
  isEmpty(): boolean {
    for (const set of this.sets) {
      if (set.size > 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Converts the union to a single set containing all unique elements.
   * 
   * Creates a new set with all elements from all underlying sets.
   * 
   * @returns A new Set with all unique elements
   */
  toSet(): Set<E> {
    const result = new Set<E>();
    for (const set of this.sets) {
      for (const element of set.values()) {
        result.add(element);
      }
    }
    return result;
  }

  /**
   * Converts the union to an array of all unique elements.
   * 
   * Order is determined by iteration order of underlying sets.
   * If an element appears in multiple sets, only the first occurrence is included.
   * 
   * @returns An array of all unique elements
   */
  toArray(): E[] {
    return Array.from(this.toSet());
  }

  /**
   * Executes a function on each unique element.
   * 
   * @param fn - Function to execute on each element
   */
  forEach(fn: (element: E) => void): void {
    const seen = new Set<E>();
    for (const set of this.sets) {
      for (const element of set.values()) {
        if (!seen.has(element)) {
          seen.add(element);
          fn(element);
        }
      }
    }
  }

  /**
   * Tests whether at least one element passes the test.
   * 
   * @param test - Function to test each element
   * @returns true if at least one element passes the test
   */
  some(test: (element: E) => boolean): boolean {
    const seen = new Set<E>();
    for (const set of this.sets) {
      for (const element of set.values()) {
        if (!seen.has(element)) {
          seen.add(element);
          if (test(element)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Tests whether all elements pass the test.
   * 
   * @param test - Function to test each element
   * @returns true if all elements pass the test
   */
  every(test: (element: E) => boolean): boolean {
    const seen = new Set<E>();
    for (const set of this.sets) {
      for (const element of set.values()) {
        if (!seen.has(element)) {
          seen.add(element);
          if (!test(element)) {
            return false;
          }
        }
      }
    }
    return true;
  }

  /**
   * Checks if this union contains all elements from another set.
   * 
   * @param other - The set to check against
   * @returns true if all elements of other are in this union
   */
  containsAll(other: Set<E>): boolean {
    for (const element of other.values()) {
      if (!this.has(element)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Checks if this union is a superset of another set.
   * Alias for containsAll().
   * 
   * @param other - The set to check against
   * @returns true if this union is a superset of other
   */
  isSupersetOf(other: Set<E>): boolean {
    return this.containsAll(other);
  }

  /**
   * Checks if this union is a subset of another set.
   * 
   * @param other - The set to check against
   * @returns true if all elements in this union are in other
   */
  isSubsetOf(other: Set<E>): boolean {
    const seen = new Set<E>();
    for (const set of this.sets) {
      for (const element of set.values()) {
        if (!seen.has(element)) {
          seen.add(element);
          if (!other.has(element)) {
            return false;
          }
        }
      }
    }
    return true;
  }

  /**
   * Returns the intersection with another set as a new Set.
   * 
   * @param other - The set to intersect with
   * @returns A new Set containing only elements in both collections
   */
  intersection(other: Set<E>): Set<E> {
    const result = new Set<E>();
    const seen = new Set<E>();
    
    for (const set of this.sets) {
      for (const element of set.values()) {
        if (!seen.has(element)) {
          seen.add(element);
          if (other.has(element)) {
            result.add(element);
          }
        }
      }
    }
    
    return result;
  }

  /**
   * Returns the difference with another set as a new Set.
   * Contains elements in this union but not in other.
   * 
   * @param other - The set to subtract
   * @returns A new Set with elements in this union but not in other
   */
  difference(other: Set<E>): Set<E> {
    const result = new Set<E>();
    const seen = new Set<E>();
    
    for (const set of this.sets) {
      for (const element of set.values()) {
        if (!seen.has(element)) {
          seen.add(element);
          if (!other.has(element)) {
            result.add(element);
          }
        }
      }
    }
    
    return result;
  }
}
