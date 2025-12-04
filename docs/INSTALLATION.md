# GoodScript Installation Guide

## Prerequisites

GoodScript has **one external dependency**: the **Zig compiler**.

All other dependencies (cppcoro for async/await, MPS for garbage collection, PCRE2 for RegExp) are vendored with GoodScript and compile automatically during first use.

## Installing Zig

### macOS

```bash
# Using Homebrew (recommended)
brew install zig

# Or download directly
# Visit: https://ziglang.org/download/
```

### Linux

#### Ubuntu/Debian
```bash
# Option 1: Using snap
sudo snap install zig --classic --beta

# Option 2: Download from ziglang.org
wget https://ziglang.org/download/0.13.0/zig-linux-x86_64-0.13.0.tar.xz
tar -xf zig-linux-x86_64-0.13.0.tar.xz
sudo mv zig-linux-x86_64-0.13.0 /usr/local/zig
echo 'export PATH=/usr/local/zig:$PATH' >> ~/.bashrc
source ~/.bashrc
```

#### Fedora/RHEL
```bash
# Using dnf
sudo dnf install zig

# Or download from ziglang.org (see Ubuntu instructions above)
```

#### Arch Linux
```bash
# Using pacman
sudo pacman -S zig
```

### Windows

#### Option 1: Using winget (Windows 10+)
```powershell
winget install -e --id zig.zig
```

#### Option 2: Using Scoop
```powershell
scoop install zig
```

#### Option 3: Manual installation
1. Download from https://ziglang.org/download/
2. Extract to `C:\zig` (or your preferred location)
3. Add `C:\zig` to your PATH environment variable

### Verify Installation

After installing Zig, verify it works:

```bash
zig version
# Should output something like: 0.13.0
```

## Installing GoodScript

Once Zig is installed:

```bash
# Install GoodScript globally (coming soon to npm)
npm install -g goodscript

# Or use from source
git clone https://github.com/fcapolini/goodscript.git
cd goodscript/compiler
npm install
npm run build
npm link
```

## First Compilation

The first time you compile a GoodScript program, vendored dependencies will be compiled:

```bash
# Create a simple program
echo 'console.log("Hello, GoodScript!");' > hello.gs

# Compile (first time will take a few seconds to compile dependencies)
gsc build hello.gs

# Subsequent compilations are fast (dependencies are cached)
./hello
```

### What Gets Compiled on First Use

- **cppcoro** (~1 second): C++20 coroutine library for async/await
- **MPS** (~2 seconds): Memory Pool System for garbage collection  
- **PCRE2** (~3 seconds): Regular expression library for RegExp support

These are compiled once and cached in your system's temp directory. Total first-run overhead: ~6 seconds. After that, only your code compiles.

## Troubleshooting

### "zig: command not found"

**Problem:** Zig is not installed or not in your PATH.

**Solution:**
1. Install Zig using one of the methods above
2. Verify with `zig version`
3. If installed but not found, add to PATH:
   - Linux/macOS: Add to `~/.bashrc` or `~/.zshrc`
   - Windows: Add to System Environment Variables

### "Permission denied" on macOS/Linux

**Problem:** Binary doesn't have execute permissions.

**Solution:**
```bash
chmod +x ./your-program
./your-program
```

### Compilation is slow on first run

This is **expected behavior**. GoodScript compiles vendored dependencies (cppcoro, MPS, PCRE2) on first use. These are cached, so subsequent compilations are fast.

If you want to pre-compile dependencies:
```bash
# Run any test to trigger dependency compilation
cd goodscript/compiler
npm test test/phase3/basic/hello-world.test.ts
```

### Cross-compilation not working

Make sure you have the latest version of Zig (0.13.0+):
```bash
zig version
```

Older versions may have different target triple syntax.

## Platform-Specific Notes

### macOS

- **Apple Silicon (M1/M2/M3):** Everything works natively in arm64 mode
- **Intel Macs:** Everything works in x64 mode
- Zig handles both architectures transparently

### Linux

- Tested on Ubuntu 22.04+, Fedora 38+, Arch Linux
- Both x64 and ARM64 (aarch64) supported
- musl and glibc both work

### Windows

- Tested on Windows 10+ (x64)
- Both MSVC and MinGW-compatible
- PowerShell and CMD both work

## Why Only Zig?

GoodScript follows the **"batteries included"** philosophy, similar to Go:

- ✅ **cppcoro** - Vendored, compiles automatically
- ✅ **MPS** - Vendored, compiles automatically  
- ✅ **PCRE2** - Vendored, compiles automatically
- ⚙️ **Zig** - External dependency (C++ compiler)

We chose Zig because:
- **Cross-compilation**: Compile for any platform from any platform
- **Zero dependencies**: Zig is self-contained (no need for LLVM, GCC, etc.)
- **Small size**: ~15MB download
- **Fast**: Optimized C++20 compilation
- **Active development**: Well-maintained and improving rapidly

Alternative approaches (bundling Clang/LLVM, self-hosting) would add 100MB+ to the installation.

## Next Steps

- Read the [Quick Start Guide](../README.md#quick-start)
- Explore [Examples](../compiler/examples/)
- Learn about [Memory Management](./MEMORY-OWNERSHIP.md)
- Understand [The Good Parts](./GOOD-PARTS.md)
