/**
 * Generic Stack Example
 * 
 * Demonstrates:
 * - Generic/template classes (Stack<T>)
 * - Generic methods
 * - Type parameters
 * - Nullable return types
 * - Array operations
 */

/// <reference path="../../../../../lib/goodscript.d.ts" />

class Stack<T> {
  private items: T[];

  constructor() {
    this.items = [];
  }

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | null {
    if (this.items.length === 0) {
      return null;
    }
    const item = this.items[this.items.length - 1];
    this.items.length = this.items.length - 1;
    return item;
  }

  peek(): T | null {
    if (this.items.length === 0) {
      return null;
    }
    return this.items[this.items.length - 1];
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }
}

// Generic function to reverse an array using a stack
const reverseArray = <T>(arr: T[]): T[] => {
  const stack = new Stack<T>();
  
  // Push all items
  for (let i = 0; i < arr.length; i++) {
    stack.push(arr[i]);
  }
  
  // Pop all items
  const reversed: T[] = [];
  while (!stack.isEmpty()) {
    const item = stack.pop();
    if (item !== null) {
      reversed.push(item);
    }
  }
  
  return reversed;
};

// Generic function to check balanced parentheses
const isBalanced = (expr: string): boolean => {
  const stack = new Stack<string>();
  
  for (let i = 0; i < expr.length; i++) {
    const char = expr.charAt(i);
    
    if (char === '(' || char === '[' || char === '{') {
      stack.push(char);
    } else if (char === ')' || char === ']' || char === '}') {
      if (stack.isEmpty()) {
        return false;
      }
      
      const top = stack.pop();
      if (top === null) {
        return false;
      }
      
      if (char === ')' && top !== '(') {
        return false;
      }
      if (char === ']' && top !== '[') {
        return false;
      }
      if (char === '}' && top !== '{') {
        return false;
      }
    }
  }
  
  return stack.isEmpty();
};

const testNumberStack = (): void => {
  console.log("=== Number Stack Test ===");
  const stack = new Stack<number>();
  
  console.log(`Empty: ${stack.isEmpty()}`);
  
  stack.push(10);
  stack.push(20);
  stack.push(30);
  
  console.log(`Size: ${stack.size()}`);
  
  const peek1 = stack.peek();
  if (peek1 !== null) {
    console.log(`Peek: ${peek1}`);
  }
  
  const pop1 = stack.pop();
  if (pop1 !== null) {
    console.log(`Pop: ${pop1}`);
  }
  
  const pop2 = stack.pop();
  if (pop2 !== null) {
    console.log(`Pop: ${pop2}`);
  }
  
  console.log(`Size after pops: ${stack.size()}`);
};

const testStringStack = (): void => {
  console.log("\n=== String Stack Test ===");
  const stack = new Stack<string>();
  
  stack.push("first");
  stack.push("second");
  stack.push("third");
  
  console.log("Popping all items:");
  while (!stack.isEmpty()) {
    const item = stack.pop();
    if (item !== null) {
      console.log(`  ${item}`);
    }
  }
};

const testReverseArray = (): void => {
  console.log("\n=== Reverse Array Test ===");
  
  const numbers = [1, 2, 3, 4, 5];
  const reversedNumbers = reverseArray(numbers);
  console.log("Original: [1, 2, 3, 4, 5]");
  console.log(`Reversed: [${reversedNumbers.join(', ')}]`);
  
  const words = ["hello", "world", "foo", "bar"];
  const reversedWords = reverseArray(words);
  console.log("Original: [hello, world, foo, bar]");
  console.log(`Reversed: [${reversedWords.join(', ')}]`);
};

const testBalancedParentheses = (): void => {
  console.log("\n=== Balanced Parentheses Test ===");
  
  const expressions = [
    "()",
    "(())",
    "((()))",
    "()[]{}",
    "([{}])",
    "(",
    ")",
    "([)]",
    "((())",
    "{[}]"
  ];
  
  for (let i = 0; i < expressions.length; i++) {
    const expr = expressions[i];
    const balanced = isBalanced(expr);
    console.log(`"${expr}": ${balanced === true ? 'balanced' : 'not balanced'}`);
  }
};

// Run all tests
const runAllTests = (): void => {
  testNumberStack();
  testStringStack();
  testReverseArray();
  testBalancedParentheses();
  console.log("\n=== All tests completed ===");
};

runAllTests();
