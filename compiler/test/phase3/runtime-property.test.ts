/**
 * Runtime Property and LiteralObject Tests
 * 
 * Tests that gs::Property and gs::LiteralObject runtime classes work correctly.
 * 
 * This test compiles and runs the standalone C++ test file (test_property.cpp)
 * to verify the runtime implementation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

describe('Runtime Property and LiteralObject', () => {
  let tempDir: string;
  const runtimeDir = path.join(__dirname, '../../runtime');
  
  beforeEach(() => {
    // Create temp directory for test files
    tempDir = fs.mkdtempSync(path.join(__dirname, 'property-test-'));
  });
  
  afterEach(() => {
    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should compile and run test_property.cpp successfully', () => {
    const testFile = path.join(runtimeDir, 'test_property.cpp');
    const executable = path.join(tempDir, 'test_property');
    
    // Verify test file exists
    expect(fs.existsSync(testFile)).toBe(true);
    
    // Compile the test
    try {
      execSync(
        `g++ -std=c++20 -I${runtimeDir} -o ${executable} ${testFile}`,
        {
          cwd: tempDir,
          encoding: 'utf-8',
          stdio: 'pipe'
        }
      );
    } catch (error: any) {
      throw new Error(`C++ compilation failed:\n${error.stderr || error.message}`);
    }
    
    // Run the test
    let output: string;
    try {
      output = execSync(executable, {
        cwd: tempDir,
        encoding: 'utf-8',
        stdio: 'pipe'
      });
    } catch (error: any) {
      throw new Error(`Test execution failed:\n${error.stderr || error.message}`);
    }
    
    // Verify expected output
    expect(output).toContain('Testing gs::Property');
    expect(output).toContain('✓ Property primitives work');
    expect(output).toContain('Testing gs::LiteralObject');
    expect(output).toContain('✓ LiteralObject property access works');
    expect(output).toContain('✓ Object.keys() works');
    expect(output).toContain('✓ Object.values() works');
    expect(output).toContain('✓ Object.entries() works');
    expect(output).toContain('✓ Object.assign() works');
    expect(output).toContain('✓ Property copy works');
    expect(output).toContain('✓ Property move works');
    expect(output).toContain('✓ Property equality works');
    expect(output).toContain('All tests passed! ✅');
  });

  it('should verify Property type-erased storage', () => {
    const testCode = `
#include "../runtime/gs_runtime.hpp"
#include <iostream>
#include <cassert>

int main() {
  using namespace gs;
  
  // Test that Property can hold different types
  Property p1(42);
  Property p2(String("hello"));
  Property p3(true);
  Property p4 = Property::Null();
  
  // Verify type checking
  assert(p1.isNumber());
  assert(!p1.isString());
  assert(!p1.isBool());
  assert(!p1.isNull());
  
  assert(p2.isString());
  assert(!p2.isNumber());
  
  assert(p3.isBool());
  assert(!p3.isNumber());
  
  assert(p4.isNull());
  assert(!p4.isNumber());
  
  std::cout << "Type erasure works correctly" << std::endl;
  return 0;
}
`;
    
    const testFile = path.join(tempDir, 'type_test.cpp');
    const executable = path.join(tempDir, 'type_test');
    
    fs.writeFileSync(testFile, testCode);
    
    // Compile
    execSync(
      `g++ -std=c++20 -I${runtimeDir} -o ${executable} ${testFile}`,
      { cwd: tempDir, stdio: 'pipe' }
    );
    
    // Run
    const output = execSync(executable, {
      cwd: tempDir,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    expect(output).toContain('Type erasure works correctly');
  });

  it('should verify LiteralObject heterogeneous storage', () => {
    const testCode = `
#include "../runtime/gs_runtime.hpp"
#include <iostream>
#include <cassert>

int main() {
  using namespace gs;
  
  // Create object with mixed types
  LiteralObject person = {
    {"name", Property("Alice")},
    {"age", Property(30)},
    {"salary", Property(75000.50)},
    {"active", Property(true)},
    {"manager", Property::Null()}
  };
  
  // Verify each property has correct type
  assert(person.get("name").value().isString());
  assert(person.get("age").value().isNumber());
  assert(person.get("salary").value().isNumber());
  assert(person.get("active").value().isBool());
  assert(person.get("manager").value().isNull());
  
  // Verify values
  assert(person.get("name").value().asString() == String("Alice"));
  assert(person.get("age").value().asNumber() == 30.0);
  assert(person.get("salary").value().asNumber() == 75000.50);
  assert(person.get("active").value().asBool() == true);
  
  std::cout << "Heterogeneous storage works correctly" << std::endl;
  return 0;
}
`;
    
    const testFile = path.join(tempDir, 'hetero_test.cpp');
    const executable = path.join(tempDir, 'hetero_test');
    
    fs.writeFileSync(testFile, testCode);
    
    // Compile
    execSync(
      `g++ -std=c++20 -I${runtimeDir} -o ${executable} ${testFile}`,
      { cwd: tempDir, stdio: 'pipe' }
    );
    
    // Run
    const output = execSync(executable, {
      cwd: tempDir,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    expect(output).toContain('Heterogeneous storage works correctly');
  });

  it('should verify Object methods work with LiteralObject', () => {
    const testCode = `
#include "../runtime/gs_runtime.hpp"
#include <iostream>
#include <cassert>

int main() {
  using namespace gs;
  
  LiteralObject obj = {
    {"a", Property(1)},
    {"b", Property(2)},
    {"c", Property(3)}
  };
  
  // Test Object.keys
  auto keys = Object::keys(obj);
  assert(keys.length() == 3);
  
  // Test Object.values
  auto values = Object::values(obj);
  assert(values.length() == 3);
  
  // Test Object.entries
  auto entries = Object::entries(obj);
  assert(entries.length() == 3);
  
  // Test Object.assign
  LiteralObject obj2 = {
    {"d", Property(4)},
    {"e", Property(5)}
  };
  Object::assign(obj, obj2);
  assert(obj.size() == 5);
  assert(obj.get("d").value().asNumber() == 4.0);
  
  std::cout << "Object methods work with LiteralObject" << std::endl;
  return 0;
}
`;
    
    const testFile = path.join(tempDir, 'object_test.cpp');
    const executable = path.join(tempDir, 'object_test');
    
    fs.writeFileSync(testFile, testCode);
    
    // Compile
    execSync(
      `g++ -std=c++20 -I${runtimeDir} -o ${executable} ${testFile}`,
      { cwd: tempDir, stdio: 'pipe' }
    );
    
    // Run
    const output = execSync(executable, {
      cwd: tempDir,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    expect(output).toContain('Object methods work with LiteralObject');
  });
});
