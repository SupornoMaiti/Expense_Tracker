#!/bin/bash
echo "=== npx tsc -b --noEmit ==="
npx tsc -b --noEmit

echo -e "\n=== npx eslint . ==="
npx eslint .

echo -e "\n=== npx vitest run --reporter=verbose ==="
npx vitest run --reporter=verbose

echo -e "\n=== npx knip ==="
npx knip

echo -e "\n=== npm audit --omit=dev ==="
npm audit --omit=dev || true

echo -e "\n=== npm run build && ls -la dist ==="
npm run build && ls -la dist

echo -e "\n=== npm run bench ==="
npm run bench

echo -e "\n=== grep smells ==="
grep -rnE "as any|1e-9|dangerouslySetInnerHTML|parseFloat|toFixed|fetch\(|XMLHttpRequest|WebSocket|supabase|axios|console\.log" src || true
