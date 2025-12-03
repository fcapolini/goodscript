/**
 * Reference C++ Implementation of Performance Benchmarks
 * 
 * Hand-written idiomatic C++ using modern features and smart pointers.
 * This serves as the "upper limit" for what our codegen could theoretically achieve.
 * 
 * Compile with:
 *   g++ -std=c++20 -O3 -o benchmark_reference benchmark_reference.cpp
 *   clang++ -std=c++20 -O3 -o benchmark_reference benchmark_reference.cpp
 */

#include <iostream>
#include <vector>
#include <string>
#include <unordered_map>
#include <chrono>
#include <sstream>
#include <algorithm>

// Timing utility
inline int64_t now() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()
    ).count();
}

// Benchmark 1: Recursive Fibonacci
int64_t fibonacci(int n) {
    if (n <= 1) {
        return n;
    }
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int64_t benchFibonacci(int n) {
    const auto start = now();
    const auto result = fibonacci(n);
    const auto elapsed = now() - start;
    std::cout << "Fibonacci(" << n << ") = " << result << ", time: " << elapsed << "ms\n";
    return elapsed;
}

// Benchmark 2: Array Operations
int64_t benchArrayOps(int size) {
    const auto start = now();
    
    // Use std::vector with reserve for optimal performance
    std::vector<int64_t> arr;
    arr.reserve(size);
    for (int i = 0; i < size; i++) {
        arr.push_back(i);
    }
    
    int64_t sum = 0;
    for (size_t i = 0; i < arr.size(); i++) {
        sum += arr[i];
    }
    
    std::vector<int64_t> filtered;
    filtered.reserve(size / 2);  // Approximate
    for (size_t i = 0; i < arr.size(); i++) {
        if (arr[i] % 2 == 0) {
            filtered.push_back(arr[i]);
        }
    }
    
    const auto elapsed = now() - start;
    std::cout << "Array ops (" << size << " elements): sum=" << sum 
              << ", filtered=" << filtered.size() << ", time: " << elapsed << "ms\n";
    return elapsed;
}

// Benchmark 3: Binary Search
int64_t binarySearch(const std::vector<int64_t>& arr, int64_t target) {
    int64_t left = 0;
    int64_t right = static_cast<int64_t>(arr.size()) - 1;
    
    while (left <= right) {
        const int64_t mid = left + ((right - left) / 2);
        const int64_t midVal = arr[mid];
        
        if (midVal == target) {
            return mid;
        } else if (midVal < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    
    return -1;
}

int64_t benchBinarySearch(int size, int searches) {
    const auto start = now();
    
    // Create sorted array
    std::vector<int64_t> arr;
    arr.reserve(size);
    for (int i = 0; i < size; i++) {
        arr.push_back(i);
    }
    
    // Perform multiple searches
    int found = 0;
    for (int i = 0; i < searches; i++) {
        const int64_t target = i % size;
        const int64_t idx = binarySearch(arr, target);
        if (idx >= 0) {
            found++;
        }
    }
    
    const auto elapsed = now() - start;
    std::cout << "Binary search (" << searches << " searches in " << size 
              << " elements): found=" << found << ", time: " << elapsed << "ms\n";
    return elapsed;
}

// Benchmark 4: Bubble Sort (optimized version)
void bubbleSortOptimized(std::vector<double>& arr) {
    const size_t n = arr.size();
    
    for (size_t i = 0; i < n - 1; i++) {
        for (size_t j = 0; j < n - i - 1; j++) {
            // Direct array access - bounds are provably safe
            const double val1 = arr[j];
            const double val2 = arr[j + 1];
            if (val1 > val2) {
                arr[j] = val2;
                arr[j + 1] = val1;
            }
        }
    }
}

int64_t benchBubbleSort(int size) {
    const auto start = now();
    
    // Create reverse-sorted array
    std::vector<double> arr;
    arr.reserve(size);
    for (int i = size - 1; i >= 0; i--) {
        arr.push_back(static_cast<double>(i));
    }
    
    bubbleSortOptimized(arr);
    
    const auto elapsed = now() - start;
    std::cout << "Bubble sort (" << size << " elements): first=" << arr[0] 
              << ", last=" << arr[arr.size() - 1] << ", time: " << elapsed << "ms\n";
    return elapsed;
}

// Benchmark 5: HashMap Operations
int64_t benchHashMap(int operations) {
    const auto start = now();
    
    // Use unordered_map with reserve hint
    std::unordered_map<std::string, int64_t> map;
    map.reserve(operations);
    
    // Insert operations
    for (int i = 0; i < operations; i++) {
        const std::string key = "key" + std::to_string(i);
        map[key] = i;
    }
    
    // Lookup operations
    int64_t sum = 0;
    for (int i = 0; i < operations; i++) {
        const std::string key = "key" + std::to_string(i);
        auto it = map.find(key);
        if (it != map.end()) {
            sum += it->second;
        }
    }
    
    // Delete operations
    int deleted = 0;
    for (int i = 0; i < operations; i += 2) {
        const std::string key = "key" + std::to_string(i);
        if (map.erase(key) > 0) {
            deleted++;
        }
    }
    
    const auto elapsed = now() - start;
    std::cout << "HashMap ops (" << operations << " operations): sum=" << sum 
              << ", deleted=" << deleted << ", time: " << elapsed << "ms\n";
    return elapsed;
}

// Benchmark 6: String Manipulation
int64_t benchStringOps(int iterations) {
    const auto start = now();
    
    // Test 1: String building with concatenation
    std::string result;
    result.reserve((iterations / 1000) * 4);  // Pre-allocate
    for (int i = 0; i < iterations / 1000; i++) {
        result += "test";
    }
    
    // Test 2: Substring operations
    const std::string base = "The quick brown fox jumps over the lazy dog";
    int substringCount = 0;
    for (int i = 0; i < iterations / 100; i++) {
        const std::string sub = base.substr(4, 15);  // "quick brown fox"
        if (sub.length() == 15) {
            substringCount++;
        }
    }
    
    // Test 3: Character scanning
    std::string text;
    for (int i = 0; i < 50; i++) {
        text += "abcdefghijklmnopqrstuvwxyz0123456789";
    }
    int charCount = 0;
    const char aCode = 'a';
    const char zCode = 'z';
    for (int i = 0; i < iterations / 10; i++) {
        for (size_t j = 0; j < text.length(); j++) {
            const char code = text[j];
            if (code >= aCode && code <= zCode) {
                charCount++;
            }
        }
    }
    
    // Test 4: String searching
    std::string searchText;
    for (int i = 0; i < 10; i++) {
        searchText += "Lorem ipsum dolor sit amet consectetur adipiscing elit";
    }
    int findCount = 0;
    for (int i = 0; i < iterations / 100; i++) {
        if (searchText.find("dolor") != std::string::npos) {
            findCount++;
        }
        if (searchText.find("missing") == std::string::npos) {
            findCount++;
        }
    }
    
    const auto elapsed = now() - start;
    std::cout << "String ops (" << iterations << " iterations): built=" << result.length()
              << ", substrings=" << substringCount << ", chars=" << charCount 
              << ", searches=" << findCount << ", time: " << elapsed << "ms\n";
    return elapsed;
}

// Main benchmark runner
int main() {
    std::cout << "=== C++ Reference Performance Benchmark Suite ===\n";
    std::cout << "(Hand-written idiomatic C++ with smart pointers and modern features)\n";
    std::cout << "\n";

    std::cout << "--- Benchmark 1: Recursive Fibonacci ---\n";
    const auto fibTime = benchFibonacci(40);

    std::cout << "\n";
    std::cout << "--- Benchmark 2: Array Operations ---\n";
    const auto arrayTime = benchArrayOps(5000000);

    std::cout << "\n";
    std::cout << "--- Benchmark 3: Binary Search ---\n";
    const auto binarySearchTime = benchBinarySearch(1000000, 1000000);

    std::cout << "\n";
    std::cout << "--- Benchmark 4: Bubble Sort ---\n";
    const auto bubbleSortTime = benchBubbleSort(10000);

    std::cout << "\n";
    std::cout << "--- Benchmark 5: HashMap Operations ---\n";
    const auto hashMapTime = benchHashMap(500000);

    std::cout << "\n";
    std::cout << "--- Benchmark 6: String Manipulation ---\n";
    const auto stringTime = benchStringOps(2000000);

    std::cout << "\n";
    std::cout << "=== Summary ===\n";
    const auto totalTime = fibTime + arrayTime + binarySearchTime + bubbleSortTime + hashMapTime + stringTime;
    std::cout << "Total time: " << totalTime << "ms\n";

    return 0;
}
