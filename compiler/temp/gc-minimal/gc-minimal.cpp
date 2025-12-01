#include "gs_gc_runtime.hpp"

namespace gs {

} // namespace gs

int main() {
  gs::gc::Runtime gc_runtime;
  gs::console::log(gs::String("Hello, World!"));
  return 0;
}