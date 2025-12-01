#include "gs_gc_runtime.hpp"

namespace gs {

  class TreeNode {
    public:
    double value;
    double leftIndex;
    double rightIndex;
    TreeNode(double value) : value(value), leftIndex(-1), rightIndex(-1) {
    }

  };

  class BinarySearchTree {
    public:
    gs::Array<gs::TreeNode*> nodes;
    double rootIndex;
    BinarySearchTree() : nodes({}), rootIndex(-1) {
    }
    void insert(double value) {
      gs::TreeNode* newNode = gs::gc::Allocator::alloc<gs::TreeNode>(value);
      this->nodes.push(newNode);
      const auto newIndex = this->nodes.length() - 1;
      if (this->rootIndex == -1) {
        this->rootIndex = newIndex;
      } else {
        this->insertRecursive(this->rootIndex, newIndex);
      }
    }
    void insertRecursive(double currentIndex, double newIndex) {
      const gs::TreeNode current = this->nodes[static_cast<int>(currentIndex)];
      const gs::TreeNode newNode = this->nodes[static_cast<int>(newIndex)];
      if (newNode.value < current.value) {
        if (current.leftIndex == -1) {
          current.leftIndex = newIndex;
        } else {
          this->insertRecursive(current.leftIndex, newIndex);
        }
      } else {
        if (current.rightIndex == -1) {
          current.rightIndex = newIndex;
        } else {
          this->insertRecursive(current.rightIndex, newIndex);
        }
      }
    }
    bool search(double value) {
      if (this->rootIndex == -1) {
        return false;
      }
      return this->searchRecursive(this->rootIndex, value);
    }
    bool searchRecursive(double index, double value) {
      if (index == -1) {
        return false;
      }
      const gs::TreeNode node = this->nodes[static_cast<int>(index)];
      if (node.value == value) {
        return true;
      }
      if (value < node.value) {
        return this->searchRecursive(node.leftIndex, value);
      } else {
        return this->searchRecursive(node.rightIndex, value);
      }
    }
    std::optional<double> findMin() {
      if (this->rootIndex == -1) {
        return std::nullopt;
      }
      return this->findMinRecursive(this->rootIndex);
    }
    double findMinRecursive(double index) {
      const gs::TreeNode node = this->nodes[static_cast<int>(index)];
      if (node.leftIndex == -1) {
        return node.value;
      }
      return this->findMinRecursive(node.leftIndex);
    }
    std::optional<double> findMax() {
      if (this->rootIndex == -1) {
        return std::nullopt;
      }
      return this->findMaxRecursive(this->rootIndex);
    }
    double findMaxRecursive(double index) {
      const gs::TreeNode node = this->nodes[static_cast<int>(index)];
      if (node.rightIndex == -1) {
        return node.value;
      }
      return this->findMaxRecursive(node.rightIndex);
    }
    double height() {
      if (this->rootIndex == -1) {
        return 0;
      }
      return this->heightRecursive(this->rootIndex);
    }
    double heightRecursive(double index) {
      if (index == -1) {
        return 0;
      }
      const gs::TreeNode node = this->nodes[static_cast<int>(index)];
      const auto leftHeight = this->heightRecursive(node.leftIndex);
      const auto rightHeight = this->heightRecursive(node.rightIndex);
      return 1 + ((leftHeight > rightHeight ? leftHeight : rightHeight));
    }
    gs::Array<double> inorderTraversal() {
      gs::Array<double> result = gs::Array<double>({});
      if (this->rootIndex != -1) {
        this->inorderRecursive(this->rootIndex, result);
      }
      return result;
    }
    void inorderRecursive(double index, gs::Array<double>& result) {
      if (index == -1) {
        return;
      }
      const gs::TreeNode node = this->nodes[static_cast<int>(index)];
      this->inorderRecursive(node.leftIndex, result);
      result.push(node.value);
      this->inorderRecursive(node.rightIndex, result);
    }
    gs::Array<double> preorderTraversal() {
      gs::Array<double> result = gs::Array<double>({});
      if (this->rootIndex != -1) {
        this->preorderRecursive(this->rootIndex, result);
      }
      return result;
    }
    void preorderRecursive(double index, gs::Array<double>& result) {
      if (index == -1) {
        return;
      }
      const gs::TreeNode node = this->nodes[static_cast<int>(index)];
      result.push(node.value);
      this->preorderRecursive(node.leftIndex, result);
      this->preorderRecursive(node.rightIndex, result);
    }
    gs::Array<double> postorderTraversal() {
      gs::Array<double> result = gs::Array<double>({});
      if (this->rootIndex != -1) {
        this->postorderRecursive(this->rootIndex, result);
      }
      return result;
    }
    void postorderRecursive(double index, gs::Array<double>& result) {
      if (index == -1) {
        return;
      }
      const gs::TreeNode node = this->nodes[static_cast<int>(index)];
      this->postorderRecursive(node.leftIndex, result);
      this->postorderRecursive(node.rightIndex, result);
      result.push(node.value);
    }
    double count() const {
      return this->nodes.length();
    }

  };

} // namespace gs

