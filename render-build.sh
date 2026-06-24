#!/bin/bash
set -e

echo "=== Go LineLess — Full Stack Render Build ==="

# Install pnpm if not available
if ! command -v pnpm &> /dev/null; then
  echo "Installing pnpm..."
  npm install -g pnpm@latest
fi

echo "pnpm version: $(pnpm --version)"

# Install all workspace dependencies (needed so esbuild can resolve @workspace/* imports)
echo "Installing dependencies..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# Build the React frontend (qbuddy)
echo "Building frontend (qbuddy)..."
cd artifacts/qbuddy
# VITE_API_URL must be empty for unified deployment (API + SPA on same origin)
# The frontend code uses `import.meta.env.VITE_API_URL || ""` which falls back to same-origin
unset VITE_API_URL
# Pass Google Client ID from Render env to Vite build
export VITE_GOOGLE_CLIENT_ID="${VITE_GOOGLE_CLIENT_ID:-}"
NODE_ENV=production pnpm run build
cd ../..

# Copy built frontend into api-server/public so Express can serve the SPA
echo "Copying frontend build to api-server/public..."
rm -rf artifacts/api-server/public
cp -r artifacts/qbuddy/dist/public artifacts/api-server/public

# Verify the SPA entry point exists
if [ ! -f artifacts/api-server/public/index.html ]; then
  echo "ERROR: Frontend build did not produce index.html"
  echo "Contents of dist/public:"
  ls -la artifacts/qbuddy/dist/public/
  exit 1
fi
echo "Frontend copied successfully."
ls -la artifacts/api-server/public/

# Build the API server
echo "Building API server..."
cd artifacts/api-server
node build.mjs
cd ../..

echo "=== Build complete ==="
echo "API:   artifacts/api-server/dist/index.mjs"
echo "SPA:   artifacts/api-server/public/index.html"
