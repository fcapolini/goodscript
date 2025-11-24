/**
 * Test file for gs::RegExp and regex-related String methods
 * 
 * Compile with:
 *   g++ -std=c++20 -o test_regexp test_regexp.cpp -lpcre2-8
 * 
 * Or with clang:
 *   clang++ -std=c++20 -o test_regexp test_regexp.cpp -lpcre2-8
 */

#include <iostream>
#include <cassert>
#include "gs_runtime.hpp"

void test_regexp_basic() {
  std::cout << "Testing RegExp basic functionality..." << std::endl;
  
  // Basic pattern matching
  gs::RegExp pattern("hello");
  assert(pattern.test("hello world") == true);
  assert(pattern.test("goodbye") == false);
  
  // Case-insensitive flag
  gs::RegExp caseInsensitive("HELLO", "i");
  assert(caseInsensitive.test("hello world") == true);
  assert(caseInsensitive.test("HELLO world") == true);
  
  // Global flag
  gs::RegExp global("\\d+", "g");
  assert(global.global() == true);
  
  std::cout << "  ✓ Basic tests passed" << std::endl;
}

void test_regexp_exec() {
  std::cout << "Testing RegExp.exec()..." << std::endl;
  
  // Simple match
  gs::RegExp pattern("(\\w+)@(\\w+)\\.(\\w+)");
  auto result = pattern.exec("user@example.com");
  
  assert(result.has_value());
  assert(result.value().size() == 4); // Full match + 3 groups
  assert(result.value()[0] == "user@example.com");
  assert(result.value()[1] == "user");
  assert(result.value()[2] == "example");
  assert(result.value()[3] == "com");
  
  // No match
  auto noMatch = pattern.exec("invalid email");
  assert(!noMatch.has_value());
  
  std::cout << "  ✓ exec() tests passed" << std::endl;
}

void test_string_match() {
  std::cout << "Testing String.match()..." << std::endl;
  
  // Non-global match with groups
  gs::String email = "contact@goodscript.dev";
  gs::RegExp emailPattern("(\\w+)@(\\w+)\\.(\\w+)");
  
  auto match = email.match(emailPattern);
  assert(match.has_value());
  assert(match.value().length() == 4);
  assert(match.value()[1].str() == "contact");
  
  // Global match - returns all matches
  gs::String text = "The numbers are 42, 123, and 7";
  gs::RegExp numbers("\\d+", "g");
  
  auto allNumbers = text.match(numbers);
  assert(allNumbers.has_value());
  assert(allNumbers.value().length() == 3);
  assert(allNumbers.value()[0].str() == "42");
  assert(allNumbers.value()[1].str() == "123");
  assert(allNumbers.value()[2].str() == "7");
  
  std::cout << "  ✓ match() tests passed" << std::endl;
}

void test_string_search() {
  std::cout << "Testing String.search()..." << std::endl;
  
  gs::String text = "The quick brown fox";
  gs::RegExp pattern("brown");
  
  int index = text.search(pattern);
  assert(index == 10);
  
  gs::RegExp notFound("purple");
  assert(text.search(notFound) == -1);
  
  std::cout << "  ✓ search() tests passed" << std::endl;
}

void test_string_replace() {
  std::cout << "Testing String.replace()..." << std::endl;
  
  // String replace (non-regex)
  gs::String text = "Hello World";
  gs::String replaced = text.replace(gs::String("World"), gs::String("GoodScript"));
  assert(replaced.str() == "Hello GoodScript");
  
  // Regex replace (first match only)
  gs::String numbers = "1 2 3 4 5";
  gs::RegExp digit("\\d");
  gs::String replaced1 = numbers.replace(digit, gs::String("X"));
  assert(replaced1.str() == "X 2 3 4 5");
  
  // Regex replace (global)
  gs::RegExp allDigits("\\d", "g");
  gs::String replacedAll = numbers.replace(allDigits, gs::String("X"));
  assert(replacedAll.str() == "X X X X X");
  
  // String replaceAll
  gs::String spaces = "a b c d";
  gs::String noSpaces = spaces.replaceAll(gs::String(" "), gs::String("-"));
  assert(noSpaces.str() == "a-b-c-d");
  
  std::cout << "  ✓ replace() tests passed" << std::endl;
}

void test_string_split() {
  std::cout << "Testing String.split() with regex..." << std::endl;
  
  // Split by regex
  gs::String csv = "apple,banana,cherry";
  gs::RegExp comma(",");
  
  auto fruits = csv.split(comma);
  assert(fruits.length() == 3);
  assert(fruits[0].str() == "apple");
  assert(fruits[1].str() == "banana");
  assert(fruits[2].str() == "cherry");
  
  // Split by whitespace pattern
  gs::String text = "one   two\tthree\nfour";
  gs::RegExp whitespace("\\s+");
  
  auto words = text.split(whitespace);
  assert(words.length() == 4);
  assert(words[0].str() == "one");
  assert(words[1].str() == "two");
  assert(words[2].str() == "three");
  assert(words[3].str() == "four");
  
  std::cout << "  ✓ split() tests passed" << std::endl;
}

void test_advanced_patterns() {
  std::cout << "Testing advanced regex features..." << std::endl;
  
  // Lookahead (supported by PCRE2)
  gs::RegExp lookahead("\\d+(?=px)");
  assert(lookahead.test("width: 100px") == true);
  assert(lookahead.test("width: 100em") == false);
  
  // Lookbehind (supported by PCRE2)
  gs::RegExp lookbehind("(?<=\\$)\\d+");
  assert(lookbehind.test("Price: $50") == true);
  assert(lookbehind.test("Price: 50") == false);
  
  // Unicode flag
  gs::RegExp unicode(".", "u");
  assert(unicode.test("😀") == true);
  
  // Multiline flag
  gs::RegExp multiline("^test", "m");
  assert(multiline.test("line1\ntest line") == true);
  
  std::cout << "  ✓ Advanced pattern tests passed" << std::endl;
}

void test_edge_cases() {
  std::cout << "Testing edge cases..." << std::endl;
  
  // Empty pattern
  gs::RegExp empty("");
  assert(empty.test("anything") == true);
  
  // Empty string
  gs::String emptyStr = "";
  gs::RegExp pattern("test");
  assert(emptyStr.search(pattern) == -1);
  
  // No matches
  gs::String text = "hello";
  gs::RegExp notFound("xyz");
  auto match = text.match(notFound);
  assert(!match.has_value());
  
  std::cout << "  ✓ Edge case tests passed" << std::endl;
}

int main() {
  std::cout << "Running GoodScript RegExp tests..." << std::endl;
  std::cout << std::endl;
  
  try {
    test_regexp_basic();
    test_regexp_exec();
    test_string_match();
    test_string_search();
    test_string_replace();
    test_string_split();
    test_advanced_patterns();
    test_edge_cases();
    
    std::cout << std::endl;
    std::cout << "✅ All RegExp tests passed!" << std::endl;
    return 0;
  } catch (const std::exception& e) {
    std::cerr << std::endl;
    std::cerr << "❌ Test failed with exception: " << e.what() << std::endl;
    return 1;
  }
}
