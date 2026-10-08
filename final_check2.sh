#!/bin/bash
echo "=== npx tsc -b --noEmit ==="
npx tsc -b --noEmit || exit 1

echo -e "\n=== npx eslint . ==="
npx eslint . || exit 1

echo -e "\n=== npx vitest run ==="
npx vitest run || exit 1

echo -e "\n=== npm run build ==="
npm run build || exit 1

echo -e "\n=== ls -la dist dist/icons ==="
ls -la dist dist/icons

echo -e "\n=== cat dist/manifest.webmanifest ==="
cat dist/manifest.webmanifest
