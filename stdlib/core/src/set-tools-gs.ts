/**
 * Set utilities for set operations.
 */
export class SetTools {
  /**
   * Union of two sets (all elements from both sets).
   */
  static union<T>(a: Set<T>, b: Set<T>): Set<T> {
    const result = new Set<T>(a);
    for (const item of b) {
      result.add(item);
    }
    return result;
  }

  /**
   * Intersection of two sets (elements in both sets).
   */
  static intersection<T>(a: Set<T>, b: Set<T>): Set<T> {
    const result = new Set<T>();
    for (const item of a) {
      if (b.has(item)) {
        result.add(item);
      }
    }
    return result;
  }

  /**
   * Difference of two sets (elements in first set but not second).
   */
  static difference<T>(a: Set<T>, b: Set<T>): Set<T> {
    const result = new Set<T>();
    for (const item of a) {
      if (!b.has(item)) {
        result.add(item);
      }
    }
    return result;
  }

  /**
   * Symmetric difference (elements in either set but not both).
   */
  static symmetricDifference<T>(a: Set<T>, b: Set<T>): Set<T> {
    const result = new Set<T>();
    for (const item of a) {
      if (!b.has(item)) {
        result.add(item);
      }
    }
    for (const item of b) {
      if (!a.has(item)) {
        result.add(item);
      }
    }
    return result;
  }

  /**
   * Check if first set is subset of second.
   */
  static isSubset<T>(a: Set<T>, b: Set<T>): boolean {
    for (const item of a) {
      if (!b.has(item)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if first set is superset of second.
   */
  static isSuperset<T>(a: Set<T>, b: Set<T>): boolean {
    return SetTools.isSubset(b, a);
  }

  /**
   * Check if sets are disjoint (no common elements).
   */
  static isDisjoint<T>(a: Set<T>, b: Set<T>): boolean {
    for (const item of a) {
      if (b.has(item)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Convert set to array.
   */
  static toArray<T>(set: Set<T>): Array<T> {
    return Array.from(set);
  }

  /**
   * Create set from array.
   */
  static fromArray<T>(arr: Array<T>): Set<T> {
    return new Set(arr);
  }

  /**
   * Filter set by predicate.
   */
  static filter<T>(set: Set<T>, predicate: (item: T) => boolean): Set<T> {
    const result = new Set<T>();
    for (const item of set) {
      if (predicate(item)) {
        result.add(item);
      }
    }
    return result;
  }

  /**
   * Map over set values.
   */
  static map<T, U>(set: Set<T>, fn: (item: T) => U): Set<U> {
    const result = new Set<U>();
    for (const item of set) {
      result.add(fn(item));
    }
    return result;
  }
}
