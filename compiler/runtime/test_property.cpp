/**
 * Test for gs::Property and gs::LiteralObject
 * 
 * Tests the runtime implementation of type-erased properties
 * and heterogeneous object literals.
 */

#include "../runtime/gs_runtime.hpp"
#include <iostream>
#include <cassert>

int main() {
  using namespace gs;
  
  std::cout << "Testing gs::Property..." << std::endl;
  
  // Test primitive types
  Property p_num(42);
  assert(p_num.isNumber());
  assert(p_num.asNumber() == 42.0);
  
  Property p_str("hello");
  assert(p_str.isString());
  assert(p_str.asString() == String("hello"));
  
  Property p_bool(true);
  assert(p_bool.isBool());
  assert(p_bool.asBool() == true);
  
  Property p_null = Property::Null();
  assert(p_null.isNull());
  
  // Test toString
  assert(p_num.toString() == String("42"));
  assert(p_str.toString() == String("hello"));
  assert(p_bool.toString() == String("true"));
  assert(p_null.toString() == String("null"));
  
  std::cout << "✓ Property primitives work" << std::endl;
  
  // Test LiteralObject
  std::cout << "Testing gs::LiteralObject..." << std::endl;
  
  LiteralObject obj = {
    {"name", Property("Alice")},
    {"age", Property(30)},
    {"active", Property(true)},
    {"score", Property(98.5)}
  };
  
  // Test property access
  assert(obj.get("name")->asString() == String("Alice"));
  assert(obj.get("age")->asNumber() == 30.0);
  assert(obj.get("active")->asBool() == true);
  assert(obj.get("score")->asNumber() == 98.5);
  
  std::cout << "✓ LiteralObject property access works" << std::endl;
  
  // Test Object.keys()
  auto keys = Object::keys(obj);
  assert(keys.length() == 4);
  std::cout << "✓ Object.keys() works: " << keys.length() << " keys" << std::endl;
  
  // Test Object.values()
  auto values = Object::values(obj);
  assert(values.length() == 4);
  std::cout << "✓ Object.values() works: " << values.length() << " values" << std::endl;
  
  // Test Object.entries()
  auto entries = Object::entries(obj);
  assert(entries.length() == 4);
  std::cout << "✓ Object.entries() works: " << entries.length() << " entries" << std::endl;
  
  // Test Object.assign()
  LiteralObject obj2 = {
    {"city", Property("NYC")},
    {"zip", Property(10001)}
  };
  
  Object::assign(obj, obj2);
  assert(obj.get("city")->asString() == String("NYC"));
  assert(obj.get("zip")->asNumber() == 10001.0);
  assert(obj.size() == 6);  // 4 original + 2 new
  
  std::cout << "✓ Object.assign() works" << std::endl;
  
  // Test console.log with Property
  std::cout << "Testing console.log with properties..." << std::endl;
  console::log(String("Property toString tests:"));
  console::log(String("  Number:"), p_num.toString());
  console::log(String("  String:"), p_str.toString());
  console::log(String("  Bool:"), p_bool.toString());
  console::log(String("  Null:"), p_null.toString());
  
  // Test copy semantics
  Property p_copy = p_str;
  assert(p_copy.isString());
  assert(p_copy.asString() == String("hello"));
  std::cout << "✓ Property copy works" << std::endl;
  
  // Test move semantics
  Property p_move = std::move(p_copy);
  assert(p_move.isString());
  assert(p_move.asString() == String("hello"));
  std::cout << "✓ Property move works" << std::endl;
  
  // Test equality
  Property p1(42);
  Property p2(42);
  Property p3(43);
  assert(p1 == p2);
  assert(p1 != p3);
  std::cout << "✓ Property equality works" << std::endl;
  
  std::cout << std::endl << "All tests passed! ✅" << std::endl;
  
  return 0;
}
