/**
 * BoolList - A space-efficient list of boolean values
 * 
 * Translated from Dart's collection package (BSD-3-Clause license)
 * Original: https://github.com/dart-lang/core/blob/main/pkgs/collection/lib/src/boollist.dart
 * 
 * Uses a number array as internal storage to reduce memory usage.
 * Each boolean value occupies 1 bit instead of 8 bytes.
 * 
 * Features:
 * - Space-efficient storage (32x memory reduction)
 * - Growable or fixed-length variants
 * - Fast bulk operations (fillRange)
 * - Standard list interface
 * 
 * Memory: O(n/32) for n boolean values
 * Access: O(1) for get/set operations
 */

export class BoolList {
  private static ENTRY_SHIFT: number = 5;
  private static BITS_PER_ENTRY: number = 32;
  private static ENTRY_SIGN_BIT_INDEX: number = 31;

  protected data: number[];
  protected len: number;
  protected growable: boolean;

  private constructor(data: number[], length: number, growable: boolean) {
    this.data = data;
    this.len = length;
    this.growable = growable;
  }

  /**
   * Creates a list of booleans with the provided length.
   * 
   * @param length - Initial number of boolean values
   * @param fill - Initial value for all elements (default: false)
   * @param growable - Whether the list can grow (default: false)
   */
  static create(length: number, fill: boolean = false, growable: boolean = false): BoolList {
    if (length < 0) {
      throw new RangeError('Length must be non-negative');
    }

    const capacity = growable === true ? length * 2 : length;
    const wordCount = BoolList.lengthInWords(capacity);
    const data = BoolList.createWordArray(wordCount);
    const list = new BoolList(data, length, growable);

    if (fill === true) {
      list.fillRange(0, length, true);
    }

    return list;
  }

  /**
   * Creates an empty list of booleans.
   * 
   * @param growable - Whether the list can grow (default: true)
   * @param capacity - Initial capacity hint (default: 0)
   */
  static empty(growable: boolean = true, capacity: number = 0): BoolList {
    if (capacity < 0) {
      throw new RangeError('Capacity must be non-negative');
    }

    const actualCapacity = growable === true ? capacity : capacity;
    const wordCount = BoolList.lengthInWords(actualCapacity);
    const data = BoolList.createWordArray(wordCount);
    return new BoolList(data, 0, growable);
  }

  /**
   * Generates a BoolList of values.
   * 
   * @param length - Number of elements to generate
   * @param generator - Function that returns a boolean for each index
   * @param growable - Whether the list can grow (default: true)
   */
  static generate(
    length: number,
    generator: (index: number) => boolean,
    growable: boolean = true
  ): BoolList {
    if (length < 0) {
      throw new RangeError('Length must be non-negative');
    }

    const capacity = growable === true ? length * 2 : length;
    const wordCount = BoolList.lengthInWords(capacity);
    const data = BoolList.createWordArray(wordCount);
    const list = new BoolList(data, length, growable);

    for (let i = 0; i < length; i = i + 1) {
      list.setBitUnchecked(i, generator(i));
    }

    return list;
  }

  /**
   * Creates a list containing all elements.
   * 
   * @param elements - Initial elements
   * @param growable - Whether the list can grow (default: false)
   */
  static of(elements: boolean[], growable: boolean = false): BoolList {
    const length = elements.length;
    const capacity = growable === true ? length * 2 : length;
    const wordCount = BoolList.lengthInWords(capacity);
    const data = BoolList.createWordArray(wordCount);
    const list = new BoolList(data, length, growable);

    for (let i = 0; i < length; i = i + 1) {
      list.setBitUnchecked(i, elements[i] as boolean);
    }

    return list;
  }

  /**
   * Returns the number of boolean values in this list.
   */
  getLength(): number {
    return this.len;
  }

  /**
   * Sets the length of the list.
   * Only works for growable lists.
   * 
   * @param newLength - New length (must be non-negative)
   */
  setLength(newLength: number): void {
    if (this.growable === false) {
      throw new Error('Cannot change length of fixed-length list');
    }

    if (newLength < 0) {
      throw new RangeError('Length must be non-negative');
    }

    if (newLength > this.len) {
      this.expand(newLength);
    } else if (newLength < this.len) {
      this.shrink(newLength);
    }
  }

  /**
   * Gets the value at the specified index.
   * 
   * @param index - Index to read (0 <= index < length)
   */
  get(index: number): boolean {
    if (index < 0 || index >= this.len) {
      throw new RangeError(`Index ${index} out of range [0, ${this.len})`);
    }
    return this.getBitUnchecked(index);
  }

  /**
   * Sets the value at the specified index.
   * 
   * @param index - Index to write (0 <= index < length)
   * @param value - New boolean value
   */
  set(index: number, value: boolean): void {
    if (index < 0 || index >= this.len) {
      throw new RangeError(`Index ${index} out of range [0, ${this.len})`);
    }
    this.setBitUnchecked(index, value);
  }

