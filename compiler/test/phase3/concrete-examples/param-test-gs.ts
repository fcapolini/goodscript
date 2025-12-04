class Data {
  value: number = 0;
}

class Handler {
  process(d: Data): void {
    console.log(d.value);
  }
}