int main() {
  gs::gc::Runtime gc_runtime;
  const std::function<void()> testBasicOperations = [&]() -> void {
    gs::console::log(gs::String("=== Basic Operations ==="));
    gs::BinarySearchTree* tree = gs::gc::Allocator::alloc<gs::BinarySearchTree>();
    tree->insert(50);
    tree->insert(30);
    tree->insert(70);
    tree->insert(20);
    tree->insert(40);
    tree->insert(60);
    tree->insert(80);
    gs::console::log(gs::String("Total nodes: ") + tree->count());
    gs::console::log(gs::String("Tree height: ") + tree->height());
    const auto min = tree->findMin();
    if (min != std::nullopt) {
      gs::console::log(gs::String("Minimum value: ") + min.value());
    }
    const auto max = tree->findMax();
    if (max != std::nullopt) {
      gs::console::log(gs::String("Maximum value: ") + max.value());
    }
  };
  const std::function<void()> testSearch = [&]() -> void {
    gs::console::log(gs::String("\n=== Search Tests ==="));
    gs::BinarySearchTree* tree = gs::gc::Allocator::alloc<gs::BinarySearchTree>();
    const auto values = gs::Array<double>({50, 30, 70, 20, 40, 60, 80});
    for (int i = 0; i < values.length(); i++) {
      tree->insert(*values[static_cast<int>(i)]);
    }
    const auto searchValues = gs::Array<double>({50, 30, 80, 25, 100});
    for (int i = 0; i < searchValues.length(); i++) {
      const double val = searchValues[static_cast<int>(i)];
      const auto found = tree->search(val);
      gs::console::log(gs::String("Search ") + val + gs::String(": ") + (found == true ? gs::String("found" : gs::String("not found"))));
    }
  };
  const std::function<void()> testTraversals = [&]() -> void {
    gs::console::log(gs::String("\n=== Traversal Tests ==="));
    gs::BinarySearchTree* tree = gs::gc::Allocator::alloc<gs::BinarySearchTree>();
    const auto values = gs::Array<double>({50, 30, 70, 20, 40, 60, 80});
    for (int i = 0; i < values.length(); i++) {
      tree->insert(*values[static_cast<int>(i)]);
    }
    const auto inorder = tree->inorderTraversal();
    gs::console::log(gs::String("Inorder: [") + inorder.join(gs::String(", ")) + gs::String("]"));
    const auto preorder = tree->preorderTraversal();
    gs::console::log(gs::String("Preorder: [") + preorder.join(gs::String(", ")) + gs::String("]"));
    const auto postorder = tree->postorderTraversal();
    gs::console::log(gs::String("Postorder: [") + postorder.join(gs::String(", ")) + gs::String("]"));
  };
  const std::function<void()> testLargeTree = [&]() -> void {
    gs::console::log(gs::String("\n=== Large Tree Test ==="));
    gs::BinarySearchTree* tree = gs::gc::Allocator::alloc<gs::BinarySearchTree>();
    const auto values = gs::Array<double>({50, 25, 75, 12, 37, 62, 87, 6, 18, 31, 43, 56, 68, 81, 93});
    for (int i = 0; i < values.length(); i++) {
      tree->insert(*values[static_cast<int>(i)]);
    }
    gs::console::log(gs::String("Total nodes: ") + tree->count());
    gs::console::log(gs::String("Tree height: ") + tree->height());
    const auto inorder = tree->inorderTraversal();
    gs::console::log(gs::String("Sorted values: [") + inorder.join(gs::String(", ")) + gs::String("]"));
    auto isSorted = true;
    for (int i = 1; i < inorder.length(); i++) {
      if (*inorder[static_cast<int>(i)] < *inorder[static_cast<int>(i - 1)]) {
        isSorted = false;
        break;
      }
    }
    gs::console::log(gs::String("Is properly sorted: ") + isSorted);
  };
  const std::function<void()> testEmptyTree = [&]() -> void {
    gs::console::log(gs::String("\n=== Empty Tree Test ==="));
    gs::BinarySearchTree* tree = gs::gc::Allocator::alloc<gs::BinarySearchTree>();
    gs::console::log(gs::String("Empty tree count: ") + tree->count());
    gs::console::log(gs::String("Empty tree height: ") + tree->height());
    gs::console::log(gs::String("Search in empty tree: ") + tree->search(42));
    const auto min = tree->findMin();
    gs::console::log(gs::String("Min in empty tree: ") + min);
    const auto max = tree->findMax();
    gs::console::log(gs::String("Max in empty tree: ") + max);
  };
  const std::function<void()> runBSTTests = [&]() -> void {
    testBasicOperations();
    testSearch();
    testTraversals();
    testLargeTree();
    testEmptyTree();
    gs::console::log(gs::String("\n=== All tests completed ==="));
  };
  runBSTTests();
  return 0;
}