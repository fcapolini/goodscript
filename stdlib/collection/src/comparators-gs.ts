/**
 * String comparison utilities for GoodScript
 * 
 * Translated from Dart's collection/comparators.dart
 * Original: https://github.com/dart-lang/collection/blob/master/lib/src/comparators.dart
 * 
 * Provides various string comparison functions including:
 * - Case-insensitive ASCII comparison
 * - Natural sort ordering (numbers within strings)
 * - Hash functions compatible with comparison
 */

// Character constants
const ZERO = 0x30;
const UPPER_CASE_A = 0x41;
const UPPER_CASE_Z = 0x5a;
const LOWER_CASE_A = 0x61;
const LOWER_CASE_Z = 0x7a;
const ASCII_CASE_BIT = 0x20;

/**
 * Checks if strings a and b differ only on the case of ASCII letters.
 * 
 * Strings are equal if they have the same length, and the characters at
 * each index are the same, or they are ASCII letters where one is upper-case
 * and the other is the lower-case version of the same letter.
 * 
 * The comparison does not ignore the case of non-ASCII letters, so an
 * upper-case ae-ligature (Æ) is different from a lower case ae-ligature (æ).
 * 
 * @param a First string to compare
 * @param b Second string to compare
 * @returns true if strings are equal ignoring ASCII case
 */
export function equalsIgnoreAsciiCase(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  for (let i = 0; i < a.length; i++) {
    const aChar = a.charCodeAt(i);
    const bChar = b.charCodeAt(i);
    if (aChar === bChar) continue;
    
    // Quick-check for whether this may be different cases of the same letter
    if ((aChar ^ bChar) !== ASCII_CASE_BIT) return false;
    
    // If it's possible, then check if either character is actually an ASCII letter
    const aCharLowerCase = aChar | ASCII_CASE_BIT;
    if (LOWER_CASE_A <= aCharLowerCase && aCharLowerCase <= LOWER_CASE_Z) {
      continue;
    }
    return false;
  }
  return true;
}

/**
 * Hash code for a string which is compatible with equalsIgnoreAsciiCase.
 * 
 * The hash code is unaffected by changing the case of ASCII letters, but
 * the case of non-ASCII letters do affect the result.
 * 
 * @param str String to hash
 * @returns Hash code
 */
export function hashIgnoreAsciiCase(str: string): number {
  // Jenkins hash code (http://en.wikipedia.org/wiki/Jenkins_hash_function)
  // adapted to SMI values.
  // Same hash used by dart2js for strings, modified to ignore ASCII letter case.
  let hash = 0;
  
  for (let i = 0; i < str.length; i++) {
    let char = str.charCodeAt(i);
    // Convert lower-case ASCII letters to upper case
    // This ensures that strings that differ only in case will have the same hash code
    if (LOWER_CASE_A <= char && char <= LOWER_CASE_Z) {
      char -= ASCII_CASE_BIT;
    }
    hash = 0x1fffffff & (hash + char);
    hash = 0x1fffffff & (hash + ((0x0007ffff & hash) << 10));
    hash = (hash >> 6) & 0x1fffffff;  // Use signed shift then mask
  }
  hash = 0x1fffffff & (hash + ((0x03ffffff & hash) << 3));
  hash = (hash >> 11) & 0x1fffffff;  // Use signed shift then mask
  return 0x1fffffff & (hash + ((0x00003fff & hash) << 15));
}

