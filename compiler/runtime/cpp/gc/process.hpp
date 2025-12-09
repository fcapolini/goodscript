#pragma once

/**
 * GoodScript Process API
 * 
 * Provides access to command-line arguments similar to Node.js process.argv
 * 
 * Usage in TypeScript:
 *   const args = process.argv;  // Array<string> with all arguments
 * 
 * Usage in C++:
 *   gs::process::argv  // gs::Array<gs::String> with all arguments
 * 
 * Note: Unlike Node.js, argv[0] is the program name, argv[1] is first argument
 *       (Node.js has argv[0] = node path, argv[1] = script path, argv[2] = first arg)
 */

// String/Array defined by mode-specific runtime
// String/Array defined by mode-specific runtime

namespace gs {
namespace process {

/**
 * Command-line arguments as TypeScript-compatible Array<String>
 * 
 * This is initialized by the main() function with argc/argv.
 * 
 * Example:
 *   // C++ invocation: ./program arg1 arg2 arg3
 *   // argv[0] = "./program"
 *   // argv[1] = "arg1"
 *   // argv[2] = "arg2"
 *   // argv[3] = "arg3"
 */
inline Array<String> argv;

/**
 * Initialize process.argv from C++ main() arguments
 * 
 * This should be called at the start of main():
 *   int main(int argc, char* argv[]) {
 *     gs::process::init(argc, argv);
 *     // ... rest of program
 *   }
 */
inline void init(int argc, char* argv_c[]) {
  argv = Array<String>();
  for (int i = 0; i < argc; i++) {
    argv.push(String(argv_c[i]));
  }
}

} // namespace process
} // namespace gs
