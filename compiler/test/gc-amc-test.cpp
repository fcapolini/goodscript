/**
 * Test AMC (Automatic Mostly-Copying) GC Allocator
 * 
 * This test verifies that the precise generational GC allocator works correctly.
 * Compile with: -DGS_GC_USE_AMC=1
 */

#include <iostream>
#include <cassert>

#define GS_GC_USE_AMC 1
#include "../../runtime/gc/allocator.hpp"
#include "../../runtime/gc/string.hpp"

using namespace gs;

// Test class with pointers
class Node {
public:
    int value;
    Node* left;
    Node* right;
    
    Node(int v) : value(v), left(nullptr), right(nullptr) {}
};

void test_basic_allocation() {
    std::cout << "Test 1: Basic allocation... ";
    
    Node* node = gc::Allocator::alloc<Node>(42);
    assert(node != nullptr);
    assert(node->value == 42);
    assert(node->left == nullptr);
    assert(node->right == nullptr);
    
    std::cout << "PASS\n";
}

void test_tree_structure() {
    std::cout << "Test 2: Tree structure with pointers... ";
    
    Node* root = gc::Allocator::alloc<Node>(10);
    root->left = gc::Allocator::alloc<Node>(5);
    root->right = gc::Allocator::alloc<Node>(15);
    
    assert(root->value == 10);
    assert(root->left->value == 5);
    assert(root->right->value == 15);
    
    std::cout << "PASS\n";
}

void test_string_allocation() {
    std::cout << "Test 3: String allocation... ";
    
    String* s1 = gc::Allocator::alloc<String>("Hello");
    String* s2 = gc::Allocator::alloc<String>("World");
    
    assert(s1->length() == 5);
    assert(s2->length() == 5);
    
    std::cout << "PASS\n";
}

void test_array_allocation() {
    std::cout << "Test 4: Array allocation... ";
    
    Node* nodes = gc::Allocator::alloc_array<Node>(10);
    assert(nodes != nullptr);
    
    // Initialize array elements
    for (int i = 0; i < 10; ++i) {
        nodes[i].value = i * 10;
    }
    
    // Verify values
    for (int i = 0; i < 10; ++i) {
        assert(nodes[i].value == i * 10);
    }
    
    std::cout << "PASS\n";
}

void test_gc_collection() {
    std::cout << "Test 5: GC collection... ";
    
    size_t before = gc::Allocator::committed_memory();
    
    // Allocate many objects
    for (int i = 0; i < 1000; ++i) {
        gc::Allocator::alloc<Node>(i);
    }
    
    size_t after_alloc = gc::Allocator::committed_memory();
    assert(after_alloc > before);
    
    // Force collection
    gc::Allocator::collect();
    
    // Memory should still be valid (objects not freed because they're reachable from stack)
    size_t after_gc = gc::Allocator::committed_memory();
    
    std::cout << "PASS (before: " << before << ", after alloc: " << after_alloc 
              << ", after GC: " << after_gc << ")\n";
}

void test_deep_tree() {
    std::cout << "Test 6: Deep tree structure... ";
    
    // Create a deep tree to test generational GC
    Node* root = gc::Allocator::alloc<Node>(0);
    Node* current = root;
    
    for (int i = 1; i < 100; ++i) {
        current->left = gc::Allocator::alloc<Node>(i);
        current = current->left;
    }
    
    // Traverse tree to verify
    current = root;
    int count = 0;
    while (current != nullptr) {
        assert(current->value == count);
        current = current->left;
        count++;
    }
    
    assert(count == 100);
    
    std::cout << "PASS\n";
}

int main() {
    std::cout << "=== Testing AMC (Precise Generational) GC Allocator ===\n\n";
    
    // Initialize GC
    gc::Runtime runtime;
    
    try {
        test_basic_allocation();
        test_tree_structure();
        test_string_allocation();
        test_array_allocation();
        test_gc_collection();
        test_deep_tree();
        
        std::cout << "\n=== All AMC GC tests passed! ===\n";
        
        // Print memory stats
        std::cout << "\nMemory Stats:\n";
        std::cout << "  Committed: " << gc::Allocator::committed_memory() << " bytes\n";
        std::cout << "  Reserved:  " << gc::Allocator::reserved_memory() << " bytes\n";
        
        return 0;
    } catch (const std::exception& e) {
        std::cerr << "\nERROR: " << e.what() << "\n";
        return 1;
    }
}
