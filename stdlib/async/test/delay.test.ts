import { describe, it, expect } from 'vitest';
import { delay, delayValue } from '../src/delay-gs';

describe('delay', () => {
  it('waits for specified milliseconds', async () => {
    const start = Date.now();
    await delay(50);
    const elapsed = Date.now() - start;
    
    // Should be at least 50ms (with some tolerance for execution time)
    expect(elapsed).toBeGreaterThanOrEqual(45);
  });

  it('resolves with void', async () => {
    const result = await delay(10);
    expect(result).toBe(undefined);
  });

  it('can be awaited multiple times sequentially', async () => {
    const start = Date.now();
    await delay(20);
    await delay(20);
    const elapsed = Date.now() - start;
    
    expect(elapsed).toBeGreaterThanOrEqual(35);
  });

  it('works with zero milliseconds', async () => {
    const start = Date.now();
    await delay(0);
    const elapsed = Date.now() - start;
    
    expect(elapsed).toBeGreaterThanOrEqual(0);
    expect(elapsed).toBeLessThan(50);
  });
});

describe('delayValue', () => {
  it('returns value after delay', async () => {
    const result = await delayValue(10, 42);
    expect(result).toBe(42);
  });

  it('returns string after delay', async () => {
    const result = await delayValue(10, 'hello');
    expect(result).toBe('hello');
  });

  it('returns object after delay', async () => {
    const obj = { name: 'Alice', age: 30 };
    const result = await delayValue(10, obj);
    expect(result).toEqual(obj);
    expect(result).toBe(obj); // Same reference
  });

  it('returns null', async () => {
    const result = await delayValue<string | null>(10, null);
    expect(result).toBe(null);
  });

  it('returns array', async () => {
    const arr = [1, 2, 3];
    const result = await delayValue(10, arr);
    expect(result).toEqual([1, 2, 3]);
  });

  it('waits correct duration', async () => {
    const start = Date.now();
    await delayValue(50, 'done');
    const elapsed = Date.now() - start;
    
    expect(elapsed).toBeGreaterThanOrEqual(45);
  });
});

describe('use cases', () => {
  it('sequential delays in workflow', async () => {
    const events: string[] = [];
    
    events.push('start');
    await delay(20);
    events.push('middle');
    await delay(20);
    events.push('end');
    
    expect(events).toEqual(['start', 'middle', 'end']);
  });

  it('delay between retries', async () => {
    let attempts = 0;
    
    const tryOperation = async (): Promise<boolean> => {
      attempts++;
      if (attempts < 3) {
        await delay(10);
        return await tryOperation();
      }
      return true;
    };
    
    const result = await tryOperation();
    expect(result).toBe(true);
    expect(attempts).toBe(3);
  });

  it('timeout pattern', async () => {
    const quickOperation = async () => {
      await delay(10);
      return 'success';
    };
    
    const timeout = async () => {
      await delay(100);
      throw new Error('timeout');
    };
    
    const result = await Promise.race([quickOperation(), timeout()]);
    expect(result).toBe('success');
  });

  it('delayed value return', async () => {
    const fetchData = async () => {
      return await delayValue(20, { id: 1, name: 'Item' });
    };
    
    const data = await fetchData();
    expect(data).toEqual({ id: 1, name: 'Item' });
  });
});
