/**
 * QueueList native execution test
 * Demonstrates end-to-end: TypeScript → C++ → Binary
 */

class QueueList<E> {
  private _queue: (E | undefined)[];
  private _head: number;
  private _tail: number;
  
  constructor() {
    this._queue = [];
    this._head = 0;
    this._tail = 0;
  }
  
  addFirst(element: E): void {
    this._head = this._head - 1;
    if (this._head < 0) {
      this._head = this._queue.length - 1;
    }
    this._queue[this._head] = element;
    
    if (this._head === this._tail) {
      this._grow();
    }
  }
  
  addLast(element: E): void {
    this._queue[this._tail] = element;
    this._tail = (this._tail + 1) % this._queue.length;
    
    if (this._head === this._tail) {
      this._grow();
    }
  }
  
  removeFirst(): E | null {
    if (this._head === this._tail) return null;
    
    const element = this._queue[this._head];
    this._queue[this._head] = undefined;
    this._head = (this._head + 1) % this._queue.length;
    
    return element === undefined ? null : element;
  }
  
  removeLast(): E | null {
    if (this._head === this._tail) return null;
    
    this._tail = this._tail - 1;
    if (this._tail < 0) {
      this._tail = this._queue.length - 1;
    }
    
    const element = this._queue[this._tail];
    this._queue[this._tail] = undefined;
    
    return element === undefined ? null : element;
  }
  
  getLength(): number {
    return (this._tail - this._head + this._queue.length) % this._queue.length;
  }
  
  private _grow(): void {
    const newCapacity = this._queue.length === 0 ? 8 : this._queue.length * 2;
    const newQueue: (E | undefined)[] = [];
    
    let i = 0;
    while (i < newCapacity) {
      newQueue.push(undefined);
      i = i + 1;
    }
    
    const length = this.getLength();
    let j = 0;
    while (j < length) {
      newQueue[j] = this._queue[(this._head + j) % this._queue.length];
      j = j + 1;
    }
    
    this._head = 0;
    this._tail = length;
    this._queue = newQueue;
  }
}

function main(): void {
  console.log('QueueList Native Execution Test');
  console.log('================================');
  console.log('');
  
  const queue = new QueueList<number>();
  
  console.log('Adding elements: 1, 2, 3');
  queue.addLast(1);
  queue.addLast(2);
  queue.addLast(3);
  console.log('Length: ' + queue.getLength().toString());
  
  console.log('');
  console.log('Adding to front: 0');
  queue.addFirst(0);
  console.log('Length: ' + queue.getLength().toString());
  
  console.log('');
  console.log('Removing from front:');
  const first = queue.removeFirst();
  if (first !== null) {
    console.log('  Removed: ' + first.toString());
  }
  
  console.log('Removing from back:');
  const last = queue.removeLast();
  if (last !== null) {
    console.log('  Removed: ' + last.toString());
  }
  
  console.log('');
  console.log('Final length: ' + queue.getLength().toString());
  console.log('');
  console.log('✅ QueueList test complete!');
}

main();
