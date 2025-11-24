/**
 * Binary Search Tree Example
 * 
 * Demonstrates:
 * - Recursive data structures
 * - Pool Pattern for managing tree nodes
 * - Own/Share ownership types
 * - Recursive algorithms (insert, search, traverse)
 * - Nullable types
 * - Complex class interactions
 */

/// <reference path="../../../../../lib/goodscript.d.ts" />

class TreeNode {
  value: number;
  leftIndex: number;
  rightIndex: number;

  constructor(value: number) {
    this.value = value;
    this.leftIndex = -1;
    this.rightIndex = -1;
  }
}

class BinarySearchTree {
  private nodes: share<TreeNode>[];
  private rootIndex: number;

  constructor() {
    this.nodes = [];
    this.rootIndex = -1;
  }

  insert(value: number): void {
    const newNode = new TreeNode(value);
    this.nodes.push(newNode);
    const newIndex = this.nodes.length - 1;

    if (this.rootIndex === -1) {
      this.rootIndex = newIndex;
    } else {
      this.insertRecursive(this.rootIndex, newIndex);
    }
  }

  private insertRecursive(currentIndex: number, newIndex: number): void {
    const current = this.nodes[currentIndex];
    const newNode = this.nodes[newIndex];

    if (newNode.value < current.value) {
      if (current.leftIndex === -1) {
        current.leftIndex = newIndex;
      } else {
        this.insertRecursive(current.leftIndex, newIndex);
      }
    } else {
      if (current.rightIndex === -1) {
        current.rightIndex = newIndex;
      } else {
        this.insertRecursive(current.rightIndex, newIndex);
      }
    }
  }

  search(value: number): boolean {
    if (this.rootIndex === -1) {
      return false;
    }
    return this.searchRecursive(this.rootIndex, value);
  }

  private searchRecursive(index: number, value: number): boolean {
    if (index === -1) {
      return false;
    }

    const node = this.nodes[index];

    if (node.value === value) {
      return true;
    }

    if (value < node.value) {
      return this.searchRecursive(node.leftIndex, value);
    } else {
      return this.searchRecursive(node.rightIndex, value);
    }
  }

  findMin(): number | null {
    if (this.rootIndex === -1) {
      return null;
    }
    return this.findMinRecursive(this.rootIndex);
  }

  private findMinRecursive(index: number): number {
    const node = this.nodes[index];
    if (node.leftIndex === -1) {
      return node.value;
    }
    return this.findMinRecursive(node.leftIndex);
  }

  findMax(): number | null {
    if (this.rootIndex === -1) {
      return null;
    }
    return this.findMaxRecursive(this.rootIndex);
  }

  private findMaxRecursive(index: number): number {
    const node = this.nodes[index];
    if (node.rightIndex === -1) {
      return node.value;
    }
    return this.findMaxRecursive(node.rightIndex);
  }

  height(): number {
    if (this.rootIndex === -1) {
      return 0;
    }
    return this.heightRecursive(this.rootIndex);
  }

  private heightRecursive(index: number): number {
    if (index === -1) {
      return 0;
    }

    const node = this.nodes[index];
    const leftHeight = this.heightRecursive(node.leftIndex);
    const rightHeight = this.heightRecursive(node.rightIndex);

    return 1 + (leftHeight > rightHeight ? leftHeight : rightHeight);
  }

  inorderTraversal(): number[] {
    const result: number[] = [];
    if (this.rootIndex !== -1) {
      this.inorderRecursive(this.rootIndex, result);
    }
    return result;
  }

  private inorderRecursive(index: number, result: number[]): void {
    if (index === -1) {
      return;
    }

    const node = this.nodes[index];
    this.inorderRecursive(node.leftIndex, result);
    result.push(node.value);
    this.inorderRecursive(node.rightIndex, result);
  }

  preorderTraversal(): number[] {
    const result: number[] = [];
    if (this.rootIndex !== -1) {
      this.preorderRecursive(this.rootIndex, result);
    }
    return result;
  }