/**
 * Compares a and b lexically, converting ASCII letters to upper case.
 * 
 * Comparison treats all lower-case ASCII letters as upper-case letters,
 * but does no case conversion for non-ASCII letters.
 * 
 * If two strings differ only on the case of ASCII letters, the one with the
 * capital letter at the first difference will compare as less than the other
 * string. This tie-breaking ensures that the comparison is a total ordering
 * on strings and is compatible with equality.
 * 
 * @param a First string
 * @param b Second string
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareAsciiUpperCase(a: string, b: string): number {
  let defaultResult = 0; // Returned if no difference found
  
  for (let i = 0; i < a.length; i++) {
    if (i >= b.length) return 1;
    
    let aChar = a.charCodeAt(i);
    let bChar = b.charCodeAt(i);
    if (aChar === bChar) continue;
    
    // Upper-case if letters
    let aUpperCase = aChar;
    let bUpperCase = bChar;
    if (LOWER_CASE_A <= aChar && aChar <= LOWER_CASE_Z) {
      aUpperCase -= ASCII_CASE_BIT;
    }
    if (LOWER_CASE_A <= bChar && bChar <= LOWER_CASE_Z) {
      bUpperCase -= ASCII_CASE_BIT;
    }
    
    if (aUpperCase !== bUpperCase) {
      return Math.sign(aUpperCase - bUpperCase);
    }
    if (defaultResult === 0) {
      defaultResult = aChar - bChar;
    }
  }
  
  if (b.length > a.length) return -1;
  return Math.sign(defaultResult);
}

/**
 * Compares a and b lexically, converting ASCII letters to lower case.
 * 
 * Comparison treats all upper-case ASCII letters as lower-case letters,
 * but does no case conversion for non-ASCII letters.
 * 
 * If two strings differ only on the case of ASCII letters, the one with the
 * capital letter at the first difference will compare as less than the other
 * string. This tie-breaking ensures that the comparison is a total ordering
 * on strings.
 * 
 * @param a First string
 * @param b Second string
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareAsciiLowerCase(a: string, b: string): number {
  let defaultResult = 0;
  
  for (let i = 0; i < a.length; i++) {
    if (i >= b.length) return 1;
    
    let aChar = a.charCodeAt(i);
    let bChar = b.charCodeAt(i);
    if (aChar === bChar) continue;
    
    let aLowerCase = aChar;
    let bLowerCase = bChar;
    // Upper case if ASCII letters
    if (UPPER_CASE_A <= bChar && bChar <= UPPER_CASE_Z) {
      bLowerCase += ASCII_CASE_BIT;
    }
    if (UPPER_CASE_A <= aChar && aChar <= UPPER_CASE_Z) {
      aLowerCase += ASCII_CASE_BIT;
    }
    
    if (aLowerCase !== bLowerCase) {
      return Math.sign(aLowerCase - bLowerCase);
    }
    if (defaultResult === 0) {
      defaultResult = aChar - bChar;
    }
  }
  
  if (b.length > a.length) return -1;
  return Math.sign(defaultResult);
}

/**
 * Compares strings a and b according to natural sort ordering.
 * 
 * A natural sort ordering is a lexical ordering where embedded
 * numerals (digit sequences) are treated as a single unit and ordered by
 * numerical value.
 * This means that "a10b" will be ordered after "a7b" in natural
 * ordering, where lexical ordering would put the 1 before the 7, ignoring
 * that the 1 is part of a larger number.
 * 
 * Example:
 * The following strings are in the order they would be sorted by using this
 * comparison function:
 * 
 *     "a", "a0", "a0b", "a1", "a01", "a9", "a10", "a100", "a100b", "aa"
 * 
 * @param a First string
 * @param b Second string
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareNatural(a: string, b: string): number {
  for (let i = 0; i < a.length; i++) {
    if (i >= b.length) return 1;
    
    const aChar = a.charCodeAt(i);
    const bChar = b.charCodeAt(i);
    if (aChar !== bChar) {
      return compareNaturally(a, b, i, aChar, bChar);
    }
  }
  
  if (b.length > a.length) return -1;
  return 0;
}

/**
 * Compares strings a and b according to lower-case natural sort ordering.
 * 
 * ASCII letters are converted to lower case before being compared, like
 * for compareAsciiLowerCase, then the result is compared like for
 * compareNatural.
 * 
 * If two strings differ only on the case of ASCII letters, the one with the
 * capital letter at the first difference will compare as less than the other
 * string. This tie-breaking ensures that the comparison is a total ordering
 * on strings.
 * 
 * @param a First string
 * @param b Second string
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareAsciiLowerCaseNatural(a: string, b: string): number {
  let defaultResult = 0; // Returned if no difference found
  
  for (let i = 0; i < a.length; i++) {
    if (i >= b.length) return 1;
    
    let aChar = a.charCodeAt(i);
    let bChar = b.charCodeAt(i);
    if (aChar === bChar) continue;
    
    let aLowerCase = aChar;
    let bLowerCase = bChar;
    if (UPPER_CASE_A <= aChar && aChar <= UPPER_CASE_Z) {
      aLowerCase += ASCII_CASE_BIT;
    }
    if (UPPER_CASE_A <= bChar && bChar <= UPPER_CASE_Z) {
      bLowerCase += ASCII_CASE_BIT;
    }
    
    if (aLowerCase !== bLowerCase) {
      return compareNaturally(a, b, i, aLowerCase, bLowerCase);
    }
    if (defaultResult === 0) {
      defaultResult = aChar - bChar;
    }
  }
  
  if (b.length > a.length) return -1;
  return Math.sign(defaultResult);
}

/**
 * Compares strings a and b according to upper-case natural sort ordering.
 * 
 * ASCII letters are converted to upper case before being compared, like
 * for compareAsciiUpperCase, then the result is compared like for
 * compareNatural.
 * 
 * If two strings differ only on the case of ASCII letters, the one with the
 * capital letter at the first difference will compare as less than the other
 * string. This tie-breaking ensures that the comparison is a total ordering
 * on strings.
 * 
 * @param a First string
 * @param b Second string
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareAsciiUpperCaseNatural(a: string, b: string): number {
  let defaultResult = 0;
  
  for (let i = 0; i < a.length; i++) {
    if (i >= b.length) return 1;
    
    let aChar = a.charCodeAt(i);
    let bChar = b.charCodeAt(i);
    if (aChar === bChar) continue;
    
    let aUpperCase = aChar;
    let bUpperCase = bChar;
    if (LOWER_CASE_A <= aChar && aChar <= LOWER_CASE_Z) {
      aUpperCase -= ASCII_CASE_BIT;
    }
    if (LOWER_CASE_A <= bChar && bChar <= LOWER_CASE_Z) {
      bUpperCase -= ASCII_CASE_BIT;
    }
    
    if (aUpperCase !== bUpperCase) {
      return compareNaturally(a, b, i, aUpperCase, bUpperCase);
    }
    if (defaultResult === 0) {
      defaultResult = aChar - bChar;
    }
  }
  
  if (b.length > a.length) return -1;
  return Math.sign(defaultResult);
}

// Helper functions

/**
 * Check for numbers overlapping the current mismatched characters.
 * 
 * If both aChar and bChar are digits, use numerical comparison.
 * Check if the previous characters is a non-zero number, and if not,
 * skip - but count - leading zeros before comparing numbers.
 * 
 * If one is a digit and the other isn't, check if the previous character
 * is a digit, and if so, the the one with the digit is the greater number.
 * 
 * Otherwise just returns the difference between aChar and bChar.
 */
