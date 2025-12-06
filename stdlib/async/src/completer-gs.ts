/**
 * Completer - A way to produce a Promise and complete it later
 * 
 * Translated from Dart's async package:
 * https://api.dart.dev/stable/dart-async/Completer-class.html
 * 
 * A Completer is used to create a Promise that you can complete at a later time.
 * This is useful for:
 * - Bridging callback-based APIs to Promises
 * - Coordinating async operations
 * - Creating async gates/barriers
 * - Testing async code
 * 
 * Note: In GoodScript, this stores a gs::Promise<T> which wraps cppcoro::task<T>.
 * The actual completion mechanism uses a simple flag-based approach.
 */

export class Completer<T> {
  private _promise: Promise<T> | null = null;
  private _resolve: ((value: T) => void) | null = null;
  private _reject: ((reason: Error) => void) | null = null;
  private _isCompleted: boolean = false;
  private _hasValue: boolean = false;
  private _completedValue: T | undefined = undefined;
  private _completedError: Error | null = null;

  constructor() {
    // Promise will be created lazily on first getPromise() call
  }

  /**
   * Get the Promise that will be completed by this Completer.
   * 
   * The Promise is created on first call and cached.
   * Calling this multiple times returns the same Promise.
   */
  getPromise(): Promise<T> {
    if (this._promise === null) {
      // Create Promise with captured resolve/reject
      this._promise = new Promise<T>((resolve, reject) => {
        // If already completed before getPromise() was called, resolve/reject immediately
        if (this._isCompleted) {
          if (this._completedError !== null) {
            reject(this._completedError);
          } else if (this._hasValue) {
            resolve(this._completedValue as T);
          }
        } else {
          // Store resolve/reject for later use
          this._resolve = resolve;
          this._reject = reject;
        }
      });
    }
    return this._promise;
  }

  /**
   * Complete the Promise with a value.
   * 
   * @param value - The value to complete with
   * @throws Error if already completed
   */
  complete(value: T): void {
    if (this._isCompleted) {
      throw new Error('Completer already completed');
    }
    this._isCompleted = true;
    this._hasValue = true;
    this._completedValue = value;
    
    // If promise was already created, resolve it now
    if (this._resolve !== null) {
      this._resolve(value);
    }
    // Otherwise, store the value for when getPromise() is called
  }

  /**
   * Complete the Promise with an error.
   * 
   * @param error - The error to reject with
   * @throws Error if already completed
   */
  completeError(error: Error): void {
    if (this._isCompleted) {
      throw new Error('Completer already completed');
    }
    this._isCompleted = true;
    this._completedError = error;
    
    // If promise was already created, reject it now
    if (this._reject !== null) {
      this._reject(error);
    }
    // Otherwise, store the error for when getPromise() is called
  }

  /**
   * Whether this Completer has been completed.
   */
  isCompleted(): boolean {
    return this._isCompleted;
  }
}
