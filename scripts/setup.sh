#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "[1/2] Installing frontend dependencies..."
npm --prefix frontend install

echo "[2/2] Installing Python API dependencies..."
if command -v python3 >/dev/null 2>&1; then
  python3 -m pip install -r backend-python/requirements.txt
elif command -v python >/dev/null 2>&1; then
  python -m pip install -r backend-python/requirements.txt
else
  echo "Python 3 was not found. Install Python 3.11+ then rerun npm run setup." >&2
  exit 1
fi

echo "Setup complete. Run: npm run live"
