#!/usr/bin/env bash
# Setup script for GoodScript conformance testing

set -e

echo "🚀 Setting up GoodScript Conformance Testing..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Must run from conformance/ directory"
  exit 1
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "📚 Initializing test262 submodule..."
if [ ! -d "test262/.git" ]; then
  cd ..
  git submodule add https://github.com/tc39/test262.git conformance/test262 2>/dev/null || true
  git submodule update --init --recursive
  cd conformance
else
  echo "   ✓ test262 submodule already initialized"
  git submodule update --remote
fi

echo ""
echo "🔨 Building conformance test suite..."
npm run build

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  npm test           # Run all conformance tests"
echo "  npm test:watch     # Watch mode for development"
echo "  npm test:coverage  # Generate coverage report"
echo ""
echo "See README.md for more information."
