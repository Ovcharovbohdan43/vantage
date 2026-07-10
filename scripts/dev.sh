#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -d node_modules ]]; then
  echo "First run — installing dependencies..."
  npm run setup
fi

echo ""
echo "  Frontend  ->  http://localhost:3000"
echo "  Backend   ->  http://localhost:8000"
echo "  API docs  ->  http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers."
echo ""

npm run dev
