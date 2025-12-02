/**
 * Bump Allocator Test Suite
 * 
 * Validates bump allocator performance and correctness.
 */

#include "../runtime/gc/allocator-bump.hpp"
#include "../runtime/gc/string.hpp"
#include <iostream>
#include <chrono>
#include <cassert>

using namespace gs::gc;
using namespace std::chrono;

// Test structure
struct TestObject {
    int value;
    double data;
    
    TestObject() : value(0), data(0.0) {}
    TestObject(int v, double d) : value(v), data(d) {}
};

void test_basic_allocation() {
    std::cout << "Test: Basic allocation... ";
    
    BumpAllocator bump(4096);
    
    // Allocate single object
    auto* obj1 = bump.alloc<TestObject>(42, 3.14);
    assert(obj1->value == 42);
    assert(obj1->data == 3.14);
    
    // Allocate array
    auto* arr = bump.alloc_array<int>(10);
    for (int i = 0; i < 10; i++) {
        arr[i] = i * 2;
    }
    assert(arr[5] == 10);
    
    std::cout << "PASS (used: " << bump.used() << " bytes)\n";
}

void test_arena_exhaustion() {
    std::cout << "Test: Arena exhaustion fallback... ";
    
    BumpAllocator bump(1024);  // Small arena
    
    // Fill arena
    for (int i = 0; i < 100; i++) {
        auto* obj = bump.alloc<TestObject>(i, i * 1.5);
        assert(obj->value == i);
    }
    
    // Should still work (falls back to MPS)
    auto* overflow = bump.alloc<TestObject>(999, 999.9);
    assert(overflow->value == 999);
    
    std::cout << "PASS (utilization: " << (bump.utilization() * 100) << "%)\n";
}

void test_reset() {
    std::cout << "Test: Arena reset... ";
    
    BumpAllocator bump(4096);
    
    // Allocate some objects
    for (int i = 0; i < 50; i++) {
        bump.alloc<TestObject>(i, i * 2.0);
    }
    
    size_t used_before = bump.used();
    assert(used_before > 0);
    
    // Reset arena
    bump.reset();
    
    assert(bump.used() == 0);
    assert(bump.available() == bump.capacity());
    
    // Can allocate again
    auto* obj = bump.alloc<TestObject>(1, 1.0);
    assert(obj->value == 1);
    
    std::cout << "PASS (reset " << used_before << " bytes)\n";
}

void test_scoped_allocator() {
    std::cout << "Test: Scoped bump allocator... ";
    
    {
        ScopedBumpAllocator scoped(8192);
        
        for (int i = 0; i < 100; i++) {
            auto* obj = scoped.alloc<TestObject>(i, i * 3.0);
            assert(obj->value == i);
        }
        
        // Auto-reset on scope exit
    }
    
    std::cout << "PASS\n";
}

void test_thread_local_allocator() {
    std::cout << "Test: Thread-local allocator... ";
    
    // Use thread-local allocator
    auto* obj1 = ThreadBumpAllocator::alloc<TestObject>(10, 20.0);
    auto* obj2 = ThreadBumpAllocator::alloc<TestObject>(30, 40.0);
    
    assert(obj1->value == 10);
    assert(obj2->value == 30);
    
    size_t used = ThreadBumpAllocator::used();
    assert(used > 0);
    
    ThreadBumpAllocator::reset();
    assert(ThreadBumpAllocator::used() == 0);
    
    std::cout << "PASS\n";
}

void benchmark_allocation_speed() {
    std::cout << "\nBenchmark: Allocation speed comparison\n";
    
    const int ITERATIONS = 100000;
    
    // Benchmark 1: MPS allocator (baseline)
    {
        auto start = high_resolution_clock::now();
        for (int i = 0; i < ITERATIONS; i++) {
            auto* obj = Allocator::alloc<TestObject>(i, i * 1.5);
            (void)obj;  // Prevent optimization
        }
        auto end = high_resolution_clock::now();
        auto duration = duration_cast<microseconds>(end - start).count();
        
        std::cout << "  MPS allocator:  " << duration << " μs ("
                  << (duration * 1000.0 / ITERATIONS) << " ns/alloc)\n";
    }
    
    // Benchmark 2: Bump allocator
    {
        BumpAllocator bump(10 * 1024 * 1024);  // 10MB arena
        
        auto start = high_resolution_clock::now();
        for (int i = 0; i < ITERATIONS; i++) {
            auto* obj = bump.alloc<TestObject>(i, i * 1.5);
            (void)obj;
        }
        auto end = high_resolution_clock::now();
        auto duration = duration_cast<microseconds>(end - start).count();
        
        std::cout << "  Bump allocator: " << duration << " μs ("
                  << (duration * 1000.0 / ITERATIONS) << " ns/alloc)\n";
        std::cout << "  Final utilization: " << (bump.utilization() * 100) << "%\n";
    }
    
    // Benchmark 3: Thread-local bump
    {
        ThreadBumpAllocator::clear();
        
        auto start = high_resolution_clock::now();
        for (int i = 0; i < ITERATIONS; i++) {
            auto* obj = ThreadBumpAllocator::alloc<TestObject>(i, i * 1.5);
            (void)obj;
        }
        auto end = high_resolution_clock::now();
        auto duration = duration_cast<microseconds>(end - start).count();
        
        std::cout << "  Thread-local:   " << duration << " μs ("
                  << (duration * 1000.0 / ITERATIONS) << " ns/alloc)\n";
    }
}

void benchmark_string_allocation() {
    std::cout << "\nBenchmark: String allocation patterns\n";
    
    const int ITERATIONS = 10000;
    
    // Pattern: Many small temporary strings
    {
        ScopedBumpAllocator scoped(1024 * 1024);  // 1MB
        
        auto start = high_resolution_clock::now();
        for (int i = 0; i < ITERATIONS; i++) {
            auto* s1 = scoped.alloc<gs::String>("temp");
            auto* s2 = scoped.alloc<gs::String>("string");
            auto* s3 = scoped.alloc<gs::String>("allocation");
            (void)s1; (void)s2; (void)s3;
        }
        auto end = high_resolution_clock::now();
        auto duration = duration_cast<microseconds>(end - start).count();
        
        std::cout << "  Small strings: " << duration << " μs\n";
        std::cout << "  Utilization:   " << (scoped.utilization() * 100) << "%\n";
    }
}

int main() {
    std::cout << "=== Bump Allocator Test Suite ===\n\n";
    
    // Initialize MPS
    Runtime runtime;
    
    // Run tests
    test_basic_allocation();
    test_arena_exhaustion();
    test_reset();
    test_scoped_allocator();
    test_thread_local_allocator();
    
    // Run benchmarks
    benchmark_allocation_speed();
    benchmark_string_allocation();
    
    std::cout << "\n=== All Tests Passed ===\n";
    
    return 0;
}