  /**
   * Fills a range with the specified value.
   * 
   * @param start - Start index (inclusive)
   * @param end - End index (exclusive)
   * @param fill - Value to fill with (default: false)
   */
  fillRange(start: number, end: number, fill: boolean = false): void {
    if (start < 0 || end > this.len || start > end) {
      throw new RangeError(`Invalid range [${start}, ${end}) for list of length ${this.len}`);
    }

    if (start === end) {
      return;
    }

    const startWord = start >> BoolList.ENTRY_SHIFT;
    const endWord = (end - 1) >> BoolList.ENTRY_SHIFT;
    const startBit = start & BoolList.ENTRY_SIGN_BIT_INDEX;
    const endBit = (end - 1) & BoolList.ENTRY_SIGN_BIT_INDEX;

    if (startWord < endWord) {
      // Multiple words affected
      if (fill === true) {
        // Set bits from startBit to end of startWord
        if (startBit === 0) {
          this.data[startWord] = 0xFFFFFFFF;
        } else {
          this.data[startWord] = (this.data[startWord] as number) | (-1 << startBit);
        }
        // Fill all intermediate words
        for (let i = startWord + 1; i < endWord; i = i + 1) {
          this.data[i] = 0xFFFFFFFF;
        }
        // Set bits from start of endWord to endBit
        if (endBit === 31) {
          this.data[endWord] = 0xFFFFFFFF;
        } else {
          this.data[endWord] = (this.data[endWord] as number) | ((1 << (endBit + 1)) - 1);
        }
      } else {
        // Clear bits from startBit to end of startWord
        this.data[startWord] = (this.data[startWord] as number) & ((1 << startBit) - 1);
        // Clear all intermediate words
        for (let i = startWord + 1; i < endWord; i = i + 1) {
          this.data[i] = 0;
        }
        // Clear bits from start of endWord to endBit
        if (endBit === 31) {
          this.data[endWord] = 0;
        } else {
          this.data[endWord] = (this.data[endWord] as number) & (-1 << (endBit + 1));
        }
      }
    } else {
      // Single word affected
      const bitCount = endBit - startBit + 1;
      if (fill === true) {
        if (bitCount === 32) {
          // Special case: fill entire word
          this.data[startWord] = 0xFFFFFFFF;
        } else {
          const mask = ((1 << bitCount) - 1) << startBit;
          this.data[startWord] = (this.data[startWord] as number) | mask;
        }
      } else {
        if (bitCount === 32) {
          // Special case: clear entire word
          this.data[startWord] = 0;
        } else {
          const mask = ((1 << startBit) - 1) | (-1 << (endBit + 1));
          this.data[startWord] = (this.data[startWord] as number) & mask;
        }
      }
    }
  }

  /**
   * Returns true if the list is empty.
   */
  isEmpty(): boolean {
    return this.len === 0;
  }

  /**
   * Returns true if the list is not empty.
   */
  isNotEmpty(): boolean {
    return this.len !== 0;
  }

  /**
   * Returns the first element.
   * Throws if the list is empty.
   */
  getFirst(): boolean {
    if (this.len === 0) {
      throw new RangeError('Cannot get first element of empty list');
    }
    return this.getBitUnchecked(0);
  }

  /**
   * Returns the last element.
   * Throws if the list is empty.
   */
  getLast(): boolean {
    if (this.len === 0) {
      throw new RangeError('Cannot get last element of empty list');
    }
    return this.getBitUnchecked(this.len - 1);
  }

  /**
   * Sets the first element.
   * Throws if the list is empty.
   */
  setFirst(value: boolean): void {
    if (this.len === 0) {
      throw new RangeError('Cannot set first element of empty list');
    }
    this.setBitUnchecked(0, value);
  }

  /**
   * Sets the last element.
   * Throws if the list is empty.
   */
  setLast(value: boolean): void {
    if (this.len === 0) {
      throw new RangeError('Cannot set last element of empty list');
    }
    this.setBitUnchecked(this.len - 1, value);
  }

  /**
   * Adds a value to the end of the list.
   * Only works for growable lists.
   * 
   * @param value - Value to add
   */
  add(value: boolean): void {
    if (this.growable === false) {
      throw new Error('Cannot add to fixed-length list');
    }
    const newLength = this.len + 1;
    if (newLength > this.data.length * BoolList.BITS_PER_ENTRY) {
      this.expandCapacity(newLength);
    }
    this.setBitUnchecked(this.len, value);
    this.len = newLength;
  }

  /**
   * Adds all values from an iterable to the end of the list.
   * Only works for growable lists.
   * 
   * @param elements - Elements to add
   */
  addAll(elements: boolean[]): void {
    if (this.growable === false) {
      throw new Error('Cannot add to fixed-length list');
    }
    for (const value of elements) {
      this.add(value);
    }
  }

