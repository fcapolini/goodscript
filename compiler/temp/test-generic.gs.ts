class Container<T> {
  items: T[] = [];
  
  add(item: T): void {
    this.items.push(item);
  }
}

const numbers = new Container<number>();
numbers.add(42);