function compareNaturally(
  a: string,
  b: string,
  index: number,
  aChar: number,
  bChar: number
): number {
  const aIsDigit = isDigit(aChar);
  const bIsDigit = isDigit(bChar);
  
  if (aIsDigit) {
    if (bIsDigit) {
      return compareNumerically(a, b, aChar, bChar, index);
    } else if (index > 0 && isDigit(a.charCodeAt(index - 1))) {
      // aChar is the continuation of a longer number
      return 1;
    }
  } else if (bIsDigit && index > 0 && isDigit(b.charCodeAt(index - 1))) {
    // bChar is the continuation of a longer number
    return -1;
  }
  
  // Characters are both non-digits, or not continuation of earlier number
  return Math.sign(aChar - bChar);
}

/**
 * Compare numbers overlapping aChar and bChar numerically.
 * 
 * If the numbers have the same numerical value, but one has more leading
 * zeros, the longer number is considered greater than the shorter one.
 * 
 * This ensures a total ordering on strings compatible with equality.
 */
function compareNumerically(
  a: string,
  b: string,
  aChar: number,
  bChar: number,
  index: number
): number {
  // Both are digits. Find the first significant different digit, then find
  // the length of the numbers.
  if (isNonZeroNumberSuffix(a, index)) {
    // Part of a longer number, differs at this index, just count the length
    const result = compareDigitCount(a, b, index, index);
    if (result !== 0) return result;
    // If same length, the current character is the most significant differing digit
    return Math.sign(aChar - bChar);
  }
  
  // Not part of larger (non-zero) number, so skip leading zeros before
  // comparing numbers
  let aIndex = index;
  let bIndex = index;
  
  if (aChar === ZERO) {
    do {
      aIndex++;
      if (aIndex === a.length) return -1; // number in a is zero, b is not
      aChar = a.charCodeAt(aIndex);
    } while (aChar === ZERO);
    if (!isDigit(aChar)) return -1;
  } else if (bChar === ZERO) {
    do {
      bIndex++;
      if (bIndex === b.length) return 1; // number in b is zero, a is not
      bChar = b.charCodeAt(bIndex);
    } while (bChar === ZERO);
    if (!isDigit(bChar)) return 1;
  }
  
  if (aChar !== bChar) {
    const result = compareDigitCount(a, b, aIndex, bIndex);
    if (result !== 0) return result;
    return Math.sign(aChar - bChar);
  }
  
  // Same leading digit, one had more leading zeros
  // Compare digits until reaching a difference
  while (true) {
    let aIsDigit = false;
    let bIsDigit = false;
    aChar = 0;
    bChar = 0;
    
    if (++aIndex < a.length) {
      aChar = a.charCodeAt(aIndex);
      aIsDigit = isDigit(aChar);
    }
    if (++bIndex < b.length) {
      bChar = b.charCodeAt(bIndex);
      bIsDigit = isDigit(bChar);
    }
    
    if (aIsDigit) {
      if (bIsDigit) {
        if (aChar === bChar) continue;
        // First different digit found
        break;
      }
      // bChar is non-digit, so a has longer number
      return 1;
    } else if (bIsDigit) {
      return -1; // b has longer number
    } else {
      // Neither is digit, so numbers had same numerical value
      // Fall back on number of leading zeros (reflected by difference in indices)
      return Math.sign(aIndex - bIndex);
    }
  }
  
  // At first differing digits
  const result = compareDigitCount(a, b, aIndex, bIndex);
  if (result !== 0) return result;
  return Math.sign(aChar - bChar);
}

