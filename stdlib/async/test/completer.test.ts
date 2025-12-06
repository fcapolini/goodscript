import { describe, it, expect } from 'vitest';
import { Completer } from '../src/completer-gs';

describe('Completer', () => {
  describe('constructor', () => {
    it('creates a new Completer', () => {
      const completer = new Completer<number>();
      expect(completer).toBeInstanceOf(Completer);
      expect(completer.isCompleted()).toBe(false);
    });

    it('creates a pending Promise', async () => {
      const completer = new Completer<string>();
      const promise = completer.getPromise();
      expect(promise).toBeInstanceOf(Promise);
      
      // Promise should not resolve immediately
      let resolved = false;
      promise.then(() => { resolved = true; });
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(resolved).toBe(false);
      
      // Complete it to avoid hanging promise
      completer.complete('done');
      await promise;  // Wait for completion
    });
  });

  describe('getPromise', () => {
    it('returns the same Promise on multiple calls', () => {
      const completer = new Completer<number>();
      const promise1 = completer.getPromise();
      const promise2 = completer.getPromise();
      expect(promise1).toBe(promise2);
    });
  });

  describe('complete', () => {
    it('resolves the Promise with a value', async () => {
      const completer = new Completer<number>();
      const promise = completer.getPromise();
      
      completer.complete(42);
      
      const result = await promise;
      expect(result).toBe(42);
      expect(completer.isCompleted()).toBe(true);
    });

    it('resolves with string value', async () => {
      const completer = new Completer<string>();
      completer.complete('hello');
      
      const result = await completer.getPromise();
      expect(result).toBe('hello');
    });

    it('resolves with object value', async () => {
      const completer = new Completer<{ name: string; age: number }>();
      const obj = { name: 'Alice', age: 30 };
      completer.complete(obj);
      
      const result = await completer.getPromise();
      expect(result).toEqual(obj);
    });

    it('resolves with null', async () => {
      const completer = new Completer<string | null>();
      completer.complete(null);
      
      const result = await completer.getPromise();
      expect(result).toBe(null);
    });

    it('throws if already completed', () => {
      const completer = new Completer<number>();
      completer.complete(42);
      
      expect(() => completer.complete(100)).toThrow('Completer already completed');
    });

    it('throws if already completed with error', () => {
      const completer = new Completer<number>();
      completer.completeError(new Error('test'));
      
      // Catch the rejection to avoid unhandled promise
      completer.getPromise().catch(() => {});
      
      expect(() => completer.complete(42)).toThrow('Completer already completed');
    });

    it('allows awaiting multiple times', async () => {
      const completer = new Completer<number>();
      completer.complete(42);
      
      const promise = completer.getPromise();
      const result1 = await promise;
      const result2 = await promise;
      
      expect(result1).toBe(42);
      expect(result2).toBe(42);
    });
  });

  describe('completeError', () => {
    it('rejects the Promise with an error', async () => {
      const completer = new Completer<number>();
      const promise = completer.getPromise();
      
      const error = new Error('test error');
      completer.completeError(error);
      
      await expect(promise).rejects.toThrow('test error');
      expect(completer.isCompleted()).toBe(true);
    });

    it('rejects with custom error message', async () => {
      const completer = new Completer<string>();
      completer.completeError(new Error('network failure'));
      
      await expect(completer.getPromise()).rejects.toThrow('network failure');
    });

    it('throws if already completed', () => {
      const completer = new Completer<number>();
      completer.complete(42);
      
      expect(() => completer.completeError(new Error('test'))).toThrow('Completer already completed');
    });

    it('throws if already completed with error', () => {
      const completer = new Completer<number>();
      completer.completeError(new Error('first'));
      
      // Catch the rejection to avoid unhandled promise
      completer.getPromise().catch(() => {});
      
      expect(() => completer.completeError(new Error('second'))).toThrow('Completer already completed');
    });
  });

  describe('isCompleted', () => {
    it('returns false for new Completer', () => {
      const completer = new Completer<number>();
      expect(completer.isCompleted()).toBe(false);
    });

    it('returns true after complete', () => {
      const completer = new Completer<number>();
      completer.complete(42);
      expect(completer.isCompleted()).toBe(true);
    });

    it('returns true after completeError', () => {
      const completer = new Completer<number>();
      completer.completeError(new Error('test'));
      
      // Catch the rejection to avoid unhandled promise
      completer.getPromise().catch(() => {});
      
      expect(completer.isCompleted()).toBe(true);
    });
  });

  describe('use cases', () => {
    it('bridges callback to Promise', async () => {
      const completer = new Completer<string>();
      
      // Simulate callback-based API
      setTimeout(() => {
        completer.complete('done');
      }, 10);
      
      const result = await completer.getPromise();
      expect(result).toBe('done');
    });

    it('coordinates multiple async operations', async () => {
      const completer1 = new Completer<number>();
      const completer2 = new Completer<number>();
      
      // Start two operations
      setTimeout(() => completer1.complete(1), 20);
      setTimeout(() => completer2.complete(2), 10);
      
      // Wait for both
      const results = await Promise.all([
        completer1.getPromise(),
        completer2.getPromise()
      ]);
      
      expect(results).toEqual([1, 2]);
    });

    it('creates an async gate', async () => {
      const gate = new Completer<void>();
      let executed = false;
      
      // Task waiting for gate
      const task = async () => {
        await gate.getPromise();
        executed = true;
      };
      
      const taskPromise = task();
      
      // Gate not open yet
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(executed).toBe(false);
      
      // Open the gate
      gate.complete(undefined);
      await taskPromise;
      
      expect(executed).toBe(true);
    });

    it('handles race condition', async () => {
      const completer = new Completer<string>();
      
      // Multiple operations racing to complete
      const op1 = async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
        if (!completer.isCompleted()) {
          completer.complete('op1 won');
        }
      };
      
      const op2 = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        if (!completer.isCompleted()) {
          completer.complete('op2 won');
        }
      };
      
      op1();
      op2();
      
      const result = await completer.getPromise();
      expect(result).toBe('op2 won');
    });

    it('timeout pattern', async () => {
      const completer = new Completer<string>();
      
      // Start slow operation
      setTimeout(() => completer.complete('slow result'), 100);
      
      // Race with timeout
      const timeout = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 20);
      });
      
      await expect(Promise.race([
        completer.getPromise(),
        timeout
      ])).rejects.toThrow('timeout');
    });
  });

  describe('edge cases', () => {
    it('completes with undefined', async () => {
      const completer = new Completer<undefined>();
      completer.complete(undefined);
      
      const result = await completer.getPromise();
      expect(result).toBe(undefined);
    });

    it('completes with void', async () => {
      const completer = new Completer<void>();
      completer.complete(undefined);
      
      await completer.getPromise();
      // Just verify it resolves
    });

    it('completes with array', async () => {
      const completer = new Completer<number[]>();
      const arr = [1, 2, 3];
      completer.complete(arr);
      
      const result = await completer.getPromise();
      expect(result).toEqual([1, 2, 3]);
    });

    it('completes with nested Promise result', async () => {
      const completer = new Completer<number>();
      completer.complete(42);
      
      // Await the promise from another async context
      const wrapper = async () => {
        return await completer.getPromise();
      };
      
      const result = await wrapper();
      expect(result).toBe(42);
    });

    it('handles immediate completion', async () => {
      const completer = new Completer<number>();
      const promise = completer.getPromise();
      
      // Complete immediately before any await
      completer.complete(42);
      
      const result = await promise;
      expect(result).toBe(42);
    });

    it('handles error in then handler', async () => {
      const completer = new Completer<number>();
      completer.complete(42);
      
      const promise = completer.getPromise().then(value => {
        throw new Error('handler error');
      });
      
      await expect(promise).rejects.toThrow('handler error');
    });
  });
});
