/**
 * Array Optimization Benchmark
 * 
 * Demonstrates performance improvements from:
 * - 1.5x growth factor (vs 2x)
 * - memcpy for POD types
 * - Smarter initial capacity
 */

#include "../runtime/gc/allocator.hpp"
#include "../runtime/gc/array.hpp"
#include <iostream>
#include <chrono>
#include <cassert>

using namespace gs::gc;
using namespace gs;
using namespace std::chrono;

void benchmark_growth_factor() {
    std::cout << "Benchmark: Array Growth Factor (1.5x vs 2x)\n";
    
    const int ITERATIONS = 1000000;
    
    // Measure total memory allocated with 1.5x growth
    {
        size_t total_allocated = 0;
        size_t capacity = 0;
        
        for (int i = 0; i < ITERATIONS; i++) {
            if (i >= capacity) {
                size_t old_capacity = capacity;
                capacity = (capacity == 0) ? 8 : static_cast<size_t>(capacity * 1.5);
                total_allocated += capacity * sizeof(double);
            }
        }
        
        std::cout << "  1.5x growth: " << (total_allocated / 1024 / 1024) << " MB allocated\n";
        std::cout << "              Final capacity: " << capacity << " elements\n";
        std::cout << "              Memory efficiency: " 
                  << (static_cast<double>(ITERATIONS) / capacity * 100) << "%\n";
    }
    
    // Compare with 2x growth
    {
        size_t total_allocated = 0;
        size_t capacity = 0;
        
        for (int i = 0; i < ITERATIONS; i++) {
            if (i >= capacity) {
                size_t old_capacity = capacity;
                capacity = (capacity == 0) ? 8 : capacity * 2;
                total_allocated += capacity * sizeof(double);
            }
        }
        
        std::cout << "  2x growth:   " << (total_allocated / 1024 / 1024) << " MB allocated\n";
        std::cout << "              Final capacity: " << capacity << " elements\n";
        std::cout << "              Memory efficiency: " 
                  << (static_cast<double>(ITERATIONS) / capacity * 100) << "%\n";
    }
}

void benchmark_push_performance() {
    std::cout << "\nBenchmark: Push Performance\n";
    
    const int ITERATIONS = 100000;
    Runtime runtime;
    
    {
        Array<double> arr;
        auto start = high_resolution_clock::now();
        
        for (int i = 0; i < ITERATIONS; i++) {
            arr.push(i * 1.5);
        }
        
        auto end = high_resolution_clock::now();
        auto duration = duration_cast<microseconds>(end - start).count();
        
        std::cout << "  Double (POD):  " << duration << " μs ("
                  << (duration * 1000.0 / ITERATIONS) << " ns/push)\n";
        std::cout << "                Final length: " << arr.length() << "\n";
    }
    
    {
        Array<String> arr;
        auto start = high_resolution_clock::now();
        
        for (int i = 0; i < ITERATIONS; i++) {
            arr.push(String("test"));
        }
        
        auto end = high_resolution_clock::now();
        auto duration = duration_cast<microseconds>(end - start).count();
        
        std::cout << "  String (non-POD): " << duration << " μs ("
                  << (duration * 1000.0 / ITERATIONS) << " ns/push)\n";
        std::cout << "                   Final length: " << arr.length() << "\n";
    }
}

void benchmark_shift_unshift() {
    std::cout << "\nBenchmark: Shift/Unshift with memmove\n";
    
    const int ARRAY_SIZE = 10000;
    const int ITERATIONS = 1000;
    Runtime runtime;
    
    // POD type (should use memmove)
    {
        Array<int> arr;
        for (int i = 0; i < ARRAY_SIZE; i++) {
            arr.push(i);
        }
        
        auto start = high_resolution_clock::now();
        for (int i = 0; i < ITERATIONS; i++) {
            arr.unshift(i);
        }
        auto end = high_resolution_clock::now();
        auto unshift_duration = duration_cast<microseconds>(end - start).count();
        
        start = high_resolution_clock::now();
        for (int i = 0; i < ITERATIONS; i++) {
            arr.shift();
        }
        end = high_resolution_clock::now();
        auto shift_duration = duration_cast<microseconds>(end - start).count();
        
        std::cout << "  Int (POD with memmove):\n";
        std::cout << "    unshift: " << unshift_duration << " μs ("
                  << (unshift_duration * 1000.0 / ITERATIONS) << " ns/op)\n";
        std::cout << "    shift:   " << shift_duration << " μs ("
                  << (shift_duration * 1000.0 / ITERATIONS) << " ns/op)\n";
    }
}

void benchmark_memory_efficiency() {
    std::cout << "\nBenchmark: Memory Efficiency\n";
    
    Runtime runtime;
    
    // Test with different sizes
    for (int size : {100, 1000, 10000, 100000}) {
        Array<double> arr;
        
        for (int i = 0; i < size; i++) {
            arr.push(i * 1.0);
        }
        
        // Estimate allocated memory
        size_t used = size * sizeof(double);
        size_t capacity = arr.length();  // This is a proxy
        
        // Calculate theoretical capacity with 1.5x growth
        size_t theoretical_capacity = 8;
        while (theoretical_capacity < size) {
            theoretical_capacity = static_cast<size_t>(theoretical_capacity * 1.5);
        }
        
        double efficiency = static_cast<double>(size) / theoretical_capacity * 100;
        
        std::cout << "  Size " << size << ": "
                  << "capacity ~" << theoretical_capacity
                  << ", efficiency " << efficiency << "%\n";
    }
}

void test_correctness() {
    std::cout << "\nTest: Correctness\n";
    
    Runtime runtime;
    
    // Test 1: Basic push/pop
    {
        Array<int> arr;
        for (int i = 0; i < 100; i++) {
            arr.push(i);
        }
        assert(arr.length() == 100);
        assert(arr[50] == 50);
        
        int val = arr.pop();
        assert(val == 99);
        assert(arr.length() == 99);
        
        std::cout << "  ✓ Push/pop works correctly\n";
    }
    
    // Test 2: Shift/unshift
    {
        Array<int> arr;
        for (int i = 0; i < 10; i++) {
            arr.push(i);
        }
        
        arr.unshift(100);
        assert(arr[0] == 100);
        assert(arr[1] == 0);
        
        int val = arr.shift();
        assert(val == 100);
        assert(arr[0] == 0);
        
        std::cout << "  ✓ Shift/unshift works correctly\n";
    }
    
    // Test 3: Auto-resize
    {
        Array<int> arr;
        arr[1000] = 42;  // Should auto-resize
        assert(arr[1000] == 42);
        assert(arr.length() == 1001);
        
        std::cout << "  ✓ Auto-resize works correctly\n";
    }
    
    // Test 4: POD vs non-POD
    {
        Array<double> pod_arr;
        Array<String> non_pod_arr;
        
        for (int i = 0; i < 100; i++) {
            pod_arr.push(i * 1.5);
            non_pod_arr.push(String("test"));
        }
        
        assert(pod_arr.length() == 100);
        assert(non_pod_arr.length() == 100);
        
        std::cout << "  ✓ POD and non-POD types work correctly\n";
    }
}

int main() {
    std::cout << "=== Array Optimization Benchmark ===\n\n";
    
    test_correctness();
    benchmark_growth_factor();
    benchmark_push_performance();
    benchmark_shift_unshift();
    benchmark_memory_efficiency();
    
    std::cout << "\n=== Benchmarks Complete ===\n";
    
    return 0;
}
