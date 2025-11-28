class Base {
  value: number;
  constructor(v: number) {
    this.value = v;
  }
}

class Derived extends Base {
  name: string;
  constructor(v: number, n: string) {
    super(v);
    this.name = n;
  }
}
