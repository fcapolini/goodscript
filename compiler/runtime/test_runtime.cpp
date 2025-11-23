#include "gs_runtime.hpp"
#include <cassert>
#include <iostream>

/**
 * Test suite for GoodScript runtime library
 * 
 * Compile with:
 *   g++ -std=c++20 -I. test_runtime.cpp -o test_runtime
 *   ./test_runtime
 */

void test_string() {
  std::cout << "Testing gs::String..." << std::endl;
  
  // Basic construction and length
  gs::String str = "Hello, World!";
  assert(str.length() == 13);
  
  // charAt
  assert(str.charAt(0).str() == "H");
  assert(str.charAt(7).str() == "W");
  
  // indexOf
  assert(str.indexOf(gs::String("World")) == 7);
  assert(str.indexOf(gs::String("xyz")) == -1);
  
  // substring
  gs::String sub = str.substring(7, 12);
  assert(sub.str() == "World");
  
  // slice
  gs::String slice = str.slice(0, 5);
  assert(slice.str() == "Hello");
  
  // toUpperCase / toLowerCase
  assert(str.toUpperCase().str() == "HELLO, WORLD!");
  assert(str.toLowerCase().str() == "hello, world!");
  
  // startsWith / endsWith
  assert(str.startsWith(gs::String("Hello")));
  assert(str.endsWith(gs::String("!")));
  assert(!str.startsWith(gs::String("Goodbye")));
  
  // includes
  assert(str.includes(gs::String("World")));
  assert(!str.includes(gs::String("xyz")));
  
  // trim
  gs::String padded = "  spaces  ";
  assert(padded.trim().str() == "spaces");
  
  // repeat
  gs::String ha = "ha";
  assert(ha.repeat(3).str() == "hahaha");
  
  // concat / operator+
  gs::String a = "Hello";
  gs::String b = "World";
  assert(a.concat(gs::String(" ")).concat(b).str() == "Hello World");
  assert((a + gs::String(" ") + b).str() == "Hello World");
  
  // Static method
  assert(gs::String::fromCharCode(65).str() == "A");
  
  std::cout << "  ✓ All string tests passed" << std::endl;
}

void test_array() {
  std::cout << "Testing gs::Array..." << std::endl;
  
  // Basic construction and length
  gs::Array<int> arr = {1, 2, 3, 4, 5};
  assert(arr.length() == 5);
  
  // push / pop
  arr.push(6);
  assert(arr.length() == 6);
  assert(arr[5] == 6);
  
  auto popped = arr.pop();
  assert(popped.has_value());
  assert(popped.value() == 6);
  assert(arr.length() == 5);
  
  // shift / unshift
  auto shifted = arr.shift();
  assert(shifted.has_value());
  assert(shifted.value() == 1);
  assert(arr.length() == 4);
  
  arr.unshift(1);
  assert(arr[0] == 1);
  assert(arr.length() == 5);
  
  // slice
  auto slice = arr.slice(1, 4);
  assert(slice.length() == 3);
  assert(slice[0] == 2);
  assert(slice[1] == 3);
  assert(slice[2] == 4);
  
  // map
  auto doubled = arr.map([](int x) { return x * 2; });
  assert(doubled.length() == 5);
  assert(doubled[0] == 2);
  assert(doubled[4] == 10);
  
  // filter
  auto evens = arr.filter([](int x) { return x % 2 == 0; });
  assert(evens.length() == 2);
  assert(evens[0] == 2);
  assert(evens[1] == 4);
  
  // reduce
  int sum = arr.reduce([](int acc, int x) { return acc + x; }, 0);
  assert(sum == 15);
  
  // indexOf
  assert(arr.indexOf(3) == 2);
  assert(arr.indexOf(99) == -1);
  
  // includes
  assert(arr.includes(3));
  assert(!arr.includes(99));
  
  // find
  auto found = arr.find([](int x) { return x > 3; });
  assert(found.has_value());
  assert(found.value() == 4);
  
  // findIndex
  int idx = arr.findIndex([](int x) { return x > 3; });
  assert(idx == 3);
  
  // reverse
  gs::Array<int> arr2 = {1, 2, 3};
  arr2.reverse();
  assert(arr2[0] == 3);
  assert(arr2[1] == 2);
  assert(arr2[2] == 1);
  
  // sort
  gs::Array<int> arr3 = {3, 1, 2};
  arr3.sort();
  assert(arr3[0] == 1);
  assert(arr3[1] == 2);
  assert(arr3[2] == 3);
  
  // join
  gs::Array<gs::String> words = {gs::String("Hello"), gs::String("World")};
  gs::String joined = words.join(gs::String(" "));
  assert(joined.str() == "Hello World");
  
  std::cout << "  ✓ All array tests passed" << std::endl;
}

