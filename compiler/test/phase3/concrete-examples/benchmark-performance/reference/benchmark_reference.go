package main

import (
	"fmt"
	"strings"
	"time"
)

// Fibonacci benchmark
func fibonacci(n int) int {
	if n <= 1 {
		return n
	}
	return fibonacci(n-1) + fibonacci(n-2)
}

// Array operations benchmark
func arrayOperations(n int) int {
	arr := make([]int, n)
	for i := 0; i < n; i++ {
		arr[i] = i
	}
	sum := 0
	for i := 0; i < n; i++ {
		sum += arr[i]
	}
	return sum
}

// Binary search benchmark
func binarySearch(arr []int, target int) int {
	left := 0
	right := len(arr) - 1
	
	for left <= right {
		mid := (left + right) / 2
		if arr[mid] == target {
			return mid
		}
		if arr[mid] < target {
			left = mid + 1
		} else {
			right = mid - 1
		}
	}
	return -1
}

func binarySearchBenchmark(n int) int {
	arr := make([]int, 10000)
	for i := 0; i < 10000; i++ {
		arr[i] = i
	}
	
	found := 0
	for i := 0; i < n; i++ {
		target := i % 10000
		if binarySearch(arr, target) != -1 {
			found++
		}
	}
	return found
}

// Bubble sort benchmark
func bubbleSort(arr []int) {
	n := len(arr)
	for i := 0; i < n-1; i++ {
		for j := 0; j < n-i-1; j++ {
			if arr[j] > arr[j+1] {
				arr[j], arr[j+1] = arr[j+1], arr[j]
			}
		}
	}
}

func bubbleSortBenchmark(n int) int {
	arr := make([]int, n)
	for i := 0; i < n; i++ {
		arr[i] = n - i
	}
	bubbleSort(arr)
	return arr[0]
}

// HashMap benchmark
func hashMapBenchmark(n int) int {
	m := make(map[string]int)
	
	for i := 0; i < n; i++ {
		key := fmt.Sprintf("key%d", i)
		m[key] = i
	}
	
	sum := 0
	for i := 0; i < n; i++ {
		key := fmt.Sprintf("key%d", i)
		if val, ok := m[key]; ok {
			sum += val
		}
	}
	return sum
}

// String operations benchmark
func stringOperations(n int) int {
	result := ""
	for i := 0; i < n; i++ {
		result += "a"
		if len(result) > 1000 {
			result = result[1:]
		}
	}
	
	count := 0
	for i := 0; i < n; i++ {
		s := fmt.Sprintf("test%d", i)
		if strings.Contains(s, "test") {
			count++
		}
	}
	
	for i := 0; i < n; i++ {
		s := "hello world"
		if idx := strings.Index(s, "world"); idx != -1 {
			count += idx
		}
	}
	
	return count
}

func benchmark(name string, fn func() int) {
	start := time.Now()
	result := fn()
	elapsed := time.Since(start).Milliseconds()
	fmt.Printf("%s: %dms (result: %d)\n", name, elapsed, result)
}

func main() {
	fmt.Println("Go Performance Benchmarks")
	fmt.Println("==========================")
	
	start := time.Now()
	
	benchmark("Fibonacci(40)", func() int {
		return fibonacci(40)
	})
	
	benchmark("Array Operations (5M)", func() int {
		return arrayOperations(5000000)
	})
	
	benchmark("Binary Search (1M)", func() int {
		return binarySearchBenchmark(1000000)
	})
	
	benchmark("Bubble Sort (10k)", func() int {
		return bubbleSortBenchmark(10000)
	})
	
	benchmark("HashMap (500k)", func() int {
		return hashMapBenchmark(500000)
	})
	
	benchmark("String Operations (2M)", func() int {
		return stringOperations(2000000)
	})
	
	total := time.Since(start).Milliseconds()
	fmt.Printf("\nTotal time: %dms\n", total)
}