  private preorderRecursive(index: number, result: number[]): void {
    if (index === -1) {
      return;
    }

    const node = this.nodes[index];
    result.push(node.value);
    this.preorderRecursive(node.leftIndex, result);
    this.preorderRecursive(node.rightIndex, result);
  }

  postorderTraversal(): number[] {
    const result: number[] = [];
    if (this.rootIndex !== -1) {
      this.postorderRecursive(this.rootIndex, result);
    }
    return result;
  }

  private postorderRecursive(index: number, result: number[]): void {
    if (index === -1) {
      return;
    }

    const node = this.nodes[index];
    this.postorderRecursive(node.leftIndex, result);
    this.postorderRecursive(node.rightIndex, result);
    result.push(node.value);
  }

  count(): number {
    return this.nodes.length;
  }
}

const testBasicOperations = (): void => {
  console.log("=== Basic Operations ===");
  const tree = new BinarySearchTree();

  tree.insert(50);
  tree.insert(30);
  tree.insert(70);
  tree.insert(20);
  tree.insert(40);
  tree.insert(60);
  tree.insert(80);

  console.log(`Total nodes: ${tree.count()}`);
  console.log(`Tree height: ${tree.height()}`);

  const min = tree.findMin();
  if (min !== null) {
    console.log(`Minimum value: ${min}`);
  }

  const max = tree.findMax();
  if (max !== null) {
    console.log(`Maximum value: ${max}`);
  }
};

const testSearch = (): void => {
  console.log("\n=== Search Tests ===");
  const tree = new BinarySearchTree();

  const values = [50, 30, 70, 20, 40, 60, 80];
  for (let i = 0; i < values.length; i++) {
    tree.insert(values[i]);
  }

  const searchValues = [50, 30, 80, 25, 100];
  for (let i = 0; i < searchValues.length; i++) {
    const val = searchValues[i];
    const found = tree.search(val);
    console.log(`Search ${val}: ${found === true ? 'found' : 'not found'}`);
  }
};

const testTraversals = (): void => {
  console.log("\n=== Traversal Tests ===");
  const tree = new BinarySearchTree();

  const values = [50, 30, 70, 20, 40, 60, 80];
  for (let i = 0; i < values.length; i++) {
    tree.insert(values[i]);
  }

  const inorder = tree.inorderTraversal();
  console.log(`Inorder: [${inorder.join(', ')}]`);

  const preorder = tree.preorderTraversal();
  console.log(`Preorder: [${preorder.join(', ')}]`);

  const postorder = tree.postorderTraversal();
  console.log(`Postorder: [${postorder.join(', ')}]`);
};

const testLargeTree = (): void => {
  console.log("\n=== Large Tree Test ===");
  const tree = new BinarySearchTree();

  const values = [50, 25, 75, 12, 37, 62, 87, 6, 18, 31, 43, 56, 68, 81, 93];
  for (let i = 0; i < values.length; i++) {
    tree.insert(values[i]);
  }

  console.log(`Total nodes: ${tree.count()}`);
  console.log(`Tree height: ${tree.height()}`);

  const inorder = tree.inorderTraversal();
  console.log(`Sorted values: [${inorder.join(', ')}]`);

  // Verify BST property (inorder should be sorted)
  let isSorted = true;
  for (let i = 1; i < inorder.length; i++) {
    if (inorder[i] < inorder[i - 1]) {
      isSorted = false;
      break;
    }
  }
  console.log(`Is properly sorted: ${isSorted}`);
};

const testEmptyTree = (): void => {
  console.log("\n=== Empty Tree Test ===");
  const tree = new BinarySearchTree();

  console.log(`Empty tree count: ${tree.count()}`);
  console.log(`Empty tree height: ${tree.height()}`);
  console.log(`Search in empty tree: ${tree.search(42)}`);

  const min = tree.findMin();
  console.log(`Min in empty tree: ${min === null ? 'null' : min}`);

  const max = tree.findMax();
  console.log(`Max in empty tree: ${max === null ? 'null' : max}`);
};

// Run all tests
const runBSTTests = (): void => {
  testBasicOperations();
  testSearch();
  testTraversals();
  testLargeTree();
  testEmptyTree();
  console.log("\n=== All tests completed ===");
};

runBSTTests();
