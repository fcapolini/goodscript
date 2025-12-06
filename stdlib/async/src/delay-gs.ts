/**
 * delay - Async delay/sleep utility
 * 
 * Translated from Dart's Future.delayed:
 * https://api.dart.dev/stable/dart-async/Future/Future.delayed.html
 * 
 * Creates a Promise that completes after a specified duration.
 * Useful for:
 * - Adding delays in async workflows
 * - Implementing timeouts
 * - Throttling or rate-limiting
 * - Testing async behavior
 */

/**
 * Create a Promise that resolves after the specified milliseconds.
 * 
 * @param milliseconds - Duration to wait before resolving
 * @returns A Promise that resolves after the delay
 */
export async function delay(milliseconds: number): Promise<void> {
  // In real implementation, this would use async mechanisms
  // For GoodScript validation, we'll use a busy-wait simulation
  const start = Date.now();
  while (Date.now() - start < milliseconds) {
    // Busy wait (in real code, this would be event loop based)
  }
}

/**
 * Create a Promise that resolves with a value after the specified milliseconds.
 * 
 * @param milliseconds - Duration to wait before resolving
 * @param value - Value to resolve with after the delay
 * @returns A Promise that resolves with the value after the delay
 */
export async function delayValue<T>(milliseconds: number, value: T): Promise<T> {
  await delay(milliseconds);
  return value;
}
