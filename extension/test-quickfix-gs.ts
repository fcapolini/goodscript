/**
 * Test file for GS303 quick fix functionality
 * Open this file in VS Code with the GoodScript extension installed
 * You should see red squiggles on the naked class references
 * Hover over them and click the lightbulb to see quick fix options
 */

class Node {
  // GS303: Should show quick fixes to wrap with own<Node>, share<Node>, or use<Node>
  next: Node | null = null;
  prev: Node | null = null;
}

class LinkedList {
  // GS303: Should show quick fixes for Item type
  head: Item | null = null;
  tail: Item | undefined = undefined;
}

class Item {
  value: number = 0;
  // GS303: Array syntax
  related: Item[] = [];
}

class Container {
  // GS303: Should handle complex types
  data: Node = new Node();
}

/**
 * Expected quick fix behavior:
 * 
 * When you click the lightbulb on a naked class reference, you should see:
 * 
 * 🔒 Wrap with own<Type> (exclusive ownership)
 * 🔗 Wrap with share<Type> (shared ownership)     [Preferred/default]
 * 👁️ Wrap with use<Type> (non-owning reference)
 * 
 * Selecting one will automatically wrap the type with the chosen qualifier.
 */
