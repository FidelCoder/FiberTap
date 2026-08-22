#!/bin/bash
set -e

# Build widget first
pnpm --filter @fibertap/widget build

# Create api directory
mkdir -p api

# Find esbuild
ESBUILD=$(find node_modules/.pnpm -path "*/esbuild*/bin/esbuild" -name "esbuild" ! -name "*.js" 2>/dev/null | head -1)

# Bundle api/index.ts -> api/index.js (self-contained, all deps inlined)
$ESBUILD packages/api/src/vercel.ts \
  --bundle \
  --platform=node \
  --format=esm \
  --outfile=api/index.js \
  --external:fs \
  --external:path \
  --external:crypto \
  --external:mongodb

echo "✅ Built api/index.js ($(wc -c < api/index.js) bytes)"
