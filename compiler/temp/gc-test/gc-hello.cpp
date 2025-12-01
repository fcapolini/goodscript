#include "gs_gc_runtime.hpp"

namespace gs {

  class Greeter {
    public:
    gs::String name;
    Greeter(const gs::String& name) : name(name) {
    }
    void greet() const {
      gs::console::log(gs::String("Hello, ") + this->name + gs::String("!"));
    }

  };

} // namespace gs

int main() {
  gs::gc::Runtime gc_runtime;
  const gs::String message = gs::String("Hello from GC mode!");
  gs::console::log(message);
  gs::Greeter* greeter = gs::gc::Allocator::alloc<gs::Greeter>(gs::String("World"));
  greeter->greet();
  return 0;
}