void test_map() {
  std::cout << "Testing gs::Map..." << std::endl;
  
  gs::Map<gs::String, int> map;
  
  // set / get / has
  map.set(gs::String("one"), 1);
  map.set(gs::String("two"), 2);
  assert(map.size() == 2);
  
  auto val = map.get(gs::String("one"));
  assert(val.has_value());
  assert(val.value() == 1);
  
  assert(map.has(gs::String("one")));
  assert(!map.has(gs::String("three")));
  
  // delete
  bool deleted = map.delete_(gs::String("one"));
  assert(deleted);
  assert(map.size() == 1);
  assert(!map.has(gs::String("one")));
  
  // clear
  map.clear();
  assert(map.size() == 0);
  
  std::cout << "  ✓ All map tests passed" << std::endl;
}

void test_set() {
  std::cout << "Testing gs::Set..." << std::endl;
  
  gs::Set<int> set;
  
  // add / has
  set.add(1);
  set.add(2);
  set.add(3);
  assert(set.size() == 3);
  
  assert(set.has(2));
  assert(!set.has(99));
  
  // delete
  bool deleted = set.delete_(2);
  assert(deleted);
  assert(set.size() == 2);
  assert(!set.has(2));
  
  // clear
  set.clear();
  assert(set.size() == 0);
  
  std::cout << "  ✓ All set tests passed" << std::endl;
}

void test_json() {
  std::cout << "Testing gs::JSON..." << std::endl;
  
  // stringify numbers
  assert(gs::JSON::stringify(42).str() == "42");
  assert(gs::JSON::stringify(3.14).str() == "3.14");
  
  // stringify booleans
  assert(gs::JSON::stringify(true).str() == "true");
  assert(gs::JSON::stringify(false).str() == "false");
  
  // stringify strings
  assert(gs::JSON::stringify(gs::String("hello")).str() == "\"hello\"");
  
  // stringify arrays
  gs::Array<int> arr = {1, 2, 3};
  assert(gs::JSON::stringify(arr).str() == "[1,2,3]");
  
  gs::Array<gs::String> strs = {gs::String("a"), gs::String("b")};
  assert(gs::JSON::stringify(strs).str() == "[\"a\",\"b\"]");
  
  std::cout << "  ✓ All JSON tests passed" << std::endl;
}

void test_console() {
  std::cout << "Testing gs::console..." << std::endl;
  
  // Just make sure these compile and run without crashing
  gs::console::log(gs::String("Hello from console"));
  gs::console::log(gs::String("Number:"), 42);
  gs::console::log(gs::String("Multiple"), gs::String("arguments"), 123);
  gs::console::error(gs::String("This is an error"));
  gs::console::warn(gs::String("This is a warning"));
  
  std::cout << "  ✓ All console tests passed" << std::endl;
}

int main() {
  std::cout << "\n=== GoodScript Runtime Library Tests ===\n" << std::endl;
  
  test_string();
  test_array();
  test_map();
  test_set();
  test_json();
  test_console();
  
  std::cout << "\n✓ All tests passed!\n" << std::endl;
  
  return 0;
}