  /**
   * Removes the last element and returns it.
   * Only works for growable lists.
   */
  removeLast(): boolean {
    if (this.growable === false) {
      throw new Error('Cannot remove from fixed-length list');
    }
    if (this.len === 0) {
      throw new RangeError('Cannot remove last element of empty list');
    }
    const value = this.getBitUnchecked(this.len - 1);
    this.setLength(this.len - 1);
    return value;
  }

  /**
   * Converts the list to a regular boolean array.
   */
  toArray(): boolean[] {
    const result: boolean[] = [];
    for (let i = 0; i < this.len; i = i + 1) {
      result.push(this.getBitUnchecked(i));
    }
    return result;
  }

  /**
   * Returns true if the list contains the specified value.
   */
  contains(value: boolean): boolean {
    for (let i = 0; i < this.len; i = i + 1) {
      if (this.getBitUnchecked(i) === value) {
        return true;
      }
    }
    return false;
  }

  /**
   * Returns the index of the first occurrence of the value.
   * Returns -1 if not found.
   */
  indexOf(value: boolean, start: number = 0): number {
    if (start < 0) {
      start = 0;
    }
    for (let i = start; i < this.len; i = i + 1) {
      if (this.getBitUnchecked(i) === value) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Returns the index of the last occurrence of the value.
   * Returns -1 if not found.
   */
  lastIndexOf(value: boolean, start: number | undefined = undefined): number {
    const startIndex = start !== null && start !== undefined ? start : this.len - 1;
    if (startIndex >= this.len) {
      return -1;
    }
    for (let i = startIndex; i >= 0; i = i - 1) {
      if (this.getBitUnchecked(i) === value) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Iterates over all elements.
   */
  forEach(fn: (value: boolean, index: number) => void): void {
    for (let i = 0; i < this.len; i = i + 1) {
      fn(this.getBitUnchecked(i), i);
    }
  }

  /**
   * Returns true if any element satisfies the predicate.
   */
  some(predicate: (value: boolean, index: number) => boolean): boolean {
    for (let i = 0; i < this.len; i = i + 1) {
      if (predicate(this.getBitUnchecked(i), i) === true) {
        return true;
      }
    }
    return false;
  }

  /**
   * Returns true if all elements satisfy the predicate.
   */
  every(predicate: (value: boolean, index: number) => boolean): boolean {
    for (let i = 0; i < this.len; i = i + 1) {
      if (predicate(this.getBitUnchecked(i), i) === false) {
        return false;
      }
    }
    return true;
  }

  /**
   * Counts the number of occurrences of a value.
   */
  count(value: boolean): number {
    let count = 0;
    for (let i = 0; i < this.len; i = i + 1) {
      if (this.getBitUnchecked(i) === value) {
        count = count + 1;
      }
    }
    return count;
  }

  // Internal helper methods

  private static lengthInWords(bitLength: number): number {
    return (bitLength + (BoolList.BITS_PER_ENTRY - 1)) >> BoolList.ENTRY_SHIFT;
  }

  private static createWordArray(length: number): number[] {
    const arr: number[] = [];
    for (let i = 0; i < length; i = i + 1) {
      arr.push(0);
    }
    return arr;
  }

  private getBitUnchecked(index: number): boolean {
    const word = this.data[index >> BoolList.ENTRY_SHIFT] as number;
    const bit = index & BoolList.ENTRY_SIGN_BIT_INDEX;
    return (word & (1 << bit)) !== 0;
  }

  private setBitUnchecked(index: number, value: boolean): void {
    const wordIndex = index >> BoolList.ENTRY_SHIFT;
    const bit = index & BoolList.ENTRY_SIGN_BIT_INDEX;
    const word = this.data[wordIndex] as number;

    if (value === true) {
      this.data[wordIndex] = word | (1 << bit);
    } else {
      this.data[wordIndex] = word & ~(1 << bit);
    }
  }

  private expand(newLength: number): void {
    if (newLength > this.data.length * BoolList.BITS_PER_ENTRY) {
      this.expandCapacity(newLength * 2);
    }
    this.len = newLength;
  }

  private shrink(newLength: number): void {
    const growthFactor = 2;
    if (newLength < this.len / growthFactor) {
      const newWordCount = BoolList.lengthInWords(newLength);
      const newData = BoolList.createWordArray(newWordCount);
      for (let i = 0; i < newWordCount; i = i + 1) {
        newData[i] = this.data[i] as number;
      }
      this.data = newData;
    }

    // Clear bits beyond new length
    for (let i = newLength; i < this.data.length * BoolList.BITS_PER_ENTRY; i = i + 1) {
      this.setBitUnchecked(i, false);
    }

    this.len = newLength;
  }

  private expandCapacity(minCapacity: number): void {
    const newWordCount = BoolList.lengthInWords(minCapacity);
    const newData = BoolList.createWordArray(newWordCount);
    for (let i = 0; i < this.data.length; i = i + 1) {
      newData[i] = this.data[i] as number;
    }
    this.data = newData;
  }
}
