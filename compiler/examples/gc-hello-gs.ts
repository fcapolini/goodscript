/**
 * Simple Hello World test for GC mode
 */

const message: string = "Hello from GC mode!";
console.log(message);

class Greeter {
  name: string;
  
  constructor(name: string) {
    this.name = name;
  }
  
  greet(): void {
    console.log(`Hello, ${this.name}!`);
  }
}

const greeter = new Greeter("World");
greeter.greet();
