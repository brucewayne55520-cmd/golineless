#!/bin/bash
set -e

echo "=== Go LineLess API — Render Build ==="

# Install pnpm if not available
if ! command -v pnpm &> /dev/null; then
  echo "Installing pnpm..."
  npm install -g pnpm@latest
fi

echo "pnpm version: $(pnpm --version)"

# Install all workspace dependencies (needed so esbuild can resolve @workspace/* imports)
echo "Installing dependencies..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# Build the API server
echo "Building API server..."
cd artifacts/api-server
node build.mjs

echo "=== Build complete ==="
echo "Output: artifacts/api-server/dist/index.mjs"
ls -la dist/