/**
 * Checks which of a and b has the longest sequence of digits.
 * 
 * Starts counting from i + 1 and j + 1 (assumes that a[i] and b[j] are
 * both already known to be digits).
 */
function compareDigitCount(a: string, b: string, i: number, j: number): number {
  while (++i < a.length) {
    const aIsDigit = isDigit(a.charCodeAt(i));
    if (++j === b.length) return aIsDigit ? 1 : 0;
    
    const bIsDigit = isDigit(b.charCodeAt(j));
    if (aIsDigit) {
      if (bIsDigit) continue;
      return 1;
    } else if (bIsDigit) {
      return -1;
    } else {
      return 0;
    }
  }
  
  if (++j < b.length && isDigit(b.charCodeAt(j))) {
    return -1;
  }
  return 0;
}

function isDigit(charCode: number): boolean {
  return (charCode ^ ZERO) <= 9;
}

/**
 * Check if the digit at index is continuing a non-zero number.
 * 
 * If there is no non-zero digits before, then leading zeros at index
 * are also ignored when comparing numerically. If there is a non-zero digit
 * before, then zeros at index are significant.
 */
function isNonZeroNumberSuffix(str: string, index: number): boolean {
  while (--index >= 0) {
    const char = str.charCodeAt(index);
    if (char !== ZERO) return isDigit(char);
  }
  return false;
}
